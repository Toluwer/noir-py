window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !aiModal.hidden){ e.preventDefault(); closeAIModal(); return; }
  if (e.key === 'Escape' && !aboutModal.hidden){ e.preventDefault(); closeAbout(); return; }
  if (e.key === 'Escape' && palOpenState){ e.preventDefault(); closePalette(); return; }
  if (e.key === 'Escape' && !diffWrap.hidden){ e.preventDefault(); closeDiff(); return; }
  if (e.key === 'Escape' && !plotWrap.hidden){ e.preventDefault(); closePlot(); return; }
  const tgt = e.target;
  if (tgt && tgt.tagName === 'INPUT') return;
  if (tgt && tgt.tagName === 'TEXTAREA' && !(tgt.closest && tgt.closest('.monaco-editor'))) return;
  if (!e.ctrlKey && !e.metaKey && e.key === 'F8' && !e.altKey){
    e.preventDefault();
    e.stopPropagation();
    nextProblem(e.shiftKey);
    return;
  }
  if (e.key === 'F2' && !e.ctrlKey && !e.metaKey && !e.altKey){
    if (editor && editor.hasTextFocus()){ e.preventDefault(); renameSymbolAt(); }
    return;
  }
  if (e.key === 'F12' && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey){
    if (editor && editor.hasTextFocus()){ e.preventDefault(); findRefsAt(); }
    return;
  }
  if (e.key === 'F12' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey){
    if (editor && editor.hasTextFocus()){ e.preventDefault(); gotoDefAt(); }
    return;
  }
  if (e.shiftKey && e.altKey && !e.ctrlKey && !e.metaKey && e.key.toLowerCase() === 'f'){
    e.preventDefault();
    e.stopPropagation();
    formatDocument();
    return;
  }
  const mod = e.metaKey || e.ctrlKey;
  if (!mod){
    if (e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z'){ e.preventDefault(); toggleWrap(); return; }
    if (S.inputField && e.key.length === 1 && !e.altKey){
      const ae = document.activeElement;
      const free = !ae || ae === document.body || (editor && ae === editor.getDomNode()) || (editor && editor.hasTextFocus());
      if (free){
        e.preventDefault();
        S.inputField.focus();
        S.inputField.value += e.key;
      }
    }
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'enter'){ e.preventDefault(); e.stopPropagation(); if (e.shiftKey) runSelection(); else run(); }
  else if (k === 'g'){ e.preventDefault(); e.stopPropagation(); if (editor){ editor.focus(); const a = editor.getAction('editor.action.gotoLine'); if (a) a.run(); } }
  else if (k === 's' && e.shiftKey){ e.preventDefault(); e.stopPropagation(); downloadFile(); }
  else if (k === 's'){ e.preventDefault(); e.stopPropagation(); saveWS(); toast('Saved'); }
  else if (k === 'o' && e.shiftKey){ e.preventDefault(); e.stopPropagation(); if (editor){ editor.focus(); quickOutlineAction(); } }
  else if (k === 'o'){ e.preventDefault(); e.stopPropagation(); filePick.click(); }
  else if (k === 'f' && e.shiftKey){ e.preventDefault(); e.stopPropagation(); openSearch(); }
  else if (k === 'h' && e.shiftKey){ e.preventDefault(); e.stopPropagation(); openSearch(); }
  else if (k === '=' || k === '+'){ e.preventDefault(); e.stopPropagation(); setFont(S.prefs.fontSize + 1); }
  else if (k === '-'){ e.preventDefault(); e.stopPropagation(); setFont(S.prefs.fontSize - 1); }
  else if (k === '0'){ e.preventDefault(); e.stopPropagation(); resetFont(); }
  else if (k === '`'){ e.preventDefault(); e.stopPropagation(); focusConsoleInput(); }
  else if (k === 'k' && !e.shiftKey){ e.preventDefault(); e.stopPropagation(); openPalette(''); }
  else if (k === 'p' && e.shiftKey){ e.preventDefault(); e.stopPropagation(); openPalette('>'); }
  else if (k === 'p'){ e.preventDefault(); e.stopPropagation(); openPalette(''); }
  else if (k === 'b'){ e.preventDefault(); e.stopPropagation(); toggleSidebar(); }
  else if (k === 'j'){ e.preventDefault(); e.stopPropagation(); toggleConsole(); }
  else if (k === 'l'){ e.preventDefault(); e.stopPropagation(); clearConsole(); }
}, true);

window.addEventListener('beforeunload', saveWS);

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  importFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
});

