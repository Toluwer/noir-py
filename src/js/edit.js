function clipCopySel(){
  const sel = editor.getSelection();
  if (!sel || sel.isEmpty() || !editor.getModel()) return;
  const t = editor.getModel().getValueInRange(sel);
  navigator.clipboard.writeText(t).catch(() => { try { document.execCommand('copy'); } catch (e) {} });
}

function clipCutSel(){
  const sel = editor.getSelection();
  if (!sel || sel.isEmpty() || !editor.getModel()) return;
  const t = editor.getModel().getValueInRange(sel);
  navigator.clipboard.writeText(t).catch(() => { try { document.execCommand('cut'); } catch (e) {} });
  editor.executeEdits('ctx', [{ range: sel, text: '' }]);
}

async function clipPaste(){
  let t = '';
  try { t = await navigator.clipboard.readText(); }
  catch (e) {
    try { document.execCommand('paste'); } catch (e2) { toast('Clipboard Blocked By The Browser'); }
    return;
  }
  if (!t) return;
  editor.executeEdits('ctx', [{ range: editor.getSelection(), text: t }]);
}

function runEditorAction(id){
  editor.focus();
  const a = editor.getAction(id);
  if (a) a.run();
}

function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let renameBox = null;

function closeRenameBox(){
  if (renameBox){ const b = renameBox; renameBox = null; b.remove(); if (editor) editor.focus(); }
}

function symbolStats(name){
  const defRe = '^[ \\t]*(?:async[ \\t]+def|def|class)[ \\t]+' + escapeRe(name) + '\\b';
  const asgRe = '^[ \\t]*' + escapeRe(name) + '[ \\t]*=(?!=)';
  const wordRe = '\\b' + escapeRe(name) + '\\b';
  let defined = false, total = 0;
  for (const f of S.files){
    try {
      if (!defined && (f.model.findMatches(defRe, false, true, true, null, false, 1).length ||
          f.model.findMatches(asgRe, false, true, true, null, false, 1).length)) defined = true;
    } catch (e) {}
    try { total += f.model.findMatches(wordRe, false, true, true, null, false, 2000).length; } catch (e) {}
  }
  return { defined, total };
}

function renameSymbolAt(){
  if (!editor || !editor.getModel() || !activeFile()){ toast('No File Open'); return; }
  if (!editor.hasTextFocus()) editor.focus();
  const model = editor.getModel();
  const pos = editor.getPosition();
  if (!pos) return;
  const w = model.getWordAtPosition(pos);
  if (!w || !/^[A-Za-z_]\w*$/.test(w.word)){ toast('Place The Cursor On A Symbol To Rename'); return; }
  const name = w.word;
  const stats = symbolStats(name);
  if (!stats.defined){ toast('Symbol Not Defined In The Workspace'); return; }
  if (!stats.total) return;
  closeRenameBox();
  const host = $('editor-host');
  const edRect = editor.getDomNode().getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const vis = editor.getScrolledVisiblePosition({ lineNumber: pos.lineNumber, column: w.startColumn });
  if (!vis) return;
  const box = document.createElement('input');
  box.className = 'ren-box';
  box.spellcheck = false;
  box.value = name;
  box.title = stats.total + ' Occurrence' + (stats.total === 1 ? '' : 's') + ' Across The Workspace';
  box.style.left = Math.max(6, Math.round(edRect.left - hostRect.left + vis.left) - 3) + 'px';
  box.style.top = Math.max(6, Math.round(edRect.top - hostRect.top + vis.top) - 2) + 'px';
  box.style.minWidth = Math.max(96, Math.round(w.word.length * 8.4) + 44) + 'px';
  host.appendChild(box);
  renameBox = box;
  box.focus();
  box.select();
  let done = false;
  const commit = ok => {
    if (done) return;
    done = true;
    const nv = box.value.trim();
    closeRenameBox();
    if (!ok || !nv || nv === name || !/^[A-Za-z_]\w*$/.test(nv)) return;
    const wordRe = '\\b' + escapeRe(name) + '\\b';
    let n = 0;
    for (const f of S.files){
      let ms = [];
      try { ms = f.model.findMatches(wordRe, false, true, true, null, false, 2000); } catch (e) {}
      if (ms.length){
        pushEdits(f.model, ms.map(m => ({ range: m.range, text: nv })));
        n += ms.length;
      }
    }
    saveWS();
    const cur = activeFile();
    if (cur) scheduleLintFor(cur.model);
    toast('Renamed ' + name + ' → ' + nv + ' · ' + n + ' Edit' + (n === 1 ? '' : 's'));
  };
  box.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter'){ e.preventDefault(); commit(true); }
    else if (e.key === 'Escape'){ e.preventDefault(); commit(false); }
  });
  box.addEventListener('blur', () => commit(true));
}

function gotoDefAction(){

  gotoDefAt();
}
function findRefsAction(){ findRefsAt(); }
function quickOutlineAction(){ runEditorAction('editor.action.quickOutline'); }

function flashLineAs(line, cls){
  if (!editor || !editor.getModel()) return;
  if (flashDeco) flashDeco.clear();
  flashDeco = editor.createDecorationsCollection([{
    range: new monaco.Range(line, 1, line, 1),
    options: { isWholeLine: true, className: cls }
  }]);
  setTimeout(() => { if (flashDeco){ flashDeco.clear(); flashDeco = null; } }, 2000);
}

function symbolWord(){
  if (!editor || !editor.getModel()) return null;
  const pos = editor.getPosition();
  if (!pos) return null;
  const w = editor.getModel().getWordAtPosition(pos);
  return w && /^[A-Za-z_]\w*$/.test(w.word) ? w : null;
}

function gotoDefAt(){
  const w = symbolWord();
  if (!w){ toast('Place The Cursor On A Symbol'); return; }
  const name = w.word;
  const pos = editor.getPosition();
  const defRe = '^[ \\t]*(?:async[ \\t]+def|def|class)[ \\t]+' + escapeRe(name) + '\\b';
  const asgRe = '^[ \\t]*' + escapeRe(name) + '[ \\t]*=(?!=)';
  const files = [...S.files].sort((a, b) => (b.id === S.activeId) - (a.id === S.activeId));
  for (const pass of [defRe, asgRe]){
    for (const f of files){
      let ms = [];
      try { ms = f.model.findMatches(pass, false, true, true, null, false, 1); } catch (e) {}
      if (!ms.length) continue;
      const m = ms[0];
      const line = m.range.startLineNumber;
      if (f.id !== S.activeId) switchTo(f.id);
      editor.revealLineInCenter(line);
      editor.setSelection(new monaco.Range(line, m.range.startColumn, line, m.range.endColumn));
      editor.setPosition({ lineNumber: line, column: m.range.startColumn });
      editor.focus();
      flashLineAs(line, 'def-flash');
      return;
    }
  }
  toast('No Definition Found In The Workspace');
}

function findRefsAt(){
  const w = symbolWord();
  if (!w){ toast('Place The Cursor On A Symbol'); return; }
  setView('search', { force: true });
  srQ.value = '\\b' + w.word + '\\b';
  SR.re = true; srRex.classList.add('on');
  SR.cs = true; srCase.classList.add('on');
  runSearch();
}

function editorMenu(x, y){
  const sel = editor.getSelection();
  const hasSel = sel && !sel.isEmpty() && !!editor.getModel();
  ctxShow(x, y, [
    { label: 'Cut', icon: 'scissors', disabled: !hasSel, fn: clipCutSel },
    { label: 'Copy', icon: 'copy', disabled: !hasSel, fn: clipCopySel },
    { label: 'Paste', icon: 'paste', fn: clipPaste },
    { sep: true },
    { label: 'Run File', icon: 'play', disabled: !activeFile(), fn: run },
    { label: 'Run Selection', icon: 'runSel', fn: runSelection },
    { label: 'Profile File', icon: 'gauge', fn: profileFile },
    { sep: true },
    { label: 'Go To Definition', icon: 'goto', fn: gotoDefAction },
    { label: 'Find All References', icon: 'search', fn: findRefsAction },
    { label: 'Go To Symbol…', icon: 'listTree', fn: quickOutlineAction },
    { sep: true },
    { label: 'Toggle Line Comment', icon: 'hash', fn: () => runEditorAction('editor.action.commentLine') },
    { label: 'Duplicate Selection', icon: 'copyPlus', fn: () => runEditorAction('editor.action.duplicateSelection') },
    { label: 'Rename Symbol', icon: 'pencil', fn: renameSymbolAt },
    { label: 'Format Document', icon: 'wand', fn: formatDocument },
    { label: 'Find In Files', icon: 'search', fn: openSearch },
    { sep: true },
    { label: 'Ghost Text Settings…', icon: 'wand', fn: openAIModal },
    { label: 'Ink Theme', icon: 'moon', on: () => S.prefs.theme === 'ink', fn: toggleTheme },
    { label: 'Command Palette…', icon: 'command', fn: () => openPalette('>') }
  ]);
}

