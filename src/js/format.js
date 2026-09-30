async function formatDocument(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  if (S.running) return;
  const src = f.model.getValue();
  if (!src.trim()){ toast('Nothing To Format'); return; }
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Formatting…', true);
  let r = null;
  try {
    r = py('format', src);
    if (r && r.need){
      st('Installing Black Formatter…', true);
      openConsole();
      appendLine('Installing Black (One-Time)…', 'dim');
      try {
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install('black');
        appendLine('Installed Black — ' + Object.keys(pyodide.loadedPackages).length + ' Packages Loaded', 'dim');
        r = py('format', src);
      } catch (e) {
        r = { err: 'Could Not Install Black — Check Connection' };
      }
    }
  } finally {
    S.running = false;
    updateRunUI();
    stLeft.classList.remove('run');
    st(pyStatusText, false);
  }
  if (!r){ toast('Formatting Failed'); return; }
  if (r.err){ toast(r.err); return; }
  if (r.code === src){ toast('Already Formatted'); return; }
  const m = f.model;
  pushEdits(m, [{ range: new monaco.Range(1, 1, m.getLineCount(), m.getLineMaxColumn(m.getLineCount())), text: r.code }]);
  saveWS();
  scheduleLintFor(m);
  toast('Formatted With Black');
}

