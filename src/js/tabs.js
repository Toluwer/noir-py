function duplicateFile(f){
  const names = new Set(S.files.map(o => o.name));
  const base = f.name.replace(/\.py$/i, '');
  let name = base + '-copy.py', i = 2;
  while (names.has(name)) name = base + '-copy-' + (i++) + '.py';
  createFile(name, f.model.getValue());
  toast('Duplicated As ' + name);
}

function closeOthers(keep){
  const removed = S.files.filter(f => f.id !== keep.id).map(f => ({ id: f.id, name: f.name, content: f.model.getValue() }));
  if (!removed.length) return;
  if (dwCur && removed.some(r => r.id === dwCur.f.id)) closeDiff();
  for (const f of S.files) if (f.id !== keep.id) disposeModel(f.model);
  S.files = S.files.filter(f => f.id === keep.id);
  switchTo(keep.id);
  saveWS();
  updateProbChip();
  toast('Closed ' + removed.length + ' File' + (removed.length === 1 ? '' : 's'), { label: 'Undo', fn(){
    for (const r of removed){
      let name = r.name, i = 2;
      while (S.files.some(o => o.name === name)) name = r.name.replace(/\.py$/i, '') + '-' + (i++) + '.py';
      createFile(name, r.content, { activate: false });
    }
    refreshChrome();
    saveWS();
  }});
}

function closeAll(){
  const removed = S.files.map(f => ({ name: f.name, content: f.model.getValue() }));
  if (!removed.length) return;
  if (dwCur) closeDiff();
  for (const f of S.files) disposeModel(f.model);
  S.files = [];
  S.activeId = null;
  if (editor) editor.setModel(null);
  refreshChrome();
  updateProbChip();
  saveWS();
  toast('Closed All Files', { label: 'Undo', fn(){
    for (const r of removed){
      let name = r.name, i = 2;
      while (S.files.some(o => o.name === name)) name = r.name.replace(/\.py$/i, '') + '-' + (i++) + '.py';
      createFile(name, r.content, { activate: false });
    }
    const first = S.files[0];
    if (first) switchTo(first.id); else refreshChrome();
    saveWS();
  }});
}

function fileMenu(x, y, f, fromTab){
  ctxShow(x, y, [
    fromTab
      ? { label: 'Close', icon: 'x', fn: () => deleteFile(f.id) }
      : { label: 'Open', icon: 'fileCode', disabled: f.id === S.activeId, fn: () => switchTo(f.id) },
    fromTab && { label: 'Close Others', icon: 'x', fn: () => closeOthers(f) },
    fromTab && { label: 'Close All', icon: 'x', fn: closeAll },
    { sep: true },
    { label: 'Rename', icon: 'pencil', fn: () => { switchTo(f.id); startRename(f); } },
    { label: 'Duplicate', icon: 'copyPlus', fn: () => duplicateFile(f) },
    { label: 'Download', icon: 'download', fn: () => { switchTo(f.id); downloadFile(); } },
    { label: 'Copy Share Link', icon: 'link', fn: () => { switchTo(f.id); copyShareLink(); } },
    { sep: true },
    { label: 'History', icon: 'history', fn: () => { switchTo(f.id); setView('hist', { force: true }); } },
    { sep: true },
    { label: 'Delete', icon: 'trash', danger: true, fn: () => deleteFile(f.id) }
  ]);
}

function saveConsoleOutput(){
  const parts = [];
  conBody.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => parts.push(n.textContent));
  const t = parts.join('\n');
  if (!t.trim()){ toast('Console Is Empty'); return; }
  const blob = new Blob([t], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'console.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Saved console.txt');
}

function consoleMenu(x, y){
  const hasSel = !!String(window.getSelection());
  ctxShow(x, y, [
    { label: 'Copy', icon: 'copy', disabled: !hasSel, fn: () => { try { document.execCommand('copy'); } catch (e) {} } },
    { label: 'Copy All Output', icon: 'copy', fn: copyOutput },
    { sep: true },
    { label: 'Clear Console', icon: 'eraser', fn: clearConsole },
    { label: 'Save Output As .txt', icon: 'download', fn: saveConsoleOutput }
  ]);
}

conBody.addEventListener('contextmenu', e => {
  e.preventDefault();
  consoleMenu(e.clientX, e.clientY);
});

function varMenu(x, y, name, val){
  ctxShow(x, y, [
    { label: 'Insert At Cursor', icon: 'insert', fn: () => insertName(name) },
    { label: 'Copy Name', icon: 'copy', fn: () => navigator.clipboard.writeText(name).then(() => toast('Copied'), () => toast('Copy Failed')) },
    { label: 'Copy Value', icon: 'copy', fn: () => navigator.clipboard.writeText(val).then(() => toast('Copied'), () => toast('Copy Failed')) },
    { sep: true },
    { label: 'Refresh', icon: 'rotate', fn: refreshVars }
  ]);
}

emptyState.addEventListener('contextmenu', e => {
  e.preventDefault();
  ctxShow(e.clientX, e.clientY, [
    { label: 'New File', icon: 'plus', fn: newFile },
    { label: 'Open File…', icon: 'folderOpen', fn: () => filePick.click() },
    { sep: true },
    { label: 'Command Palette…', icon: 'command', fn: () => openPalette('>') }
  ]);
});

