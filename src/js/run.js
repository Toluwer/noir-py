async function run(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const code = f.model.getValue();
  if (!code.trim()){ toast('Nothing To Run — File Is Empty'); return; }
  runCode(code, f.name, f);
}

async function runCode(code, label, file, lineOff){
  if (S.running) return;
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Running ' + label + '…', true);
  openConsole();
  runHead(label);
  S.lastTrace = file ? { id: file.id, off: lineOff || 0 } : null;
  if (file) pushSnap(file.id, file.model.getValue());
  const t0 = performance.now();
  try {
    try { await pyodide.loadPackagesFromImports(code); } catch (e) {}
    await runFn(code, file ? file.name : 'main.py');
  } catch (err) {
    renderError(err && err.message ? err.message : String(err));
    if (S.pyReady){
      const d = py('vars');
      if (d && d.e && d.e.locals && Object.keys(d.e.locals).length){
        appendLine('Frame Locals Available In The Variables Panel', 'dim');
      }
    }
  } finally {
    const dt = ((performance.now() - t0) / 1000).toFixed(2);
    if (S.lastHeadTime && S.lastHeadTime.isConnected) S.lastHeadTime.textContent = dt + 's';
    S.running = false;
    updateRunUI();
    stLeft.classList.remove('run');
    st('Finished In ' + dt + 's', false);
    clearTimeout(stTimer);
    stTimer = setTimeout(() => { if (!S.running) st(pyStatusText, false); }, 4000);
    capturePlots();
    if (S.view === 'vars') refreshVars();
    if (S.view === 'hist') renderHist();
    if (document.activeElement === btnRun && editor) editor.focus();
  }
}

async function runSelection(){
  if (!editor || !activeFile()){ toast('No File Open'); return; }
  const model = editor.getModel();
  if (!model){ toast('No File Open'); return; }
  const f = activeFile();
  const sel = editor.getSelection();
  let code = '', label = f.name, off = 0;
  if (sel && !sel.isEmpty()){
    code = model.getValueInRange(sel);
    off = sel.startLineNumber - 1;
  } else {
    const pos = editor.getPosition();
    if (!pos) return;
    code = model.getLineContent(pos.lineNumber);
    off = pos.lineNumber - 1;
    label += ' · Line ' + pos.lineNumber;
  }
  if (!code.trim()){ toast('Nothing Selected To Run'); return; }
  runCode(code, label, f, off);
}

function toggleSidebar(force){
  S.prefs.sidebar = force !== undefined ? force : !S.prefs.sidebar;
  app.classList.toggle('no-sidebar', !S.prefs.sidebar);
  savePrefs();
}
function toggleConsole(force){
  S.prefs.console = force !== undefined ? force : !S.prefs.console;
  app.classList.toggle('no-console', !S.prefs.console);
  savePrefs();
}
function openConsole(){ if (!S.prefs.console) toggleConsole(true); }

function setConH(px){
  const max = Math.max(160, Math.floor(window.innerHeight * 0.7));
  S.prefs.conH = Math.min(Math.max(Math.round(px), 140), max);
  conZone.style.height = S.prefs.conH + 'px';
}

function clearConsole(){
  linesEl.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => n.remove());
  S.openLine = null;
  conEmpty.hidden = !replRow.hidden;
}

function restartRuntime(){ saveWS(); location.reload(); }

$('btn-sidebar').addEventListener('click', () => toggleSidebar());
$('btn-console').addEventListener('click', () => toggleConsole());
$('btn-newfile').addEventListener('click', newFile);
$('btn-newtab').addEventListener('click', newFile);
$('es-new').addEventListener('click', newFile);
$('btn-restart').addEventListener('click', restartRuntime);
$('btn-clear').addEventListener('click', clearConsole);
$('btn-concollapse').addEventListener('click', () => toggleConsole());
filePick.addEventListener('change', () => { importFile(filePick.files[0]); filePick.value = ''; });
stFont.addEventListener('click', resetFont);
btnRun.addEventListener('click', run);

grip.addEventListener('dblclick', () => toggleConsole(false));

window.addEventListener('resize', () => {
  if (S.prefs.console) setConH(S.prefs.conH);

  if (window.innerWidth < 860 && S.prefs.sidebar){
    S.prefs.sidebar = false;
    app.classList.add('no-sidebar');
  }
});

grip.addEventListener('pointerdown', e => {
  e.preventDefault();
  grip.setPointerCapture(e.pointerId);
  grip.classList.add('active');
  const move = ev => setConH(editorPane.getBoundingClientRect().bottom - ev.clientY);
  const up = () => {
    grip.releasePointerCapture(e.pointerId);
    grip.classList.remove('active');
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    savePrefs();
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
});

stPos.addEventListener('click', () => {
  if (!editor) return;
  editor.focus();
  const goto = editor.getAction('editor.action.gotoLine');
  if (goto) goto.run();
});
stSpaces.addEventListener('click', () => {
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  const cur = m.getOptions().tabSize;
  m.updateOptions({ tabSize: cur === 2 ? 4 : cur === 4 ? 8 : 2 });
  refreshStatusBtns();
});
stEol.addEventListener('click', () => {
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  m.setEOL(m.getEOL() === '\n' ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF);
  refreshStatusBtns();
});
stPy.addEventListener('click', () => toast('Python ' + pyVersion + ' · Pyodide ' + PYODIDE_VERSION));

