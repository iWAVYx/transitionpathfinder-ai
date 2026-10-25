// Disposable local databases only. Native mode rejects non-loopback PGHOST
// and creates its own random database; it never accepts a hosted database URL.
import {before,after,beforeEach,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const owner='00000000-0000-4000-8000-000000000001', other='00000000-0000-4000-8000-000000000002';
const student='00000000-0000-4000-8000-000000000010', moved='00000000-0000-4000-8000-000000000011';
const report='00000000-0000-4000-8000-000000000020', intake='00000000-0000-4000-8000-000000000030';
const proposal=readFileSync('docs/production-readiness/proposals/report-share-lifecycle.sql','utf8');
const real=process.env.SHARE_LIFECYCLE_POSTGRES === "1";
let db,close,newSession;
const originalShare=readFileSync("supabase/migrations/20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql","utf8");
before(async()=>{
 if(real){
  if(![undefined,'localhost','127.0.0.1'].includes(process.env.PGHOST))throw new Error('Disposable sharing tests require loopback PGHOST');
  const pg=await import(pathToFileURL(process.env.SHARE_POLICY_PG_MODULE).href);const {Client}=pg.default??pg;
  const options={host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};
  const admin=new Client({...options,database:'postgres'});await admin.connect();
  const name='tf_share_lifecycle_'+crypto.randomUUID().replaceAll('-','');
  try{await admin.query(`CREATE DATABASE ${name}`);}catch(error){await admin.end();throw error;}
  const sessions=[];newSession=async()=>{const c=new Client({...options,database:name});await c.connect();sessions.push(c);return {query:(...args)=>c.query(...args),exec:async sql=>{const r=await c.query(sql);return Array.isArray(r)?r:[r];}};};
  close=async()=>{try{await Promise.all(sessions.map(c=>c.end()));}finally{try{await admin.query(`DROP DATABASE ${name}`);}finally{await admin.end();}}};
  db=await newSession();
 }else{
  const {PGlite}=await import(process.env.SHARE_POLICY_PGLITE_MODULE?pathToFileURL(process.env.SHARE_POLICY_PGLITE_MODULE).href:'@electric-sql/pglite');db=new PGlite();close=()=>db.close();
 }
 await db.exec(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF; END $$;
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
after(async()=>{await close?.();});
beforeEach(async(ctx)=>{
 await db.exec(`RESET ROLE; DROP TRIGGER IF EXISTS close_report_links_on_collaborator_change ON public.student_collaborators; DROP TRIGGER IF EXISTS close_report_links_on_relationship_change ON public.student_relationships; DROP TRIGGER IF EXISTS close_report_links_on_student_identity_change ON public.students; DROP FUNCTION IF EXISTS public.close_report_links_on_student_access_change(),public.close_report_links_after_access_loss(uuid,uuid) CASCADE; DROP TRIGGER IF EXISTS bind_report_share_context ON public.share_tokens; DROP TRIGGER IF EXISTS revoke_shares_on_report_context_change ON public.pathway_reports; DROP FUNCTION IF EXISTS public.bind_report_share_context(),public.revoke_shares_on_report_context_change(),public.report_share_is_eligible(uuid) CASCADE; ALTER TABLE public.share_tokens DROP COLUMN IF EXISTS context_bound,DROP COLUMN IF EXISTS bound_student_id,DROP COLUMN IF EXISTS bound_report_owner_id,DROP COLUMN IF EXISTS bound_intake_id;`);
 await db.exec(originalShare.slice(originalShare.indexOf("CREATE OR REPLACE FUNCTION public.resolve_share_token"),originalShare.indexOf("-- 11. AUDIT_LOG")));
 await db.exec(readFileSync("supabase/migrations/20261006180000_server_only_report_share_rpcs.sql","utf8"));
 await db.exec(`RESET ROLE; TRUNCATE public.share_tokens,public.pathway_reports,public.students,public.student_collaborators,public.student_relationships CASCADE;
 INSERT INTO public.students VALUES('${student}','${other}',null),('${moved}','${other}',null);
 INSERT INTO public.student_collaborators VALUES('${student}','${owner}','accepted','viewer');
 INSERT INTO public.pathway_reports VALUES('${report}','${owner}','${student}','${intake}','{"summary":"Fictional report"}',now());`);
 if(!ctx.name.startsWith('baseline ') && !ctx.name.startsWith('proposal revokes') && !ctx.name.startsWith('proposal failure')) await db.exec(proposal);
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
test('proposal revokes legacy links instead of guessing historical context',async()=>{
 const token=await create();await db.exec(proposal);assert.deepEqual(await resolve(token),[]);assert.equal((await tokenRow(token)).revoked,true);assert.equal((await tokenRow(token)).context_bound,false);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM public.share_tokens WHERE NOT revoked')).rows[0].n,0);
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
 await db.query('UPDATE public.students SET student_user_id=$1 WHERE id=$2',[owner,student]);assert.deepEqual(await resolve(token),[]);assert.equal((await tokenRow(token)).revoked,true);assert.equal((await resolve(await create())).length,1);
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
test('removal permanently closes prior links; re-added creator must issue a new link',async()=>{
 const token=await create();await loseAccess();assert.deepEqual(await resolve(token),[]);
 await db.exec("UPDATE public.student_collaborators SET status='accepted'");assert.deepEqual(await resolve(token),[]);assert.equal((await tokenRow(token)).revoked,true);assert.equal((await resolve(await create())).length,1);
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

async function blocked(pid){
 const end=Date.now()+4000;
 while(Date.now()<end){const {rows:[r]}=await db.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid]);if(r?.wait_event_type==='Lock')return;await new Promise(r=>setTimeout(r,20));}
 assert.fail('Expected competing session to visibly wait on a PostgreSQL row lock');
}
function insert(client,token){return client.query('INSERT INTO public.share_tokens(token,report_id,created_by) VALUES($1,$2,$3)',[token,report,owner]);}
test('native creation lock serializes reassignment and revokes the just-created link',{skip:!real},async()=>{
 const mint=await newSession(),relink=await newSession();const token='race-'+crypto.randomUUID();const pid=(await relink.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await mint.exec('BEGIN');try{
  await insert(mint,token);pending=relink.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,report]).then(value=>({value}),error=>({error}));
  await blocked(pid);await mint.exec('COMMIT');assert.equal((await pending).error,undefined);assert.equal((await tokenRow(token)).revoked,true);assert.deepEqual(await resolve(token),[]);
 }finally{await mint.exec('ROLLBACK');if(pending)await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('native waiting creation rechecks reassignment after '+finish,{skip:!real},async()=>{
 const relink=await newSession(),mint=await newSession();const token='race-'+crypto.randomUUID();const pid=(await mint.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await relink.exec('BEGIN');try{
  await relink.query('UPDATE public.pathway_reports SET student_id=$1 WHERE id=$2',[moved,report]);pending=insert(mint,token).then(value=>({value}),error=>({error}));
  await blocked(pid);await relink.exec(finish);const result=await pending;
  if(finish==='COMMIT'){assert.equal(result.error?.code,'42501');assert.equal(await tokenRow(token),undefined);}else{assert.equal(result.error,undefined);assert.equal((await tokenRow(token)).bound_student_id,student);assert.equal((await resolve(token)).length,1);}
 }finally{await relink.exec('ROLLBACK');if(pending)await pending;}
});
test('native view tracking waiting behind revocation must not increment a revoked link',{skip:!real},async()=>{
 const token=await create(),revoker=await newSession(),tracker=await newSession();const pid=(await tracker.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await revoker.exec('BEGIN');try{
  await revoker.query('UPDATE public.share_tokens SET revoked=true WHERE token=$1',[token]);pending=tracker.query('SELECT public.track_share_view($1)',[token]).then(value=>({value}),error=>({error}));
  await blocked(pid);await revoker.exec('COMMIT');assert.equal((await pending).error,undefined);assert.equal((await tokenRow(token)).view_count,0);assert.deepEqual(await resolve(token),[]);
 }finally{await revoker.exec('ROLLBACK');if(pending)await pending;}
});

test('proposal failure rolls back legacy retirement and all new bindings atomically',async()=>{
 const token=await create();await db.exec('CREATE FUNCTION public.report_share_is_eligible(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$');
 await assert.rejects(db.exec(proposal),{code:'42723'});await db.exec('ROLLBACK');
 assert.equal((await tokenRow(token)).revoked,false);assert.equal((await resolve(token)).length,1);
 assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_schema='public' AND table_name='share_tokens' AND column_name='context_bound'")).rows[0].n,0);
});

test('native tracking waiting behind an expiry change must not increment an expired link',{skip:!real},async()=>{
 const token=await create(),expirer=await newSession(),tracker=await newSession();const pid=(await tracker.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await expirer.exec('BEGIN');try{
  await expirer.query("UPDATE public.share_tokens SET expires_at=now()-interval '1 second' WHERE token=$1",[token]);pending=tracker.query('SELECT public.track_share_view($1)',[token]).then(value=>({value}),error=>({error}));
  await blocked(pid);await expirer.exec('COMMIT');assert.equal((await pending).error,undefined);assert.equal((await tokenRow(token)).view_count,0);assert.deepEqual(await resolve(token),[]);
 }finally{await expirer.exec('ROLLBACK');if(pending)await pending;}
});

test('removing one of two explicit access paths retains links until the last path is removed',async()=>{
 await db.query('INSERT INTO public.student_relationships VALUES($1,$2,$3,$4)',[student,owner,'approved','view']);const token=await create();await loseAccess();assert.equal((await resolve(token)).length,1);
 await db.exec("UPDATE public.student_relationships SET consent_status='revoked'");assert.equal((await tokenRow(token)).revoked,true);
 await db.exec("UPDATE public.student_relationships SET consent_status='approved'");assert.deepEqual(await resolve(token),[]);
});
test('deleted and recreated collaboration does not reopen its old link',async()=>{
 const token=await create();await db.exec('DELETE FROM public.student_collaborators');assert.equal((await tokenRow(token)).revoked,true);
 await db.query('INSERT INTO public.student_collaborators VALUES($1,$2,$3,$4)',[student,owner,'accepted','viewer']);assert.deepEqual(await resolve(token),[]);
});
test('moving a collaboration away permanently closes links to the original student',async()=>{
 const token=await create();await db.query('UPDATE public.student_collaborators SET student_id=$1',[moved]);assert.equal((await tokenRow(token)).revoked,true);
 await db.query('UPDATE public.student_collaborators SET student_id=$1',[student]);assert.deepEqual(await resolve(token),[]);
});
test('ownership loss closes only the previous owner links while genuine other access stays valid',async()=>{
 const token=await create({created_by:other}),retained=await create();await db.query('UPDATE public.students SET owner_id=$1 WHERE id=$2',[moved,student]);assert.equal((await tokenRow(token)).revoked,true);assert.equal((await resolve(retained)).length,1);
 await db.query('UPDATE public.students SET owner_id=$1 WHERE id=$2',[other,student]);assert.deepEqual(await resolve(token),[]);
});
test('student self-identity removal permanently closes prior self-created links',async()=>{
 await db.query('UPDATE public.students SET student_user_id=$1 WHERE id=$2',[owner,student]);await loseAccess();const token=await create();
 await db.query('UPDATE public.students SET student_user_id=null WHERE id=$1',[student]);assert.equal((await tokenRow(token)).revoked,true);
 await db.query('UPDATE public.students SET student_user_id=$1 WHERE id=$2',[owner,student]);assert.deepEqual(await resolve(token),[]);
});
test('access removal rolled back restores both consent and the unrevoked link atomically',async()=>{
 const token=await create();await db.exec('BEGIN');try{await loseAccess();assert.equal((await tokenRow(token)).revoked,true);}finally{await db.exec('ROLLBACK');}assert.equal((await tokenRow(token)).revoked,false);assert.equal((await resolve(token)).length,1);
});
test('loss and re-addition within a committed transaction still require fresh links',async()=>{
 const token=await create();await db.exec('BEGIN');try{await loseAccess();await db.exec("UPDATE public.student_collaborators SET status='accepted'");await db.exec('COMMIT');}finally{await db.exec('ROLLBACK');}assert.equal((await tokenRow(token)).revoked,true);assert.deepEqual(await resolve(token),[]);
});
test('native access removal waits for an in-flight mint then closes its link',{skip:!real},async()=>{
 const mint=await newSession(),remover=await newSession(),token='race-'+crypto.randomUUID();const pid=(await remover.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await mint.exec('BEGIN');try{await insert(mint,token);pending=remover.query("UPDATE public.student_collaborators SET status='removed'").then(value=>({value}),error=>({error}));await blocked(pid);await mint.exec('COMMIT');assert.equal((await pending).error,undefined);assert.equal((await tokenRow(token)).revoked,true);
 await db.exec("UPDATE public.student_collaborators SET status='accepted'");assert.deepEqual(await resolve(token),[]);
 }finally{await mint.exec('ROLLBACK');if(pending)await pending;}
});
for(const finish of ['COMMIT','ROLLBACK'])test('native mint waiting behind access removal rechecks after '+finish,{skip:!real},async()=>{
 const remover=await newSession(),mint=await newSession(),token='race-'+crypto.randomUUID();const pid=(await mint.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await remover.exec('BEGIN');try{await remover.query("UPDATE public.student_collaborators SET status='removed'");pending=insert(mint,token).then(value=>({value}),error=>({error}));await blocked(pid);await remover.exec(finish);const result=await pending;
 if(finish==='COMMIT'){assert.equal(result.error?.code,'42501');assert.equal(await tokenRow(token),undefined);}else{assert.equal(result.error,undefined);assert.equal((await resolve(token)).length,1);}
 }finally{await remover.exec('ROLLBACK');if(pending)await pending;}
});
test('native concurrent removal of independent access paths closes old links permanently',{skip:!real},async()=>{
 await db.query('INSERT INTO public.student_relationships VALUES($1,$2,$3,$4)',[student,owner,'approved','view']);const token=await create(),a=await newSession(),b=await newSession();const pid=(await b.query('SELECT pg_backend_pid() pid')).rows[0].pid;let pending;
 await a.exec('BEGIN');try{await a.query("UPDATE public.student_collaborators SET status='removed'");pending=b.query("UPDATE public.student_relationships SET consent_status='revoked'").then(value=>({value}),error=>({error}));await blocked(pid);await a.exec('COMMIT');assert.equal((await pending).error,undefined);assert.equal((await tokenRow(token)).revoked,true);
 await db.exec("UPDATE public.student_collaborators SET status='accepted'");assert.deepEqual(await resolve(token),[]);
 }finally{await a.exec('ROLLBACK');if(pending)await pending;}
});
