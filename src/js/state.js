'use strict';

const MONACO_BASE = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.29.5/full/';
const MONO_FONT = "ui-monospace,'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const PYODIDE_VERSION = '0.29.5';
const APP_VERSION = '18.0';
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
      conZone = $('panel-zone'), grip = $('console-grip'), editorPane = $('editor-pane'),
      pal = $('palette'), palField = $('pal-field'), palList = $('pal-list'),
      toastsEl = $('toasts'),
      btnOpen = null, btnDownload = null, filePick = $('file-pick'),
      replRow = $('repl-row'), replField = $('repl-field'), stFont = $('st-font'),
      sbTitle = $('sb-title'), viewSearch = $('view-search'), viewHist = $('view-hist'), viewPlots = $('view-plots'),
      srQ = $('sr-q'), srR = $('sr-r'), srCase = $('sr-case'), srRex = $('sr-rex'), srAllBtn = $('sr-all'), srResults = $('sr-results'),
      vvList = $('vv-list'), vvCount = $('vv-count'), hvList = $('hv-list'), hvName = $('hv-name'), pvList = $('pv-list'),
      plotWrap = $('plotwrap'), pwImg = $('pw-img'), pwLabel = $('pw-label'), pwBody = $('pw-body'), pwPrev = $('pw-prev'), pwNext = $('pw-next'), pwSize = $('pw-size'),
      stProb = $('st-prob'), spErr = $('sp-n-err'), spWarn = $('sp-n-warn'),
      diffWrap = $('diffwrap'), diffHost = $('diff-host'), dwLabel = $('dw-label'),
      railGhost = $('rail-ghost'), railTheme = $('rail-theme'), cmdCenter = $('cmd-center'),
      crumbsBar = $('crumbsbar'), crumbsEl = $('crumbs'), pbList = $('pb-list'), viewProblems = $('view-problems'),
      viewVars = $('view-vars'), pnBadge = $('pn-badge'), btnRunsel = $('btn-runsel'), btnEdmenu = $('btn-edmenu'),
      aiModal = $('ai-modal'), aiUrl = $('ai-url'), aiModel = $('ai-model'), aiStatus = $('ai-status'),
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
  sun: SV('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
  ellipses: SV('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
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
  panelTab: 'console',
  prefs: { sidebar: true, console: true, panelTab: 'console', conH: 240, fontSize: 13.5, minimap: false, wordWrap: false, hist: [], theme: 'paper',
           ai: { mode: 'local', url: 'http://localhost:11434', model: 'qwen2.5-coder:1.5b' } },
  openLine: null,
  lastHeadTime: null,
  inputField: null,
  lastTrace: null
};

let pyodide = null, runFn = null, replFn = null, editor = null, pyVersion = '', pyStatusText = 'Loading Runtime…', stTimer = 0;
const HIST = { arr: [], ix: 0 }, FONT_DEFAULT = 13.5;

