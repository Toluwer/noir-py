const PYBLOB_B64 = '/*__NOIR_BLOB__*/';
let PYBLOB = null;
async function loadBlob(){
  if (PYBLOB) return PYBLOB;
  try { PYBLOB = JSON.parse(await inflate(b64d(PYBLOB_B64))); }
  catch (e) {

    PYBLOB = { intel: '', repl: '', tools: '', kw: [], sn: [], fm: [], fn: [] };
    openConsole();
    appendLine('Engine Data Failed To Load — Rebuild The File', 'err');
  }
  return PYBLOB;
}

let stdlibMods = null;
let SNIPS = [];

function py(fn, arg, arg2){
  if (!S.pyReady) return null;
  try {
    let call = '_' + fn + '(' + (arg === undefined ? '' : JSON.stringify(arg));
    if (arg2 !== undefined) call += ',' + JSON.stringify(arg2);
    const r = pyodide.runPython(call + ')');
    return r == null ? null : JSON.parse(r);
  } catch (e) { return null; }
}

function getModules(){
  if (!stdlibMods) stdlibMods = py('import_names') || [];
  let loaded = [];
  try { loaded = Object.keys(pyodide.loadedPackages || {}); } catch (e) {}
  return [...new Set(stdlibMods.concat(loaded))];
}

function findCall(model, position){
  const firstLine = Math.max(1, position.lineNumber - 200);
  let text = '';
  for (let l = firstLine; l < position.lineNumber; l++) text += model.getLineContent(l) + '\n';
  text += model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  let depth = 0, open = -1, arg = 0, str = null, esc = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (str){
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === str) str = null;
      continue;
    }
    if (c === "'" || c === '"'){ str = c; continue; }
    if (c === '('){ if (depth === 0){ open = i; arg = 0; } depth++; }
    else if (c === ')'){ if (depth === 0) return null; depth--; if (depth === 0) open = -1; }
    else if (c === ',' && depth === 1 && open >= 0) arg++;
  }
  if (str || open < 0) return null;
  const m = text.slice(0, open).match(/([A-Za-z_][\w.]*)$/);
  if (!m) return null;
  return { expr: m[1], arg: arg };
}

function chainAt(line, col){
  let s = col - 1, e = col - 1;
  while (s > 0 && /[\w.]/.test(line[s - 1])) s--;
  while (e < line.length && /[\w.]/.test(line[e])) e++;
  const chain = line.slice(s, e).replace(/^\.+|\.+$/g, '');
  return chain && !chain.includes('..') ? chain : null;
}

function dotBase(line){
  const m = line.match(/\.(\w*)$/);
  if (!m) return null;
  const end = line.length - m[1].length - 1;
  let i = end, ok = false;
  while (i > 0){
    const c = line[i - 1];
    if (c === '.'){ if (!ok) return null; ok = false; i--; }
    else if (c === ']' || c === ')'){
      const open = c === ']' ? '[' : '(', close = c;
      let d = 0, j = i - 1;
      while (j >= 0){
        const cj = line[j];
        if (cj === close) d++;
        else if (cj === open){ if (--d === 0) break; }
        else if (cj === '"' || cj === "'"){ const q = line[j]; j--; while (j >= 0 && line[j] !== q) j--; }
        j--;
      }
      if (j < 0) return null;
      if (open === '(' && j > 0 && /[\w.'"]/.test(line[j - 1])) return null;
      i = j; ok = true;
    }
    else if (c === '"' || c === "'"){
      let j = i - 2;
      while (j >= 0 && line[j] !== c) j--;
      if (j < 0) return null;
      while (j > 0 && /[A-Za-z]/.test(line[j - 1])) j--;
      i = j; ok = true;
    }
    else if (/[A-Za-z0-9_]/.test(c)){
      while (i > 0 && /[A-Za-z0-9_]/.test(line[i - 1])) i--;
      ok = true;
    }
    else break;
  }
  return ok && i < end ? { expr: line.slice(i, end), suffix: m[1], len: m[1].length } : null;
}

