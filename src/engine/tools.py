import ast, json, time, builtins as _builtins

_LAST_ERR = None
_USER_FILES = ('main.py', '<repl>', '<string>', '<exec>')

def _safe_repr(v, limit=100):
    try:
        r = repr(v)
    except BaseException:
        return '<unrepresentable>'
    return r if len(r) <= limit else r[:limit].rsplit(' ', 1)[0] + ' …'

def _stash_err(e):
    """capture the deepest user-code frame of an exception for the variables panel"""
    global _LAST_ERR
    info = {'type': type(e).__name__, 'msg': str(e)[:300]}
    cur = globals().get('_CUR_FILE') or 'main.py'
    tb = e.__traceback__
    user_tb = None
    while tb is not None:
        fn = tb.tb_frame.f_code.co_filename
        if fn == cur or (fn.endswith('.py') and not fn.startswith(('/', '<')) and fn not in _USER_FILES):
            user_tb = tb
        tb = tb.tb_next
    if user_tb is not None:
        loc = {}
        try:
            items = list(user_tb.tb_frame.f_locals.items())
        except BaseException:
            items = []
        for k, v in items[:60]:
            if k.startswith('_'):
                continue
            loc[k] = _safe_repr(v, 120)
        info['line'] = user_tb.tb_lineno
        info['locals'] = dict(sorted(loc.items()))
    _LAST_ERR = info

def _vars():
    out = []
    try:
        items = list(_USER_NS.items())
    except BaseException:
        items = []
    for k, v in items:
        if k.startswith('_'):
            continue
        try:
            t = type(v).__name__
        except BaseException:
            t = '?'
        if t == 'module':
            out.append({'n': k, 't': 'module', 'v': getattr(v, '__name__', k), 'l': None})
        else:
            try:
                ln = len(v) if hasattr(v, '__len__') else None
            except BaseException:
                ln = None
            out.append({'n': k, 't': t, 'v': _safe_repr(v, 100), 'l': ln})
    out.sort(key=lambda e: e['n'].lower())
    return json.dumps({'v': out[:300], 'e': _LAST_ERR})

def _clear_err():
    global _LAST_ERR
    _LAST_ERR = None

def _outline(src):
    try:
        tree = ast.parse(src)
    except BaseException:
        return '[]'
    def sym(node, kind):
        r = node.lineno
        c = node.col_offset + 1
        el = getattr(node, 'end_lineno', None) or r
        ec = getattr(node, 'end_col_offset', None)
        d = {
            'n': node.name, 'k': kind,
            'r': [r, c, el, (ec + 1) if ec else c + len(node.name)],
            's': [r, c, r, c + len(node.name)],
            'c': []
        }
        for ch in node.body:
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
                d['c'].append(sym(ch, 'method' if kind == 'class' else 'function'))
            elif isinstance(ch, ast.ClassDef):
                d['c'].append(sym(ch, 'class'))
        return d
    out = []
    for ch in tree.body:
        if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
            out.append(sym(ch, 'function'))
        elif isinstance(ch, ast.ClassDef):
            out.append(sym(ch, 'class'))
    return json.dumps(out)

def _outline_flat(src):
    """flat symbol list for the palette: [{n, k, l (line), p (path)}]"""
    try:
        tree = ast.parse(src)
    except BaseException:
        return '[]'
    out = []
    def walk(body, path):
        for ch in body:
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
                k = 'method' if path else 'function'
                out.append({'n': ch.name, 'k': k, 'l': ch.lineno, 'p': '.'.join(path + [ch.name])})
                walk(ch.body, path + [ch.name])
            elif isinstance(ch, ast.ClassDef):
                out.append({'n': ch.name, 'k': 'class', 'l': ch.lineno, 'p': '.'.join(path + [ch.name])})
                walk(ch.body, path + [ch.name])
    walk(tree.body, [])
    return json.dumps(out)

# ---------- linter ----------

_SHADOW_OK = {
    'id', 'type', 'input', 'all', 'any', 'max', 'min', 'sum', 'next', 'list', 'dict', 'set',
    'str', 'int', 'float', 'bytes', 'bool', 'tuple', 'object', 'format', 'filter', 'map',
    'range', 'print', 'open', 'hash', 'property', 'copyright', 'credits', 'license',
    'help', 'vars', 'dir', 'name', 'file', 'exit', 'quit'
}
_BUILTIN_NAMES = set(dir(_builtins))

class _Scope:
    __slots__ = ('names', 'parent')
    def __init__(self, parent):
        self.names = set()
        self.parent = parent
    def has(self, n):
        s = self
        while s is not None:
            if n in s.names:
                return True
            s = s.parent
        return False

def _bind(t, scope):
    if isinstance(t, ast.Name):
        scope.names.add(t.id)
    elif isinstance(t, (ast.Tuple, ast.List)):
        for e in t.elts:
            _bind(e, scope)
    elif isinstance(t, ast.Starred):
        _bind(t.value, scope)

def _match_captures(p, scope):
    if p is None:
        return
    if isinstance(p, ast.MatchAs):
        if p.name:
            scope.names.add(p.name)
        _match_captures(p.pattern, scope)
    elif isinstance(p, ast.MatchStar):
        if p.name:
            scope.names.add(p.name)
    elif isinstance(p, ast.MatchMapping):
        if p.rest:
            scope.names.add(p.rest)
        for v in p.patterns:
            _match_captures(v, scope)
    elif isinstance(p, ast.MatchClass):
        for sp in p.patterns:
            _match_captures(sp, scope)
        for kp in p.kwd_patterns:
            _match_captures(kp, scope)
    elif isinstance(p, (ast.MatchOr, ast.MatchSequence)):
        for sp in p.patterns:
            _match_captures(sp, scope)

def _defaults_mutable(node):
    bad = []
    for d in node.args.defaults + [d for d in node.args.kw_defaults if d is not None]:
        if isinstance(d, (ast.List, ast.Dict, ast.Set, ast.ListComp, ast.DictComp, ast.SetComp)):
            bad.append(d)
        elif isinstance(d, ast.Call):
            f = d.func
            ok = isinstance(f, ast.Name) and f.id in ('tuple', 'frozenset')
            if not ok:
                bad.append(d)
    return bad

def _lint(src):
    try:
        tree = ast.parse(src)
    except BaseException as e:
        line = getattr(e, 'lineno', None) or 1
        col = getattr(e, 'offset', None) or 1
        msg = getattr(e, 'msg', None) or str(e) or 'invalid syntax'
        return json.dumps([{'s': 'error', 'l': line, 'c': col, 'e': col + 1, 'm': 'Syntax Error — ' + msg}])
    diags = []
    star_import = False
    string_words = set()
    imports = {}          # name -> [line, col]
    mod_scope = _Scope(None)
    all_names = set()
    shadow_seen = set()

    # strings + __all__ (module body only, pre-pass)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == '__all__':
                    try:
                        for e in ast.literal_eval(node.value):
                            all_names.add(str(e))
                    except BaseException:
                        pass

    def strings_of(node):
        for n in ast.walk(node):
            if isinstance(n, ast.Constant) and isinstance(n.value, str):
                string_words.update(n.value.split())

    def bind_stmt(node, scope):
        """collect bindings created by a statement (without descending into new scopes)"""
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            scope.names.add(node.name)
        elif isinstance(node, ast.ClassDef):
            scope.names.add(node.name)
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            nonlocal star_import
            for a in node.names:
                if a.name == '*':
                    star_import = True
                    continue
                bound = a.asname or a.name.split('.')[0]
                scope.names.add(bound)
                if scope is mod_scope:
                    imports.setdefault(bound, [node.lineno, node.col_offset + 1])
        elif isinstance(node, ast.Assign):
            for t in node.targets:
                _bind(t, scope)
        elif isinstance(node, ast.AnnAssign):
            if node.target:
                _bind(node.target, scope)
        elif isinstance(node, ast.AugAssign):
            if node.target:
                _bind(node.target, scope)  # permissive: aug-assign requires prior binding
        elif isinstance(node, (ast.For, ast.AsyncFor)):
            _bind(node.target, scope)
        elif isinstance(node, ast.With):
            for item in node.items:
                if item.optional_vars:
                    _bind(item.optional_vars, scope)
        elif isinstance(node, ast.ExceptHandler):
            if node.name:
                scope.names.add(node.name)
        elif isinstance(node, (ast.Global, ast.Nonlocal)):
            for n in node.names:
                scope.names.add(n)
        elif isinstance(node, ast.Match):
            for case in node.cases:
                _match_captures(case.pattern, scope)
        elif isinstance(node, ast.NamedExpr):
            _bind(node.target, scope)

    def walk_match_pat(p, scope):
        """walk exprs inside match patterns (MatchValue holds arbitrary loads)"""
        if p is None:
            return
        if isinstance(p, ast.MatchValue):
            walk_expr(p.value, scope)
        elif isinstance(p, (ast.MatchSequence, ast.MatchOr)):
            for sp in p.patterns:
                walk_match_pat(sp, scope)
        elif isinstance(p, ast.MatchAs):
            walk_match_pat(p.pattern, scope)
        elif isinstance(p, ast.MatchClass):
            walk_match_pat(p.cls, scope) if isinstance(p.cls, ast.expr) else None
            for sp in p.patterns:
                walk_match_pat(sp, scope)
            for kp in p.kwd_patterns:
                walk_match_pat(kp, scope)

    def walk_body(body, scope):
        for node in body:
            walk_node(node, scope)

    def walk_node(node, scope):
        if isinstance(node, ast.stmt):
            bind_stmt(node, scope)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for bad in _defaults_mutable(node):
                    diags.append({'s': 'warn', 'l': bad.lineno, 'c': bad.col_offset + 1,
                                  'e': bad.col_offset + 2, 'm': "Mutable Default Argument — Use None And Create Inside The Function"})
                fscope = _Scope(scope)
                a = node.args
                for arg in a.posonlyargs + a.args + a.kwonlyargs:
                    fscope.names.add(arg.arg)
                    if arg.annotation:
                        walk_expr(arg.annotation, scope)
                if a.vararg:
                    fscope.names.add(a.vararg.arg)
                    if a.vararg.annotation:
                        walk_expr(a.vararg.annotation, scope)
                if a.kwarg:
                    fscope.names.add(a.kwarg.arg)
                    if a.kwarg.annotation:
                        walk_expr(a.kwarg.annotation, scope)
                for d in node.decorator_list:
                    walk_expr(d, scope)
                for d in node.args.defaults + [d for d in node.args.kw_defaults if d is not None]:
                    walk_expr(d, scope)
                if node.returns:
                    walk_expr(node.returns, scope)
                walk_body(node.body, fscope)
            elif isinstance(node, ast.ClassDef):
                for d in node.decorator_list:
                    walk_expr(d, scope)
                for b in node.bases:
                    walk_expr(b, scope)
                cscope = _Scope(scope)
                walk_body(node.body, cscope)
            elif isinstance(node, ast.Try):
                walk_body(node.body, scope)
                for hnd in node.handlers:
                    if hnd.name:
                        scope.names.add(hnd.name)
                    walk_body(hnd.body, scope)
                walk_body(node.orelse, scope)
                walk_body(node.finalbody, scope)
            elif isinstance(node, (ast.If, ast.While)):
                walk_expr(node.test, scope)
                walk_body(node.body, scope)
                walk_body(node.orelse, scope)
            elif isinstance(node, (ast.For, ast.AsyncFor)):
                walk_expr(node.iter, scope)
                walk_body(node.body, scope)
                walk_body(node.orelse, scope)
            elif isinstance(node, ast.With):
                for item in node.items:
                    walk_expr(item.context_expr, scope)
                walk_body(node.body, scope)
            elif isinstance(node, ast.Match):
                walk_expr(node.subject, scope)
                for case in node.cases:
                    walk_match_pat(case.pattern, scope)
                    if case.guard:
                        walk_expr(case.guard, scope)
                    walk_body(case.body, scope)
            elif isinstance(node, ast.Assign):
                strings_of(node.value)
                walk_expr(node.value, scope)
                for t in node.targets:
                    walk_expr(t, scope)
            elif isinstance(node, ast.AnnAssign):
                if node.value:
                    walk_expr(node.value, scope)
                if node.annotation:
                    walk_expr(node.annotation, scope)
                if node.target:
                    walk_expr(node.target, scope)
            elif isinstance(node, ast.AugAssign):
                walk_expr(node.value, scope)
                walk_expr(node.target, scope)
            elif isinstance(node, ast.Expr):
                strings_of(node.value)
                walk_expr(node.value, scope)
            elif isinstance(node, ast.Return):
                if node.value:
                    walk_expr(node.value, scope)
            elif isinstance(node, (ast.Delete, ast.Raise, ast.Assert)):
                if isinstance(node, ast.Raise):
                    if node.exc:
                        walk_expr(node.exc, scope)
                    if node.cause:
                        walk_expr(node.cause, scope)
                elif isinstance(node, ast.Assert):
                    walk_expr(node.test, scope)
                    if node.msg:
                        walk_expr(node.msg, scope)
                else:
                    for t in node.targets:
                        walk_expr(t, scope)
            elif isinstance(node, ast.Import):
                pass
            elif isinstance(node, ast.ImportFrom):
                pass
            else:
                for ch in ast.iter_child_nodes(node):
                    if isinstance(ch, ast.expr):
                        walk_expr(ch, scope)
                    elif isinstance(ch, ast.stmt):
                        walk_node(ch, scope)
        elif isinstance(node, ast.expr):
            walk_expr(node, scope)

    def walk_expr(e, scope):
        if e is None:
            return
        if isinstance(e, ast.Name):
            if isinstance(e.ctx, ast.Load):
                if (not star_import and not scope.has(e.id) and e.id not in _BUILTIN_NAMES
                        and e.id not in ('self', 'cls', '__class__', '__file__', '__doc__',
                                         '__spec__', '__package__', '__loader__', '__path__')):
                    diags.append({'s': 'error', 'l': e.lineno, 'c': e.col_offset + 1,
                                  'e': e.col_offset + 1 + len(e.id), 'm': "Undefined Name '" + e.id + "'"})
            elif isinstance(e.ctx, (ast.Store, ast.Del)):
                if isinstance(e.ctx, ast.Store):
                    _bind(e, scope)
                    if (e.id in _BUILTIN_NAMES and e.id not in _SHADOW_OK and e.id not in shadow_seen
                            and not e.id.startswith('__')):
                        shadow_seen.add(e.id)
                        diags.append({'s': 'info', 'l': e.lineno, 'c': e.col_offset + 1,
                                      'e': e.col_offset + 1 + len(e.id), 'm': "Shadows Builtin '" + e.id + "'"})
        elif isinstance(e, ast.Lambda):
            lscope = _Scope(scope)
            a = e.args
            for arg in a.posonlyargs + a.args + a.kwonlyargs:
                lscope.names.add(arg.arg)
            if a.vararg:
                lscope.names.add(a.vararg.arg)
            if a.kwarg:
                lscope.names.add(a.kwarg.arg)
            for d in a.defaults + [d for d in a.kw_defaults if d is not None]:
                walk_expr(d, scope)
            walk_expr(e.body, lscope)
        elif isinstance(e, (ast.ListComp, ast.SetComp, ast.GeneratorExp)):
            cscope = _Scope(scope)
            for gen in e.generators:
                _bind(gen.target, cscope)
                walk_expr(gen.iter, scope)
                for cond in gen.ifs:
                    walk_expr(cond, cscope)
            walk_expr(e.elt, cscope)
        elif isinstance(e, ast.DictComp):
            cscope = _Scope(scope)
            for gen in e.generators:
                _bind(gen.target, cscope)
                walk_expr(gen.iter, scope)
                for cond in gen.ifs:
                    walk_expr(cond, cscope)
            walk_expr(e.key, cscope)
            walk_expr(e.value, cscope)
        elif isinstance(e, ast.Compare):
            walk_expr(e.left, scope)
            for op, comp in zip(e.ops, e.comparators):
                if isinstance(op, (ast.Eq, ast.NotEq)) and isinstance(comp, ast.Constant) and comp.value is None:
                    what = "Use 'is None'" if isinstance(op, ast.Eq) else "Use 'is not None'"
                    diags.append({'s': 'warn', 'l': e.lineno, 'c': e.left.col_offset + 1,
                                  'e': (comp.end_col_offset or 0) + 1, 'm': 'Comparison To None — ' + what})
                walk_expr(comp, scope)
        elif isinstance(e, ast.NamedExpr):
            walk_expr(e.value, scope)
            _bind(e.target, scope)
        elif isinstance(e, ast.ExceptHandler):
            pass
        elif isinstance(e, ast.Starred):
            walk_expr(e.value, scope)
        else:
            for ch in ast.iter_child_nodes(e):
                walk_expr(ch, scope)

    # 1) module-level pre-binding (permissive: everything at module level incl. nested blocks)
    def prebind(body, scope):
        for node in body:
            bind_stmt(node, scope)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                for d in getattr(node, 'decorator_list', []):
                    strings_of(d)
                strings_of(node)
            elif isinstance(node, ast.Try):
                prebind(node.body, scope)
                for hnd in node.handlers:
                    prebind(hnd.body, scope)
                prebind(node.orelse, scope)
                prebind(node.finalbody, scope)
            elif isinstance(node, (ast.If, ast.For, ast.AsyncFor, ast.While)):
                for attr in ('body', 'orelse'):
                    prebind(getattr(node, attr), scope)
            elif isinstance(node, ast.With):
                prebind(node.body, scope)
            elif isinstance(node, ast.Match):
                for case in node.cases:
                    prebind(case.body, scope)
    prebind(tree.body, mod_scope)

    # 2) full walk with scopes
    walk_body(tree.body, _Scope(mod_scope))  # module loads check against mod_scope

    # 3) module-level string words (usage evidence for unused-import check)
    for node in ast.walk(tree):
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            string_words.update(node.value.split())
        if isinstance(node, ast.JoinedStr):
            pass

    # 4) bare except
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and node.type is None:
            diags.append({'s': 'warn', 'l': node.lineno, 'c': node.col_offset + 2,
                          'e': node.col_offset + 8, 'm': "Bare Except Catches Everything — Catch 'Exception' Instead"})

    # 5) unused imports
    if not star_import:
        used = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                used.add(node.id)
        used |= all_names
        for name, (line, col) in imports.items():
            if name not in used and name not in string_words:
                diags.append({'s': 'warn', 'l': line, 'c': col, 'e': col + len(name),
                              'm': "Import '" + name + "' Is Unused"})

    # dedupe + sort + cap
    seen = set()
    out = []
    for d in sorted(diags, key=lambda d: (d['l'], d['c'])):
        key = (d['l'], d['c'], d['m'])
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return json.dumps(out[:200])

def _fmt_exc(e):
    import traceback
    return ''.join(traceback.format_exception(type(e), e, e.__traceback__))

def _plots():
    """capture every open matplotlib figure as a base64 PNG (Plots panel)"""
    import sys
    plt = sys.modules.get('matplotlib.pyplot')
    if plt is None:
        return json.dumps({'figs': []})
    try:
        nums = list(plt.get_fignums())
    except BaseException:
        return json.dumps({'figs': []})
    figs = []
    import io, base64
    for num in nums[:12]:
        try:
            fig = plt.figure(num)
            buf = io.BytesIO()
            fig.savefig(buf, format='png', dpi=110)
            figs.append({'n': num, 'png': base64.b64encode(buf.getvalue()).decode()})
        except BaseException:
            pass
    return json.dumps({'figs': figs})

def _format(src):
    """format with black (installed on demand); returns {code} / {err} / {need}"""
    try:
        import black
    except BaseException:
        return json.dumps({'need': True})
    try:
        out = black.format_file_contents(src, fast=True, mode=black.Mode())
        return json.dumps({'code': out})
    except BaseException as e:
        if type(e).__name__ == 'InvalidInput':
            return json.dumps({'err': 'Cannot Format — Fix Syntax Errors First'})
        return json.dumps({'err': _fmt_exc(e)})

class _NoInput(ast.NodeTransformer):
    """profiler runs synchronously — rewrite input() to the informative error"""
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == 'input':
            return ast.Call(func=ast.Name(id='_input_unsupported', ctx=ast.Load()), args=[], keywords=[])
        return node

def _profile(src, fname='main.py'):
    import cProfile, pstats, io
    try:
        tree = ast.parse(src)
    except BaseException as e:
        return json.dumps({'text': '', 'err': _fmt_exc(e)})
    tree = _NoInput().visit(tree)
    ast.fix_missing_locations(tree)
    try:
        code = compile(tree, str(fname), 'exec')
    except BaseException as e:
        return json.dumps({'text': '', 'err': _fmt_exc(e)})
    pr = cProfile.Profile()
    err = None
    try:
        pr.enable()
        exec(code, _USER_NS)
    except BaseException as e:
        try:
            _stash_err(e)
        except BaseException:
            pass
        err = _fmt_exc(e)
    else:
        _clear_err()
    finally:
        pr.disable()
    buf = io.StringIO()
    try:
        pstats.Stats(pr, stream=buf).sort_stats('cumulative').print_stats(16)
    except BaseException:
        pass
    return json.dumps({'text': buf.getvalue(), 'err': err})
