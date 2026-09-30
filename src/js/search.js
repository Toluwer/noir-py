const SR = { re: false, cs: false, res: [], total: 0, files: 0 };
let srTimer = 0;

function openSearch(){ setView('search', { force: true, focus: true }); }

function scheduleSearch(){ clearTimeout(srTimer); srTimer = setTimeout(runSearch, 220); }

function runSearch(){
  const q = srQ.value;
  SR.res = []; SR.total = 0; SR.files = 0;
  let bad = false;
  if (q){
    for (const f of S.files){
      if (!f.model || f.model.isDisposed()) continue;
      let ms = [];
      try { ms = f.model.findMatches(q, false, SR.re, SR.cs, null, false, 400); }
      catch (e){ bad = true; }
      if (ms.length){ SR.res.push({ f, ms }); SR.total += ms.length; SR.files++; }
    }
  }
  renderSearch(bad);
}

function renderSearch(bad){
  srResults.textContent = '';
  if (!srQ.value){ srResults.appendChild(h('div', 'sr-empty', 'Type To Search Across All Files')); return; }
  if (bad){ srResults.appendChild(h('div', 'sr-empty', 'Invalid Regular Expression')); return; }
  if (!SR.res.length){ srResults.appendChild(h('div', 'sr-empty', 'No Results')); return; }
  srResults.appendChild(h('div', 'sr-count', SR.total + ' Results In ' + SR.files + ' File' + (SR.files === 1 ? '' : 's')));
  for (const grp of SR.res){
    const head = h('div', 'sr-file');
    head.innerHTML = ICONS.python;
    head.appendChild(h('span', 'sf-name', grp.f.name));
    head.appendChild(h('span', 'sf-n', String(grp.ms.length)));
    const rep = h('button', 'sf-repl', 'Replace In File');
    rep.type = 'button';
    rep.addEventListener('click', e => { e.stopPropagation(); replaceIn(grp.f); });
    head.appendChild(rep);
    srResults.appendChild(head);
    for (const m of grp.ms.slice(0, 60)){
      const row = h('div', 'sr-m');
      const line = grp.f.model.getLineContent(m.range.startLineNumber) || '';
      const pre = line.slice(0, m.range.startColumn - 1);
      const hit = line.slice(m.range.startColumn - 1, m.range.endColumn - 1);
      const post = line.slice(m.range.endColumn - 1);
      row.appendChild(h('span', 'sm-ln', String(m.range.startLineNumber)));
      const tx = h('span', 'sm-tx');
      tx.appendChild(document.createTextNode(pre));
      tx.appendChild(h('mark', null, hit));
      tx.appendChild(document.createTextNode(post));
      row.appendChild(tx);
      row.addEventListener('click', () => jumpToMatch(grp.f, m));
      srResults.appendChild(row);
    }
    if (grp.ms.length > 60) srResults.appendChild(h('div', 'sr-count', '+ ' + (grp.ms.length - 60) + ' More In This File'));
  }
}

function jumpToMatch(f, m){
  switchTo(f.id);
  editor.revealLineInCenter(m.range.startLineNumber);
  editor.setSelection(m.range);
  editor.setPosition({ lineNumber: m.range.endLineNumber, column: m.range.endColumn });
  editor.focus();
}

function pushEdits(model, edits){
  if (!edits.length) return;
  if (model.pushEditOperations.length >= 3) model.pushEditOperations([], edits, () => null);
  else model.pushEditOperations(edits, () => null);
}

function replaceIn(file){
  const q = srQ.value;
  if (!q) return;
  const repl = srR.value;
  let n = 0;
  const targets = file ? SR.res.filter(g => g.f === file) : SR.res;
  for (const t of targets){
    let ms = [];
    try { ms = t.f.model.findMatches(q, false, SR.re, SR.cs, null, false, 1000); } catch (e){}
    if (!ms.length) continue;
    pushEdits(t.f.model, ms.map(m => ({ range: m.range, text: repl })));
    n += ms.length;
  }
  saveWS();
  runSearch();
  toast('Replaced ' + n + ' Occurrence' + (n === 1 ? '' : 's') + (file ? ' In ' + file.name : ''));
}

srQ.addEventListener('input', scheduleSearch);
srCase.addEventListener('click', () => { SR.cs = !SR.cs; srCase.classList.toggle('on', SR.cs); runSearch(); });
srRex.addEventListener('click', () => { SR.re = !SR.re; srRex.classList.toggle('on', SR.re); runSearch(); });
srAllBtn.addEventListener('click', () => replaceIn(null));
srQ.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Escape'){ e.preventDefault(); if (editor) editor.focus(); }
  else if (e.key === 'Enter'){ e.preventDefault(); if (SR.res.length) jumpToMatch(SR.res[0].f, SR.res[0].ms[0]); }
});
srR.addEventListener('keydown', e => e.stopPropagation());

