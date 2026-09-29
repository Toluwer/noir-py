# noir.py

a python editor that runs in a single html file. open it, write code, hit run.

execution is local through [pyodide](https://pyodide.org) — cpython compiled to webassembly. no server, no install, nothing leaves the machine. the editor is [monaco](https://microsoft.github.io/monaco-editor/), the engine behind vs code.

the first run needs network to fetch the pyodide runtime (~10 mb); the browser caches it after that. everything else is the file itself.

## files

- `loader.html` — ~2 kb. pulls the latest `python-editor.html` from this repo on each open and swaps itself in. use this for automatic updates.
- `python-editor.html` — ~70 kb. the full editor, standalone. use this if you want a fixed copy that does not depend on the repo.

## features

- python 3.13 in the browser, with a console and `>>>` repl
- completions, signatures, and hover docs introspected live from the running python, not a static word list
- inline ghost-text suggestions from a local pattern-mining engine. tab to accept; keep typing to dismiss. optional ollama mode for local-llm suggestions
- multi-file: tabs, file explorer, search and replace across open files
- variables view, matplotlib plot output, per-file save history with diff and restore
- command palette (ctrl+k), linting, black formatting (shift+alt+f)
- two themes — paper (light) and ink (dark) — switchable from the status bar or palette; remembered across sessions
- system fonts only

## building from source

requires node.

    npm install
    node build.mjs

the build inlines `src/` — html, css, js, and the python engine — into a single `python-editor.html`. `src/blob/` holds the python sources (introspection, repl, tooling); they are deflated and embedded into the html at build time.

commit the regenerated `python-editor.html` alongside source changes, then push. loader users pick up the update on next open.
