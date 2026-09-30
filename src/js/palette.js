const COMMANDS = [
  { label: 'Run File', icon: 'play', fn: () => run() },
  { label: 'Run Selection', icon: 'runSel', fn: () => runSelection() },
  { label: 'Profile File', icon: 'gauge', fn: () => profileFile() },
  { label: 'New File', icon: 'plus', fn: () => newFile() },
  { label: 'Save File', icon: 'save', fn: () => { saveWS(); toast('Saved'); } },
  { label: 'Open File…', icon: 'folderOpen', fn: () => filePick.click() },
  { label: 'Download File', icon: 'download', fn: () => downloadFile() },
  { label: 'Copy Share Link', icon: 'link', fn: () => copyShareLink() },
  { label: 'Find In Files', icon: 'search', fn: () => openSearch() },
  { label: 'Go To Symbol…', icon: 'listTree', fn: () => { if (editor){ editor.focus(); quickOutlineAction(); } } },
  { label: 'Lint File', icon: 'circleX', fn: () => { const f = activeFile(); if (f) lintModel(f.model, true); } },
  { label: 'Format Document', icon: 'wand', fn: () => formatDocument() },
  { label: 'Rename Symbol', icon: 'pencil', fn: () => renameSymbolAt() },
  { label: 'Next Problem', icon: 'chevDown', fn: () => nextProblem(false) },
  { label: 'Install Package…', icon: 'box', fn: () => openPalette('install ') },
  { label: 'Ghost Text Settings…', icon: 'wand', fn: () => openAIModal() },
  { label: 'About noir.py', icon: 'info', fn: openAbout },
  { label: 'Toggle Ink Theme', icon: 'moon', fn: toggleTheme },
  { label: 'Clear Console', icon: 'eraser', fn: () => clearConsole() },
  { label: 'Copy Console Output', icon: 'copy', fn: () => copyOutput() },
  { label: 'Restart Runtime', icon: 'rotate', fn: () => restartRuntime() },
  { label: 'View: Explorer', icon: 'fileCode', fn: () => setView('files', { force: true }) },
  { label: 'View: Search', icon: 'search', fn: () => setView('search', { force: true }) },
  { label: 'View: Variables', icon: 'activity', fn: () => setView('vars', { force: true }) },
  { label: 'View: Plots', icon: 'chart', fn: () => setView('plots', { force: true }) },
  { label: 'View: History', icon: 'history', fn: () => setView('hist', { force: true }) },
  { label: 'Toggle Sidebar', icon: 'panelLeft', fn: () => toggleSidebar() },
  { label: 'Toggle Console', icon: 'panelBottom', fn: () => toggleConsole() },
  { label: 'Focus Console', icon: 'terminal', fn: () => focusConsoleInput() },
  { label: 'Zoom In', icon: 'zoomIn', fn: () => setFont(S.prefs.fontSize + 1) },
  { label: 'Zoom Out', icon: 'zoomOut', fn: () => setFont(S.prefs.fontSize - 1) },
  { label: 'Reset Font Size', icon: 'type', fn: () => resetFont() },
  { label: 'Toggle Minimap', icon: 'map', fn: () => toggleMinimap() },
  { label: 'Toggle Word Wrap', icon: 'wrap', fn: () => toggleWrap() },
  { label: 'Close File', icon: 'x', fn: () => { const f = activeFile(); if (f) deleteFile(f.id); } }
];

let palOpenState = false, palItems = [], palSel = 0;

function fuzzy(q, s){
  if (!q) return { score: 0, idxs: [] };
  q = q.toLowerCase();
  const t = s.toLowerCase();
  let qi = 0, score = 0, last = -2;
  const idxs = [];
  for (let i = 0; i < t.length && qi < q.length; i++){
    if (t[i] === q[qi]){
      idxs.push(i);
      score += (i === last + 1 ? 3 : 1) + (i === 0 || /[^a-z0-9]/.test(t[i - 1]) ? 2 : 0);
      last = i;
      qi++;
    }
  }
  return qi === q.length ? { score: score, idxs: idxs } : null;
}

function markSel(){
  const rows = palList.querySelectorAll('.pal-row');
  rows.forEach((r, i) => r.classList.toggle('sel', i === palSel));
  if (rows[palSel]) rows[palSel].scrollIntoView({ block: 'nearest' });
}

function execItem(i){
  const it = palItems[i];
  if (!it) return;
  closePalette();
  it.fn();
}

function renderPal(){
  const raw = palField.value;
  const isCmd = raw.startsWith('>');
  const isInst = !isCmd && /^install(\s|$)/i.test(raw);
  const isSym = !isCmd && !isInst && raw.startsWith('@');
  const isSnip = !isCmd && !isInst && !isSym && raw.startsWith('#');
  const q = isCmd || isInst || isSym || isSnip ? '' : raw.trim();
  palItems = [];
  if (isInst){
    const name = raw.slice(7).trim();
    if (name) palItems.push({ label: 'Install "' + name + '" From PyPI', icon: 'box', hl: [], sc: 0, fn: () => installPackage(name) });
  } else if (isSym){
    const f = activeFile();
    if (f && S.pyReady){
      const sq = raw.slice(1).trim();
      const syms = py('outline_flat', f.model.getValue()) || [];
      for (const s of syms){
        const m = fuzzy(sq, s.p);
        if (m) palItems.push({ label: s.p, icon: s.k === 'class' ? 'fileCode' : 'listTree', hl: m.idxs, sc: m.score, fn: () => {
          switchTo(f.id);
          editor.revealLineInCenter(s.l);
          editor.setPosition({ lineNumber: s.l, column: 1 });
          editor.focus();
        } });
      }
    }
  } else if (isSnip){
    const sq = raw.slice(1).trim();
    for (const sn of SNIPS){
      const m = fuzzy(sq, sn.l + ' ' + (sn.d || ''));
      if (m) palItems.push({ label: sn.l, icon: 'insert', hl: m.idxs.filter(i => i < sn.l.length), sc: m.score, fn: () => insertSnippetAtCursor(sn) });
    }
  } else if (isCmd){
    const sq = raw.slice(1).trim();
    for (const c of COMMANDS){
      const m = fuzzy(sq, c.label);
      if (m) palItems.push({ label: c.label, icon: c.icon, hl: m.idxs, sc: m.score, fn: c.fn });
    }
  } else {
    for (const f of S.files){
      const m = fuzzy(q, f.name);
      if (m) palItems.push({ label: f.name, icon: 'python', hl: m.idxs, sc: m.score, fn: () => switchTo(f.id) });
    }
  }
  palItems.sort((a, b) => (b.sc || 0) - (a.sc || 0) || a.label.localeCompare(b.label));
  palSel = 0;
  palList.textContent = '';
  palList.appendChild(h('div', 'pal-sec', isCmd ? 'Commands' : isInst ? 'PyPI Package' : isSym ? 'Symbols' : isSnip ? 'Snippets' : 'Files'));
  if (!palItems.length){
    palList.appendChild(h('div', 'pal-none', isInst ? 'Type A Package Name, Then Press Enter' : isSym && !S.pyReady ? 'Python Runtime Is Still Loading…' : isSnip && !SNIPS.length ? 'Loading Snippets…' : 'No Results'));
    return;
  }
  palItems.forEach((it, i) => {
    const row = h('div', 'pal-row' + (i === 0 ? ' sel' : ''));
    row.innerHTML = ICONS[it.icon] || '';
    const lab = h('span', 'pr-label');
    const set = new Set(it.hl || []);
    let buf = '';
    for (let j = 0; j < it.label.length; j++){
      if (set.has(j)){
        if (buf){ lab.appendChild(document.createTextNode(buf)); buf = ''; }
        const b = h('b', 'hl', it.label[j]);
        lab.appendChild(b);
      } else buf += it.label[j];
    }
    if (buf) lab.appendChild(document.createTextNode(buf));
    row.appendChild(lab);
    row.addEventListener('mouseenter', () => { palSel = i; markSel(); });
    row.addEventListener('click', () => execItem(i));
    palList.appendChild(row);
  });
}

function openPalette(seed){
  palOpenState = true;
  pal.hidden = false;
  palField.value = seed || '';
  renderPal();
  requestAnimationFrame(() => pal.classList.add('on'));
  setTimeout(() => palField.focus(), 0);
}

function closePalette(){
  palOpenState = false;
  pal.classList.remove('on');
  setTimeout(() => { pal.hidden = true; }, 160);
  if (editor) editor.focus();
}

function insertSnippetAtCursor(sn){
  if (!editor || !activeFile()){ toast('No File Open'); return; }
  const model = editor.getModel();
  if (!model){ toast('No File Open'); return; }
  GHOST.cool = Date.now() + 1600;
  editor.focus();
  const pos = editor.getPosition();
  if (!pos) return;
  const before = model.getValue();
  try { editor.trigger('noir', 'editor.action.insertSnippet', { snippet: sn.i }); } catch (e) {}
  if (model.getValue() === before){

    const plain = sn.i.replace(/\$\{(\d+):([^}]*)\}/g, '$2').replace(/\$\d+/g, '');
    editor.executeEdits('noir', [{ range: editor.getSelection(), text: plain }]);
  }
}

$('btn-palette').addEventListener('click', () => openPalette(''));
palField.addEventListener('input', renderPal);
palField.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'ArrowDown'){ e.preventDefault(); palSel = Math.min(palSel + 1, palItems.length - 1); markSel(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); palSel = Math.max(palSel - 1, 0); markSel(); }
  else if (e.key === 'Enter'){ e.preventDefault(); execItem(palSel); }
  else if (e.key === 'Escape'){ e.preventDefault(); closePalette(); }
});
pal.addEventListener('mousedown', e => { if (e.target === pal) closePalette(); });

