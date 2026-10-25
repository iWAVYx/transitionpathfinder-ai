// Credential-free local PGlite only. Never connects to hosted staging/production.
import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const student='00000000-0000-4000-8000-000000000010', moved='00000000-0000-4000-8000-000000000011';
const report='00000000-0000-4000-8000-000000000020', intake='00000000-0000-4000-8000-000000000030';
const proposal=readFileSync('docs/production-readiness/proposals/report-share-lifecycle.sql','utf8');
let db;
const originalShare=readFileSync("supabase/migrations/20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql","utf8");
before(async()=>{
 const {PGlite}=await import(process.env.SHARE_POLICY_PGLITE_MODULE?pathToFileURL(process.env.SHARE_POLICY_PGLITE_MODULE).href:'@electric-sql/pglite');db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE TABLE public.students(id uuid PRIMARY KEY,owner_id uuid,student_user_id uuid);
 CREATE TABLE public.student_collaborators(student_id uuid,user_id uuid,status text,role text);
 CREATE TABLE public.student_relationships(student_id uuid,related_user_id uuid,consent_status text,permission_level text);
 CREATE TABLE public.pathway_reports(id uuid PRIMARY KEY,user_id uuid,student_id uuid,intake_id uuid,content jsonb,created_at timestamptz DEFAULT now());`);
 const access=readFileSync('supabase/migrations/20261024010000_remove_implicit_admin_student_access.sql','utf8');
 await db.exec(access.slice(access.indexOf('CREATE OR REPLACE FUNCTION public.can_access_student'),access.indexOf('CREATE OR REPLACE FUNCTION public.can_edit_student')));
 const original=readFileSync('supabase/migrations/20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql','utf8');
 await db.exec(original.slice(original.indexOf('CREATE TABLE public.share_tokens'),original.indexOf('-- 11. AUDIT_LOG')));
 await db.exec(readFileSync('supabase/migrations/20261006180000_server_only_report_share_rpcs.sql','utf8'));
 // Retain the deployed revoked-only column grant boundary.
 await db.exec(readFileSync('supabase/migrations/20261023010000_restrict_report_share_token_writes.sql','utf8'));
});
after(async()=>{await db?.close();});
beforeEach(async(ctx)=>{
 await db.exec(`RESET ROLE; DROP TRIGGER IF EXISTS bind_report_share_context ON public.share_tokens; DROP TRIGGER IF EXISTS revoke_shares_on_report_context_change ON public.pathway_reports; DROP FUNCTION IF EXISTS public.bind_report_share_context(),public.revoke_shares_on_report_context_change(),public.report_share_is_eligible(uuid) CASCADE; ALTER TABLE public.share_tokens DROP COLUMN IF EXISTS context_bound,DROP COLUMN IF EXISTS bound_student_id,DROP COLUMN IF EXISTS bound_report_owner_id,DROP COLUMN IF EXISTS bound_intake_id;`);
 await db.exec(originalShare.slice(originalShare.indexOf("CREATE OR REPLACE FUNCTION public.resolve_share_token"),originalShare.indexOf("-- 11. AUDIT_LOG")));
 await db.exec(readFileSync("supabase/migrations/20261006180000_server_only_report_share_rpcs.sql","utf8"));
 await db.exec(`RESET ROLE; TRUNCATE public.share_tokens,public.pathway_reports,public.students,public.student_collaborators,public.student_relationships CASCADE;
 INSERT INTO public.students VALUES('${student}','${other}',null),('${moved}','${other}',null);
 INSERT INTO public.student_collaborators VALUES('${student}','${owner}','accepted','viewer');
 INSERT INTO public.pathway_reports VALUES('${report}','${owner}','${student}','${intake}','{"summary":"Fictional report"}',now());`);
 if(!ctx.name.startsWith('baseline ') && !ctx.name.startsWith('proposal leaves')) await db.exec(proposal);
});
async function create(extra={}) {
 const id=crypto.randomUUID();const record={id,token:'fictional-'+id,report_id:report,created_by:owner,...extra};
 const cols=Object.keys(record),vals=Object.values(record);
 await db.query(`INSERT INTO public.share_tokens(${cols.join(',')}) VALUES(${vals.map((_,i)=>'$'+(i+1)).join(',')})`,vals);return record.token;
}
async function resolve(token){return (await db.query('SELECT * FROM public.resolve_share_token($1)',[token])).rows;}
async function tokenRow(token){return (await db.query('SELECT * FROM public.share_tokens WHERE token=$1',[token])).rows[0];}
async function loseAccess(){await db.exec("UPDATE public.student_collaborators SET status='removed'");}
test('baseline resolves after issuer access removal and follows reassigned report',async()=>{
 const token=await create();await loseAccess();assert.equal((await resolve(token)).length,1);
 await db.query('UPDATE public.pathway_reports SET student_id=$1,content=$2 WHERE id=$3',[moved,{summary:'Different student context'},report]);
 assert.deepEqual((await resolve(token))[0].content,{summary:'Different student context'});
});
test('proposal leaves legacy links unbound and unavailable instead of guessing historical context',async()=>{
 const token=await create();await db.exec(proposal);assert.deepEqual(await resolve(token),[]);
 await db.query('SELECT public.track_share_view($1)',[token]);assert.equal((await tokenRow(token)).view_count,0);
});
test('new links capture locked real context and get finite 30-day expiry',async()=>{
 const token=await create({context_bound:false,bound_student_id:moved,bound_report_owner_id:other,bound_intake_id:null});
 const row=await tokenRow(token);assert.equal(row.context_bound,true);assert.equal(row.bound_student_id,student);assert.equal(row.bound_report_owner_id,owner);assert.equal(row.bound_intake_id,intake);
 assert.ok(new Date(row.expires_at)-Date.now()>29*86400000);assert.ok(new Date(row.expires_at)-Date.now()<=30*86400000);
 assert.equal((await resolve(token)).length,1);
});
test('revoked consent stops resolution and tracking even when creator owns the linked report',async()=>{
 const token=await create();await loseAccess();assert.deepEqual(await resolve(token),[]);
 await db.query('SELECT public.track_share_view($1)',[token]);assert.equal((await tokenRow(token)).view_count,0);
 await assert.rejects(create(),{code:'42501'});
});
test('approved relationship and student self-access work without management-role shortcuts',async()=>{
 await loseAccess();await db.query('INSERT INTO public.student_relationships VALUES($1,$2,$3,$4)',[student,owner,'approved','view']);const token=await create();assert.equal((await resolve(token)).length,1);
 await db.exec("UPDATE public.student_relationships SET consent_status='revoked'");assert.deepEqual(await resolve(token),[]);
 await db.query('UPDATE public.students SET student_user_id=$1 WHERE id=$2',[owner,student]);assert.equal((await resolve(token)).length,1);
});
for(const col of ['student_id','user_id','intake_id'])test(col+' reassignment permanently revokes existing links even when changed back',async()=>{
 const token=await create();const old={student_id:student,user_id:owner,intake_id:intake}[col];
 await db.query(`UPDATE public.pathway_reports SET ${col}=$1 WHERE id=$2`,[moved,report]);assert.deepEqual(await resolve(token),[]);assert.equal((await tokenRow(token)).revoked,true);
 await db.query(`UPDATE public.pathway_reports SET ${col}=$1 WHERE id=$2`,[old,report]);assert.deepEqual(await resolve(token),[]);
});
test('ordinary content refresh remains available through a bound link',async()=>{
 const token=await create();await db.query('UPDATE public.pathway_reports SET content=$1 WHERE id=$2',[{summary:'Updated same student'},report]);assert.deepEqual((await resolve(token))[0].content,{summary:'Updated same student'});assert.equal((await tokenRow(token)).revoked,false);
});
test('unlinked owner can share while unrelated creator cannot',async()=>{
 await db.query('UPDATE public.pathway_reports SET student_id=null WHERE id=$1',[report]);const token=await create();assert.equal((await resolve(token)).length,1);
 await assert.rejects(create({created_by:other}),{code:'42501'});
});
test('expired and revoked links neither resolve nor increment views',async()=>{
 const token=await create();await db.query("UPDATE public.share_tokens SET expires_at=now()-interval '1 second' WHERE token=$1",[token]);assert.deepEqual(await resolve(token),[]);await db.query('SELECT public.track_share_view($1)',[token]);assert.equal((await tokenRow(token)).view_count,0);
 const active=await create();await db.query('UPDATE public.share_tokens SET revoked=true WHERE token=$1',[active]);assert.deepEqual(await resolve(active),[]);
});
test('valid link tracking counts once and keeps the fixed audience',async()=>{
 const token=await create({audience:'educator'});await db.exec('SET ROLE service_role');try{assert.equal((await resolve(token))[0].audience,'educator');await db.query('SELECT public.track_share_view($1)',[token]);}finally{await db.exec('RESET ROLE');}assert.equal((await tokenRow(token)).view_count,1);
});
for(const extra of [{audience:'owner'},{expires_at:'2000-01-01T00:00:00Z'},{expires_at:'2099-01-01T00:00:00Z'}])test('invalid audience/expiry is rejected at the database boundary '+JSON.stringify(extra),async()=>{await assert.rejects(create(extra),{code:'22023'});});
test('client cannot alter bindings, call private predicate or directly resolve content',async()=>{
 const token=await create();await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[owner]);await db.exec('SET ROLE authenticated');
 try {for(const sql of ['UPDATE public.share_tokens SET bound_student_id=$1 WHERE token=$2','UPDATE public.share_tokens SET context_bound=($1::uuid IS NULL) WHERE token=$2'])await assert.rejects(db.query(sql,[moved,token]),{code:'42501'});
 await assert.rejects(db.query('SELECT public.report_share_is_eligible($1)',[report]),{code:'42501'});await assert.rejects(resolve(token),{code:'42501'});
 await db.query('UPDATE public.share_tokens SET revoked=true WHERE token=$1',[token]);
 }finally{await db.exec('RESET ROLE');}assert.deepEqual(await resolve(token),[]);
});
test('removal blocks new requests; restored explicit consent can reactivate an unrevoked same-context link',async()=>{
 const token=await create();await loseAccess();assert.deepEqual(await resolve(token),[]);
 await db.exec("UPDATE public.student_collaborators SET status='accepted'");assert.equal((await resolve(token)).length,1);
});
test('unlink and relink never revive the earlier link',async()=>{
 const token=await create();await db.query('UPDATE public.pathway_reports SET student_id=null WHERE id=$1',[report]);assert.deepEqual(await resolve(token),[]);
 await db.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[student,report]);assert.deepEqual(await resolve(token),[]);
});
test('missing report cannot mint a link or leak data',async()=>{
 await assert.rejects(create({report_id:crypto.randomUUID()}),{code:'42501'});
});
test('anonymous caller cannot resolve or track directly',async()=>{
 const token=await create();await db.exec('SET ROLE anon');
 try{await assert.rejects(resolve(token),{code:'42501'});await assert.rejects(db.query('SELECT public.track_share_view($1)',[token]),{code:'42501'});}finally{await db.exec('RESET ROLE');}
});
