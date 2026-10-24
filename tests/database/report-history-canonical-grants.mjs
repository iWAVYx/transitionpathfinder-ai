// Read-only assertions against the disposable database after ALL canonical migrations.
// Never accept a hosted target or arbitrary connection URL.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
assert.ok([undefined,'localhost','127.0.0.1'].includes(process.env.PGHOST), 'Loopback database required');
assert.equal(process.env.REPORT_HISTORY_CANONICAL_REPLAY, '1', 'Disposable replay opt-in required');
const { Client } = (await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href)).default;
const db = new Client({host:'127.0.0.1',port:Number(process.env.PGPORT || 5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,database:'postgres',statement_timeout:10000});
const allow = JSON.parse(readFileSync('docs/production-readiness/security-definer-execute-allowlist.json','utf8'));
await db.connect();
try {
  await db.query('BEGIN READ ONLY');
  const {rows:routines} = await db.query(`SELECT p.oid::regprocedure::text AS signature,p.prorettype='trigger'::regtype AS trigger_return,p.proconfig,
    EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS public_execute,
    has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`);
  const reviewed = [...new Set([...allow.anonymousExecute,...allow.authenticatedExecute,...allow.clientExecuteForbidden])].sort();
  const normalized = routines.map(r => ({...r,signature:'public.'+r.signature.replace(/^public\./,'').replaceAll('public.admin_role','admin_role').replaceAll('public.app_role','app_role').replace(/,\s*/g,', ')}));
  assert.deepEqual(normalized.map(r=>r.signature).sort(),reviewed,'Exact final SECURITY DEFINER inventory');
  for(const r of normalized) {
    assert.equal(r.public_execute,false,r.signature+' PUBLIC');
    assert.equal(r.anon_execute,allow.anonymousExecute.includes(r.signature),r.signature+' anon');
    assert.equal(r.authenticated_execute,allow.authenticatedExecute.includes(r.signature),r.signature+' authenticated');
    assert.equal(r.service_execute,!allow.serviceRoleExecuteForbidden.includes(r.signature),r.signature+' service');
    if(allow.serviceRoleExecuteForbidden.includes(r.signature)) {
      assert.equal(r.trigger_return,true); assert.deepEqual(r.proconfig,['search_path=pg_catalog']);
    }
  }
  const {rows:[trigger]} = await db.query(`SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid='public.pathway_reports'::regclass AND NOT tgisinternal AND tgname='snapshot_report_content_update' AND tgenabled='O' AND tgfoid='public.snapshot_report_content_update()'::regprocedure AND tgtype=17 AND tgattr::text=(SELECT attnum::text FROM pg_attribute WHERE attrelid='public.pathway_reports'::regclass AND attname='content')`);
  assert.equal(trigger.n,1,'Enabled AFTER UPDATE OF content row trigger');
  for(const role of ['anon','authenticated']) {
    for(const table of ['public.pathway_reports','public.pathway_report_versions']) {
      for(const capability of ['TRIGGER','TRUNCATE']) {
        const {rows:[r]}=await db.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,table,capability]);assert.equal(r.allowed,false,`${role} ${table} ${capability}`);
      }
    }
    const {rows:[r]}=await db.query(`SELECT has_table_privilege($1,'public.pathway_report_versions','INSERT') OR has_table_privilege($1,'public.pathway_report_versions','UPDATE') OR has_table_privilege($1,'public.pathway_report_versions','DELETE') OR has_any_column_privilege($1,'public.pathway_report_versions','INSERT') OR has_any_column_privilege($1,'public.pathway_report_versions','UPDATE') AS allowed`,[role]);assert.equal(r.allowed,false,role+' version writes');
  }
  const {rows:[rpc]}=await db.query(`SELECT NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND has_function_privilege('authenticated',oid,'EXECUTE') AND NOT has_function_privilege('anon',oid,'EXECUTE') AND NOT has_function_privilege('service_role',oid,'EXECUTE') AS allowed FROM pg_proc WHERE oid='public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)'::regprocedure`);
  assert.equal(rpc.allowed,true,'Context-aware RPC remains invoker and authenticated-only');
  for(const role of ['anon','authenticated','service_role']) {
    const {rows:[old]}=await db.query("SELECT has_function_privilege($1,'public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE') AS allowed",[role]);
    assert.equal(old.allowed,false,role+' context-free save execution');
  }
  const {rows:[context]}=await db.query("SELECT pronargdefaults,proargnames FROM pg_proc WHERE oid='public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)'::regprocedure");
  assert.equal(context.pronargdefaults,0,'No omitted context default');
  assert.deepEqual(context.proargnames,['_report_id','_expected_student_id','_expected_content','_next_content','_change_summary']);
  await db.query('ROLLBACK');
  console.log(`Combined canonical replay verified: ${routines.length} exact privileged routines, internal-trigger exception, history grants and atomic RPC.`);
} finally { await db.end(); }
