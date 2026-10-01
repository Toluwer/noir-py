function h(tag, cls, text){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
const fileById = id => S.files.find(f => f.id === id);
const activeFile = () => fileById(S.activeId);

function st(text, spin){ stText.textContent = text; stSpin.hidden = !spin; }

function updateRunUI(){
  const off = S.running || !S.pyReady || !S.monacoReady || !activeFile();
  btnRun.disabled = off;
  btnRunsel.disabled = off;
  runIc.innerHTML = S.running ? ICONS.spinner : ICONS.playLine;
  replRow.hidden = !S.pyReady || S.running;
  if (!replRow.hidden) hideEmpty();
}

function toast(msg, action, ms){
  const t = h('div', 'toast');
  t.appendChild(h('span', null, msg));
  if (action){
    const b = h('button', 'toast-act', action.label);
    b.addEventListener('click', () => { action.fn(); t.remove(); });
    t.appendChild(b);
  }
  toastsEl.appendChild(t);
  requestAnimationFrame(() => t.classList.add('on'));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 180); }, ms || (action ? 5000 : 2400));
}

