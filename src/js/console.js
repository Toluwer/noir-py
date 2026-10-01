const decoder = new TextDecoder();

function setPanelTab(t, opts){
  const o = opts || {};
  if (!t) t = 'console';
  S.panelTab = t;
  S.prefs.panelTab = t;
  conBody.hidden = t !== 'console';
  viewProblems.hidden = t !== 'problems';
  viewVars.hidden = t !== 'vars';
  for (const b of document.querySelectorAll('.ptab')) b.classList.toggle('active', b.dataset.ptab === t);
  $('btn-restart').hidden = $('btn-clear').hidden = t !== 'console';
  vvCount.hidden = $('vv-refresh').hidden = t !== 'vars';
  if (t === 'vars') refreshVars();
  else if (t === 'problems') renderProblems();
  if (!o.silent) savePrefs();
}

for (const b of document.querySelectorAll('.ptab')){
  b.addEventListener('click', () => setPanelTab(b.dataset.ptab));
}

function nearBottom(){ return conBody.scrollHeight - conBody.scrollTop - conBody.clientHeight < 60; }
function hideEmpty(){ conEmpty.hidden = true; }

function pushHist(v){
  if (v && HIST.arr[HIST.arr.length - 1] !== v){
    HIST.arr.push(v);
    if (HIST.arr.length > 50) HIST.arr.shift();
    S.prefs.hist = HIST.arr.slice();
    savePrefs();
  }
  HIST.ix = HIST.arr.length;
}

function histKey(field, up){
  if (up){
    if (HIST.ix > 0){ HIST.ix--; field.value = HIST.arr[HIST.ix] || ''; }
  } else if (HIST.ix < HIST.arr.length){
    HIST.ix++;
    field.value = HIST.arr[HIST.ix] || '';
  }
}

function trimLines(){
  const lines = linesEl.querySelectorAll('.line:not(#con-empty), .in-row');
  if (lines.length > 4000){
    for (let i = 0; i < lines.length - 3500; i++) lines[i].remove();
  }
}

function appendLine(text, cls){
  S.openLine = null;
  hideEmpty();
  const stick = nearBottom();
  const d = h('div', 'line' + (cls ? ' ' + cls : ''), text);
  linesEl.appendChild(d);
  trimLines();
  if (stick) conBody.scrollTop = conBody.scrollHeight;
}

function writeText(text, type){
  if (!text) return;
  const stick = nearBottom();
  const parts = text.split('\n');
  for (let i = 0; i < parts.length; i++){
    const seg = parts[i];
    const last = i === parts.length - 1;
    if (last && seg === '') break;
    if (S.openLine && (!S.openLine.isConnected || S.openLine.dataset.t !== type)) S.openLine = null;
    if (!S.openLine){
      S.openLine = document.createElement('div');
      S.openLine.className = 'line' + (type === 'err' ? ' err' : type === 'dim' ? ' dim' : '');
      S.openLine.dataset.t = type;
      linesEl.appendChild(S.openLine);
      hideEmpty();
    }
    S.openLine.textContent += seg;
    if (!last) S.openLine = null;
  }
  trimLines();
  if (stick) conBody.scrollTop = conBody.scrollHeight;
}

function runHead(name){
  S.openLine = null;
  hideEmpty();
  const stick = nearBottom();
  const d = h('div', 'line run-head');
  d.appendChild(h('span', 'rh-name', name));
  const t = h('span', 'rh-time');
  d.appendChild(t);
  S.lastHeadTime = t;
  linesEl.appendChild(d);
  if (stick) conBody.scrollTop = conBody.scrollHeight;
}

window._consoleInput = function(prompt){
  return new Promise(resolve => {
    openConsole();
    hideEmpty();
    const stick = nearBottom();
    const row = h('div', 'in-row');
    const chev = h('span', 'in-chev');
    chev.innerHTML = ICONS.chevRight;
    row.appendChild(chev);
    row.appendChild(h('span', 'in-prompt', prompt || ''));
    const field = document.createElement('input');
    field.className = 'in-field';
    field.type = 'text';
    field.autocomplete = 'off';
    field.spellcheck = false;
    row.appendChild(field);
    linesEl.appendChild(row);
    if (stick) conBody.scrollTop = conBody.scrollHeight;
    S.inputField = field;
    requestAnimationFrame(() => field.focus());
    const done = () => {
      const v = field.value;
      row.remove();
      S.inputField = null;
      if (S.openLine && S.openLine.dataset.t === 'out'){
        S.openLine.textContent += (prompt || '') + v;
      } else {
        const d = h('div', 'line echo');
        if (prompt){
          const p = h('span', 'echo-p', prompt);
          d.appendChild(p);
        }
        d.appendChild(document.createTextNode(v));
        linesEl.appendChild(d);
        hideEmpty();
      }
      trimLines();
      if (stick || nearBottom()) conBody.scrollTop = conBody.scrollHeight;
      resolve(v);
    };
    field.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter'){ e.preventDefault(); pushHist(field.value); done(); }
      else if (e.key === 'Escape'){ e.preventDefault(); done(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); histKey(field, true); }
      else if (e.key === 'ArrowDown'){ e.preventDefault(); histKey(field, false); }
    });
  });
};

conBody.addEventListener('click', () => {
  if (window.getSelection().toString()) return;
  if (S.inputField) S.inputField.focus();
  else if (S.pyReady && !S.running) replField.focus();
});

function replEcho(v){
  hideEmpty();
  const stick = nearBottom();
  const d = h('div', 'line echo');
  d.appendChild(h('span', 'echo-p', '>>>'));
  d.appendChild(document.createTextNode(v));
  linesEl.appendChild(d);
  trimLines();
  if (stick) conBody.scrollTop = conBody.scrollHeight;
}

async function replSubmit(){
  const v = replField.value;
  replField.value = '';
  pushHist(v);
  replEcho(v);
  if (!v.trim()) return;
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  if (S.running || !replFn) return;
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Evaluating…', true);
  const t0 = performance.now();
  try {
    await replFn(v);
  } catch (err) {
    renderError(err && err.message ? err.message : String(err));
  } finally {
    const dt = ((performance.now() - t0) / 1000).toFixed(2);
    S.running = false;
    updateRunUI();
    stLeft.classList.remove('run');
    st('Finished In ' + dt + 's', false);
    clearTimeout(stTimer);
    stTimer = setTimeout(() => { if (!S.running) st(pyStatusText, false); }, 4000);
    capturePlots();
    if (S.view === 'vars') refreshVars();
    replField.focus();
  }
}

function focusConsoleInput(){
  setPanelTab('console', { silent: true });
  openConsole();
  if (S.inputField) S.inputField.focus();
  else if (S.pyReady && !S.running) replField.focus();
}

replField.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); replSubmit(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); histKey(replField, true); }
  else if (e.key === 'ArrowDown'){ e.preventDefault(); histKey(replField, false); }
  else if (e.key === 'Escape'){
    e.preventDefault();
    if (replField.value) replField.value = '';
    else if (editor) editor.focus();
  }
});

