// Disposable PostgreSQL-compatible fixture only. No hosted URL or credentials accepted.
import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const proposal = readFileSync('docs/production-readiness/proposals/report-linked-student-save.sql','utf8');
const oldSig='public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)';
const newSig='public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)';
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const id='00000000-0000-4000-8000-000000000010', intake='00000000-0000-4000-8000-000000000020';
const student='00000000-0000-4000-8000-000000000030', moved='00000000-0000-4000-8000-000000000031';
const original={summary:'Fictional original'}, next={summary:'Fictional replacement'};
let db;
const sql=f=>readFileSync('supabase/migrations/'+f,'utf8');
async function as(user=owner, role='authenticated') {
 assert.ok(['authenticated','anon','service_role'].includes(role));
 await db.exec('RESET ROLE'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('SET ROLE '+role);
}
async function save(expectedStudent=student,expected=original,replacement=next,report=id) {
 return db.query('SELECT public.save_pathway_report_content_for_student($1,$2,$3::jsonb,$4::jsonb,$5) AS version',[report,expectedStudent,JSON.stringify(expected),JSON.stringify(replacement),'Fictional save']);
}
async function state(){await db.exec('RESET ROLE');return {report:(await db.query('SELECT student_id,content FROM public.pathway_reports WHERE id=$1',[id])).rows[0],versions:(await db.query('SELECT version_number,content,created_by FROM public.pathway_report_versions ORDER BY version_number')).rows};}
before(async()=>{
 const {PGlite}=await import(process.env.PATHWAY_HISTORY_PGLITE_MODULE?pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href:'@electric-sql/pglite');db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
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
after(async()=>db?.close());
beforeEach(async()=>{
 await db.exec(`RESET ROLE; TRUNCATE public.pathway_report_versions,public.pathway_reports,public.student_intakes,auth.users CASCADE;
 INSERT INTO auth.users VALUES('${owner}'),('${other}');
 INSERT INTO public.student_intakes(id,user_id,student_first_name) VALUES('${intake}','${owner}','Fictional Student');
 DROP FUNCTION IF EXISTS public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text);
 GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO authenticated;`);
 await db.query("INSERT INTO public.pathway_reports(id,user_id,intake_id,model,student_id,content) VALUES($1,$2,$3,'fictional',$4,$5::jsonb)",[id,owner,intake,student,JSON.stringify(original)]);
});
test('current content-only RPC reproduces a save after the observed student changed',async()=>{
 await db.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,id]);await as();
 await db.query('SELECT public.save_pathway_report_content_atomic($1,$2::jsonb,$3::jsonb,$4)',[id,JSON.stringify(original),JSON.stringify(next),'Baseline']);
 assert.deepEqual((await state()).report,{student_id:moved,content:next});
});
test('matching linked student saves and restores with truthful history',async()=>{
 await db.exec(proposal);await as();assert.equal((await save()).rows[0].version,1);
 assert.equal((await save(student,next,original)).rows[0].version,2);
 const s=await state();assert.deepEqual(s.versions.map(v=>v.content),[original,next]);assert.ok(s.versions.every(v=>v.created_by===owner));assert.deepEqual(s.report.content,original);
});
for(const [label,current,observed] of [['relinked',moved,student],['unlinked',null,student],['newly linked',student,null]])test(label+' context rejects without report/history writes',async()=>{
 await db.exec(proposal);await db.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[current,id]);await as();
 await assert.rejects(save(observed),{code:'40001'});const s=await state();assert.equal(s.report.student_id,current);assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);
});
test('intentionally unlinked report accepts an explicitly null student',async()=>{
 await db.exec(proposal);await db.query('UPDATE public.pathway_reports SET student_id=NULL WHERE id=$1',[id]);await as();assert.equal((await save(null)).rows[0].version,1);
});
test('stale content remains rejected with matching student',async()=>{
 await db.exec(proposal);await as();await save();await assert.rejects(save(),{code:'40001'});assert.equal((await state()).versions.length,1);
});
test('old context-free signature is denied after switching grants',async()=>{
 await db.exec(proposal);await as();await assert.rejects(db.query('SELECT public.save_pathway_report_content_atomic($1,$2::jsonb,$3::jsonb,$4)',[id,JSON.stringify(original),JSON.stringify(next),'No fallback']),{code:'42501'});assert.equal((await state()).versions.length,0);
});
for(const role of ['anon','service_role'])test(role+' has no new or old RPC execution',async()=>{
 await db.exec(proposal);for(const sig of [oldSig,newSig])assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",[role,sig])).rows[0].ok,false);
 await as(owner,role);await assert.rejects(save(),{code:'42501'});
});
test('unrelated caller is denied even with report read visibility',async()=>{
 await db.exec(proposal);await db.exec('CREATE POLICY fixture_visibility ON public.pathway_reports FOR SELECT TO authenticated USING(true)');
 try{await as(other);assert.equal((await db.query('SELECT id FROM public.pathway_reports')).rows.length,1);await assert.rejects(save(),{code:'42501'});assert.equal((await state()).versions.length,0);}finally{await db.exec('RESET ROLE; DROP POLICY fixture_visibility ON public.pathway_reports');}
});
test('missing identity and nonexistent report both deny without history',async()=>{
 await db.exec(proposal);await as('');await assert.rejects(save(),{code:'42501'});await as();await assert.rejects(save(student,original,next,moved),{code:'42501'});assert.equal((await state()).versions.length,0);
});
test('student argument cannot be omitted; no default bypass',async()=>{
 await db.exec(proposal);await as();await assert.rejects(db.query('SELECT public.save_pathway_report_content_for_student(_report_id=>$1,_expected_content=>$2::jsonb,_next_content=>$3::jsonb,_change_summary=>$4)',[id,JSON.stringify(original),JSON.stringify(next),'Missing context']),{code:'42883'});
});
test('new RPC remains security invoker with fixed search path',async()=>{
 await db.exec(proposal);const {rows:[r]}=await db.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=$1::regprocedure',[newSig]);assert.equal(r.prosecdef,false);assert.deepEqual(r.proconfig,['search_path=pg_catalog']);
});
test('unexpected old grants abort transaction without creating replacement or revoking old owner save',async()=>{
 await db.exec('GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO anon');
 try{await assert.rejects(db.exec(proposal),/Unexpected content-save prerequisite/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS ok",[oldSig])).rows[0].ok,true);}finally{await db.exec('REVOKE EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) FROM anon');}
});
test('malformed content leaves both report and history unchanged',async()=>{
 await db.exec(proposal);await as();for(const [expected,replacement] of [[null,next],[original,null],[[],next],[original,[]]])await assert.rejects(save(student,expected,replacement),{code:'22023'});
 const s=await state();assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);
});
test('snapshot failure rolls back content and history together',async()=>{
 await db.exec(proposal);await db.exec(`CREATE FUNCTION public.fixture_reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Fictional snapshot failure'; END $$;
 CREATE TRIGGER fixture_reject_history BEFORE INSERT ON public.pathway_report_versions FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_history()`);
 try{await as();await assert.rejects(save(),/Fictional snapshot failure/);const s=await state();assert.deepEqual(s.report.content,original);assert.equal(s.versions.length,0);}finally{await db.exec('RESET ROLE; DROP TRIGGER fixture_reject_history ON public.pathway_report_versions; DROP FUNCTION public.fixture_reject_history()');}
});
test('disabled RLS aborts the proposal without installing new RPC',async()=>{
 await db.exec('ALTER TABLE public.pathway_reports DISABLE ROW LEVEL SECURITY');
 try{await assert.rejects(db.exec(proposal),/Unexpected report history boundary/);await db.exec('ROLLBACK');assert.equal((await db.query('SELECT to_regprocedure($1) AS fn',[newSig])).rows[0].fn,null);}finally{await db.exec('ALTER TABLE public.pathway_reports ENABLE ROW LEVEL SECURITY');}
});
test('JSON object key order does not create a false stale-content conflict',async()=>{
 const a={summary:'Fictional original',goals:['One','Two']};await db.query('UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2',[JSON.stringify(a),id]);
 await db.exec('TRUNCATE public.pathway_report_versions');await db.exec(proposal);await as();assert.equal((await save(student,{goals:a.goals,summary:a.summary})).rows[0].version,1);
});
