import sys, json, inspect, builtins, ast, importlib, js

_USER_NS = {"__name__": "__main__"}
_LAST_ERR = None

class _Miss(object):
    pass
_MISS = _Miss()

def _eval(expr):
    try:
        return eval(expr, _USER_NS)
    except BaseException:
        return _MISS

def _resolve(expr):
    """eval first; if that misses, treat the head as an unimported module
    (import it silently, then walk the attr chain) so `math.` completes
    before the user ever writes `import math`."""
    v = _eval(expr)
    if v is not _MISS:
        return v
    parts = expr.split('.')
    if not parts[0].isidentifier():
        return _MISS
    try:
        v = importlib.import_module(parts[0])
        for p in parts[1:]:
            v = getattr(v, p)
    except BaseException:
        return _MISS
    return v

def _doc(obj, limit=400):
    try:
        if inspect.ismodule(obj) or inspect.isclass(obj) or inspect.isroutine(obj) or inspect.ismethod(obj):
            d = inspect.getdoc(obj)
        else:
            d = getattr(obj, '__doc__', None)
            if not isinstance(d, str) or d == type(obj).__doc__:
                d = None
    except BaseException:
        return ''
    if not d:
        return ''
    d = d.strip()
    if len(d) > limit:
        d = d[:limit].rsplit(' ', 1)[0] + ' …'
    return d

def _sig(obj):
    try:
        return inspect.signature(obj)
    except BaseException:
        return None

def _kind(name, obj):
    try:
        if inspect.ismodule(obj):
            return 'module'
        if inspect.isclass(obj):
            return 'class'
        if inspect.ismethod(obj) or inspect.isroutine(obj) or callable(obj):
            return 'function'
        if name and name.isupper():
            return 'constant'
        return 'variable'
    except BaseException:
        return 'variable'

def _short(r):
    return r if len(r) <= 60 else r[:60] + ' …'

def _item(name, obj, light=False):
    k = _kind(name, obj)
    if k == 'module':
        detail = 'module'
    elif k == 'class':
        s = _sig(obj)
        detail = 'class ' + name + (str(s) if s else '')
    elif k == 'function':
        s = _sig(obj)
        detail = 'def ' + name + (str(s) if s else '(…)')
    else:
        detail = type(obj).__name__
    return {'label': name, 'kind': k, 'detail': detail, 'doc': '' if light else _doc(obj)}

def _complete_dot(expr):
    base = _resolve(expr)
    if base is _MISS:
        return '[]'
    try:
        names = dir(base)
    except BaseException:
        return '[]'
    light = len(names) > 250
    items = []
    for n in names:
        try:
            items.append(_item(n, getattr(base, n), light))
        except BaseException:
            pass
    return json.dumps(items)

def _complete_top():
    items = []
    for name, v in list(_USER_NS.items()):
        if name.startswith('_'):
            continue
        items.append(_item(name, v))
    for name in dir(builtins):
        if name.startswith('_'):
            continue
        try:
            items.append(_item(name, getattr(builtins, name)))
        except BaseException:
            pass
    return json.dumps(items)

def _import_names():
    mods = set()
    for m in getattr(sys, 'stdlib_module_names', ()):
        if '.' not in m and not m.startswith('_'):
            mods.add(m)
    for m in list(sys.modules):
        if m and not m.startswith('_'):
            mods.add(m.split('.')[0])
    return json.dumps(sorted(mods))

def _signature_help(expr):
    obj = _resolve(expr)
    if obj is _MISS or not callable(obj):
        return 'null'
    name = getattr(obj, '__name__', None) or (expr.split('.')[-1] if expr else '')
    sig = _sig(obj)
    doc = _doc(obj)
    if sig is None:
        return json.dumps({'label': name + '(…)', 'params': [], 'doc': doc})
    label = name + '('
    parts = []
    params = []
    seen_pos = False
    seen_kw = False
    for p in sig.parameters.values():
        if p.kind == inspect.Parameter.POSITIONAL_ONLY and not seen_pos:
            if parts:
                label += ', '
            label += '/'
            parts.append('/')
            seen_pos = True
        if p.kind == inspect.Parameter.KEYWORD_ONLY and not seen_kw:
            if parts:
                label += ', '
            label += '*'
            parts.append('*')
            seen_kw = True
        if parts:
            label += ', '
        start = len(label)
        r = p.name
        if p.kind == inspect.Parameter.VAR_POSITIONAL:
            r = '*' + r
        elif p.kind == inspect.Parameter.VAR_KEYWORD:
            r = '**' + r
        if p.default is not inspect.Parameter.empty:
            try:
                r += '=' + _short(repr(p.default))
            except BaseException:
                pass
        label += r
        params.append([start, len(label)])
        parts.append(r)
    label += ')'
    return json.dumps({'label': label, 'params': params, 'doc': doc})

def _describe(name, obj):
    k = _kind(name, obj)
    if k == 'module':
        label = 'module ' + name
    elif k == 'class':
        s = _sig(obj)
        label = 'class ' + name + (str(s) if s else '')
    elif k == 'function':
        s = _sig(obj)
        label = 'def ' + name + (str(s) if s else '(…)')
    else:
        label = name + ': ' + type(obj).__name__
        try:
            r = repr(obj)
            if len(r) <= 60:
                label += ' = ' + r
        except BaseException:
            pass
    return {'label': label, 'doc': _doc(obj)}

def _hover(chain):
    chain = (chain or '').strip('.')
    if not chain:
        return 'null'
    parts = chain.split('.')
    obj = _resolve('.'.join(parts))
    if obj is not _MISS:
        return json.dumps(_describe(parts[-1], obj))
    if len(parts) > 1:
        parent = _resolve('.'.join(parts[:-1]))
        if parent is not _MISS:
            try:
                return json.dumps(_describe(parts[-1], getattr(parent, parts[-1])))
            except BaseException:
                return 'null'
    return 'null'

async def _console_input(prompt=""):
    try:
        sys.stdout.flush()
    except BaseException:
        pass
    result = await js._consoleInput(str(prompt))
    return str(result)

builtins.input = _console_input

def _input_unsupported():
    raise RuntimeError(
        "input() only works at the top level of your script or inside async functions"
    )

_USER_NS["_input_unsupported"] = _input_unsupported

class _RewriteInput(ast.NodeTransformer):
    def __init__(self):
        self.sync = 0
    def visit_FunctionDef(self, node):
        self.sync += 1
        self.generic_visit(node)
        self.sync -= 1
        return node
    def visit_AsyncFunctionDef(self, node):
        self.generic_visit(node)
        return node
    def visit_ClassDef(self, node):
        self.sync += 1
        self.generic_visit(node)
        self.sync -= 1
        return node
    def visit_Lambda(self, node):
        self.sync += 1
        self.generic_visit(node)
        self.sync -= 1
        return node
    def visit_Call(self, node):
        self.generic_visit(node)
        if isinstance(node.func, ast.Name) and node.func.id == "input":
            if self.sync == 0:
                return ast.Await(value=node)
            return ast.Call(
                func=ast.Name(id="_input_unsupported", ctx=ast.Load()),
                args=[], keywords=[]
            )
        return node

async def _py_run(source, filename="main.py"):
    global _LAST_ERR, _CUR_FILE
    _CUR_FILE = str(filename)
    tree = ast.parse(source, _CUR_FILE)
    tree = _RewriteInput().visit(tree)
    ast.fix_missing_locations(tree)
    code = compile(tree, _CUR_FILE, "exec", ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    try:
        result = eval(code, _USER_NS)
        if result is not None:
            await result
        _LAST_ERR = None
    except BaseException as e:
        try:
            _stash_err(e)
        except NameError:
            pass
        raise
