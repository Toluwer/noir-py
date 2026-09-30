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

