const CRUMB_DEF = /^([ \t]*)(async[ \t]+def|def|class)[ \t]+([A-Za-z_]\w*)/;
let crumbTimer = 0;

function crumbStack(model, line){
  const stack = [];
  const last = Math.min(line, model.getLineCount());
  for (let i = 1; i <= last; i++){
    const m = CRUMB_DEF.exec(model.getLineContent(i));
    if (!m) continue;
    const ind = m[1].replace(/\t/g, '    ').length;
    while (stack.length && stack[stack.length - 1].ind >= ind) stack.pop();
    stack.push({ ind, name: m[3], cls: m[2] === 'class', line: i });
  }
  return stack;
}

function crumbSep(){
  const s = h('span', 'crumb-sep');
  s.innerHTML = ICONS.chevRight;
  return s;
}

function renderCrumbs(){
  const f = activeFile();
  if (!f || !editor || !editor.getModel()){ crumbsBar.hidden = true; return; }
  crumbsBar.hidden = false;
  const pos = editor.getPosition() || { lineNumber: 1, column: 1 };
  crumbsEl.textContent = '';
  const ws = h('button', 'crumb');
  ws.type = 'button';
  ws.innerHTML = ICONS.python;
  ws.appendChild(h('span', null, 'noir.py'));
  ws.title = 'Workspace — Search Files';
  ws.addEventListener('click', () => openPalette(''));
  const fl = h('button', 'crumb');
  fl.type = 'button';
  fl.innerHTML = ICONS.python;
  fl.appendChild(h('span', null, f.name));
  fl.title = 'Switch File';
  fl.addEventListener('click', () => openPalette(''));
  crumbsEl.appendChild(ws);
  crumbsEl.appendChild(crumbSep());
  crumbsEl.appendChild(fl);
  for (const s of crumbStack(editor.getModel(), pos.lineNumber)){
    crumbsEl.appendChild(crumbSep());
    const c = h('button', 'crumb sym' + (s.cls ? ' cls' : ''));
    c.type = 'button';
    c.appendChild(h('span', 'crumb-k', s.cls ? 'class' : 'def'));
    c.appendChild(h('span', null, s.name));
    c.title = 'Go To Line ' + s.line;
    c.addEventListener('click', () => {
      editor.revealLineInCenter(s.line);
      editor.setPosition({ lineNumber: s.line, column: 1 });
      editor.focus();
      flashLineAs(s.line, 'def-flash');
    });
    crumbsEl.appendChild(c);
  }
}

function scheduleCrumbs(){ clearTimeout(crumbTimer); crumbTimer = setTimeout(renderCrumbs, 140); }

