import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {fileURLToPath} from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');

const page = read('src/page.html');
const css = read('src/style.css');
let js = read('src/app0.js');
const kb = s => Buffer.byteLength(s) / 1024;

const noComments = (name, src, markers = []) => {
  for (const m of markers) src = src.split(m).join('');
  if (src.includes('/*')) { console.error(`FATAL: /* comment found in ${name}`); process.exit(1); }
  if (/^\s*\/\//m.test(src)) { console.error(`FATAL: // comment found in ${name}`); process.exit(1); }
  if (/<!--/.test(src)) { console.error(`FATAL: html comment found in ${name}`); process.exit(1); }
};
noComments('src/style.css', css);
noComments('src/app0.js', js, ["'/*__NOIR_BLOB__*/'"]);
noComments('src/page.html', page, ["'/*__NOIR_PACK__*/'"]);

const blob = {
  intel: read('src/blob/intel.py'),
  repl: read('src/blob/repl.py'),
  tools: read('src/blob/tools.py'),
  ...JSON.parse(read('src/blob/data.json'))
};
const blobJson = JSON.stringify(blob);
const blobB64 = zlib.deflateRawSync(Buffer.from(blobJson, 'utf8')).toString('base64url');

if (zlib.inflateRawSync(Buffer.from(blobB64, 'base64url')).toString('utf8') !== blobJson) {
  console.error('FATAL: engine blob round-trip mismatch'); process.exit(1);
}
if (!js.includes("'/*__NOIR_BLOB__*/'")) { console.error('FATAL: PYBLOB placeholder missing in app0.js'); process.exit(1); }
js = js.replace("'/*__NOIR_BLOB__*/'", () => "'" + blobB64 + "'");

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
if (!page.includes("'/*__NOIR_PACK__*/'")) { console.error('FATAL: NOIR_PACK placeholder missing in page.html'); process.exit(1); }

let html = page.replace(/\r/g, '')
  .split('\n').map(l => l.trim()).filter(Boolean).join('')
  .replace(/>\s+</g, '><');

html = html.replace("'/*__NOIR_PACK__*/'", () => "'" + packB64 + "'");

if (html.includes('__NOIR_')) { console.error('FATAL: unresolved placeholder in output'); process.exit(1); }
if (!html.includes('DecompressionStream')) { console.error('FATAL: loader missing from output'); process.exit(1); }
if (!html.includes(packB64.slice(0, 64))) { console.error('FATAL: pack payload missing from output'); process.exit(1); }

const dest = path.join(dir, 'python-editor.html');
fs.writeFileSync(dest, html);

const srcTotal = kb(css) + kb(read('src/app0.js')) + kb(page) + kb(blobJson);
console.log('mode           :', mode);
console.log('engine blob kb :', (packB64 ? blobB64.length : 0, blobB64.length / 1024).toFixed ? (blobB64.length / 1024).toFixed(1) : '', '(raw', (blobJson.length / 1024).toFixed(1) + ')');
console.log('app pack   kb  :', (packB64.length / 1024).toFixed(1), '(css', kb(cssOut).toFixed(1), '+ js', kb(jsOut).toFixed(1), '= raw', kb(packJson).toFixed(1) + ')');
console.log('source     kb  :', srcTotal.toFixed(1));
console.log('output     kb  :', kb(html).toFixed(1));
console.log('vs plain build :', (kb(packJson) + kb(page)).toFixed(1), 'kb ->', kb(html).toFixed(1), 'kb');
console.log('reduction      :', ((1 - kb(html) / (kb(packJson) + kb(page))) * 100).toFixed(1) + '% (app payload)');

fs.writeFileSync(path.join(dir, 'minified-check.js'), jsOut);
fs.writeFileSync(path.join(dir, 'pack-check.json'), packJson);
