// Disposable database only: no hosted URLs or credentials are accepted.
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
const real=process.env.PATHWAY_HISTORY_POSTGRES==='1';
const sql=name=>readFileSync('supabase/migrations/'+name,'utf8');
const uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const owner=uid(1),editor=uid(2),viewer=uid(3),unrelated=uid(4),admin=uid(5),related=uid(6),student=uid(10),otherStudent=uid(11);
const signature='public.save_extracted_report_evidence(uuid,text,uuid,text,jsonb)';
const item=(overrides={})=>({report_section:'documents',note:'Fictional documented observation',snippet_hash:'a'.repeat(32),...overrides});
let db,close,newSession;
async function as(user=owner,role='authenticated',client=db){
 assert.ok(['authenticated','anon','service_role'].includes(role));
 await client.exec('RESET ROLE');await client.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);await client.exec('SET ROLE '+role);
}
function save(items=[item()],options={},client=db){return client.query('SELECT * FROM public.save_extracted_report_evidence($1,$2,$3,$4,$5::jsonb)',[options.student??student,options.kind??'document',options.source??null,options.label??'Fictional source',JSON.stringify(items)]);}
async function rows(){await db.exec('RESET ROLE');return (await db.query('SELECT * FROM public.report_evidence_links ORDER BY id')).rows;}
before(async()=>{
 if(real){
  if(![undefined,'localhost','127.0.0.1'].includes(process.env.PGHOST))throw Error('Disposable tests require loopback PGHOST');
  const module=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href);const {Client}=module.default??module;
  const options={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};
  const adminClient=new Client({...options,database:'postgres'});await adminClient.connect();const name='tf_evidence_'+randomUUID().replaceAll('-','');await adminClient.query(`CREATE DATABASE ${name}`);const clients=[];
  newSession=async()=>{const c=new Client({...options,database:name});await c.connect();clients.push(c);return {query:(...args)=>c.query(...args),exec:s=>c.query(s)};};
  close=async()=>{try{await Promise.all(clients.map(c=>c.end()));}finally{try{await adminClient.query(`DROP DATABASE ${name}`);}finally{await adminClient.end();}}};db=await newSession();
 }else{const {PGlite}=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href);db=new PGlite();close=()=>db.close();}
 await db.exec(`DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
 END $$;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
 CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid);
 CREATE TABLE public.student_collaborators(student_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.student_relationships(student_id uuid,related_user_id uuid,consent_status text,permission_level text);
 CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now();RETURN NEW;END $$;`);
 await db.exec(sql('20261024010000_remove_implicit_admin_student_access.sql').split('-- Editing a profile')[0]+'COMMIT;');
 await db.exec(sql('20260715000042_0c1f2f66-6870-408a-b62f-18ad2784caa5.sql'));
 await db.exec(sql('20260715014612_cb7cf0b6-afe9-4d8d-a5d3-609f754b7395.sql'));
 await db.exec(sql('20261026010000_save_extracted_report_evidence.sql'));
});
after(async()=>{if(close)await close();});
beforeEach(async()=>{
 await db.exec(`RESET ROLE;TRUNCATE public.report_evidence_links,public.student_collaborators,public.student_relationships,public.students,auth.users CASCADE;
 INSERT INTO auth.users VALUES('${owner}'),('${editor}'),('${viewer}'),('${unrelated}'),('${admin}'),('${related}');
 INSERT INTO public.students VALUES('${student}','${owner}',NULL),('${otherStudent}','${owner}',NULL);
 INSERT INTO public.student_collaborators VALUES('${student}','${editor}','accepted','editor'),('${student}','${viewer}','accepted','viewer');
 INSERT INTO public.student_relationships VALUES('${student}','${related}','approved','manage_documents');`);
});
test('canonical historical conflict target reproduces 42P10 with no write',async()=>{
 await as();await assert.rejects(db.query(`INSERT INTO public.report_evidence_links(student_id,report_section,source_kind,source_label,note,snippet_hash) VALUES($1,'documents','document','Fictional','Observation',$2) ON CONFLICT(student_id,report_section,source_kind,source_id,snippet_hash) DO NOTHING`,[student,'a'.repeat(32)]),{code:'42P10'});assert.equal((await rows()).length,0);
});
for(const source of [null,uid(20)])test('duplicates with source '+source+' skip without overwriting',async()=>{
 await as();const first=await save([item()],{source});assert.equal(first.rows.length,1);assert.equal((await save([item({note:'Changed duplicate'})],{source,label:'Changed label'})).rows.length,0);
 const saved=await rows();assert.equal(saved.length,1);assert.equal(saved[0].id,first.rows[0].id);assert.equal(saved[0].note,item().note);assert.equal(saved[0].source_label,'Fictional source');assert.equal(saved[0].created_by,owner);
});
test('duplicates inside one batch and mixed batches return only actual inserted IDs',async()=>{
 await as();assert.equal((await save([item(),item(),item({snippet_hash:'b'.repeat(32)})])).rows.length,2);assert.equal((await save([item(),item({snippet_hash:'c'.repeat(32)})])).rows.length,1);assert.equal((await rows()).length,3);
});
test('distinct section, source, kind, hash and student remain independent',async()=>{
 await as();await save();await save([item({report_section:'snapshot'})]);await save([item()],{source:uid(20)});await save([item()],{kind:'note'});await save([item({snippet_hash:'b'.repeat(32)})]);await save([item()],{student:otherStudent});assert.equal((await rows()).length,6);
});
for(const actor of [owner,editor,related])test('existing edit access saves as actual caller '+actor,async()=>{
 await as(actor);await save([item({created_by:owner,student_id:otherStudent,source_id:uid(99)})]);const [saved]=await rows();assert.equal(saved.created_by,actor);assert.equal(saved.student_id,student);assert.equal(saved.source_id,null);
});
for(const actor of [viewer,unrelated,admin,''])test('read-only, unrelated, management-only or missing caller denied '+actor,async()=>{
 await as(actor);await assert.rejects(save(),{code:'42501'});assert.equal((await rows()).length,0);
});
test('viewer can read but cannot save; revoked editor loses both permissions',async()=>{
 await as();await save();await as(viewer);assert.equal((await db.query('SELECT id FROM public.report_evidence_links')).rows.length,1);await assert.rejects(save(),{code:'42501'});
 await db.exec('RESET ROLE');await db.query('DELETE FROM public.student_collaborators WHERE user_id=$1',[editor]);await as(editor);assert.equal((await db.query('SELECT id FROM public.report_evidence_links')).rows.length,0);await assert.rejects(save(),{code:'42501'});
});
for(const role of ['anon','service_role'])test(role+' cannot execute the save routine',async()=>{
 assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,signature])).rows[0].ok,false);await as(owner,role);await assert.rejects(save(),{code:'42501'});
});
test('routine is invoker with fixed search path and authenticated-only execution',async()=>{
 const {rows:[p]}=await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[signature]);assert.equal(p.prosecdef,false);assert.deepEqual(p.proconfig,['search_path=pg_catalog']);assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[signature])).rows[0].ok,true);
});
test('zero and twelve items are valid, thirteen is rejected',async()=>{
 await as();assert.equal((await save([])).rows.length,0);assert.equal((await save(Array.from({length:12},(_,i)=>item({snippet_hash:i.toString(16).padStart(32,'0')})))).rows.length,12);await assert.rejects(save(Array.from({length:13},()=>item())),{code:'22023'});assert.equal((await rows()).length,12);
});
for(const malformed of [null,{},'text',[null],[item({note:42})],[item({note:''})],[item({note:'x'.repeat(2001)})],[item({snippet_hash:'invalid'})],[item({report_section:null})]])test('malformed batch rejects atomically '+JSON.stringify(malformed).slice(0,65),async()=>{
 await as();await assert.rejects(save(malformed),{code:'22023'});assert.equal((await rows()).length,0);
});
for(const bad of [item({report_section:'unknown'}),item({note:null})])test('invalid later item leaves the whole batch unchanged '+bad.report_section,async()=>{
 await as();await assert.rejects(save([item(),bad]));assert.equal((await rows()).length,0);
});
test('table source-kind constraint remains authoritative and atomic',async()=>{
 await as();await assert.rejects(save([item()],{kind:'invalid'}),{code:'23514'});assert.equal((await rows()).length,0);
});
for(const label of ['', ' ', 'x'.repeat(201)])test('invalid source label refuses writes '+label.length,async()=>{
 await as();await assert.rejects(save([item()],{label}),{code:'22023'});assert.equal((await rows()).length,0);
});
test('original table RLS and unique expression index remain installed',async()=>{
 const {rows:[r]}=await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.report_evidence_links'::regclass");assert.equal(r.relrowsecurity,true);assert.equal((await db.query("SELECT * FROM pg_policies WHERE tablename='report_evidence_links'")).rows.length,4);
 await as(unrelated);await assert.rejects(db.query("INSERT INTO public.report_evidence_links(student_id,report_section,source_kind,source_label) VALUES($1,'documents','note','Fictional')",[student]),{code:'42501'});
});
test('concurrent duplicate saves serialize to one actual inserted row',{skip:!real},async()=>{
 const first=await newSession(),second=await newSession();await as(owner,'authenticated',first);await as(owner,'authenticated',second);await first.exec('BEGIN');let pending;
 try{assert.equal((await save([item()],{},first)).rows.length,1);const pid=(await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 pending=save([item()],{},second).then(value=>({value}),error=>({error}));let locked=false;
 for(let i=0;i<200;i++){const {rows:[s]}=await db.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid]);if(s?.wait_event_type==='Lock'){locked=true;break;}await new Promise(resolve=>setTimeout(resolve,20));}
 assert.equal(locked,true,'Competing insert waits on unique index');await first.exec('COMMIT');const result=await pending;assert.equal(result.error,undefined);assert.equal(result.value.rows.length,0);assert.equal((await rows()).length,1);
 }finally{await first.exec('ROLLBACK');if(pending)await pending;}
});
