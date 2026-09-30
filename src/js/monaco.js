let monacoWorkerUrl = null;
window.MonacoEnvironment = {
  getWorkerUrl: function(){
    if (!monacoWorkerUrl){
      monacoWorkerUrl = URL.createObjectURL(new Blob([
        "self.MonacoEnvironment={baseUrl:'" + MONACO_BASE + "'};" +
        "importScripts('" + MONACO_BASE + "/base/worker/workerMain.js');"
      ], { type: 'text/javascript' }));
    }
    return monacoWorkerUrl;
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
    editor.addCommand(monaco.KeyCode.Tab, ghostAccept, 'noirGhostVisible && !suggestWidgetVisible && !inSnippetMode');
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
          if (!f.model || f.model.isDisposed()) continue;
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
        if (!f.model || f.model.isDisposed()) continue;
        let ms = [];
        try { ms = f.model.findMatches(w.word, false, false, true, null, false, 400); } catch (e) {}
        for (const m of ms) out.push({ uri: f.model.uri, range: new monaco.Range(m.range.startLineNumber, m.range.startColumn, m.range.endLineNumber, m.range.endColumn) });
      }
      return out.length ? out : null;
    }
  });
});

