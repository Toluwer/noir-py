# noir.py

a python editor that lives in a single html file.

open it, write python, hit run. the code executes in your browser through
[pyodide](https://pyodide.org) — actual cpython compiled to webassembly — so
there's no server, no install, and nothing leaves your machine. the editing
side is [monaco](https://microsoft.github.io/monaco-editor/), the engine out
of vs code.

the first run needs internet to fetch the runtime (~10 mb; the browser caches
it after that). everything else is just the file.

## getting it

- **`loader.html`** — about 2 kb, keep this one. every time you open it, it
  pulls the latest `python-editor.html` from this repo and swaps itself in.
  when the editor updates, your loader updates. you never download anything
  again.
- **`python-editor.html`** — the whole editor, one file, ~70 kb. grab this if
  you'd rather have the actual thing on disk and never think about this repo
  again.

## what's inside

- python 3.13 running in the page, with a console and a `>>>` repl
- completions, signatures and hover docs — introspected live from the running
  python, not a static word list
- ghost text: inline suggestions from a local pattern-mining engine. free,
  offline, instant. tab accepts, keep typing to dismiss. optional ollama mode
  if you'd rather have a local llm write them
- multi-file: tabs, explorer, search & replace across everything that's open
- variables view, matplotlib plots, per-file save history with diff + restore
- command palette (ctrl+k), linting, black formatting (shift+alt+f)
- pure black, quiet, keyboard-first

## building from source

you need node.

    npm install
    node build.mjs

that squashes `src/` — html, css, js and the python engine — into the single
`python-editor.html`. `src/blob/` is the python side (introspection, repl,
tooling); it gets deflated and embedded into the html at build time.

if you change something: build, commit the fresh `python-editor.html` along
with the source, push. everyone on the loader picks it up next open.
