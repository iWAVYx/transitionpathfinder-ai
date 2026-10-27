// Proposal tests only. PGlite or a newly-created loopback PostgreSQL database;
// never accept a hosted URL, service key or production database name.
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const native = process.env.PATHWAY_HISTORY_POSTGRES === '1';
const proposal = readFileSync('docs/production-readiness/proposals/document-path-exclusivity.sql','utf8');
const registrationProposal = readFileSync('docs/production-readiness/proposals/document-upload-registration.sql','utf8');
const reservationProposal = readFileSync('docs/production-readiness/proposals/document-upload-reservations.sql','utf8');
const sourceProposal = readFileSync('docs/production-readiness/proposals/verified-document-summary-source.sql','utf8');
const summaryProposal = readFileSync('docs/production-readiness/proposals/document-summary-job-boundary.sql','utf8');
const bindingProposal = readFileSync('docs/production-readiness/proposals/document-storage-binding.sql','utf8');
const storageProposal = readFileSync('docs/production-readiness/proposals/document-storage-write-boundary.sql','utf8');
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
  CREATE SCHEMA storage;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1] $$;
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,metadata jsonb,owner_id text,version text,UNIQUE(bucket_id,name));
  GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
  GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
  CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid,first_name text,last_name text,school_name text,date_of_birth date);
  CREATE TABLE public.student_collaborators(student_id uuid,user_id uuid,status text,role text);
  CREATE TABLE public.student_relationships(student_id uuid,related_user_id uuid,consent_status text,permission_level text);
  CREATE TABLE public.user_roles(user_id uuid,role text);
  CREATE FUNCTION public.is_partner_only(actor uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='partner') $$;
  CREATE FUNCTION public.is_platform_admin(actor uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='owner') $$;
  CREATE FUNCTION public.has_audience(actor uuid,audience text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE FUNCTION public.has_role(actor uuid,wanted text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=actor AND role=CASE WHEN wanted='admin' THEN 'owner' ELSE wanted END) $$;
  CREATE TABLE public.document_permissions(document_id uuid,user_id uuid,role_type text,permission_level text);
  CREATE FUNCTION public.has_recent_admin_doc_access(actor uuid,doc uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
  CREATE TABLE public.documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid NOT NULL REFERENCES public.students(id),uploaded_by uuid NOT NULL,title text NOT NULL,storage_path text NOT NULL,mime_type text DEFAULT 'text/plain',scan_status text NOT NULL DEFAULT 'pending',scan_verdict jsonb,scan_data_id text,scanned_at timestamptz,review_status text NOT NULL DEFAULT 'pending_review',content_hash text,reviewed_at timestamptz,reviewed_by uuid,archived_at timestamptz,deleted_at timestamptz);
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.documents TO authenticated;
  GRANT ALL ON public.documents TO service_role;
  ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`);
  await db.exec(sql('20261024010000_remove_implicit_admin_student_access.sql').split('-- Editing a profile')[0]+'COMMIT;');
  const docAccess=sql('20260611232723_f4eac771-7183-4a69-887e-49ea6b7c4f75.sql');
  await db.exec(docAccess.slice(docAccess.indexOf('CREATE OR REPLACE FUNCTION public.can_view_document'),docAccess.indexOf('-- 7.')));
  const jobs=sql('20260528231645_00134e64-b642-4fba-b713-8f13ac348250.sql');
  await db.exec(jobs.slice(jobs.indexOf('CREATE TABLE IF NOT EXISTS public.ai_jobs'),jobs.indexOf('CREATE TRIGGER trg_aijobs_updated')));
  const policies=sql('20260624032049_03e91336-dff5-4bda-b5ff-94294f60d6ef.sql');
  const storageStart=policies.indexOf('DROP POLICY IF EXISTS "Access student docs via student access" ON storage.objects');
  await db.exec(policies.slice(policies.indexOf('DROP POLICY IF EXISTS "Access docs via student"'),storageStart));
  const latest=sql('20260814215748_0bb83fc3-57a7-4fa4-a669-cce132fe5c0f.sql');
  await db.exec(latest.slice(latest.indexOf('-- 2)'),latest.indexOf('-- 3)')));
  await db.exec(latest.slice(0,latest.indexOf('-- 2)')));
  await db.exec(policies.slice(storageStart));
});
after(async()=>{if(close) await close();});
beforeEach(async()=>{
  await db.exec('RESET ROLE;DROP FUNCTION IF EXISTS public.read_document_upload_registration(uuid,text);DROP TRIGGER IF EXISTS documents_aa_guard_upload_registration ON public.documents;DROP TRIGGER IF EXISTS documents_link_upload_registration ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_upload_registration();DROP FUNCTION IF EXISTS public.link_document_upload_registration();ALTER TABLE public.documents DROP COLUMN IF EXISTS upload_attempt_id,DROP COLUMN IF EXISTS upload_review_context_sha256;DROP FUNCTION IF EXISTS public.reserve_document_upload(uuid,uuid,text,text);DROP TABLE IF EXISTS public.document_upload_attempts;DROP FUNCTION IF EXISTS public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb);DROP FUNCTION IF EXISTS public.read_verified_document_summary_source(uuid,timestamptz,integer);DROP POLICY IF EXISTS document_summary_explicit_read ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_scoped_request ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_server_update ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_server_delete ON public.ai_jobs;DROP POLICY IF EXISTS fixture_broad_jobs ON public.ai_jobs;DROP FUNCTION IF EXISTS public.can_read_document_summary_job(uuid,uuid,text);DROP TRIGGER IF EXISTS documents_guard_storage_binding ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_storage_binding();ALTER TABLE public.documents DROP COLUMN IF EXISTS storage_object_id,DROP COLUMN IF EXISTS storage_object_version; DROP POLICY IF EXISTS student_document_no_client_replace ON storage.objects;DROP POLICY IF EXISTS student_document_no_client_delete ON storage.objects;DROP POLICY IF EXISTS test_other_bucket ON storage.objects;DROP POLICY IF EXISTS test_broad_policy ON storage.objects;TRUNCATE storage.objects; DROP TRIGGER IF EXISTS documents_guard_scan_state ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_scan_state();DROP INDEX IF EXISTS public.documents_storage_path_unique; TRUNCATE public.ai_jobs,public.document_permissions,public.documents,public.student_collaborators,public.student_relationships,public.user_roles,public.students;');
  await db.exec(legacy);
  await db.query('INSERT INTO public.students(id,owner_id,student_user_id) VALUES($1,$2,$3),($4,$2,NULL)',[student,actors.family,actors.student,otherStudent]);
  for(const [role,actor] of Object.entries(actors)) await db.query('INSERT INTO public.user_roles VALUES($1,$2)',[actor,role]);
  for(const actor of [actors.educator,actors.partner]) await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actor]);
  await db.exec(proposal);
  await db.exec(scanProposal);
  await db.exec(storageProposal);
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


function objectInsert(client=db,bucket='student-documents',name=path) {
  return client.query('INSERT INTO storage.objects(bucket_id,name,metadata) VALUES($1,$2,$3) RETURNING id',[bucket,name,{marker:'original'}]);
}
for(const [role,actor] of Object.entries(actors)) test('storage new-upload access remains explicit for '+role,async()=>{
  await as(actor);if(['family','educator','student'].includes(role))assert.equal((await objectInsert()).rows.length,1);
  else await assert.rejects(objectInsert(),{code:'42501'});
});
for(const [role,actor] of Object.entries(actors)) test('client cannot replace or delete stored student bytes as '+role,async()=>{
  await objectInsert();await as(actor);
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{\"marker\":\"changed\"}'::jsonb RETURNING id")).rows.length,0);
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,0);
  await db.exec('RESET ROLE');const [row]=(await db.query('SELECT * FROM storage.objects')).rows;
  assert.equal(row.name,path);assert.deepEqual(row.metadata,{marker:'original'});
});
test('explicit Owner edit permission preserves uploads but not replacement or removal',async()=>{
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.owner]);
  await as(actors.owner);await objectInsert();assert.equal((await db.query("UPDATE storage.objects SET name=$1 RETURNING id",[student+'/moved.txt'])).rows.length,0);
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,0);
});
test('upload conflict cannot overwrite an existing object',async()=>{
  await as();await objectInsert();await assert.rejects(db.query(`INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('student-documents',$1,'{"marker":"replacement"}'::jsonb) ON CONFLICT(bucket_id,name) DO UPDATE SET metadata=excluded.metadata`,[path]),{code:'42501'});
  await db.exec('RESET ROLE');assert.deepEqual((await db.query('SELECT metadata FROM storage.objects')).rows[0].metadata,{marker:'original'});
});
test('a broad permissive policy cannot reopen protected client replacement or deletion',async()=>{
  await objectInsert();await db.exec('CREATE POLICY test_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true)');
  for(const role of ['anon','authenticated']) {await as(actors.family,role);assert.equal((await db.query("UPDATE storage.objects SET metadata='{}'::jsonb RETURNING id")).rows.length,0);assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,0);}
});
test('other buckets retain their own permitted edits and deletes, but cannot move into protected storage',async()=>{
  await db.exec("CREATE POLICY test_other_bucket ON storage.objects FOR ALL TO authenticated USING(bucket_id='fixture-other-bucket') WITH CHECK(true)");
  await as();const id=(await objectInsert(db,'fixture-other-bucket','fictional.txt')).rows[0].id;
  await assert.rejects(db.query("UPDATE storage.objects SET bucket_id='student-documents' WHERE id=$1",[id]),{code:'42501'});
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{}'::jsonb WHERE id=$1 RETURNING id",[id])).rows.length,1);
  assert.equal((await db.query('DELETE FROM storage.objects WHERE id=$1 RETURNING id',[id])).rows.length,1);
});
test('existing student-object read policy is preserved',async()=>{
  await objectInsert();await as();assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,1);
  await as(actors.partner);assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,0);
});
test('trusted service storage maintenance remains available; no real object deletion is performed',async()=>{
  await objectInsert();await as(actors.family,'service_role');
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{}'::jsonb RETURNING id")).rows.length,1);
  assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,1);
});
test('client role-claim spoofing does not allow stored-file replacement',async()=>{
  await objectInsert();await as();await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
  assert.equal((await db.query("UPDATE storage.objects SET metadata='{}'::jsonb RETURNING id")).rows.length,0);
  await db.exec("SELECT set_config('request.jwt.claim.role','',false)");
});
test('missing canonical upload policy stops storage proposal atomically',async()=>{
  await db.exec('DROP POLICY student_document_no_client_replace ON storage.objects;DROP POLICY student_document_no_client_delete ON storage.objects;DROP POLICY "Upload student docs" ON storage.objects');
  try {await assert.rejects(db.exec(storageProposal),{code:'55000'});await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'student_document_no_client_%'")).rows[0].n,0);
  }finally{await db.exec(sql('20260624032049_03e91336-dff5-4bda-b5ff-94294f60d6ef.sql').slice(sql('20260624032049_03e91336-dff5-4bda-b5ff-94294f60d6ef.sql').indexOf('DROP POLICY IF EXISTS "Access student docs via student access" ON storage.objects')));}
});
test('storage guard preserves baseline grants and policies without adding routines',async()=>{
  await db.exec('DROP POLICY student_document_no_client_replace ON storage.objects;DROP POLICY student_document_no_client_delete ON storage.objects');
  const baseline=async()=>({acl:(await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='storage.objects'::regclass")).rows,policies:(await db.query("SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname NOT LIKE 'student_document_no_client_%' ORDER BY policyname")).rows});
  const before=await baseline();await db.exec(storageProposal);assert.deepEqual(await baseline(),before);
  const rows=(await db.query("SELECT polcmd,polpermissive FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'student_document_no_client_%' ORDER BY polcmd")).rows;
  assert.deepEqual(rows,[{polcmd:'d',polpermissive:false},{polcmd:'w',polpermissive:false}]);
});

test('disabled storage RLS stops the proposal without silently enabling it',async()=>{
  await db.exec('DROP POLICY student_document_no_client_replace ON storage.objects;DROP POLICY student_document_no_client_delete ON storage.objects;ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY');
  try{await assert.rejects(db.exec(storageProposal),{code:'55000'});await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='storage.objects'::regclass")).rows[0].relrowsecurity,false);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname LIKE 'student_document_no_client_%'")).rows[0].n,0);
  }finally{await db.exec('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY');}
});

async function installBinding({owner=actors.family,version='fictional-version-one',name=path,bucket='student-documents'}={}) {
  await db.query('INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES($1,$2,$3,$4)',[bucket,name,owner,version]);
  await db.exec(bindingProposal);
}
test('binds a new upload to exact managed owner/object/version without granting access',async()=>{
  await installBinding();await as();await insert();const [row]=await all();
  const [object]=(await db.query('SELECT id FROM storage.objects')).rows;
  assert.equal(row.storage_object_id,object.id);assert.equal(row.storage_object_version,'fictional-version-one');
});
for(const [role,actor] of Object.entries(actors)) test('storage binding preserves existing upload restrictions for '+role,async()=>{
  await installBinding({owner:actor});await as(actor);
  if(['family','educator','student'].includes(role))assert.equal((await insert({actor})).rows.length,1);
  else await assert.rejects(insert({actor}),{code:'42501'});
});
for(const owner of [actors.educator,null,'', 'invented-owner'])test('rejects another or unavailable managed uploader '+String(owner),async()=>{
  await installBinding({owner});await as();await assert.rejects(insert(),{code:'42501'});assert.equal((await all()).length,0);
});
for(const version of [null,'','   ','v'.repeat(1025)])test('rejects unavailable or invalid object version '+String(version).slice(0,10),async()=>{
  await installBinding({version});await as();await assert.rejects(insert(),{code:'42501'});assert.equal((await all()).length,0);
});
for(const shape of ['missing','other-bucket','other-name'])test('rejects a nonmatching stored object '+shape,async()=>{
  if(shape==='missing')await db.exec(bindingProposal);
  else await installBinding({bucket:shape==='other-bucket'?'other-bucket':'student-documents',name:shape==='other-name'?student+'/other.txt':path});
  await as();await assert.rejects(insert(),{code:'42501'});assert.equal((await all()).length,0);
});
for(const field of ['storage_object_id','storage_object_version'])test('rejects a forged initial binding '+field,async()=>{
  await installBinding();await as();const value=field==='storage_object_id'?uid(999):'invented-version';
  await assert.rejects(db.query(`INSERT INTO public.documents(student_id,uploaded_by,title,storage_path,${field}) VALUES($1,$2,'Fictional',$3,$4)`,[student,actors.family,path,value]),{code:'42501'});
  assert.equal((await all()).length,0);
});
for(const role of ['authenticated','service_role'])test('binding cannot be altered after save by '+role,async()=>{
  await installBinding();await as();await insert();await as(actors.family,role);
  await assert.rejects(db.exec("UPDATE public.documents SET storage_object_id=NULL,storage_object_version=NULL"),{code:'42501'});
  assert.equal((await all())[0].storage_object_version,'fictional-version-one');
});
test('legacy documents stay unbound and ordinary title edits remain available',async()=>{
  await insert();await db.exec(bindingProposal);await as();await db.exec("UPDATE public.documents SET title='Legacy title'");
  const [row]=await all();assert.equal(row.storage_object_id,null);assert.equal(row.storage_object_version,null);assert.equal(row.title,'Legacy title');
  await as();await assert.rejects(db.query('UPDATE public.documents SET storage_object_id=$1,storage_object_version=$2',[uid(999),'invented-history']),{code:'42501'});
});
test('service changes to an object do not silently rewrite the saved version binding',async()=>{
  await installBinding();await as();await insert();await as(actors.family,'service_role');await db.exec("UPDATE storage.objects SET version='fictional-version-two'");
  assert.equal((await all())[0].storage_object_version,'fictional-version-one');
});
test('binding function is private, fixed-path and definer only for its narrow trigger lookup',async()=>{
  await installBinding();const [fn]=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.guard_document_storage_binding()'::regprocedure")).rows;
  assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,'public.guard_document_storage_binding()','EXECUTE') AS ok",[role])).rows[0].ok,false);
});
test('missing upload prerequisite rolls back binding columns and function installation',async()=>{
  await db.exec('DROP POLICY student_document_no_client_replace ON storage.objects');
  await assert.rejects(db.exec(bindingProposal),{code:'55000'});await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attname IN ('storage_object_id','storage_object_version') AND NOT attisdropped")).rows[0].n,0);
  assert.equal((await db.query("SELECT to_regprocedure('public.guard_document_storage_binding()') AS fn")).rows[0].fn,null);
});

for(const role of ['school','district','owner'])test('binding permits '+role+' only with explicit student edit access and its own uploaded object',async()=>{
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);
  await installBinding({owner:actors[role]});await as(actors[role]);await insert({actor:actors[role]});
  assert.equal((await all())[0].storage_object_version,'fictional-version-one');
});
test('managed object ownership cannot be used to spoof another uploader through the definer trigger',async()=>{
  await installBinding({owner:actors.educator});await as();await assert.rejects(insert({actor:actors.educator}),{code:'42501'});assert.equal((await all()).length,0);
});
test('absent managed owner column fails closed without inventing ownership',async()=>{
  await db.exec('ALTER TABLE storage.objects DROP COLUMN owner_id');
  try{await objectInsert();await db.exec(bindingProposal);await as();await assert.rejects(insert(),{code:'42501'});assert.equal((await all()).length,0);}
  finally{await db.exec('RESET ROLE;ALTER TABLE storage.objects ADD COLUMN owner_id text');}
});
for(const finish of ['COMMIT','ROLLBACK'])test('binding observes locked object metadata after service '+finish,{skip:!native},async()=>{
  await installBinding();const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');await a.exec("UPDATE storage.objects SET version='fictional-version-two'");
  const pending=insert({},b).then(result=>({result}),error=>({error}));
  try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;assert.equal(outcome.error,undefined);assert.equal(outcome.result.rows.length,1);
  assert.equal((await all())[0].storage_object_version,finish==='COMMIT'?'fictional-version-two':'fictional-version-one');
});

const summaryId=uid(40);
async function summaryFixture() {
  const id=(await insert()).rows[0].id;
  await db.exec("UPDATE public.documents SET scan_status='clean'");
  await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,input_source,status,result_payload) VALUES($1,$2,$3,'document_summary',$4,'completed',$5)",[summaryId,student,actors.family,{document_id:id},{summary:'Fictional result'}]);
  await db.exec(summaryProposal);return id;
}
function createSummary(documentId,actor=actors.family,extra={}) {
  return db.query("INSERT INTO public.ai_jobs(student_id,triggered_by_user_id,job_type,input_source,status,result_payload,result_id,attempts,error_message,locked_at) VALUES($1,$2,'document_summary',$3,$4,$5,$6,$7,$8,$9) RETURNING id",[extra.student??student,actor,{document_id:documentId},extra.status??'queued',extra.result_payload??null,extra.result_id??null,extra.attempts??0,extra.error_message??null,extra.locked_at??null]);
}
for(const [role,actor] of Object.entries(actors))test('summary job reads require current document/student access for '+role,async()=>{
  await summaryFixture();await as(actor);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,['family','educator','student'].includes(role)?1:0);
});
for(const role of ['school','district','owner'])test('summary job read/request works for '+role+' with explicit student access',async()=>{
  const id=await summaryFixture();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,1);
  assert.equal((await createSummary(id,actors[role])).rows.length,1);
});
test('creator status does not preserve summary access after student access removal',async()=>{
  const id=await summaryFixture();await as(actors.educator);await createSummary(id,actors.educator);
  await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.educator]);await as(actors.educator);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
test('broad admin and job-creator read paths cannot bypass summary document access',async()=>{
  await summaryFixture();await db.query('UPDATE public.ai_jobs SET triggered_by_user_id=$1',[actors.owner]);await as(actors.owner);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
for(const patch of ["archived_at=now()","deleted_at=now()","scan_status='failed'","review_status='rejected'"])test('summary results close when their source changes: '+patch,async()=>{
  await summaryFixture();await db.exec('UPDATE public.documents SET '+patch);await as();assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
for(const documentId of [null,'bad-id','',uid(999),17,{id:uid(999)},[]])test('invalid or missing summary document reference fails closed '+String(documentId),async()=>{
  await summaryFixture();await db.query('UPDATE public.ai_jobs SET input_source=$1',[{document_id:documentId}]);await as();
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);await assert.rejects(createSummary(documentId),{code:'42501'});
});
test('summary student and document must match even when the actor owns both students',async()=>{
  const id=await summaryFixture();await db.query('UPDATE public.ai_jobs SET student_id=$1',[otherStudent]);await as();
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);await assert.rejects(createSummary(id,actors.family,{student:otherStudent}),{code:'42501'});
});
for(const extra of [{status:'completed'},{status:'processing'},{result_payload:{summary:'Forged'}},{result_id:uid(999)},{attempts:1},{error_message:'Forged'},{locked_at:'2026-10-27T00:00:00Z'}])test('client summary requests cannot forge server results/state '+JSON.stringify(extra),async()=>{
  const id=await summaryFixture();await as();await assert.rejects(createSummary(id,actors.family,extra),{code:'42501'});
});
test('valid summary request remains queued, with no fabricated result',async()=>{
  const id=await summaryFixture();await as();const inserted=(await createSummary(id)).rows[0];
  const [row]=(await db.query('SELECT status,result_payload,attempts FROM public.ai_jobs WHERE id=$1',[inserted.id])).rows;
  assert.deepEqual(row,{status:'queued',result_payload:null,attempts:0});
});
test('another explicit document grant does not replace current student access',async()=>{
  const id=await summaryFixture();await db.query("INSERT INTO public.document_permissions VALUES($1,$2,NULL,'view')",[id,actors.school]);await as(actors.school);
  assert.equal((await db.query('SELECT public.can_view_document($1,$2) AS allowed',[actors.school,id])).rows[0].allowed,true);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
test('broad permissive policies cannot reopen summary update/delete or move other job types into summaries',async()=>{
  const id=await summaryFixture();await db.exec('CREATE POLICY fixture_broad_jobs ON public.ai_jobs FOR ALL TO authenticated USING(true) WITH CHECK(true)');await as();
  assert.equal((await db.query("UPDATE public.ai_jobs SET result_payload='{}'::jsonb RETURNING id")).rows.length,0);
  assert.equal((await db.query('DELETE FROM public.ai_jobs RETURNING id')).rows.length,0);
  const other=(await db.query("INSERT INTO public.ai_jobs(triggered_by_user_id,job_type) VALUES($1,'meeting_prep') RETURNING id",[actors.family])).rows[0].id;
  await assert.rejects(db.query("UPDATE public.ai_jobs SET job_type='document_summary',student_id=$1,input_source=$2 WHERE id=$3",[student,{document_id:id},other]),{code:'42501'});
  assert.equal((await db.query("UPDATE public.ai_jobs SET status='completed' WHERE id=$1 RETURNING id",[other])).rows.length,1);
  assert.equal((await db.query('DELETE FROM public.ai_jobs WHERE id=$1 RETURNING id',[other])).rows.length,1);
});
test('unrelated job types retain existing broad admin read policy',async()=>{
  await summaryFixture();await db.query("INSERT INTO public.ai_jobs(triggered_by_user_id,job_type) VALUES($1,'meeting_prep')",[actors.family]);await as(actors.owner);
  assert.deepEqual((await db.query('SELECT job_type FROM public.ai_jobs')).rows,[{job_type:'meeting_prep'}]);
});
test('trusted service job maintenance remains available',async()=>{
  await summaryFixture();await as(actors.owner,'service_role');
  assert.equal((await db.query("UPDATE public.ai_jobs SET status='failed' RETURNING id")).rows.length,1);assert.equal((await db.query('DELETE FROM public.ai_jobs RETURNING id')).rows.length,1);
});
test('summary helper cannot be used to probe another actor and has narrow execution grants',async()=>{
  const id=await summaryFixture();await as();assert.equal((await db.query('SELECT public.can_read_document_summary_job($1,$2,$3) AS allowed',[actors.educator,student,id])).rows[0].allowed,false);
  await db.exec('RESET ROLE');const signature='public.can_read_document_summary_job(uuid,uuid,text)';
  const [fn]=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows;assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,signature])).rows[0].allowed,role==='authenticated');
});
test('summary proposal preserves prior policy expressions and table grants',async()=>{
  const snapshot=async()=>({policies:(await db.query("SELECT policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename='ai_jobs' AND policyname NOT LIKE 'document_summary_%' ORDER BY policyname")).rows,acl:(await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='public.ai_jobs'::regclass")).rows});
  const baseline=await snapshot();await db.exec(summaryProposal);assert.deepEqual(await snapshot(),baseline);
});
test('missing expected job policy aborts proposal installation atomically',async()=>{
  await db.exec('ALTER POLICY "View own or student-accessible jobs" ON public.ai_jobs RENAME TO fixture_old_jobs_read');
  try{await assert.rejects(db.exec(summaryProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regprocedure('public.can_read_document_summary_job(uuid,uuid,text)') AS fn")).rows[0].fn,null);}
  finally{await db.exec('ALTER POLICY fixture_old_jobs_read ON public.ai_jobs RENAME TO "View own or student-accessible jobs"');}
});

test('control: the existing creator/admin summary read exception is observable before the restriction',async()=>{
  const id=(await insert()).rows[0].id;await db.exec("UPDATE public.documents SET scan_status='clean'");
  await db.query("INSERT INTO public.ai_jobs(student_id,triggered_by_user_id,job_type,input_source) VALUES($1,$2,'document_summary',$3)",[student,actors.owner,{document_id:id}]);
  await as(actors.owner);assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,1);
  await db.exec('RESET ROLE');await db.exec(summaryProposal);await as(actors.owner);assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
test('explicit student viewers can read permitted summaries without gaining generation permission',async()=>{
  const id=await summaryFixture();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','viewer')",[student,actors.school]);await as(actors.school);
  assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,1);await assert.rejects(createSummary(id,actors.school),{code:'42501'});
});
test('disabled job RLS stops the proposal without silently enabling it',async()=>{
  await db.exec('ALTER TABLE public.ai_jobs DISABLE ROW LEVEL SECURITY');
  try{await assert.rejects(db.exec(summaryProposal),{code:'55000'});await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.ai_jobs'::regclass")).rows[0].relrowsecurity,false);
    assert.equal((await db.query("SELECT to_regprocedure('public.can_read_document_summary_job(uuid,uuid,text)') AS fn")).rows[0].fn,null);
  }finally{await db.exec('ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY');}
});
test('a broad permissive insert policy cannot let a client impersonate another summary requester',async()=>{
  const id=await summaryFixture();await db.exec('CREATE POLICY fixture_broad_jobs ON public.ai_jobs FOR ALL TO authenticated USING(true) WITH CHECK(true)');await as();
  await assert.rejects(createSummary(id,actors.educator),{code:'42501'});
});

const claimAt='2026-10-27T12:00:00.000Z';
const readSignature='public.read_verified_document_summary_source(uuid,timestamptz,integer)';
const finishSignature='public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)';
async function verifiedSourceFixture() {
  await db.exec(summaryProposal);await installBinding();const docId=(await insert()).rows[0].id;
  await db.query("UPDATE public.documents SET scan_status='clean',content_hash=$1,scan_verdict=$2,scanned_at=now(),scan_data_id=$3",['a'.repeat(64),{code:'clean',provider:'cloudmersive',clean_result:true,blocked_reasons:[],content_sha256:'a'.repeat(64),source:'registration_reviewed_copy'},uid(90)]);
  await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status,locked_at,attempts,input_source) VALUES($1,$2,$3,'document_summary','processing',$4,1,$5)",[summaryId,student,actors.family,claimAt,{document_id:docId,title:'UNTRUSTED TITLE',storage_path:'untrusted/path',document_text:'UNTRUSTED QUEUED TEXT'}]);
  await db.exec(sourceProposal);await as('','service_role');return docId;
}
async function readVerified(client=db,at=claimAt,attempt=1) {
  return (await client.query('SELECT public.read_verified_document_summary_source($1,$2,$3) AS source',[summaryId,at,attempt])).rows[0].source;
}
async function finishVerified(source,patch={},client=db) {
  const input={actor:source.actor_id,student:source.student_id,doc:source.document_id,obj:source.object_id,version:source.object_version,hash:source.content_sha256,context:source.context,at:claimAt,attempt:1,...patch};
  const payload=patch.payload??{key_findings:['Fictional SQL fixture result'],_source:{document_id:input.doc,object_id:input.obj,object_version:input.version,content_sha256:input.hash}};
  return client.query('SELECT public.complete_verified_document_summary($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) AS receipt',[summaryId,input.at,input.attempt,input.actor,input.student,input.doc,input.obj,input.version,input.hash,input.context,payload]);
}
test('trusted source RPC uses actual rows and ignores queued text/title/path',async()=>{
  const docId=await verifiedSourceFixture();const source=await readVerified();
  assert.equal(source.document_id,docId);assert.equal(source.storage_path,path);assert.equal(source.actor_id,actors.family);assert.equal(source.content_sha256,'a'.repeat(64));
  assert.equal(source.schema,'verified-document-summary-source-v1');assert.ok(!JSON.stringify(source).includes('UNTRUSTED'));assert.equal(source.context.studentLastName,null);
});
for(const [role,actor] of Object.entries(actors))test('source/completion RPCs are not callable by signed-in '+role,async()=>{
  await verifiedSourceFixture();const source=await readVerified();await as(actor);
  await assert.rejects(readVerified(),{code:'42501'});await assert.rejects(finishVerified(source),{code:'42501'});
});
for(const patch of ["scan_status='failed'","review_status='rejected'","archived_at=now()","deleted_at=now()","scan_verdict='{}'::jsonb","content_hash='legacy-placeholder'","mime_type='application/pdf'"])test('source RPC stops on unverified/retired document '+patch,async()=>{
  await verifiedSourceFixture();await db.exec('RESET ROLE;UPDATE public.documents SET '+patch);await as('','service_role');await assert.rejects(readVerified(),{code:'42501'});
});
for(const patch of ["version='changed'","owner_id='different-uploader'"])test('source RPC stops on changed managed object '+patch,async()=>{
  await verifiedSourceFixture();await db.exec('UPDATE storage.objects SET '+patch);await assert.rejects(readVerified(),{code:'42501'});
});
for(const scenario of ['wrong-time','wrong-attempt','completed','foreign-student','lost-access','legacy-unbound'])test('source RPC requires exact active claim and current actor access: '+scenario,async()=>{
  await verifiedSourceFixture();
  if(scenario==='wrong-time'){await assert.rejects(readVerified(db,'2026-10-27T12:00:01Z'),{code:'42501'});return;}
  if(scenario==='wrong-attempt'){await assert.rejects(readVerified(db,claimAt,2),{code:'42501'});return;}
  await db.exec('RESET ROLE');
  if(scenario==='completed')await db.exec("UPDATE public.ai_jobs SET status='completed'");
  if(scenario==='foreign-student')await db.query('UPDATE public.ai_jobs SET student_id=$1',[otherStudent]);
  if(scenario==='lost-access')await db.query('UPDATE public.students SET owner_id=$1',[actors.owner]);
  if(scenario==='legacy-unbound')await db.exec('DROP TRIGGER documents_guard_storage_binding ON public.documents;UPDATE public.documents SET storage_object_id=NULL,storage_object_version=NULL');
  await as('','service_role');await assert.rejects(readVerified(),{code:'42501'});
});
test('completion atomically saves one result and refuses a second completion of the claim',async()=>{
  await verifiedSourceFixture();const source=await readVerified();const [done]=(await finishVerified(source)).rows;assert.equal(done.receipt.status,'completed');assert.equal(done.receipt.actor_id,actors.family);
  await assert.rejects(finishVerified(source),{code:'42501'});const [row]=(await db.query('SELECT status,result_payload,locked_at FROM public.ai_jobs')).rows;
  assert.equal(row.status,'completed');assert.equal(row.locked_at,null);assert.equal(row.result_payload._source.content_sha256,'a'.repeat(64));
});
for(const patch of [{actor:actors.educator},{student:otherStudent},{doc:uid(999)},{obj:uid(999)},{version:'different'},{hash:'b'.repeat(64)},{context:{}},{payload:{raw:'Unbound result'}}])test('completion rejects stale or forged source tuple '+JSON.stringify(patch),async()=>{
  await verifiedSourceFixture();const source=await readVerified();await assert.rejects(finishVerified(source,patch),{code:'42501'});
  const [row]=(await db.query('SELECT status,result_payload FROM public.ai_jobs')).rows;assert.equal(row.status,'processing');assert.equal(row.result_payload,null);
});
test('completion rechecks access, privacy context and object state after model work',async()=>{
  await verifiedSourceFixture();const source=await readVerified();await db.exec("RESET ROLE;UPDATE public.students SET last_name='Changed context'");await as('','service_role');
  await assert.rejects(finishVerified(source),{code:'42501'});assert.equal((await db.query('SELECT result_payload FROM public.ai_jobs')).rows[0].result_payload,null);
});
test('source RPCs are fixed-path definer routines executable only by service',async()=>{
  await verifiedSourceFixture();await db.exec('RESET ROLE');
  for(const signature of [readSignature,finishSignature]){
    const [fn]=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows;assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
    for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,signature])).rows[0].allowed,role==='service_role');
  }
});
test('missing result privacy prerequisite rolls back both source RPC installations',async()=>{
  await db.exec(summaryProposal);await installBinding();await db.exec('DROP POLICY document_summary_explicit_read ON public.ai_jobs');
  await assert.rejects(db.exec(sourceProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[readSignature])).rows[0].fn,null);
});
test('completion waits for a held source read then cannot complete the same claim twice',{skip:!native},async()=>{
  await verifiedSourceFixture();await db.exec('RESET ROLE'); // Fixture owner observes pg_stat_activity; worker sessions retain service_role.
  const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await a.exec('BEGIN');const source=await readVerified(a);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=finishVerified(source,{},b).then(result=>({result}),error=>({error}));
  try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec('COMMIT');const outcome=await pending;assert.equal(outcome.error,undefined);assert.equal(outcome.result.rows[0].receipt.status,'completed');await assert.rejects(finishVerified(source),{code:'42501'});
});

// Reservation foundation only: no file is uploaded, finalized or deleted.
const attemptId=uid(301), claimedHash='c'.repeat(64), reviewHash='d'.repeat(64);
async function installReservations() { await db.exec(summaryProposal);await installBinding();await db.exec(sourceProposal);await db.exec(reservationProposal); }
async function reserve(client=db,patch={}) {
  const input={id:attemptId,student,hash:claimedHash,review:reviewHash,...patch};
  return (await client.query('SELECT public.reserve_document_upload($1,$2,$3,$4) AS receipt',[input.id,input.student,input.hash,input.review])).rows[0].receipt;
}
for(const [role,actor] of Object.entries(actors))test('reservation uses current explicit upload permission for '+role,async()=>{
  await installReservations();await as(actor);
  if(['family','educator','student'].includes(role)){
    const receipt=await reserve();assert.equal(receipt.actor_id,actor);assert.equal(receipt.state,'reserved');assert.equal(receipt.storage_path,student+'/'+attemptId+'-privacy-safe-document.txt');
  }else await assert.rejects(reserve(),{code:'42501'});
});
for(const role of ['school','district','owner'])test('explicit student editor may reserve as '+role,async()=>{
  await installReservations();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);assert.equal((await reserve()).actor_id,actors[role]);
});
for(const role of ['anon','service_role'])test('reservation RPC is not directly executable by '+role,async()=>{
  await installReservations();await as(actors.family,role);await assert.rejects(reserve(),{code:'42501'});
});
test('identical same-actor intent returns one durable reservation and no storage/document/job writes',async()=>{
  await installReservations();await as();const first=await reserve();assert.deepEqual(await reserve(),first);
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,1);
  await db.exec('RESET ROLE');for(const table of ['documents','ai_jobs'])assert.equal((await db.query('SELECT count(*)::int AS n FROM public.'+table)).rows[0].n,0);
  // installBinding creates one fake object as a prerequisite fixture; reservation does not create another.
  assert.equal((await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n,1);
});
for(const patch of [{id:uid(302)},{hash:'e'.repeat(64)},{review:'e'.repeat(64)},{student:otherStudent}])test('reservation refuses competing or changed intent '+JSON.stringify(patch),async()=>{
  await installReservations();await as();await reserve();await assert.rejects(reserve(db,patch),{code:'42501'});
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,1);
});
test('another actor cannot resume a known attempt or receive its receipt',async()=>{
  await installReservations();await as();await reserve();await as(actors.educator);await assert.rejects(reserve(),{code:'42501'});assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);
});
for(const patch of [{id:null},{student:null},{hash:null},{hash:'legacy-hash'},{hash:'A'.repeat(64)},{review:null},{review:'bad'}])test('reservation rejects incomplete or unverified intent '+JSON.stringify(patch),async()=>{
  await installReservations();await as();await assert.rejects(reserve(db,patch),{code:'42501'});assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);
});
test('removed access closes both receipt retry and ledger visibility',async()=>{
  await installReservations();await as(actors.educator);await reserve();await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);await assert.rejects(reserve(),{code:'42501'});
});
for(const action of ['INSERT INTO public.document_upload_attempts(id) VALUES(gen_random_uuid())',"UPDATE public.document_upload_attempts SET state='review_required'",'DELETE FROM public.document_upload_attempts'])test('clients cannot mutate the reservation ledger: '+action,async()=>{
  await installReservations();await as();await reserve();await assert.rejects(db.exec(action),{code:'42501'});
});
test('review-required and old reservations do not expire or silently create a new attempt',async()=>{
  await installReservations();await as();await reserve();await db.exec("RESET ROLE;UPDATE public.document_upload_attempts SET state='review_required',created_at='2000-01-01'");await as();
  await assert.rejects(reserve(),{code:'42501'});await assert.rejects(reserve(db,{id:uid(302)}),{code:'42501'});
});
test('reservation function has fixed path and narrow grants; no finalizer or cleanup authority exists',async()=>{
  await installReservations();const signature='public.reserve_document_upload(uuid,uuid,text,text)';
  const [fn]=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows;assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role']){
    assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,role==='authenticated');
    for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await db.query("SELECT has_table_privilege($1,'public.document_upload_attempts',$2) AS ok",[role,privilege])).rows[0].ok,false);
  }
});
test('missing binding prerequisite rolls back reservation installation',async()=>{
  await db.exec('DROP TRIGGER IF EXISTS documents_guard_storage_binding ON public.documents');
  await assert.rejects(db.exec(reservationProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.document_upload_attempts') AS table_name")).rows[0].table_name,null);
});
for(const finish of ['COMMIT','ROLLBACK'])test('concurrent reservations have one durable winner after '+finish,{skip:!native},async()=>{
  await installReservations();const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.educator,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');await reserve(a);
  const pending=reserve(b,{id:uid(302)}).then(result=>({result}),error=>({error}));
  try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;
  if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else {assert.equal(outcome.error,undefined);assert.equal(outcome.result.actor_id,actors.educator);}
  const rows=(await db.query('SELECT actor_id FROM public.document_upload_attempts')).rows;assert.equal(rows.length,1);assert.equal(rows[0].actor_id,finish==='COMMIT'?actors.family:actors.educator);
});

test('identical claimed content for a different student receives a separate reservation',async()=>{
  await installReservations();await as();await reserve();const second=await reserve(db,{id:uid(302),student:otherStudent});
  assert.equal(second.student_id,otherStudent);assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,2);
});
test('view-only collaborators cannot reserve or read upload attempts',async()=>{
  await installReservations();await as();await reserve();await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','viewer')",[student,actors.school]);await as(actors.school);
  await assert.rejects(reserve(db,{id:uid(302)}),{code:'42501'});assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);
});
test('restored access resumes only the original unchanged reserved intent',async()=>{
  await installReservations();await as(actors.educator);const first=await reserve();await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);await assert.rejects(reserve(),{code:'42501'});
  await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.educator]);await as(actors.educator);assert.deepEqual(await reserve(),first);
  // A reservation receipt is not a report sharing link or permission grant.
  await assert.rejects(reserve(db,{review:'f'.repeat(64)}),{code:'42501'});
});
test('unresolved reservations retain the student row rather than cascading away',async()=>{
  await installReservations();await as();await reserve();await db.exec('RESET ROLE;TRUNCATE storage.objects');await assert.rejects(db.query('DELETE FROM public.students WHERE id=$1',[student]),error=>['23001','23503'].includes(error.code));
  assert.equal((await db.query('SELECT id FROM public.students WHERE id=$1',[student])).rows.length,1);assert.equal((await db.query('SELECT id FROM public.document_upload_attempts WHERE id=$1',[attemptId])).rows.length,1);
});

async function registrationFixture(actor=actors.family) {
  await installReservations();await db.exec(registrationProposal);await as(actor);const receipt=await reserve();await db.exec('RESET ROLE');
  await db.query('INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES($1,$2,$3,$4)',['student-documents',receipt.storage_path,actor,'registration-version-one']);await as(actor);return receipt;
}
async function registerReserved(client=db,patch={}) {
  const input={id:uid(401),student,actor:actors.family,path:student+'/'+attemptId+'-privacy-safe-document.txt',attempt:attemptId,review:reviewHash,hash:claimedHash,...patch};
  return (await client.query(`INSERT INTO public.documents(id,student_id,uploaded_by,title,storage_path,upload_attempt_id,upload_review_context_sha256,content_hash)
    VALUES($1,$2,$3,'Fictional reservation registration',$4,$5,$6,$7) RETURNING *`,[input.id,input.student,input.actor,input.path,input.attempt,input.review,input.hash])).rows[0];
}
async function readRegistration(client=db,review=reviewHash) {return (await client.query('SELECT public.read_document_upload_registration($1,$2) AS receipt',[attemptId,review])).rows[0].receipt;}
async function registrationState(){await db.exec('RESET ROLE');return (await db.query('SELECT state,registered_document_id FROM public.document_upload_attempts WHERE id=$1',[attemptId])).rows[0];}
test('registration and reservation linkage commit together with a read-only recovery receipt',async()=>{
  await registrationFixture();const doc=await registerReserved();assert.equal(doc.storage_object_version,'registration-version-one');assert.equal(doc.upload_attempt_id,attemptId);
  const receipt=await readRegistration();assert.equal(receipt.document_id,doc.id);assert.equal(receipt.scan_status,'pending');assert.equal(receipt.review_status,'pending_review');assert.deepEqual(await readRegistration(),receipt);
  assert.deepEqual(await registrationState(),{state:'registered',registered_document_id:doc.id});assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
for(const patch of [{attempt:null},{attempt:uid(999)},{review:null},{review:'f'.repeat(64)},{hash:'e'.repeat(64)},{hash:null},{student:otherStudent},{actor:actors.educator},{path:student+'/wrong-privacy-safe-document.txt'}])test('registration rejects mismatched reserved identity '+JSON.stringify(patch),async()=>{
  await registrationFixture();await assert.rejects(registerReserved(db,patch),{code:'42501'});assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,0);assert.equal((await registrationState()).state,'reserved');
});
for(const role of ['family','educator','student'])test('reserved registration works with existing explicit '+role+' edit access',async()=>{
  await registrationFixture(actors[role]);const doc=await registerReserved(db,{actor:actors[role]});assert.equal(doc.uploaded_by,actors[role]);assert.equal((await readRegistration()).document_id,doc.id);
});
for(const role of ['school','district','owner'])test('reserved registration requires explicit '+role+' edit access',async()=>{
  await installReservations();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await db.exec(registrationProposal);await as(actors[role]);const receipt=await reserve();await db.exec('RESET ROLE');await db.query('INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES($1,$2,$3,$4)',['student-documents',receipt.storage_path,actors[role],'version-one']);await as(actors[role]);
  const doc=await registerReserved(db,{actor:actors[role]});assert.equal((await readRegistration()).document_id,doc.id);
});
for(const role of ['partner','school','district','owner'])test('a management/viewer account cannot claim another actor registration as '+role,async()=>{
  await registrationFixture();await as(actors[role]);await assert.rejects(registerReserved(),{code:'42501'});await assert.rejects(readRegistration(),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});
test('access removal between reservation and registration leaves the reservation unresolved',async()=>{
  await registrationFixture(actors.educator);await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);await assert.rejects(registerReserved(db,{actor:actors.educator}),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});
test('removed access or a changed review claim prevents recovery of a completed registration',async()=>{
  await registrationFixture(actors.educator);await registerReserved(db,{actor:actors.educator});await assert.rejects(readRegistration(db,'e'.repeat(64)),{code:'42501'});await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);await assert.rejects(readRegistration(),{code:'42501'});
});
for(const fault of ['missing-object','foreign-owner','row-policy','after-trigger'])test('registration failure rolls back both writes: '+fault,async()=>{
  const receipt=await registrationFixture();await db.exec('RESET ROLE');
  if(fault==='missing-object')await db.query('DELETE FROM storage.objects WHERE name=$1',[receipt.storage_path]);
  if(fault==='foreign-owner')await db.query('UPDATE storage.objects SET owner_id=$1 WHERE name=$2',[actors.owner,receipt.storage_path]);
  if(fault==='row-policy')await db.exec("CREATE POLICY fixture_reject_insert ON public.documents AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false)");
  if(fault==='after-trigger')await db.exec("CREATE FUNCTION public.fixture_reject_registration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional post-link failure' USING ERRCODE='42501'; END $$;CREATE TRIGGER zz_fixture_reject_registration AFTER INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_registration()");
  await as();await assert.rejects(registerReserved(),{code:'42501'});assert.equal((await registrationState()).state,'reserved');assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,0);
  if(fault==='row-policy')await db.exec('DROP POLICY fixture_reject_insert ON public.documents');
  if(fault==='after-trigger')await db.exec('DROP TRIGGER zz_fixture_reject_registration ON public.documents;DROP FUNCTION public.fixture_reject_registration()');
});
test('registered attempts cannot be reused for a second document or reservation receipt',async()=>{
  await registrationFixture();const first=await registerReserved();await assert.rejects(registerReserved(db,{id:uid(402)}),{code:'42501'});await assert.rejects(reserve(),{code:'42501'});assert.equal((await readRegistration()).document_id,first.id);assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,1);
});
for(const patch of ["upload_attempt_id=NULL,upload_review_context_sha256=NULL","upload_attempt_id='00000000-0000-4000-8000-000000000999'","upload_review_context_sha256='"+'e'.repeat(64)+"'"])test('saved registration binding cannot change: '+patch,async()=>{
  await registrationFixture();await registerReserved();await assert.rejects(db.exec('UPDATE public.documents SET '+patch),{code:'42501'});await db.exec('RESET ROLE');await assert.rejects(db.exec('UPDATE public.documents SET '+patch),{code:'42501'});
});
test('ordinary metadata and trusted scan updates preserve the registered link',async()=>{
  await registrationFixture();const doc=await registerReserved();await db.exec("UPDATE public.documents SET title='Updated metadata'");await as(actors.family,'service_role');await db.exec("UPDATE public.documents SET scan_status='failed',review_status='rejected'");await as();assert.equal((await readRegistration()).scan_status,'failed');assert.equal((await registrationState()).registered_document_id,doc.id);
});
test('legacy documents stay unlinked and cannot be assigned invented provenance',async()=>{
  await installReservations();const doc=await insert();await db.exec(registrationProposal);await as();await db.exec("UPDATE public.documents SET title='Legacy metadata'");await assert.rejects(db.query('UPDATE public.documents SET upload_attempt_id=$1,upload_review_context_sha256=$2',[attemptId,reviewHash]),{code:'42501'});await db.exec('RESET ROLE');const row=(await db.query('SELECT upload_attempt_id FROM public.documents WHERE id=$1',[doc.rows[0].id])).rows[0];assert.equal(row.upload_attempt_id,null);
});
for(const role of ['anon','service_role'])test('registration recovery receipt is not directly callable by '+role,async()=>{
  await registrationFixture();await registerReserved();await as(actors.family,role);await assert.rejects(readRegistration(),{code:'42501'});
});
test('registered row and reservation cannot be physically deleted out of order',async()=>{
  await registrationFixture();const doc=await registerReserved();await db.exec('RESET ROLE');await assert.rejects(db.query('DELETE FROM public.documents WHERE id=$1',[doc.id]),error=>['23001','23503'].includes(error.code));await assert.rejects(db.query('DELETE FROM public.document_upload_attempts WHERE id=$1',[attemptId]),error=>['23001','23503'].includes(error.code));assert.equal((await registrationState()).registered_document_id,doc.id);
});
for(const finish of ['COMMIT','ROLLBACK'])test('concurrent registration consumes its reservation once after '+finish,{skip:!native},async()=>{
  await registrationFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  await a.exec('BEGIN');await registerReserved(a);const pending=registerReserved(b,{id:uid(402)}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.result.id,uid(402));const rows=(await db.query('SELECT id FROM public.documents')).rows;assert.equal(rows.length,1);assert.equal((await registrationState()).registered_document_id,rows[0].id);
});

test('registration triggers retain pending-only scan rules despite their definer scope',async()=>{
  const receipt=await registrationFixture();await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");
  await assert.rejects(db.query(`INSERT INTO public.documents(id,student_id,uploaded_by,title,storage_path,upload_attempt_id,upload_review_context_sha256,content_hash,scan_status)
    VALUES($1,$2,$3,'Fictional forged clean registration',$4,$5,$6,$7,'clean')`,[uid(401),student,actors.family,receipt.storage_path,attemptId,reviewHash,claimedHash]),{code:'42501'});
  await db.exec("SELECT set_config('request.jwt.claim.role','',false)");assert.equal((await registrationState()).state,'reserved');assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,0);
});
test('registration definer helpers have fixed paths and no direct execution grants',async()=>{
  await registrationFixture();
  for(const signature of ['public.guard_document_upload_registration()','public.link_document_upload_registration()','public.read_document_upload_registration(uuid,text)']){
    const [fn]=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows;assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
    for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,role==='authenticated'&&signature.includes('read_document'));
  }
});
test('missing reservation prerequisite rolls back document linkage installation',async()=>{
  await assert.rejects(db.exec(registrationProposal),{code:'55000'});await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attname='upload_attempt_id' AND NOT attisdropped")).rows[0].n,0);
});
