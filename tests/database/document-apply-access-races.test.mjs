// Native-only actual Apply/authority races. No hosted URLs, accounts or providers.
import test from'node:test';import assert from'node:assert/strict';import{fileURLToPath,pathToFileURL}from'node:url';import{execFile}from'node:child_process';import{promisify}from'node:util';
import{createGuardedCompositeFixture}from'./document-guarded-composite-fixture.mjs';
import{applyAccessCases}from'./document-apply-access-race-cases.mjs';
if(process.env.PATHWAY_HISTORY_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(process.env.PGHOST)||!process.env.PATHWAY_HISTORY_PG_MODULE)throw Error('Explicit loopback disposable PostgreSQL required; no local skip acceptance');
const selected=process.env.PATHWAY_DOCUMENT_APPLY_ACCESS_CASE,file=fileURLToPath(import.meta.url);
if(!selected){
 const exec=promisify(execFile);
 for(const entry of applyAccessCases)test(entry.label,async()=>{const env={...process.env,EVIDENCE_GRAPH_WRITES:'true',PATHWAY_DOCUMENT_APPLY_ACCESS_CASE:entry.key};delete env.NODE_TEST_CONTEXT;const{stdout,stderr}=await exec(process.execPath,['--experimental-strip-types','--test','--test-name-pattern=^Apply access race',file],{env,maxBuffer:3_000_000}).catch(error=>{throw Error('Isolated access race failed: '+entry.key+'\n'+(error.stdout??'')+'\n'+(error.stderr??''));});for(const[k,wanted]of Object.entries({tests:1,pass:1,fail:0,skipped:0}))assert.equal(Number([...stdout.matchAll(new RegExp('^# '+k+' ([0-9]+)$','gm'))].at(-1)?.[1]??-1),wanted,stdout+stderr);});
}else{
 const entry=applyAccessCases.find(e=>e.key===selected);assert.ok(entry,'Known race case required');
 const f=await import('./document-path-exclusivity.test.mjs');const{setup,state}=createGuardedCompositeFixture(f);
 const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};};
 test(entry.label,async()=>{
  const x=await setup(),actor=f.actors[entry.role==='partner-transition'?'educator':entry.role];await f.db.exec('RESET ROLE');
  // Each actor has exactly the named proof, not an accidental alternate grant.
  await f.db.query('DELETE FROM public.student_collaborators WHERE student_id=$1',[f.student]);await f.db.query('DELETE FROM public.student_relationships WHERE student_id=$1',[f.student]);await f.db.query('UPDATE public.students SET owner_id=$2,student_user_id=NULL WHERE id=$1',[f.student,f.actors.family]);
  if(entry.role==='student')await f.db.query('UPDATE public.students SET student_user_id=$2 WHERE id=$1',[f.student,actor]);
  if(['educator','owner','partner-transition'].includes(entry.role))await f.db.query("INSERT INTO public.student_collaborators(student_id,user_id,status,role) VALUES($1,$2,'accepted','editor')",[f.student,actor]);
  if(['school','district'].includes(entry.role))await f.db.query("INSERT INTO public.student_relationships(student_id,related_user_id,consent_status,permission_level) VALUES($1,$2,'approved','manage_plan')",[f.student,actor]);
  const before=await state(),source=(await f.db.query('SELECT to_jsonb(e) AS row FROM public.document_extractions e WHERE id=$1',[f.applyId])).rows[0].row;
  const database=(await f.db.query('SELECT current_database() AS name')).rows[0].name;assert.match(database,/^tf_doc_path_[a-f0-9]{32}$/);
  const pg=await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href),{Client}=pg.default??pg,clients=[];
  const session=async()=>{const raw=new Client({host:'127.0.0.1',port:Number(process.env.PGPORT||5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,database,statement_timeout:10000});await raw.connect();clients.push(raw);return{query:(...args)=>raw.query(...args),exec:sql=>raw.query(sql)};};
  let A,B,C,work,mutation,claim,applyCalls=0,beginCalls=0,holdCalls=0;const admitted=deferred(),applied=deferred(),releaseReply=deferred();let aEnding;const adapterFailures=[];
  const resultOf=promise=>promise.then(value=>({value}),error=>({error}));
  const remove=()=>{
   if(entry.role==='family')return B.query('UPDATE public.students SET owner_id=$2 WHERE id=$1',[f.student,f.actors.owner]);
   if(entry.role==='student')return B.query('UPDATE public.students SET student_user_id=NULL WHERE id=$1',[f.student]);
   if(entry.role==='partner-transition')return B.query("UPDATE public.user_roles SET role='partner' WHERE user_id=$1",[actor]);
   const table=['school','district'].includes(entry.role)?'student_relationships':'student_collaborators',column=table==='student_relationships'?'related_user_id':'user_id';return B.query('DELETE FROM public.'+table+' WHERE student_id=$1 AND '+column+'=$2',[f.student,actor]);
  };
  // IDs must be obtained before dispatch: a busy connection cannot service a
  // diagnostic query while its own statement is blocked.
  let aPid,bPid;
  const observeLock=async(waiter,holder)=>{for(let i=0;i<100;i++){if((await f.db.query('SELECT $2::int=ANY(pg_blocking_pids($1::int)) AS blocked',[waiter,holder])).rows[0].blocked)return;await f.db.query('SELECT pg_sleep(0.02)');}assert.fail('Expected competing-session lock was not observed '+JSON.stringify(adapterFailures));};
  try{
   A=await session();B=await session();C=await session();aPid=(await A.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;bPid=(await B.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;await f.as(actor,'authenticated',A);await f.as('','service_role',C);
   const{registerHooks}=await import('node:module');registerHooks({resolve(specifier,context,next){if(specifier==='zod'&&process.env.PATHWAY_HISTORY_ZOD_MODULE&&/\/src\/lib\/document-(?:extraction-apply|operation-admission)\.server\.ts$/.test(context.parentURL??''))return{url:pathToFileURL(process.env.PATHWAY_HISTORY_ZOD_MODULE).href,shortCircuit:true};if(context.parentURL?.endsWith('/src/lib/document-extraction-apply.server.ts')&&['./document-operation-admission.server','./evidence-writers.functions'].includes(specifier))return{url:new URL(specifier+'.ts',context.parentURL).href,shortCircuit:true};return next(specifier,context);}});
   const{applyReviewedExtractionWithAdmission}=await import('../../src/lib/document-extraction-apply.server.ts');
   const metadata={rpc:async(name,args)=>{
    try{
     if(name==='begin_bound_document_apply'){beginCalls++;const data=(await C.query('SELECT public.begin_bound_document_apply($1,$2,$3,$4,$5,$6,$7,$8) AS value',[args._operation_id,args._actor_id,args._student_id,args._document_id,args._extraction_id,args._expected_revision,args._expected_sections,args._emit_evidence])).rows[0].value;claim=data;if(entry.direction==='removal-first'){await B.exec('BEGIN');await remove();}admitted.resolve();return{data,error:null};}
     assert.equal(name,'finish_document_operation');holdCalls++;const data=(await C.query('SELECT public.finish_document_operation($1,$2,$3,$4) AS value',[args._operation_id,args._actor_id,args._receipt_id,args._outcome])).rows[0].value;return{data,error:null};
    }catch(error){adapterFailures.push({stage:name,code:error.code??'TEST_ERROR'});admitted.resolve();return{data:null,error:{code:error.code}};}
   }};
   const caller={rpc:async(name,args)=>{
    try{
     if(name==='apply_reviewed_document_extraction'){
      applyCalls++;if(entry.direction==='apply-first')await A.exec('BEGIN');const data=(await A.query('SELECT public.apply_reviewed_document_extraction($1,$2,$3,$4,$5,$6) AS value',[args._extraction_id,args._student_id,args._document_id,args._expected_updated_at,args._expected_sections,args._emit_evidence])).rows[0].value;
      if(entry.direction==='apply-first'){applied.resolve();await releaseReply.promise;if(aEnding==='ROLLBACK')throw Error('Fictional rollback discards the uncommitted reply');}return{data,error:null};
     }
     assert.ok(['can_edit_student','is_partner_only','can_view_document'].includes(name));const values=name==='can_edit_student'?[args._user_id,args._student_id]:name==='is_partner_only'?[args._user_id]:[args._user_id,args._document_id];return{data:(await A.query('SELECT public.'+name+'('+values.map((_,i)=>'$'+(i+1)).join(',')+') AS value',values)).rows[0].value,error:null};
    }catch(error){adapterFailures.push({stage:name,code:error.code??'TEST_ROLLBACK'});applied.resolve();return{data:null,error:{code:error.code??'TEST_ROLLBACK'}};}
   },from:table=>{assert.ok(['documents','document_extractions'].includes(table));let columns,key,value;const q={select:c=>{columns=c.split(',');assert.ok(columns.every(c=>/^[a-z_]+$/.test(c)));return q;},eq:(k,v)=>{assert.equal(k,'id');key=k;value=v;return q;},maybeSingle:async()=>{const fields=columns.map(c=>"'"+c+"',e."+c).join(',');return{data:(await A.query('SELECT jsonb_build_object('+fields+') AS value FROM public.'+table+' e WHERE '+key+'=$1',[value])).rows[0]?.value??null,error:null};}};return q;}};
   const input={expected_viewer_id:actor,extraction_id:f.applyId,document_id:x.document,student_id:f.student,expected_updated_at:source.updated_at,expected_sections:source.sections};
   work=resultOf(applyReviewedExtractionWithAdmission(caller,actor,input,async()=>metadata));
   if(entry.direction==='removal-first'){
    await Promise.race([admitted.promise,work.then(()=>{throw Error('Stopped before admission '+JSON.stringify(adapterFailures));})]);assert.ok(claim,'Actual source-bound claim required');await observeLock(aPid,bPid);await B.exec(entry.ending);
   }else{
    await Promise.race([applied.promise,work.then(()=>{throw Error('Stopped before pending Apply '+JSON.stringify(adapterFailures));})]);assert.ok(claim,'Actual source-bound claim required');await B.exec('BEGIN');mutation=resultOf(remove());await observeLock(bPid,aPid);aEnding=entry.ending;await A.exec(entry.ending);const changed=await mutation;assert.equal(changed.error,undefined);await B.exec('COMMIT');releaseReply.resolve();
   }
   const outcome=await work,success=entry.direction==='removal-first'?entry.ending==='ROLLBACK':entry.ending==='COMMIT';assert.equal(beginCalls,1);assert.equal(applyCalls,1);assert.equal(holdCalls,success?0:1);assert.equal(Boolean(outcome.error),!success);if(success)assert.equal(outcome.value.ok,true);
   const after=await state(),lease=after.leases.find(l=>l.operation_id===claim.operation_id);assert.ok(lease);assert.equal(after.units,success?0:1);
   if(success){assert.equal(lease.state,'completed');assert.equal(after.student[0].strengths_summary,'Fictional strengths');assert.equal(after.profiles[0].current_services_summary,'Fictional written supports');assert.equal(after.evidence.length,before.evidence.length+1);assert.equal(after.audit.length,before.audit.length+1);assert.equal(after.extraction.find(e=>e.id===f.applyId).status,'complete');}
   else{assert.ok(['active','needs_review'].includes(lease.state));const profileOnly=rows=>rows.map(({owner_id,student_user_id,...rest})=>rest);assert.deepEqual(profileOnly(after.student),profileOnly(before.student));for(const key of['profiles','evidence','audit','extraction','extractionRevisions'])assert.deepEqual(after[key],before[key]);}
   const authority=(await f.db.query('SELECT public.can_edit_student($1,$2) AS edit,public.can_access_student($1,$2) AS access,public.is_partner_only($1) AS partner,public.can_view_document($1,$3) AS view',[actor,f.student,x.document])).rows[0],retained=entry.direction==='removal-first'&&entry.ending==='ROLLBACK';
   // Canonical edit/access describe the retained student grant; Apply also
   // requires the separate non-partner-only role gate. Assert both, not a
   // fictional change to a shared helper used by other authorized features.
   assert.equal(authority.edit,entry.role==='partner-transition'?true:retained);assert.equal(authority.partner,entry.role==='partner-transition'&&!retained);assert.equal(authority.edit&&authority.access&&!authority.partner&&authority.view,retained);
  }finally{
   // Unblock every pending statement before closing connections/drop database.
   for(const client of(entry.direction==='removal-first'?[B,A]:[A,B]))if(client)await client.exec('ROLLBACK').catch(()=>{});releaseReply.resolve();if(mutation)await mutation;if(work)await work;await Promise.all(clients.map(c=>c.end()));
  }
 });
}
