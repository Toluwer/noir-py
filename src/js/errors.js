function cleanErr(msg){
  const t = String(msg)
    .replace(/^PythonError:\s*/i, '')
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  const lines = t.split('\n');
  const keep = [];
  let inSnip = false;
  for (let i = 0; i < lines.length; i++){
    const line = lines[i];
    if (/^\s*\.\.\.<\d+ lines>\.\.\.\s*$/.test(line)) continue;
    const m = line.match(/^\s*File "(.+?)", line/);
    if (m && (/_pyodide|importlib/.test(m[1]) || m[1] === '<exec>' || m[1] === '<string>' || m[1] === '<repl>')){
      const nxt = lines[i + 1] || '';
      if (/^\s+\S/.test(nxt) && !/^\s*File "/.test(nxt)) i++;
      inSnip = false;
      continue;
    }
    if (/^\s*File "/.test(line)) inSnip = true;
    else if (/^\s+\S/.test(line)){ if (!inSnip) continue; }
    else inSnip = false;
    keep.push(line);
  }
  return keep.join('\n').trim();
}

function renderError(msg){
  const cleaned = cleanErr(msg);
  if (!cleaned) return;
  const lines = cleaned.split('\n');
  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--){
    if (lines[i].trim()){ lastIdx = i; break; }
  }
  for (let i = 0; i < lines.length; i++){
    const t = lines[i];
    const isExc = i === lastIdx && !/^\s/.test(t) && !/^Traceback/.test(t);
    const m = t.match(/^\s*File "(.+?\.py)", line (\d+)/);
    if (m && S.lastTrace && m[1] === (fileById(S.lastTrace.id) || {}).name){
      appendErrLink(t, +m[2]);
    } else {
      appendLine(t, isExc ? 'exc' : 'dim');
    }
  }
}

function appendErrLink(text, line){
  S.openLine = null;
  hideEmpty();
  const stick = nearBottom();
  const d = h('div', 'line dim tb-link', text);
  d.title = 'Go To Line ' + line;
  d.addEventListener('click', () => jumpErrLine(line));
  linesEl.appendChild(d);
  trimLines();
  if (stick) conBody.scrollTop = conBody.scrollHeight;
}

let flashDeco = null;
function flashLineAs(line, cls){
  if (!editor || !editor.getModel()) return;
  if (flashDeco) flashDeco.clear();
  flashDeco = editor.createDecorationsCollection([{
    range: new monaco.Range(line, 1, line, 1),
    options: { isWholeLine: true, className: cls }
  }]);
  setTimeout(() => { if (flashDeco){ flashDeco.clear(); flashDeco = null; } }, 2000);
}

function jumpErrLine(n){
  const t = S.lastTrace;
  if (!t){ toast('Source Line Not Available'); return; }
  const f = fileById(t.id);
  if (!f){ toast('File No Longer Open'); return; }
  switchTo(f.id);
  const line = Math.max(1, Math.min(n + t.off, editor.getModel().getLineCount()));
  editor.revealLineInCenter(line);
  const m = editor.getModel();
  editor.setSelection(new monaco.Range(line, 1, line, m.getLineMaxColumn(line)));
  editor.setPosition({ lineNumber: line, column: 1 });
  editor.focus();
  flashLineAs(line, 'err-flash');
}

