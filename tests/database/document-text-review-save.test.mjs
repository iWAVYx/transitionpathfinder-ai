// Disposable synthetic metadata only; never use a hosted URL or app credentials.
import test,{before,beforeEach,after,afterEach}from'node:test';import assert from'node:assert/strict';
import{readFileSync}from'node:fs';import{pathToFileURL}from'node:url';import{randomUUID}from'node:crypto';
const native=process.env.PATHWAY_HISTORY_POSTGRES==='1';let db,close,newSession,extra=[];
const sql=readFileSync('docs/production-readiness/proposals/document-text-review-save.sql','utf8');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const signature='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)';
before(async()=>{
 if(native){if(!['localhost','127.0.0.1'].includes(process.env.PGHOST))throw Error('Explicit loopback PostgreSQL only');const pg=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href);const{Client}=pg.default??pg;const opts={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};const control=new Client({...opts,database:'postgres'});await control.connect();const name='tf_text_'+randomUUID().replaceAll('-','');await control.query('CREATE DATABASE '+name);const clients=[];newSession=async()=>{const c=new Client({...opts,database:name});await c.connect();clients.push(c);return{exec:s=>c.query(s),query:(...a)=>c.query(...a)};};db=await newSession();close=async()=>{await Promise.all(clients.map(c=>c.end()));await control.query('DROP DATABASE '+name);await control.end();};}
 else{const{PGlite}=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href);db=new PGlite();close=()=>db.close();}
 await db.exec("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated;END IF;IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role;END IF;END $$;CREATE SCHEMA IF NOT EXISTS auth;CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated");
});after(async()=>{if(close)await close();});afterEach(async()=>{if(db)await db.exec('ROLLBACK;RESET ROLE');for(const c of extra)await c.exec('ROLLBACK;RESET ROLE');extra=[];});
beforeEach(async()=>{await db.exec(`ROLLBACK;RESET ROLE;DROP SCHEMA public CASCADE;CREATE SCHEMA public;GRANT USAGE ON SCHEMA public TO authenticated,anon,service_role;
 CREATE TABLE public.documents(id uuid PRIMARY KEY,student_id uuid,updated_at timestamptz,scan_status text,review_status text,archived_at timestamptz,deleted_at timestamptz);
 CREATE TABLE public.document_extractions(id uuid PRIMARY KEY,document_id uuid,student_id uuid,updated_at timestamptz,status text,raw_extract jsonb,sections jsonb,created_by uuid);
 CREATE TABLE public.fixture_access(actor uuid PRIMARY KEY,editable boolean,viewable boolean,partner boolean);GRANT SELECT ON public.fixture_access TO authenticated;
 CREATE FUNCTION public.can_edit_student(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT editable FROM public.fixture_access WHERE actor=$1 AND $2='${id(3)}'$$;
 CREATE FUNCTION public.can_view_document(uuid,uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT viewable FROM public.fixture_access WHERE actor=$1 AND $2='${id(2)}'$$;
 CREATE FUNCTION public.is_partner_only(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$SELECT partner FROM public.fixture_access WHERE actor=$1$$;
 CREATE FUNCTION public.fixture_revision() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END$$;
 CREATE TRIGGER document_extractions_set_updated_at BEFORE UPDATE ON public.document_extractions FOR EACH ROW EXECUTE FUNCTION public.fixture_revision();
 CREATE TRIGGER set_updated_at_documents BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.fixture_revision();
 ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
 GRANT SELECT,UPDATE ON public.documents,public.document_extractions TO authenticated;
 CREATE POLICY fixture_document ON public.documents TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));
 CREATE POLICY fixture_review ON public.document_extractions TO authenticated USING(public.can_edit_student(auth.uid(),student_id)) WITH CHECK(public.can_edit_student(auth.uid(),student_id));
 INSERT INTO public.documents VALUES('${id(2)}','${id(3)}','2026-11-06T12:00:00.000001Z','clean','accepted',NULL,NULL);
 INSERT INTO public.document_extractions VALUES('${id(4)}','${id(2)}','${id(3)}','2026-11-06T12:00:00.000001Z','in_review','{}','{"keep":"original"}','${id(8)}');
 INSERT INTO public.fixture_access VALUES('${id(1)}',true,true,false),('${id(7)}',false,true,false);`);await db.exec(sql);});
async function as(actor=id(1),role='authenticated',c=db){assert.ok(['authenticated','anon','service_role'].includes(role));await c.exec('RESET ROLE');await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[actor]);await c.exec('SET ROLE '+role);}
function args(){return[id(4),id(3),id(2),'2026-11-06T12:00:00.000001Z','2026-11-06T12:00:00.000001Z','in_review',{strengths:'Fictional draft'},{strengths:{state:'pending',value:'Fictional draft'}}];}
async function save(a=args(),c=db){return(await c.query('SELECT public.save_document_text_review($1,$2,$3,$4,$5,$6,$7,$8) AS result',a)).rows[0].result;}
async function rows(){await db.exec('RESET ROLE');return(await db.query('SELECT * FROM public.document_extractions ORDER BY id')).rows;}
test('text save updates exact review atomically and preserves creator',async()=>{await as();const r=await save();assert.equal(r.schema,'document-text-review-saved-v1');assert.equal(r.extraction.created_by,id(8));assert.equal(r.extraction.status,'needs_review');assert.equal(r.extraction.sections.strengths.value,'Fictional draft');});
for(const[role,actor]of[['anon',id(1)],['service_role',id(1)],['authenticated',id(7)]])test('text save refuses unauthorized '+role+' '+actor,async()=>{const before=await rows();await as(actor,role);await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),before);});
for(const[index,value]of[[0,id(9)],[1,id(9)],[2,id(9)],[3,'2026-11-06T12:00:00.000000Z'],[4,'2026-11-06T12:00:00Z'],[5,'complete'],[6,null],[7,[]]])test('text save refuses changed or invalid request field '+index,async()=>{const before=await rows();const a=args();a[index]=value;await as();await assert.rejects(save(a),{code:'42501'});assert.deepEqual(await rows(),before);});
for(const change of["scan_status='failed'","review_status='rejected'","deleted_at=clock_timestamp()","archived_at=clock_timestamp()"] )test('text save refuses unavailable source '+change,async()=>{await db.exec('UPDATE public.documents SET '+change);const before=await rows();await as();await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),before);});
for(const field of['editable','viewable','partner'])test('text save refuses changed access '+field,async()=>{await db.exec('UPDATE public.fixture_access SET '+field+'='+ (field==='partner'?'true':'false'));const before=await rows();await as();await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),before);});
test('text save refuses completed or deleted review without recreation',async()=>{await db.exec("UPDATE public.document_extractions SET status='complete'");await as();await assert.rejects(save(),{code:'42501'});await db.exec('RESET ROLE;DELETE FROM public.document_extractions');await as();await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),[]);});
test('text save rollback restores exact prior review',async()=>{const before=await rows();await as();await db.exec('BEGIN');await save();await db.exec('ROLLBACK');assert.deepEqual(await rows(),before);});
test('text save RLS prevents a broader helper from granting raw row visibility',async()=>{await db.exec('DROP POLICY fixture_review ON public.document_extractions');const before=await rows();await as();await assert.rejects(save(),{code:'42501'});assert.deepEqual(await rows(),before);});
test('text save has fixed invoker path and authenticated-only execution',async()=>{const f=(await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature])).rows[0];assert.equal(f.prosecdef,false);assert.deepEqual(f.proconfig,['search_path=pg_catalog']);for(const role of['anon','authenticated','service_role'])assert.equal((await db.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') AS allowed',[role,signature])).rows[0].allowed,role==='authenticated');});
for(const trigger of['document_extractions_set_updated_at','set_updated_at_documents'])test('text save installation refuses disabled revision trigger '+trigger,async()=>{await db.exec('DROP FUNCTION '+signature+';ALTER TABLE public.'+(trigger.startsWith('document_extractions')?'document_extractions':'documents')+' DISABLE TRIGGER '+trigger);await assert.rejects(db.exec(sql),{code:'55000'});await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS name',[signature])).rows[0].name,null);});
for(const outcome of['COMMIT','ROLLBACK'])test('text save native document writer waits for save '+outcome,{skip:!native},async()=>{const b=await newSession();extra.push(b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await as();await db.exec('BEGIN');await save();let settled=false;const pending=b.exec("UPDATE public.documents SET review_status='rejected'").then(()=>{settled=true;});await waitBlocked(pid,db);assert.equal(settled,false);await db.exec(outcome);await pending;assert.equal(settled,true);const data=await rows();assert.equal(data[0].status,outcome==='COMMIT'?'needs_review':'in_review');});

async function waitBlocked(pid,holder){
 for(let n=0;n<100;n++){
  const r=await holder.query('SELECT pg_backend_pid()=ANY(pg_blocking_pids($1)) AS blocked',[pid]);
  if(r.rows[0].blocked)return;
  await holder.query('SELECT pg_sleep(0.02)');
 }
 assert.fail('Concurrent writer never reached the expected row lock');
}
for(const relation of ['documents','document_extractions'])for(const outcome of ['COMMIT','ROLLBACK'])test('text save native waits behind changed '+relation+' '+outcome,{skip:!native},async()=>{
 const b=await newSession();extra.push(b);await as(id(1),'authenticated',b);const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 await db.exec('BEGIN');await db.exec('UPDATE public.'+relation+" SET updated_at=clock_timestamp()");
 const pending=save(args(),b).then(result=>({result}),error=>({error}));await waitBlocked(pid,db);await db.exec(outcome);
 const r=await pending;if(outcome==='COMMIT'){assert.equal(r.error?.code,'42501');assert.equal((await rows())[0].status,'in_review');}else{assert.equal(r.result?.schema,'document-text-review-saved-v1');}
});
