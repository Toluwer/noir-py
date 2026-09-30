const SNAP = {};

function pushSnap(fileId, text){
  const arr = SNAP[fileId] || (SNAP[fileId] = []);
  const last = arr[arr.length - 1];
  if (last && last.text === text) return;
  arr.push({ t: Date.now(), text });
  if (arr.length > 20) arr.shift();
}

function renderHist(){
  const f = activeFile();
  hvName.textContent = f ? f.name : '';
  hvList.textContent = '';
  if (!f){ hvList.dataset.empty = 'No File Open'; return; }
  const arr = SNAP[f.id] || [];
  if (!arr.length){ hvList.dataset.empty = 'No Snapshots Yet — One Is Taken Each Time You Run A File'; return; }
  const cur = f.model ? f.model.getValue() : '';
  for (const s of [...arr].reverse()){
    const row = h('div', 'hv-row');
    const d = new Date(s.t);
    row.appendChild(h('span', 'hv-time', String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')));
    row.appendChild(h('span', 'hv-chars', s.text.length.toLocaleString() + ' Chars'));
    const dl = s.text.length - cur.length;
    row.appendChild(h('span', 'hv-delta' + (dl > 0 ? ' add' : dl < 0 ? ' del' : ' same'), (dl > 0 ? '+' : '') + dl));
    row.title = 'Compare With Current File';
    row.addEventListener('click', () => openDiff(f, s));
    hvList.appendChild(row);
  }
}

let diffEd = null, dwCur = null;

function openDiff(f, snap){
  if (!plotWrap.hidden) closePlot();
  const d = new Date(snap.t);
  dwLabel.textContent = f.name + ' · Snapshot ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  diffWrap.hidden = false;
  if (!diffEd){
    diffEd = monaco.editor.createDiffEditor(diffHost, {
      theme: S.prefs.theme === 'ink' ? 'ink' : 'paper', automaticLayout: true, readOnly: true,
      fontFamily: MONO_FONT,
      fontSize: S.prefs.fontSize, lineHeight: 22, fontLigatures: true,
      renderSideBySide: true, scrollBeyondLastLine: false,
      minimap: { enabled: false }, overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
      padding: { top: 10, bottom: 10 }, lineNumbersMinChars: 2, lineDecorationsWidth: 6,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false }
    });
  }
  if (dwCur) dwCur.orig.dispose();
  const orig = monaco.editor.createModel(snap.text, 'python');
  dwCur = { f, snap, orig };
  diffEd.setModel({ original: orig, modified: f.model });
}

function closeDiff(){
  diffWrap.hidden = true;
  if (dwCur && diffEd){
    diffEd.setModel(null);
    dwCur.orig.dispose();
    dwCur = null;
  }
}

function restoreDiff(){
  if (!dwCur) return;
  const f = dwCur.f, snap = dwCur.snap;
  const m = f.model;
  const full = new monaco.Range(1, 1, m.getLineCount(), m.getLineMaxColumn(m.getLineCount()));
  pushEdits(m, [{ range: full, text: snap.text }]);
  closeDiff();
  saveWS();
  scheduleLintFor(m);
  renderHist();
  toast('Restored Snapshot — Undo Again To Revert');
}

$('dw-close').addEventListener('click', closeDiff);
$('dw-restore').addEventListener('click', restoreDiff);

