// Proposal tests only. PGlite or a newly-created loopback PostgreSQL database;
// never accept a hosted URL, service key or production database name.
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const native = process.env.PATHWAY_HISTORY_POSTGRES === '1';
const proposal = readFileSync('docs/production-readiness/proposals/document-path-exclusivity.sql','utf8');
const scanProposal = readFileSync('docs/production-readiness/proposals/document-scan-state-boundary.sql','utf8');
const sql = name => readFileSync('supabase/migrations/'+name,'utf8');
const legacy = sql('20260715031029_93358eaf-ed18-40b0-bcf8-383a6d1bc5ac.sql').split('-- 2)')[0];
const uid = n => '00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const actors = { family:uid(1), educator:uid(2), student:uid(3), partner:uid(4), school:uid(5), district:uid(6), owner:uid(7) };
const student = uid(10), otherStudent = uid(11), path = student+'/fictional-privacy-safe-document.txt';
let db, close, newSession;
async function as(actor=actors.family, role='authenticated', client=db) {
  assert.ok(['authenticated','anon','service_role'].includes(role));
  await client.exec('RESET ROLE'); await client.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor]); await client.exec('SET ROLE '+role);
}
function insert(options={}, client=db) {
  return client.query('INSERT INTO public.documents(student_id,uploaded_by,title,storage_path) VALUES($1,$2,$3,$4) RETURNING id',
    [options.student??student,options.actor??actors.family,options.title??'Fictional file',options.path??path]);
}
async function all() { await db.exec('RESET ROLE');return (await db.query('SELECT * FROM public.documents ORDER BY id')).rows; }
before(async()=>{
  if(native) {
    if(![undefined,'localhost','127.0.0.1'].includes(process.env.PGHOST)) throw Error('Loopback PostgreSQL only');
    const pg=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href);const {Client}=pg.default??pg;
    const options={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};
    const control=new Client({...options,database:'postgres'});await control.connect();const name='tf_doc_path_'+randomUUID().replaceAll('-','');await control.query(`CREATE DATABASE ${name}`);const clients=[];
    newSession=async()=>{const c=new Client({...options,database:name});await c.connect();clients.push(c);return {query:(...args)=>c.query(...args),exec:s=>c.query(s)};};
    db=await newSession();close=async()=>{try{await Promise.all(clients.map(c=>c.end()));}finally{try{await control.query(`DROP DATABASE ${name}`);}finally{await control.end();}}};
  } else {
    const {PGlite}=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href);db=new PGlite();close=()=>db.close();
  }
  await db.exec(`DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated;END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon;END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS;END IF;
  END $$;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
  CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid);
  CREATE TABLE public.student_collaborators(student_id uuid,user_id uuid,status text,role text);
  CREATE TABLE public.student_relationships(student_id uuid,related_user_id uuid,consent_status text,permission_level text);
  CREATE TABLE public.user_roles(user_id uuid,role text);
  CREATE FUNCTION public.is_partner_only(actor uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='partner') $$;
  CREATE FUNCTION public.is_platform_admin(actor uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='owner') $$;
  CREATE FUNCTION public.can_view_document(actor uuid,doc uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE FUNCTION public.has_recent_admin_doc_access(actor uuid,doc uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE TABLE public.documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid NOT NULL REFERENCES public.students(id),uploaded_by uuid NOT NULL,title text NOT NULL,storage_path text NOT NULL,scan_status text NOT NULL DEFAULT 'pending',scan_verdict jsonb,scan_data_id text,scanned_at timestamptz,review_status text NOT NULL DEFAULT 'pending_review',content_hash text,reviewed_at timestamptz,reviewed_by uuid,archived_at timestamptz,deleted_at timestamptz);
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.documents TO authenticated;
  GRANT ALL ON public.documents TO service_role;
  ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`);
  await db.exec(sql('20261024010000_remove_implicit_admin_student_access.sql').split('-- Editing a profile')[0]+'COMMIT;');
  const policies=sql('20260624032049_03e91336-dff5-4bda-b5ff-94294f60d6ef.sql');
  await db.exec(policies.slice(policies.indexOf('DROP POLICY IF EXISTS "Access docs via student"'),policies.indexOf('DROP POLICY IF EXISTS "Access student docs via student access" ON storage.objects')));
  const latest=sql('20260814215748_0bb83fc3-57a7-4fa4-a669-cce132fe5c0f.sql');await db.exec(latest.slice(latest.indexOf('-- 2)'),latest.indexOf('-- 3)')));
});
after(async()=>{if(close) await close();});
beforeEach(async()=>{
  await db.exec('RESET ROLE; DROP TRIGGER IF EXISTS documents_guard_scan_state ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_scan_state();DROP INDEX IF EXISTS public.documents_storage_path_unique; TRUNCATE public.documents,public.student_collaborators,public.student_relationships,public.user_roles,public.students;');
  await db.exec(legacy);
  await db.query('INSERT INTO public.students VALUES($1,$2,$3),($4,$2,NULL)',[student,actors.family,actors.student,otherStudent]);
  for(const [role,actor] of Object.entries(actors)) await db.query('INSERT INTO public.user_roles VALUES($1,$2)',[actor,role]);
  for(const actor of [actors.educator,actors.partner]) await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actor]);
  await db.exec(proposal);
  await db.exec(scanProposal);
});
for(const [role,actor] of Object.entries(actors)) test('existing database insert permission is preserved for '+role,async()=>{
  await as(actor);const allowed=['family','educator','student'].includes(role);
  if(allowed) assert.equal((await insert({actor})).rows.length,1);else await assert.rejects(insert({actor}),{code:'42501'});
  assert.equal((await all()).length,allowed?1:0);
});
test('Owner needs explicit student edit access; management role alone is insufficient',async()=>{
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.owner]);await as(actors.owner);assert.equal((await insert({actor:actors.owner})).rows.length,1);
});
test('uploader spoofing remains denied by the existing insert policy',async()=>{
  await as(actors.educator);await assert.rejects(insert({actor:actors.family}),{code:'42501'});assert.equal((await all()).length,0);
});
test('same object cannot acquire another document row or replace the original metadata',async()=>{
  await as();await insert({title:'Original title'});await assert.rejects(insert({title:'Replacement title'}),{code:'23505'});assert.equal((await all())[0].title,'Original title');
});
test('uniqueness includes hidden pending rows',async()=>{
  await insert({actor:actors.educator});await as();assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,0);await assert.rejects(insert(),{code:'23505'});assert.equal((await all()).length,1);
});
for(const state of ['archived_at','deleted_at']) test(state+' does not free a referenced storage path',async()=>{
  await insert();await db.exec(`UPDATE public.documents SET ${state}=now()`);await as();await assert.rejects(insert(),{code:'23505'});assert.equal((await all()).length,1);
});
for(const value of ['nested/file.txt','../file.txt','.','..','file.txt?x=1','file.txt#fragment','file%2etxt','a'.repeat(501)]) test('rejects a noncanonical new file location '+value.slice(0,35),async()=>{
  await as();await assert.rejects(insert({path:student+'/'+value}),{code:'42501'});assert.equal((await all()).length,0);
});
test('rejects another student folder even when the caller owns both students',async()=>{
  await as();await assert.rejects(insert({path:otherStudent+'/file.txt'}),{code:'42501'});
});
for(const target of ['student','path']) test('document '+target+' identity cannot be moved by an authorized editor',async()=>{
  await as();const id=(await insert()).rows[0].id;
  await assert.rejects(db.query(target==='student'?'UPDATE public.documents SET student_id=$1 WHERE id=$2':'UPDATE public.documents SET storage_path=$1 WHERE id=$2',[target==='student'?otherStudent:student+'/different.txt',id]),{code:'42501'});
  const [row]=await all();assert.equal(row.student_id,student);assert.equal(row.storage_path,path);
});
test('ordinary title, archive/restore and human review updates remain available',async()=>{
  await as();await insert();await db.query('UPDATE public.documents SET title=$1,archived_at=now(),reviewed_at=now(),reviewed_by=$2',['Reviewed title',actors.family]);await db.exec('UPDATE public.documents SET archived_at=NULL');const [row]=await all();assert.equal(row.title,'Reviewed title');assert.equal(row.archived_at,null);assert.equal(row.scan_status,'pending');assert.equal(row.reviewed_by,actors.family);assert.ok(row.reviewed_at);
});
test('legacy noncanonical locations are retained and metadata remains editable',async()=>{
  await db.exec('DROP INDEX public.documents_storage_path_unique');await db.exec(legacy);await insert({path:student+'/old/nested.pdf'});await db.exec(proposal);await as();await db.exec("UPDATE public.documents SET title='Legacy title' WHERE true");const [row]=await all();assert.equal(row.storage_path,student+'/old/nested.pdf');assert.equal(row.title,'Legacy title');
});
test('legacy duplicate paths stop the proposal atomically without rewriting rows or installing a partial index',async()=>{
  await db.exec('DROP INDEX public.documents_storage_path_unique');await db.exec(legacy);await insert({title:'One'});await insert({title:'Two'});
  await assert.rejects(db.exec(proposal),{code:'23505'});await db.exec('ROLLBACK');assert.equal((await all()).length,2);assert.equal((await db.query("SELECT to_regclass('public.documents_storage_path_unique') AS name")).rows[0].name,null);
  assert.equal((await db.query("SELECT position('cannot be moved' in pg_get_functiondef('public.tg_documents_enforce_storage_path()'::regprocedure))>0 AS hardened")).rows[0].hardened,false);
});
test('different object paths and different students remain independent',async()=>{
  await as();await insert();await insert({path:student+'/another.txt'});await insert({student:otherStudent,path:otherStudent+'/fictional-privacy-safe-document.txt'});assert.equal((await all()).length,3);
});
test('trigger stays invoker, fixed search path and unavailable as a client RPC',async()=>{
  const [fn]=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.tg_documents_enforce_storage_path()'::regprocedure")).rows;assert.equal(fn.prosecdef,false);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role']) assert.equal((await db.query("SELECT has_function_privilege($1,'public.tg_documents_enforce_storage_path()','EXECUTE') AS ok",[role])).rows[0].ok,false);
});
for(const value of ['',null]) test('blank or missing new storage path is rejected '+String(value),async()=>{
  await as();await assert.rejects(db.query('INSERT INTO public.documents(student_id,uploaded_by,title,storage_path) VALUES($1,$2,$3,$4)',[student,actors.family,'Fictional',value]),{code:'42501'});assert.equal((await all()).length,0);
});
test('moving both student and its matching folder is still prohibited',async()=>{
  await as();await insert();await assert.rejects(db.query('UPDATE public.documents SET student_id=$1,storage_path=$2',[otherStudent,otherStudent+'/moved.txt']),{code:'42501'});const [row]=await all();assert.equal(row.student_id,student);assert.equal(row.storage_path,path);
});
test('the same identity guard also applies to privileged maintenance writes',async()=>{
  await insert();await assert.rejects(db.query('UPDATE public.documents SET storage_path=$1',[student+'/moved.txt']),{code:'42501'});assert.equal((await all())[0].storage_path,path);
});
test('missing historical trigger stops the proposal without a partial index',async()=>{
  await db.exec('DROP INDEX public.documents_storage_path_unique;DROP TRIGGER documents_enforce_storage_path ON public.documents;');
  await assert.rejects(db.exec(proposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.documents_storage_path_unique') AS name")).rows[0].name,null);
});
test('table grants and all existing row policy expressions are unchanged',async()=>{
  const snapshot=async()=>({policies:(await db.query("SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='documents' ORDER BY policyname")).rows,acl:(await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='public.documents'::regclass")).rows});
  await db.exec('DROP INDEX public.documents_storage_path_unique');await db.exec(legacy);const baseline=await snapshot();await db.exec(proposal);assert.deepEqual(await snapshot(),baseline);
});

// Machine scan results must come from the trusted database writer, not clients.
const forgedInsertFields = [
  ['scan_status', "'clean'"], ['scan_status', "'failed'"],
  ['scan_status', "'infected'"], ['scan_status', "'deleted'"],
  ['scan_status', 'NULL'], ['scan_verdict', "'{\"code\":\"clean\"}'::jsonb"],
  ['scan_data_id', "'invented-result'"], ['scanned_at', 'now()'],
  ['review_status', "'reviewed'"], ['review_status', "'rejected'"],
];
for (const [column,value] of forgedInsertFields) test('client insert cannot forge '+column+'='+value,async()=>{
  await as();
  await assert.rejects(db.query(`INSERT INTO public.documents(student_id,uploaded_by,title,storage_path,${column}) VALUES($1,$2,'Fictional',$3,${value})`,[student,actors.family,path]),{code:'42501'});
  assert.equal((await all()).length,0);
});
const protectedUpdates = [
  ['scan_status', "'clean'"], ['scan_verdict', "'{\"code\":\"clean\"}'::jsonb"],
  ['scan_data_id', "'invented-result'"], ['scanned_at', 'now()'],
  ['review_status', "'reviewed'"], ['content_hash', "'replacement-hash'"],
];
for (const [column,value] of protectedUpdates) test('client cannot overwrite '+column,async()=>{
  await as();await insert();const original=(await all())[0];await as();
  await assert.rejects(db.exec(`UPDATE public.documents SET title='Must roll back',${column}=${value}`),{code:'42501'});
  assert.deepEqual((await all())[0],original);
});
test('a forged service-role JWT claim does not confer a trusted execution role',async()=>{
  await as();await insert();await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
  await assert.rejects(db.exec("UPDATE public.documents SET scan_status='clean'"),{code:'42501'});
  await db.exec("SELECT set_config('request.jwt.claim.role','',false)");assert.equal((await all())[0].scan_status,'pending');
});
test('Owner with explicit student editing access can edit titles but cannot approve scans',async()=>{
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.owner]);
  await as(actors.owner);await insert({actor:actors.owner});await db.exec("UPDATE public.documents SET title='Owner metadata edit'");
  await assert.rejects(db.exec("UPDATE public.documents SET scan_status='clean'"),{code:'42501'});
  assert.equal((await all())[0].title,'Owner metadata edit');
});
test('trusted service processing can persist scan results without changing uploader identity',async()=>{
  await as();await insert();await as(actors.family,'service_role');
  await db.exec(`UPDATE public.documents SET scan_status='clean',scan_verdict='{"code":"clean","source":"fictional-disposable-test"}'::jsonb,scan_data_id='fictional-result',scanned_at=now(),content_hash='verified-by-test-writer',review_status='pending_review'`);
  const [row]=await all();assert.equal(row.scan_status,'clean');assert.equal(row.scan_data_id,'fictional-result');assert.equal(row.uploaded_by,actors.family);
});
for(const role of ['authenticated','service_role','database-owner']) test('uploader identity is fixed for '+role,async()=>{
  await insert();if(role!=='database-owner')await as(actors.family,role);
  await assert.rejects(db.query('UPDATE public.documents SET uploaded_by=$1',[actors.educator]),{code:'42501'});
  assert.equal((await all())[0].uploaded_by,actors.family);
});
test('unchanged scan columns do not block ordinary metadata updates',async()=>{
  await as();await insert();await db.exec('UPDATE public.documents SET title=\'New title\',scan_status=scan_status,scan_verdict=scan_verdict,scan_data_id=scan_data_id,scanned_at=scanned_at,review_status=review_status,content_hash=content_hash,uploaded_by=uploaded_by');
  assert.equal((await all())[0].title,'New title');
});
test('quarantined results cannot be cleared by a client',async()=>{
  await insert();await db.exec("UPDATE public.documents SET scan_status='infected',review_status='rejected',scan_verdict='{\"code\":\"infected\"}'::jsonb");
  await as();await assert.rejects(db.exec("UPDATE public.documents SET scan_status='pending',review_status='pending_review',scan_verdict=NULL"),{code:'42501'});
  assert.equal((await all())[0].scan_status,'infected');
});
test('legacy clean rows remain unchanged and permit metadata edits without new attestation',async()=>{
  await insert();await db.exec("UPDATE public.documents SET scan_status='clean'");await as();await db.exec("UPDATE public.documents SET title='Legacy metadata'");
  const [row]=await all();assert.equal(row.scan_status,'clean');assert.equal(row.scan_verdict,null);assert.equal(row.title,'Legacy metadata');
});
test('an upsert cannot use an existing path to forge scan approval',async()=>{
  await as();await insert();await assert.rejects(db.query(`INSERT INTO public.documents(student_id,uploaded_by,title,storage_path) VALUES($1,$2,'Replacement',$3) ON CONFLICT(storage_path) WHERE storage_path IS NOT NULL AND storage_path<>'' DO UPDATE SET scan_status='clean'`,[student,actors.family,path]),{code:'42501'});
  assert.equal((await all())[0].scan_status,'pending');
});
test('multirow scan forgery fails atomically',async()=>{
  await as();await insert();await insert({path:student+'/second.txt'});
  await assert.rejects(db.exec("UPDATE public.documents SET scan_status='clean',title='Forged'"),{code:'42501'});
  const rows=await all();assert.equal(rows.length,2);assert.ok(rows.every(row=>row.scan_status==='pending'&&row.title==='Fictional file'));
});
test('scan guard remains invoker with a fixed search path and no direct client or service RPC grant',async()=>{
  const [fn]=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.guard_document_scan_state()'::regprocedure")).rows;
  assert.equal(fn.prosecdef,false);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,'public.guard_document_scan_state()','EXECUTE') AS ok",[role])).rows[0].ok,false);
});
test('missing exclusive path prerequisite prevents partial installation of the scan guard',async()=>{
  await db.exec('DROP TRIGGER documents_guard_scan_state ON public.documents;DROP FUNCTION public.guard_document_scan_state();DROP INDEX public.documents_storage_path_unique');
  await assert.rejects(db.exec(scanProposal),{code:'55000'});await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regprocedure('public.guard_document_scan_state()') AS name")).rows[0].name,null);
});
test('scan proposal preserves table grants and existing row policy expressions',async()=>{
  const snapshot=async()=>({policies:(await db.query("SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='documents' ORDER BY policyname")).rows,acl:(await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='public.documents'::regclass")).rows});
  await db.exec('DROP TRIGGER documents_guard_scan_state ON public.documents;DROP FUNCTION public.guard_document_scan_state()');
  const baseline=await snapshot();await db.exec(scanProposal);assert.deepEqual(await snapshot(),baseline);
});

async function waitForLock(pid) {
  const deadline=Date.now()+5000;
  while(Date.now()<deadline) {if((await db.query("SELECT wait_event_type='Lock' AS waiting FROM pg_stat_activity WHERE pid=$1",[pid])).rows[0]?.waiting)return;await new Promise(resolve=>setTimeout(resolve,25));}
  throw Error('Competing insert did not reach the expected database lock');
}
for(const finish of ['COMMIT','ROLLBACK']) test('concurrent same-path insertion has one winner after '+finish,{skip:!native},async()=>{
  const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');await insert({title:'First transaction'},a);
  const second=insert({title:'Second transaction'},b).then(result=>({result}),error=>({error}));
  try {await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await second;throw error;}
  await a.exec(finish);const outcome=await second;
  if(finish==='COMMIT') assert.equal(outcome.error?.code,'23505');else assert.equal(outcome.result?.rows.length,1);
  const rows=await all();assert.equal(rows.length,1);assert.equal(rows[0].title,finish==='COMMIT'?'First transaction':'Second transaction');
});
