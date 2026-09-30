function b64e(bytes){
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s){
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function deflate(text){
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(text));
  w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function inflate(bytes){
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

async function buildShareLink(){
  const f = activeFile();
  if (!f) throw new Error('No File Open');
  const code = f.model.getValue();
  if (!code) throw new Error('Nothing To Share — File Is Empty');
  const p = new URLSearchParams();
  p.set('name', f.name);
  try { p.set('code', b64e(await deflate(code))); }
  catch (e) { p.set('code', 'raw,' + b64e(new TextEncoder().encode(code))); }
  const url = location.origin + location.pathname + '#' + p.toString();
  if (url.length > 30000) throw new Error('File Too Large To Share');
  return url;
}

async function copyShareLink(){
  try {
    const url = await buildShareLink();
    await navigator.clipboard.writeText(url);
    toast('Share Link Copied To Clipboard');
  } catch (e) {
    toast(e && e.message ? e.message : 'Copy Failed');
  }
}

async function importHash(){
  if (!location.hash || location.hash.length < 2) return false;
  let p;
  try { p = new URLSearchParams(location.hash.slice(1)); } catch (e) { return false; }
  const b64 = p.get('code');
  if (!b64) return false;
  let text = '';
  try {
    if (b64.startsWith('raw,')) text = new TextDecoder().decode(b64d(b64.slice(4)));
    else text = await inflate(b64d(b64));
  } catch (e) { return false; }
  let name = p.get('name') || 'shared.py';
  if (!/^[\w.\- ]{1,40}\.py$/i.test(name)) name = 'shared.py';

  const names = new Set(S.files.map(f => f.name));
  if (names.has(name)){
    let i = 2;
    const base = name.replace(/\.py$/i, '');
    while (names.has(base + '-' + i + '.py')) i++;
    name = base + '-' + i + '.py';
  }
  history.replaceState(null, '', location.pathname + location.search);
  if (!text) return false;
  try { createFile(name, text); } catch (e) { return false; }
  toast('Opened Shared File');
  return true;
}

