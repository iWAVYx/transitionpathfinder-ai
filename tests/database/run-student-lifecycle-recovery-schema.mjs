// Dedicated disposable CI service only; retains prior installers and verifies
// the sixteenth review draft without executing hosted operations or providers.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{createHash,randomUUID}from'node:crypto';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.PLANNING_WRITE_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||process.env.PGDATABASE!=='postgres'||process.env.PGUSER!=='postgres'||process.env.PGPASSWORD!=='postgres'||!process.env.PLANNING_WRITE_PG_MODULE?.startsWith('/'))throw Error('Dedicated fake-credential disposable schema service required');
const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex'),md5=b=>createHash('md5').update(b).digest('hex');
const priorPath='/tmp/meeting-completion-atomicity-schema/full-chain.json',prior=JSON.parse(readFileSync(priorPath));assert.equal(prior.native_full_chain_installed,true);assert.equal(prior.canonical_count,225);assert.equal(prior.prior_review_drafts,41);assert.equal(prior.separate_review_drafts,15);assert.equal(prior.hosted_applied,false);
const pg=await import(pathToFileURL(process.env.PLANNING_WRITE_PG_MODULE).href),Client=(pg.default??pg).Client,db=new Client({host:process.env.PGHOST,port:Number(process.env.PGPORT),user:process.env.PGUSER,password:process.env.PGPASSWORD,database:'postgres',statement_timeout:30000});
const procedureSql="SELECT oid::text,proname,proowner::text,proacl::text,proconfig,prosecdef,provolatile,prolang::text,md5(prosrc) AS body,pg_get_expr(proargdefaults,0) AS defaults FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY oid";
const policySql="SELECT oid::text,polrelid::text,polname,polroles,polpermissive,polcmd,polqual::text,polwithcheck::text FROM pg_policy ORDER BY oid";
const tableSql="SELECT oid::text,relname,relowner::text,relacl::text,relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('public.documents'::regclass,'public.document_extractions'::regclass,'public.document_summaries'::regclass,'public.document_permissions'::regclass,'storage.objects'::regclass,'public.students'::regclass,'public.rights_transfer_status'::regclass,'public.audit_log'::regclass,'public.consent_records'::regclass,'public.pathway_progress'::regclass,'public.goal_statuses'::regclass,'public.pathway_reports'::regclass,'public.student_voice_responses'::regclass,'public.action_items'::regclass,'public.feed_events'::regclass,'public.goals'::regclass) ORDER BY oid";
const dataSql="SELECT (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.documents t) AS documents,(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.document_extractions t) AS extractions,(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.document_summaries t) AS summaries,(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM public.document_permissions t) AS permissions,(SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text,'[]')) FROM storage.objects t) AS objects";
const triggerSql="SELECT oid::text,tgrelid::text,tgname,tgfoid::text,tgenabled,tgtype,tgattr::text,tgqual::text,tgisinternal,tgconstraint::text FROM pg_trigger ORDER BY oid";
const columnsSql="SELECT attrelid::text,attnum,attname,atttypid::text,attnotnull,attisdropped FROM pg_attribute WHERE attrelid IN(SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN('r','p'))AND attnum>0 ORDER BY attrelid,attnum";
const indexesSql="SELECT indexrelid::text,indrelid::text,pg_get_indexdef(indexrelid)AS definition FROM pg_index WHERE indrelid IN(SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)ORDER BY indexrelid";
async function snapshot(){return{columns:(await db.query(columnsSql)).rows,indexes:(await db.query(indexesSql)).rows,procedures:(await db.query(procedureSql)).rows,policies:(await db.query(policySql)).rows,tables:(await db.query(tableSql)).rows,data:(await db.query(dataSql)).rows,triggers:(await db.query(triggerSql)).rows};}

const constraintSql="SELECT conrelid::text,conname,contype,convalidated,pg_get_constraintdef(oid)AS definition FROM pg_constraint ORDER BY conrelid,conname";
const dataActionSql="SELECT md5(coalesce(jsonb_agg(to_jsonb(a)ORDER BY id)::text,'[]'))AS actions,(SELECT md5(coalesce(jsonb_agg(to_jsonb(g)ORDER BY id)::text,'[]'))FROM public.goals g)AS goals,(SELECT md5(coalesce(jsonb_agg(to_jsonb(f)ORDER BY id)::text,'[]'))FROM public.feed_events f)AS events,(SELECT md5(coalesce(jsonb_agg(to_jsonb(r)ORDER BY id)::text,'[]'))FROM public.pathway_reports r)AS reports FROM public.action_items a";
const privilegeSql="SELECT r.role,p.privilege,has_table_privilege(r.role,'public.action_items',p.privilege)AS allowed FROM unnest(ARRAY['anon','authenticated','service_role'])r(role)CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])p(privilege)ORDER BY 1,2";
try {
 await db.connect();const before=await snapshot();
 const draft='docs/database-proposals/student-lifecycle-recovery/student-lifecycle.review.sql';
 await db.query(readFileSync(draft,'utf8'));const after=await snapshot();
 for(const key of ['policies','tables','data'])assert.deepEqual(after[key],before[key]);
 assert.deepEqual(after.procedures.filter(p=>!['record_student_lifecycle','read_student_creation_outcome'].includes(p.proname)),before.procedures);
 const oldTableIds=new Set(before.columns.map(c=>c.attrelid));assert.deepEqual(after.columns.filter(c=>oldTableIds.has(c.attrelid)),before.columns);
 const constraints=(await db.query("SELECT conrelid::regclass::text AS child,confdeltype,convalidated FROM pg_constraint WHERE confrelid='public.students'::regclass AND conrelid IN('public.documents'::regclass,'public.meetings'::regclass) AND contype='f' ORDER BY child")).rows;
 assert.deepEqual(constraints,[{child:'documents',confdeltype:'r',convalidated:true},{child:'meetings',confdeltype:'r',convalidated:false}]);
 const softReferences=(await db.query(`SELECT c.relname AS table_name,a.attname AS column_name FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND a.attname='student_id' AND NOT a.attisdropped AND a.atttypid='uuid'::regtype AND NOT EXISTS(SELECT 1 FROM pg_constraint f WHERE f.contype='f' AND f.conrelid=c.oid AND f.confrelid='public.students'::regclass AND a.attnum=ANY(f.conkey)) ORDER BY c.relname`)).rows;
 writeFileSync(directory+'/remaining-soft-references.json',JSON.stringify({softReferences,scope:'Column inventory, not deletion permission. Ledger tombstones intentionally have no cascading FK; other entries need per-record review.',hosted_read:false},null,2)+'\n');
 const smoke=[];
 for(const role of ['parent','educator']){
  await db.query('BEGIN');try{
   const actor=randomUUID(),request=randomUUID();
   await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data)VALUES($1,$2,'{\"full_name\":\"Fictional Lifecycle Verifier\"}')",[actor,actor+'@disposable.invalid']);
   await db.query('UPDATE public.profiles SET primary_role=$1,email=$2 WHERE id=$3',[role,actor+'@disposable.invalid',actor]);
   await db.query('INSERT INTO public.user_roles(user_id,role)VALUES($1,$2)ON CONFLICT DO NOTHING',[actor,role]);
   await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);await db.query('SET LOCAL ROLE authenticated');
   await db.query('SELECT public.create_student_with_setup($1,$2,$3)',[actor,request,{first_name:'Fictional Lifecycle Student'}]);
   const read=async()=>(await db.query('SELECT public.read_student_creation_outcome($1,$2)AS r',[actor,request])).rows[0].r;
   assert.equal((await read()).status,'present');
   const deleted=await db.query('DELETE FROM public.students WHERE id=$1 AND owner_id=$2 RETURNING id',[request,actor]);assert.equal(deleted.rows.length,1);
   assert.equal((await read()).status,'removed');
   await db.query('SAVEPOINT recreate');await assert.rejects(()=>db.query('SELECT public.create_student_with_setup($1,$2,$3)',[actor,request,{first_name:'Fictional Lifecycle Student'}]),e=>e.code==='23505');await db.query('ROLLBACK TO SAVEPOINT recreate');
   assert.equal((await read()).status,'removed');smoke.push({role,creation_reconciled:true,deletion_tombstone:true,recreation_rejected:true,rolled_back:true});
  }finally{await db.query('ROLLBACK');}
 }
 assert.deepEqual(await snapshot(),after);
 writeFileSync(directory+'/full-chain.json',JSON.stringify({schema:'student-lifecycle-full-schema-v1',source_commit:process.env.GITHUB_SHA,canonical_count:225,prior_review_drafts:41,separate_review_drafts:16,native_full_chain_installed:true,smoke,constraints,prior_proof_sha256:sha(readFileSync(priorPath)),draft_sha256:sha(readFileSync(draft)),hosted_applied:false,ui_recovery_complete:false,external_cleanup_complete:false},null,2)+'\n');
 console.log('Complete schema: recovery, deletion tombstone, non-resurrection and restrictive cleanup boundaries passed.');
}finally{await db.end();}
