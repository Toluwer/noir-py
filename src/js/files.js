function createFile(name, content, opts){
  opts = opts || {};
  const f = { id: ++S.uid, name: name, model: null };
  if (S.monacoReady){
    f.model = monaco.editor.createModel(content || '', 'python', monaco.Uri.file('/' + name));
  }
  S.files.push(f);
  if (opts.activate !== false) switchTo(f.id); else refreshChrome();
  saveWS();
  return f;
}

function switchTo(id){
  const f = fileById(id);
  if (!f) return;
  S.activeId = id;
  if (S.monacoReady && editor){
    editor.setModel(f.model);
    refreshStatusBtns();
    const p = editor.getPosition();
    if (p) stPos.textContent = 'Ln ' + p.lineNumber + ', Col ' + p.column;
  }
  refreshChrome();
  saveWS();
  if (S.view === 'hist') renderHist();

  if (window.innerWidth < 860 && S.prefs.sidebar){
    S.prefs.sidebar = false;
    app.classList.add('no-sidebar');
  }
}

function renameFile(f, name){
  const val = f.model.getValue();
  const m = monaco.editor.createModel(val, 'python', monaco.Uri.file('/' + name));
  disposeModel(f.model);
  f.model = m;
  f.name = name;
  if (S.activeId === f.id && editor) editor.setModel(m);
  refreshChrome();
  saveWS();
}

function startRename(f){
  renderSidebar();
  const li = fileListEl.querySelector('.fi[data-id="' + f.id + '"]');
  if (!li) return;
  const nameEl = li.querySelector('.fi-name');
  const inp = document.createElement('input');
  inp.className = 'rename-field';
  inp.value = f.name.replace(/\.py$/i, '');
  inp.spellcheck = false;
  nameEl.replaceWith(inp);
  li.querySelector('.fi-x').style.visibility = 'hidden';
  inp.focus();
  inp.select();
  let closed = false;
  const close = commit => {
    if (closed) return;
    closed = true;
    const v = inp.value.trim();
    if (commit && v){
      let name = v;
      if (!/\.py$/i.test(name)) name += '.py';
      if (!/^[\w .()-]+$/.test(name)) toast('Invalid File Name');
      else if (S.files.some(o => o !== f && o.name === name)) toast('A File With This Name Already Exists');
      else if (name !== f.name){ renameFile(f, name); return; }
    }
    renderSidebar();
    renderTabs();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter'){ e.preventDefault(); close(true); }
    else if (e.key === 'Escape'){ e.preventDefault(); close(false); }
  });
  inp.addEventListener('blur', () => close(true));
  inp.addEventListener('click', e => e.stopPropagation());
}

function newFile(){
  if (!S.monacoReady){ toast('Editor Is Still Loading…'); return; }
  const names = new Set(S.files.map(f => f.name));
  let name = 'untitled.py', i = 2;
  while (names.has(name)) name = 'untitled-' + (i++) + '.py';
  const f = createFile(name, '');
  startRename(f);
}

function disposeModel(m){
  if (!m || m.isDisposed()) return;
  try { ghostLineCache.delete(m.uri.toString()); } catch (e) {}
  try { monaco.editor.setModelMarkers(m, LINT_OWNER, []); } catch (e) {}
  m.dispose();
}

function deleteFile(id){
  const i = S.files.findIndex(f => f.id === id);
  if (i < 0) return;
  const f = S.files[i];
  const snap = { name: f.name, content: f.model ? f.model.getValue() : '', at: i };
  if (S.activeId === id && editor) editor.setModel(null);
  if (dwCur && dwCur.f === f) closeDiff();
  disposeModel(f.model);
  S.files.splice(i, 1);
  if (S.activeId === id){
    const next = S.files[i] || S.files[i - 1];
    if (next) switchTo(next.id);
    else { S.activeId = null; if (editor) editor.setModel(null); }
  }
  refreshChrome();
  saveWS();
  toast('Deleted ' + snap.name, { label: 'Undo', fn(){
    let name = snap.name;
    if (S.files.some(o => o.name === name)) name = name.replace(/\.py$/i, '') + '-restored.py';
    const nf = createFile(name, snap.content, { activate: false });
    S.files.pop();
    S.files.splice(Math.min(snap.at, S.files.length), 0, nf);
    if (!S.activeId) switchTo(nf.id); else refreshChrome();
    saveWS();
  }});
}

function refreshStatusBtns(){
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  stSpaces.textContent = 'Spaces: ' + m.getOptions().tabSize;
  stEol.textContent = m.getEOL() === '\n' ? 'LF' : 'CRLF';
}

function importFile(file){
  if (!file || !S.monacoReady || !/\.(py|txt)$/i.test(file.name)) return;
  file.text().then(t => {
    let name = file.name.replace(/\.txt$/i, '.py');
    const names = new Set(S.files.map(o => o.name));
    if (names.has(name)){
      let i = 2;
      const base = name.replace(/\.py$/i, '');
      while (names.has(base + '-' + i + '.py')) i++;
      name = base + '-' + i + '.py';
    }
    createFile(name, t);
    toast('Opened ' + name);
  });
}

function downloadFile(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const blob = new Blob([f.model.getValue()], { type: 'text/x-python' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Downloaded ' + f.name);
}

