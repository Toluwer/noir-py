const LINT_OWNER = 'noir';
let lintTimer = 0;

function scheduleLintFor(model){
  clearTimeout(lintTimer);
  lintTimer = setTimeout(() => lintModel(model), 850);
}

function lintModel(model, manual){
  if (!S.pyReady || !model || model.isDisposed()) return;
  const src = model.getValue();
  if (!src.trim()){
    monaco.editor.setModelMarkers(model, LINT_OWNER, []);
    updateProbChip();
    if (manual) toast('No Problems Found');
    return;
  }
  const diags = py('lint', src) || [];
  const SEV = { error: monaco.MarkerSeverity.Error, warn: monaco.MarkerSeverity.Warning, info: monaco.MarkerSeverity.Info };
  monaco.editor.setModelMarkers(model, LINT_OWNER, diags.map(d => ({
    severity: SEV[d.s] || monaco.MarkerSeverity.Info,
    message: d.m,
    source: 'noir',
    startLineNumber: d.l, startColumn: d.c, endLineNumber: d.l, endColumn: Math.max(d.e, d.c + 1)
  })));
  updateProbChip();
  if (manual){
    if (!diags.length) toast('No Problems Found');
    else {
      const e = diags.filter(d => d.s === 'error').length;
      const w = diags.filter(d => d.s === 'warn').length;
      toast(e + ' Error' + (e === 1 ? '' : 's') + ' · ' + w + ' Warning' + (w === 1 ? '' : 's') + ' — F8 To Jump');
    }
  }
}

function updateProbChip(){
  let e = 0, w = 0;
  for (const f of S.files){
    if (!f.model || f.model.isDisposed()) continue;
    for (const m of monaco.editor.getModelMarkers({ owner: LINT_OWNER, resource: f.model.uri })){
      if (m.severity === monaco.MarkerSeverity.Error) e++;
      else if (m.severity === monaco.MarkerSeverity.Warning) w++;
    }
  }
  spErr.textContent = String(e);
  spWarn.textContent = String(w);
  stProb.hidden = e === 0 && w === 0;
}

function nextProblem(back){
  const f = activeFile();
  if (!f || !editor.getModel()) return;
  const ms = monaco.editor.getModelMarkers({ owner: LINT_OWNER, resource: f.model.uri })
    .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn);
  if (!ms.length){ toast('No Problems In This File'); return; }
  const pos = editor.getPosition() || { lineNumber: 1, column: 1 };
  let idx = -1;
  if (back){
    for (let i = ms.length - 1; i >= 0; i--){
      if (ms[i].startLineNumber < pos.lineNumber || (ms[i].startLineNumber === pos.lineNumber && ms[i].startColumn < pos.column)){ idx = i; break; }
    }
    if (idx < 0) idx = ms.length - 1;
  } else {
    for (let i = 0; i < ms.length; i++){
      if (ms[i].startLineNumber > pos.lineNumber || (ms[i].startLineNumber === pos.lineNumber && ms[i].startColumn > pos.column)){ idx = i; break; }
    }
    if (idx < 0) idx = 0;
  }
  const m = ms[idx];
  editor.revealLineInCenter(m.startLineNumber);
  editor.setSelection(new monaco.Range(m.startLineNumber, m.startColumn, m.startLineNumber, Math.max(m.endColumn, m.startColumn + 1)));
  editor.setPosition({ lineNumber: m.startLineNumber, column: m.startColumn });
  editor.focus();
}

stProb.addEventListener('click', () => nextProblem(false));

async function profileFile(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const code = f.model.getValue();
  if (!code.trim()){ toast('Nothing To Profile — File Is Empty'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  if (S.running) return;
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Profiling ' + f.name + '…', true);
  openConsole();
  runHead('Profile · ' + f.name);
  S.lastTrace = { id: f.id, off: 0 };
  const t0 = performance.now();
  let out = null, errTxt = null;
  try {
    const r = py('profile', code, f.name);
    if (r){ out = r.text; errTxt = r.err; }
    else errTxt = 'Profiling Failed';
  } catch (e){ errTxt = e && e.message ? e.message : String(e); }
  if (out && out.trim()) appendLine(out.trimEnd());
  if (errTxt) renderError(errTxt);
  const dt = ((performance.now() - t0) / 1000).toFixed(2);
  if (S.lastHeadTime && S.lastHeadTime.isConnected) S.lastHeadTime.textContent = dt + 's';
  S.running = false;
  updateRunUI();
  stLeft.classList.remove('run');
  st('Profiled In ' + dt + 's', false);
  clearTimeout(stTimer);
  stTimer = setTimeout(() => { if (!S.running) st(pyStatusText, false); }, 4000);
  capturePlots();
  if (S.view === 'vars') refreshVars();
}

