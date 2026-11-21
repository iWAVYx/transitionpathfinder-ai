// Disposable synthetic metadata only; never use a hosted URL or app credentials.
import test,{before,beforeEach,after,afterEach}from'node:test';import assert from'node:assert/strict';
import{readFileSync}from'node:fs';import{pathToFileURL}from'node:url';import{randomUUID}from'node:crypto';
const native=process.env.PATHWAY_HISTORY_POSTGRES==='1';let db,close,newSession,extra=[];
const baseSave=readFileSync('docs/production-readiness/proposals/document-text-review-save.sql','utf8');
const sql=readFileSync('docs/production-readiness/proposals/document-text-review-authority-lock.sql','utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const signature='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)';
before(async()=>{
 if(native){if(!['localhost','127.0.0.1'].includes(process.env.PGHOST))throw Error('Explicit loopback PostgreSQL only');const pg=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href);const{Client}=pg.default??pg;const opts={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};const control=new Client({...opts,database:'postgres'});await control.connect();const name='tf_text_'+randomUUID().replaceAll('-','');await control.query('CREATE DATABASE '+name);const clients=[];newSession=async()=>{const c=new Client({...opts,database:name});await c.connect();clients.push(c);return{exec:s=>c.query(s),query:(...a)=>c.query(...a)};};db=await newSession();close=async()=>{await Promise.all(clients.map(c=>c.end()));await control.query('DROP DATABASE '+name);await control.end();};}
 else{const{PGlite}=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href);db=new PGlite();close=()=>db.close();}
 await db.exec("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role;END IF;END $$;CREATE SCHEMA IF NOT EXISTS auth;CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated");
});after(async()=>{if(close)await close();});afterEach(async()=>{if(db)await db.exec('ROLLBACK;RESET ROLE');for(const c of extra)await c.exec('ROLLBACK;RESET ROLE');extra=[];});

function canonical(name,file){const source=readFileSync('supabase/migrations/'+file,'utf8');const start=source.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');const end=source.indexOf('$$;',start);assert.ok(start>=0&&end>start,name);return source.slice(start,end+3);}
beforeEach(async()=>{
 await db.exec(`ROLLBACK;RESET ROLE;DROP SCHEMA public CASCADE;CREATE SCHEMA public;GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
 CREATE TYPE public.app_role AS ENUM('parent','educator','student','partner','admin','school_admin','district_admin');
 CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid);
 CREATE TABLE public.student_collaborators(id uuid PRIMARY KEY,student_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.student_relationships(id uuid PRIMARY KEY,student_id uuid,related_user_id uuid,consent_status text,permission_level text);
 CREATE TABLE public.user_roles(id uuid PRIMARY KEY,user_id uuid,role public.app_role);
 CREATE TABLE public.document_permissions(document_id uuid,permission_level text,user_id uuid,role_type text);
 CREATE FUNCTION public.has_audience(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
 CREATE TABLE public.documents(id uuid PRIMARY KEY,student_id uuid,updated_at timestamptz,scan_status text,review_status text,archived_at timestamptz,deleted_at timestamptz);
 CREATE TABLE public.document_extractions(id uuid PRIMARY KEY,document_id uuid,student_id uuid,updated_at timestamptz,status text,raw_extract jsonb,sections jsonb,created_by uuid);
 CREATE TABLE public.document_operation_control(singleton boolean PRIMARY KEY,paused boolean);INSERT INTO public.document_operation_control VALUES(true,true);
 CREATE FUNCTION public.fixture_revision() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END$$;
 CREATE TRIGGER document_extractions_set_updated_at BEFORE UPDATE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.fixture_revision();
 CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.fixture_revision();
 INSERT INTO public.students VALUES('${id(3)}','${id(1)}',NULL);
 INSERT INTO public.user_roles VALUES('${id(10)}','${id(1)}','educator');
 INSERT INTO public.documents VALUES('${id(2)}','${id(3)}','2026-11-06T12:00:00.000001Z','clean','accepted',NULL,NULL);
 INSERT INTO public.document_extractions VALUES('${id(4)}','${id(2)}','${id(3)}','2026-11-06T12:00:00.000001Z','in_review','{}','{"keep":"original"}','${id(8)}');`);
 for(const[name,file]of[['can_access_student','20261024010000_remove_implicit_admin_student_access.sql'],['can_edit_student','20261024010000_remove_implicit_admin_student_access.sql'],['is_partner_only','20260907190000_security_finding_alignment.sql'],['can_view_document','20260611232723_f4eac771-7183-4a69-887e-49ea6b7c4f75.sql']])await db.exec(canonical(name,file));
 await db.exec(`GRANT SELECT,UPDATE ON public.documents,public.document_extractions TO authenticated;
 ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;ALTER TABLE public.student_collaborators ENABLE ROW LEVEL SECURITY;ALTER TABLE public.student_relationships ENABLE ROW LEVEL SECURITY;ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
 CREATE POLICY fixture_document ON public.documents TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));
 CREATE POLICY fixture_review ON public.document_extractions TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));`);
 await db.exec(baseSave);await db.exec(sql);
});
async function as(actor=id(1),role='authenticated',c=db){assert.ok(['authenticated','anon','service_role'].includes(role));await c.exec('RESET ROLE');await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor]);await c.exec('SET ROLE '+role);}
function args(){return[id(4),id(3),id(2),'2026-11-06T12:00:00.000001Z','2026-11-06T12:00:00.000001Z','in_review',{strengths:'Fictional draft'},{strengths:{state:'pending',value:'Fictional draft'}}];}
async function save(a=args(),c=db){
 // pg encodes JavaScript arrays as PostgreSQL arrays, unlike object parameters.
 // Send JSON bytes explicitly so [] remains a JSON array in both runners.
 const values=a.map((value,index)=>index>=6&&value!==null?JSON.stringify(value):value);
 return(await c.query('SELECT public.save_document_text_review($1,$2,$3,$4,$5,$6,$7,$8) AS result',values)).rows[0].result;
}
async function rows(){await db.exec('RESET ROLE');return(await db.query('SELECT * FROM public.document_extractions ORDER BY id')).rows;}
async function waitBlocked(pid,holder){
 for(let n=0;n<100;n++){
  const r=await holder.query('SELECT pg_backend_pid()=ANY(pg_blocking_pids($1)) AS blocked',[pid]);
  if(r.rows[0].blocked)return;
  await holder.query('SELECT pg_sleep(0.02)');
 }
 assert.fail('Concurrent writer never reached the expected row lock');
}
async function proof(kind){
 await db.exec('RESET ROLE');
 if(kind==='self')await db.exec(`UPDATE public.students SET owner_id='${id(9)}',student_user_id='${id(1)}'`);
 if(kind==='collaborator'){await db.exec(`UPDATE public.students SET owner_id='${id(9)}';INSERT INTO public.student_collaborators VALUES('${id(20)}','${id(3)}','${id(1)}','accepted','editor')`);}
 if(kind==='relationship'){await db.exec(`UPDATE public.students SET owner_id='${id(9)}';INSERT INTO public.student_relationships VALUES('${id(21)}','${id(3)}','${id(1)}','approved','manage_documents')`);}
 if(kind==='role')await db.exec(`INSERT INTO public.user_roles VALUES('${id(22)}','${id(1)}','partner')`);
}
function removal(kind){return{owner:`UPDATE public.students SET owner_id='${id(9)}'`,self:`UPDATE public.students SET student_user_id='${id(9)}'`,collaborator:'DELETE FROM public.student_collaborators',relationship:"UPDATE public.student_relationships SET consent_status='revoked'",role:"DELETE FROM public.user_roles WHERE role='educator'"}[kind];}
for(const kind of['owner','self','collaborator','relationship'])test('text authority real canonical '+kind+' proof saves',async()=>{await proof(kind);await as();assert.equal((await save()).schema,'document-text-review-saved-v1');});
for(const kind of['owner','self','collaborator','relationship','role'])test('text authority refuses removed '+kind+' proof',async()=>{await proof(kind);await db.exec(removal(kind));const before=await rows();await as();await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),before);});
test('text authority management role alone does not grant student editing',async()=>{await db.exec(`UPDATE public.students SET owner_id='${id(9)}';UPDATE public.user_roles SET role='admin'`);await as();await assert.rejects(save(),{code:'42501'});});
test('text authority explicit management relationship still works',async()=>{await proof('relationship');await db.exec("UPDATE public.user_roles SET role='admin'");await as();assert.equal((await save()).schema,'document-text-review-saved-v1');});
test('text authority partner plus educator keeps existing non-partner-only behavior',async()=>{await proof('role');await as();assert.equal((await save()).schema,'document-text-review-saved-v1');});
test('text authority helper returns no rows and adds no raw table grants',async()=>{for(const table of['students','student_collaborators','student_relationships','user_roles'])assert.equal((await db.query('SELECT has_table_privilege(\'authenticated\',$1,\'UPDATE\') AS allowed',['public.'+table])).rows[0].allowed,false);for(const role of['anon','authenticated','service_role'])assert.equal((await db.query('SELECT has_function_privilege($1,\'public.lock_document_text_review_authority(uuid)\',\'EXECUTE\') AS allowed',[role])).rows[0].allowed,role==='authenticated');for(const role of['anon','authenticated','service_role'])assert.equal((await db.query('SELECT has_function_privilege($1,\'public.lock_document_text_role_change()\',\'EXECUTE\') AS allowed',[role])).rows[0].allowed,false);const helper=(await db.query("SELECT prosecdef,proconfig FROM pg_proc WHERE oid='public.lock_document_text_review_authority(uuid)'::regprocedure")).rows[0];assert.equal(helper.prosecdef,true);assert.deepEqual(helper.proconfig,['search_path=pg_catalog']);await as();assert.equal((await db.query('SELECT public.lock_document_text_review_authority($1) AS result',[id(3)])).rows[0].result,'');});
test('text authority save body changes only by the authority lock call',async()=>{await db.exec('RESET ROLE');const body=(await db.query('SELECT prosrc,prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];const original=baseSave.split('AS $text_save$')[1].split('$text_save$;')[0];assert.equal(body.prosrc.replace(' PERFORM public.lock_document_text_review_authority(_student_id);\n',''),original);assert.equal(body.prosecdef,false);assert.deepEqual(body.proconfig,['search_path=pg_catalog']);});
test('text authority install refuses changed access helper',async()=>{await db.exec("DROP TRIGGER user_roles_document_text_authority ON public.user_roles;DROP FUNCTION public.lock_document_text_role_change(),public.lock_document_text_review_authority(uuid);"+baseSave.replace('CREATE FUNCTION public.save_document_text_review','CREATE OR REPLACE FUNCTION public.save_document_text_review'));await db.exec('CREATE OR REPLACE FUNCTION public.can_edit_student(_user_id uuid,_student_id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT true$$');await assert.rejects(db.exec(sql),{code:'55000'});await db.exec('ROLLBACK');});
test('text authority install refuses unpaused control',async()=>{await db.exec("DROP TRIGGER user_roles_document_text_authority ON public.user_roles;DROP FUNCTION public.lock_document_text_role_change(),public.lock_document_text_review_authority(uuid);"+baseSave.replace('CREATE FUNCTION public.save_document_text_review','CREATE OR REPLACE FUNCTION public.save_document_text_review'));await db.exec('UPDATE public.document_operation_control SET paused=false');await assert.rejects(db.exec(sql),{code:'55000'});await db.exec('ROLLBACK');});
for(const kind of['owner','self','collaborator','relationship','role'])for(const outcome of['COMMIT','ROLLBACK'])test('text authority native removal waits for save '+kind+' '+outcome,{skip:!native},async()=>{
 await proof(kind);const b=await newSession();extra.push(b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await as();await db.exec('BEGIN');await save();
 const pending=b.exec(removal(kind)).then(()=>({ok:true}),error=>({error}));await waitBlocked(pid,db);await db.exec(outcome);const r=await pending;assert.equal(r.error,undefined);assert.equal((await rows())[0].status,outcome==='COMMIT'?'needs_review':'in_review');
});
for(const kind of['owner','self','collaborator','relationship','role'])for(const outcome of['COMMIT','ROLLBACK'])test('text authority native save waits for removal '+kind+' '+outcome,{skip:!native},async()=>{
 await proof(kind);const b=await newSession();extra.push(b);await as(id(1),'authenticated',b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await db.exec('BEGIN');await db.exec(removal(kind));const pending=save(args(),b).then(result=>({result}),error=>({error}));await waitBlocked(pid,db);await db.exec(outcome);const r=await pending;
 if(outcome==='COMMIT'){assert.equal(r.error?.code,'42501');assert.equal((await rows())[0].status,'in_review');}else assert.equal(r.result?.schema,'document-text-review-saved-v1');
});

test('text authority refuses a foreign student without returning a proof',async()=>{await as();await assert.rejects(db.query('SELECT public.lock_document_text_review_authority($1)',[id(99)]),{code:'42501'});});
for(const outcome of ['COMMIT','ROLLBACK'])test('text authority native role truncation waits for save '+outcome,{skip:!native},async()=>{
 const b=await newSession();extra.push(b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await as();await db.exec('BEGIN');await save();
 const pending=b.exec('TRUNCATE public.user_roles').then(()=>({ok:true}),error=>({error}));await waitBlocked(pid,db);await db.exec(outcome);assert.equal((await pending).error,undefined);assert.equal((await rows())[0].status,outcome==='COMMIT'?'needs_review':'in_review');
});
