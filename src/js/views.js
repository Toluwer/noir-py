const VIEWS = { files: 'Explorer', search: 'Search', vars: 'Variables', plots: 'Plots', hist: 'History' };

function setView(v, opts){
  const o = opts || {};
  if (S.view === v && S.prefs.sidebar && !o.force){ toggleSidebar(false); return; }
  S.view = v;
  if (!S.prefs.sidebar) toggleSidebar(true);
  renderView();
  if (o.focus && v === 'search') setTimeout(() => { srQ.focus(); srQ.select(); }, 0);
}

function renderView(){
  const v = S.view;
  sbTitle.textContent = VIEWS[v] || 'Explorer';
  fileListEl.hidden = v !== 'files';
  $('btn-newfile').hidden = v !== 'files';
  $('vv-count').hidden = v !== 'vars';
  $('vv-refresh').hidden = v !== 'vars';
  $('pv-clear').hidden = v !== 'plots';
  hvName.hidden = v !== 'hist';
  viewSearch.hidden = v !== 'search';
  viewVars.hidden = v !== 'vars';
  viewPlots.hidden = v !== 'plots';
  viewHist.hidden = v !== 'hist';
  for (const key of Object.keys(VIEWS)){
    const b = $('rail-' + key);
    if (b) b.classList.toggle('active', key === v);
  }
  if (v === 'vars') refreshVars();
  else if (v === 'plots') renderPlots();
  else if (v === 'hist') renderHist();
}

$('rail-files').addEventListener('click', () => setView('files'));
$('rail-search').addEventListener('click', () => setView('search', { focus: true }));
$('rail-vars').addEventListener('click', () => setView('vars'));
$('rail-plots').addEventListener('click', () => setView('plots'));
$('rail-hist').addEventListener('click', () => setView('hist'));

function varRow(name, type, val, len){
  const r = h('div', 'vv-row');
  r.appendChild(h('span', 'vv-n', name));
  r.appendChild(h('span', 'vv-t', type));
  r.appendChild(h('span', 'vv-v', val));
  if (len != null) r.appendChild(h('span', 'vv-l', 'len ' + len));
  r.title = name + ' · ' + type + (val ? '\n' + val : '');
  r.addEventListener('click', () => insertName(name));
  r.addEventListener('contextmenu', e => { e.preventDefault(); varMenu(e.clientX, e.clientY, name, val); });
  return r;
}

function refreshVars(){
  vvList.textContent = '';
  if (!S.pyReady){
    vvList.dataset.empty = 'Python Runtime Is Still Loading…';
    vvCount.hidden = true;
    return;
  }
  const d = py('vars');
  const vars = (d && d.v) || [];
  const err = d && d.e;
  if (err){
    vvList.appendChild(h('div', 'vv-sec', 'At Last Error'));
    vvList.appendChild(h('div', 'vv-err', err.type + (err.line ? ' · Line ' + err.line : '') + '\n' + err.msg));
    const locs = (err && err.locals) || {};
    const keys = Object.keys(locs);
    if (keys.length){
      vvList.appendChild(h('div', 'vv-sec', 'Frame Locals'));
      for (const k of keys) vvList.appendChild(varRow(k, '—', locs[k]));
    }
  }
  if (!vars.length && !err){
    vvList.dataset.empty = 'No Variables Yet — Run Code To Populate This Panel';
    vvCount.hidden = true;
    return;
  }
  vvCount.hidden = !(!err && vars.length);
  if (!err && vars.length) vvCount.textContent = vars.length + (vars.length === 1 ? ' Variable' : ' Variables');
  for (const it of vars) vvList.appendChild(varRow(it.n, it.t, it.v, it.l));
}

function insertName(name){
  if (!editor || !activeFile()){ toast('No File Open'); return; }
  editor.focus();
  editor.executeEdits('noir', [{ range: editor.getSelection(), text: name }]);
}

$('vv-refresh').addEventListener('click', refreshVars);

