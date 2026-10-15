"""Parse review artifacts and check execution barriers; never connects to a DB.

Use a separately installed pglast via --parser-path if needed. No dependencies
are added to the application, and parsing is not database acceptance evidence.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--parser-path', type=Path)
options = args.parse_args()
if options.parser_path:
    sys.path.insert(0, str(options.parser_path))
import pglast
from pglast import ast
from pglast.stream import RawStream

root = Path(__file__).resolve().parent
files = ['00-preflight.sql', '10-schema.proposal.sql', '20-protocol.proposal.sql', '30-cutover.proposal.sql']
report = {'parser': pglast.__version__, 'parser_postgresql_version': pglast.get_postgresql_version(),
          'database_connections': 0, 'sql_statements': 0, 'plpgsql_functions': 0,
          'sql_function_bodies': 0, 'execution_guards': 0, 'public_functions': [], 'files': []}
for filename in files:
    path = root / filename
    source = path.read_text()
    statements = pglast.parse_sql(source)
    assert isinstance(statements[0].stmt, ast.TransactionStmt)
    assert statements[0].stmt.kind.name == 'TRANS_STMT_BEGIN'
    assert isinstance(statements[-1].stmt, ast.TransactionStmt)
    assert statements[-1].stmt.kind.name == 'TRANS_STMT_ROLLBACK'
    if filename == '00-preflight.sql':
        assert 'READ ONLY' in RawStream()(statements[0].stmt)
        assert all(isinstance(s.stmt, (ast.TransactionStmt, ast.SelectStmt)) for s in statements)
    else:
        assert isinstance(statements[1].stmt, ast.DoStmt)
        guard = pglast.parse_plpgsql(RawStream()(statements[1].stmt))
        first = guard[0]['PLpgSQL_function']['action']['PLpgSQL_stmt_block']['body'][0]
        assert first['PLpgSQL_stmt_raise']['elog_level'] == 21  # unconditional ERROR
        report['execution_guards'] += 1
    for raw in statements:
        node = raw.stmt
        if not isinstance(node, ast.CreateFunctionStmt):
            continue
        config = {o.defname: o.arg for o in node.options if o.defname != 'set'}
        settings = [o.arg for o in node.options if o.defname == 'set']
        assert any(s.name == 'search_path' and s.args[0].val.sval == '' for s in settings)
        language = config['language'].sval
        if language == 'plpgsql':
            pglast.parse_plpgsql(RawStream()(node))
            report['plpgsql_functions'] += 1
        elif language == 'sql':
            pglast.parse_sql(config['as'][0].sval)
            report['sql_function_bodies'] += 1
        else:
            raise AssertionError('Unexpected function language')
        name = '.'.join(n.sval for n in node.funcname)
        if name.startswith('public.'):
            assert config['security'].boolval is True
            report['public_functions'].append(name)
    report['sql_statements'] += len(statements)
    report['files'].append({'path': filename, 'statements': len(statements),
                            'sha256': hashlib.sha256(source.encode()).hexdigest()})
print(json.dumps(report, indent=2))
