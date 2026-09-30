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

