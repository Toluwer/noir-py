async def _py_repl(source):
    global _LAST_ERR
    try:
        code = compile(source, "<repl>", "eval")
    except SyntaxError:
        code = None
    if code is not None:
        try:
            result = eval(code, _USER_NS)
        except BaseException as e:
            try:
                _stash_err(e)
            except NameError:
                pass
            raise
        if result is not None:
            print(repr(result))
        _LAST_ERR = None
        return None
    # parse with ONLY_AST + ALLOW_TOP_LEVEL_AWAIT so user-typed `await` works at the REPL
    tree = compile(source, "<repl>", "exec", ast.PyCF_ONLY_AST | ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
    tree = _RewriteInput().visit(tree)
    ast.fix_missing_locations(tree)
    code = compile(tree, "<repl>", "exec", ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
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
