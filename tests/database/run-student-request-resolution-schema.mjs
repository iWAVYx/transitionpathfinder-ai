// Dedicated disposable CI service only; retains prior installers and verifies
// the seventeenth review draft without executing hosted operations or providers.
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{createHash,randomUUID}from'node:crypto';import{pathToFileURL}from'node:url';import assert from'node:assert/strict';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.PLANNING_WRITE_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||process.env.PGDATABASE!=='postgres'||process.env.PGUSER!=='postgres'||process.env.PGPASSWORD!=='postgres'||!process.env.PLANNING_WRITE_PG_MODULE?.startsWith('/'))throw Error('Dedicated fake-credential disposable schema service required');
const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex'),md5=b=>createHash('md5').update(b).digest('hex');
const priorPath='/tmp/student-lifecycle-recovery-schema/full-chain.json',prior=JSON.parse(readFileSync(priorPath));assert.equal(prior.native_full_chain_installed,true);assert.equal(prior.canonical_count,225);assert.equal(prior.prior_review_drafts,41);assert.equal(prior.separate_review_drafts,16);assert.equal(prior.hosted_applied,false);
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
 await db.connect();const before=await snapshot();const constraintsBefore=(await db.query(constraintSql)).rows;const chatBefore=(await db.query("SELECT conrelid::text,conname,convalidated,confdeltype FROM pg_constraint WHERE conrelid IN('public.channels'::regclass,'public.student_channel_removals'::regclass) AND confrelid='public.students'::regclass AND contype='f' ORDER BY 1")).rows;
 const draft='docs/database-proposals/student-request-resolution/resolve-and-cleanup.review.sql';await db.query(readFileSync(draft,'utf8'));const after=await snapshot();
 for(const key of ['policies','tables','data'])assert.deepEqual(after[key],before[key]);
 assert.deepEqual(after.procedures.filter(p=>p.proname!=='close_student_creation_request'),before.procedures);
 assert.deepEqual(after.columns.filter(c=>c.attname!=='creation_closed'),before.columns);
 const oldIndexes=new Set(before.indexes.map(i=>i.indexrelid)),oldTriggers=new Set(before.triggers.map(t=>t.oid));
 assert.deepEqual(after.indexes.filter(i=>oldIndexes.has(i.indexrelid)),before.indexes);const removedChatConstraintOids=new Set(before.triggers.filter(t=>t.tgconstraint!=='0'&&!after.triggers.some(a=>a.oid===t.oid)).map(t=>t.tgconstraint));assert.equal(removedChatConstraintOids.size,2);assert.deepEqual(after.triggers.filter(t=>oldTriggers.has(t.oid)),before.triggers.filter(t=>!removedChatConstraintOids.has(t.tgconstraint)));
 const constraintsAfter=(await db.query(constraintSql)).rows;const isChat=c=>chatBefore.some(old=>old.conrelid===c.conrelid&&old.conname===c.conname);assert.deepEqual(constraintsAfter.filter(c=>!c.conname.endsWith('_student_cleanup_fk')&&!isChat(c)),constraintsBefore.filter(c=>!isChat(c)));const chatAfter=(await db.query("SELECT conrelid::text,conname,convalidated,confdeltype FROM pg_constraint WHERE conrelid IN('public.channels'::regclass,'public.student_channel_removals'::regclass) AND confrelid='public.students'::regclass AND contype='f' ORDER BY 1")).rows;assert.deepEqual(chatAfter,chatBefore.map(c=>({...c,confdeltype:'r'})));
 const guards=(await db.query("SELECT conrelid::regclass::text AS table_name,confdeltype,convalidated FROM pg_constraint WHERE conname LIKE '%_student_cleanup_fk' ORDER BY 1")).rows;
 assert.equal(guards.length,12);assert.equal(guards.filter(g=>g.confdeltype==='c').length,3);assert.equal(guards.filter(g=>g.confdeltype==='r').length,9);assert.ok(guards.every(g=>g.convalidated===false));
 const smoke=[];
 for(const role of ['parent','educator']){
  await db.query('BEGIN');try{
   const actor=randomUUID(),request=randomUUID(),closed=randomUUID(),otherStudent=randomUUID(),partner=randomUUID();
   await db.query("INSERT INTO auth.users(id,email,raw_user_meta_data)VALUES($1,$2,'{\"full_name\":\"Fictional Cleanup Verifier\"}')",[actor,actor+'@disposable.invalid']);
   await db.query('UPDATE public.profiles SET primary_role=$1,email=$2 WHERE id=$3',[role,actor+'@disposable.invalid',actor]);
   await db.query('INSERT INTO public.user_roles(user_id,role)VALUES($1,$2)ON CONFLICT DO NOTHING',[actor,role]);
   await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[actor]);await db.query('SET LOCAL ROLE authenticated');
   const close=async(id)=>(await db.query('SELECT public.close_student_creation_request($1,$2)AS r',[actor,id])).rows[0].r;
   assert.equal((await close(closed)).status,'closed');
   await db.query('SAVEPOINT retry');await assert.rejects(()=>db.query('SELECT public.create_student_with_setup($1,$2,$3)',[actor,closed,{first_name:'Fictional Closed Request'}]),e=>e.code==='23505');await db.query('ROLLBACK TO SAVEPOINT retry');
   for(const id of [request,otherStudent])await db.query('SELECT public.create_student_with_setup($1,$2,$3)',[actor,id,{first_name:'Fictional Cleanup Student'}]);
   assert.equal((await close(request)).status,'present');await db.query('RESET ROLE');
   await db.query("INSERT INTO public.partner_organizations(id,organization_name)VALUES($1,'Fictional Shared Partner')",[partner]);
   for(const id of [request,otherStudent]){
    await db.query("INSERT INTO public.feed_events(student_id,actor_id,kind,title)VALUES($1,$2,'fixture','Fictional activity')",[id,actor]);
    await db.query("INSERT INTO public.in_app_notifications(student_id,user_id,kind,title)VALUES($1,$2,'fixture','Fictional notification')",[id,actor]);
    await db.query('INSERT INTO public.student_saved_partners(student_id,partner_id,saved_by_user_id)VALUES($1,$2,$3)',[id,partner,actor]);
   }
   await db.query('SET LOCAL ROLE authenticated');const deleted=await db.query('DELETE FROM public.students WHERE id=$1 AND owner_id=$2 RETURNING id',[request,actor]);assert.equal(deleted.rows.length,1);assert.equal((await close(request)).status,'closed');
   await db.query('RESET ROLE');for(const table of ['feed_events','in_app_notifications','student_saved_partners']){
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE student_id=$1`,[request])).rows[0].n,0);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE student_id=$1`,[otherStudent])).rows[0].n,1);
   }
   assert.equal((await db.query('SELECT count(*)::int AS n FROM public.partner_organizations WHERE id=$1',[partner])).rows[0].n,1);
   smoke.push({role,unknown_request_closed:true,delayed_create_rejected:true,present_profile_preserved:true,three_exact_cleanup_categories:true,other_student_and_shared_partner_preserved:true,rolled_back:true});
  }finally{await db.query('ROLLBACK');}
 }
 assert.deepEqual(await snapshot(),after);
 writeFileSync(directory+'/full-chain.json',JSON.stringify({schema:'student-request-resolution-full-schema-v1',source_commit:process.env.GITHUB_SHA,canonical_count:225,prior_review_drafts:41,separate_review_drafts:17,native_full_chain_installed:true,smoke,guards,chat_guards:chatAfter,prior_proof_sha256:sha(readFileSync(priorPath)),draft_sha256:sha(readFileSync(draft)),hosted_applied:false,external_cleanup_complete:false,chat_retention_changed:false},null,2)+'\n');
 console.log('Full schema: unknown request closure, exact cleanup, preserved unrelated records and guarded retained content passed.');
}finally{await db.end();}
