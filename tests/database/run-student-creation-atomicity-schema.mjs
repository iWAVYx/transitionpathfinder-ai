// Dedicated disposable CI service only; retains prior installers and verifies
// the fourteenth review draft without executing hosted operations or providers.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{createHash,randomUUID}from'node:crypto';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.PLANNING_WRITE_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||process.env.PGDATABASE!=='postgres'||process.env.PGUSER!=='postgres'||process.env.PGPASSWORD!=='postgres'||!process.env.PLANNING_WRITE_PG_MODULE?.startsWith('/'))throw Error('Dedicated fake-credential disposable schema service required');
const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex'),md5=b=>createHash('md5').update(b).digest('hex');
const priorPath='/tmp/planning-record-write-schema/full-chain.json',prior=JSON.parse(readFileSync(priorPath));assert.equal(prior.native_full_chain_installed,true);assert.equal(prior.canonical_count,225);assert.equal(prior.prior_review_drafts,41);assert.equal(prior.separate_review_drafts,13);assert.equal(prior.hosted_applied,false);
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
try{
 await db.connect();const before=await snapshot(),constraints=(await db.query(constraintSql)).rows;
 const draft='docs/database-proposals/student-creation-atomicity/create-student.review.sql';await db.query(readFileSync(draft,'utf8'));const after=await snapshot();
 for(const key of ['columns','indexes','policies','tables','data','triggers'])assert.deepEqual(after[key],before[key]);assert.deepEqual((await db.query(constraintSql)).rows,constraints);
 assert.deepEqual(after.procedures.filter(p=>p.proname!=='create_student_with_setup'),before.procedures);assert.equal(after.procedures.length,before.procedures.length+1);
 const routine=after.procedures.find(p=>p.proname==='create_student_with_setup');assert.equal(routine.prosecdef,false);assert.deepEqual(routine.proconfig,['search_path=pg_catalog']);
 const grants=(await db.query("SELECT has_function_privilege('anon',$1::oid,'EXECUTE')AS anon,has_function_privilege('authenticated',$1::oid,'EXECUTE')AS authenticated,has_function_privilege('service_role',$1::oid,'EXECUTE')AS service",[routine.oid])).rows[0];assert.deepEqual(grants,{anon:false,authenticated:true,service:false});
 const inventory=(await db.query(`WITH RECURSIVE descendants AS (
 SELECT 'public.students'::regclass::oid AS relation,ARRAY['public.students'::regclass::oid] AS path
 UNION ALL SELECT c.conrelid,d.path||c.conrelid FROM descendants d JOIN pg_constraint c ON c.confrelid=d.relation AND c.contype='f' WHERE NOT c.conrelid=ANY(d.path))
 SELECT DISTINCT c.oid::text,c.conname,c.conrelid::regclass::text AS child,c.confrelid::regclass::text AS parent,c.confdeltype AS delete_action,pg_get_constraintdef(c.oid) AS definition
 FROM pg_constraint c WHERE c.contype='f' AND c.confrelid IN(SELECT relation FROM descendants)ORDER BY parent,child,conname`)).rows;
 assert.ok(inventory.length>0);writeFileSync(directory+'/student-deletion-dependencies.json',JSON.stringify({schema:'student-delete-fk-inventory-v1',source_commit:process.env.GITHUB_SHA,edges:inventory,scope:'Foreign keys reachable from public.students in the complete schema. Includes referenced tables regardless of cascade behavior; not a prediction that all are deleted. External storage, provider objects, soft references and triggers require separate review.',hosted_read:false},null,2)+'\n');
 const smoke=[];
 for(const role of ['parent','educator','student']){
  await db.query('BEGIN');try{
   const actor=randomUUID(),record=randomUUID();
   await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data)VALUES($1,$2,'{\"full_name\":\"Fictional Setup Verifier\"}')",[actor,actor+'@disposable.invalid']);
   await db.query('UPDATE public.profiles SET primary_role=$1,email=$2 WHERE id=$3',[role,actor+'@disposable.invalid',actor]);
   await db.query('INSERT INTO public.user_roles(user_id,role)VALUES($1,$2)ON CONFLICT DO NOTHING',[actor,role]);
   await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);await db.query('SET LOCAL ROLE authenticated');
   const saved=(await db.query('SELECT public.create_student_with_setup($1,$2,$3) AS result',[actor,record,{first_name:'Fictional Setup Student'}])).rows[0].result;
   assert.equal(saved.actor_id,actor);assert.equal(saved.account_role,role);assert.equal(saved.row.owner_id,actor);
   if(role==='student'){assert.equal(saved.row.student_user_id,actor);const repeated=(await db.query('SELECT public.create_student_with_setup($1,$2,$3) AS result',[actor,record,{first_name:'Fictional Setup Student'}])).rows[0].result;assert.equal(repeated.row.id,saved.row.id);}
   else {assert.equal(saved.row.id,record);assert.equal(saved.relationship.student_id,record);assert.equal(saved.relationship_kind,role==='parent'?'guardian':'team');}
   const deleted=(await db.query('DELETE FROM public.students WHERE id=$1 AND owner_id=$2 AND updated_at=$3 RETURNING id',[saved.row.id,actor,saved.row.updated_at])).rows;assert.equal(deleted.length,1);
   await db.query('RESET ROLE');const remaining=(await db.query('SELECT (SELECT count(*)::int FROM public.student_guardians WHERE student_id=$1) AS guardians,(SELECT count(*)::int FROM public.student_team_members WHERE student_id=$1) AS team',[saved.row.id])).rows[0];assert.deepEqual(remaining,{guardians:0,team:0});
   smoke.push({role,actual_authenticated_create_and_owned_delete:true,creator_relationship_cascade_verified:true,rolled_back:true});
  }finally{await db.query('ROLLBACK');}
 }
 const final=await snapshot();assert.deepEqual(final,after);
 writeFileSync(directory+'/full-chain.json',JSON.stringify({schema:'student-setup-full-schema-v1',source_commit:process.env.GITHUB_SHA,canonical_count:225,prior_review_drafts:41,separate_review_drafts:14,native_full_chain_installed:true,prior_schema_stages:56,new_routines:1,security_invoker:true,existing_catalog_preserved:true,smoke,student_fk_edges:inventory.length,prior_proof_sha256:sha(readFileSync(priorPath)),draft_sha256:sha(readFileSync(draft)),hosted_applied:false,whole_p1_complete:false},null,2)+'\n');
 console.log('Complete 225+41+14 draft installation, actual role setup/deletion smoke and FK dependency inventory passed.');
}finally{await db.end();}
