import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {fileURLToPath} from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const MODULES = [
  'state', 'util', 'menu', 'edit', 'tabs', 'store', 'chrome', 'files', 'share', 'settings',
  'console', 'errors', 'run', 'palette', 'keys', 'views', 'plots', 'format', 'search', 'history',
  'lint', 'bridge', 'ghost', 'monaco', 'boot', 'api'
];
const onDisk = fs.readdirSync(path.join(dir, 'src/js')).map(f => f.replace(/\.js$/, '')).sort();
const listed = [...MODULES].sort();
if (onDisk.join() !== listed.join()) {
  console.error('FATAL: src/js does not match MODULES manifest', { onDisk, listed });
  process.exit(1);
}

const page = read('src/shell.html');
const css = read('src/style.css');
let js = "(function(){\n" + MODULES.map(m => read(`src/js/${m}.js`)).join('') + "})();\n";
const kb = s => Buffer.byteLength(s) / 1024;

const MARKERS = { bridge: ["'/*__NOIR_BLOB__*/'"] };
const noComments = (name, src, markers = []) => {
  for (const m of markers) src = src.split(m).join('');
  if (src.includes('/*')) { console.error(`FATAL: /* comment found in ${name}`); process.exit(1); }
  if (/^\s*\/\//m.test(src)) { console.error(`FATAL: // comment found in ${name}`); process.exit(1); }
  if (/<!--/.test(src)) { console.error(`FATAL: html comment found in ${name}`); process.exit(1); }
};
noComments('src/style.css', css);
for (const m of MODULES) noComments(`src/js/${m}.js`, read(`src/js/${m}.js`), MARKERS[m]);
noComments('src/shell.html', page, ["'/*__NOIR_PACK__*/'"]);

const engine = {
  intel: read('src/engine/intel.py'),
  repl: read('src/engine/repl.py'),
  tools: read('src/engine/tools.py'),
  ...JSON.parse(read('src/engine/data.json'))
};
const engineJson = JSON.stringify(engine);
const engineB64 = zlib.deflateRawSync(Buffer.from(engineJson, 'utf8')).toString('base64url');

if (zlib.inflateRawSync(Buffer.from(engineB64, 'base64url')).toString('utf8') !== engineJson) {
  console.error('FATAL: engine blob round-trip mismatch'); process.exit(1);
}
if (!js.includes("'/*__NOIR_BLOB__*/'")) { console.error('FATAL: PYBLOB placeholder missing in src/js'); process.exit(1); }
js = js.replace("'/*__NOIR_BLOB__*/'", () => "'" + engineB64 + "'");

let mode = 'esbuild', jsOut, cssOut;
try {
  const es = await import('esbuild');
  jsOut = es.transformSync(js, { minify: true, target: 'es2020', charset: 'utf8' }).code;
  cssOut = es.transformSync(css, { minify: true, loader: 'css', charset: 'utf8' }).code;
} catch (e) {
  mode = 'conservative-fallback';
  jsOut = js.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  cssOut = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}').trim();
}

const packJson = JSON.stringify({ c: cssOut, j: jsOut });
const packB64 = zlib.deflateRawSync(Buffer.from(packJson, 'utf8')).toString('base64url');
if (zlib.inflateRawSync(Buffer.from(packB64, 'base64url')).toString('utf8') !== packJson) {
  console.error('FATAL: pack round-trip mismatch'); process.exit(1);
}
if (!page.includes("'/*__NOIR_PACK__*/'")) { console.error('FATAL: NOIR_PACK placeholder missing in shell.html'); process.exit(1); }

let html = page.replace(/\r/g, '')
  .split('\n').map(l => l.trim()).filter(Boolean).join('')
  .replace(/>\s+</g, '><');

html = html.replace("'/*__NOIR_PACK__*/'", () => "'" + packB64 + "'");

if (html.includes('__NOIR_')) { console.error('FATAL: unresolved placeholder in output'); process.exit(1); }
if (!html.includes('DecompressionStream')) { console.error('FATAL: loader missing from output'); process.exit(1); }
if (!html.includes(packB64.slice(0, 64))) { console.error('FATAL: pack payload missing from output'); process.exit(1); }

const dest = path.join(dir, 'python-editor.html');
fs.writeFileSync(dest, html);

const srcTotal = kb(css) + MODULES.reduce((a, m) => a + kb(read(`src/js/${m}.js`)), 0) + kb(page) + kb(engineJson);
console.log('mode           :', mode);
console.log('modules        :', MODULES.length, '(' + MODULES.join(' ') + ')');
console.log('engine blob kb :', (engineB64.length / 1024).toFixed(1), '(raw', (engineJson.length / 1024).toFixed(1) + ')');
console.log('app pack   kb  :', (packB64.length / 1024).toFixed(1), '(css', kb(cssOut).toFixed(1), '+ js', kb(jsOut).toFixed(1), '= raw', kb(packJson).toFixed(1) + ')');
console.log('source     kb  :', srcTotal.toFixed(1));
console.log('output     kb  :', kb(html).toFixed(1));
console.log('reduction      :', ((1 - kb(html) / (kb(packJson) + kb(page))) * 100).toFixed(1) + '% (app payload)');

fs.mkdirSync(path.join(dir, '.check'), { recursive: true });
fs.writeFileSync(path.join(dir, '.check/minified.js'), jsOut);
fs.writeFileSync(path.join(dir, '.check/pack.json'), packJson);
