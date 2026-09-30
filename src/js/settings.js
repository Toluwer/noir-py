async function installPackage(name){
  name = String(name || '').trim();
  if (!name){ openPalette('install '); return; }
  if (name.length > 100 || !/^[A-Za-z0-9][A-Za-z0-9 ._\-+[<>=!~,\]]*$/.test(name)){ toast('Invalid Package Name'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  st('Installing ' + name + '…', true);
  openConsole();
  appendLine('Installing ' + name + '…', 'dim');
  try {
    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');
    try { await micropip.install(name); } finally { micropip.destroy(); }
    stdlibMods = null;
    appendLine('Installed ' + name + ' — ' + Object.keys(pyodide.loadedPackages).length + ' Packages Loaded', 'dim');
    st('Installed ' + name, false);
    toast('Installed ' + name);
  } catch (e) {
    renderError(e && e.message ? e.message : String(e));
    st('Install Failed', false);
  }
}

function copyOutput(){
  const parts = [];
  conBody.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => parts.push(n.textContent));
  const t = parts.join('\n');
  if (!t.trim()){ toast('Console Is Empty'); return; }
  navigator.clipboard.writeText(t).then(() => toast('Console Output Copied'), () => toast('Copy Failed'));
}

function applyFont(){
  if (editor) editor.updateOptions({ fontSize: S.prefs.fontSize });
  stFont.textContent = S.prefs.fontSize + ' px';
}

function setFont(px){
  const v = Math.min(24, Math.max(9, Math.round(px * 2) / 2));
  if (v === S.prefs.fontSize) return;
  S.prefs.fontSize = v;
  applyFont();
  savePrefs();
}

function resetFont(){
  S.prefs.fontSize = FONT_DEFAULT;
  applyFont();
  savePrefs();
  toast('Font Size Reset');
}

function toggleMinimap(){
  S.prefs.minimap = !S.prefs.minimap;
  if (editor) editor.updateOptions({ minimap: { enabled: S.prefs.minimap } });
  savePrefs();
  toast('Minimap ' + (S.prefs.minimap ? 'On' : 'Off'));
}

function toggleWrap(){
  S.prefs.wordWrap = !S.prefs.wordWrap;
  if (editor) editor.updateOptions({ wordWrap: S.prefs.wordWrap ? 'on' : 'off' });
  savePrefs();
  toast('Word Wrap ' + (S.prefs.wordWrap ? 'On' : 'Off'));
}

