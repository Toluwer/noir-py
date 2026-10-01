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

the build inlines everything into a single `python-editor.html`:

- `src/shell.html` — page skeleton and boot loader
- `src/style.css` — both themes, paper and ink
- `src/js/` — the app, as 27 focused modules; `build.mjs` concatenates them in `MODULES` order inside one iife, so the layout is pure organization and cannot change behavior
- `src/engine/` — the python side: introspection, repl, tooling, and completion data, deflated and embedded at build time

`src/js/` maps to concerns: `state` (dom handles, icon set, app state), `menu`/`tabs` (menu bar, context menus), `files`/`store`/`share` (file lifecycle, persistence, share links), `console`/`errors`/`run` (execution), `palette`/`keys` (commands and shortcuts), `views`/`crumbs`/`plots`/`search`/`history`/`lint` (sidebar tools, breadcrumbs, problems panel), `bridge`/`ghost`/`monaco`/`boot`/`api` (python bridge, ghost text, editor wiring, startup, the `window.noir` surface).

the build fails if a comment ever appears in a source file, if `src/js/` and the manifest drift apart, or if any embedded payload fails to round-trip.

commit the regenerated `python-editor.html` alongside source changes, then push. loader users pick up the update on next open.
