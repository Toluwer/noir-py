let ctxEl = null, ctxRows = [], ctxSel = 0, ctxFromMenu = null;

function ctxClose(){
  if (ctxEl){ ctxEl.remove(); ctxEl = null; ctxRows = []; }
  if (ctxFromMenu){ ctxFromMenu.classList.remove('open'); ctxFromMenu = null; }
}

function ctxMark(){
  ctxRows.forEach((r, i) => r.classList.toggle('sel', i === ctxSel));
  if (ctxRows[ctxSel]) ctxRows[ctxSel].scrollIntoView({ block: 'nearest' });
}

function ctxMove(d){
  if (!ctxRows.length) return;
  ctxSel = (ctxSel + d + ctxRows.length) % ctxRows.length;
  ctxMark();
}

function ctxShow(x, y, items){
  ctxClose();
  const live = items.filter(Boolean);
  if (!live.length) return;
  ctxEl = h('div', 'ctx');
  ctxEl.setAttribute('role', 'menu');
  ctxRows = [];
  for (const it of live){
    if (it.sep){ ctxEl.appendChild(h('div', 'ctx-sep')); continue; }
    const row = h('button', 'ctx-i');
    row.type = 'button';
    if (it.danger) row.classList.add('danger');
    if (it.disabled) row.classList.add('disabled');
    row.innerHTML = ICONS[it.icon] || '';
    row.appendChild(h('span', 'ctx-label', it.label));
    if (it.key) row.appendChild(h('span', 'ctx-key', KD(it.key)));
    if (it.on) { const chk = h('span', 'ctx-check'); chk.innerHTML = ICONS.check; row.appendChild(chk); }
    if (!it.disabled) row.addEventListener('click', () => { const fn = it.fn; ctxClose(); fn(); });
    row.addEventListener('mouseenter', () => { ctxSel = ctxRows.indexOf(row); ctxMark(); });
    ctxEl.appendChild(row);
    ctxRows.push(row);
  }
  document.body.appendChild(ctxEl);
  const r = ctxEl.getBoundingClientRect();
  if (x + r.width > innerWidth - 8) x = Math.max(8, innerWidth - r.width - 8);
  if (y + r.height > innerHeight - 8) y = Math.max(8, y - r.height - 8);
  ctxEl.style.left = Math.round(x) + 'px';
  ctxEl.style.top = Math.round(y) + 'px';
  ctxSel = 0;
  ctxMark();
}

window.addEventListener('mousedown', e => { if (ctxEl && !ctxEl.contains(e.target) && !e.target.closest('.menu-btn')) ctxClose(); }, true);
window.addEventListener('scroll', () => ctxClose(), true);
window.addEventListener('blur', () => ctxClose());

window.addEventListener('keydown', e => {
  if (!ctxEl) return;
  if (e.ctrlKey || e.metaKey || e.altKey){ ctxClose(); return; }
  if (e.key === 'ArrowDown'){ e.preventDefault(); e.stopImmediatePropagation(); ctxMove(1); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); e.stopImmediatePropagation(); ctxMove(-1); }
  else if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.stopImmediatePropagation(); const row = ctxRows[ctxSel]; if (row) row.click(); }
  else if (e.key === 'Escape' || e.key === 'Tab'){ e.preventDefault(); e.stopImmediatePropagation(); ctxClose(); }
  else { e.preventDefault(); e.stopImmediatePropagation(); ctxClose(); }
}, true);

const MENUS = {
  file: () => [
    { label: 'New File', icon: 'plus', fn: newFile },
    { label: 'Open File…', icon: 'folderOpen', key: 'Ctrl+O', fn: () => filePick.click() },
    { sep: true },
    { label: 'Save File', icon: 'save', key: 'Ctrl+S', fn: () => { saveWS(); toast('Saved'); } },
    { label: 'Download File', icon: 'download', key: 'Ctrl+Shift+S', fn: () => downloadFile() },
    { label: 'Copy Share Link', icon: 'link', fn: () => copyShareLink() },
    { sep: true },
    { label: 'Close File', icon: 'x', disabled: !activeFile(), fn: () => { const f = activeFile(); if (f) deleteFile(f.id); } }
  ],
  edit: () => [
    { label: 'Undo', icon: 'undo', key: 'Ctrl+Z', fn: () => runEditorAction('undo') },
    { label: 'Redo', icon: 'redo', key: IS_MAC ? 'Ctrl+Shift+Z' : 'Ctrl+Y', fn: () => runEditorAction('redo') },
    { sep: true },
    { label: 'Find & Replace…', icon: 'search', fn: () => runEditorAction('editor.action.startFindReplaceAction') },
    { label: 'Format Document', icon: 'wand', key: 'Shift+Alt+F', fn: formatDocument },
    { label: 'Toggle Line Comment', icon: 'hash', fn: () => runEditorAction('editor.action.commentLine') },
    { sep: true },
    { label: 'Rename Symbol', icon: 'pencil', key: 'F2', fn: renameSymbolAt },
    { label: 'Duplicate Selection', icon: 'copyPlus', fn: () => runEditorAction('editor.action.duplicateSelection') }
  ],
  view: () => [
    { label: 'Show Sidebar', icon: 'panelLeft', key: 'Ctrl+B', on: () => S.prefs.sidebar, fn: () => toggleSidebar() },
    { label: 'Show Console', icon: 'panelBottom', key: 'Ctrl+J', on: () => S.prefs.console, fn: () => toggleConsole() },
    { sep: true },
    { label: 'Explorer', icon: 'fileCode', fn: () => setView('files', { force: true }) },
    { label: 'Search', icon: 'search', key: 'Ctrl+Shift+F', fn: () => setView('search', { force: true }) },
    { label: 'Variables', icon: 'activity', fn: () => setView('vars', { force: true }) },
    { label: 'Plots', icon: 'chart', fn: () => setView('plots', { force: true }) },
    { label: 'History', icon: 'history', fn: () => setView('hist', { force: true }) },
    { sep: true },
    { label: 'Show Minimap', icon: 'map', on: () => S.prefs.minimap, fn: () => toggleMinimap() },
    { label: 'Word Wrap', icon: 'wrap', on: () => S.prefs.wordWrap, fn: () => toggleWrap() },
    { sep: true },
    { label: 'Zoom In', icon: 'zoomIn', key: 'Ctrl+=', fn: () => setFont(S.prefs.fontSize + 1) },
    { label: 'Zoom Out', icon: 'zoomOut', key: 'Ctrl+-', fn: () => setFont(S.prefs.fontSize - 1) },
    { label: 'Reset Font Size', icon: 'type', key: 'Ctrl+0', fn: () => resetFont() },
    { sep: true },
    { label: 'Ink Theme', icon: 'moon', on: () => S.prefs.theme === 'ink', fn: toggleTheme }
  ],
  run: () => [
    { label: 'Run File', icon: 'play', key: 'Ctrl+Enter', disabled: !activeFile(), fn: () => run() },
    { label: 'Run Selection', icon: 'runSel', key: 'Ctrl+Shift+Enter', fn: () => runSelection() },
    { label: 'Profile File', icon: 'gauge', fn: () => profileFile() },
    { sep: true },
    { label: 'Restart Runtime', icon: 'rotate', fn: () => restartRuntime() },
    { label: 'Clear Console', icon: 'eraser', key: 'Ctrl+L', fn: () => clearConsole() }
  ],
  tools: () => [
    { label: 'Command Palette…', icon: 'command', key: 'Ctrl+K', fn: () => openPalette('>') },
    { label: 'Install Package…', icon: 'box', fn: () => openPalette('install ') },
    { label: 'Ghost Text Settings…', icon: 'wand', fn: () => openAIModal() },
    { sep: true },
    { label: 'Lint File', icon: 'circleX', fn: () => { const f = activeFile(); if (f) lintModel(f.model, true); } },
    { label: 'Next Problem', icon: 'chevDown', key: 'F8', fn: () => nextProblem(false) }
  ],
  help: () => [
    { label: 'About noir.py', icon: 'info', fn: openAbout },
    { label: 'Keyboard Shortcuts', icon: 'command', fn: () => openPalette('>') },
    { label: 'Pyodide Docs', icon: 'externalLink', fn: () => window.open('https://pyodide.org/en/stable/usage/index.html', '_blank') }
  ]
};

function menuBarShow(btn, name){
  const build = MENUS[name];
  if (!build) return;
  const r = btn.getBoundingClientRect();
  ctxShow(r.left, r.bottom + 4, build());
  ctxFromMenu = btn;
  btn.classList.add('open');
}

function menuBarClick(e){
  const btn = e.currentTarget;
  if (ctxFromMenu === btn){ ctxClose(); return; }
  menuBarShow(btn, btn.dataset.menu);
}

let menuFocusTimer = 0;
document.querySelectorAll('.menu-btn').forEach(btn => {
  btn.addEventListener('click', menuBarClick);
  btn.addEventListener('mouseenter', () => {
    if (!ctxFromMenu) return;
    clearTimeout(menuFocusTimer);
    menuFocusTimer = setTimeout(() => { if (ctxFromMenu && ctxFromMenu !== btn) menuBarShow(btn, btn.dataset.menu); }, 60);
  });
});

