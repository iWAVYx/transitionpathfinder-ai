// Proposal tests only. PGlite or a newly-created loopback PostgreSQL database;
// never accept a hosted URL, service key or production database name.
import test, { before, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
const native = process.env.PATHWAY_HISTORY_POSTGRES === '1';
const proposal = readFileSync('docs/production-readiness/proposals/document-path-exclusivity.sql','utf8');
const rolloutInventory = readFileSync('docs/production-readiness/proposals/document-summary-rollout-inventory.sql','utf8');
import {extractionRolloutSql,extractionMigrationSource,extractionPrerequisites,extractionMigrationVersion,extractionPreflightLedgerSql} from './atomic-extraction-rollout-sql.mjs';
const extractionPreflight=readFileSync('docs/production-readiness/proposals/atomic-extraction-preflight.sql','utf8');
import {uploadChainRolloutSql,uploadChainMigrations} from './document-upload-rollout-sql.mjs';
const uploadChainPreflight=readFileSync('docs/production-readiness/proposals/document-upload-chain-preflight.sql','utf8');
const operationAdmission=readFileSync('docs/production-readiness/proposals/document-operation-admission.sql','utf8');
const applyAdmission=readFileSync('docs/production-readiness/proposals/document-apply-admission.sql','utf8');
const uploadPauseFence=readFileSync('docs/production-readiness/proposals/document-upload-pause-fence.sql','utf8');
const uploadInterval=readFileSync('docs/production-readiness/proposals/document-upload-interval.sql','utf8');
const atomicExtractionProposal = readFileSync('docs/production-readiness/proposals/atomic-extraction-application.sql','utf8');
const sourceBindingProposal = readFileSync('docs/production-readiness/proposals/document-summary-source-binding.sql','utf8');
const referenceCatalog = readFileSync('docs/production-readiness/proposals/document-reference-catalog.sql','utf8');
const resolutionClaimProposal = readFileSync('docs/production-readiness/proposals/document-upload-resolution-claim.sql','utf8');
const recoveryReadProposal = readFileSync('docs/production-readiness/proposals/document-upload-recovery-read.sql','utf8');
const admissionProposal = readFileSync('docs/production-readiness/proposals/document-upload-admission-limits.sql','utf8');
const reviewHoldProposal = readFileSync('docs/production-readiness/proposals/document-upload-review-hold.sql','utf8');
const quarantineReadProposal = readFileSync('docs/production-readiness/proposals/document-quarantine-read-boundary.sql','utf8');
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
const documentFixtureSql=`  CREATE TABLE public.documents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid NOT NULL REFERENCES public.students(id),uploaded_by uuid NOT NULL,title text NOT NULL,storage_path text NOT NULL,mime_type text DEFAULT 'text/plain',scan_status text NOT NULL DEFAULT 'pending',scan_verdict jsonb,scan_data_id text,scanned_at timestamptz,review_status text NOT NULL DEFAULT 'pending_review',content_hash text,reviewed_at timestamptz,reviewed_by uuid,archived_at timestamptz,deleted_at timestamptz);
  GRANT SELECT,INSERT,UPDATE,DELETE ON public.documents TO authenticated;
  GRANT ALL ON public.documents TO service_role;
  ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;`;
let documentFixturePolicies,documentFixtureAcl;
let db, close, newSession, closeCaseSessions;
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
    // Keep all competing sessions alive through each test, then release them.
    // Accumulating prior cases must not exhaust PostgreSQL max_connections.
    closeCaseSessions=async()=>{await Promise.all(clients.splice(1).map(c=>c.end()));};
    db=await newSession();close=async()=>{try{await Promise.all(clients.map(c=>c.end()));}finally{try{await control.query(`DROP DATABASE ${name}`);}finally{await control.end();}}};
  } else {
    const {PGlite}=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href);db=new PGlite();close=()=>db.close();
  }
  await db.exec(`DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated;END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon;END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS;END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='tf_document_catalog_reader') THEN CREATE ROLE tf_document_catalog_reader NOLOGIN NOINHERIT;END IF;
  END $$;
  CREATE SCHEMA storage;
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:cardinality(string_to_array(name,'/'))-1] $$;
  CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,metadata jsonb,owner_id text,version text,UNIQUE(bucket_id,name));
  GRANT USAGE ON SCHEMA storage TO anon,authenticated,service_role;
  GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated,service_role;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA public,storage TO tf_document_catalog_reader;
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
  ${documentFixtureSql}`);
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
  const policyRows=await db.query(`SELECT format('CREATE POLICY %I ON public.documents AS %s FOR %s TO %s%s%s;',policyname,permissive,cmd,
    array_to_string(ARRAY(SELECT quote_ident(role_name::text) FROM unnest(roles) role_name),','),
    CASE WHEN qual IS NULL THEN '' ELSE ' USING ('||qual||')' END,
    CASE WHEN with_check IS NULL THEN '' ELSE ' WITH CHECK ('||with_check||')' END) AS ddl
    FROM pg_policies WHERE schemaname='public' AND tablename='documents' ORDER BY policyname`);
  documentFixturePolicies=policyRows.rows.map(row=>row.ddl).join('\n');
  documentFixtureAcl=(await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='public.documents'::regclass")).rows[0].acl;
});
after(async()=>{if(close) await close();});
afterEach(async()=>{if(native)await closeCaseSessions();});
beforeEach(async()=>{
  await db.exec('ROLLBACK');
  await db.exec(`RESET ROLE;
    DO $$ BEGIN
      IF to_regclass('public.document_operation_leases') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS document_operation_summary_completion ON public.document_operation_leases;
      END IF;
      IF to_regclass('public.document_summary_operation_bindings') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS summary_operation_binding_frozen ON public.document_summary_operation_bindings;
      END IF;
    END $$;
    DROP FUNCTION IF EXISTS public.guard_document_summary_operation_completion();
    DROP FUNCTION IF EXISTS public.guard_document_summary_operation_binding();
    DROP FUNCTION IF EXISTS public.claim_admitted_document_summary(uuid,integer);
    DROP TABLE IF EXISTS public.document_summary_operation_bindings;
    DO $$ BEGIN
      IF to_regclass('public.document_upload_attempts') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS upload_attempt_bind_operation ON public.document_upload_attempts;
        DROP TRIGGER IF EXISTS upload_attempt_interval_guard ON public.document_upload_attempts;
      END IF;
      IF to_regclass('public.document_operation_leases') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS document_operation_upload_completion ON public.document_operation_leases;
      END IF;
      IF to_regclass('public.document_upload_operation_bindings') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS upload_operation_binding_frozen ON public.document_upload_operation_bindings;
      END IF;
    END $$;
    DROP FUNCTION IF EXISTS public.claim_document_upload_registration_operation(uuid,uuid,text),public.assert_document_upload_interval(uuid,text),public.assert_document_upload_registered_outcome(uuid),public.lock_document_upload_interval_control(),public.bind_document_upload_operation(),public.guard_document_upload_interval_attempt(),public.guard_document_upload_operation_binding(),public.guard_document_upload_interval_completion();
    DROP TABLE IF EXISTS public.document_upload_operation_bindings;
  `);
  await db.exec('RESET ROLE;DROP FUNCTION IF EXISTS public.lock_document_upload_admission();DROP FUNCTION IF EXISTS public.lock_document_apply_admission();DROP FUNCTION IF EXISTS public.begin_document_operation(uuid,uuid,text),public.finish_document_operation(uuid,uuid,uuid,text),public.set_document_operation_pause(uuid,bigint,boolean,text),public.inspect_document_operation_drain();DROP TABLE IF EXISTS public.document_operation_control_events,public.document_operation_leases,public.document_operation_control;');
  await db.exec('RESET ROLE;ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;DROP POLICY IF EXISTS fixture_student_read ON public.students;DROP POLICY IF EXISTS fixture_student_edit ON public.students;DROP TABLE IF EXISTS supabase_migrations.schema_migrations;DROP FUNCTION IF EXISTS public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean);DROP TABLE IF EXISTS public.evidence_items,public.transition_profiles,public.audit_log,public.document_extractions;DROP FUNCTION IF EXISTS public.fixture_extraction_revision();DROP FUNCTION IF EXISTS public.fixture_fail_apply();DROP TRIGGER IF EXISTS ai_jobs_guard_bound_document_source ON public.ai_jobs;DROP FUNCTION IF EXISTS public.guard_bound_document_summary_job();DROP FUNCTION IF EXISTS public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb);DROP FUNCTION IF EXISTS public.read_verified_document_summary_source(uuid,timestamptz,integer);DROP TABLE IF EXISTS public.document_summary_source_bindings;DROP FUNCTION IF EXISTS public.reject_document_source_binding_mutation();DROP FUNCTION IF EXISTS public.claim_document_upload_resolution(uuid,text,uuid);DO $$ BEGIN IF to_regclass(\'public.document_upload_attempts\') IS NOT NULL THEN EXECUTE \'DROP TRIGGER IF EXISTS upload_attempt_resolution_frozen ON public.document_upload_attempts\'; END IF; END $$;DROP FUNCTION IF EXISTS public.guard_claimed_upload_attempt();DROP TABLE IF EXISTS public.document_upload_resolution_claims;DROP FUNCTION IF EXISTS public.reject_upload_resolution_claim_mutation();DROP FUNCTION IF EXISTS public.read_document_upload_recovery(uuid,text);DROP POLICY IF EXISTS student_document_reserved_insert ON storage.objects;DROP FUNCTION IF EXISTS public.can_insert_reserved_student_document(text,text);DROP FUNCTION IF EXISTS public.hold_document_upload_for_review(uuid,text,text);DROP POLICY IF EXISTS student_document_no_blocked_read ON storage.objects;DROP FUNCTION IF EXISTS public.student_document_not_blocked(text);DROP FUNCTION IF EXISTS public.read_document_upload_registration(uuid,text);DROP TRIGGER IF EXISTS documents_aa_guard_upload_registration ON public.documents;DROP TRIGGER IF EXISTS documents_link_upload_registration ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_upload_registration();DROP FUNCTION IF EXISTS public.link_document_upload_registration();ALTER TABLE public.documents DROP COLUMN IF EXISTS upload_attempt_id,DROP COLUMN IF EXISTS upload_review_context_sha256;DROP FUNCTION IF EXISTS public.reserve_document_upload(uuid,uuid,text,text);DROP TABLE IF EXISTS public.document_upload_attempts;DROP FUNCTION IF EXISTS public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb);DROP FUNCTION IF EXISTS public.read_verified_document_summary_source(uuid,timestamptz,integer);DROP POLICY IF EXISTS document_summary_explicit_read ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_scoped_request ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_server_update ON public.ai_jobs;DROP POLICY IF EXISTS document_summary_server_delete ON public.ai_jobs;DROP POLICY IF EXISTS fixture_broad_jobs ON public.ai_jobs;DROP FUNCTION IF EXISTS public.can_read_document_summary_job(uuid,uuid,text);DROP TRIGGER IF EXISTS documents_guard_storage_binding ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_storage_binding();ALTER TABLE public.documents DROP COLUMN IF EXISTS storage_object_id,DROP COLUMN IF EXISTS storage_object_version; DROP POLICY IF EXISTS student_document_no_client_replace ON storage.objects;DROP POLICY IF EXISTS student_document_no_client_delete ON storage.objects;DROP POLICY IF EXISTS test_other_bucket ON storage.objects;DROP POLICY IF EXISTS test_broad_policy ON storage.objects;TRUNCATE storage.objects; DROP TRIGGER IF EXISTS documents_guard_scan_state ON public.documents;DROP FUNCTION IF EXISTS public.guard_document_scan_state();DROP INDEX IF EXISTS public.documents_storage_path_unique; TRUNCATE public.ai_jobs,public.document_permissions,public.documents,public.student_collaborators,public.student_relationships,public.user_roles,public.students;');
  // A fresh table keeps PostgreSQL dropped-column slots bounded. Restore the
  // exact original fixture ACL/policies; never CASCADE away an unknown writer.
  await db.exec('DROP TABLE public.documents;'+documentFixtureSql+documentFixturePolicies);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attisdropped")).rows[0].n,0);
  assert.equal((await db.query("SELECT relacl::text AS acl FROM pg_class WHERE oid='public.documents'::regclass")).rows[0].acl,documentFixtureAcl);
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

// New proposal: retained infected objects must not inherit uploader/admin
// review-read exceptions. No Storage API requests or real bytes are involved.
async function blockedObject(status='infected',verdict=null) {
  await objectInsert();const doc=(await insert()).rows[0];
  await db.query("UPDATE public.documents SET scan_status=$1,scan_verdict=$2,review_status='rejected',archived_at=now() WHERE id=$3",[status,verdict,doc.id]);
  return doc.id;
}
for(const [role,actor] of Object.entries(actors)) for(const state of ['infected','deleted','failed-with-infected-verdict','clean-with-infected-verdict']) test('blocked retained object is unreadable to '+role+' after '+state,async()=>{
  await blockedObject(state.endsWith('-with-infected-verdict')?state.split('-')[0]:state,state.endsWith('-with-infected-verdict')?{code:'infected'}:null);
  await db.exec(quarantineReadProposal);
  // Broad permissive policy deliberately tests that a second grant, including
  // an Owner review exception, cannot reopen this restrictive byte boundary.
  await db.exec('CREATE POLICY test_broad_policy ON storage.objects FOR SELECT TO anon,authenticated USING(true)');
  await as(actor);assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,0);
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,1);
});
test('quarantine read guard closes existing hidden uploader and platform-admin exceptions',async()=>{
  await blockedObject();
  for(const actor of [actors.family,actors.owner]) {await as(actor);assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,1);}
  await db.exec('RESET ROLE');await db.exec(quarantineReadProposal);
  for(const actor of [actors.family,actors.owner]) {await as(actor);assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,0);}
});
for(const state of ['unregistered','pending','clean']) test('quarantine guard preserves baseline permitted read for '+state,async()=>{
  await objectInsert();if(state!=='unregistered'){const doc=(await insert()).rows[0];await db.query('UPDATE public.documents SET scan_status=$1 WHERE id=$2',[state,doc.id]);}
  await db.exec(quarantineReadProposal);await as();assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,1);
  await as(actors.partner);assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,0);
});
test('other buckets keep their read policy even when an object name matches a blocked document',async()=>{
  await blockedObject();await objectInsert(db,'fixture-other-bucket',path);await db.exec(quarantineReadProposal);
  await db.exec("CREATE POLICY test_other_bucket ON storage.objects FOR SELECT TO authenticated USING(bucket_id='fixture-other-bucket')");
  await as();const rows=(await db.query('SELECT bucket_id FROM storage.objects')).rows;assert.deepEqual(rows,[{bucket_id:'fixture-other-bucket'}]);
});
test('anonymous and spoofed service JWT roles do not bypass a blocked read',async()=>{
  await blockedObject();await db.exec(quarantineReadProposal);await db.exec('CREATE POLICY test_broad_policy ON storage.objects FOR SELECT TO anon,authenticated USING(true)');
  for(const role of ['anon','authenticated']){await as(actors.family,role);await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,0);}
  await db.exec("SELECT set_config('request.jwt.claim.role','',false)");
});
test('trusted service can still inspect retained rows; no cleanup or byte deletion is introduced',async()=>{
  await blockedObject();await db.exec(quarantineReadProposal);await as(actors.family,'service_role');assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,1);
});
test('read guard is restrictive with fixed-path definer and narrow boolean grants',async()=>{
  await db.exec(quarantineReadProposal);
  const fn=(await db.query("SELECT prosecdef,provolatile,proconfig,pg_get_function_result(oid) AS result FROM pg_proc WHERE oid='public.student_document_not_blocked(text)'::regprocedure")).rows[0];
  assert.deepEqual(fn,{prosecdef:true,provolatile:'s',proconfig:['search_path=pg_catalog'],result:'boolean'});
  const pol=(await db.query("SELECT polcmd,polpermissive FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='student_document_no_blocked_read'")).rows[0];assert.deepEqual(pol,{polcmd:'r',polpermissive:false});
  for(const role of ['anon','authenticated']) assert.equal((await db.query("SELECT has_function_privilege($1,'public.student_document_not_blocked(text)','EXECUTE') AS allowed",[role])).rows[0].allowed,true);
  assert.equal((await db.query("SELECT has_function_privilege('service_role','public.student_document_not_blocked(text)','EXECUTE') AS allowed")).rows[0].allowed,false);
});
test('missing path prerequisite stops read guard atomically without installing a policy or function',async()=>{
  await db.exec('DROP INDEX public.documents_storage_path_unique');await assert.rejects(db.exec(quarantineReadProposal),{code:'55000'});await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regprocedure('public.student_document_not_blocked(text)') AS name")).rows[0].name,null);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='student_document_no_blocked_read'")).rows[0].n,0);
});

for(const finish of ['COMMIT','ROLLBACK']) test('new read observes infection only after committed state ('+finish+')',{skip:!native},async()=>{
  await objectInsert();const doc=(await insert()).rows[0];await db.query("UPDATE public.documents SET scan_status='clean' WHERE id=$1",[doc.id]);await db.exec(quarantineReadProposal);
  const writer=await newSession(),reader=await newSession();await as(actors.family,'authenticated',reader);
  await writer.exec('BEGIN');
  try {
    await writer.query("UPDATE public.documents SET scan_status='infected',review_status='rejected',archived_at=now() WHERE id=$1",[doc.id]);
    assert.equal((await reader.query('SELECT id FROM storage.objects')).rows.length,1,'uncommitted state cannot revoke an earlier snapshot');
    await writer.exec(finish);
    assert.equal((await reader.query('SELECT id FROM storage.objects')).rows.length,finish==='COMMIT'?0:1);
  } finally {await writer.exec('ROLLBACK');}
});

// Tenth proposal: durable review hold + exact reserved client metadata insert.
async function installReviewHold() {
  await installReservations();await db.exec(registrationProposal);await db.exec(quarantineReadProposal);await db.exec(reviewHoldProposal);
}
async function hold(client=db,patch={}) {
  const input={id:attemptId,review:reviewHash,reason:'upload_uncertain',...patch};
  return (await client.query('SELECT public.hold_document_upload_for_review($1,$2,$3) AS receipt',[input.id,input.review,input.reason])).rows[0].receipt;
}
async function reservedObject(client=db,patch={}) {
  const input={path:student+'/'+attemptId+'-privacy-safe-document.txt',owner:actors.family,bucket:'student-documents',...patch};
  return client.query('INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES($1,$2,$3,$4) RETURNING id',[input.bucket,input.path,input.owner,'held-version-one']);
}
async function ownReviewIntent(actor=actors.family) {
  await installReviewHold();await as(actor);return reserve();
}
for(const role of ['family','educator','student']) test('reserved storage insert and same-actor review hold work for '+role,async()=>{
  await ownReviewIntent(actors[role]);assert.equal((await reservedObject(db,{owner:actors[role]})).rows.length,1);
  const receipt=await hold();assert.equal(receipt.actor_id,actors[role]);assert.equal(receipt.state,'review_required');assert.equal(receipt.reason,'upload_uncertain');
  const repeated=await hold();assert.deepEqual(repeated,receipt);await assert.rejects(reserve(),{code:'42501'});
});
for(const role of ['school','district','owner']) test('explicit '+role+' student editor can hold only their own reserved upload',async()=>{
  await installReviewHold();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await reserve();assert.equal((await reservedObject(db,{owner:actors[role]})).rows.length,1);assert.equal((await hold()).actor_id,actors[role]);
});
for(const [role,actor] of Object.entries(actors)) test(role==='family'?'a held original reservation blocks later client insertion':'a foreign reservation gives no hold or upload authority to '+role,async()=>{
  await ownReviewIntent();if(role==='family') {await hold();await assert.rejects(reservedObject(),{code:'42501'});return;}
  await as(actor);await assert.rejects(hold(),{code:'42501'});await assert.rejects(reservedObject(db,{owner:actor}),{code:'42501'});
  assert.equal((await registrationState()).state,'reserved');
});
for(const patch of [{id:uid(999)},{review:'e'.repeat(64)},{review:null},{reason:null},{reason:'free form private notes'},{id:null}]) test('hold rejects uncertain intent without creating a reservation '+JSON.stringify(patch),async()=>{
  await ownReviewIntent();await assert.rejects(hold(db,patch),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});
test('hold does not delete, modify or release an already uploaded copy or allow its registration',async()=>{
  await ownReviewIntent();await reservedObject();await db.exec('RESET ROLE');const before=(await db.query('SELECT * FROM storage.objects')).rows;
  await as();await hold();await assert.rejects(registerReserved(),{code:'42501'});await db.exec('RESET ROLE');assert.deepEqual((await db.query('SELECT * FROM storage.objects')).rows,before);assert.equal((await db.query('SELECT id FROM public.documents')).rows.length,0);assert.equal((await db.query('SELECT id FROM public.ai_jobs')).rows.length,0);
});
test('a completed registration cannot be held or silently unlinked',async()=>{
  await ownReviewIntent();await reservedObject();const doc=await registerReserved();await assert.rejects(hold(),{code:'42501'});assert.equal((await readRegistration()).document_id,doc.id);assert.equal((await registrationState()).state,'registered');
});
test('removed access prevents a hold and a late upload without erasing the attempt',async()=>{
  await ownReviewIntent(actors.educator);await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);await assert.rejects(hold(),{code:'42501'});await assert.rejects(reservedObject(db,{owner:actors.educator}),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});
for(const role of ['anon','service_role']) test('hold RPC is unavailable to '+role,async()=>{
  await ownReviewIntent();await as(actors.family,role);await assert.rejects(hold(),{code:'42501'});
});
for(const patch of [{path:student+'/unreserved-privacy-safe-document.txt'},{owner:actors.owner},{owner:null},{path:otherStudent+'/'+attemptId+'-privacy-safe-document.txt'}]) test('reserved client insert rejects unbound path/owner '+JSON.stringify(patch),async()=>{
  await ownReviewIntent();await db.exec('RESET ROLE');const before=(await db.query('SELECT * FROM storage.objects ORDER BY id')).rows;await as();await assert.rejects(reservedObject(db,patch),{code:'42501'});await db.exec('RESET ROLE');assert.deepEqual((await db.query('SELECT * FROM storage.objects ORDER BY id')).rows,before);
});
test('a broad permissive policy and a spoofed role cannot create unreserved student metadata',async()=>{
  await installReviewHold();await db.exec('CREATE POLICY test_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true)');await as();await db.exec("SELECT set_config('request.jwt.claim.role','service_role',false)");await assert.rejects(reservedObject(),{code:'42501'});await db.exec("SELECT set_config('request.jwt.claim.role','',false)");
});
test('other buckets retain their own insert policy and service maintenance stays unchanged',async()=>{
  await installReviewHold();await db.exec("CREATE POLICY test_other_bucket ON storage.objects FOR ALL TO authenticated USING(bucket_id='fixture-other-bucket') WITH CHECK(true)");await as();assert.equal((await reservedObject(db,{bucket:'fixture-other-bucket'})).rows.length,1);await as(actors.family,'service_role');assert.equal((await reservedObject()).rows.length,1);
});
test('hold reason and first timestamp cannot be changed by another idempotent request',async()=>{
  await ownReviewIntent();const receipt=await hold();await assert.rejects(hold(db,{reason:'user_cancelled'}),{code:'42501'});assert.deepEqual(await hold(),receipt);
});
test('review hold creates no direct client or service mutation authority',async()=>{
  await ownReviewIntent();for(const role of ['authenticated','service_role']) {await as(actors.family,role);await assert.rejects(db.query("UPDATE public.document_upload_attempts SET state='review_required' WHERE id=$1",[attemptId]),{code:'42501'});await assert.rejects(db.query('DELETE FROM public.document_upload_attempts WHERE id=$1',[attemptId]),{code:'42501'});}
});
test('unknown old review states stop installation without invented hold metadata',async()=>{
  await installReservations();await db.exec(registrationProposal);await db.exec(quarantineReadProposal);await as();await reserve();await db.exec("RESET ROLE;UPDATE public.document_upload_attempts SET state='review_required'");
  await assert.rejects(db.exec(reviewHoldProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='document_upload_attempts' AND column_name='held_at'")).rows[0].n,0);
});
test('missing quarantine prerequisite stops hold/install atomically',async()=>{
  await installReservations();await db.exec(registrationProposal);await assert.rejects(db.exec(reviewHoldProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regprocedure('public.hold_document_upload_for_review(uuid,text,text)') AS name")).rows[0].name,null);
});
test('review hold and reserved insert use fixed-path definer scope and narrow execution grants',async()=>{
  await installReviewHold();for(const signature of ['public.hold_document_upload_for_review(uuid,text,text)','public.can_insert_reserved_student_document(text,text)']) {
    const fn=(await db.query('SELECT prosecdef,provolatile,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.deepEqual(fn,{prosecdef:true,provolatile:'v',proconfig:['search_path=pg_catalog']});
    for(const role of ['anon','authenticated','service_role']) assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,signature])).rows[0].allowed,role==='authenticated');
  }
  const pol=(await db.query("SELECT polcmd,polpermissive FROM pg_policy WHERE polrelid='storage.objects'::regclass AND polname='student_document_reserved_insert'")).rows[0];assert.deepEqual(pol,{polcmd:'a',polpermissive:false});
});

test('anonymous role cannot insert even with a user-like claim and broad permissive policy',async()=>{
  await ownReviewIntent();await db.exec('RESET ROLE;CREATE POLICY test_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true)');await as(actors.family,'anon');await assert.rejects(reservedObject(),{code:'42501'});
  await assert.rejects(db.query('SELECT public.can_insert_reserved_student_document($1,$2)',[student+'/'+attemptId+'-privacy-safe-document.txt',actors.family]),{code:'42501'});
});
for(const finish of ['COMMIT','ROLLBACK']) test('held review blocks a competing reserved insert only after '+finish,{skip:!native},async()=>{
  await ownReviewIntent();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');await hold(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=reservedObject(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.result.rows.length,1);
});
for(const finish of ['COMMIT','ROLLBACK']) test('review hold waits for the exact in-flight storage metadata insert after '+finish,{skip:!native},async()=>{
  await ownReviewIntent();await db.exec('RESET ROLE');const baseline=(await db.query('SELECT id FROM storage.objects')).rows.length;
  const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');await reservedObject(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=hold(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;assert.equal(outcome.error,undefined);assert.equal(outcome.result.state,'review_required');
  assert.equal((await db.query('SELECT id FROM storage.objects')).rows.length,baseline+(finish==='COMMIT'?1:0));
});
for(const finish of ['COMMIT','ROLLBACK']) test('registration waits for review hold and cannot consume it after '+finish,{skip:!native},async()=>{
  await ownReviewIntent();await reservedObject();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');await hold(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=registerReserved(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.result.upload_attempt_id,attemptId);
});
for(const finish of ['COMMIT','ROLLBACK']) test('review hold cannot detach a registration racing through '+finish,{skip:!native},async()=>{
  await ownReviewIntent();await reservedObject();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');const doc=await registerReserved(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=hold(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;if(finish==='COMMIT'){assert.equal(outcome.error?.code,'42501');assert.equal((await registrationState()).registered_document_id,doc.id);}else{assert.equal(outcome.result.state,'review_required');assert.equal((await registrationState()).registered_document_id,null);}
});

test('older Storage schema without managed owner_id installs but refuses new client metadata',async()=>{
  await installReservations();await db.exec(registrationProposal);await db.exec(quarantineReadProposal);
  await db.exec("ALTER TABLE storage.objects ADD COLUMN owner uuid;UPDATE storage.objects SET owner=owner_id::uuid;ALTER TABLE storage.objects DROP COLUMN owner_id");
  try {
    await db.exec(reviewHoldProposal);await as();const receipt=await reserve();
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name,owner,version) VALUES($1,$2,$3,$4)',['student-documents',receipt.storage_path,actors.family,'legacy-version']),{code:'42501'});
  } finally {
    await db.exec('RESET ROLE;ALTER TABLE storage.objects ADD COLUMN owner_id text;UPDATE storage.objects SET owner_id=owner::text;ALTER TABLE storage.objects DROP COLUMN owner');
  }
});
test('a contradictory legacy owner cannot substitute for the managed uploader identity',async()=>{
  await ownReviewIntent();await db.exec('RESET ROLE;ALTER TABLE storage.objects ADD COLUMN owner uuid');
  try {
    await as();await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name,owner_id,owner,version) VALUES($1,$2,$3,$4,$5)',['student-documents',student+'/'+attemptId+'-privacy-safe-document.txt',actors.owner,actors.family,'mixed-version']),{code:'42501'});
  } finally {await db.exec('RESET ROLE;ALTER TABLE storage.objects DROP COLUMN owner');}
});
test('downgrading the uploader to viewer blocks holding and reserved insertion',async()=>{
  await ownReviewIntent(actors.educator);await db.exec('RESET ROLE');await db.query("UPDATE public.student_collaborators SET role='viewer' WHERE user_id=$1",[actors.educator]);
  await as(actors.educator);await assert.rejects(hold(),{code:'42501'});await assert.rejects(reservedObject(db,{owner:actors.educator}),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});
test('Owner management role cannot retain upload authority after explicit student access is removed',async()=>{
  await installReviewHold();await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors.owner]);await as(actors.owner);await reserve();await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.owner]);
  await as(actors.owner);await assert.rejects(hold(),{code:'42501'});await assert.rejects(reservedObject(db,{owner:actors.owner}),{code:'42501'});assert.equal((await registrationState()).state,'reserved');
});

// Eleventh proposal: unresolved admission limits; no release/expiry/cleanup.
async function installAdmission() {await installReviewHold();await db.exec(admissionProposal);}
const admissionIntent=n=>({id:uid(1000+n),hash:n.toString(16).padStart(64,'0')});
async function fillAdmission(n,client=db,start=0,patch={}) {
  for(let i=0;i<n;i++)await reserve(client,{...admissionIntent(start+i),...patch});
}
for(const role of ['family','educator','student'])test('unresolved actor admission cap preserves exact retries for '+role,async()=>{
  await installAdmission();await as(actors[role]);await fillAdmission(5);const first=await reserve(db,admissionIntent(0));
  assert.deepEqual(await reserve(db,admissionIntent(0)),first);await assert.rejects(reserve(db,admissionIntent(5)),{code:'42501'});
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,5);
});
for(const role of ['school','district','owner'])test('admission limits do not grant implicit student access to '+role,async()=>{
  await installAdmission();await as(actors[role]);await assert.rejects(reserve(),{code:'42501'});await db.exec('RESET ROLE');
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await fillAdmission(5);
  await assert.rejects(reserve(db,admissionIntent(5)),{code:'42501'});
});
test('partner-only actor remains excluded from bounded reservation admission',async()=>{
  await installAdmission();await as(actors.partner);await assert.rejects(reserve(),{code:'42501'});
});
test('actor unresolved quota spans students and counts durable review holds',async()=>{
  await installAdmission();await as();await reserve();await hold();await fillAdmission(4,db,0,{student:otherStudent});
  await assert.rejects(reserve(db,admissionIntent(8)),{code:'42501'});await assert.rejects(reserve(),{code:'42501'});
  await db.exec('RESET ROLE');assert.equal((await db.query("SELECT count(*)::int AS n FROM public.document_upload_attempts WHERE state='review_required'")).rows[0].n,1);
});
test('student unresolved cap includes other actors without leaking their receipts',async()=>{
  await installAdmission();await as();await fillAdmission(5);await as(actors.educator);await fillAdmission(5,db,5);await as(actors.student);
  const failure=await reserve(db,admissionIntent(10)).then(()=>null,e=>e);assert.equal(failure.code,'42501');assert.equal(failure.message,'This upload attempt could not be confirmed.');
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);
  await assert.rejects(reserve(db,admissionIntent(0)),{code:'42501'});
});
test('completed registration frees only its unresolved slot while preserving its receipt and content claim',async()=>{
  await installAdmission();await as();await reserve();await fillAdmission(4);await reservedObject();await registerReserved();
  assert.equal((await reserve(db,admissionIntent(4))).state,'reserved');await assert.rejects(reserve(db,admissionIntent(5)),{code:'42501'});
  await assert.rejects(reserve(),{code:'42501'});await assert.rejects(reserve(db,{id:uid(8000)}),{code:'42501'});
  assert.equal((await readRegistration()).document_id,uid(401));
});
test('installing caps preserves over-limit legacy claims and their exact reserved retries',async()=>{
  await installReviewHold();await as();await fillAdmission(7);const before=(await db.query('SELECT * FROM public.document_upload_attempts ORDER BY id')).rows;
  await db.exec('RESET ROLE');await db.exec(admissionProposal);await as();assert.deepEqual((await db.query('SELECT * FROM public.document_upload_attempts ORDER BY id')).rows,before);
  assert.equal((await reserve(db,admissionIntent(0))).attempt_id,admissionIntent(0).id);await assert.rejects(reserve(db,admissionIntent(9)),{code:'42501'});
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('admission refuses stale transaction snapshot mode '+isolation,async()=>{
  await installAdmission();await as();await db.exec('BEGIN ISOLATION LEVEL '+isolation);
  try{await assert.rejects(reserve(),{code:'42501'});}finally{await db.exec('ROLLBACK');}
  assert.equal((await db.query('SELECT id FROM public.document_upload_attempts')).rows.length,0);
});
test('bounded admission retains narrow execution and ledger privileges',async()=>{
  await installAdmission();const signature='public.reserve_document_upload(uuid,uuid,text,text)';
  const fn=(await db.query('SELECT prosecdef,provolatile,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.equal(fn.prosecdef,true);assert.equal(fn.provolatile,'v');assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role']){
    assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,role==='authenticated');
    for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await db.query("SELECT has_table_privilege($1,'public.document_upload_attempts',$2) AS ok",[role,privilege])).rows[0].ok,false);
  }
});
test('admission proposal requires the hold and reserved-insert boundary',async()=>{
  await installReservations();await db.exec(registrationProposal);await assert.rejects(db.exec(admissionProposal),{code:'55000'});await db.exec('ROLLBACK');
  assert.equal((await db.query("SELECT to_regclass('public.document_upload_unresolved_actor') AS name")).rows[0].name,null);
});
for(const scope of ['actor','student'])for(const finish of ['COMMIT','ROLLBACK'])test('concurrent final '+scope+' admission slot is serialized after '+finish,{skip:!native},async()=>{
  await installAdmission();await as();await fillAdmission(scope==='actor'?4:5);
  if(scope==='student'){await as(actors.educator);await fillAdmission(4,db,5);}
  await db.exec('RESET ROLE');
  const a=await newSession(),b=await newSession();await as(scope==='actor'?actors.family:actors.educator,'authenticated',a);await as(scope==='actor'?actors.family:actors.student,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');await reserve(a,admissionIntent(20));
  const pending=reserve(b,{...admissionIntent(21),...(scope==='actor'?{student:otherStudent}:{})}).then(result=>({result}),error=>({error}));
  try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.error,undefined);
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_attempts')).rows[0].n,scope==='actor'?5:10);
});
for(const patch of [{review:'f'.repeat(64)},{hash:'f'.repeat(64)},{student:otherStudent}])test('admission retry still refuses changed intent '+JSON.stringify(patch),async()=>{
  await installAdmission();await as();await reserve();await assert.rejects(reserve(db,patch),{code:'42501'});
});
test('lost editor access blocks admission retry even when an actor has capacity',async()=>{
  await installAdmission();await as(actors.educator);await reserve();await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator);
  await assert.rejects(reserve(),{code:'42501'});await assert.rejects(reserve(db,admissionIntent(0)),{code:'42501'});
});
for(const finish of ['COMMIT','ROLLBACK'])test('same-intent concurrent admission returns one receipt after '+finish,{skip:!native},async()=>{
  await installAdmission();await as();await fillAdmission(4);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');const first=await reserve(a);
  const pending=reserve(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await a.exec(finish);const outcome=await pending;assert.equal(outcome.error,undefined);assert.deepEqual(outcome.result,first);
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_attempts')).rows[0].n,5);
});
test('current access is rechecked after an admission lock wait',{skip:!native},async()=>{
  await installAdmission();const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.educator,'authenticated',b);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await a.exec('BEGIN');await reserve(a);
  const pending=reserve(b,admissionIntent(1)).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.educator]);await a.exec('COMMIT');const outcome=await pending;assert.equal(outcome.error?.code,'42501');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_attempts')).rows[0].n,1);
});

// Twelfth proposal: read-only held/registered recovery observations, no release.
async function installRecoveryRead(){await installAdmission();await db.exec(recoveryReadProposal);}
async function recoveryRead(client=db,patch={}){
  const input={id:attemptId,review:reviewHash,...patch};
  return (await client.query('SELECT public.read_document_upload_recovery($1,$2) AS receipt',[input.id,input.review])).rows[0].receipt;
}
async function heldRecoveryFixture(actor=actors.family,object=false){
  await installRecoveryRead();await as(actor);await reserve();if(object)await reservedObject(db,{owner:actor});await hold();
}
for(const role of ['family','educator','student'])for(const object of [false,true])test('original '+role+' receives only held metadata observation '+object,async()=>{
  await heldRecoveryFixture(actors[role],object);const before=(await db.query('SELECT * FROM public.document_upload_attempts')).rows;
  const receipt=await recoveryRead();assert.equal(receipt.schema,'document-upload-recovery-v1');assert.equal(receipt.actor_id,actors[role]);assert.equal(receipt.student_id,student);assert.equal(receipt.state,'review_required');assert.equal(receipt.registration,null);
  assert.equal(receipt.metadata.status,object?'observed':'not_observed');assert.equal(receipt.reason,'upload_uncertain');assert.ok(!Number.isNaN(Date.parse(receipt.observed_at)));
  assert.equal('storage_path' in receipt,false);assert.equal('content' in receipt,false);assert.equal('can_delete' in receipt,false);assert.equal('can_retry' in receipt,false);
  if(object){assert.equal(receipt.metadata.version,'held-version-one');assert.match(receipt.metadata.object_id,/^[0-9a-f-]{36}$/);}else assert.deepEqual(receipt.metadata,{status:'not_observed'});
  assert.deepEqual((await db.query('SELECT * FROM public.document_upload_attempts')).rows,before);await assert.rejects(reserve(),{code:'42501'});
});
for(const role of ['school','district','owner'])test('recovery requires original actor and explicit editing for '+role,async()=>{
  await installRecoveryRead();await as(actors[role]);await assert.rejects(recoveryRead(),{code:'42501'});await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);
  await as(actors[role]);await reserve();await hold();assert.equal((await recoveryRead()).actor_id,actors[role]);await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors[role]]);await as(actors[role]);await assert.rejects(recoveryRead(),{code:'42501'});
});
for(const role of ['family','educator'])test('registered '+role+' recovery returns the existing exact document receipt without modifying it',async()=>{
  await installRecoveryRead();await as(actors[role]);await reserve();await reservedObject(db,{owner:actors[role]});await registerReserved(db,{actor:actors[role]});
  const expected=await readRegistration();const receipt=await recoveryRead();assert.equal(receipt.state,'registered');assert.equal(receipt.metadata,null);assert.deepEqual(receipt.registration,expected);
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.documents')).rows[0].n,1);assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,'registered');
});
test('active reservation recovery refuses without silently placing or releasing a hold',async()=>{
  await installRecoveryRead();await as();await reserve();await reservedObject();await assert.rejects(recoveryRead(),{code:'42501'});
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,'reserved');assert.equal((await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n,2);
});
for(const patch of [{id:null},{id:uid(9000)},{review:null},{review:'invalid'},{review:'a'.repeat(64)}])test('recovery refuses unknown or changed intent '+JSON.stringify(patch),async()=>{
  await heldRecoveryFixture();await assert.rejects(recoveryRead(db,patch),{code:'42501'});
});
for(const role of ['educator','student','partner','school','district','owner'])test('other '+role+' cannot recover a known Family upload',async()=>{
  await heldRecoveryFixture();await as(actors[role]);await assert.rejects(recoveryRead(),{code:'42501'});
});
for(const role of ['anon','service_role'])test('recovery observation RPC remains unavailable to '+role,async()=>{
  await heldRecoveryFixture();await as(actors.family,role);await assert.rejects(recoveryRead(),{code:'42501'});
});
for(const change of ["owner_id=NULL","owner_id='"+actors.owner+"'","version=NULL","version=''","version=repeat('x',1025)"])test('recovery refuses unconfirmed owned metadata '+change,async()=>{
  await heldRecoveryFixture(actors.family,true);await db.exec('RESET ROLE');await db.query('UPDATE storage.objects SET '+change+' WHERE name=$1',[student+'/'+attemptId+'-privacy-safe-document.txt']);await as();await assert.rejects(recoveryRead(),{code:'42501'});
});
test('recovery cannot substitute legacy owner for missing managed ownership',async()=>{
  await heldRecoveryFixture(actors.family,true);await db.exec('RESET ROLE;ALTER TABLE storage.objects ADD COLUMN owner uuid;UPDATE storage.objects SET owner=owner_id::uuid;ALTER TABLE storage.objects DROP COLUMN owner_id');
  try{await as();await assert.rejects(recoveryRead(),{code:'42501'});}finally{await db.exec('RESET ROLE;ALTER TABLE storage.objects ADD COLUMN owner_id text;UPDATE storage.objects SET owner_id=owner::text;ALTER TABLE storage.objects DROP COLUMN owner');}
});
test('recovery retains stored quarantine state rather than claiming a registered document is safe',async()=>{
  await installRecoveryRead();await as();await reserve();await reservedObject();await registerReserved();await as(actors.family,'service_role');await db.query("UPDATE public.documents SET scan_status='infected',scan_verdict=' {\"code\":\"infected\"}'::jsonb,archived_at=now() WHERE id=$1",[uid(401)]);await as();
  const receipt=await recoveryRead();assert.equal(receipt.state,'registered');assert.equal(receipt.registration.scan_status,'infected');assert.ok(receipt.registration.archived_at);assert.equal(receipt.metadata,null);
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('recovery refuses a stale observation snapshot '+isolation,async()=>{
  await heldRecoveryFixture();await db.exec('BEGIN ISOLATION LEVEL '+isolation);try{await assert.rejects(recoveryRead(),{code:'42501'});}finally{await db.exec('ROLLBACK');}
});
test('recovery function has narrow grants, fixed path and no ledger mutation grant',async()=>{
  await installRecoveryRead();const signature='public.read_document_upload_recovery(uuid,text)';const fn=(await db.query('SELECT prosecdef,provolatile,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.equal(fn.prosecdef,true);assert.equal(fn.provolatile,'v');assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role']){assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,role==='authenticated');for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await db.query("SELECT has_table_privilege($1,'public.document_upload_attempts',$2) AS ok",[role,privilege])).rows[0].ok,false);}
});
test('recovery refuses installation without the admission safeguards',async()=>{
  await installReviewHold();await assert.rejects(db.exec(recoveryReadProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regprocedure('public.read_document_upload_recovery(uuid,text)') AS fn")).rows[0].fn,null);
});
for(const transition of ['hold','register'])for(const finish of ['COMMIT','ROLLBACK'])test('recovery observes '+transition+' only after '+finish,{skip:!native},async()=>{
  await installRecoveryRead();await as();await reserve();if(transition==='register')await reservedObject();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');if(transition==='hold')await hold(a);else await registerReserved(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=recoveryRead(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;
  if(finish==='ROLLBACK')assert.equal(outcome.error?.code,'42501');else{assert.equal(outcome.error,undefined);assert.equal(outcome.result.state,transition==='hold'?'review_required':'registered');}
});
for(const finish of ['COMMIT','ROLLBACK'])test('recovery metadata version observes a prior trusted update after '+finish,{skip:!native},async()=>{
  await heldRecoveryFixture(actors.family,true);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'authenticated',b);
  await a.exec('BEGIN');await a.query("UPDATE storage.objects SET version='held-version-two' WHERE name=$1",[student+'/'+attemptId+'-privacy-safe-document.txt']);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=recoveryRead(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;assert.equal(outcome.error,undefined);assert.equal(outcome.result.metadata.version,finish==='COMMIT'?'held-version-two':'held-version-one');
});
test('recovery rechecks editing after a hold wait and does not reveal held metadata after removal',{skip:!native},async()=>{
  await installRecoveryRead();await as(actors.educator);await reserve();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.educator,'authenticated',a);await as(actors.educator,'authenticated',b);
  await a.exec('BEGIN');await hold(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=recoveryRead(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}
  await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.educator]);await a.exec('COMMIT');assert.equal((await pending).error?.code,'42501');
});
test('held recovery refuses a conflicting hidden legacy document without exposing its identity',async()=>{
  await heldRecoveryFixture(actors.family,true);await db.exec('RESET ROLE;ALTER TABLE public.documents DISABLE TRIGGER USER');
  try{await db.query('INSERT INTO public.documents(id,student_id,uploaded_by,title,storage_path,archived_at) VALUES($1,$2,$3,$4,$5,now())',[uid(7001),student,actors.owner,'Hidden legacy fixture',student+'/'+attemptId+'-privacy-safe-document.txt']);}finally{await db.exec('ALTER TABLE public.documents ENABLE TRIGGER USER');}
  await as();const error=await recoveryRead().then(()=>null,e=>e);assert.equal(error.code,'42501');assert.equal(error.message,'This upload recovery could not be confirmed.');
});
test('a partner-only role change closes the original uploader recovery path',async()=>{
  await heldRecoveryFixture();await db.exec('RESET ROLE');await db.query("UPDATE public.user_roles SET role='partner' WHERE user_id=$1",[actors.family]);await as();await assert.rejects(recoveryRead(),{code:'42501'});
});
test('same path in another bucket is not student-document metadata evidence',async()=>{
  await heldRecoveryFixture();await db.exec('RESET ROLE');await db.query('INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES($1,$2,$3,$4)',['other-bucket',student+'/'+attemptId+'-privacy-safe-document.txt',actors.family,'foreign-bucket-version']);await as();assert.deepEqual((await recoveryRead()).metadata,{status:'not_observed'});
});

// Thirteenth proposal: immutable original-actor review claim; no terminal IO.
const resolutionOperation=uid(8100);
async function installResolutionClaim(){await installRecoveryRead();await db.exec(resolutionClaimProposal);}
async function claimResolution(client=db,patch={}){
  const input={id:attemptId,review:reviewHash,operation:resolutionOperation,...patch};
  return (await client.query('SELECT public.claim_document_upload_resolution($1,$2,$3) AS receipt',[input.id,input.review,input.operation])).rows[0].receipt;
}
async function resolutionFixture(actor=actors.family){await installResolutionClaim();await as(actor);await reserve();await hold();}
for(const role of ['family','educator','student'])test('original '+role+' can pin one held attempt without file or state mutation',async()=>{
  await resolutionFixture(actors[role]);const before=(await db.query('SELECT * FROM public.document_upload_attempts')).rows;const first=await claimResolution();assert.deepEqual(await claimResolution(),first);
  assert.equal(first.schema,'document-upload-resolution-claim-v1');assert.equal(first.actor_id,actors[role]);assert.equal(first.operation_id,resolutionOperation);assert.equal(first.state,'review_required');assert.equal(first.storage_path,student+'/'+attemptId+'-privacy-safe-document.txt');assert.ok(!Number.isNaN(Date.parse(first.claimed_at)));
  assert.deepEqual((await db.query('SELECT * FROM public.document_upload_attempts')).rows,before);assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,1);
  await db.exec('RESET ROLE');for(const table of ['documents','ai_jobs'])assert.equal((await db.query('SELECT count(*)::int AS n FROM public.'+table)).rows[0].n,0);assert.equal((await db.query('SELECT count(*)::int AS n FROM storage.objects')).rows[0].n,1);
});
for(const role of ['school','district','owner'])test('claim requires explicit student editing rather than '+role+' management',async()=>{
  await installResolutionClaim();await as(actors[role]);await assert.rejects(claimResolution(),{code:'42501'});await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await reserve();await hold();assert.equal((await claimResolution()).actor_id,actors[role]);
});
for(const role of ['educator','student','partner','school','district','owner'])test('known operation key does not authorize another '+role+' to claim Family intent',async()=>{
  await resolutionFixture();await claimResolution();await as(actors[role]);await assert.rejects(claimResolution(),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,0);
});
for(const patch of [{id:null},{id:uid(9999)},{operation:null},{review:null},{review:'invalid'},{review:'f'.repeat(64)}])test('resolution claim refuses changed or incomplete intent '+JSON.stringify(patch),async()=>{
  await resolutionFixture();await assert.rejects(claimResolution(db,patch),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,0);
});
test('a second operation cannot take over an already claimed attempt',async()=>{
  await resolutionFixture();const first=await claimResolution();await assert.rejects(claimResolution(db,{operation:uid(8101)}),{code:'42501'});assert.deepEqual(await claimResolution(),first);
});
test('one actor cannot reuse an operation key for a different held attempt',async()=>{
  await resolutionFixture();await claimResolution();await reserve(db,admissionIntent(1));await hold(db,{id:admissionIntent(1).id});await assert.rejects(claimResolution(db,{id:admissionIntent(1).id}),{code:'42501'});
});
test('operation keys are actor-scoped rather than granting or blocking another actor identity',async()=>{
  await resolutionFixture();await claimResolution();await as(actors.educator);await reserve(db,admissionIntent(1));await hold(db,{id:admissionIntent(1).id});assert.equal((await claimResolution(db,{id:admissionIntent(1).id})).actor_id,actors.educator);
});
for(const state of ['reserved','registered'])test('a '+state+' attempt cannot be turned into a resolution hold implicitly',async()=>{
  await installResolutionClaim();await as();await reserve();if(state==='registered'){await reservedObject();await registerReserved();}await assert.rejects(claimResolution(),{code:'42501'});await db.exec('RESET ROLE');assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,state);
});
test('claimed holds retain their unresolved quota and reject new client insertion/registration',async()=>{
  await resolutionFixture();await claimResolution();await fillAdmission(4);await assert.rejects(reserve(db,admissionIntent(4)),{code:'42501'});await assert.rejects(reservedObject(),{code:'42501'});await assert.rejects(registerReserved(),{code:'42501'});await assert.rejects(reserve(),{code:'42501'});assert.equal((await recoveryRead()).state,'review_required');
});
for(const update of ["state='reserved',held_at=NULL,hold_reason=NULL","actor_id='"+actors.owner+"'","claimed_content_sha256=repeat('e',64)","review_context_sha256=repeat('e',64)","created_at='2000-01-01'","hold_reason='user_cancelled'"])test('claimed attempt ordinary database updates remain frozen: '+update,async()=>{
  await resolutionFixture();await claimResolution();await db.exec('RESET ROLE');await assert.rejects(db.exec('UPDATE public.document_upload_attempts SET '+update),{code:'42501'});
});
for(const action of ["UPDATE public.document_upload_resolution_claims SET operation_id=gen_random_uuid()","UPDATE public.document_upload_resolution_claims SET claimed_at='2000-01-01'","UPDATE public.document_upload_resolution_claims SET operation_id=operation_id","DELETE FROM public.document_upload_resolution_claims","DELETE FROM public.document_upload_attempts"])test('ordinary owner statements cannot erase or rewrite a committed claim: '+action,async()=>{
  await resolutionFixture();const first=await claimResolution();await db.exec('RESET ROLE');await assert.rejects(db.exec(action),{code:'42501'});await as();assert.deepEqual(await claimResolution(),first);
});
test('lost editing closes both claim confirmation and claim-table visibility without dropping the claim',async()=>{
  await resolutionFixture(actors.educator);await claimResolution();await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.educator]);await as(actors.educator);await assert.rejects(claimResolution(),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,0);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_resolution_claims')).rows[0].n,1);
});
test('partner-only role changes cannot claim an original upload',async()=>{
  await resolutionFixture();await db.exec('RESET ROLE');await db.query("UPDATE public.user_roles SET role='partner' WHERE user_id=$1",[actors.family]);await as();await assert.rejects(claimResolution(),{code:'42501'});
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('claim refuses stale snapshot mode '+isolation,async()=>{
  await resolutionFixture();await db.exec('BEGIN ISOLATION LEVEL '+isolation);try{await assert.rejects(claimResolution(),{code:'42501'});}finally{await db.exec('ROLLBACK');}
});
test('claim installation preserves old held rows and does not block unclaimed registration',async()=>{
  await heldRecoveryFixture();await db.exec('RESET ROLE');const before=(await db.query('SELECT * FROM public.document_upload_attempts')).rows;await db.exec(resolutionClaimProposal);assert.deepEqual((await db.query('SELECT * FROM public.document_upload_attempts')).rows,before);assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,0);
  await as();await reserve(db,admissionIntent(1));const p=student+'/'+admissionIntent(1).id+'-privacy-safe-document.txt';await reservedObject(db,{path:p});await registerReserved(db,{attempt:admissionIntent(1).id,path:p,hash:admissionIntent(1).hash});assert.equal((await db.query('SELECT state FROM public.document_upload_attempts WHERE id=$1',[admissionIntent(1).id])).rows[0].state,'registered');
});
test('claim exposes no direct mutation or anonymous/service execution grant',async()=>{
  await installResolutionClaim();const signature='public.claim_document_upload_resolution(uuid,text,uuid)';for(const role of ['anon','authenticated','service_role']){
    assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,role==='authenticated');for(const privilege of ['INSERT','UPDATE','DELETE'])assert.equal((await db.query("SELECT has_table_privilege($1,'public.document_upload_resolution_claims',$2) AS ok",[role,privilege])).rows[0].ok,false);
  }
  for(const fn of [signature,'public.guard_claimed_upload_attempt()','public.reject_upload_resolution_claim_mutation()']){const row=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[fn])).rows[0];assert.equal(row.prosecdef,true);assert.deepEqual(row.proconfig,['search_path=pg_catalog']);}
});
for(const role of ['anon','service_role'])test('resolution RPC and ledger reads remain unavailable to '+role,async()=>{
  await resolutionFixture();await claimResolution();await as(actors.family,role);await assert.rejects(claimResolution(),{code:'42501'});await assert.rejects(db.query('SELECT * FROM public.document_upload_resolution_claims'),{code:'42501'});
});
test('resolution claim requires the preceding recovery proposal',async()=>{
  await installAdmission();await assert.rejects(db.exec(resolutionClaimProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.document_upload_resolution_claims') AS name")).rows[0].name,null);
});
for(const same of [true,false])for(const finish of ['COMMIT','ROLLBACK'])test('competing resolution operation same='+same+' waits for '+finish,{skip:!native},async()=>{
  await resolutionFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);await a.exec('BEGIN');const first=await claimResolution(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=claimResolution(b,{operation:same?resolutionOperation:uid(8101)}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(!same&&finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else{assert.equal(outcome.error,undefined);assert.equal(outcome.result.operation_id,same?resolutionOperation:uid(8101));if(same&&finish==='COMMIT')assert.deepEqual(outcome.result,first);}
});
for(const finish of ['COMMIT','ROLLBACK'])test('attempt reopening waits for resolution claim '+finish,{skip:!native},async()=>{
  await resolutionFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await a.exec('BEGIN');await claimResolution(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=b.exec("UPDATE public.document_upload_attempts SET state='reserved',held_at=NULL,hold_reason=NULL").then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.error,undefined);
});
for(const finish of ['COMMIT','ROLLBACK'])test('resolution waits for the original hold '+finish,{skip:!native},async()=>{
  await installResolutionClaim();await as();await reserve();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);await a.exec('BEGIN');await hold(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=claimResolution(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(finish==='ROLLBACK')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.error,undefined);
});
for(const finish of ['COMMIT','ROLLBACK'])test('cross-attempt operation key reuse serializes after '+finish,{skip:!native},async()=>{
  await resolutionFixture();await reserve(db,admissionIntent(1));await hold(db,{id:admissionIntent(1).id});await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);await a.exec('BEGIN');await claimResolution(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=claimResolution(b,{id:admissionIntent(1).id}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.error,undefined);
});
test('claim rechecks current editing after waiting for a held attempt',{skip:!native},async()=>{
  await installResolutionClaim();await as(actors.educator);await reserve();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.educator,'authenticated',a);await as(actors.educator,'authenticated',b);await a.exec('BEGIN');await hold(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=claimResolution(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[actors.educator]);await a.exec('COMMIT');assert.equal((await pending).error?.code,'42501');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_resolution_claims')).rows[0].n,0);
});

for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('attempt mutation cannot bypass a resolution claim with '+isolation+' snapshot',async()=>{
  await resolutionFixture();await claimResolution();await db.exec('RESET ROLE');await db.exec('BEGIN ISOLATION LEVEL '+isolation);try{await assert.rejects(db.exec("UPDATE public.document_upload_attempts SET state='reserved',held_at=NULL,hold_reason=NULL"),{code:'42501'});}finally{await db.exec('ROLLBACK');}
});
test('claim refuses a conflicting hidden legacy document without claiming cleanup authority',async()=>{
  await resolutionFixture();await db.exec('RESET ROLE;ALTER TABLE public.documents DISABLE TRIGGER USER');try{await db.query('INSERT INTO public.documents(student_id,uploaded_by,title,storage_path,archived_at) VALUES($1,$2,$3,$4,now())',[student,actors.owner,'Hidden legacy fixture',student+'/'+attemptId+'-privacy-safe-document.txt']);}finally{await db.exec('ALTER TABLE public.documents ENABLE TRIGGER USER');}await as();await assert.rejects(claimResolution(),{code:'42501'});assert.equal((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows.length,0);
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('old '+isolation+' writer cannot miss a claim committed during its lock wait',{skip:!native},async()=>{
  await resolutionFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await b.exec('BEGIN ISOLATION LEVEL '+isolation);await b.query('SELECT id FROM public.document_upload_attempts WHERE id=$1',[attemptId]);await a.exec('BEGIN');await claimResolution(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const pending=b.exec("UPDATE public.document_upload_attempts SET state='reserved',held_at=NULL,hold_reason=NULL").then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;await b.exec('ROLLBACK');throw error;}await a.exec('COMMIT');const outcome=await pending;await b.exec('ROLLBACK');assert.equal(outcome.error?.code,'42501');assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,'review_required');
});

// Confirm the existing verified worker boundary remains closed for held uploads.
for(const role of ['family','educator','student','school','district','owner'])for(const reference of ['missing-document','attempt-as-document','path-only'])test('claimed '+role+' upload cannot source or complete a summary through '+reference,async()=>{
  await installResolutionClaim();if(['school','district','owner'].includes(role))await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await reserve();await hold();await claimResolution();
  const queued={storage_path:student+'/'+attemptId+'-privacy-safe-document.txt',upload_attempt_id:attemptId,document_text:'Fictional queued text'};if(reference!=='path-only')queued.document_id=reference==='attempt-as-document'?attemptId:uid(401);
  await as('','service_role');await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status,locked_at,attempts,input_source) VALUES($1,$2,$3,'document_summary','processing',$4,1,$5)",[summaryId,student,actors[role],claimAt,queued]);
  await assert.rejects(readVerified(),{code:'42501'});await assert.rejects(finishVerified({actor_id:actors[role],student_id:student,document_id:uid(401),object_id:uid(999),object_version:'fictional-version',content_sha256:claimedHash,context:{}}),{code:'42501'});
  const job=(await db.query('SELECT status,result_payload FROM public.ai_jobs WHERE id=$1',[summaryId])).rows[0];assert.equal(job.status,'processing');assert.equal(job.result_payload,null);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,'review_required');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_resolution_claims')).rows[0].n,1);
});
test('queued held path cannot substitute for a different legitimate saved source document',async()=>{
  const doc=await verifiedSourceFixture();await db.exec('RESET ROLE');for(const sqlText of [reservationProposal,registrationProposal,quarantineReadProposal,reviewHoldProposal,admissionProposal,recoveryReadProposal,resolutionClaimProposal])await db.exec(sqlText);await as();await reserve();await hold();await claimResolution();await as('','service_role');
  await db.query('UPDATE public.ai_jobs SET input_source=$1 WHERE id=$2',[{document_id:doc,storage_path:student+'/'+attemptId+'-privacy-safe-document.txt',upload_attempt_id:attemptId,document_text:'Fictional held text'},summaryId]);const source=await readVerified();assert.equal(source.document_id,doc);assert.equal(source.storage_path,path);assert.notEqual(source.storage_path,student+'/'+attemptId+'-privacy-safe-document.txt');
});
async function catalogInventory(){return (await db.query(referenceCatalog)).rows[0].inventory;}
test('reference catalog is metadata-only and discovers reciprocal claims, JSON jobs and guards',async()=>{
  await resolutionFixture();await claimResolution();await db.exec('RESET ROLE');const before=(await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows;await db.exec('BEGIN READ ONLY;SET LOCAL ROLE tf_document_catalog_reader');let inventory;try{inventory=await catalogInventory();}finally{await db.exec('ROLLBACK');}
  assert.equal(inventory.schema,'document-reference-catalog-v1');assert.equal(inventory.reader_role,'tf_document_catalog_reader');assert.equal(inventory.read_only_transaction,true);assert.equal(inventory.reader_can_select_protected_relations,false);assert.equal(inventory.reader_can_select_job_rows,false);assert.equal(inventory.catalog_metadata_only,true);assert.equal(inventory.data_rows_inspected,false);assert.equal(inventory.reference_inventory_complete,false);assert.equal(inventory.cleanup_authorized,false);assert.equal(inventory.targets.length,4);assert.ok(inventory.targets.every(t=>t.present));
  assert.ok(inventory.foreign_keys.some(k=>k.source_table==='public.document_upload_resolution_claims'&&k.target_table==='public.document_upload_attempts'&&k.delete_action==='restrict'));assert.ok(inventory.untyped_json_candidates.some(c=>c.table_name==='public.ai_jobs'&&c.column_name==='input_source'));assert.ok(inventory.triggers.some(t=>t.name==='upload_attempt_resolution_frozen'&&t.enabled==='O'));assert.ok(inventory.routine_candidates.some(r=>r.signature.startsWith('public.read_verified_document_summary_source(')));assert.deepEqual((await db.query('SELECT * FROM public.document_upload_resolution_claims')).rows,before);assert.ok(!JSON.stringify(inventory).includes(resolutionOperation));
});
test('catalog discovers a new FK with cascade behavior and an opaque JSON reference channel',async()=>{
  await installResolutionClaim();await db.exec('CREATE TABLE public.fixture_unreviewed_reference(id uuid,opaque_payload jsonb,doc uuid REFERENCES public.documents(id) ON DELETE CASCADE)');try{const inventory=await catalogInventory();assert.ok(inventory.foreign_keys.some(k=>k.source_table==='public.fixture_unreviewed_reference'&&k.source_columns[0]==='doc'&&k.delete_action==='cascade'));assert.ok(inventory.untyped_json_candidates.some(c=>c.table_name==='public.fixture_unreviewed_reference'&&c.column_name==='opaque_payload'));assert.equal(inventory.reference_inventory_complete,false);}finally{await db.exec('DROP TABLE public.fixture_unreviewed_reference');}
});

// Fourteenth proposal: retained first-source identity before worker IO.
async function sourceBindingFixture(admit=true){
  const doc=await verifiedSourceFixture();await db.exec('RESET ROLE');for(const text of [reservationProposal,registrationProposal,quarantineReadProposal,reviewHoldProposal,admissionProposal,recoveryReadProposal,resolutionClaimProposal,sourceBindingProposal])await db.exec(text);await as('','service_role');return {doc,source:admit?await readVerified():null};
}
async function bindings(){await db.exec('RESET ROLE');return (await db.query('SELECT * FROM public.document_summary_source_bindings ORDER BY job_id')).rows;}
test('first source admission persists one immutable identity and no document text or privacy context',async()=>{
  const {doc,source}=await sourceBindingFixture();await readVerified();const rows=await bindings();assert.equal(rows.length,1);assert.equal(rows[0].document_id,doc);assert.equal(rows[0].object_id,source.object_id);assert.equal(rows[0].object_version,source.object_version);assert.equal(rows[0].content_sha256,source.content_sha256);assert.equal(rows[0].first_claim_attempt,1);assert.equal('context' in rows[0],false);assert.equal('document_text' in rows[0],false);assert.equal('result_payload' in rows[0],false);assert.ok(!JSON.stringify(rows).includes('UNTRUSTED'));
});
test('completion without an earlier admission cannot manufacture a binding',async()=>{
  const {doc}=await sourceBindingFixture(false);await assert.rejects(finishVerified({actor_id:actors.family,student_id:student,document_id:doc,object_id:uid(999),object_version:'fictional',content_sha256:'a'.repeat(64),context:{}}),{code:'42501'});assert.equal((await bindings()).length,0);
});
test('admission and completion cannot claim previously committed provenance in the same transaction',async()=>{
  await sourceBindingFixture(false);await db.exec('BEGIN');try{const source=await readVerified();await assert.rejects(finishVerified(source),{code:'42501'});}finally{await db.exec('ROLLBACK');}assert.equal((await bindings()).length,0);
});
test('verified completion retains the original binding after job status changes',async()=>{
  const {source}=await sourceBindingFixture();const before=await bindings();await as('','service_role');assert.equal((await finishVerified(source)).rows[0].receipt.status,'completed');assert.deepEqual(await bindings(),before);await as('','service_role');await assert.rejects(db.query('DELETE FROM public.ai_jobs WHERE id=$1',[summaryId]),{code:'42501'});
});
for(const patch of ["input_source='{}'::jsonb","student_id='"+otherStudent+"'","triggered_by_user_id='"+actors.owner+"'","job_type='meeting_prep'","id=gen_random_uuid()"] )test('a bound job cannot change its source identity: '+patch,async()=>{
  await sourceBindingFixture();await assert.rejects(db.exec('UPDATE public.ai_jobs SET '+patch),{code:'42501'});assert.equal((await bindings()).length,1);
});
for(const patch of ["object_version='changed'","content_sha256=repeat('b',64)","first_claim_attempt=2","bound_at='2000-01-01'"])test('ordinary owner statements cannot rewrite a source binding: '+patch,async()=>{
  await sourceBindingFixture();await db.exec('RESET ROLE');await assert.rejects(db.exec('UPDATE public.document_summary_source_bindings SET '+patch),{code:'42501'});
});
test('ordinary owner deletion cannot erase source history or delete the referenced document/student',async()=>{
  const {doc}=await sourceBindingFixture();await db.exec('RESET ROLE');await assert.rejects(db.exec('DELETE FROM public.document_summary_source_bindings'),{code:'42501'});await assert.rejects(db.query('DELETE FROM public.documents WHERE id=$1',[doc]),e=>['23001','23503'].includes(e.code)&&e.message.includes('document_summary_source_bindings_document_id_fkey'));await assert.rejects(db.query('DELETE FROM public.students WHERE id=$1',[student]),e=>['23001','23503','42501'].includes(e.code));assert.equal((await bindings()).length,1);assert.equal((await db.query('SELECT id FROM public.documents WHERE id=$1',[doc])).rows.length,1);assert.equal((await db.query('SELECT id FROM public.students WHERE id=$1',[student])).rows.length,1);
});
test('changed but newly valid document hash cannot silently rebind the original job',async()=>{
  const {source}=await sourceBindingFixture();await db.query("UPDATE public.documents SET content_hash=$1,scan_verdict=jsonb_set(scan_verdict,'{content_sha256}',to_jsonb($1::text))",['b'.repeat(64)]);await assert.rejects(readVerified(),{code:'42501'});await assert.rejects(finishVerified(source),{code:'42501'});assert.equal((await bindings())[0].content_sha256,'a'.repeat(64));
});
test('same-source manual processing claim can retain the first binding but does not authorize retry',async()=>{
  const {source}=await sourceBindingFixture();const before=await bindings();await as('','service_role');await db.query("UPDATE public.ai_jobs SET status='needs_review',locked_at=NULL WHERE id=$1",[summaryId]);await db.query("UPDATE public.ai_jobs SET status='processing',locked_at=$1,attempts=2 WHERE id=$2",['2026-10-27T12:01:00Z',summaryId]);const current=await readVerified(db,'2026-10-27T12:01:00Z',2);assert.equal(current.document_id,source.document_id);assert.deepEqual(await bindings(),before);
});
test('source invalidation stops completion while retaining its durable reference',async()=>{
  const {source}=await sourceBindingFixture();await db.exec("UPDATE public.documents SET scan_status='infected',archived_at=now()");await assert.rejects(finishVerified(source),{code:'42501'});assert.equal((await bindings()).length,1);
});
test('student privacy context is revalidated without storing a duplicate in the binding',async()=>{
  const {source}=await sourceBindingFixture();await db.exec("RESET ROLE;UPDATE public.students SET last_name='Fictional changed context'");await as('','service_role');await assert.rejects(finishVerified(source),{code:'42501'});assert.equal('context' in (await bindings())[0],false);
});
test('unbound unrelated jobs retain their normal maintenance behavior',async()=>{
  await sourceBindingFixture(false);const id=(await db.query("INSERT INTO public.ai_jobs(triggered_by_user_id,job_type) VALUES($1,'meeting_prep') RETURNING id",[actors.family])).rows[0].id;assert.equal((await db.query("UPDATE public.ai_jobs SET status='completed' WHERE id=$1 RETURNING id",[id])).rows.length,1);assert.equal((await db.query('DELETE FROM public.ai_jobs WHERE id=$1 RETURNING id',[id])).rows.length,1);
});
for(const role of ['anon','authenticated','service_role'])test('no direct source binding table access is granted to '+role,async()=>{
  await sourceBindingFixture();await as(actors.family,role);for(const sql of ['SELECT * FROM public.document_summary_source_bindings','UPDATE public.document_summary_source_bindings SET job_id=job_id','DELETE FROM public.document_summary_source_bindings'])await assert.rejects(db.exec(sql),{code:'42501'});
});
test('binding is not backfilled from an already processing job or from unavailable source metadata',async()=>{
  await sourceBindingFixture(false);assert.equal((await bindings()).length,0);await as('','service_role');await db.exec("UPDATE storage.objects SET version='changed'");await assert.rejects(readVerified(),{code:'42501'});assert.equal((await bindings()).length,0);
});
test('binding proposal refuses missing reviewed upload prerequisites',async()=>{
  await verifiedSourceFixture();await db.exec('RESET ROLE');await assert.rejects(db.exec(sourceBindingProposal),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.document_summary_source_bindings') AS name")).rows[0].name,null);
});
for(const finish of ['COMMIT','ROLLBACK'])test('two source admissions retain one binding after '+finish,{skip:!native},async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await a.exec('BEGIN');const source=await readVerified(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=readVerified(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;assert.equal(outcome.error,undefined);assert.deepEqual(outcome.result,source);assert.equal((await bindings()).length,1);
});
for(const action of ['retarget','delete-job','delete-document'])for(const finish of ['COMMIT','ROLLBACK'])test(action+' waits for source admission '+finish,{skip:!native},async()=>{
  const {doc}=await sourceBindingFixture(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as('','service_role',a);await a.exec('BEGIN');await readVerified(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  const sql=action==='retarget'?"UPDATE public.ai_jobs SET input_source='{}'::jsonb":action==='delete-job'?'DELETE FROM public.ai_jobs':'DELETE FROM public.documents WHERE id=$1';const pending=b.query(sql,action==='delete-document'?[doc]:[]).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(finish==='COMMIT'){if(action==='delete-document')assert.ok(['23001','23503'].includes(outcome.error?.code)&&outcome.error.message.includes('document_summary_source_bindings_document_id_fkey'));else assert.equal(outcome.error?.code,'42501');}else assert.equal(outcome.error,undefined);
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('old '+isolation+' job writer cannot miss a newly committed binding',{skip:!native},async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as('','service_role',a);await b.exec('BEGIN ISOLATION LEVEL '+isolation);await b.query('SELECT id FROM public.ai_jobs WHERE id=$1',[summaryId]);await a.exec('BEGIN');await readVerified(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=b.exec("UPDATE public.ai_jobs SET input_source='{}'::jsonb").then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;await b.exec('ROLLBACK');throw error;}await a.exec('COMMIT');const outcome=await pending;await b.exec('ROLLBACK');assert.equal(outcome.error?.code,'42501');
});

test('lost current editing stops bound completion without erasing provenance',async()=>{
  const {source}=await sourceBindingFixture();await db.exec('RESET ROLE');await db.query('UPDATE public.students SET owner_id=$1 WHERE id=$2',[actors.owner,student]);await as('','service_role');await assert.rejects(finishVerified(source),{code:'42501'});assert.equal((await bindings()).length,1);
});
for(const finish of ['COMMIT','ROLLBACK'])test('bound completion has one committed winner after '+finish,{skip:!native},async()=>{
  const {source}=await sourceBindingFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await a.exec('BEGIN');await finishVerified(source,{},a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=finishVerified(source,{},b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);}catch(error){await a.exec('ROLLBACK');await pending;throw error;}await a.exec(finish);const outcome=await pending;if(finish==='COMMIT')assert.equal(outcome.error?.code,'42501');else assert.equal(outcome.result.rows[0].receipt.status,'completed');assert.equal((await bindings()).length,1);assert.equal((await db.query('SELECT status FROM public.ai_jobs WHERE id=$1',[summaryId])).rows[0].status,'completed');
});

test('restricted catalog discovers retained job/document source references without reading binding rows',async()=>{
  await sourceBindingFixture();await db.exec('RESET ROLE;BEGIN READ ONLY;SET LOCAL ROLE tf_document_catalog_reader');let x;try{x=await catalogInventory();}finally{await db.exec('ROLLBACK');}assert.ok(x.foreign_keys.some(k=>k.source_table==='public.document_summary_source_bindings'&&k.target_table==='public.ai_jobs'&&k.delete_action==='restrict'));assert.ok(x.foreign_keys.some(k=>k.source_table==='public.document_summary_source_bindings'&&k.target_table==='public.documents'&&k.delete_action==='restrict'));const grants=x.effective_table_grants.filter(g=>g.table_name==='public.document_summary_source_bindings');assert.equal(grants.length,3);assert.ok(grants.every(g=>!g.can_select&&!g.can_insert&&!g.can_update&&!g.can_delete&&!g.can_truncate));assert.ok(x.named_reference_candidates.some(c=>c.table_name==='public.document_summary_source_bindings'&&c.column_name==='object_id'));assert.ok(x.routine_candidates.some(r=>r.signature.startsWith('public.guard_bound_document_summary_job(')));assert.equal(x.cleanup_authorized,false);
});

// Counts-only review. Never infer worker quiescence or grant rollout authority.
async function summaryRolloutInventory(client=db){
  const [guard,query]=rolloutInventory.split('-- COUNTS QUERY\n');
  assert.ok(query);try{await client.exec(guard);const result=await client.query(query.replace(/\nCOMMIT;\s*$/,''));await client.exec('COMMIT');return result.rows[0].inventory;}catch(error){await client.exec('ROLLBACK');throw error;}
}
function reviewState(x,state){return x.by_state.find(s=>s.state===state);}
test('empty source inventory stays non-authorizing and read-only',async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE;DELETE FROM public.ai_jobs');const x=await summaryRolloutInventory();assert.equal(x.unbound_reconciliation_count,0);assert.equal(x.retained_binding_count,0);assert.equal(x.read_only_transaction,true);for(const key of ['worker_quiescence_verified','provider_work_reconciled','retention_review_complete','rollout_authorized','cleanup_authorized'])assert.equal(x[key],false);
});
for(const bound of [false,true])for(const state of ['queued','processing','needs_review','completed','failed'])test('source review counts '+state+' '+(bound?'bound':'unbound')+' without changing jobs',async()=>{
  const {doc}=await sourceBindingFixture(bound);await db.exec('RESET ROLE');await db.query("UPDATE public.ai_jobs SET status=$1,locked_at=CASE WHEN $1='processing' THEN $2::timestamptz ELSE NULL END",[state,claimAt]);const before=(await db.query('SELECT * FROM public.ai_jobs')).rows;const x=await summaryRolloutInventory();assert.equal(reviewState(x,state)[bound?'bound':'unbound'],1);assert.equal(x.unbound_reconciliation_count,bound?0:1);assert.equal(x.retained_binding_count,bound?1:0);assert.equal(x.retained_job_identity_conflict_count,0);assert.equal(x.retained_document_identity_conflict_count,0);assert.deepEqual((await db.query('SELECT * FROM public.ai_jobs')).rows,before);assert.equal(x.rollout_authorized,false);for(const secret of [summaryId,doc,student,actors.family,path,'a'.repeat(64)])assert.ok(!JSON.stringify(x).includes(secret));
});
test('unknown schema-drift states and missing claim fields are explicit, not omitted rows',async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE;ALTER TABLE public.ai_jobs DROP CONSTRAINT ai_jobs_status_check');
  try{await db.exec("UPDATE public.ai_jobs SET status='unrecognized-state',locked_at=now()");const x=await summaryRolloutInventory();assert.equal(x.unknown_state_count,1);assert.equal(x.nonprocessing_locked_count,1);assert.equal(x.unbound_reconciliation_count,1);}
  finally{await db.exec("UPDATE public.ai_jobs SET status='processing',locked_at=NULL,attempts=0;ALTER TABLE public.ai_jobs ADD CONSTRAINT ai_jobs_status_check CHECK(status IN ('queued','processing','completed','failed','needs_review'))");}
  const x=await summaryRolloutInventory();assert.equal(x.processing_claim_conflict_count,1);
});
test('retained document hash changes are counted without emitting either hash or source text',async()=>{
  await sourceBindingFixture();await db.exec('RESET ROLE');await db.query("UPDATE public.documents SET content_hash=$1,scan_verdict=jsonb_set(scan_verdict,'{content_sha256}',to_jsonb($1::text))",['b'.repeat(64)]);const x=await summaryRolloutInventory();assert.equal(x.retained_document_identity_conflict_count,1);assert.equal(x.retained_job_identity_conflict_count,0);assert.ok(!JSON.stringify(x).includes('b'.repeat(64)));
});
for(const role of ['anon','authenticated','service_role','tf_document_catalog_reader'])test('source rollout inventory rejects incomplete visibility for '+role,async()=>{
  await sourceBindingFixture();await db.exec('RESET ROLE;SET ROLE '+role);await assert.rejects(summaryRolloutInventory(),{code:'42501'});
});
test('SELECT grants with active RLS cannot turn hidden jobs into an empty rollout inventory',async()=>{
  await sourceBindingFixture();await db.exec('RESET ROLE;GRANT SELECT ON public.document_summary_source_bindings TO authenticated;SET ROLE authenticated');try{await assert.rejects(summaryRolloutInventory(),{code:'42501'});}finally{await db.exec('RESET ROLE;REVOKE SELECT ON public.document_summary_source_bindings FROM authenticated');}
});
test('missing retained-source prerequisites stop the inventory rather than reporting empty',async()=>{
  await verifiedSourceFixture();await db.exec('RESET ROLE');await assert.rejects(summaryRolloutInventory(),{code:'55000'});
});
for(const finish of ['COMMIT','ROLLBACK'])test('counts cannot see uncommitted source admission after '+finish,{skip:!native},async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE');const a=await newSession();await as('','service_role',a);await a.exec('BEGIN');await readVerified(a);try{const during=await summaryRolloutInventory();assert.equal(reviewState(during,'processing').unbound,1);assert.equal(during.retained_binding_count,0);await a.exec(finish);const after=await summaryRolloutInventory();assert.equal(after.retained_binding_count,finish==='COMMIT'?1:0);assert.equal(after.worker_quiescence_verified,false);}finally{await a.exec('ROLLBACK');}
});
for(const finish of ['COMMIT','ROLLBACK'])test('read-only source inventory holds table/RLS DDL until '+finish,{skip:!native},async()=>{
  await sourceBindingFixture(false);await db.exec('RESET ROLE');const [guard,query]=rolloutInventory.split('-- COUNTS QUERY\n');await db.exec(guard);const writer=await newSession();await writer.exec('BEGIN');const pid=(await writer.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=writer.exec('ALTER TABLE public.ai_jobs FORCE ROW LEVEL SECURITY').then(result=>({result}),error=>({error}));try{await waitForLock(pid);const x=(await db.query(query.replace(/\nCOMMIT;\s*$/,''))).rows[0].inventory;assert.equal(reviewState(x,'processing').unbound,1);assert.equal(x.rollout_authorized,false);await db.exec(finish);assert.equal((await pending).error,undefined);}finally{await db.exec('ROLLBACK');await writer.exec('ROLLBACK');await pending;}
});

// Independent atomic application proposal; no provider calls or hosted data.
const applyId=uid(701);
const applySections={strengths:{state:'accepted',value:'Fictional strengths'},supports:{state:'edited',value:'Fictional written supports'},needs:{state:'rejected',value:'Must not apply'}};
async function atomicApplyFixture({baseOnly=false}={}){
  let doc;
  if(baseOnly){await as();doc=(await insert()).rows[0].id;await db.exec("RESET ROLE;UPDATE public.documents SET scan_status='clean'");}
  else ({doc}=await sourceBindingFixture(false));await db.exec('RESET ROLE');
  await db.exec(`ALTER TABLE public.students ADD COLUMN IF NOT EXISTS grade_band text,ADD COLUMN IF NOT EXISTS strengths_summary text,ADD COLUMN IF NOT EXISTS interests_summary text,ADD COLUMN IF NOT EXISTS support_needs_summary text,ADD COLUMN IF NOT EXISTS student_voice_statement text,ADD COLUMN IF NOT EXISTS family_priorities text;
    CREATE TABLE public.document_extractions(id uuid PRIMARY KEY,document_id uuid NOT NULL REFERENCES public.documents(id),student_id uuid NOT NULL REFERENCES public.students(id),status text NOT NULL,sections jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),reviewer_id uuid,reviewed_at timestamptz);
    CREATE FUNCTION public.fixture_extraction_revision() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at:=clock_timestamp();RETURN NEW;END$$;
    CREATE TRIGGER document_extractions_set_updated_at BEFORE UPDATE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.fixture_extraction_revision();
    CREATE TABLE public.transition_profiles(id uuid DEFAULT gen_random_uuid(),student_id uuid PRIMARY KEY REFERENCES public.students(id),transportation_goal text,current_services_summary text,education_training_goal text);
    CREATE TABLE public.evidence_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),student_id uuid,kind text,subject_type text,subject_id uuid,source_kind text,source_id uuid,contributor_id uuid,occurred_at timestamptz,verification_state text,permission_scope text,payload jsonb,extraction_id uuid);
    CREATE UNIQUE INDEX evidence_items_source_unique ON public.evidence_items(student_id,source_kind,source_id) WHERE source_id IS NOT NULL;
    CREATE TABLE public.audit_log(id uuid DEFAULT gen_random_uuid(),actor_id uuid,action text,entity_type text,entity_id uuid,student_id uuid,metadata jsonb);
    GRANT SELECT,UPDATE ON public.students TO authenticated;
    ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_student_read ON public.students FOR SELECT TO authenticated USING(public.can_access_student(auth.uid(),id));
    CREATE POLICY fixture_student_edit ON public.students FOR UPDATE TO authenticated USING(public.can_edit_student(auth.uid(),id)) WITH CHECK(public.can_edit_student(auth.uid(),id));
    GRANT ALL ON public.document_extractions,public.transition_profiles,public.evidence_items,public.audit_log TO authenticated;
    ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;ALTER TABLE public.transition_profiles ENABLE ROW LEVEL SECURITY;ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY fixture_extraction ON public.document_extractions FOR ALL TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));
    CREATE POLICY fixture_transition ON public.transition_profiles FOR ALL TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));
    CREATE POLICY fixture_evidence ON public.evidence_items FOR ALL TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));`);
  await db.query("UPDATE public.students SET strengths_summary='Original strength',family_priorities='Keep this priority' WHERE id=$1",[student]);
  const row=(await db.query("INSERT INTO public.document_extractions(id,document_id,student_id,status,sections) VALUES($1,$2,$3,'in_review',$4) RETURNING updated_at::text AS revision",[applyId,doc,student,applySections])).rows[0];await db.exec(atomicExtractionProposal);await as();return {doc,revision:row.revision};
}
function applyAtomic(f,{client=db,studentId=student,documentId=f.doc,sections=applySections,revision=f.revision,evidence=true}={}){return client.query('SELECT public.apply_reviewed_document_extraction($1,$2,$3,$4,$5,$6) AS receipt',[applyId,studentId,documentId,revision,sections,evidence]);}
async function applicationSnapshot(){await db.exec('RESET ROLE');return {student:(await db.query('SELECT * FROM public.students WHERE id=$1',[student])).rows,profiles:(await db.query('SELECT * FROM public.transition_profiles')).rows,extraction:(await db.query('SELECT * FROM public.document_extractions')).rows,evidence:(await db.query('SELECT * FROM public.evidence_items')).rows,audit:(await db.query('SELECT * FROM public.audit_log')).rows};}
for(const [role,actor] of Object.entries(actors))test('atomic extraction preserves explicit edit rules for '+role,async()=>{
  const f=await atomicApplyFixture();await as(actor);if(['family','educator','student'].includes(role)){const x=(await applyAtomic(f)).rows[0].receipt;assert.equal(x.status,'complete');assert.equal(x.evidence_saved,true);}else await assert.rejects(applyAtomic(f),{code:'42501'});
});
for(const role of ['school','district','owner'])test('atomic extraction allows explicitly linked editor '+role,async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);assert.equal((await applyAtomic(f)).rows[0].receipt.status,'complete');});
for(const evidence of [false,true])test('atomic extraction commits exact fields, completion and audit with evidence '+evidence,async()=>{
 const f=await atomicApplyFixture();const receipt=(await applyAtomic(f,{evidence})).rows[0].receipt;const x=await applicationSnapshot();assert.equal(x.student[0].strengths_summary,'Fictional strengths');assert.equal(x.student[0].family_priorities,'Keep this priority');assert.equal(x.student[0].support_needs_summary,null);assert.equal(x.profiles[0].current_services_summary,'Fictional written supports');assert.equal(x.extraction[0].status,'complete');assert.equal(x.audit.length,1);assert.equal(x.evidence.length,evidence?1:0);assert.equal(receipt.evidence_id!==null,evidence);assert.ok(!JSON.stringify(x.audit).includes('Fictional written supports'));await as();await assert.rejects(applyAtomic(f,{evidence}),{code:'42501'});
});
for(const table of ['students','transition_profiles','document_extractions','evidence_items','audit_log'])for(const mode of ['raise','skip'])test('atomic extraction rolls everything back for '+table+' '+mode,async()=>{
 const f=await atomicApplyFixture();await db.exec('RESET ROLE');const before=await applicationSnapshot();await db.exec("CREATE FUNCTION public.fixture_fail_apply() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN "+(mode==='raise'?"RAISE EXCEPTION 'Fictional write failure' USING ERRCODE='42501';":"RETURN NULL;")+" END$$;CREATE TRIGGER fixture_reject BEFORE INSERT OR UPDATE ON public."+table+" FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_apply()");try{await as();await assert.rejects(applyAtomic(f),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);}finally{await db.exec('RESET ROLE;DROP TRIGGER fixture_reject ON public.'+table+';DROP FUNCTION public.fixture_fail_apply()');}
});
for(const patch of [{studentId:otherStudent},{documentId:uid(999)},{sections:{strengths:{state:'accepted',value:'Changed browser draft'}}},{revision:'2026-01-01T00:00:00Z'}])test('atomic extraction rejects changed browser intent '+JSON.stringify(patch),async()=>{const f=await atomicApplyFixture();const before=await applicationSnapshot();await as();await assert.rejects(applyAtomic(f,patch),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);});
for(const patch of ["archived_at=now()","deleted_at=now()","scan_status='infected'","scan_status='pending'","review_status='rejected'"])test('atomic extraction rejects unavailable source '+patch,async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE;UPDATE public.documents SET '+patch);const before=await applicationSnapshot();await as();await assert.rejects(applyAtomic(f),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);});
test('atomic extraction is invoker-only and not executable by anonymous or service callers',async()=>{await atomicApplyFixture();await db.exec('RESET ROLE');const signature='public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)';const x=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.equal(x.prosecdef,false);assert.deepEqual(x.proconfig,['search_path=pg_catalog']);for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,signature])).rows[0].allowed,role==='authenticated');});
for(const finish of ['COMMIT','ROLLBACK'])test('atomic extraction serializes duplicate application after '+finish,{skip:!native},async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'authenticated',b);await a.exec('BEGIN');await applyAtomic(f,{client:a});const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=applyAtomic(f,{client:b}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'42501');else assert.equal(x.result.rows[0].receipt.status,'complete');const saved=await applicationSnapshot();assert.equal(saved.audit.length,1);assert.equal(saved.evidence.length,1);}finally{await a.exec('ROLLBACK');await pending;}});

for(const finish of ['COMMIT','ROLLBACK'])test('atomic extraction rechecks an edited review after waiting for '+finish,{skip:!native},async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await a.exec('BEGIN');await a.query('UPDATE public.document_extractions SET sections=$1 WHERE id=$2',[{strengths:{state:'accepted',value:'Different later review'}},applyId]);await as(actors.family,'authenticated',b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=applyAtomic(f,{client:b}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;const saved=await applicationSnapshot();if(finish==='COMMIT'){assert.equal(x.error?.code,'42501');assert.equal(saved.audit.length,0);assert.equal(saved.student[0].strengths_summary,'Original strength');}else{assert.equal(x.error,undefined);assert.equal(saved.audit.length,1);}}finally{await a.exec('ROLLBACK');await pending;}});
test('atomic extraction refuses lost access without any completion or target write',async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');await db.query('UPDATE public.students SET owner_id=$1 WHERE id=$2',[actors.owner,student]);const before=await applicationSnapshot();await as();await assert.rejects(applyAtomic(f),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);});

test('atomic extraction maps every supported profile field including BridgeForward grades',async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');const values={student_first_name:'Fictional',grade_band:'6-8',strengths:'Strength',interests:'Interest',needs:'Support need',student_voice:'Student voice',family_concerns:'Family priority',transportation:'Travel goal',supports:'Written supports',current_goals:'Education goal'};const sections=Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{state:'accepted',value}]));const row=(await db.query('UPDATE public.document_extractions SET sections=$1 RETURNING updated_at::text AS revision',[sections])).rows[0];await as();await applyAtomic({...f,revision:row.revision},{sections});const x=await applicationSnapshot();assert.equal(x.student[0].grade_band,'6-8');assert.equal(x.student[0].first_name,'Fictional');assert.equal(x.student[0].interests_summary,'Interest');assert.equal(x.student[0].student_voice_statement,'Student voice');assert.equal(x.student[0].family_priorities,'Family priority');assert.equal(x.student[0].support_needs_summary,'Support need');assert.equal(x.profiles[0].transportation_goal,'Travel goal');assert.equal(x.profiles[0].education_training_goal,'Education goal');});
for(const sections of [{strengths:{state:'accepted',value:{untrusted:'object'}}},{strengths:{state:'accepted',value:'x'.repeat(4001)}},{grade_band:{state:'accepted',value:'unrecognized-grade'}},{communication:{state:'accepted',value:'Unmapped review only'}}])test('atomic extraction refuses unsupported profile intent '+JSON.stringify(sections).slice(0,100),async()=>{const f=await atomicApplyFixture();await db.exec('RESET ROLE');const row=(await db.query('UPDATE public.document_extractions SET sections=$1 RETURNING updated_at::text AS revision',[sections])).rows[0];const before=await applicationSnapshot();await as();await assert.rejects(applyAtomic({...f,revision:row.revision},{sections}),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);});

// Canonical migration preparation: exact ledger, rollback and counts-only review.
async function extractionRolloutFixture(options){const f=await atomicApplyFixture(options);await db.exec('RESET ROLE;DROP FUNCTION public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean);CREATE SCHEMA IF NOT EXISTS supabase_migrations;CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[])');for(const p of extractionPrerequisites)await db.query('INSERT INTO supabase_migrations.schema_migrations VALUES($1,$2,$3)',[p.version,p.name,[p.source]]);return f;}
async function extractionReview(){const [guard,query]=extractionPreflight.split('-- COUNTS QUERY\n');try{await db.exec(guard);const result=await db.query(query.replace(/\nCOMMIT;\s*$/,''));await db.exec('COMMIT');return result.rows[0].inventory;}catch(error){await db.exec('ROLLBACK');throw error;}}
async function installedExtraction(){await db.exec('RESET ROLE');return {rpc:(await db.query("SELECT to_regprocedure('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)')::text AS name")).rows[0].name,ledger:(await db.query('SELECT * FROM supabase_migrations.schema_migrations ORDER BY version')).rows};}
test('atomic canonical and review proposal executable SQL stay exactly aligned',()=>{assert.equal(extractionMigrationSource.slice(extractionMigrationSource.indexOf('BEGIN;')),atomicExtractionProposal.slice(atomicExtractionProposal.indexOf('BEGIN;')));});
test('atomic migration and exact ledger commit together without rewriting review data',async()=>{await extractionRolloutFixture();const before=await applicationSnapshot();await db.exec(extractionRolloutSql);const x=await installedExtraction();assert.ok(x.rpc);assert.deepEqual(x.ledger.find(r=>r.version===extractionMigrationVersion).statements,[extractionMigrationSource]);assert.deepEqual(await applicationSnapshot(),before);await assert.rejects(db.exec(extractionRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await installedExtraction(),x);});
for(const drift of ['source','name','missing'])test('atomic rollout rejects exact prerequisite ledger drift '+drift,async()=>{await extractionRolloutFixture();if(drift==='source')await db.query("UPDATE supabase_migrations.schema_migrations SET statements=ARRAY['Different SQL'] WHERE version=$1",[extractionPrerequisites[0].version]);else if(drift==='name')await db.query("UPDATE supabase_migrations.schema_migrations SET name='Different name' WHERE version=$1",[extractionPrerequisites[0].version]);else await db.query('DELETE FROM supabase_migrations.schema_migrations WHERE version=$1',[extractionPrerequisites[0].version]);const before=await installedExtraction();await assert.rejects(db.exec(extractionRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await installedExtraction(),before);});
test('atomic migration DDL rolls back if its exact ledger insert fails',async()=>{await extractionRolloutFixture();const before=await installedExtraction();await db.exec("CREATE FUNCTION public.fixture_fail_apply() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.version='20261029010000' THEN RAISE EXCEPTION 'Fictional ledger failure' USING ERRCODE='42501';END IF;RETURN NEW;END$$;CREATE TRIGGER fixture_reject BEFORE INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_apply()");await assert.rejects(db.exec(extractionRolloutSql),{code:'42501'});await db.exec('ROLLBACK');assert.deepEqual(await installedExtraction(),before);});
for(const drift of ['revision','index','rls','index_keys','index_predicate','trigger_shape'])test('atomic migration refuses missing schema safeguard '+drift,async()=>{await extractionRolloutFixture();if(drift==='revision')await db.exec('ALTER TABLE public.document_extractions DISABLE TRIGGER document_extractions_set_updated_at');else if(drift==='index')await db.exec('DROP INDEX public.evidence_items_source_unique');else if(drift==='index_keys')await db.exec('DROP INDEX public.evidence_items_source_unique;CREATE UNIQUE INDEX evidence_items_source_unique ON public.evidence_items(source_id) WHERE source_id IS NOT NULL');else if(drift==='index_predicate')await db.exec('DROP INDEX public.evidence_items_source_unique;CREATE UNIQUE INDEX evidence_items_source_unique ON public.evidence_items(student_id,source_kind,source_id) WHERE student_id IS NOT NULL');else if(drift==='trigger_shape')await db.exec('DROP TRIGGER document_extractions_set_updated_at ON public.document_extractions;CREATE TRIGGER document_extractions_set_updated_at AFTER UPDATE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.fixture_extraction_revision()');else await db.exec('ALTER TABLE public.students DISABLE ROW LEVEL SECURITY');const before=await installedExtraction();await assert.rejects(db.exec(extractionRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await installedExtraction(),before);});
test('atomic data preflight emits aggregate counts and no review identity/content',async()=>{const f=await extractionRolloutFixture();const before=await applicationSnapshot();const x=await extractionReview();assert.equal(x.review_count,1);assert.equal(x.source_conflict_count,0);assert.equal(x.malformed_review_count,0);assert.equal(x.routine,null);assert.equal(x.ledger.length,3);assert.equal(x.read_only,true);for(const key of ['old_handlers_drained','evidence_flag_decision_recorded','data_repaired','rollout_authorized'])assert.equal(x[key],false);for(const value of [applyId,student,f.doc,'Fictional strengths','Fictional written supports'])assert.ok(!JSON.stringify(x).includes(value));assert.deepEqual(await applicationSnapshot(),before);});
test('atomic preflight counts malformed review, source and evidence conflicts without repairing them',async()=>{await extractionRolloutFixture();await db.query("UPDATE public.document_extractions SET student_id=$1,sections=$2",[otherStudent,{strengths:{state:'accepted',value:42}}]);await db.exec("UPDATE public.documents SET scan_status='infected'");await db.query("INSERT INTO public.evidence_items(student_id,source_kind,source_id,subject_type) VALUES($1,'document_extraction',$2,'different')",[student,applyId]);const before=await applicationSnapshot();const x=await extractionReview();assert.equal(x.source_conflict_count,1);assert.equal(x.unavailable_source_count,1);assert.equal(x.malformed_review_count,1);assert.equal(x.evidence_conflict_count,1);assert.deepEqual(await applicationSnapshot(),before);});
for(const role of ['anon','authenticated','service_role','tf_document_catalog_reader'])test('atomic preflight rejects incomplete review visibility for '+role,async()=>{await extractionRolloutFixture();await db.exec('SET ROLE '+role);await assert.rejects(extractionReview(),{code:'42501'});});
for(const finish of ['COMMIT','ROLLBACK'])test('atomic exact-ledger rollout serializes competing migration after '+finish,{skip:!native},async()=>{await extractionRolloutFixture();const a=await newSession(),b=await newSession();await a.exec(extractionRolloutSql.replace(/\nCOMMIT;\s*$/,''));const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=b.exec(extractionRolloutSql).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT'){assert.equal(x.error?.code,'55000');await b.exec('ROLLBACK');}else assert.equal(x.error,undefined);const installed=await installedExtraction();assert.ok(installed.rpc);assert.equal(installed.ledger.filter(r=>r.version===extractionMigrationVersion).length,1);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});

test('atomic preflight refuses filtered replacement views rather than hidden-row zeros',async()=>{await extractionRolloutFixture();await db.exec('DROP TABLE public.transition_profiles;CREATE VIEW public.transition_profiles AS SELECT id AS student_id FROM public.students WHERE false');try{await assert.rejects(extractionReview(),{code:'55000'});}finally{await db.exec('DROP VIEW public.transition_profiles');}});

test('disposable preflight ledger fixture matches only the three prerequisites and canonical new source',async()=>{await atomicApplyFixture();await db.exec('RESET ROLE;DROP SCHEMA IF EXISTS supabase_migrations');await db.exec(extractionPreflightLedgerSql);const x=await extractionReview();assert.equal(x.ledger.length,4);assert.equal(x.routine.auth_execute,true);assert.equal(x.routine.service_execute,false);const row=(await db.query('SELECT statements FROM supabase_migrations.schema_migrations WHERE version=$1',[extractionMigrationVersion])).rows[0];assert.deepEqual(row.statements,[extractionMigrationSource]);assert.equal(x.rollout_authorized,false);});


test('all fourteen canonical upload migrations preserve reviewed executable bodies and exact order',()=>{
 const plan=JSON.parse(readFileSync('docs/production-readiness/proposals/document-upload-canonical-preparation.json','utf8'));
 assert.equal(plan.sequence.length,14);assert.equal(plan.current_canonical_count,225);
 let previous='20261029010000';
 for(const item of plan.sequence){
  const canonical=readFileSync(item.canonical_file,'utf8'),mirror=readFileSync(item.proposal,'utf8');
  assert.equal(canonical.slice(canonical.indexOf('BEGIN;')),mirror.slice(mirror.indexOf('BEGIN;')));
  assert.equal(createHash('sha256').update(canonical).digest('hex'),item.canonical_sha256);
  assert.equal(createHash('sha256').update(mirror).digest('hex'),item.sha256);
  const version=item.canonical_file.split('/').at(-1).slice(0,14);assert.ok(version>previous);previous=version;
  assert.equal(item.hosted_applied,false);
 }
});

test('full replay installs upload migrations only through the canonical loop, retaining boundary assertions',()=>{
 const workflow=readFileSync('.github/workflows/migration-replay.yml','utf8');
 const plan=JSON.parse(readFileSync('docs/production-readiness/proposals/document-upload-canonical-preparation.json','utf8'));
 for(const item of plan.sequence)assert.ok(!workflow.includes('-f '+item.proposal),'review mirror must not be installed twice');
 assert.match(workflow,/for f in \$\(ls supabase\/migrations\/\*\.sql \| sort\)/);
 assert.match(workflow,/test "\$count" -eq 225/);
 assert.match(workflow,/name: Verify canonical document upload boundaries after complete replay/);
 assert.match(workflow,/documents_storage_path_unique/);assert.match(workflow,/student_document_reserved_insert/);
});


// Full-chain rollout starts from the pre-upload boundary, not installed proposals.
async function uploadRolloutFixture(){
 const f=await extractionRolloutFixture({baseOnly:true});
 await db.exec('DROP TRIGGER documents_guard_scan_state ON public.documents;DROP FUNCTION public.guard_document_scan_state();DROP INDEX public.documents_storage_path_unique;DROP POLICY student_document_no_client_replace ON storage.objects;DROP POLICY student_document_no_client_delete ON storage.objects;');
 await db.exec(legacy);return f;
}
async function uploadRolloutSnapshot(){await db.exec('RESET ROLE');return {ledger:(await db.query('SELECT version,name,statements FROM supabase_migrations.schema_migrations ORDER BY version')).rows,columns:(await db.query("SELECT attname FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum")).rows,routines:(await db.query("SELECT proname,prosrc,proacl::text FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY proname,oid")).rows,documents:(await db.query('SELECT * FROM public.documents ORDER BY id')).rows};}
async function uploadPreflight(){const [guard,query]=uploadChainPreflight.split('-- COUNTS QUERY\n');await db.exec(guard);const x=(await db.query(query.replace(/\nCOMMIT;\s*$/,''))).rows[0].inventory;await db.exec('ROLLBACK');return x;}
test('full upload chain commits fifteen exact ledger sources with unchanged legacy rows',async()=>{
 await uploadRolloutFixture();const before=await uploadRolloutSnapshot();await db.exec(uploadChainRolloutSql);const after=await uploadRolloutSnapshot();assert.equal(after.ledger.length,18);
 for(const m of uploadChainMigrations){const row=after.ledger.find(r=>r.version===m.version);assert.equal(row.name,m.name);assert.deepEqual(row.statements,[m.source]);}
 assert.deepEqual(after.documents.map(({storage_object_id,storage_object_version,upload_attempt_id,upload_review_context_sha256,...old})=>{assert.equal(storage_object_id,null);assert.equal(upload_attempt_id,null);return old;}),before.documents);
 await assert.rejects(db.exec(uploadChainRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),after);
});
for(const which of ['version','name'])test('full upload chain refuses partial ledger '+which+' without DDL',async()=>{await uploadRolloutFixture();const m=uploadChainMigrations[8];await db.query("INSERT INTO supabase_migrations.schema_migrations VALUES($1,$2,ARRAY['Unexpected source'])",[which==='version'?m.version:'20261001000000',which==='name'?m.name:'unexpected']);const before=await uploadRolloutSnapshot();await assert.rejects(db.exec(uploadChainRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),before);});
test('late upload ledger failure rolls back atomic routine and every upload schema change',async()=>{
 await uploadRolloutFixture();await db.exec("CREATE FUNCTION public.fixture_fail_apply() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.version='20261029021300' THEN RAISE EXCEPTION 'Fictional final ledger failure' USING ERRCODE='42501';END IF;RETURN NEW;END$$;CREATE TRIGGER fixture_reject BEFORE INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_apply()");const before=await uploadRolloutSnapshot();await assert.rejects(db.exec(uploadChainRolloutSql),{code:'42501'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),before);
});
test('upload preflight preserves private values and reports legacy metadata gaps without repair',async()=>{const f=await uploadRolloutFixture();const before=await uploadRolloutSnapshot();const x=await uploadPreflight();assert.equal(x.document_count,1);assert.equal(x.missing_managed_object_count,1);assert.equal(x.duplicate_path_groups,0);assert.equal(x.prerequisite_ledger.length,3);assert.equal(x.read_only,true);for(const k of ['old_handlers_drained','legacy_data_reconciled','provider_bytes_verified','retention_approved','rollout_authorized','cleanup_authorized'])assert.equal(x[k],false);for(const secret of [f.doc,student,actors.family,path,'Fictional'])assert.ok(!JSON.stringify(x).includes(secret));assert.deepEqual(await uploadRolloutSnapshot(),before);});
for(const role of ['anon','authenticated','service_role','tf_document_catalog_reader'])test('upload preflight rejects partial visibility for '+role,async()=>{await uploadRolloutFixture();await as(actors.family,role==='tf_document_catalog_reader'?'authenticated':role);if(role==='tf_document_catalog_reader')await db.exec('RESET ROLE;SET ROLE tf_document_catalog_reader');await assert.rejects(uploadPreflight());await db.exec('ROLLBACK;RESET ROLE');});
for(const finish of ['COMMIT','ROLLBACK'])test('full upload rollout serializes competing installer after '+finish,{skip:!native},async()=>{await uploadRolloutFixture();const a=await newSession(),b=await newSession();await a.exec(uploadChainRolloutSql.replace(/\nCOMMIT;\s*$/,''));const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=b.exec(uploadChainRolloutSql).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT'){assert.equal(x.error?.code,'55000');await b.exec('ROLLBACK');}else assert.equal(x.error,undefined);assert.equal((await uploadRolloutSnapshot()).ledger.length,18);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});

test('duplicate legacy paths abort the entire upload chain without retaining atomic DDL',async()=>{await uploadRolloutFixture();await insert();const before=await uploadRolloutSnapshot();const counts=await uploadPreflight();assert.equal(counts.duplicate_path_groups,1);await assert.rejects(db.exec(uploadChainRolloutSql),{code:'23505'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),before);});
for(const kind of ['source','name'])test('full upload chain refuses exact prerequisite '+kind+' drift',async()=>{await uploadRolloutFixture();await db.exec(kind==='source'?"UPDATE supabase_migrations.schema_migrations SET statements=ARRAY['Unexpected SQL']":"UPDATE supabase_migrations.schema_migrations SET name='unexpected'");const before=await uploadRolloutSnapshot();await assert.rejects(db.exec(uploadChainRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),before);});
test('upload preflight reports owner/version metadata conflicts without private identifiers',async()=>{await uploadRolloutFixture();await db.query("INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES('student-documents',$1,$2,'')",[path,actors.owner]);const x=await uploadPreflight();assert.equal(x.owner_metadata_review_count,1);assert.equal(x.version_metadata_review_count,1);assert.equal(x.missing_managed_object_count,0);for(const secret of [path,student,actors.owner])assert.ok(!JSON.stringify(x).includes(secret));});
test('upload preflight rejects SELECT grants that still hide rows under RLS',async()=>{await uploadRolloutFixture();await db.exec('GRANT USAGE ON SCHEMA supabase_migrations TO tf_document_catalog_reader;GRANT SELECT ON public.students,public.documents,public.ai_jobs,storage.objects,supabase_migrations.schema_migrations TO tf_document_catalog_reader;SET ROLE tf_document_catalog_reader');await assert.rejects(uploadPreflight(),{code:'42501'});await db.exec('ROLLBACK;RESET ROLE');});
test('pre-install review rejects the installed upload chain rather than reporting empty readiness',async()=>{await uploadRolloutFixture();await db.exec(uploadChainRolloutSql);await assert.rejects(uploadPreflight(),{code:'55000'});await db.exec('ROLLBACK');});

test('full upload chain rejects newer unknown ledger state without applying DDL',async()=>{await uploadRolloutFixture();await db.query("INSERT INTO supabase_migrations.schema_migrations VALUES('20261030010000','future_change',ARRAY['Future source'])");const before=await uploadRolloutSnapshot();await assert.rejects(db.exec(uploadChainRolloutSql),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadRolloutSnapshot(),before);});
test('upload preflight refuses a filtered relation instead of trusting its empty counts',async()=>{await uploadRolloutFixture();await db.exec('ALTER TABLE public.documents RENAME TO fixture_private_upload_documents;CREATE VIEW public.documents AS SELECT * FROM public.fixture_private_upload_documents WHERE false');try{await assert.rejects(uploadPreflight(),{code:'55000'});}finally{await db.exec('ROLLBACK;DROP VIEW public.documents;ALTER TABLE public.fixture_private_upload_documents RENAME TO documents');}});
test('upload preflight reports malformed legacy paths without repairing them',async()=>{await uploadRolloutFixture();await db.exec("ALTER TABLE public.documents DISABLE TRIGGER documents_enforce_storage_path;UPDATE public.documents SET storage_path='private-legacy-location';ALTER TABLE public.documents ENABLE TRIGGER documents_enforce_storage_path");const before=await uploadRolloutSnapshot();const x=await uploadPreflight();assert.equal(x.legacy_path_review_count,1);assert.ok(!JSON.stringify(x).includes('private-legacy-location'));assert.deepEqual(await uploadRolloutSnapshot(),before);});


// Durable admission foundation only. No application/worker or hosted integration.
const operationId=uid(901);
async function admissionFixture(){await db.exec(operationAdmission);await as(actors.family,'service_role');}
async function pauseOperation(paused,revision=paused?2:1,client=db){return (await client.query('SELECT public.set_document_operation_pause($1,$2,$3,$4) AS receipt',[actors.owner,revision,paused,paused?'maintenance':'resume'])).rows[0].receipt;}
async function beginOperation(kind='register',id=operationId,client=db){return (await client.query('SELECT public.begin_document_operation($1,$2,$3) AS receipt',[id,actors.family,kind])).rows[0].receipt;}
async function finishOperation(receipt,outcome='completed',client=db,actor=actors.family){return (await client.query('SELECT public.finish_document_operation($1,$2,$3,$4) AS receipt',[receipt.operation_id,actor,receipt.receipt_id,outcome])).rows[0].receipt;}
async function inspectOperations(client=db){return (await client.query('SELECT public.inspect_document_operation_drain() AS result')).rows[0].result;}
test('durable admission starts paused and reports only tracked aggregate state',async()=>{await admissionFixture();await assert.rejects(beginOperation(),{code:'55000'});const x=await inspectOperations();assert.equal(x.paused,true);assert.equal(x.tracked_operations_clear,true);for(const key of ['legacy_handlers_covered','provider_quiescence_verified','ready_for_cutover','cleanup_authorized'])assert.equal(x[key],false);assert.equal(x.by_kind.length,4);assert.ok(!JSON.stringify(x).includes(actors.family));});
for(const kind of ['register','rescan','apply','summary'])test('durable admission tracks '+kind+' through confirmed completion',async()=>{await admissionFixture();assert.equal((await pauseOperation(false)).revision,2);const lease=await beginOperation(kind);assert.equal(lease.schema,'document-operation-admitted-v1');assert.equal(lease.revision,2);assert.equal((await inspectOperations()).tracked_operations_clear,false);assert.equal((await finishOperation(lease)).state,'completed');assert.equal((await inspectOperations()).tracked_operations_clear,true);await assert.rejects(beginOperation(kind),{code:'23505'});await assert.rejects(finishOperation(lease),{code:'42501'});});
test('paused admission allows existing work to drain but refuses new work',async()=>{await admissionFixture();await pauseOperation(false);const lease=await beginOperation();await pauseOperation(true);await assert.rejects(beginOperation('rescan',uid(902)),{code:'55000'});await assert.rejects(pauseOperation(false,3),{code:'55000'});await finishOperation(lease);assert.equal((await pauseOperation(false,3)).revision,4);});
test('uncertain document work stays retained and blocks resume without expiry or completion replay',async()=>{await admissionFixture();await pauseOperation(false);const lease=await beginOperation();await finishOperation(lease,'needs_review');await pauseOperation(true);const x=await inspectOperations();assert.equal(x.by_kind.find(k=>k.kind==='register').needs_review,1);assert.equal(x.tracked_operations_clear,false);await assert.rejects(finishOperation(lease,'completed'),{code:'42501'});await assert.rejects(pauseOperation(false,3),{code:'55000'});await assert.rejects(db.query('DELETE FROM public.document_operation_leases'),{code:'42501'});await assert.rejects(db.query("UPDATE public.document_operation_leases SET state='completed',finished_at=now()"),{code:'42501'});});
for(const role of ['anon','authenticated'])test('ordinary '+role+' cannot control or inspect operation admission even with forged service claim',async()=>{await admissionFixture();await as(actors.family,role);await db.query("SELECT set_config('request.jwt.claim.role','service_role',false)");await assert.rejects(inspectOperations(),{code:'42501'});await assert.rejects(pauseOperation(false),{code:'42501'});await assert.rejects(beginOperation(),{code:'42501'});await assert.rejects(db.query('SELECT * FROM public.document_operation_control'),{code:'42501'});});
for(const patch of ['actor','receipt'])test('operation completion refuses wrong '+patch+' without clearing active work',async()=>{await admissionFixture();await pauseOperation(false);const lease=await beginOperation();await assert.rejects(finishOperation(patch==='receipt'?{...lease,receipt_id:uid(999)}:lease,'completed',db,patch==='actor'?actors.educator:actors.family),{code:'42501'});assert.equal((await inspectOperations()).tracked_operations_clear,false);});
test('service admission RPCs have exact service-only grants and no raw table access',async()=>{await admissionFixture();await db.exec('RESET ROLE');for(const signature of ['begin_document_operation(uuid,uuid,text)','finish_document_operation(uuid,uuid,uuid,text)','set_document_operation_pause(uuid,bigint,boolean,text)','inspect_document_operation_drain()']){const x=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',['public.'+signature])).rows[0];assert.equal(x.prosecdef,true);assert.deepEqual(x.proconfig,['search_path=pg_catalog']);for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed",[role,'public.'+signature])).rows[0].allowed,role==='service_role');}for(const table of ['document_operation_control','document_operation_leases','document_operation_control_events'])for(const role of ['anon','authenticated','service_role'])for(const action of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS allowed',[role,'public.'+table,action])).rows[0].allowed,false);});
test('stale pause revision cannot change admission or append audit',async()=>{await admissionFixture();await pauseOperation(false);await assert.rejects(pauseOperation(true,1),{code:'55000'});await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_operation_control_events')).rows[0].n,1);});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('durable admission rejects stale-snapshot '+isolation+' operations',async()=>{await admissionFixture();await pauseOperation(false);await db.exec('BEGIN ISOLATION LEVEL '+isolation);await assert.rejects(beginOperation(),{code:'42501'});await db.exec('ROLLBACK');assert.equal((await inspectOperations()).tracked_operations_clear,true);});
for(const finish of ['COMMIT','ROLLBACK'])test('paused control is rechecked by waiting admission after '+finish,{skip:!native},async()=>{await admissionFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);await a.exec('BEGIN');await pauseOperation(true,2,a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=beginOperation('register',operationId,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'55000');else{assert.equal(x.error,undefined);assert.equal(x.result.schema,'document-operation-admitted-v1');}}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});
for(const finish of ['COMMIT','ROLLBACK'])test('pause waits for admission receipt transaction '+finish,{skip:!native},async()=>{await admissionFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);await a.exec('BEGIN');await beginOperation('summary',operationId,a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=pauseOperation(true,2,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).error,undefined);const x=await inspectOperations();assert.equal(x.paused,true);assert.equal(x.tracked_operations_clear,finish==='ROLLBACK');}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});

test('missing durable control cannot admit work or return a ready status',async()=>{await admissionFixture();await db.exec('RESET ROLE;DELETE FROM public.document_operation_control');await as(actors.family,'service_role');await assert.rejects(beginOperation(),{code:'55000'});await assert.rejects(pauseOperation(false),{code:'55000'});assert.equal(await inspectOperations(),null);});
test('failed control audit rolls back the pause change and revision together',async()=>{await admissionFixture();await db.exec("RESET ROLE;CREATE FUNCTION public.fixture_fail_apply() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'Fictional audit failure' USING ERRCODE='42501';END$$;CREATE TRIGGER fixture_admission_audit BEFORE INSERT ON public.document_operation_control_events FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_apply()");await as(actors.family,'service_role');await assert.rejects(pauseOperation(false),{code:'42501'});const x=await inspectOperations();assert.equal(x.paused,true);assert.equal(x.revision,1);});
for(const kind of [null,'upload','delete'])test('unknown admission kind is refused without recording work '+kind,async()=>{await admissionFixture();await pauseOperation(false);await assert.rejects(beginOperation(kind),{code:'42501'});assert.equal((await inspectOperations()).tracked_operations_clear,true);});
test('unsafe snapshot cannot complete work or switch pause state',async()=>{await admissionFixture();await pauseOperation(false);const lease=await beginOperation();await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ');await assert.rejects(finishOperation(lease),{code:'42501'});await db.exec('ROLLBACK;BEGIN ISOLATION LEVEL SERIALIZABLE');await assert.rejects(pauseOperation(true),{code:'42501'});await db.exec('ROLLBACK');assert.equal((await inspectOperations()).tracked_operations_clear,false);});


async function applyGateRoutineSnapshot(){return (await db.query("SELECT prosrc,proconfig,proacl::text FROM pg_proc WHERE oid='public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)'::regprocedure")).rows;}
async function gatedApplyFixture(){const f=await atomicApplyFixture();await db.exec('RESET ROLE');await admissionFixture();await db.exec('RESET ROLE');await db.exec(applyAdmission);await as(actors.family,'service_role');return f;}
test('Apply admission proposal changes only the atomic control lock and preserves reviewed executable body',()=>{const gated=applyAdmission.slice(applyAdmission.indexOf('CREATE OR REPLACE FUNCTION public.apply_reviewed_document_extraction'),applyAdmission.lastIndexOf('COMMIT;')).replace('CREATE OR REPLACE FUNCTION','CREATE FUNCTION').replace('  PERFORM public.lock_document_apply_admission();\n','');const original=extractionMigrationSource.slice(extractionMigrationSource.indexOf('CREATE FUNCTION public.apply_reviewed_document_extraction'),extractionMigrationSource.lastIndexOf('COMMIT;'));assert.equal(gated,original);});
for(const [role,actor] of Object.entries(actors))test('paused Apply rejects direct RPC without private changes for '+role,async()=>{const f=await gatedApplyFixture();const before=await applicationSnapshot();await as(actor);await assert.rejects(applyAtomic(f),{code:'55000'});assert.deepEqual(await applicationSnapshot(),before);});
for(const [role,actor] of Object.entries(actors))test('unpaused Apply preserves explicit private access for '+role,async()=>{const f=await gatedApplyFixture();await pauseOperation(false);const before=await applicationSnapshot();await as(actor);if(['family','educator','student'].includes(role))assert.equal((await applyAtomic(f)).rows[0].receipt.status,'complete');else{await assert.rejects(applyAtomic(f),{code:'42501'});assert.deepEqual(await applicationSnapshot(),before);}});
test('Apply gate helper exposes no private data or service/anonymous execution',async()=>{await gatedApplyFixture();await db.exec('RESET ROLE');const helper='public.lock_document_apply_admission()';const x=(await db.query('SELECT prosecdef,proconfig,provolatile FROM pg_proc WHERE oid=$1::regprocedure',[helper])).rows[0];assert.equal(x.prosecdef,true);assert.deepEqual(x.proconfig,['search_path=pg_catalog']);assert.equal(x.provolatile,'v');for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,helper])).rows[0].ok,role==='authenticated');});
test('Apply gate refuses unpaused installation without altering the original routine',async()=>{await atomicApplyFixture();await db.exec('RESET ROLE');await admissionFixture();await pauseOperation(false);await db.exec('RESET ROLE');const before=await applyGateRoutineSnapshot();await assert.rejects(db.exec(applyAdmission),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await applyGateRoutineSnapshot(),before);assert.equal((await db.query("SELECT to_regprocedure('public.lock_document_apply_admission()')::text AS helper")).rows[0].helper,null);});
test('Apply gate refuses drift in the reviewed atomic function body without repair',async()=>{await atomicApplyFixture();await db.exec('RESET ROLE');await admissionFixture();await db.exec('RESET ROLE');const changed=atomicExtractionProposal.replace('CREATE FUNCTION public.apply_reviewed_document_extraction','CREATE OR REPLACE FUNCTION public.apply_reviewed_document_extraction').replace('DECLARE\n  actor uuid','DECLARE\n  -- Fictional body drift\n  actor uuid');await db.exec(changed);const before=await applyGateRoutineSnapshot();await assert.rejects(db.exec(applyAdmission),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await applyGateRoutineSnapshot(),before);});
for(const finish of ['COMMIT','ROLLBACK'])test('Apply pause waits for direct save transaction '+finish,{skip:!native},async()=>{const f=await gatedApplyFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.owner,'service_role',b);await a.exec('BEGIN');await applyAtomic(f,{client:a});const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=pauseOperation(true,2,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).error,undefined);assert.equal((await inspectOperations()).paused,true);const saved=await applicationSnapshot();assert.equal(saved.audit.length,finish==='COMMIT'?1:0);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});
for(const finish of ['COMMIT','ROLLBACK'])test('direct Apply rechecks a waiting pause after '+finish,{skip:!native},async()=>{const f=await gatedApplyFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.owner,'service_role',a);await as(actors.family,'authenticated',b);await a.exec('BEGIN');await pauseOperation(true,2,a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=applyAtomic(f,{client:b}).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT'){assert.equal(x.error?.code,'55000');assert.equal((await applicationSnapshot()).audit.length,0);}else{assert.equal(x.error,undefined);assert.equal(x.result.rows[0].receipt.status,'complete');}}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}});


// Prepared upload transaction fence only; the browser interval is not settled.
async function uploadFenceFixture(install=true){
  await installResolutionClaim();await admissionFixture();await db.exec('RESET ROLE');
  if(install)await db.exec(uploadPauseFence);
  await as(actors.family,'service_role');
}
async function uploadFenceBodies(){
  await db.exec('RESET ROLE');return (await db.query("SELECT oid::regprocedure::text AS signature,prosrc,prosecdef,proconfig FROM pg_proc WHERE oid IN ('public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure,'public.can_insert_reserved_student_document(text,text)'::regprocedure,'public.guard_document_upload_registration()'::regprocedure) ORDER BY oid::regprocedure::text")).rows;
}
async function uploadFenceAction(action,client=db){
  if(action==='reserve')return reserve(client);
  if(action==='storage')return reservedObject(client);
  return registerReserved(client);
}
async function prepareUploadFenceAction(action){
  await uploadFenceFixture();await pauseOperation(false);await as();
  if(action!=='reserve')await reserve();
  if(action==='register')await reservedObject();
  await db.exec('RESET ROLE');
}
for(const [role,actor] of Object.entries(actors))test('upload pause preserves closed reservation for '+role,async()=>{
  await uploadFenceFixture();await as(actor);
  await assert.rejects(reserve(),{code:'55000'});await db.exec('RESET ROLE');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_attempts')).rows[0].n,0);
});
for(const [role,actor] of Object.entries(actors))test('unpaused upload fence preserves current private access for '+role,async()=>{
  await uploadFenceFixture();await pauseOperation(false);await as(actor);
  if(['family','educator','student'].includes(role)){await reserve();await reservedObject(db,{owner:actor});await registerReserved(db,{actor});}
  else await assert.rejects(reserve(),{code:'42501'});
});
for(const role of ['school','district','owner'])test('upload fence accepts explicit editing access without a management bypass for '+role,async()=>{
  await uploadFenceFixture();await pauseOperation(false);await db.exec('RESET ROLE');
  await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await reserve();await reservedObject(db,{owner:actors[role]});await registerReserved(db,{actor:actors[role]});
});
for(const action of ['storage','register'])test('pause refuses direct '+action+' after a confirmed reservation without deleting it',async()=>{
  await prepareUploadFenceAction(action);await as(actors.owner,'service_role');await pauseOperation(true);await as();
  await assert.rejects(uploadFenceAction(action),{code:'55000'});await db.exec('RESET ROLE');
  const attempt=(await db.query('SELECT state,registered_document_id FROM public.document_upload_attempts WHERE id=$1',[attemptId])).rows[0];assert.equal(attempt.state,'reserved');assert.equal(attempt.registered_document_id,null);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.documents')).rows[0].n,0);
});
test('paused uploads still allow an exact actor review hold without completing or releasing it',async()=>{
  await prepareUploadFenceAction('storage');await as(actors.owner,'service_role');await pauseOperation(true);await as();await hold();
  await db.exec('RESET ROLE');const row=(await db.query('SELECT state,hold_reason FROM public.document_upload_attempts')).rows[0];assert.equal(row.state,'review_required');assert.equal(row.hold_reason,'upload_uncertain');
});
test('upload fence preserves every original body except its transaction pause call',async()=>{
  await uploadFenceFixture(false);const before=await uploadFenceBodies();await db.exec(uploadPauseFence);const after=await uploadFenceBodies();
  for(let i=0;i<before.length;i++){
    const registration=before[i].signature.includes('guard_document_upload_registration');
    const call=registration?"  IF TG_OP='INSERT' THEN PERFORM public.lock_document_upload_admission(); END IF;":before[i].signature.includes('reserve_document_upload')?'      PERFORM public.lock_document_upload_admission();':'  PERFORM public.lock_document_upload_admission();';
    assert.equal(after[i].prosrc,before[i].prosrc.replace('\nBEGIN','\nBEGIN\n'+call));assert.equal(after[i].prosecdef,before[i].prosecdef);assert.deepEqual(after[i].proconfig,before[i].proconfig);
  }
});
test('upload helper is volatile auth-only with no control table grant or role expansion',async()=>{
  await uploadFenceFixture();await db.exec('RESET ROLE');const fn=(await db.query("SELECT prosecdef,proconfig,provolatile FROM pg_proc WHERE oid='public.lock_document_upload_admission()'::regprocedure")).rows[0];assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);assert.equal(fn.provolatile,'v');
  for(const role of ['anon','authenticated','service_role']){
    for(const name of ['lock_document_upload_admission()','reserve_document_upload(uuid,uuid,text,text)','can_insert_reserved_student_document(text,text)'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.'+name])).rows[0].ok,role==='authenticated');
    assert.equal((await db.query("SELECT has_function_privilege($1,'public.guard_document_upload_registration()','EXECUTE') AS ok",[role])).rows[0].ok,false);
    for(const action of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS ok',[role,'public.document_operation_control',action])).rows[0].ok,false);
  }
});
for(const role of ['anon','service_role'])test('forged subject cannot call upload pause helper as '+role,async()=>{
  await uploadFenceFixture();await as(actors.family,role);await assert.rejects(db.query('SELECT public.lock_document_upload_admission()'),{code:'42501'});
});
for(const isolation of ['REPEATABLE READ','SERIALIZABLE'])test('upload fence rejects stale snapshot '+isolation,async()=>{
  await uploadFenceFixture();await pauseOperation(false);await as();await db.exec('BEGIN ISOLATION LEVEL '+isolation);await assert.rejects(reserve(),{code:'42501'});await db.exec('ROLLBACK');
});
for(const state of ['open','active','held-upload','pending-document','queued-summary','processing-summary','needs_review-summary'])test('upload fence installation refuses '+state+' without repairing data',async()=>{
  await uploadFenceFixture(false);
  if(state==='open'){await pauseOperation(false);}
  if(state==='active'){await pauseOperation(false);await beginOperation();await pauseOperation(true);}
  if(state==='held-upload'){await as();await reserve();await hold();}
  if(state==='pending-document'){await as();await reserve();await db.exec('RESET ROLE');await reservedObject();await as();await registerReserved();}
  if(state.endsWith('-summary')){await db.exec('RESET ROLE');await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status) VALUES($1,$2,$3,'document_summary',$4)",[uid(992),student,actors.family,state.split('-')[0]]);}
  await db.exec('RESET ROLE');const before=await uploadFenceBodies();await assert.rejects(db.exec(uploadPauseFence),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadFenceBodies(),before);assert.equal((await db.query("SELECT to_regprocedure('public.lock_document_upload_admission()') AS fn")).rows[0].fn,null);
});
for(const target of ['reserve_document_upload','can_insert_reserved_student_document','guard_document_upload_registration'])test('upload fence refuses prior body drift in '+target,async()=>{
  await uploadFenceFixture(false);await db.exec('RESET ROLE');const row=(await db.query("SELECT oid::regprocedure::text AS signature,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE proname=$1 AND pronamespace='public'::regnamespace",[target])).rows[0];await db.exec(row.definition.replace('BEGIN','BEGIN\n-- Fictional prior body drift'));
  const before=await uploadFenceBodies();await assert.rejects(db.exec(uploadPauseFence),{code:'55000'});await db.exec('ROLLBACK');assert.deepEqual(await uploadFenceBodies(),before);
});
for(const action of ['reserve','storage','register'])for(const finish of ['COMMIT','ROLLBACK'])test('upload '+action+' holds pause until its transaction '+finish,{skip:!native},async()=>{
  await prepareUploadFenceAction(action);const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.owner,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'authenticated');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);await a.exec('BEGIN');await uploadFenceAction(action,a);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=pauseOperation(true,2,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).error,undefined);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const action of ['reserve','storage','register'])for(const finish of ['COMMIT','ROLLBACK'])test('waiting upload '+action+' rechecks pause after '+finish,{skip:!native},async()=>{
  await prepareUploadFenceAction(action);const a=await newSession(),b=await newSession();await as(actors.owner,'service_role',a);await as(actors.family,'authenticated',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'authenticated');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);await a.exec('BEGIN');await pauseOperation(true,2,a);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=uploadFenceAction(action,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'55000');else assert.equal(x.error,undefined);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});

test('upload fence refuses differing routine ownership without reassigning it',async()=>{
  await uploadFenceFixture(false);await db.exec("RESET ROLE;ALTER FUNCTION public.reserve_document_upload(uuid,uuid,text,text) OWNER TO service_role");
  await assert.rejects(db.exec(uploadPauseFence),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT proowner::regrole::text AS owner FROM pg_proc WHERE oid='public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure")).rows[0].owner,'service_role');
});
test('missing upload control row fails closed without creating a reservation',async()=>{
  await uploadFenceFixture();await db.exec('RESET ROLE;DELETE FROM public.document_operation_control');await as();await assert.rejects(reserve(),{code:'55000'});await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_upload_attempts')).rows[0].n,0);
});
test('upload pause preserves authorized metadata updates and existing registration reads',async()=>{
  await prepareUploadFenceAction('register');await as();await registerReserved();await as(actors.owner,'service_role');await pauseOperation(true);await as();
  await db.query("UPDATE public.documents SET title='Fictional reviewed label' WHERE id=$1",[uid(401)]);
  assert.equal((await db.query('SELECT title FROM public.documents WHERE id=$1',[uid(401)])).rows[0].title,'Fictional reviewed label');
  const receipt=(await db.query('SELECT public.read_document_upload_registration($1,$2) AS receipt',[attemptId,reviewHash])).rows[0].receipt;assert.equal(receipt.document_id,uid(401));
});
test('upload pause does not fence unrelated public-site media Storage inserts',async()=>{
  await uploadFenceFixture();await db.exec("RESET ROLE;CREATE POLICY test_other_bucket ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='public-site-media')");await as();
  await db.query("INSERT INTO storage.objects(bucket_id,name,owner_id,version) VALUES('public-site-media','fictional-owner-site-image.png',$1,'public-version')",[actors.family]);await db.exec('RESET ROLE');assert.equal((await db.query("SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id='public-site-media'")).rows[0].n,1);
});

for(const signature of ['reserve_document_upload(uuid,uuid,text,text)','can_insert_reserved_student_document(text,text)','guard_document_upload_registration()'])test('upload fence refuses grant drift without silently repairing '+signature,async()=>{
  await uploadFenceFixture(false);await db.exec('RESET ROLE;GRANT EXECUTE ON FUNCTION public.'+signature+' TO service_role');
  await assert.rejects(db.exec(uploadPauseFence),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT has_function_privilege('service_role',$1,'EXECUTE') AS ok",['public.'+signature])).rows[0].ok,true);
});


// Fourth admission proposal: retained interval and one-shot service handoff.
async function uploadIntervalFixture(install=true){await uploadFenceFixture();await db.exec('RESET ROLE');if(install)await db.exec(uploadInterval);await as(actors.family,'service_role');}
async function claimUploadInterval(client=db,patch={}){const x={attempt:attemptId,actor:actors.family,review:reviewHash,...patch};return (await client.query('SELECT public.claim_document_upload_registration_operation($1,$2,$3) AS receipt',[x.attempt,x.actor,x.review])).rows[0].receipt;}
async function intervalRows(){await db.exec('RESET ROLE');return {bindings:(await db.query('SELECT * FROM public.document_upload_operation_bindings ORDER BY attempt_id')).rows,leases:(await db.query('SELECT * FROM public.document_operation_leases ORDER BY operation_id')).rows};}
async function readyInterval(actor=actors.family){await uploadIntervalFixture();await pauseOperation(false);await as(actor);const r=await reserve();await reservedObject(db,{owner:actor});return r;}
async function confirmIntervalOutcome(kind='clean'){
 await db.exec('RESET ROLE');
 const verdict={code:kind,provider:'cloudmersive',content_sha256:claimedHash,source:'registration_reviewed_copy',clean_result:kind==='clean',blocked_reasons:kind==='clean'?[]:['Fictional threat']};
 await db.query("UPDATE public.documents SET scan_status=$1,scan_verdict=$2,scan_data_id='fictional-confirmed-scan',scanned_at=now(),review_status=$3,archived_at=CASE WHEN $1='infected' THEN now() ELSE NULL END WHERE id=$4",[kind,verdict,kind==='infected'?'rejected':'pending_review',uid(401)]);
 if(kind==='clean')await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status,input_source) VALUES($1,$2,$3,'document_summary','queued',$4)",[uid(995),student,actors.family,{document_id:uid(401),storage_path:student+'/'+attemptId+'-privacy-safe-document.txt'}]);
}
for(const [role,actor] of Object.entries(actors))test('durable reservation preserves current private scope for '+role,async()=>{
 await uploadIntervalFixture();await pauseOperation(false);await as(actor);
 if(['family','educator','student'].includes(role)){
  const receipt=await reserve();assert.equal('operation_id' in receipt,false);assert.equal('receipt_id' in receipt,false);
  const rows=await intervalRows();assert.equal(rows.bindings.length,1);assert.equal(rows.leases.length,1);assert.equal(rows.leases[0].state,'active');assert.equal(rows.leases[0].actor_id,actor);assert.notEqual(rows.leases[0].operation_id,attemptId);
 }else{await assert.rejects(reserve(),{code:'42501'});const rows=await intervalRows();assert.equal(rows.leases.length,0);}
});
for(const role of ['school','district','owner'])test('explicit editor '+role+' gets a bound interval without a management bypass',async()=>{
 await uploadIntervalFixture();await pauseOperation(false);await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);await reserve();const rows=await intervalRows();assert.equal(rows.leases[0].actor_id,actors[role]);
});
test('lost reservation reply can repeat only its exact intent without creating another operation',async()=>{
 await readyInterval();const first=await reserve(),again=await reserve();assert.deepEqual(again,first);const rows=await intervalRows();assert.equal(rows.leases.length,1);assert.equal(rows.bindings.length,1);
});
test('paused interval admits no new attempt but allows the exact original one to drain',async()=>{
 await readyInterval();await as(actors.owner,'service_role');await pauseOperation(true);await as();await reserve();await assert.rejects(reserve(db,{id:uid(777),hash:'e'.repeat(64)}),{code:'55000'});
 await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await registerReserved();await as(actors.owner,'service_role');await assert.rejects(pauseOperation(false,3),{code:'55000'});await confirmIntervalOutcome();await as(actors.family,'service_role');await finishOperation(receipt);assert.equal((await pauseOperation(false,3)).revision,4);
});
test('paused new reservation rolls back both attempt and operation',async()=>{
 await uploadIntervalFixture();await as();await assert.rejects(reserve(),{code:'55000'});const rows=await intervalRows();assert.equal(rows.bindings.length,0);assert.equal(rows.leases.length,0);
});
test('lost service handoff cannot be reattached or repeated after its committed claim',async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();assert.equal(receipt.schema,'document-upload-registration-operation-v1');assert.equal(receipt.content_sha256,claimedHash);assert.equal(receipt.object_version,'held-version-one');await assert.rejects(claimUploadInterval(),{code:'55000'});const rows=await intervalRows();assert.equal(rows.leases[0].state,'active');assert.ok(rows.bindings[0].registration_claimed_at);
});
for(const role of ['anon','authenticated'])test('browser role '+role+' cannot claim a registration operation or read private receipts',async()=>{
 await readyInterval();await as(actors.family,role);await assert.rejects(claimUploadInterval(),{code:'42501'});await assert.rejects(db.query('SELECT * FROM public.document_upload_operation_bindings'),{code:'42501'});
});
test('service has claim/finish RPC capability but no raw binding table grant',async()=>{
 await readyInterval();await as(actors.family,'service_role');await assert.rejects(db.query('SELECT * FROM public.document_upload_operation_bindings'),{code:'42501'});await assert.rejects(db.query('UPDATE public.document_upload_operation_bindings SET registration_claimed_at=now()'),{code:'42501'});assert.equal((await claimUploadInterval()).actor_id,actors.family);
});
for(const patch of [{actor:actors.educator},{attempt:uid(998)},{review:'f'.repeat(64)},{review:null}])test('one-shot handoff rejects mismatched scope '+JSON.stringify(patch),async()=>{
 await readyInterval();await as(actors.family,'service_role');await assert.rejects(claimUploadInterval(db,patch),error=>['42501','55000'].includes(error.code));const rows=await intervalRows();assert.equal(rows.bindings[0].registration_claimed_at,null);assert.equal(rows.leases[0].state,'active');
});
test('service handoff rechecks removed editing access before pinning a file',async()=>{
 await readyInterval(actors.educator);await db.exec('RESET ROLE;TRUNCATE public.student_collaborators');await as(actors.educator,'service_role');await assert.rejects(claimUploadInterval(db,{actor:actors.educator}),{code:'42501'});assert.equal((await intervalRows()).bindings[0].registration_claimed_at,null);
});
test('missing uploaded object cannot mint a continuation receipt',async()=>{
 await uploadIntervalFixture();await pauseOperation(false);await as();await reserve();await as(actors.family,'service_role');await assert.rejects(claimUploadInterval(),{code:'55000'});assert.equal((await intervalRows()).bindings[0].registration_claimed_at,null);
});
test('unclaimed browser registration cannot consume a reserved interval',async()=>{
 await readyInterval();await assert.rejects(registerReserved(),{code:'55000'});const rows=await intervalRows();assert.equal(rows.leases[0].state,'active');assert.equal((await db.query('SELECT count(*)::int AS n FROM public.documents')).rows[0].n,0);
});
test('claim freezes upload admission and keeps registered work active until actual outcome',async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await assert.rejects(reserve(),{code:'55000'});await assert.rejects(db.query("SELECT public.can_insert_reserved_student_document($1,$2)",[student+'/'+attemptId+'-privacy-safe-document.txt',actors.family]),{code:'55000'});await registerReserved();await as(actors.family,'service_role');await assert.rejects(finishOperation(receipt),{code:'55000'});assert.equal((await intervalRows()).leases[0].state,'active');
});
for(const kind of ['clean','infected'])test('confirmed source-bound '+kind+' outcome can settle exactly once',async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await registerReserved();await confirmIntervalOutcome(kind);await as(actors.family,'service_role');assert.equal((await finishOperation(receipt)).state,'completed');await assert.rejects(finishOperation(receipt),{code:'42501'});
});
test('clean scan without a confirmed bound summary job cannot clear the interval',async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await registerReserved();await confirmIntervalOutcome();await db.exec("DELETE FROM public.ai_jobs");await as(actors.family,'service_role');await assert.rejects(finishOperation(receipt),{code:'55000'});assert.equal((await intervalRows()).leases[0].state,'active');
});
test('a changed stored version after handoff cannot register a different copy',async()=>{
 await readyInterval();await as(actors.family,'service_role');await claimUploadInterval();await db.exec('RESET ROLE');await db.query("UPDATE storage.objects SET version='replacement' WHERE name=$1",[student+'/'+attemptId+'-privacy-safe-document.txt']);await as();await assert.rejects(registerReserved(),{code:'55000'});
});
test('an actor review hold retains operation state and capacity without completion',async()=>{
 await readyInterval();await hold();const rows=await intervalRows();assert.equal(rows.leases[0].state,'needs_review');assert.equal(rows.bindings[0].registration_claimed_at,null);await as(actors.family,'service_role');await assert.rejects(claimUploadInterval(),{code:'42501'});await pauseOperation(true);await assert.rejects(pauseOperation(false,3),{code:'55000'});
});
for(const action of ["DELETE FROM public.document_upload_operation_bindings","UPDATE public.document_upload_operation_bindings SET operation_id=gen_random_uuid()","DELETE FROM public.document_upload_attempts","UPDATE public.document_upload_attempts SET storage_path='other-private-copy'"])test('retained interval identity refuses '+action.split(' ')[0]+' tampering',async()=>{
 await readyInterval();await db.exec('RESET ROLE');await assert.rejects(db.query(action),error=>['42501','23503'].includes(error.code));
});
test('failed registration transaction rolls back state but retains the one-shot claim',async()=>{
 await readyInterval();await as(actors.family,'service_role');await claimUploadInterval();await as();await db.exec('BEGIN');await registerReserved();await db.exec('ROLLBACK');const rows=await intervalRows();assert.ok(rows.bindings[0].registration_claimed_at);assert.equal(rows.leases[0].state,'active');assert.equal((await db.query('SELECT state FROM public.document_upload_attempts')).rows[0].state,'reserved');
});
test('interval installation refuses existing reservations without backfilling leases',async()=>{
 await uploadIntervalFixture(false);await pauseOperation(false);await as();await reserve();await as(actors.owner,'service_role');await pauseOperation(true);await db.exec('RESET ROLE');await assert.rejects(db.exec(uploadInterval),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.document_upload_operation_bindings') AS x")).rows[0].x,null);assert.equal((await db.query('SELECT count(*)::int AS n FROM public.document_operation_leases')).rows[0].n,0);
});

test('interval metadata and handoff helpers have exact grants and fixed paths',async()=>{
 await uploadIntervalFixture();await db.exec('RESET ROLE');
 const auth=[];
 const service=['claim_document_upload_registration_operation(uuid,uuid,text)'];
 const internal=['lock_document_upload_interval_control()','assert_document_upload_interval(uuid,text)','assert_document_upload_registered_outcome(uuid)','bind_document_upload_operation()','guard_document_upload_operation_binding()','guard_document_upload_interval_attempt()','guard_document_upload_interval_completion()'];
 for(const signature of [...auth,...service,...internal]){
  const fn=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',['public.'+signature])).rows[0];assert.equal(fn.prosecdef,true);assert.deepEqual(fn.proconfig,['search_path=pg_catalog']);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.'+signature])).rows[0].ok,role==='authenticated'?auth.includes(signature):role==='service_role'?service.includes(signature):false);
 }
 for(const signature of ['reserve_document_upload(uuid,uuid,text,text)','can_insert_reserved_student_document(text,text)','read_document_upload_registration(uuid,text)'])for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,'public.'+signature])).rows[0].ok,role==='authenticated');
 for(const role of ['anon','authenticated','service_role'])for(const action of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,$3) AS ok',[role,'public.document_upload_operation_bindings',action])).rows[0].ok,false);
 assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.document_upload_operation_bindings'::regclass")).rows[0].relrowsecurity,true);
});
for(const field of ['operation_id','actor_id','storage_path','review_context_sha256','claimed_object_id','claimed_object_version'])test('a claimed interval cannot replace its '+field,async()=>{
 await readyInterval();await as(actors.family,'service_role');await claimUploadInterval();await db.exec('RESET ROLE');const value=field.includes('version')||field.includes('path')||field.includes('sha256')?'different':uid(999);
 await assert.rejects(db.query('UPDATE public.document_upload_operation_bindings SET '+field+'=$1',[value]),{code:'42501'});
});
for(const patch of [{scan_status:'failed'},{scan_verdict:{code:'clean'}},{review_status:''},{review_status:'rejected'},{mime_type:'application/pdf'},{content_hash:'f'.repeat(64)},{archived_at:'2026-10-30'},{deleted_at:'2026-10-30'}])test('unconfirmed or blocked document outcome cannot close tracked work '+JSON.stringify(patch),async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await registerReserved();await confirmIntervalOutcome();
 const key=Object.keys(patch)[0];
 // Some protected identity changes are already refused by existing triggers.
 try{await db.query('UPDATE public.documents SET '+key+'=$1 WHERE id=$2',[typeof patch[key]==='object'?JSON.stringify(patch[key]):patch[key],uid(401)]);}catch(error){assert.equal(error.code,'42501');return;}
 await as(actors.family,'service_role');await assert.rejects(finishOperation(receipt),{code:'55000'});assert.equal((await intervalRows()).leases[0].state,'active');
});
for(const finish of ['COMMIT','ROLLBACK'])test('interval reservation and pause serialize after '+finish,{skip:!native},async()=>{
 await uploadIntervalFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.owner,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'authenticated');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');
 await a.exec('BEGIN');await reserve(a);assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=pauseOperation(true,2,b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).error,undefined);const rows=await intervalRows();assert.equal(rows.leases.length,finish==='COMMIT'?1:0);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('waiting new interval rechecks committed pause after '+finish,{skip:!native},async()=>{
 await uploadIntervalFixture();await pauseOperation(false);await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.owner,'service_role',a);await as(actors.family,'authenticated',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'authenticated');
 await a.exec('BEGIN');await pauseOperation(true,2,a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=reserve(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'55000');else assert.equal(x.error,undefined);const rows=await intervalRows();assert.equal(rows.bindings.length,finish==='COMMIT'?0:1);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('one-shot registration handoffs serialize after '+finish,{skip:!native},async()=>{
 await readyInterval();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');await a.exec('BEGIN');await claimUploadInterval(a);
 assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=claimUploadInterval(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'55000');else assert.equal(x.result.schema,'document-upload-registration-operation-v1');}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('hold prevents a waiting registration handoff after '+finish,{skip:!native},async()=>{
 await readyInterval();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'authenticated');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');await a.exec('BEGIN');await hold(a);
 assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=claimUploadInterval(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);const x=await pending;if(finish==='COMMIT')assert.equal(x.error?.code,'42501');else assert.equal(x.result.schema,'document-upload-registration-operation-v1');}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('waiting hold retains a claimed interval after '+finish,{skip:!native},async()=>{
 await readyInterval();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'service_role',a);await as(actors.family,'authenticated',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'service_role');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'authenticated');await a.exec('BEGIN');await claimUploadInterval(a);
 assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=hold(b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).result.state,'review_required');assert.equal((await intervalRows()).leases[0].state,'needs_review');}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('concurrent registration cannot be mistaken for completed upload after '+finish,{skip:!native},async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await db.exec('RESET ROLE');const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(actors.family,'service_role',b);assert.equal((await a.query('SELECT current_user AS role')).rows[0].role,'authenticated');assert.equal((await b.query('SELECT current_user AS role')).rows[0].role,'service_role');await a.exec('BEGIN');await registerReserved(a);
 assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=finishOperation(receipt,'completed',b).then(result=>({result}),error=>({error}));try{await waitForLock(pid);await a.exec(finish);assert.equal((await pending).error?.code,'55000');assert.equal((await intervalRows()).leases[0].state,'active');}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});

test('recovery refuses a registered clean row while its durable outcome remains uncertain',async()=>{
 await readyInterval();await as(actors.family,'service_role');await claimUploadInterval();await as();await registerReserved();await confirmIntervalOutcome();await as();await assert.rejects(db.query('SELECT public.read_document_upload_registration($1,$2)',[attemptId,reviewHash]),{code:'55000'});
});
test('confirmed outcome recovers after a lost reply without exposing tokens or repeating work',async()=>{
 await readyInterval();await as(actors.family,'service_role');const receipt=await claimUploadInterval();await as();await registerReserved();await confirmIntervalOutcome();await as(actors.family,'service_role');await finishOperation(receipt);await as();const recovered=(await db.query('SELECT public.read_document_upload_registration($1,$2) AS receipt',[attemptId,reviewHash])).rows[0].receipt;assert.equal(recovered.scan_status,'clean');assert.equal('operation_id' in recovered,false);assert.equal('receipt_id' in recovered,false);const rows=await intervalRows();assert.equal(rows.leases.length,1);assert.equal(rows.leases[0].state,'completed');
});

// Fifth proposal: unchanged cap values include registered-but-unsettled work.
const retainedUploadLimits=readFileSync('docs/production-readiness/proposals/document-upload-retained-limits.sql','utf8');
async function retainedQuotaFixture(){await uploadIntervalFixture();await db.exec('RESET ROLE');await db.exec(retainedUploadLimits);await as(actors.family,'service_role');await pauseOperation(false);}
async function quotaAttempt(n,{actor=actors.family,target=student,registered=true}={}){
 const attempt=uid(5000+n),document=uid(6000+n),hash=n.toString(16).padStart(64,'0');
 await as(actor);await reserve(db,{id:attempt,student:target,hash});
 if(!registered)return {attempt,actor,target,hash};
 const path=target+'/'+attempt+'-privacy-safe-document.txt';await reservedObject(db,{path,owner:actor});
 await as(actor,'service_role');const receipt=await claimUploadInterval(db,{attempt,actor});
 await as(actor);await registerReserved(db,{id:document,student:target,actor,path,attempt,hash});
 return {attempt,actor,target,hash,path,document,receipt};
}
async function completeQuotaAttempt(x,kind='clean'){
 await db.exec('RESET ROLE');const verdict={code:kind,provider:'cloudmersive',content_sha256:x.hash,source:'registration_reviewed_copy',clean_result:kind==='clean',blocked_reasons:kind==='clean'?[]:['Fictional threat']};
 await db.query("UPDATE public.documents SET scan_status=$1,scan_verdict=$2,scan_data_id='fictional-confirmed-scan',scanned_at=now(),review_status=$3,archived_at=CASE WHEN $1='infected' THEN now() ELSE NULL END WHERE id=$4",[kind,verdict,kind==='infected'?'rejected':'pending_review',x.document]);
 if(kind==='clean')await db.query("INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status,input_source) VALUES($1,$2,$3,'document_summary','queued',$4)",[uid(7000+Number(x.attempt.slice(-4))),x.target,x.actor,{document_id:x.document,storage_path:x.path}]);
 await as(x.actor,'service_role');await finishOperation(x.receipt,'completed',db,x.actor);
}
for(const state of ['active','needs_review'])test('registered '+state+' intervals still consume the actor cap across students',async()=>{
 await retainedQuotaFixture();const entries=[];for(let n=1;n<=5;n++)entries.push(await quotaAttempt(n,{target:n%2?student:otherStudent}));
 if(state==='needs_review')for(const x of entries){await as(x.actor,'service_role');await finishOperation(x.receipt,'needs_review',db,x.actor);}
 await as();await assert.rejects(reserve(db,{id:uid(5999),hash:'e'.repeat(64)}),{code:'42501'});
 const rows=await intervalRows();assert.equal(rows.bindings.length,5);assert.equal(rows.leases.filter(x=>x.state===state).length,5);
});
test('registered intervals consume the student cap across several authorized actors',async()=>{
 await retainedQuotaFixture();const roster=[actors.family,actors.educator,actors.student];
 for(let n=1;n<=10;n++)await quotaAttempt(n,{actor:roster[(n-1)%3]});
 await as(actors.educator);await assert.rejects(reserve(db,{id:uid(5999),hash:'e'.repeat(64)}),{code:'42501'});assert.equal((await intervalRows()).bindings.length,10);
});
test('mixed reserved, held and registered work shares the same actor cap',async()=>{
 await retainedQuotaFixture();await quotaAttempt(1);await quotaAttempt(2);const held=await quotaAttempt(3,{registered:false});await as();await hold(db,{id:held.attempt});await quotaAttempt(4,{registered:false});const exact=await quotaAttempt(5,{registered:false});
 await as();await assert.rejects(reserve(db,{id:uid(5999),hash:'e'.repeat(64)}),{code:'42501'});
 const before=await intervalRows();await as();const retry=await reserve(db,{id:exact.attempt,hash:exact.hash});assert.equal(retry.attempt_id,exact.attempt);assert.equal((await intervalRows()).bindings.length,before.bindings.length);
});
for(const kind of ['clean','infected'])test('only exact confirmed '+kind+' completion frees one reservation slot',async()=>{
 await retainedQuotaFixture();const entries=[];for(let n=1;n<=5;n++)entries.push(await quotaAttempt(n));
 await as();await assert.rejects(reserve(db,{id:uid(5998),hash:'e'.repeat(64)}),{code:'42501'});await completeQuotaAttempt(entries[0],kind);
 await as();await reserve(db,{id:uid(5998),hash:'e'.repeat(64)});await assert.rejects(reserve(db,{id:uid(5999),hash:'f'.repeat(64)}),{code:'42501'});
 const rows=await intervalRows();assert.equal(rows.bindings.length,6);assert.equal(rows.leases.filter(x=>x.state==='completed').length,1);
});
test('an old needs-review interval is retained without expiry or automatic release',async()=>{
 await retainedQuotaFixture();for(let n=1;n<=5;n++){const x=await quotaAttempt(n);await as(x.actor,'service_role');await finishOperation(x.receipt,'needs_review',db,x.actor);}
 await db.exec("RESET ROLE;UPDATE public.document_operation_leases SET started_at='2000-01-01',finished_at='2000-01-02'");
 await as();await assert.rejects(reserve(db,{id:uid(5999),hash:'f'.repeat(64)}),{code:'42501'});assert.equal((await intervalRows()).leases.filter(x=>x.state==='needs_review').length,5);
});
test('row registration and a clean document alone cannot free quota or complete a held operation',async()=>{
 await retainedQuotaFixture();const entries=[];for(let n=1;n<=5;n++)entries.push(await quotaAttempt(n));
 const x=entries[0];await db.exec('RESET ROLE');await db.query("UPDATE public.documents SET scan_status='clean' WHERE id=$1",[x.document]);await as(x.actor,'service_role');await assert.rejects(finishOperation(x.receipt),{code:'55000'});await finishOperation(x.receipt,'needs_review');await assert.rejects(finishOperation(x.receipt),{code:'42501'});
 await as();await assert.rejects(reserve(db,{id:uid(5999),hash:'f'.repeat(64)}),{code:'42501'});assert.equal((await intervalRows()).leases.filter(x=>x.state==='completed').length,0);
});
for(const [role,actor] of Object.entries(actors))test('retained-limit reservation preserves current explicit scope for '+role,async()=>{
 await retainedQuotaFixture();await as(actor);if(['family','educator','student'].includes(role))assert.equal((await reserve()).actor_id,actor);else await assert.rejects(reserve(),{code:'42501'});
});
for(const role of ['school','district','owner'])test('retained-limit reservation still honors explicit editor '+role,async()=>{
 await retainedQuotaFixture();await db.exec('RESET ROLE');await db.query("INSERT INTO public.student_collaborators VALUES($1,$2,'accepted','editor')",[student,actors[role]]);await as(actors[role]);assert.equal((await reserve()).actor_id,actors[role]);
});
test('retained-limit installation preserves function ACL, owner, path and token-free response',async()=>{
 await uploadIntervalFixture();await db.exec('RESET ROLE');const q="SELECT proacl::text AS acl,proowner,proconfig FROM pg_proc WHERE oid='public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure";const before=(await db.query(q)).rows[0];await db.exec(retainedUploadLimits);assert.deepEqual((await db.query(q)).rows[0],before);assert.equal((await db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure")).rows[0].hash,'dc8972ceac29738817b32b74ad411e1b');await as(actors.family,'service_role');await pauseOperation(false);await as();const receipt=await reserve();assert.deepEqual(Object.keys(receipt).sort(),['schema','attempt_id','actor_id','student_id','storage_path','state'].sort());
});
for(const drift of ['open','existing','grant','column-grant','path','body'])test('retained-limit installation refuses '+drift+' without repairing it',async()=>{
 await uploadIntervalFixture();if(drift==='open')await pauseOperation(false);if(drift==='existing'){await pauseOperation(false);await as();await reserve();await as(actors.family,'service_role');await pauseOperation(true);}
 await db.exec('RESET ROLE');if(drift==='grant')await db.exec('GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) TO anon');
 if(drift==='column-grant')await db.exec('GRANT SELECT(actor_id) ON public.document_upload_operation_bindings TO service_role');
 if(drift==='path')await db.exec("ALTER FUNCTION public.reserve_document_upload(uuid,uuid,text,text) RESET ALL");
 if(drift==='body'){const def=(await db.query("SELECT pg_get_functiondef('public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure) AS definition")).rows[0].definition;await db.exec(def.replace('\nBEGIN','\nBEGIN\n -- fixture-only definition drift'));}
 const expectedHash=(await db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure")).rows[0].hash;
 await assert.rejects(db.exec(retainedUploadLimits),{code:'55000'});await db.exec('ROLLBACK');
 assert.equal((await db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure")).rows[0].hash,expectedHash);
});
for(const boundary of ['actor','student'])for(const ending of ['COMMIT','ROLLBACK'])test('registered '+boundary+' quota serializes concurrent new attempts after '+ending,{skip:!native},async()=>{
 await retainedQuotaFixture();const roster=[actors.family,actors.educator,actors.student];for(let n=1;n<=(boundary==='actor'?4:9);n++)await quotaAttempt(n,{actor:boundary==='actor'?actors.family:roster[(n-1)%3]});
 const a=await newSession(),b=await newSession();await as(actors.family,'authenticated',a);await as(boundary==='actor'?actors.family:actors.educator,'authenticated',b);
 // Observe from the independent owner connection; restricted writers cannot
 // inspect the other session's pg_stat_activity wait fields. Keep both actual
 // reservations authenticated, not privileged, throughout the race.
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);
 for(const writer of [a,b])assert.equal((await writer.query("SELECT current_user='authenticated' AS restricted_writer")).rows[0].restricted_writer,true);
 await a.exec('BEGIN');await reserve(a,{id:uid(5998),hash:'e'.repeat(64)});const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const pending=reserve(b,{id:uid(5999),hash:'f'.repeat(64)}).then(result=>({result}),error=>({error}));
 try{await waitForLock(pid);await a.exec(ending);const result=await pending;if(ending==='COMMIT')assert.equal(result.error?.code,'42501');else assert.equal(result.error,undefined);const rows=await intervalRows();assert.equal(rows.bindings.length,boundary==='actor'?5:10);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});


test('retained limits preserve a distinct coherent admission owner without transferring ownership',async()=>{
 await uploadIntervalFixture();await db.exec('RESET ROLE');await db.exec("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='tf_document_admission_owner') THEN CREATE ROLE tf_document_admission_owner NOLOGIN NOINHERIT;END IF;END $$;ALTER TABLE public.document_operation_control OWNER TO tf_document_admission_owner;ALTER TABLE public.document_operation_leases OWNER TO tf_document_admission_owner;ALTER FUNCTION public.begin_document_operation(uuid,uuid,text) OWNER TO tf_document_admission_owner;ALTER FUNCTION public.finish_document_operation(uuid,uuid,uuid,text) OWNER TO tf_document_admission_owner;");
 const before=(await db.query("SELECT oid::regprocedure::text AS signature,proowner FROM pg_proc WHERE oid IN ('public.begin_document_operation(uuid,uuid,text)'::regprocedure,'public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure,'public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure) ORDER BY 1")).rows;
 await db.exec(retainedUploadLimits);assert.deepEqual((await db.query("SELECT oid::regprocedure::text AS signature,proowner FROM pg_proc WHERE oid IN ('public.begin_document_operation(uuid,uuid,text)'::regprocedure,'public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure,'public.reserve_document_upload(uuid,uuid,text,text)'::regprocedure) ORDER BY 1")).rows,before);
});
test('retained limits reject an incoherent admission routine owner without repairing it',async()=>{
 await uploadIntervalFixture();await db.exec('RESET ROLE');await db.exec("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='tf_document_admission_owner') THEN CREATE ROLE tf_document_admission_owner NOLOGIN NOINHERIT;END IF;END $$;ALTER FUNCTION public.begin_document_operation(uuid,uuid,text) OWNER TO tf_document_admission_owner;");
 await assert.rejects(db.exec(retainedUploadLimits),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT proowner='tf_document_admission_owner'::regrole AS retained FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure")).rows[0].retained,true);
});


// Atomic metadata handoff foundation; no worker/provider activation.
const summaryHandoff=readFileSync('docs/production-readiness/proposals/document-summary-operation-handoff.sql','utf8');
const handoffJob=uid(12001);
async function handoffFixture(install=true){
 await uploadIntervalFixture();await db.exec('RESET ROLE');await db.exec(retainedUploadLimits);await db.exec(sourceBindingProposal);if(install)await db.exec(summaryHandoff);
}
async function queuedHandoff(){await handoffFixture();await as(actors.family,'service_role');await pauseOperation(false);const entry=await quotaAttempt(1);await completeQuotaAttempt(entry);return entry;}
async function claimHandoff(client=db,job=handoffJob,attempt=0){return (await client.query('SELECT public.claim_admitted_document_summary($1,$2) AS receipt',[job,attempt])).rows[0].receipt;}
async function handoffRows(){await db.exec('RESET ROLE');return {jobs:(await db.query('SELECT id,status,locked_at,attempts FROM public.ai_jobs ORDER BY id')).rows,operations:(await db.query("SELECT operation_id,actor_id,operation_kind,state FROM public.document_operation_leases WHERE operation_kind='summary'")).rows,bindings:(await db.query('SELECT * FROM public.document_summary_operation_bindings')).rows,sourceBindings:(await db.query('SELECT job_id,first_claim_at,first_claim_attempt FROM public.document_summary_source_bindings')).rows};}
test('one summary handoff atomically claims metadata, binds source and admits exactly one operation',async()=>{
 const entry=await queuedHandoff();const receipt=await claimHandoff();assert.equal(receipt.schema,'document-summary-operation-claim-v1');assert.equal(receipt.job_id,handoffJob);assert.equal(receipt.claim_attempt,1);assert.equal(receipt.actor_id,actors.family);assert.equal(receipt.student_id,student);assert.equal(receipt.document_id,entry.document);assert.equal(receipt.storage_path,entry.path);assert.equal(receipt.content_sha256,entry.hash);assert.equal('context' in receipt,false);assert.equal('document_text' in receipt,false);assert.equal('result_payload' in receipt,false);
 const rows=await handoffRows();assert.equal(rows.jobs[0].status,'processing');assert.equal(rows.jobs[0].attempts,1);assert.equal(rows.operations.length,1);assert.equal(rows.operations[0].state,'active');assert.equal(rows.bindings.length,1);assert.equal(rows.bindings[0].operation_id,receipt.operation_id);assert.equal(rows.sourceBindings.length,1);assert.equal('context' in rows.bindings[0],false);
});
test('a lost committed handoff reply cannot reattach or create another operation',async()=>{
 await queuedHandoff();await claimHandoff();await assert.rejects(claimHandoff(),{code:'42501'});const rows=await handoffRows();assert.equal(rows.operations.length,1);assert.equal(rows.bindings.length,1);assert.equal(rows.jobs[0].attempts,1);
});
test('explicit rollback retains the queued job without either metadata binding or admission',async()=>{
 await queuedHandoff();await db.exec('BEGIN');await claimHandoff();await db.exec('ROLLBACK');const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.jobs[0].attempts,0);assert.equal(rows.jobs[0].locked_at,null);assert.equal(rows.operations.length,0);assert.equal(rows.bindings.length,0);assert.equal(rows.sourceBindings.length,0);
});
for(const role of ['anon',...Object.keys(actors)])test('summary handoff cannot be called by '+role,async()=>{
 await queuedHandoff();await as(actors[role]??actors.family,role==='anon'?'anon':'authenticated');await assert.rejects(claimHandoff(),{code:'42501'});const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.operations.length,0);
});
for(const fault of ['actor-access','partner','source-hash','object-version','scan','foreign-document','stale-attempt','wrong-kind'])test('summary handoff refuses '+fault+' without a partial claim or operation',async()=>{
 const entry=await queuedHandoff();await db.exec('RESET ROLE');
 if(fault==='actor-access')await db.query('UPDATE public.students SET owner_id=NULL WHERE id=$1',[student]);
 if(fault==='partner')await db.query("UPDATE public.user_roles SET role='partner' WHERE user_id=$1",[actors.family]);
 if(fault==='source-hash')await db.query('UPDATE public.documents SET content_hash=$1 WHERE id=$2',['f'.repeat(64),entry.document]);
 if(fault==='object-version')await db.query("UPDATE storage.objects SET version='changed' WHERE name=$1",[entry.path]);
 if(fault==='scan')await db.query("UPDATE public.documents SET scan_status='failed' WHERE id=$1",[entry.document]);
 if(fault==='foreign-document')await db.query("UPDATE public.ai_jobs SET input_source=jsonb_set(input_source,'{document_id}',to_jsonb($1::text)) WHERE id=$2",[uid(999999),handoffJob]);
 if(fault==='wrong-kind')await db.query("UPDATE public.ai_jobs SET job_type='pathway_report' WHERE id=$1",[handoffJob]);
 await as(actors.family,'service_role');await assert.rejects(claimHandoff(db,handoffJob,fault==='stale-attempt'?1:0));
 const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.jobs[0].attempts,0);assert.equal(rows.operations.length,0);assert.equal(rows.bindings.length,0);assert.equal(rows.sourceBindings.length,0);
});
test('pause refuses a queued summary handoff before changing its status',async()=>{
 await queuedHandoff();await pauseOperation(true);await assert.rejects(claimHandoff(),{code:'55000'});const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.operations.length,0);
});
test('a known summary claim alone cannot settle the operation',async()=>{
 await queuedHandoff();const receipt=await claimHandoff();await assert.rejects(finishOperation(receipt),{code:'55000'});const rows=await handoffRows();assert.equal(rows.operations[0].state,'active');assert.equal(rows.jobs[0].status,'processing');
});
test('a guarded completed summary can settle only its exact bound operation',async()=>{
 await queuedHandoff();const receipt=await claimHandoff();const s=(await db.query('SELECT public.read_verified_document_summary_source($1,$2,$3) AS source',[handoffJob,receipt.claim_at,receipt.claim_attempt])).rows[0].source;
 const payload={key_findings:['Fictional confirmed outcome'],_source:{document_id:s.document_id,object_id:s.object_id,object_version:s.object_version,content_sha256:s.content_sha256}};
 await db.query('SELECT public.complete_verified_document_summary($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[handoffJob,receipt.claim_at,receipt.claim_attempt,s.actor_id,s.student_id,s.document_id,s.object_id,s.object_version,s.content_sha256,s.context,payload]);await finishOperation(receipt);
 const rows=await handoffRows();assert.equal(rows.operations[0].state,'completed');assert.equal(rows.jobs[0].status,'completed');assert.equal(rows.bindings.length,1);
});
test('uncertain summary work remains counted and cannot be completed through ordinary finish',async()=>{
 await queuedHandoff();const receipt=await claimHandoff();await finishOperation(receipt,'needs_review');await assert.rejects(finishOperation(receipt),{code:'42501'});const rows=await handoffRows();assert.equal(rows.operations[0].state,'needs_review');assert.equal(rows.bindings.length,1);await as(actors.family,'service_role');await pauseOperation(true);await assert.rejects(pauseOperation(false,3),{code:'55000'});
});
for(const action of ['UPDATE public.document_summary_operation_bindings SET claim_attempt=claim_attempt+1','DELETE FROM public.document_summary_operation_bindings'])test('summary handoff binding refuses '+action.split(' ')[0]+' even from fixture owner',async()=>{
 await queuedHandoff();await claimHandoff();await db.exec('RESET ROLE');await assert.rejects(db.exec(action),{code:'42501'});assert.equal((await handoffRows()).bindings.length,1);
});
test('summary handoff exposes only one service RPC and no raw binding privilege',async()=>{
 await handoffFixture();await db.exec('RESET ROLE');for(const role of ['anon','authenticated','service_role']){
  assert.equal((await db.query("SELECT has_function_privilege($1,'public.claim_admitted_document_summary(uuid,integer)','EXECUTE') AS ok",[role])).rows[0].ok,role==='service_role');
  for(const signature of ['public.guard_document_summary_operation_binding()','public.guard_document_summary_operation_completion()'])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,false);
  for(const privilege of ['SELECT','INSERT','UPDATE','DELETE'])assert.equal((await db.query("SELECT has_table_privilege($1,'public.document_summary_operation_bindings',$2) AS ok",[role,privilege])).rows[0].ok,false);
 }
 assert.equal((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.document_summary_operation_bindings'::regclass")).rows[0].relrowsecurity,true);
});
for(const ending of ['COMMIT','ROLLBACK'])test('competing atomic summary handoffs admit one queued job after '+ending,{skip:!native},async()=>{
 await queuedHandoff();const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);for(const writer of [a,b])assert.equal((await writer.query("SELECT current_user='service_role' AS restricted_writer")).rows[0].restricted_writer,true);
 await a.exec('BEGIN');await claimHandoff(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=claimHandoff(b).then(result=>({result}),error=>({error}));
 try{await waitForLock(pid);await a.exec(ending);const result=await pending;if(ending==='COMMIT')assert.equal(result.error?.code,'42501');else assert.equal(result.error,undefined);const rows=await handoffRows();assert.equal(rows.operations.length,1);assert.equal(rows.bindings.length,1);assert.equal(rows.jobs[0].attempts,1);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});


test('atomic handoff refuses an older untracked source binding instead of replaying it',async()=>{
 await queuedHandoff();await db.exec('RESET ROLE');await db.query("UPDATE public.ai_jobs SET status='processing',locked_at=$1,attempts=1 WHERE id=$2",[claimAt,handoffJob]);await as('','service_role');await db.query('SELECT public.read_verified_document_summary_source($1,$2,1)',[handoffJob,claimAt]);await db.exec('RESET ROLE');await db.query("UPDATE public.ai_jobs SET status='queued',locked_at=NULL WHERE id=$1",[handoffJob]);await as('','service_role');await assert.rejects(claimHandoff(db,handoffJob,1),{code:'42501'});const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.operations.length,0);assert.equal(rows.bindings.length,0);assert.equal(rows.sourceBindings.length,1);
});
for(const drift of ['open','queued','read-body','grant','column-grant'])test('summary handoff installation refuses '+drift+' without repair',async()=>{
 await handoffFixture(false);
 if(drift==='open'){await as('','service_role');await pauseOperation(false);}
 if(drift==='queued'){await as('','service_role');await pauseOperation(false);const x=await quotaAttempt(1);await completeQuotaAttempt(x);await pauseOperation(true);}
 await db.exec('RESET ROLE');
 if(drift==='read-body')await db.exec("ALTER FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) RESET ALL");
 if(drift==='grant')await db.exec('GRANT EXECUTE ON FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) TO authenticated');
 if(drift==='column-grant')await db.exec('GRANT SELECT(actor_id) ON public.document_summary_source_bindings TO service_role');
 await assert.rejects(db.exec(summaryHandoff),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query("SELECT to_regclass('public.document_summary_operation_bindings') AS name")).rows[0].name,null);
});
for(const attempt of [null,-1,2147483647])test('atomic summary handoff rejects unsupported expected attempt '+attempt,async()=>{
 await queuedHandoff();await assert.rejects(claimHandoff(db,handoffJob,attempt),{code:'42501'});const rows=await handoffRows();assert.equal(rows.jobs[0].status,'queued');assert.equal(rows.operations.length,0);
});
for(const ending of ['COMMIT','ROLLBACK'])test('atomic summary claim and maintenance pause serialize after '+ending,{skip:!native},async()=>{
 await queuedHandoff();const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);for(const writer of [a,b])assert.equal((await writer.query("SELECT current_user='service_role' AS restricted_writer")).rows[0].restricted_writer,true);
 await a.exec('BEGIN');await claimHandoff(a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=pauseOperation(true,2,b).then(result=>({result}),error=>({error}));
 try{await waitForLock(pid);await a.exec(ending);assert.equal((await pending).error,undefined);const rows=await handoffRows();assert.equal(rows.jobs[0].status,ending==='COMMIT'?'processing':'queued');assert.equal(rows.operations.length,ending==='COMMIT'?1:0);assert.equal(rows.bindings.length,ending==='COMMIT'?1:0);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
for(const ending of ['COMMIT','ROLLBACK'])test('queued summary claim observes a waiting pause after '+ending,{skip:!native},async()=>{
 await queuedHandoff();const a=await newSession(),b=await newSession();await as('','service_role',a);await as('','service_role',b);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT current_user=session_user AS owner_observer')).rows[0].owner_observer,true);for(const writer of [a,b])assert.equal((await writer.query("SELECT current_user='service_role' AS restricted_writer")).rows[0].restricted_writer,true);
 await a.exec('BEGIN');await pauseOperation(true,2,a);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;const pending=claimHandoff(b).then(result=>({result}),error=>({error}));
 try{await waitForLock(pid);await a.exec(ending);const result=await pending;if(ending==='COMMIT')assert.equal(result.error?.code,'55000');else assert.equal(result.error,undefined);const rows=await handoffRows();assert.equal(rows.jobs[0].status,ending==='COMMIT'?'queued':'processing');assert.equal(rows.operations.length,ending==='COMMIT'?0:1);}finally{await a.exec('ROLLBACK');await b.exec('ROLLBACK');await pending;}
});
