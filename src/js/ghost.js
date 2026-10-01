const GHOST = { cool: 0, shown: null, llmCache: null, llmTimer: 0, llmReq: null, ck: null, calls: 0 };
const ghostLineCache = new Map();

function aiModeLabel(){ return { off: 'Off', local: 'Local', ollama: 'Ollama' }[S.prefs.ai.mode] || 'Local'; }
function refreshAIChip(){
  railGhost.classList.toggle('on', S.prefs.ai.mode !== 'off');
  railGhost.title = 'Ghost Text — ' + aiModeLabel() + '. Click To Configure.';
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

railGhost.addEventListener('click', openAIModal);
railTheme.addEventListener('click', toggleTheme);
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

