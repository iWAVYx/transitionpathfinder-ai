// Disposable PostgreSQL-compatible fixture only. No hosted URL or credentials accepted.
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const real = process.env.PATHWAY_HISTORY_POSTGRES === '1';
const proposal = readFileSync('docs/production-readiness/proposals/report-linked-student-save.sql','utf8');
import { linkedStudentMigrationSource as migration, linkedStudentRolloutSql, linkedStudentMigrationVersion } from './report-linked-student-rollout-sql.mjs';
const oldSig='public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)';
const newSig='public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)';
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const id='00000000-0000-4000-8000-000000000010', intake='00000000-0000-4000-8000-000000000020';
const student='00000000-0000-4000-8000-000000000030', moved='00000000-0000-4000-8000-000000000031';
const original={summary:'Fictional original'}, next={summary:'Fictional replacement'};
let db, close, newSession;
const sql=f=>readFileSync('supabase/migrations/'+f,'utf8');
async function as(user=owner, role='authenticated') {
 assert.ok(['authenticated','anon','service_role'].includes(role));
 await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('SET ROLE '+role);
}
async function save(expectedStudent=student,expected=original,replacement=next,report=id,client=db) {
 return client.query('SELECT public.save_pathway_report_content_for_student($1,$2,$3::jsonb,$4::jsonb,$5) AS version',[report,expectedStudent,JSON.stringify(expected),JSON.stringify(replacement),'Fictional save']);
}
async function state(){await db.exec('RESET ROLE');return {report:(await db.query('SELECT student_id,content FROM public.pathway_reports WHERE id=$1',[id])).rows[0],versions:(await db.query('SELECT report_id,version_number,content,created_by FROM public.pathway_report_versions ORDER BY version_number')).rows};}
before(async()=>{
 if(real) {
  if(![undefined,'localhost','127.0.0.1'].includes(process.env.PGHOST))throw new Error('Disposable tests require loopback PGHOST');
  const pgModule=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href); const {Client}=pgModule.default??pgModule;
  const options={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};
  const admin=new Client({...options,database:'postgres'});await admin.connect();
  const name='tf_context_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE ${name}`);const clients=[];
  newSession=async()=>{const c=new Client({...options,database:name});await c.connect();clients.push(c);return {query:(...args)=>c.query(...args),exec:sql=>c.query(sql)};};
  close=async()=>{try{await Promise.all(clients.map(c=>c.end()));}finally{try{await admin.query(`DROP DATABASE ${name}`);}finally{await admin.end();}}};db=await newSession();
 } else {
  const {PGlite}=await import(process.env.PATHWAY_HISTORY_PGLITE_MODULE?pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href:'@electric-sql/pglite');db=new PGlite();close=()=>db.close();
 }
 await db.exec(`DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
 END $$;
 CREATE SCHEMA supabase_migrations;
 CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[],created_by text);
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
 CREATE TYPE public.app_role AS ENUM ('admin');
 CREATE FUNCTION public.can_access_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 CREATE FUNCTION public.can_edit_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
 CREATE TABLE public.email_send_log(id uuid); CREATE TABLE public.suppressed_emails(id uuid);
 ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY; ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;`);
 await db.exec(sql('20260527130223_fdbf4e54-a144-4f99-b374-d0762f795c12.sql'));
 await db.exec('ALTER TABLE public.pathway_reports ADD COLUMN student_id uuid');
 await db.exec(sql('20260605050011_dea7210b-36a2-424b-b150-4e85e892dec9.sql'));
 await db.exec(sql('20260612002440_d58544e0-e353-434a-8cd1-c21f48f8026a.sql'));
 await db.exec(sql('20261012190000_atomic_pathway_report_content.sql'));
 await db.exec(sql('20261023020000_enforce_pathway_report_content_history.sql'));
});
after(async()=>{if(close)await close();});
beforeEach(async()=>{
 await db.exec(`RESET ROLE; TRUNCATE public.pathway_report_versions,public.pathway_reports,public.student_intakes,auth.users CASCADE;
 INSERT INTO auth.users VALUES('${owner}'),('${other}');
 INSERT INTO public.student_intakes(id,user_id,student_first_name) VALUES('${intake}','${owner}','Fictional Student');
 TRUNCATE supabase_migrations.schema_migrations;
 DROP FUNCTION IF EXISTS public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text);
 GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO authenticated;`);
 await db.query("INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by) VALUES('20261023020000','enforce_pathway_report_content_history',$1,'fixture-reviewer')",[[sql('20261023020000_enforce_pathway_report_content_history.sql')]]);
 await db.query("INSERT INTO public.pathway_reports(id,user_id,intake_id,model,student_id,content) VALUES($1,$2,$3,'fictional',$4,$5::jsonb)",[id,owner,intake,student,JSON.stringify(original)]);
});
test('current content-only RPC reproduces a save after the observed student changed',async()=>{
 await db.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,id]);await as();
 await db.query('SELECT public.save_pathway_report_content_atomic($1,$2::jsonb,$3::jsonb,$4)',[id,JSON.stringify(original),JSON.stringify(next),'Baseline']);
 assert.deepEqual((await state()).report,{student_id:moved,content:next});
});
test('matching linked student saves and restores with truthful history',async()=>{
 await db.exec(migration);await as();assert.equal((await save()).rows[0].version,1);
 assert.equal((await save(student,next,original)).rows[0].version,2);
 const s=await state();assert.deepEqual(s.versions.map(v=>v.content),[original,next]);assert.ok(s.versions.every(v=>v.created_by===owner));assert.deepEqual(s.report.content,original);
});
for(const [label,current,observed] of [['relinked',moved,student],['unlinked',null,student],['newly linked',student,null]])test(label+' context rejects without report/history writes',async()=>{
 await db.exec(migration);await db.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[current,id]);await as();
 await assert.rejects(save(observed),{code:'40001'});const s=await state();assert.equal(s.report.student_id,current);assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);
});
test('intentionally unlinked report accepts an explicitly null student',async()=>{
 await db.exec(migration);await db.query('UPDATE public.pathway_reports SET student_id=NULL WHERE id=$1',[id]);await as();assert.equal((await save(null)).rows[0].version,1);
});
test('stale content remains rejected with matching student',async()=>{
 await db.exec(migration);await as();await save();await assert.rejects(save(),{code:'40001'});assert.equal((await state()).versions.length,1);
});
test('old context-free signature is denied after switching grants',async()=>{
 await db.exec(migration);await as();await assert.rejects(db.query('SELECT public.save_pathway_report_content_atomic($1,$2::jsonb,$3::jsonb,$4)',[id,JSON.stringify(original),JSON.stringify(next),'No fallback']),{code:'42501'});assert.equal((await state()).versions.length,0);
});
for(const role of ['anon','service_role'])test(role+' has no new or old RPC execution',async()=>{
 await db.exec(migration);for(const sig of [oldSig,newSig])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,sig])).rows[0].ok,false);
 await as(owner,role);await assert.rejects(save(),{code:'42501'});
});
test('unrelated caller is denied even with report read visibility',async()=>{
 await db.exec(migration);await db.exec('CREATE POLICY fixture_visibility ON public.pathway_reports FOR SELECT TO authenticated USING(true)');
 try{await as(other);assert.equal((await db.query('SELECT id FROM public.pathway_reports')).rows.length,1);await assert.rejects(save(),{code:'42501'});assert.equal((await state()).versions.length,0);}finally{await db.exec('RESET ROLE; DROP POLICY fixture_visibility ON public.pathway_reports');}
});
test('missing identity and nonexistent report both deny without history',async()=>{
 await db.exec(migration);await as('');await assert.rejects(save(),{code:'42501'});await as();await assert.rejects(save(student,original,next,moved),{code:'42501'});assert.equal((await state()).versions.length,0);
});
test('student argument cannot be omitted; no default bypass',async()=>{
 await db.exec(migration);await as();await assert.rejects(db.query('SELECT public.save_pathway_report_content_for_student(_report_id=>$1,_expected_content=>$2::jsonb,_next_content=>$3::jsonb,_change_summary=>$4)',[id,JSON.stringify(original),JSON.stringify(next),'Missing context']),{code:'42883'});
});
test('new RPC remains security invoker with fixed search path',async()=>{
 await db.exec(migration);const {rows:[r]}=await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[newSig]);assert.equal(r.prosecdef,false);assert.deepEqual(r.proconfig,['search_path=pg_catalog']);
});
test('unexpected old grants abort transaction without creating replacement or revoking old owner save',async()=>{
 await db.exec('GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO anon');
 try{await assert.rejects(db.exec(migration),/Unexpected content-save prerequisite/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[oldSig])).rows[0].ok,true);}finally{await db.exec('REVOKE EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) FROM anon');}
});
test('malformed content leaves both report and history unchanged',async()=>{
 await db.exec(migration);await as();for(const [expected,replacement] of [[null,next],[original,null],[[],next],[original,[]]])await assert.rejects(save(student,expected,replacement),{code:'22023'});
 const s=await state();assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);
});
test('snapshot failure rolls back content and history together',async()=>{
 await db.exec(migration);await db.exec(`CREATE FUNCTION public.fixture_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional snapshot failure'; END $$;
 CREATE TRIGGER fixture_reject_history BEFORE INSERT ON public.pathway_report_versions FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_history()`);
 try{await as();await assert.rejects(save(),/Fictional snapshot failure/);const s=await state();assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);}finally{await db.exec('RESET ROLE; DROP TRIGGER fixture_reject_history ON public.pathway_report_versions; DROP FUNCTION public.fixture_reject_history()');}
});
test('disabled RLS aborts the proposal without installing new RPC',async()=>{
 await db.exec('ALTER TABLE public.pathway_reports DISABLE ROW LEVEL SECURITY');
 try{await assert.rejects(db.exec(migration),/Unexpected report history boundary/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);}finally{await db.exec('ALTER TABLE public.pathway_reports ENABLE ROW LEVEL SECURITY');}
});
test('JSON object key order does not create a false stale-content conflict',async()=>{
 const a={summary:'Fictional original',goals:['One','Two']};await db.query('UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2',[JSON.stringify(a),id]);
 await db.exec('TRUNCATE public.pathway_report_versions');await db.exec(migration);await as();assert.equal((await save(student,{goals:a.goals,summary:a.summary})).rows[0].version,1);
});
async function sessionAs(client) {
 await client.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);await client.exec('SET ROLE authenticated');
}
async function waitForLock(pid) {
 const deadline=Date.now()+4000;
 while(Date.now()<deadline){const {rows:[r]}=await db.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid]);if(r?.wait_event_type==='Lock')return;await new Promise(resolve=>setTimeout(resolve,20));}
 assert.fail('Competing session did not visibly wait on the report row lock');
}
for(const finish of ['COMMIT','ROLLBACK'])test('concurrent relink '+finish.toLowerCase()+' is checked after the waiting save obtains its lock',{skip:!real},async()=>{
 await db.exec(migration);const writer=await newSession(),waiting=await newSession(),independent=await newSession();
 for(const c of [writer,waiting,independent])await sessionAs(c);
 const otherReport='00000000-0000-4000-8000-000000000011';
 await db.query("INSERT INTO public.pathway_reports(id,user_id,intake_id,model,student_id,content) VALUES($1,$2,$3,'fictional',$4,$5::jsonb)",[otherReport,owner,intake,student,JSON.stringify(original)]);
 const pid=(await waiting.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await writer.exec('BEGIN');let pending;
 try{
  await writer.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,id]);
  pending=save(student,original,next,id,waiting).then(value=>({value}),error=>({error}));
  await waitForLock(pid);
  assert.equal((await save(student,original,next,otherReport,independent)).rows[0].version,1,'Unrelated report is not blocked');
  await writer.exec(finish);const result=await pending;
  if(finish==='COMMIT'){assert.equal(result.error?.code,'40001');const s=await state();assert.deepEqual(s.report,{student_id:moved,content:original});assert.equal(s.versions.filter(v=>v.report_id===id).length,0);}
  else{assert.equal(result.error,undefined);assert.equal(result.value.rows[0].version,1);const s=await state();assert.deepEqual(s.report,{student_id:student,content:next});assert.equal(s.versions.filter(v=>v.report_id===id).length,1);}
 }finally{await writer.exec('ROLLBACK');if(pending)await pending;}
});
test('save lock serializes a later metadata change until its content/history commit',{skip:!real},async()=>{
 await db.exec(migration);const writer=await newSession(),relink=await newSession();await sessionAs(writer);await sessionAs(relink);
 const pid=(await relink.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await writer.exec('BEGIN');let pending;
 try{
  assert.equal((await save(student,original,next,id,writer)).rows[0].version,1);
  pending=relink.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,id]).then(value=>({value}),error=>({error}));
  await waitForLock(pid);await writer.exec('COMMIT');assert.equal((await pending).error,undefined);
  const s=await state();assert.deepEqual(s.report,{student_id:moved,content:next});assert.equal(s.versions.length,1);assert.deepEqual(s.versions[0].content,original);
 }finally{await writer.exec('ROLLBACK');if(pending)await pending;}
});
test('two content saves with the same observed context serialize and reject the losing content',{skip:!real},async()=>{
 await db.exec(migration);const writer=await newSession(),waiting=await newSession();await sessionAs(writer);await sessionAs(waiting);
 const pid=(await waiting.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await writer.exec('BEGIN');let pending;
 try{
  await save(student,original,next,id,writer);
  pending=save(student,original,{summary:'Other fictional replacement'},id,waiting).then(value=>({value}),error=>({error}));
  await waitForLock(pid);await writer.exec('COMMIT');assert.equal((await pending).error?.code,'40001');
  const s=await state();assert.deepEqual(s.report.content,next);assert.equal(s.versions.length,1);
 }finally{await writer.exec('ROLLBACK');if(pending)await pending;}
});
test('canonical transaction exactly matches the reviewed proposal',()=>{
 assert.equal(migration.slice(migration.indexOf('BEGIN;')),proposal.slice(proposal.indexOf('BEGIN;')));
});
test('prepared rollout commits the canonical ledger as data and preserves prior entries',async()=>{
 const before=(await db.query('SELECT * FROM supabase_migrations.schema_migrations')).rows;
 await db.exec(linkedStudentRolloutSql);
 const {rows:[entry]}=await db.query('SELECT name,statements FROM supabase_migrations.schema_migrations WHERE version=$1',[linkedStudentMigrationVersion]);
 assert.equal(entry.name,'require_linked_student_report_save');assert.deepEqual(entry.statements,[migration]);
 assert.deepEqual((await db.query("SELECT * FROM supabase_migrations.schema_migrations WHERE version='20261023020000'")).rows,before);
 await as();assert.equal((await save()).rows[0].version,1);
});
test('ledger insert failure rolls back new function and old grant retirement atomically',async()=>{
 await db.exec(`ALTER TABLE supabase_migrations.schema_migrations ADD CONSTRAINT fixture_reject_linked_ledger CHECK(version<>'${linkedStudentMigrationVersion}')`);
 try{await assert.rejects(db.exec(linkedStudentRolloutSql),{code:'23514'});await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[oldSig])).rows[0].ok,true);assert.equal((await state()).versions.length,0);}finally{await db.exec('ALTER TABLE supabase_migrations.schema_migrations DROP CONSTRAINT fixture_reject_linked_ledger');}
});
test('unexpected prerequisite ledger stops before any function or grant cutover',async()=>{
 await db.exec("UPDATE supabase_migrations.schema_migrations SET statements=ARRAY['Unexpected fixture source']");
 await assert.rejects(db.exec(linkedStudentRolloutSql),/Unexpected report-history prerequisite ledger/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[oldSig])).rows[0].ok,true);
});
test('repeated rollout refuses a duplicate ledger without changing the installed boundary',async()=>{
 await db.exec(linkedStudentRolloutSql);const entry=(await db.query('SELECT * FROM supabase_migrations.schema_migrations ORDER BY version')).rows;
 await assert.rejects(db.exec(linkedStudentRolloutSql),/already recorded/);await db.exec('ROLLBACK');
 assert.deepEqual((await db.query('SELECT * FROM supabase_migrations.schema_migrations ORDER BY version')).rows,entry);
 assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[oldSig])).rows[0].ok,false);
 await as();assert.equal((await save()).rows[0].version,1);
});
test('prepared catalog preflight is read-only and observes old/new routine cutover without reading report rows',async()=>{
 const preflight=readFileSync('docs/production-readiness/proposals/report-linked-student-preflight.sql','utf8');
 const before=await state();
 for(const installed of [false,true]) {
  if(installed)await db.exec(migration);
  const result=await db.exec(preflight);const row=result.find(r=>r.rows?.[0]?.linked_student_save_preflight)?.rows[0].linked_student_save_preflight;
  assert.equal(row.read_only,'on');assert.equal(row.expected_project_label,'qgrertkqbwanerqqemph');
  assert.equal(row.routines.some(r=>r.name.includes('save_pathway_report_content_for_student')),installed);
  assert.deepEqual(await state(),before);
 }
});
