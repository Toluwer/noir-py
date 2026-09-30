function applyTheme(t, save){
  S.prefs.theme = t === 'ink' ? 'ink' : 'paper';
  const dark = S.prefs.theme === 'ink';
  document.documentElement.dataset.theme = S.prefs.theme;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#15130f' : '#f5f4ef');
  if (stTheme) stTheme.textContent = dark ? 'Ink' : 'Paper';
  try { if (window.monaco && monaco.editor && monaco.editor.setTheme) monaco.editor.setTheme(dark ? 'ink' : 'paper'); } catch (e) {}
  if (save !== false) savePrefs();
}
function toggleTheme(){
  applyTheme(S.prefs.theme === 'ink' ? 'paper' : 'ink');
  toast(S.prefs.theme === 'ink' ? 'Theme — Ink' : 'Theme — Paper');
}

function refreshChrome(){
  renderSidebar();
  renderTabs();
  const has = S.files.length > 0;
  emptyState.hidden = has;
  tabbarEl.hidden = !has;
  updateRunUI();
}

function renderSidebar(){
  fileListEl.textContent = '';
  for (const f of S.files){
    const li = h('div', 'fi' + (f.id === S.activeId ? ' active' : ''));
    li.dataset.id = f.id;
    li.innerHTML = ICONS.python;
    li.appendChild(h('span', 'fi-name', f.name));
    const x = h('button', 'fi-x');
    x.title = 'Delete File';
    x.innerHTML = ICONS.x;
    li.appendChild(x);
    li.addEventListener('click', e => { if (e.target.closest('.fi-x')) return; switchTo(f.id); });
    x.addEventListener('click', e => { e.stopPropagation(); deleteFile(f.id); });
    li.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      fileMenu(e.clientX, e.clientY, f, false);
    });
    fileListEl.appendChild(li);
  }
}

function renderTabs(){
  tabsEl.textContent = '';
  for (const f of S.files){
    const t = h('div', 'tab' + (f.id === S.activeId ? ' active' : ''));
    t.title = f.name;
    t.innerHTML = ICONS.python;
    t.appendChild(h('span', 't-name', f.name));
    const x = h('button', 't-x');
    x.title = 'Close File';
    x.innerHTML = ICONS.x;
    t.appendChild(x);
    t.addEventListener('click', e => { if (e.target.closest('.t-x')) return; switchTo(f.id); });
    x.addEventListener('click', e => { e.stopPropagation(); deleteFile(f.id); });
    t.addEventListener('contextmenu', e => {
      e.preventDefault();
      e.stopPropagation();
      fileMenu(e.clientX, e.clientY, f, true);
    });
    tabsEl.appendChild(t);
  }
  const act = tabsEl.querySelector('.tab.active');
  if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

