(function(){
'use strict';

const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
const MONO_FONT = "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const PYODIDE_VERSION = '0.29.5';
const APP_VERSION = '16.0';
const WS_KEY = 'noir.py:workspace';
const PREF_KEY = 'noir.py:prefs';
const LEGACY_KEY = 'noir.py:code';
const IS_MAC = /mac|ipad|iphone/i.test(navigator.userAgent);
const KD = s => IS_MAC ? s.replace(/Ctrl/g, '⌘').replace(/Shift/g, '⇧').replace(/Alt/g, '⌥') : s;

const $ = id => document.getElementById(id);
const app = $('app'), fileListEl = $('file-list'), tabsEl = $('tabs'), tabbarEl = $('tabbar'),
      emptyState = $('empty-state'), btnRun = $('btn-run'), runIc = $('run-ic'),
      stLeft = $('st-left'), stText = $('st-text'), stSpin = $('st-spin'), stPos = $('st-pos'),
      stSpaces = $('st-spaces'), stEol = $('st-eol'), stPy = $('st-py'),
      linesEl = $('lines'), conEmpty = $('con-empty'), conBody = $('con-body'),
      conZone = $('console-zone'), grip = $('console-grip'), editorPane = $('editor-pane'),
      pal = $('palette'), palField = $('pal-field'), palList = $('pal-list'),
      toastsEl = $('toasts'),
      btnOpen = null, btnDownload = null, filePick = $('file-pick'),
      replRow = $('repl-row'), replField = $('repl-field'), stFont = $('st-font'),
      sbTitle = $('sb-title'), viewSearch = $('view-search'), viewVars = $('view-vars'), viewHist = $('view-hist'), viewPlots = $('view-plots'),
      srQ = $('sr-q'), srR = $('sr-r'), srCase = $('sr-case'), srRex = $('sr-rex'), srAllBtn = $('sr-all'), srResults = $('sr-results'),
      vvList = $('vv-list'), vvCount = $('vv-count'), hvList = $('hv-list'), hvName = $('hv-name'), pvList = $('pv-list'),
      plotWrap = $('plotwrap'), pwImg = $('pw-img'), pwLabel = $('pw-label'), pwBody = $('pw-body'), pwPrev = $('pw-prev'), pwNext = $('pw-next'), pwSize = $('pw-size'),
      stProb = $('st-prob'), spErr = $('sp-n-err'), spWarn = $('sp-n-warn'),
      diffWrap = $('diffwrap'), diffHost = $('diff-host'), dwLabel = $('dw-label'),
      stAi = $('st-ai'), stTheme = $('st-theme'), aiModal = $('ai-modal'), aiUrl = $('ai-url'), aiModel = $('ai-model'), aiStatus = $('ai-status'),
      aboutModal = $('about-modal'), abVer = $('ab-ver'), abRun = $('ab-run'),
      aiTestBtn = $('ai-test');

const SV = inner => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
const ICONS = {
  panelLeft: SV('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/>'),
  panelBottom: SV('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 15h18"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5.3v13.4c0 .8.9 1.3 1.6.9l11-6.7c.7-.4.7-1.4 0-1.8l-11-6.7c-.7-.4-1.6.1-1.6.9z"/></svg>',
  playLine: SV('<path d="M7.5 5.1v13.8c0 .9 1 1.5 1.8 1l10.6-6.9c.7-.5.7-1.6 0-2L9.3 4.1c-.8-.5-1.8.1-1.8 1z"/>'),
  undo: SV('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: SV('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M12 12v4"/>'),
  externalLink: SV('<path d="M15 3h6v6"/><path d="m10 14 11-11"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  spinner: '<svg class="ic-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke-opacity=".22"/><path d="M21 12a9 9 0 0 0-9-9" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  plus: SV('<path d="M12 5v14M5 12h14"/>'),
  x: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
  check: SV('<path d="M20 6 9 17l-5-5"/>'),
  trash: SV('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>'),
  fileCode: SV('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="m9.5 13-2 2 2 2"/><path d="m13.5 13 2 2-2 2"/>'),
  terminal: SV('<path d="m5 8 4 4-4 4"/><path d="M12 16.5h7"/>'),
  eraser: SV('<path d="m7 21-4.3-4.3a2 2 0 0 1 0-2.8l9.6-9.6a2 2 0 0 1 2.8 0l5.6 5.6a2 2 0 0 1 0 2.8L13 21z"/><path d="M22 21H7"/><path d="m5 11 9 9"/>'),
  rotate: SV('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
  chevDown: SV('<path d="m6 9 6 6 6-6"/>'),
  chevRight: SV('<path d="m9 6 6 6-6 6"/>'),
  chevLeft: SV('<path d="m15 18-6-6 6-6"/>'),
  chart: SV('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>'),
  wand: SV('<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>'),
  command: SV('<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/>'),
  search: SV('<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/>'),
  save: SV('<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/>'),
  folderOpen: SV('<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>'),
  download: SV('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>'),
  map: SV('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M14 4v16"/><path d="M6.5 8.5h4M6.5 12h4M6.5 15.5h2.5"/>'),
  wrap: SV('<path d="M3 6h18"/><path d="M3 12h15a3 3 0 1 1 0 6h-4"/><path d="m16 16-2 2 2 2"/><path d="M3 18h7"/>'),
  zoomIn: SV('<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/><path d="M11 8v6M8 11h6"/>'),
  zoomOut: SV('<circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4.5 4.5"/><path d="M8 11h6"/>'),
  type: SV('<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>'),
  box: SV('<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>'),
  copy: SV('<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  link: SV('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  runSel: SV('<path d="M4 6h9M4 12h9M4 18h5"/><path d="M16 5v14l6-7z" fill="currentColor" stroke-width="0"/>'),
  python: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M11.914 0C5.82 0 5.914 2.656 5.914 2.656l.011 2.75h6.107v.827H3.7S0 5.721 0 11.869c0 6.148 3.234 5.912 3.234 5.912h1.929v-2.852s-.104-3.233 3.181-3.233h5.479s3.079.05 3.079-2.976V3.572S17.346 0 11.914 0zM8.19 2.062c.55 0 .994.445.994.993 0 .55-.444.994-.993.994a.995.995 0 0 1-.994-.994c0-.548.445-.993.994-.993z"/><path fill="currentColor" fill-opacity=".42" fill-rule="evenodd" d="M12.253 23.97c6.094 0 5.999-2.656 5.999-2.656l-.011-2.75h-6.107v-.827h8.332s3.715.421 3.715-5.727c0-6.148-3.235-5.912-3.235-5.912h-1.929v2.852s.104 3.233-3.181 3.233h-5.479s-3.079-.05-3.079 2.976v5.012s-.467 2.799 5.896 2.799zm3.19-2.062a.995.995 0 0 1-.993-.994c0-.548.444-.993.993-.993.55 0 .994.445.994.993 0 .55-.444.994-.994.994z"/></svg>',
  scissors: SV('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'),
  paste: SV('<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M12 12v8"/><path d="m9 17 3 3 3-3"/>'),
  gauge: SV('<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>'),
  listTree: SV('<path d="M21 10h-8"/><path d="M21 6H8"/><path d="M21 14H8"/><path d="M21 18h-8"/><path d="M4 6v9a2 2 0 0 0 2 2h2"/>'),
  goto: SV('<path d="m14 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h11"/>'),
  hash: SV('<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="M16 3l-2 18"/>'),
  copyPlus: SV('<rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/><path d="M15.5 12v7M12 15.5h7"/>'),
  history: SV('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>'),
  activity: SV('<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>'),
  insert: SV('<path d="m9 10-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/>'),
  circleX: SV('<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>'),
  triangle: SV('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>'),
  pencil: SV('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>')
};

document.querySelectorAll('[data-ic]').forEach(n => { n.innerHTML = ICONS[n.dataset.ic] || ''; });

(function(){
  const paths = '<path fill="url(#fA)" fill-rule="evenodd" d="M11.914 0C5.82 0 5.914 2.656 5.914 2.656l.011 2.75h6.107v.827H3.7S0 5.721 0 11.869c0 6.148 3.234 5.912 3.234 5.912h1.929v-2.852s-.104-3.233 3.181-3.233h5.479s3.079.05 3.079-2.976V3.572S17.346 0 11.914 0zM8.19 2.062c.55 0 .994.445.994.993 0 .55-.444.994-.993.994a.995.995 0 0 1-.994-.994c0-.548.445-.993.994-.993z"/><path fill="url(#fB)" fill-rule="evenodd" d="M12.253 23.97c6.094 0 5.999-2.656 5.999-2.656l-.011-2.75h-6.107v-.827h8.332s3.715.421 3.715-5.727c0-6.148-3.235-5.912-3.235-5.912h-1.929v2.852s.104 3.233-3.181 3.233h-5.479s-3.079-.05-3.079 2.976v5.012s-.467 2.799 5.896 2.799zm3.19-2.062a.995.995 0 0 1-.993-.994c0-.548.444-.993.993-.993.55 0 .994.445.994.993 0 .55-.444.994-.994.994z"/>';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs>' +
    '<linearGradient id="fA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4B8BBE"/><stop offset="1" stop-color="#306998"/></linearGradient>' +
    '<linearGradient id="fB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE873"/><stop offset="1" stop-color="#FFC331"/></linearGradient>' +
    '</defs>' + paths + '</svg>';
  const l = document.createElement('link');
  l.rel = 'icon';
  l.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  document.head.appendChild(l);
})();

const S = {
  files: [],
  activeId: null,
  uid: 0,
  running: false,
  pyReady: false,
  monacoReady: false,
  view: 'files',
  prefs: { sidebar: true, console: true, conH: 240, fontSize: 13.5, minimap: false, wordWrap: false, hist: [], theme: 'paper',
           ai: { mode: 'local', url: 'http://localhost:11434', model: 'qwen2.5-coder:1.5b' } },
  openLine: null,
  lastHeadTime: null,
  inputField: null,
  lastTrace: null
};

let pyodide = null, runFn = null, replFn = null, editor = null, pyVersion = '', pyStatusText = 'Loading Runtime…', stTimer = 0;
const HIST = { arr: [], ix: 0 }, FONT_DEFAULT = 13.5;

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
  btnRun.disabled = S.running || !S.pyReady || !S.monacoReady || !activeFile();
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

function clipCopySel(){
  const sel = editor.getSelection();
  if (!sel || sel.isEmpty() || !editor.getModel()) return;
  const t = editor.getModel().getValueInRange(sel);
  navigator.clipboard.writeText(t).catch(() => { try { document.execCommand('copy'); } catch (e) {} });
}

function clipCutSel(){
  const sel = editor.getSelection();
  if (!sel || sel.isEmpty() || !editor.getModel()) return;
  const t = editor.getModel().getValueInRange(sel);
  navigator.clipboard.writeText(t).catch(() => { try { document.execCommand('cut'); } catch (e) {} });
  editor.executeEdits('ctx', [{ range: sel, text: '' }]);
}

async function clipPaste(){
  let t = '';
  try { t = await navigator.clipboard.readText(); }
  catch (e) {
    try { document.execCommand('paste'); } catch (e2) { toast('Clipboard Blocked By The Browser'); }
    return;
  }
  if (!t) return;
  editor.executeEdits('ctx', [{ range: editor.getSelection(), text: t }]);
}

function runEditorAction(id){
  editor.focus();
  const a = editor.getAction(id);
  if (a) a.run();
}

function escapeRe(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let renameBox = null;

function closeRenameBox(){
  if (renameBox){ const b = renameBox; renameBox = null; b.remove(); if (editor) editor.focus(); }
}

function symbolStats(name){
  const defRe = '^[ \\t]*(?:async[ \\t]+def|def|class)[ \\t]+' + escapeRe(name) + '\\b';
  const asgRe = '^[ \\t]*' + escapeRe(name) + '[ \\t]*=(?!=)';
  const wordRe = '\\b' + escapeRe(name) + '\\b';
  let defined = false, total = 0;
  for (const f of S.files){
    try {
      if (!defined && (f.model.findMatches(defRe, false, true, true, null, false, 1).length ||
          f.model.findMatches(asgRe, false, true, true, null, false, 1).length)) defined = true;
    } catch (e) {}
    try { total += f.model.findMatches(wordRe, false, true, true, null, false, 2000).length; } catch (e) {}
  }
  return { defined, total };
}

function renameSymbolAt(){
  if (!editor || !editor.getModel() || !activeFile()){ toast('No File Open'); return; }
  if (!editor.hasTextFocus()) editor.focus();
  const model = editor.getModel();
  const pos = editor.getPosition();
  if (!pos) return;
  const w = model.getWordAtPosition(pos);
  if (!w || !/^[A-Za-z_]\w*$/.test(w.word)){ toast('Place The Cursor On A Symbol To Rename'); return; }
  const name = w.word;
  const stats = symbolStats(name);
  if (!stats.defined){ toast('Symbol Not Defined In The Workspace'); return; }
  if (!stats.total) return;
  closeRenameBox();
  const host = $('editor-host');
  const edRect = editor.getDomNode().getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  const vis = editor.getScrolledVisiblePosition({ lineNumber: pos.lineNumber, column: w.startColumn });
  if (!vis) return;
  const box = document.createElement('input');
  box.className = 'ren-box';
  box.spellcheck = false;
  box.value = name;
  box.title = stats.total + ' Occurrence' + (stats.total === 1 ? '' : 's') + ' Across The Workspace';
  box.style.left = Math.max(6, Math.round(edRect.left - hostRect.left + vis.left) - 3) + 'px';
  box.style.top = Math.max(6, Math.round(edRect.top - hostRect.top + vis.top) - 2) + 'px';
  box.style.minWidth = Math.max(96, Math.round(w.word.length * 8.4) + 44) + 'px';
  host.appendChild(box);
  renameBox = box;
  box.focus();
  box.select();
  let done = false;
  const commit = ok => {
    if (done) return;
    done = true;
    const nv = box.value.trim();
    closeRenameBox();
    if (!ok || !nv || nv === name || !/^[A-Za-z_]\w*$/.test(nv)) return;
    const wordRe = '\\b' + escapeRe(name) + '\\b';
    let n = 0;
    for (const f of S.files){
      let ms = [];
      try { ms = f.model.findMatches(wordRe, false, true, true, null, false, 2000); } catch (e) {}
      if (ms.length){
        pushEdits(f.model, ms.map(m => ({ range: m.range, text: nv })));
        n += ms.length;
      }
    }
    saveWS();
    const cur = activeFile();
    if (cur) scheduleLintFor(cur.model);
    toast('Renamed ' + name + ' → ' + nv + ' · ' + n + ' Edit' + (n === 1 ? '' : 's'));
  };
  box.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter'){ e.preventDefault(); commit(true); }
    else if (e.key === 'Escape'){ e.preventDefault(); commit(false); }
  });
  box.addEventListener('blur', () => commit(true));
}

function gotoDefAction(){

  gotoDefAt();
}
function findRefsAction(){ findRefsAt(); }
function quickOutlineAction(){ runEditorAction('editor.action.quickOutline'); }

function flashLineAs(line, cls){
  if (!editor || !editor.getModel()) return;
  if (flashDeco) flashDeco.clear();
  flashDeco = editor.createDecorationsCollection([{
    range: new monaco.Range(line, 1, line, 1),
    options: { isWholeLine: true, className: cls }
  }]);
  setTimeout(() => { if (flashDeco){ flashDeco.clear(); flashDeco = null; } }, 2000);
}

function symbolWord(){
  if (!editor || !editor.getModel()) return null;
  const pos = editor.getPosition();
  if (!pos) return null;
  const w = editor.getModel().getWordAtPosition(pos);
  return w && /^[A-Za-z_]\w*$/.test(w.word) ? w : null;
}

function gotoDefAt(){
  const w = symbolWord();
  if (!w){ toast('Place The Cursor On A Symbol'); return; }
  const name = w.word;
  const pos = editor.getPosition();
  const defRe = '^[ \\t]*(?:async[ \\t]+def|def|class)[ \\t]+' + escapeRe(name) + '\\b';
  const asgRe = '^[ \\t]*' + escapeRe(name) + '[ \\t]*=(?!=)';
  const files = [...S.files].sort((a, b) => (b.id === S.activeId) - (a.id === S.activeId));
  for (const pass of [defRe, asgRe]){
    for (const f of files){
      let ms = [];
      try { ms = f.model.findMatches(pass, false, true, true, null, false, 1); } catch (e) {}
      if (!ms.length) continue;
      const m = ms[0];
      const line = m.range.startLineNumber;
      if (f.id !== S.activeId) switchTo(f.id);
      editor.revealLineInCenter(line);
      editor.setSelection(new monaco.Range(line, m.range.startColumn, line, m.range.endColumn));
      editor.setPosition({ lineNumber: line, column: m.range.startColumn });
      editor.focus();
      flashLineAs(line, 'def-flash');
      return;
    }
  }
  toast('No Definition Found In The Workspace');
}

function findRefsAt(){
  const w = symbolWord();
  if (!w){ toast('Place The Cursor On A Symbol'); return; }
  setView('search', { force: true });
  srQ.value = '\\b' + w.word + '\\b';
  SR.re = true; srRex.classList.add('on');
  SR.cs = true; srCase.classList.add('on');
  runSearch();
}

function editorMenu(x, y){
  const sel = editor.getSelection();
  const hasSel = sel && !sel.isEmpty() && !!editor.getModel();
  ctxShow(x, y, [
    { label: 'Cut', icon: 'scissors', disabled: !hasSel, fn: clipCutSel },
    { label: 'Copy', icon: 'copy', disabled: !hasSel, fn: clipCopySel },
    { label: 'Paste', icon: 'paste', fn: clipPaste },
    { sep: true },
    { label: 'Run File', icon: 'play', disabled: !activeFile(), fn: run },
    { label: 'Run Selection', icon: 'runSel', fn: runSelection },
    { label: 'Profile File', icon: 'gauge', fn: profileFile },
    { sep: true },
    { label: 'Go To Definition', icon: 'goto', fn: gotoDefAction },
    { label: 'Find All References', icon: 'search', fn: findRefsAction },
    { label: 'Go To Symbol…', icon: 'listTree', fn: quickOutlineAction },
    { sep: true },
    { label: 'Toggle Line Comment', icon: 'hash', fn: () => runEditorAction('editor.action.commentLine') },
    { label: 'Duplicate Selection', icon: 'copyPlus', fn: () => runEditorAction('editor.action.duplicateSelection') },
    { label: 'Rename Symbol', icon: 'pencil', fn: renameSymbolAt },
    { label: 'Format Document', icon: 'wand', fn: formatDocument },
    { label: 'Find In Files', icon: 'search', fn: openSearch },
    { sep: true },
    { label: 'Ghost Text Settings…', icon: 'wand', fn: openAIModal },
    { label: 'Ink Theme', icon: 'moon', on: () => S.prefs.theme === 'ink', fn: toggleTheme },
    { label: 'Command Palette…', icon: 'command', fn: () => openPalette('>') }
  ]);
}

function duplicateFile(f){
  const names = new Set(S.files.map(o => o.name));
  const base = f.name.replace(/\.py$/i, '');
  let name = base + '-copy.py', i = 2;
  while (names.has(name)) name = base + '-copy-' + (i++) + '.py';
  createFile(name, f.model.getValue());
  toast('Duplicated As ' + name);
}

function closeOthers(keep){
  const removed = S.files.filter(f => f.id !== keep.id).map(f => ({ id: f.id, name: f.name, content: f.model.getValue() }));
  if (!removed.length) return;
  if (dwCur && removed.some(r => r.id === dwCur.f.id)) closeDiff();
  for (const f of S.files) if (f.id !== keep.id) disposeModel(f.model);
  S.files = S.files.filter(f => f.id === keep.id);
  switchTo(keep.id);
  saveWS();
  updateProbChip();
  toast('Closed ' + removed.length + ' File' + (removed.length === 1 ? '' : 's'), { label: 'Undo', fn(){
    for (const r of removed){
      let name = r.name, i = 2;
      while (S.files.some(o => o.name === name)) name = r.name.replace(/\.py$/i, '') + '-' + (i++) + '.py';
      createFile(name, r.content, { activate: false });
    }
    refreshChrome();
    saveWS();
  }});
}

function closeAll(){
  const removed = S.files.map(f => ({ name: f.name, content: f.model.getValue() }));
  if (!removed.length) return;
  if (dwCur) closeDiff();
  for (const f of S.files) disposeModel(f.model);
  S.files = [];
  S.activeId = null;
  if (editor) editor.setModel(null);
  refreshChrome();
  updateProbChip();
  saveWS();
  toast('Closed All Files', { label: 'Undo', fn(){
    for (const r of removed){
      let name = r.name, i = 2;
      while (S.files.some(o => o.name === name)) name = r.name.replace(/\.py$/i, '') + '-' + (i++) + '.py';
      createFile(name, r.content, { activate: false });
    }
    const first = S.files[0];
    if (first) switchTo(first.id); else refreshChrome();
    saveWS();
  }});
}

function fileMenu(x, y, f, fromTab){
  ctxShow(x, y, [
    fromTab
      ? { label: 'Close', icon: 'x', fn: () => deleteFile(f.id) }
      : { label: 'Open', icon: 'fileCode', disabled: f.id === S.activeId, fn: () => switchTo(f.id) },
    fromTab && { label: 'Close Others', icon: 'x', fn: () => closeOthers(f) },
    fromTab && { label: 'Close All', icon: 'x', fn: closeAll },
    { sep: true },
    { label: 'Rename', icon: 'pencil', fn: () => { switchTo(f.id); startRename(f); } },
    { label: 'Duplicate', icon: 'copyPlus', fn: () => duplicateFile(f) },
    { label: 'Download', icon: 'download', fn: () => { switchTo(f.id); downloadFile(); } },
    { label: 'Copy Share Link', icon: 'link', fn: () => { switchTo(f.id); copyShareLink(); } },
    { sep: true },
    { label: 'History', icon: 'history', fn: () => { switchTo(f.id); setView('hist', { force: true }); } },
    { sep: true },
    { label: 'Delete', icon: 'trash', danger: true, fn: () => deleteFile(f.id) }
  ]);
}

function saveConsoleOutput(){
  const parts = [];
  conBody.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => parts.push(n.textContent));
  const t = parts.join('\n');
  if (!t.trim()){ toast('Console Is Empty'); return; }
  const blob = new Blob([t], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'console.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Saved console.txt');
}

function consoleMenu(x, y){
  const hasSel = !!String(window.getSelection());
  ctxShow(x, y, [
    { label: 'Copy', icon: 'copy', disabled: !hasSel, fn: () => { try { document.execCommand('copy'); } catch (e) {} } },
    { label: 'Copy All Output', icon: 'copy', fn: copyOutput },
    { sep: true },
    { label: 'Clear Console', icon: 'eraser', fn: clearConsole },
    { label: 'Save Output As .txt', icon: 'download', fn: saveConsoleOutput }
  ]);
}

conBody.addEventListener('contextmenu', e => {
  e.preventDefault();
  consoleMenu(e.clientX, e.clientY);
});

function varMenu(x, y, name, val){
  ctxShow(x, y, [
    { label: 'Insert At Cursor', icon: 'insert', fn: () => insertName(name) },
    { label: 'Copy Name', icon: 'copy', fn: () => navigator.clipboard.writeText(name).then(() => toast('Copied'), () => toast('Copy Failed')) },
    { label: 'Copy Value', icon: 'copy', fn: () => navigator.clipboard.writeText(val).then(() => toast('Copied'), () => toast('Copy Failed')) },
    { sep: true },
    { label: 'Refresh', icon: 'rotate', fn: refreshVars }
  ]);
}

emptyState.addEventListener('contextmenu', e => {
  e.preventDefault();
  ctxShow(e.clientX, e.clientY, [
    { label: 'New File', icon: 'plus', fn: newFile },
    { label: 'Open File…', icon: 'folderOpen', fn: () => filePick.click() },
    { sep: true },
    { label: 'Command Palette…', icon: 'command', fn: () => openPalette('>') }
  ]);
});

function saveWS(){
  try {
    localStorage.setItem(WS_KEY, JSON.stringify({
      files: S.files.map(f => ({ name: f.name, content: f.model ? f.model.getValue() : '' })),
      active: activeFile() ? activeFile().name : null
    }));
  } catch (e) {}
}
let wsTimer = 0;
function scheduleWS(){ clearTimeout(wsTimer); wsTimer = setTimeout(saveWS, 400); }

function loadWS(){
  let data = null;
  try { data = JSON.parse(localStorage.getItem(WS_KEY) || 'null'); } catch (e) {}
  if (data && Array.isArray(data.files) && data.files.length){
    return {
      files: data.files.filter(f => f && typeof f.name === 'string').map(f => ({ name: f.name, content: String(f.content == null ? '' : f.content) })),
      active: data.active
    };
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return { files: [{ name: 'main.py', content: legacy }], active: 'main.py' };
  } catch (e) {}
  return { files: [{ name: 'main.py', content: '' }], active: 'main.py' };
}

function loadPrefs(){ try { Object.assign(S.prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) {} }
function savePrefs(){ try { localStorage.setItem(PREF_KEY, JSON.stringify(S.prefs)); } catch (e) {} }

function applyTheme(t, save){
  S.prefs.theme = t === 'ink' ? 'ink' : 'paper';
  const dark = S.prefs.theme === 'ink';
  document.documentElement.dataset.theme = S.prefs.theme;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', dark ? '#191713' : '#f6f5f1');
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

function createFile(name, content, opts){
  opts = opts || {};
  const f = { id: ++S.uid, name: name, model: null };
  if (S.monacoReady){
    f.model = monaco.editor.createModel(content || '', 'python', monaco.Uri.file('/' + name));
  }
  S.files.push(f);
  if (opts.activate !== false) switchTo(f.id); else refreshChrome();
  saveWS();
  return f;
}

function switchTo(id){
  const f = fileById(id);
  if (!f) return;
  S.activeId = id;
  if (S.monacoReady && editor){
    editor.setModel(f.model);
    refreshStatusBtns();
    const p = editor.getPosition();
    if (p) stPos.textContent = 'Ln ' + p.lineNumber + ', Col ' + p.column;
  }
  refreshChrome();
  saveWS();
  if (S.view === 'hist') renderHist();

  if (window.innerWidth < 860 && S.prefs.sidebar){
    S.prefs.sidebar = false;
    app.classList.add('no-sidebar');
  }
}

function renameFile(f, name){
  const val = f.model.getValue();
  const m = monaco.editor.createModel(val, 'python', monaco.Uri.file('/' + name));
  disposeModel(f.model);
  f.model = m;
  f.name = name;
  if (S.activeId === f.id && editor) editor.setModel(m);
  refreshChrome();
  saveWS();
}

function startRename(f){
  renderSidebar();
  const li = fileListEl.querySelector('.fi[data-id="' + f.id + '"]');
  if (!li) return;
  const nameEl = li.querySelector('.fi-name');
  const inp = document.createElement('input');
  inp.className = 'rename-field';
  inp.value = f.name.replace(/\.py$/i, '');
  inp.spellcheck = false;
  nameEl.replaceWith(inp);
  li.querySelector('.fi-x').style.visibility = 'hidden';
  inp.focus();
  inp.select();
  let closed = false;
  const close = commit => {
    if (closed) return;
    closed = true;
    const v = inp.value.trim();
    if (commit && v){
      let name = v;
      if (!/\.py$/i.test(name)) name += '.py';
      if (!/^[\w .()-]+$/.test(name)) toast('Invalid File Name');
      else if (S.files.some(o => o !== f && o.name === name)) toast('A File With This Name Already Exists');
      else if (name !== f.name){ renameFile(f, name); return; }
    }
    renderSidebar();
    renderTabs();
  };
  inp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter'){ e.preventDefault(); close(true); }
    else if (e.key === 'Escape'){ e.preventDefault(); close(false); }
  });
  inp.addEventListener('blur', () => close(true));
  inp.addEventListener('click', e => e.stopPropagation());
}

function newFile(){
  if (!S.monacoReady){ toast('Editor Is Still Loading…'); return; }
  const names = new Set(S.files.map(f => f.name));
  let name = 'untitled.py', i = 2;
  while (names.has(name)) name = 'untitled-' + (i++) + '.py';
  const f = createFile(name, '');
  startRename(f);
}

function disposeModel(m){
  if (!m || m.isDisposed()) return;
  try { ghostLineCache.delete(m.uri.toString()); } catch (e) {}
  try { monaco.editor.setModelMarkers(m, LINT_OWNER, []); } catch (e) {}
  m.dispose();
}

function deleteFile(id){
  const i = S.files.findIndex(f => f.id === id);
  if (i < 0) return;
  const f = S.files[i];
  const snap = { name: f.name, content: f.model.getValue(), at: i };
  if (S.activeId === id && editor) editor.setModel(null);
  if (dwCur && dwCur.f === f) closeDiff();
  disposeModel(f.model);
  S.files.splice(i, 1);
  if (S.activeId === id){
    const next = S.files[i] || S.files[i - 1];
    if (next) switchTo(next.id);
    else { S.activeId = null; if (editor) editor.setModel(null); }
  }
  refreshChrome();
  saveWS();
  toast('Deleted ' + snap.name, { label: 'Undo', fn(){
    let name = snap.name;
    if (S.files.some(o => o.name === name)) name = name.replace(/\.py$/i, '') + '-restored.py';
    const nf = createFile(name, snap.content, { activate: false });
    S.files.pop();
    S.files.splice(Math.min(snap.at, S.files.length), 0, nf);
    if (!S.activeId) switchTo(nf.id); else refreshChrome();
    saveWS();
  }});
}

function refreshStatusBtns(){
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  stSpaces.textContent = 'Spaces: ' + m.getOptions().tabSize;
  stEol.textContent = m.getEOL() === '\n' ? 'LF' : 'CRLF';
}

function importFile(file){
  if (!file || !S.monacoReady || !/\.(py|txt)$/i.test(file.name)) return;
  file.text().then(t => {
    let name = file.name.replace(/\.txt$/i, '.py');
    const names = new Set(S.files.map(o => o.name));
    if (names.has(name)){
      let i = 2;
      const base = name.replace(/\.py$/i, '');
      while (names.has(base + '-' + i + '.py')) i++;
      name = base + '-' + i + '.py';
    }
    createFile(name, t);
    toast('Opened ' + name);
  });
}

function downloadFile(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const blob = new Blob([f.model.getValue()], { type: 'text/x-python' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Downloaded ' + f.name);
}

function b64e(bytes){
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64d(s){
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
async function deflate(text){
  const cs = new CompressionStream('deflate-raw');
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(text));
  w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}
async function inflate(bytes){
  const ds = new DecompressionStream('deflate-raw');
  const w = ds.writable.getWriter();
  w.write(bytes);
  w.close();
  return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
}

async function buildShareLink(){
  const f = activeFile();
  if (!f) throw new Error('No File Open');
  const code = f.model.getValue();
  if (!code) throw new Error('Nothing To Share — File Is Empty');
  const p = new URLSearchParams();
  p.set('name', f.name);
  try { p.set('code', b64e(await deflate(code))); }
  catch (e) { p.set('code', 'raw,' + b64e(new TextEncoder().encode(code))); }
  const url = location.origin + location.pathname + '#' + p.toString();
  if (url.length > 30000) throw new Error('File Too Large To Share');
  return url;
}

async function copyShareLink(){
  try {
    const url = await buildShareLink();
    await navigator.clipboard.writeText(url);
    toast('Share Link Copied To Clipboard');
  } catch (e) {
    toast(e && e.message ? e.message : 'Copy Failed');
  }
}

async function importHash(){
  if (!location.hash || location.hash.length < 2) return false;
  let p;
  try { p = new URLSearchParams(location.hash.slice(1)); } catch (e) { return false; }
  const b64 = p.get('code');
  if (!b64) return false;
  let text = '';
  try {
    if (b64.startsWith('raw,')) text = new TextDecoder().decode(b64d(b64.slice(4)));
    else text = await inflate(b64d(b64));
  } catch (e) { return false; }
  let name = p.get('name') || 'shared.py';
  if (!/^[\w.\- ]{1,40}\.py$/i.test(name)) name = 'shared.py';

  const names = new Set(S.files.map(f => f.name));
  if (names.has(name)){
    let i = 2;
    const base = name.replace(/\.py$/i, '');
    while (names.has(base + '-' + i + '.py')) i++;
    name = base + '-' + i + '.py';
  }
  history.replaceState(null, '', location.pathname + location.search);
  if (!text) return false;
  try { createFile(name, text); } catch (e) { return false; }
  toast('Opened Shared File');
  return true;
}

async function installPackage(name){
  name = String(name || '').trim();
  if (!name){ openPalette('install '); return; }
  if (name.length > 100 || !/^[A-Za-z0-9][A-Za-z0-9 ._\-+[<>=!~,\]]*$/.test(name)){ toast('Invalid Package Name'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  st('Installing ' + name + '…', true);
  openConsole();
  appendLine('Installing ' + name + '…', 'dim');
  try {
    await pyodide.loadPackage('micropip');
    const micropip = pyodide.pyimport('micropip');
    await micropip.install(name);
    stdlibMods = null;
    appendLine('Installed ' + name + ' — ' + Object.keys(pyodide.loadedPackages).length + ' Packages Loaded', 'dim');
    st('Installed ' + name, false);
    toast('Installed ' + name);
  } catch (e) {
    renderError(e && e.message ? e.message : String(e));
    st('Install Failed', false);
  }
}

function copyOutput(){
  const parts = [];
  conBody.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => parts.push(n.textContent));
  const t = parts.join('\n');
  if (!t.trim()){ toast('Console Is Empty'); return; }
  navigator.clipboard.writeText(t).then(() => toast('Console Output Copied'), () => toast('Copy Failed'));
}

function applyFont(){
  if (editor) editor.updateOptions({ fontSize: S.prefs.fontSize });
  stFont.textContent = S.prefs.fontSize + ' px';
}

function setFont(px){
  const v = Math.min(24, Math.max(9, Math.round(px * 2) / 2));
  if (v === S.prefs.fontSize) return;
  S.prefs.fontSize = v;
  applyFont();
  savePrefs();
}

function resetFont(){
  S.prefs.fontSize = FONT_DEFAULT;
  applyFont();
  savePrefs();
  toast('Font Size Reset');
}

function toggleMinimap(){
  S.prefs.minimap = !S.prefs.minimap;
  if (editor) editor.updateOptions({ minimap: { enabled: S.prefs.minimap } });
  savePrefs();
  toast('Minimap ' + (S.prefs.minimap ? 'On' : 'Off'));
}

function toggleWrap(){
  S.prefs.wordWrap = !S.prefs.wordWrap;
  if (editor) editor.updateOptions({ wordWrap: S.prefs.wordWrap ? 'on' : 'off' });
  savePrefs();
  toast('Word Wrap ' + (S.prefs.wordWrap ? 'On' : 'Off'));
}

const decoder = new TextDecoder();

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
    if (S.openLine && S.openLine.dataset.t !== type) S.openLine = null;
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
function flashLine(line){
  if (!editor || !editor.getModel()) return;
  if (flashDeco) flashDeco.clear();
  flashDeco = editor.createDecorationsCollection([{
    range: new monaco.Range(line, 1, line, 1),
    options: { isWholeLine: true, className: 'err-flash' }
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
  flashLine(line);
}

async function run(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const code = f.model.getValue();
  if (!code.trim()){ toast('Nothing To Run — File Is Empty'); return; }
  runCode(code, f.name, f);
}

async function runCode(code, label, file, lineOff){
  if (S.running) return;
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Running ' + label + '…', true);
  openConsole();
  runHead(label);
  S.lastTrace = file ? { id: file.id, off: lineOff || 0 } : null;
  if (file) pushSnap(file.id, file.model.getValue());
  const t0 = performance.now();
  try {
    try { await pyodide.loadPackagesFromImports(code); } catch (e) {}
    await runFn(code, file ? file.name : 'main.py');
  } catch (err) {
    renderError(err && err.message ? err.message : String(err));
    if (S.pyReady){
      const d = py('vars');
      if (d && d.e && d.e.locals && Object.keys(d.e.locals).length){
        appendLine('Frame Locals Available In The Variables Panel', 'dim');
      }
    }
  } finally {
    const dt = ((performance.now() - t0) / 1000).toFixed(2);
    if (S.lastHeadTime && S.lastHeadTime.isConnected) S.lastHeadTime.textContent = dt + 's';
    S.running = false;
    updateRunUI();
    stLeft.classList.remove('run');
    st('Finished In ' + dt + 's', false);
    clearTimeout(stTimer);
    stTimer = setTimeout(() => { if (!S.running) st(pyStatusText, false); }, 4000);
    capturePlots();
    if (S.view === 'vars') refreshVars();
    if (S.view === 'hist') renderHist();
    if (document.activeElement === btnRun && editor) editor.focus();
  }
}

async function runSelection(){
  if (!editor || !activeFile()){ toast('No File Open'); return; }
  const model = editor.getModel();
  if (!model){ toast('No File Open'); return; }
  const f = activeFile();
  const sel = editor.getSelection();
  let code = '', label = f.name, off = 0;
  if (sel && !sel.isEmpty()){
    code = model.getValueInRange(sel);
    off = sel.startLineNumber - 1;
  } else {
    const pos = editor.getPosition();
    if (!pos) return;
    code = model.getLineContent(pos.lineNumber);
    off = pos.lineNumber - 1;
    label += ' · Line ' + pos.lineNumber;
  }
  if (!code.trim()){ toast('Nothing Selected To Run'); return; }
  runCode(code, label, f, off);
}

function toggleSidebar(force){
  S.prefs.sidebar = force !== undefined ? force : !S.prefs.sidebar;
  app.classList.toggle('no-sidebar', !S.prefs.sidebar);
  savePrefs();
}
function toggleConsole(force){
  S.prefs.console = force !== undefined ? force : !S.prefs.console;
  app.classList.toggle('no-console', !S.prefs.console);
  savePrefs();
}
function openConsole(){ if (!S.prefs.console) toggleConsole(true); }

function setConH(px){
  const max = Math.max(160, Math.floor(window.innerHeight * 0.7));
  S.prefs.conH = Math.min(Math.max(Math.round(px), 140), max);
  conZone.style.height = S.prefs.conH + 'px';
}

function clearConsole(){
  linesEl.querySelectorAll('.line:not(#con-empty), .in-row').forEach(n => n.remove());
  S.openLine = null;
  conEmpty.hidden = !replRow.hidden;
}

function restartRuntime(){ saveWS(); location.reload(); }

$('btn-sidebar').addEventListener('click', () => toggleSidebar());
$('btn-console').addEventListener('click', () => toggleConsole());
$('btn-newfile').addEventListener('click', newFile);
$('btn-newtab').addEventListener('click', newFile);
$('es-new').addEventListener('click', newFile);
$('btn-restart').addEventListener('click', restartRuntime);
$('btn-clear').addEventListener('click', clearConsole);
$('btn-concollapse').addEventListener('click', () => toggleConsole());
filePick.addEventListener('change', () => { importFile(filePick.files[0]); filePick.value = ''; });
stFont.addEventListener('click', resetFont);
btnRun.addEventListener('click', run);

grip.addEventListener('dblclick', () => toggleConsole(false));

window.addEventListener('resize', () => {
  if (S.prefs.console) setConH(S.prefs.conH);

  if (window.innerWidth < 860 && S.prefs.sidebar){
    S.prefs.sidebar = false;
    app.classList.add('no-sidebar');
  }
});

grip.addEventListener('pointerdown', e => {
  e.preventDefault();
  grip.setPointerCapture(e.pointerId);
  grip.classList.add('active');
  const move = ev => setConH(editorPane.getBoundingClientRect().bottom - ev.clientY);
  const up = () => {
    grip.releasePointerCapture(e.pointerId);
    grip.classList.remove('active');
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    savePrefs();
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
});

stPos.addEventListener('click', () => {
  if (!editor) return;
  editor.focus();
  const goto = editor.getAction('editor.action.gotoLine');
  if (goto) goto.run();
});
stSpaces.addEventListener('click', () => {
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  const cur = m.getOptions().tabSize;
  m.updateOptions({ tabSize: cur === 2 ? 4 : cur === 4 ? 8 : 2 });
  refreshStatusBtns();
});
stEol.addEventListener('click', () => {
  if (!editor) return;
  const m = editor.getModel();
  if (!m) return;
  m.setEOL(m.getEOL() === '\n' ? monaco.editor.EndOfLineSequence.CRLF : monaco.editor.EndOfLineSequence.LF);
  refreshStatusBtns();
});
stPy.addEventListener('click', () => toast('Python ' + pyVersion + ' · Pyodide ' + PYODIDE_VERSION));

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
    if (name) palItems.push({ label: 'Install "' + name + '" From PyPI', icon: 'box', hl: [], fn: () => installPackage(name) });
  } else if (isSym){
    const f = activeFile();
    if (f && S.pyReady){
      const sq = raw.slice(1).trim();
      const syms = py('outline_flat', f.model.getValue()) || [];
      for (const s of syms){
        const m = fuzzy(sq, s.p);
        if (m) palItems.push({ label: s.p, icon: s.k === 'class' ? 'fileCode' : 'listTree', hl: m.idxs, fn: () => {
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
      if (m) palItems.push({ label: sn.l, icon: 'insert', hl: m.idxs.filter(i => i < sn.l.length), fn: () => insertSnippetAtCursor(sn) });
    }
  } else if (isCmd){
    const sq = raw.slice(1).trim();
    for (const c of COMMANDS){
      const m = fuzzy(sq, c.label);
      if (m) palItems.push({ label: c.label, icon: c.icon, hl: m.idxs, fn: c.fn });
    }
  } else {
    for (const f of S.files){
      const m = fuzzy(q, f.name);
      if (m) palItems.push({ label: f.name, icon: 'python', hl: m.idxs, fn: () => switchTo(f.id) });
    }
  }
  palItems.sort((a, b) => a.label.localeCompare(b.label));
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
    if (S.inputField && e.key.length === 1 && !e.altKey && !(editor && editor.hasTextFocus())){
      e.preventDefault();
      S.inputField.focus();
      S.inputField.value += e.key;
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

let PLOTS = [], pwIx = 0, plotsSeen = false;

function sweepMpl(){
  const known = new Set(['app', 'palette', 'ai-modal', 'toasts', 'about-modal', 'file-pick', 'context-view']);
  document.querySelectorAll('[class*="mpl-"]').forEach(n => {
    let p = n;
    while (p.parentElement && p.parentElement !== document.body) p = p.parentElement;
    if (p.parentElement === document.body && !known.has(p.id)) p.remove();
  });
}

function capturePlots(){
  sweepMpl();
  if (!S.pyReady) return;
  const d = py('plots');
  const figs = (d && d.figs) || [];
  if (!figs.length) return;
  PLOTS = figs;
  if (S.view === 'plots') renderPlots();
  if (!plotsSeen){
    plotsSeen = true;
    setView('plots');
    toast('Figure Captured');
  }
}

function renderPlots(){
  pvList.textContent = '';
  if (!PLOTS.length){
    pvList.dataset.empty = 'No Plots Yet — Figures Appear Here After Each Run';
    return;
  }
  PLOTS.forEach((p, i) => {
    const item = h('div', 'pv-item');
    item.title = 'Open Figure ' + p.n;
    const img = h('img');
    img.src = 'data:image/png;base64,' + p.png;
    img.alt = 'Figure ' + p.n;
    item.appendChild(img);
    const cap = h('div', 'pv-cap');
    cap.appendChild(h('span', null, 'Figure ' + p.n));
    cap.appendChild(h('span', null, Math.round(p.png.length * 3 / 4 / 1024) + ' KB'));
    item.appendChild(cap);
    item.addEventListener('click', () => openPlot(i));
    pvList.appendChild(item);
  });
}

function openPlot(i){
  if (!PLOTS.length) return;
  pwIx = Math.max(0, Math.min(i, PLOTS.length - 1));
  const p = PLOTS[pwIx];
  pwImg.src = 'data:image/png;base64,' + p.png;
  pwLabel.textContent = 'Figure ' + p.n + ' · ' + (pwIx + 1) + ' / ' + PLOTS.length;
  pwBody.classList.remove('actual');
  pwPrev.disabled = pwIx === 0;
  pwNext.disabled = pwIx === PLOTS.length - 1;
  plotWrap.hidden = false;
}

function closePlot(){
  plotWrap.hidden = true;
  pwImg.src = '';
}

function stepPlot(d){
  openPlot(pwIx + d);
}

function togglePlotSize(){
  pwBody.classList.toggle('actual');
}

function downloadPlot(){
  const p = PLOTS[pwIx];
  if (!p) return;
  const a = document.createElement('a');
  a.href = 'data:image/png;base64,' + p.png;
  a.download = 'figure-' + p.n + '.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast('Downloaded figure-' + p.n + '.png');
}

$('pv-clear').addEventListener('click', () => {
  PLOTS = [];
  renderPlots();
  if (!plotWrap.hidden) closePlot();
});
pwPrev.addEventListener('click', () => stepPlot(-1));
pwNext.addEventListener('click', () => stepPlot(1));
pwSize.addEventListener('click', togglePlotSize);
$('pw-dl').addEventListener('click', downloadPlot);
$('pw-close').addEventListener('click', closePlot);

async function formatDocument(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  if (S.running) return;
  const src = f.model.getValue();
  if (!src.trim()){ toast('Nothing To Format'); return; }
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Formatting…', true);
  let r = null;
  try {
    r = py('format', src);
    if (r && r.need){
      st('Installing Black Formatter…', true);
      openConsole();
      appendLine('Installing Black (One-Time)…', 'dim');
      try {
        await pyodide.loadPackage('micropip');
        const micropip = pyodide.pyimport('micropip');
        await micropip.install('black');
        appendLine('Installed Black — ' + Object.keys(pyodide.loadedPackages).length + ' Packages Loaded', 'dim');
        r = py('format', src);
      } catch (e) {
        r = { err: 'Could Not Install Black — Check Connection' };
      }
    }
  } finally {
    S.running = false;
    updateRunUI();
    stLeft.classList.remove('run');
    st(pyStatusText, false);
  }
  if (!r){ toast('Formatting Failed'); return; }
  if (r.err){ toast(r.err); return; }
  if (r.code === src){ toast('Already Formatted'); return; }
  const m = f.model;
  pushEdits(m, [{ range: new monaco.Range(1, 1, m.getLineCount(), m.getLineMaxColumn(m.getLineCount())), text: r.code }]);
  saveWS();
  scheduleLintFor(m);
  toast('Formatted With Black');
}

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

const SNAP = {};

function pushSnap(fileId, text){
  const arr = SNAP[fileId] || (SNAP[fileId] = []);
  const last = arr[arr.length - 1];
  if (last && last.text === text) return;
  arr.push({ t: Date.now(), text });
  if (arr.length > 20) arr.shift();
}

function renderHist(){
  const f = activeFile();
  hvName.textContent = f ? f.name : '';
  hvList.textContent = '';
  if (!f){ hvList.dataset.empty = 'No File Open'; return; }
  const arr = SNAP[f.id] || [];
  if (!arr.length){ hvList.dataset.empty = 'No Snapshots Yet — One Is Taken Each Time You Run A File'; return; }
  const cur = f.model.getValue();
  for (const s of [...arr].reverse()){
    const row = h('div', 'hv-row');
    const d = new Date(s.t);
    row.appendChild(h('span', 'hv-time', String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')));
    row.appendChild(h('span', 'hv-chars', s.text.length.toLocaleString() + ' Chars'));
    const dl = s.text.length - cur.length;
    row.appendChild(h('span', 'hv-delta' + (dl > 0 ? ' add' : dl < 0 ? ' del' : ' same'), (dl > 0 ? '+' : '') + dl));
    row.title = 'Compare With Current File';
    row.addEventListener('click', () => openDiff(f, s));
    hvList.appendChild(row);
  }
}

let diffEd = null, dwCur = null;

function openDiff(f, snap){
  const d = new Date(snap.t);
  dwLabel.textContent = f.name + ' · Snapshot ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  diffWrap.hidden = false;
  if (!diffEd){
    diffEd = monaco.editor.createDiffEditor(diffHost, {
      theme: S.prefs.theme === 'ink' ? 'ink' : 'paper', automaticLayout: true, readOnly: true,
      fontFamily: MONO_FONT,
      fontSize: S.prefs.fontSize, lineHeight: 22, fontLigatures: true,
      renderSideBySide: true, scrollBeyondLastLine: false,
      minimap: { enabled: false }, overviewRulerLanes: 0, hideCursorInOverviewRuler: true,
      padding: { top: 10, bottom: 10 }, lineNumbersMinChars: 2, lineDecorationsWidth: 6,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false }
    });
  }
  if (dwCur) dwCur.orig.dispose();
  const orig = monaco.editor.createModel(snap.text, 'python');
  dwCur = { f, snap, orig };
  diffEd.setModel({ original: orig, modified: f.model });
}

function closeDiff(){
  diffWrap.hidden = true;
  if (dwCur && diffEd){
    diffEd.setModel(null);
    dwCur.orig.dispose();
    dwCur = null;
  }
}

function restoreDiff(){
  if (!dwCur) return;
  const f = dwCur.f, snap = dwCur.snap;
  const m = f.model;
  const full = new monaco.Range(1, 1, m.getLineCount(), m.getLineMaxColumn(m.getLineCount()));
  pushEdits(m, [{ range: full, text: snap.text }]);
  closeDiff();
  saveWS();
  scheduleLintFor(m);
  renderHist();
  toast('Restored Snapshot — Undo Again To Revert');
}

$('dw-close').addEventListener('click', closeDiff);
$('dw-restore').addEventListener('click', restoreDiff);

const LINT_OWNER = 'noir';
let lintTimer = 0;

function scheduleLintFor(model){
  clearTimeout(lintTimer);
  lintTimer = setTimeout(() => lintModel(model), 850);
}

function lintModel(model, manual){
  if (!S.pyReady || !model || model.isDisposed()) return;
  const src = model.getValue();
  if (!src.trim()){
    monaco.editor.setModelMarkers(model, LINT_OWNER, []);
    updateProbChip();
    if (manual) toast('No Problems Found');
    return;
  }
  const diags = py('lint', src) || [];
  const SEV = { error: monaco.MarkerSeverity.Error, warn: monaco.MarkerSeverity.Warning, info: monaco.MarkerSeverity.Info };
  monaco.editor.setModelMarkers(model, LINT_OWNER, diags.map(d => ({
    severity: SEV[d.s] || monaco.MarkerSeverity.Info,
    message: d.m,
    source: 'noir',
    startLineNumber: d.l, startColumn: d.c, endLineNumber: d.l, endColumn: Math.max(d.e, d.c + 1)
  })));
  updateProbChip();
  if (manual){
    if (!diags.length) toast('No Problems Found');
    else {
      const e = diags.filter(d => d.s === 'error').length;
      const w = diags.filter(d => d.s === 'warn').length;
      toast(e + ' Error' + (e === 1 ? '' : 's') + ' · ' + w + ' Warning' + (w === 1 ? '' : 's') + ' — F8 To Jump');
    }
  }
}

function updateProbChip(){
  let e = 0, w = 0;
  for (const f of S.files){
    if (!f.model || f.model.isDisposed()) continue;
    for (const m of monaco.editor.getModelMarkers({ owner: LINT_OWNER, resource: f.model.uri })){
      if (m.severity === monaco.MarkerSeverity.Error) e++;
      else if (m.severity === monaco.MarkerSeverity.Warning) w++;
    }
  }
  spErr.textContent = String(e);
  spWarn.textContent = String(w);
  stProb.hidden = e === 0 && w === 0;
}

function nextProblem(back){
  const f = activeFile();
  if (!f || !editor.getModel()) return;
  const ms = monaco.editor.getModelMarkers({ owner: LINT_OWNER, resource: f.model.uri })
    .sort((a, b) => a.startLineNumber - b.startLineNumber || a.startColumn - b.startColumn);
  if (!ms.length){ toast('No Problems In This File'); return; }
  const pos = editor.getPosition() || { lineNumber: 1, column: 1 };
  let idx = -1;
  if (back){
    for (let i = ms.length - 1; i >= 0; i--){
      if (ms[i].startLineNumber < pos.lineNumber || (ms[i].startLineNumber === pos.lineNumber && ms[i].startColumn < pos.column)){ idx = i; break; }
    }
    if (idx < 0) idx = ms.length - 1;
  } else {
    for (let i = 0; i < ms.length; i++){
      if (ms[i].startLineNumber > pos.lineNumber || (ms[i].startLineNumber === pos.lineNumber && ms[i].startColumn > pos.column)){ idx = i; break; }
    }
    if (idx < 0) idx = 0;
  }
  const m = ms[idx];
  editor.revealLineInCenter(m.startLineNumber);
  editor.setSelection(new monaco.Range(m.startLineNumber, m.startColumn, m.startLineNumber, Math.max(m.endColumn, m.startColumn + 1)));
  editor.setPosition({ lineNumber: m.startLineNumber, column: m.startColumn });
  editor.focus();
}

stProb.addEventListener('click', () => nextProblem(false));

async function profileFile(){
  const f = activeFile();
  if (!f){ toast('No File Open'); return; }
  const code = f.model.getValue();
  if (!code.trim()){ toast('Nothing To Profile — File Is Empty'); return; }
  if (!S.pyReady){ toast('Python Runtime Is Still Loading…'); return; }
  if (S.running) return;
  S.running = true;
  updateRunUI();
  stLeft.classList.add('run');
  st('Profiling ' + f.name + '…', true);
  openConsole();
  runHead('Profile · ' + f.name);
  S.lastTrace = { id: f.id, off: 0 };
  const t0 = performance.now();
  let out = null, errTxt = null;
  try {
    const r = py('profile', code, f.name);
    if (r){ out = r.text; errTxt = r.err; }
    else errTxt = 'Profiling Failed';
  } catch (e){ errTxt = e && e.message ? e.message : String(e); }
  if (out && out.trim()) appendLine(out.trimEnd());
  if (errTxt) renderError(errTxt);
  const dt = ((performance.now() - t0) / 1000).toFixed(2);
  if (S.lastHeadTime && S.lastHeadTime.isConnected) S.lastHeadTime.textContent = dt + 's';
  S.running = false;
  updateRunUI();
  stLeft.classList.remove('run');
  st('Profiled In ' + dt + 's', false);
  clearTimeout(stTimer);
  stTimer = setTimeout(() => { if (!S.running) st(pyStatusText, false); }, 4000);
  capturePlots();
  if (S.view === 'vars') refreshVars();
}

const PYBLOB_B64 = '/*__NOIR_BLOB__*/';
let PYBLOB = null;
async function loadBlob(){
  if (PYBLOB) return PYBLOB;
  try { PYBLOB = JSON.parse(await inflate(b64d(PYBLOB_B64))); }
  catch (e) {

    PYBLOB = { intel: '', repl: '', tools: '', kw: [], sn: [], fm: [], fn: [] };
    openConsole();
    appendLine('Engine Data Failed To Load — Rebuild The File', 'err');
  }
  return PYBLOB;
}

let stdlibMods = null;
let SNIPS = [];

function py(fn, arg, arg2){
  if (!S.pyReady) return null;
  try {
    let call = '_' + fn + '(' + (arg === undefined ? '' : JSON.stringify(arg));
    if (arg2 !== undefined) call += ',' + JSON.stringify(arg2);
    const r = pyodide.runPython(call + ')');
    return r == null ? null : JSON.parse(r);
  } catch (e) { return null; }
}

function getModules(){
  if (!stdlibMods) stdlibMods = py('import_names') || [];
  let loaded = [];
  try { loaded = Object.keys(pyodide.loadedPackages || {}); } catch (e) {}
  return [...new Set(stdlibMods.concat(loaded))];
}

function findCall(model, position){
  const firstLine = Math.max(1, position.lineNumber - 200);
  let text = '';
  for (let l = firstLine; l < position.lineNumber; l++) text += model.getLineContent(l) + '\n';
  text += model.getLineContent(position.lineNumber).slice(0, position.column - 1);
  let depth = 0, open = -1, arg = 0, str = null, esc = false;
  for (let i = 0; i < text.length; i++){
    const c = text[i];
    if (str){
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === str) str = null;
      continue;
    }
    if (c === "'" || c === '"'){ str = c; continue; }
    if (c === '('){ if (depth === 0){ open = i; arg = 0; } depth++; }
    else if (c === ')'){ if (depth === 0) return null; depth--; if (depth === 0) open = -1; }
    else if (c === ',' && depth === 1 && open >= 0) arg++;
  }
  if (str || open < 0) return null;
  const m = text.slice(0, open).match(/([A-Za-z_][\w.]*)$/);
  if (!m) return null;
  return { expr: m[1], arg: arg };
}

function chainAt(line, col){
  let s = col - 1, e = col - 1;
  while (s > 0 && /[\w.]/.test(line[s - 1])) s--;
  while (e < line.length && /[\w.]/.test(line[e])) e++;
  const chain = line.slice(s, e).replace(/^\.+|\.+$/g, '');
  return chain && !chain.includes('..') ? chain : null;
}

function dotBase(line){
  const m = line.match(/\.(\w*)$/);
  if (!m) return null;
  const end = line.length - m[1].length - 1;
  let i = end, ok = false;
  while (i > 0){
    const c = line[i - 1];
    if (c === '.'){ if (!ok) return null; ok = false; i--; }
    else if (c === ']' || c === ')'){
      const open = c === ']' ? '[' : '(', close = c;
      let d = 0, j = i - 1;
      while (j >= 0){
        const cj = line[j];
        if (cj === close) d++;
        else if (cj === open){ if (--d === 0) break; }
        else if (cj === '"' || cj === "'"){ const q = line[j]; j--; while (j >= 0 && line[j] !== q) j--; }
        j--;
      }
      if (j < 0) return null;
      if (open === '(' && j > 0 && /[\w.'"]/.test(line[j - 1])) return null;
      i = j; ok = true;
    }
    else if (c === '"' || c === "'"){
      let j = i - 2;
      while (j >= 0 && line[j] !== c) j--;
      if (j < 0) return null;
      while (j > 0 && /[A-Za-z]/.test(line[j - 1])) j--;
      i = j; ok = true;
    }
    else if (/[A-Za-z0-9_]/.test(c)){
      while (i > 0 && /[A-Za-z0-9_]/.test(line[i - 1])) i--;
      ok = true;
    }
    else break;
  }
  return ok && i < end ? { expr: line.slice(i, end), suffix: m[1], len: m[1].length } : null;
}

const GHOST = { cool: 0, shown: null, llmCache: null, llmTimer: 0, llmReq: null, ck: null, calls: 0 };
const ghostLineCache = new Map();

function aiModeLabel(){ return { off: 'Off', local: 'Local', ollama: 'Ollama' }[S.prefs.ai.mode] || 'Local'; }
function refreshAIChip(){
  stAi.textContent = 'Ghost: ' + aiModeLabel();
  stAi.title = 'Ghost Text — ' + aiModeLabel() + '. Click To Configure.';
}
function openAIModal(){
  aiModal.hidden = false;
  for (const b of aiModal.querySelectorAll('.aim-mode')) b.classList.toggle('on', b.dataset.mode === S.prefs.ai.mode);
  aiModal.querySelector('.aim-ollama').classList.toggle('dim', S.prefs.ai.mode !== 'ollama');
  aiUrl.value = S.prefs.ai.url;
  aiModel.value = S.prefs.ai.model;
  aiStatus.textContent = '';
  aiStatus.className = 'aim-status';
}
function closeAIModal(){ aiModal.hidden = true; if (editor) editor.focus(); }

stAi.addEventListener('click', openAIModal);
stTheme.addEventListener('click', toggleTheme);
$('ai-x').addEventListener('click', closeAIModal);
aiModal.addEventListener('mousedown', e => { if (e.target === aiModal) closeAIModal(); });
for (const b of aiModal.querySelectorAll('.aim-mode')){
  b.addEventListener('click', () => {
    S.prefs.ai.mode = b.dataset.mode;
    savePrefs();
    refreshAIChip();
    for (const o of aiModal.querySelectorAll('.aim-mode')) o.classList.toggle('on', o === b);
    aiModal.querySelector('.aim-ollama').classList.toggle('dim', S.prefs.ai.mode !== 'ollama');
    if (S.prefs.ai.mode === 'ollama') setTimeout(() => aiUrl.focus(), 0);
    else GHOST.llmCache = null;
  });
}
aiUrl.addEventListener('change', () => { S.prefs.ai.url = aiUrl.value.trim() || 'http://localhost:11434'; savePrefs(); });
aiModel.addEventListener('change', () => { S.prefs.ai.model = aiModel.value.trim(); savePrefs(); });
aiTestBtn.addEventListener('click', () => {
  const url = (aiUrl.value.trim() || 'http://localhost:11434').replace(/\/+$/, '');
  aiStatus.className = 'aim-status';
  aiStatus.textContent = 'Testing…';
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  fetch(url + '/api/tags', { signal: ctl.signal })
    .then(r => r.json())
    .then(d => {
      clearTimeout(t);
      const names = ((d && d.models) || []).map(m => m.name || m.model).filter(Boolean);
      if (!names.length){
        aiStatus.className = 'aim-status bad';
        aiStatus.textContent = 'Connected — No Models. Install One: ollama pull qwen2.5-coder:1.5b';
        return;
      }
      aiStatus.className = 'aim-status ok';
      aiStatus.textContent = 'Connected — ' + names.length + ' Model' + (names.length > 1 ? 's' : '') + ' Available';
      if (!names.includes(aiModel.value.trim())){
        const pick = names.find(n => /coder/i.test(n)) || names[0];
        aiModel.value = pick;
        S.prefs.ai.model = pick;
        savePrefs();
      }
    })
    .catch(() => {
      clearTimeout(t);
      aiStatus.className = 'aim-status bad';
      aiStatus.textContent = 'Unreachable — Is Ollama Running? If This Editor Opens From A Local File, Launch Ollama With OLLAMA_ORIGINS="*" So The Browser May Call It.';
    });
});

function openAbout(){
  abVer.textContent = APP_VERSION;
  abRun.textContent = S.pyReady ? 'Python ' + pyVersion + ' · Pyodide ' + PYODIDE_VERSION : 'Pyodide ' + PYODIDE_VERSION;
  aboutModal.hidden = false;
}
function closeAbout(){ aboutModal.hidden = true; if (editor) editor.focus(); }

$('ab-x').addEventListener('click', closeAbout);
aboutModal.addEventListener('mousedown', e => { if (e.target === aboutModal) closeAbout(); });

window.MonacoEnvironment = {
  getWorkerUrl: function(){
    return URL.createObjectURL(new Blob([
      "self.MonacoEnvironment={baseUrl:'" + MONACO_BASE + "'};" +
      "importScripts('" + MONACO_BASE + "/base/worker/workerMain.js');"
    ], { type: 'text/javascript' }));
  }
};

require.config({ paths: { vs: MONACO_BASE } });

require(['vs/editor/editor.main'], async function(){

  await loadBlob();

  const KEYWORDS = PYBLOB.kw, SNIPPETS = PYBLOB.sn, FALLBACK_MODULES = PYBLOB.fm, FALLBACK_NAMES = PYBLOB.fn;
  SNIPS = SNIPPETS;

  monaco.editor.defineTheme('paper', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '161616' },
      { token: 'comment', foreground: '86857e', fontStyle: 'italic' },
      { token: 'keyword', foreground: '161616', fontStyle: 'bold' },
      { token: 'annotation', foreground: '9a6b1f' },
      { token: 'type.identifier', foreground: '2f7d4f' },
      { token: 'support.function', foreground: '4a4a48' },
      { token: 'string', foreground: '2f7d4f' },
      { token: 'string.double', foreground: '2f7d4f' },
      { token: 'string.single', foreground: '2f7d4f' },
      { token: 'string.escape', foreground: '9a6b1f' },
      { token: 'number', foreground: '9a6b1f' },
      { token: 'delimiter', foreground: '86857e' },
      { token: 'identifier', foreground: '161616' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#161616',
      'editorLineNumber.foreground': '#b0aa98',
      'editorLineNumber.activeForeground': '#4a4a48',
      'editorCursor.foreground': '#161616',
      'editor.selectionBackground': '#e6e2d3',
      'editor.inactiveSelectionBackground': '#efede4',
      'editor.selectionHighlightBackground': '#f0eee3',
      'editor.lineHighlightBackground': '#faf9f5',
      'editorIndentGuide.background': '#f0ede1',
      'editorIndentGuide.background1': '#f0ede1',
      'editorIndentGuide.activeBackground': '#d9d4c2',
      'editorIndentGuide.activeBackground1': '#d9d4c2',
      'editorWidget.background': '#ffffff',
      'editorGhostText.foreground': '#b5b3aa',
      'editorWidget.border': '#c8c2ad',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#c8c2ad',
      'editorSuggestWidget.foreground': '#161616',
      'editorSuggestWidget.detailForeground': '#86857e',
      'editorSuggestWidget.documentationForeground': '#4a4a48',
      'editorSuggestWidget.selectedBackground': '#e8f1ea',
      'editorSuggestWidget.hoverBackground': '#faf9f5',
      'editorHoverWidget.background': '#ffffff',
      'editorHoverWidget.border': '#c8c2ad',
      'editorHoverWidget.foreground': '#4a4a48',
      'parameterHintsWidget.background': '#ffffff',
      'parameterHintsWidget.border': '#c8c2ad',
      'editorBracketMatch.background': '#f4ecdc',
      'editorBracketMatch.border': '#c8c2ad',
      'editor.findMatchBackground': '#f0dfb4',
      'editor.findMatchHighlightBackground': '#f7f0dd',
      'diffEditor.insertedTextBackground': '#2f7d4f1c',
      'diffEditor.removedTextBackground': '#b3403a16',
      'diffEditor.insertedLineBackground': '#e8f1ea80',
      'diffEditor.removedLineBackground': '#f6ebe980',
      'diffEditor.border': '#ece9df',
      'scrollbarSlider.background': '#e6e1d2',
      'scrollbarSlider.hoverBackground': '#d6d1bf',
      'scrollbarSlider.activeBackground': '#c8c2ad',
      'editorOverviewRuler.border': '#ffffff',
      'editorGutter.background': '#ffffff',
      'menu.background': '#ffffff',
      'menu.foreground': '#161616',
      'menu.border': '#c8c2ad',
      'menu.selectionBackground': '#e8f1ea',
      'menu.selectionForeground': '#161616',
      'widget.shadow': '#c8c2ad66'
    }
  });
  monaco.editor.defineTheme('ink', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'ece7dc' },
      { token: 'comment', foreground: '6e675a', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ece7dc', fontStyle: 'bold' },
      { token: 'annotation', foreground: 'c99e5a' },
      { token: 'type.identifier', foreground: '8fc9a4' },
      { token: 'support.function', foreground: 'b3aca0' },
      { token: 'string', foreground: '8fc9a4' },
      { token: 'string.double', foreground: '8fc9a4' },
      { token: 'string.single', foreground: '8fc9a4' },
      { token: 'string.escape', foreground: 'c99e5a' },
      { token: 'number', foreground: 'c99e5a' },
      { token: 'delimiter', foreground: '877f70' },
      { token: 'identifier', foreground: 'ece7dc' }
    ],
    colors: {
      'editor.background': '#201d18',
      'editor.foreground': '#ece7dc',
      'editorLineNumber.foreground': '#7a7263',
      'editorLineNumber.activeForeground': '#b3aca0',
      'editorCursor.foreground': '#ece7dc',
      'editor.selectionBackground': '#34302a',
      'editor.inactiveSelectionBackground': '#2b2721',
      'editor.selectionHighlightBackground': '#2f2b24',
      'editor.lineHighlightBackground': '#26231d',
      'editorIndentGuide.background': '#2b2820',
      'editorIndentGuide.background1': '#2b2820',
      'editorIndentGuide.activeBackground': '#454035',
      'editorIndentGuide.activeBackground1': '#454035',
      'editorWidget.background': '#26231e',
      'editorGhostText.foreground': '#6e675a',
      'editorWidget.border': '#4a4437',
      'editorSuggestWidget.background': '#26231e',
      'editorSuggestWidget.border': '#4a4437',
      'editorSuggestWidget.foreground': '#ece7dc',
      'editorSuggestWidget.detailForeground': '#877f70',
      'editorSuggestWidget.documentationForeground': '#b3aca0',
      'editorSuggestWidget.selectedBackground': '#2c3a30',
      'editorSuggestWidget.hoverBackground': '#2b2822',
      'editorHoverWidget.background': '#26231e',
      'editorHoverWidget.border': '#4a4437',
      'editorHoverWidget.foreground': '#b3aca0',
      'parameterHintsWidget.background': '#26231e',
      'parameterHintsWidget.border': '#4a4437',
      'editorBracketMatch.background': '#383324',
      'editorBracketMatch.border': '#57513f',
      'editor.findMatchBackground': '#6b5426',
      'editor.findMatchHighlightBackground': '#473d22',
      'diffEditor.insertedTextBackground': '#8fc9a41c',
      'diffEditor.removedTextBackground': '#d2918916',
      'diffEditor.insertedLineBackground': '#24352b80',
      'diffEditor.removedLineBackground': '#3a2a2680',
      'diffEditor.border': '#332f27',
      'scrollbarSlider.background': '#35322a',
      'scrollbarSlider.hoverBackground': '#45413a',
      'scrollbarSlider.activeBackground': '#57513f',
      'editorOverviewRuler.border': '#201d18',
      'editorGutter.background': '#201d18',
      'menu.background': '#26231e',
      'menu.foreground': '#ece7dc',
      'menu.border': '#4a4437',
      'menu.selectionBackground': '#2c3a30',
      'menu.selectionForeground': '#ece7dc',
      'widget.shadow': '#000000aa'
    }
  });

  editor = monaco.editor.create($('editor'), {
    model: null,
    theme: S.prefs.theme === 'ink' ? 'ink' : 'paper',
    automaticLayout: true,
    fontFamily: MONO_FONT,
    fontSize: S.prefs.fontSize,
    lineHeight: 22,
    fontLigatures: true,
    minimap: { enabled: !!S.prefs.minimap },
    wordWrap: S.prefs.wordWrap ? 'on' : 'off',
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollBeyondLastLine: false,
    padding: { top: 12, bottom: 28 },
    lineNumbersMinChars: 2,
    lineDecorationsWidth: 6,
    smoothScrolling: true,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    cursorWidth: 2,
    renderLineHighlight: 'line',
    renderWhitespace: 'none',
    tabSize: 4,
    insertSpaces: true,
    detectIndentation: false,
    wordBasedSuggestions: 'currentDocument',
    suggestSelection: 'first',
    quickSuggestions: { other: true, comments: false, strings: false },
    suggest: { showStatusBar: false },
    parameterHints: { cycle: true },
    hover: { delay: 200 },
    bracketPairColorization: { enabled: false },
    guides: { indentation: true, bracketPairs: false, highlightActiveIndentation: true },
    mouseWheelZoom: true,
    linkedEditing: true,
    occurrencesHighlight: 'off',
    accessibilitySupport: 'off',
    contextmenu: false,
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false
    },
    stickyScroll: { enabled: false },
    inlineSuggest: { enabled: true, mode: 'subword' }
  });

  S.monacoReady = true;

  try {
    GHOST.ck = editor.createContextKey('noirGhostVisible', false);
    editor.addCommand(monaco.KeyCode.Tab, ghostAccept, 'noirGhostVisible && !suggestWidgetVisible');
  } catch (e) {}

  const ws = loadWS();
  const seenNames = new Set();
  for (const f of ws.files){
    let name = f.name, i = 2;
    while (seenNames.has(name)) name = f.name.replace(/\.py$/i, '') + '-' + (i++) + '.py';
    seenNames.add(name);
    createFile(name, f.content, { activate: false });
  }
  const target = S.files.find(f => f.name === ws.active) || S.files[0];
  if (target) switchTo(target.id); else refreshChrome();

  importHash();

  editor.onDidChangeCursorPosition(e => {
    stPos.textContent = 'Ln ' + e.position.lineNumber + ', Col ' + e.position.column;
  });
  editor.onDidChangeModel(() => {
    refreshStatusBtns();
    const p = editor.getPosition();
    stPos.textContent = p ? 'Ln ' + p.lineNumber + ', Col ' + p.column : 'Ln 1, Col 1';
  });
  editor.onDidChangeModelContent(e => {
    scheduleWS();
    if (editor.getModel()) scheduleLintFor(editor.getModel());
    const changes = e.changes;
    if (!changes.length) return;
    const inserted = changes[changes.length - 1].text || '';
    if (!inserted.includes('(') && !inserted.includes(',')) return;
    const pos = editor.getPosition();
    if (!pos) return;
    const before = editor.getModel().getLineContent(pos.lineNumber).slice(0, pos.column - 1);
    const last = before.slice(-1);
    if (last === '(' || last === ','){
      const action = editor.getAction('editor.action.triggerParameterHints');
      if (action) action.run();
    }
  });

  if (document.fonts && document.fonts.ready){
    document.fonts.ready.then(() => monaco.editor.remeasureFonts());
  }

  $('editor').addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!editor.getModel()) return;
    const tgt = editor.getTargetAtClientPoint(e.clientX, e.clientY);
    const sel = editor.getSelection();
    const inSel = sel && !sel.isEmpty() && tgt && tgt.position && sel.containsPosition(tgt.position);
    if (!inSel && tgt && tgt.position) editor.setPosition(tgt.position);
    editor.focus();
    editorMenu(e.clientX, e.clientY);
  });

  updateRunUI();
  editor.focus();
  renderView();
  if (S.pyReady) for (const f of S.files) lintModel(f.model);

  const K = () => monaco.languages.CompletionItemKind;
  const KINDS = () => ({
    module: K().Module, class: K().Class, function: K().Function,
    constant: K().Constant, variable: K().Variable
  });

  function suggestionsFrom(items, range, hidePrivate, query){
    const kinds = KINDS();
    const q = query || '';
    const res = [];
    for (const it of items){
      if (hidePrivate && it.label.charAt(0) === '_') continue;
      const tier = (q && it.label.startsWith(q)) ? '0'
        : it.label.startsWith('__') ? '3'
        : it.label.charAt(0) === '_' ? '2' : '1';
      res.push({
        label: it.label,
        kind: kinds[it.kind] || kinds.variable,
        detail: it.detail || '',
        documentation: it.doc ? { value: '```\n' + it.doc + '\n```' } : undefined,
        insertText: it.label,
        range: range,
        sortText: tier + it.label.toLowerCase()
      });
    }
    return res;
  }

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.'],
    provideCompletionItems(model, position){
      const line = model.getValueInRange({
        startLineNumber: position.lineNumber, startColumn: 1,
        endLineNumber: position.lineNumber, endColumn: position.column
      });
      const word = model.getWordUntilPosition(position);
      const wordRange = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn
      };
      const rangeOver = len => ({
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: position.column - len, endColumn: position.column
      });

      let m = line.match(/^\s*import\s+([A-Za-z_][\w.]*)$/) || line.match(/^\s*from\s+([A-Za-z_][\w.]*)$/);
      if (m){
        const mods = S.pyReady ? getModules() : FALLBACK_MODULES;
        const pref = m[1];
        const r = rangeOver(pref.length);
        const sug = [];
        for (const name of mods){
          if (name.includes('.') || (pref && !name.startsWith(pref))) continue;
          sug.push({ label: name, kind: K().Module, detail: 'module', insertText: name, range: r });
        }
        return { suggestions: sug };
      }

      m = line.match(/^\s*from\s+([A-Za-z_][\w.]*)\s+import\s+([\w.]*)$/);
      if (m && S.pyReady){
        const items = py('complete_dot', m[1]) || [];
        const pref = m[2];
        const r = rangeOver(pref.length);
        return { suggestions: suggestionsFrom(items, r, pref.charAt(0) !== '_', pref) };
      }

      const db = dotBase(line);
      if (db && S.pyReady){
        const items = py('complete_dot', db.expr) || [];
        return { suggestions: suggestionsFrom(items, rangeOver(db.len), db.suffix.charAt(0) !== '_', db.suffix) };
      }

      const q = word.word || '';
      const suggestions = KEYWORDS.map(kw => ({
        label: kw, kind: K().Keyword, insertText: kw, range: wordRange,
        sortText: (q && kw.startsWith(q) ? '0' : '4') + kw.toLowerCase()
      }));
      const SNIPR = monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet;
      for (const sn of SNIPPETS){
        suggestions.push({
          label: sn.l, kind: K().Snippet, detail: 'Snippet', documentation: sn.d,
          insertText: sn.i, insertTextRules: SNIPR, range: wordRange,
          sortText: (q && sn.l.startsWith(q) ? '0' : '3') + sn.l
        });
      }
      const names = S.pyReady ? py('complete_top') : FALLBACK_NAMES;
      const seen = new Set(KEYWORDS);
      if (names) for (const it of names) seen.add(it.label);
      const re = /[A-Za-z_][A-Za-z_0-9]{2,}/g;
      const text = model.getValue();
      let wm, added = 0;
      while (added < 400 && (wm = re.exec(text))){
        const w = wm[0];
        if (w === q || seen.has(w)) continue;
        seen.add(w);
        added++;
        suggestions.push({ label: w, kind: K().Text, insertText: w, range: wordRange,
          sortText: (q && w.startsWith(q) ? '0' : '2') + w.toLowerCase() });
      }
      if (names) return { suggestions: suggestions.concat(suggestionsFrom(names, wordRange, true, q)) };
      return { suggestions };
    }
  });

  function ghostModelLines(m){
    const key = m.uri.toString();
    const ver = m.getAlternativeVersionId();
    let c = ghostLineCache.get(key);
    if (!c || c.ver !== ver){ c = { ver, lines: m.getLinesContent() }; ghostLineCache.set(key, c); }
    return c.lines;
  }
  const indentOf = s => (s.match(/^[ \t]*/) || [''])[0].length;

  function ghostSplit(p){
    let cut = -1;
    for (let i = p.length - 1; i >= 0; i--){
      const c = p[i];
      if (c === ' ' || c === '(' || c === '[' || c === '{' || c === ',' || c === ':' || c === '.' || c === '='){ cut = i; break; }
    }
    return cut >= 0 ? [p.slice(0, cut + 1), p.slice(cut + 1)] : ['', p];
  }

  function ghostMine(model, ln, prefix){
    const out = [], seen = new Set();
    const [base, partial] = ghostSplit(prefix);
    const relaxedOK = base.length >= 2 && partial.length >= 2;
    const rows = [];
    for (const f of S.files){
      if (!f.model || f.model.isDisposed()) continue;
      const same = f.model === model;
      const lines = ghostModelLines(f.model);
      for (let i = 0; i < lines.length; i++){
        const L = lines[i];
        if (L.length < prefix.length + 1 || L.length > 220) continue;
        let rem = null, rel = false;
        if (L.startsWith(prefix)) rem = L.slice(prefix.length);
        else if (relaxedOK && L.startsWith(base) && L.startsWith(partial, base.length) && L.length > base.length + partial.length){
          rem = L.slice(base.length + partial.length); rel = true;
        }
        if (rem == null || !rem.trim() || rem.length > 100) continue;
        if (rem.length === 1 && rem !== ':') continue;
        if (same && i === ln) continue;
        const k = (rel ? 'R' : 'E') + '|' + (rel ? L.slice(base.length) : rem);
        let r = rows.find(x => x.k === k);
        if (!r){ r = { k, rem, rel, n: 0, same: 0, line: L, li: i, lines }; rows.push(r); }
        r.n++; if (same) r.same++;
      }
    }
    rows.sort((a, b) => (b.n * 3 + b.same * 2) - (a.n * 3 + a.same * 2));
    for (const r of rows){
      if (out.length >= 5) break;
      if (!seen.has(r.k)){
        seen.add(r.k);
        out.push(r.rel
          ? { insertText: r.line.slice(base.length),
              range: new monaco.Range(ln, base.length + 1, ln, prefix.length + 1) }
          : { insertText: r.rem });
      }

      if (!r.rel && /:\s*$/.test(r.line) && r.li < r.lines.length - 1){
        const ind = indentOf(r.line), blk = [r.line];
        for (let j = r.li + 1; j < r.lines.length && j <= r.li + 5; j++){
          const nl = r.lines[j];
          if (!nl.trim()){ blk.push(nl); continue; }
          if (indentOf(nl) > ind) blk.push(nl); else break;
        }
        while (blk.length && !blk[blk.length - 1].trim()) blk.pop();
        const bt = blk.join('\n').slice(prefix.length);
        const bk = 'B|' + bt;
        if (bt.includes('\n') && bt.length <= 220 && !seen.has(bk) && out.length < 5){
          seen.add(bk);
          out.push({ insertText: bt });
        }
      }
    }
    return out;
  }

  const GHOST_IDIOMS = [
    [/^#!\/usr\/bin\/env$/, () => ' python3'],
    [/^(\s*)if __name__ ==$/, () => " '__main__':"],
    [/^(\s*)if __name__ == '__main__':$/, (m, ctx) => ctx.hasMain ? '\n    main()' : null],
    [/^(\s*)try:$/, m => '\n' + m[1] + '    pass\n' + m[1] + 'except Exception as e:\n' + m[1] + '    print(f"error: {e}")'],
    [/^(\s*)def (?:__init__|__repr__|__str__|__len__|__eq__|__hash__|__enter__|__call__)__$/, () => '(self):'],
    [/^(\s*)super\(\)\.__init__$/, () => '()'],
    [/^(\s*)for\s+\w+\s+in\s+range\(\d+\)$/, () => '):'],
    [/^(\s*)def\s+\w+\s*\(.*\)\s*:\s*$/, m => '\n' + m[1] + '    """docstring"""']
  ];

  function ghostCtxKey(model, pos){
    const off = model.getOffsetAt(pos);
    const txt = model.getValue();
    const s = txt.slice(Math.max(0, off - 1600), off);
    let h5 = 5381;
    for (let i = 0; i < s.length; i++){ h5 = ((h5 << 5) + h5 + s.charCodeAt(i)) | 0; }
    return model.uri.toString() + '#' + (h5 >>> 0).toString(36) + '#' + off;
  }

  function llmKick(model, pos){
    if (S.prefs.ai.mode !== 'ollama') return;
    const line = model.getLineContent(pos.lineNumber);
    const prefix = line.slice(0, pos.column - 1);
    if (prefix.trim().length < 4 || /[.(\[{,=]$/.test(prefix)) return;
    const key = ghostCtxKey(model, pos);
    if (GHOST.llmCache && GHOST.llmCache.key === key) return;
    clearTimeout(GHOST.llmTimer);
    GHOST.llmTimer = setTimeout(() => {
      if (!editor || editor.getModel() !== model || model.isDisposed()) return;
      if (GHOST.llmReq) GHOST.llmReq.abort();
      const ctl = new AbortController();
      GHOST.llmReq = ctl;
      const off = model.getOffsetAt(pos);
      const before = model.getValue().slice(Math.max(0, off - 1600), off);
      fetch(S.prefs.ai.url.replace(/\/+$/, '') + '/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: (S.prefs.ai.model || '').trim() || 'qwen2.5-coder:1.5b',
          prompt: '<|fim_prefix|>' + before + '<|fim_suffix|><|fim_middle|>',
          stream: false,
          options: { num_predict: 48, temperature: 0.15, stop: ['<|fim_middle|>', '<|fim_end|>'] }
        }),
        signal: ctl.signal
      }).then(r => r.json()).then(d => {
        let t = String((d && d.response) || '');
        t = t.replace(/<\|fim_(?:prefix|suffix|middle|end)\|>/g, '').replace(/\s+$/, '');
        if (!t) return;
        t = t.split('\n').slice(0, 3).join('\n');
        if (t.length > 160) t = t.slice(0, 160);
        GHOST.llmCache = { key, text: t, ts: Date.now() };
        const a = editor && editor.getAction('editor.action.inlineSuggest.trigger');
        if (a){ try { a.run(); } catch (e) {} }
      }).catch(() => {});
    }, 550);
  }

  function ghostCompute(model, pos){
    if (S.prefs.ai.mode === 'off' || Date.now() < GHOST.cool) return [];
    const line = model.getLineContent(pos.lineNumber);
    if (pos.column - 1 !== line.length || line.trim().length < 2) return [];
    const items = [];
    if (S.prefs.ai.mode === 'ollama' && GHOST.llmCache){
      const c = GHOST.llmCache;
      if (c.key === ghostCtxKey(model, pos) && Date.now() - c.ts < 30000) items.push({ insertText: c.text });
    }
    if (!/[.(\[{,]$/.test(line)){
      for (const [re, fn] of GHOST_IDIOMS){
        const m = line.match(re);
        if (m){
          const t = fn(m, { hasMain: model.getValue().includes('def main(') });
          if (t){ items.push({ insertText: t }); break; }
        }
      }
      for (const it of ghostMine(model, pos.lineNumber, line)){
        if (items.length >= 5) break;
        items.push(it);
      }
    }
    return items;
  }

  monaco.languages.registerInlineCompletionsProvider('python', {
    provideInlineCompletions(model, pos){
      GHOST.calls++;
      let items = [];
      try { items = ghostCompute(model, pos); } catch (e) {}
      if (S.prefs.ai.mode === 'ollama'){ try { llmKick(model, pos); } catch (e) {} }
      return { items };
    },
    handleItemDidShow(completions, item){
      GHOST.shown = item || null;
      if (GHOST.ck) GHOST.ck.set(!!item);
    },
    handleItemDidHide(){ GHOST.shown = null; if (GHOST.ck) GHOST.ck.set(false); },
    freeInlineCompletions(){}
  });

  function ghostAccept(){
    const it = GHOST.shown;
    if (!it || !editor) return;
    const model = editor.getModel(), pos = editor.getPosition();
    if (!model || !pos) return;
    const range = it.range || { startLineNumber: pos.lineNumber, startColumn: pos.column, endLineNumber: pos.lineNumber, endColumn: pos.column };
    const ls = String(it.insertText).split('\n');
    const endLn = range.startLineNumber + ls.length - 1;
    const endCol = ls.length === 1 ? range.startColumn + ls[0].length : ls[ls.length - 1].length + 1;
    editor.executeEdits('noir-ghost', [{ range, text: it.insertText }], [new monaco.Selection(endLn, endCol, endLn, endCol)]);
    GHOST.shown = null;
    if (GHOST.ck) GHOST.ck.set(false);
  }

  window.__noirGhost = { compute: ghostCompute, accept: ghostAccept };

  monaco.languages.registerSignatureHelpProvider('python', {
    triggerCharacters: ['(', ','],
    provideSignatureHelp(model, position){
      if (!S.pyReady) return null;
      const call = findCall(model, position);
      if (!call) return null;
      const d = py('signature_help', call.expr);
      if (!d) return null;
      const params = (d.params || []).map(p => ({ label: [p[0], p[1]] }));
      return {
        dispose(){},
        value: {
          activeSignature: 0,
          activeParameter: Math.min(call.arg, Math.max(0, params.length - 1)),
          signatures: [{
            label: d.label,
            documentation: d.doc ? { value: '```\n' + d.doc + '\n```' } : undefined,
            parameters: params
          }]
        }
      };
    }
  });

  monaco.languages.registerHoverProvider('python', {
    provideHover(model, position){
      if (!S.pyReady) return null;
      const w = model.getWordAtPosition(position);
      if (!w) return null;
      const chain = chainAt(model.getLineContent(position.lineNumber), position.column);
      if (!chain || /^[\d.]+$/.test(chain)) return null;
      const d = py('hover', chain);
      if (!d) return null;
      const contents = [{ language: 'python', value: d.label }];
      if (d.doc) contents.push({ value: '```\n' + d.doc + '\n```' });
      return {
        range: new monaco.Range(position.lineNumber, w.startColumn, position.lineNumber, w.endColumn),
        contents: contents
      };
    }
  });

  monaco.languages.registerDocumentSymbolProvider('python', {
    provideDocumentSymbols(model){
      if (!S.pyReady) return [];
      const tree = py('outline', model.getValue()) || [];
      const K = monaco.languages.SymbolKind;
      const map = { class: K.Class, function: K.Function, method: K.Method };
      const conv = n => ({
        name: n.n, detail: '', kind: map[n.k] || K.Function, tags: [],
        range: new monaco.Range(n.r[0], n.r[1], n.r[2], n.r[3]),
        selectionRange: new monaco.Range(n.s[0], n.s[1], n.s[2], n.s[3]),
        children: (n.c || []).map(conv)
      });
      return tree.map(conv);
    }
  });

  monaco.languages.registerDefinitionProvider('python', {
    provideDefinition(model, position){
      const w = model.getWordAtPosition(position);
      if (!w || !/^[A-Za-z_]\w*$/.test(w.word)) return null;
      const name = w.word;
      const defRe = '^[ \\t]*(?:async[ \\t]+def|def|class)[ \\t]+' + escapeRe(name) + '\\b';
      const asgRe = '^' + escapeRe(name) + '[ \\t]*=(?!=)';
      const files = [...S.files].sort((a, b) => (b.id === S.activeId) - (a.id === S.activeId));
      for (const pass of [defRe, asgRe]){
        for (const f of files){
          let ms = [];
          try { ms = f.model.findMatches(pass, false, true, true, null, false, 1); } catch (e) {}
          if (ms.length){
            const m = ms[0];
            return { uri: f.model.uri, range: new monaco.Range(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn) };
          }
        }
      }
      return null;
    }
  });

  monaco.languages.registerReferenceProvider('python', {
    provideReferences(model, position){
      const w = model.getWordAtPosition(position);
      if (!w) return null;
      const out = [];
      for (const f of S.files){
        let ms = [];
        try { ms = f.model.findMatches(w.word, false, false, true, null, false, 400); } catch (e) {}
        for (const m of ms) out.push({ uri: f.model.uri, range: new monaco.Range(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn) });
      }
      return out.length ? out : null;
    }
  });
});

async function initPyodide(){
  try {
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
    pyodide.runPython("import os, warnings; os.environ['MPLBACKEND'] = 'AGG'; warnings.filterwarnings('ignore', message='.*non-interactive.*')");
    pyodide.setStdout({ write: buf => { writeText(decoder.decode(buf, { stream: true }), 'out'); return buf.length; } });
    pyodide.setStderr({ write: buf => { writeText(decoder.decode(buf, { stream: true }), 'err'); return buf.length; } });
    await loadBlob();
    await pyodide.runPythonAsync(PYBLOB.intel);
    await pyodide.runPythonAsync(PYBLOB.repl);
    if (PYBLOB.tools) await pyodide.runPythonAsync(PYBLOB.tools);
    runFn = pyodide.globals.get('_py_run');
    replFn = pyodide.globals.get('_py_repl');
    S.pyReady = true;
    pyVersion = pyodide.runPython("import sys; '%d.%d.%d' % sys.version_info[:3]");
    pyStatusText = 'Ready';
    st('Ready', false);
    stPy.hidden = false;
    stPy.textContent = 'Python ' + pyVersion;
    appendLine('Python ' + pyVersion + ' · Pyodide ' + PYODIDE_VERSION, 'dim');
    updateRunUI();
    if (S.monacoReady){
      for (const f of S.files) lintModel(f.model);
      if (S.view === 'vars') refreshVars();
    }
  } catch (e) {
    pyStatusText = 'Failed To Load Runtime — Check Connection';
    stLeft.classList.add('error');
    st(pyStatusText, false);
    openConsole();
    appendLine(String(e && e.message || e), 'err');
  }
}

loadPrefs();
applyTheme(S.prefs.theme, false);
if (!S.prefs.ai || !S.prefs.ai.mode) S.prefs.ai = { mode: 'local', url: 'http://localhost:11434', model: 'qwen2.5-coder:1.5b' };
refreshAIChip();
app.classList.toggle('no-sidebar', !S.prefs.sidebar);
app.classList.toggle('no-console', !S.prefs.console);
setConH(S.prefs.conH);
if (Array.isArray(S.prefs.hist)) HIST.arr = S.prefs.hist;
HIST.ix = HIST.arr.length;
applyFont();
if (window.innerWidth < 860){
  S.prefs.sidebar = false;
  app.classList.add('no-sidebar');
}
st('Loading Runtime…', true);
initPyodide();

window.noir = {
  run: run,
  runCode: runCode,
  runSelection: runSelection,
  py: py,
  setCode: v => { const f = activeFile(); if (f && f.model) f.model.setValue(v); },
  setFont: setFont,
  downloadFile: downloadFile,
  toggleMinimap: toggleMinimap,
  toggleWrap: toggleWrap,
  share: buildShareLink,
  install: installPackage,
  copyOutput: copyOutput,
  importHash: importHash,
  repl: v => { replField.value = v; return replSubmit(); },
  view: v => setView(v, { force: true }),
  aiMode: (m) => { if (m){ S.prefs.ai.mode = m; savePrefs(); refreshAIChip(); } return S.prefs.ai; },
  aiModal: () => { openAIModal(); return !aiModal.hidden; },
  ghostItems: () => {
    const g = window.__noirGhost, model = editor && editor.getModel();
    if (!g || !model) return [];
    const pos = editor.getPosition();
    try { return g.compute(model, pos).map(i => i.insertText); } catch (e) { return ['ERR:' + (e && e.message)]; }
  },
  ghostShown: () => GHOST.shown ? GHOST.shown.insertText : null,
  ghostCalls: () => GHOST.calls,
  ghostAccept: () => { const g = window.__noirGhost; if (g) g.accept(); },
  ghostActions: () => editor ? editor.getSupportedActions().map(a => a.id).filter(id => /inline/i.test(id)) : [],
  profile: profileFile,
  lintFile: () => { const f = activeFile(); return f ? lintModel(f.model, true) : null; },
  markers: () => activeFile() ? monaco.editor.getModelMarkers({ owner: LINT_OWNER, resource: activeFile().model.uri }).map(m => m.message) : [],
  probChip: () => ({ hidden: stProb.hidden, e: spErr.textContent, w: spWarn.textContent }),
  snapCount: () => { const f = activeFile(); return f ? (SNAP[f.id] || []).length : 0; },
  openDiffFirst: () => { const f = activeFile(); const a = f && SNAP[f.id]; if (a && a.length){ openDiff(f, a[a.length - 1]); return true; } return false; },
  diffOpen: () => !diffWrap.hidden,
  closeDiff: closeDiff,
  restoreDiff: restoreDiff,
  searchFor: q => { setView('search', { force: true }); srQ.value = q; runSearch(); },
  searchState: () => ({ total: SR.total, files: SR.files, rows: srResults.querySelectorAll('.sr-m').length }),
  replaceAll: () => replaceIn(null),
  setReplace: v => { srR.value = v; },
  varsList: () => Array.from(vvList.querySelectorAll('.vv-row .vv-n')).map(e => e.textContent),
  ctxShow: ctxShow,
  plotCount: () => PLOTS.length,
  plots: () => PLOTS.map(p => ({ n: p.n, kb: Math.round(p.png.length * 3 / 4 / 1024) })),
  plotOpen: () => !plotWrap.hidden,
  openPlot: openPlot,
  closePlot: closePlot,
  viewPlots: () => setView('plots', { force: true }),
  format: formatDocument,
  tbLinks: () => Array.from(linesEl.querySelectorAll('.tb-link')).map(e => e.textContent),
  lastTrace: () => S.lastTrace,
  renameAt: renameSymbolAt,
  renameOpen: () => !!renameBox,
  closeRename: closeRenameBox,
  get pyReady(){ return S.pyReady; },
  get editor(){ return editor; }
};

})();
