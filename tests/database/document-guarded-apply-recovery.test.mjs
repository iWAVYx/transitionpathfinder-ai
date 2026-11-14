// Actual reviewed Apply/recovery functions with the complete writer-guard suffix.
// Each case gets a fresh child-owned disposable DB; no provider or hosted IO.
import{createGuardedCompositeFixture}from'./document-guarded-composite-fixture.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import{fileURLToPath}from'node:url';import{execFile}from'node:child_process';import{promisify}from'node:util';
const file=fileURLToPath(import.meta.url),exec=promisify(execFile),selected=process.env.PATHWAY_DOCUMENT_COMPOSITE_CASE;
if(process.env.PATHWAY_HISTORY_POSTGRES==='1'&&(!['localhost','127.0.0.1'].includes(process.env.PGHOST)||!process.env.PATHWAY_HISTORY_PG_MODULE))throw Error('Explicit loopback disposable PostgreSQL required');
const cases=[...['family','educator','student','school','district','owner','partner'].map(role=>['apply-'+role,'guarded composite actual Apply for '+role]),['apply-no-evidence','guarded composite actual Apply without evidence'],['apply-rollback','guarded composite actual Apply rollback'],['manual-apply','guarded composite manual review then actual Apply'],['bypass-apply','guarded composite raw and retired writes denied before valid Apply'],['recover-commit','guarded composite private no-save recovery commits'],['recover-rollback','guarded composite private no-save recovery rollback'],['recover-fresh','guarded composite recovery fences stale Apply and permits a fresh claim'],['recover-unknown','guarded composite provider-unknown outcome remains held'],...['anon','authenticated','service_role'].map(role=>['recover-deny-'+role,'guarded composite private recovery denies '+role]),['owner-denied','guarded composite Owner without student access remains denied'],...['pre-reviewer','pre-time','post-reviewer','post-time','post-status','post-sections','post-notes','forged-complete','complete-revision'].map(key=>['marker-'+key,'guarded composite completion marker '+key]),...['unpaused','held','rollback'].map(key=>['install-'+key,'guarded composite marker installation '+key]),...[...Object.keys({family:1,educator:1,student:1,school:1,district:1,owner:1,partner:1}),'stale','deleted','complete','lost'].map(key=>['manual-'+key,'guarded composite actual manual handler '+key])];
if(!selected){
 for(const[key,label]of cases)test(label,async()=>{const childEnv={...process.env,PATHWAY_DOCUMENT_COMPOSITE_CASE:key};delete childEnv.NODE_TEST_CONTEXT;const{stdout,stderr}=await exec(process.execPath,['--experimental-strip-types','--test','--test-name-pattern=^guarded composite',file],{env:childEnv,maxBuffer:2_000_000}).catch(error=>{throw new Error('Isolated composite case failed: '+key+'\n'+(error.stdout??'')+'\n'+(error.stderr??''));});const count=k=>Number([...stdout.matchAll(new RegExp('^# '+k+' ([0-9]+)$','gm'))].at(-1)?.[1]??-1);assert.equal(count('tests'),1,stdout+stderr);assert.equal(count('pass'),1,stdout+stderr);assert.equal(count('fail'),0,stdout+stderr);assert.equal(count('skipped'),0,stdout+stderr);});
}else{
 const entry=cases.find(([key])=>key===selected);assert.ok(entry,'Known isolated composite case required');
 const f=await import('./document-path-exclusivity.test.mjs');
 const{id,sql,pauseTo,setup,state,begin,apply,reviewedHold}=createGuardedCompositeFixture(f);
 test(entry[1],async()=>{const x=await setup(!selected.startsWith('install-'),selected.startsWith('manual-')&&selected!=='manual-apply');
  if(selected.startsWith('install-')){
   if(selected==='install-held'){await begin(x);await pauseTo(true);}
   if(selected==='install-rollback'){await pauseTo(true);await f.db.exec('RESET ROLE');const before=(await f.db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.guard_document_extraction_source_write()'::regprocedure")).rows;await f.db.exec('BEGIN');await f.db.exec(sql('document-extraction-completion-marker-fence').replace('BEGIN;\nSET LOCAL','SET LOCAL').replace(/\nCOMMIT;\n$/,'\n'));await f.db.exec('ROLLBACK');assert.deepEqual((await f.db.query("SELECT md5(prosrc) AS hash FROM pg_proc WHERE oid='public.guard_document_extraction_source_write()'::regprocedure")).rows,before);return;}
   await f.db.exec('RESET ROLE');const before=await state();await assert.rejects(f.db.exec(sql('document-extraction-completion-marker-fence')),{code:'55000'});await f.db.exec('ROLLBACK');assert.deepEqual(await state(),before);return;
  }
  if(selected.startsWith('manual-')&&selected!=='manual-apply'){
   const key=selected.slice(7),actor=f.actors[key]??f.actors.family;
   await f.db.exec('RESET ROLE');
   if(key==='owner')await f.db.query("INSERT INTO public.student_collaborators(student_id,user_id,status,role) VALUES($1,$2,'accepted','editor')",[f.student,actor]);
   if(['school','district'].includes(key))await f.db.query("INSERT INTO public.student_relationships(student_id,related_user_id,consent_status,permission_level) VALUES($1,$2,'approved','manage_plan')",[f.student,actor]);
   if(key==='complete'){const sections=(await f.db.query('SELECT sections FROM public.document_extractions WHERE id=$1',[f.applyId])).rows[0].sections;const claim=await begin(x,f.actors.family,{sections});await apply(x,claim,{sections});}
   const current=(await f.db.query('SELECT to_jsonb(e) AS row FROM public.document_extractions e WHERE id=$1',[f.applyId])).rows[0].row;
   const{registerHooks}=await import('node:module');registerHooks({resolve(specifier,context,next){if(specifier==='zod'&&process.env.PATHWAY_HISTORY_ZOD_MODULE&&context.parentURL?.endsWith('/src/lib/document-review-edit.server.ts'))return{url:(new URL('file://'+process.env.PATHWAY_HISTORY_ZOD_MODULE)).href,shortCircuit:true};return next(specifier,context);}});
   const{saveManualReviewEdit,REVIEW_EDIT_MESSAGE}=await import('../../src/lib/document-review-edit.server.ts');
   let writes=0;
   const client={rpc:async(name,args)=>{assert.ok(['can_edit_student','is_partner_only','can_view_document'].includes(name));const values=name==='can_edit_student'?[args._user_id,args._student_id]:name==='is_partner_only'?[args._user_id]:[args._user_id,args._document_id];const data=(await f.db.query('SELECT public.'+name+'('+values.map((_,i)=>'$'+(i+1)).join(',')+') AS value',values)).rows[0].value;return{data,error:null};},from:table=>{
    assert.equal(table,'document_extractions');let patch=null;const filters=[];const q={select:()=>q,update:value=>{patch=value;return q;},eq:(column,value)=>{assert.ok(['id','document_id','student_id','updated_at','status'].includes(column));filters.push([column,value]);return q;},maybeSingle:async()=>{
     if(patch){writes++;if(key==='stale')await f.db.query("UPDATE public.document_extractions SET review_notes='A newer saved note' WHERE id=$1",[f.applyId]);if(key==='deleted'){await f.db.exec('RESET ROLE');await f.db.query('DELETE FROM public.document_extractions WHERE id=$1',[f.applyId]);await f.as(actor);}}
     const values=[],params=[];if(patch)for(const[column,value]of Object.entries(patch)){assert.ok(['sections','status','review_notes','missing_information','suggested_questions'].includes(column));values.push(value);params.push(column+'=$'+values.length);}
     const where=filters.map(([column,value])=>{values.push(value);return column+'=$'+values.length;}).join(' AND ');
     const rows=(await f.db.query(patch?'UPDATE public.document_extractions e SET '+params.join(',')+' WHERE '+where+' RETURNING to_jsonb(e) AS row':'SELECT to_jsonb(e) AS row FROM public.document_extractions e WHERE '+where,values)).rows;
     if(patch&&key==='lost')throw Error('Fictional lost response');return{data:rows[0]?.row??null,error:null};
    }};return q;
   }};
   await f.as(actor);const input={expected_viewer_id:actor,extraction_id:f.applyId,document_id:x.document,student_id:f.student,expected_updated_at:current.updated_at,key:'strengths',value:''};
   if(['partner','stale','deleted','complete','lost'].includes(key)){await assert.rejects(saveManualReviewEdit(client,actor,input,'section'),{message:REVIEW_EDIT_MESSAGE});assert.equal(writes,['partner','complete'].includes(key)?0:1);}else{const result=await saveManualReviewEdit(client,actor,input,'section');assert.notEqual(result.updated_at,current.updated_at);assert.equal(writes,1);}
   await f.db.exec('RESET ROLE');const saved=(await f.db.query('SELECT to_jsonb(e) AS row FROM public.document_extractions e WHERE id=$1',[f.applyId])).rows[0]?.row;
   if(key==='deleted'){assert.equal(saved,undefined);return;}
   if(['partner','stale','complete'].includes(key))assert.equal(saved.sections.strengths.value,current.sections.strengths.value);else{assert.equal(saved.sections.strengths.value,'');assert.equal(saved.sections.strengths.original_value,current.sections.strengths.original_value);assert.deepEqual(saved.sections.supports,current.sections.supports);}
   if(key==='stale')assert.equal(saved.review_notes,'A newer saved note');assert.equal((await state()).units,0);return;
  }
  if(selected.startsWith('marker-')){
   const key=selected.slice(7);
   if(key.startsWith('post-')||key==='complete-revision'){const claim=await begin(x);await apply(x,claim);}
   await f.as();const before=await state();await f.as();
   const expression={'pre-reviewer':`reviewer_id='${f.actors.family}'::uuid`,'pre-time':"reviewed_at=clock_timestamp()",'post-reviewer':`reviewer_id='${f.actors.educator}'::uuid`,'post-time':"reviewed_at=clock_timestamp()+interval '1 second'",'post-status':"status='in_review'",'post-sections':`sections=jsonb_set(sections,'{strengths,value}','"Forged completed strength"')`,'post-notes':"review_notes='Changed after Apply'",'forged-complete':`status='complete',reviewer_id='${f.actors.family}'::uuid,reviewed_at=clock_timestamp()`,'complete-revision':"updated_at=clock_timestamp()+interval '1 second'"}[key];
   assert.ok(expression);const write=()=>f.db.query('UPDATE public.document_extractions SET '+expression+' WHERE id=$1',[f.applyId]);
   if(key==='complete-revision'){await write();const after=await state();const strip=rows=>rows.map(({updated_at,...rest})=>rest);assert.deepEqual(strip(after.extraction),strip(before.extraction));assert.equal(after.units,0);return;}
   await assert.rejects(write(),{code:'42501'});assert.deepEqual(await state(),before);return;
  }
  if(selected.startsWith('apply-')&&selected!=='apply-no-evidence'&&selected!=='apply-rollback'){
   const role=selected.slice(6),actor=f.actors[role];await f.db.exec('RESET ROLE');
   if(role==='owner')await f.db.query("INSERT INTO public.student_collaborators(student_id,user_id,status,role) VALUES($1,$2,'accepted','editor')",[f.student,actor]);
   if(['school','district'].includes(role))await f.db.query("INSERT INTO public.student_relationships(student_id,related_user_id,consent_status,permission_level) VALUES($1,$2,'approved','manage_plan')",[f.student,actor]);
   if(role==='partner'){await assert.rejects(begin(x,actor),{code:'42501'});assert.equal((await state()).units,0);return;}
   const claim=await begin(x,actor);await apply(x,claim,{actor});const s=await state();assert.equal(s.units,0);assert.equal(s.student[0].strengths_summary,'Fictional strengths');assert.equal(s.profiles[0].current_services_summary,'Fictional written supports');assert.equal(s.evidence.length,1);assert.equal(s.extraction.find(e=>e.id===f.applyId).status,'complete');assert.equal(s.leases[0].state,'completed');return;
  }
  if(selected==='owner-denied'){await assert.rejects(begin(x,f.actors.owner),{code:'42501'});assert.equal((await state()).units,0);return;}
  if(selected==='apply-no-evidence'){const claim=await begin(x,f.actors.family,{evidence:false});await apply(x,claim,{evidence:false});const s=await state();assert.equal(s.evidence.length,0);assert.equal(s.units,0);assert.equal(s.student[0].strengths_summary,'Fictional strengths');return;}
  if(selected==='apply-rollback'){const claim=await begin(x);const before=await state();await f.db.exec('BEGIN');await apply(x,claim);await f.db.exec('ROLLBACK');assert.deepEqual(await state(),before);return;}
  if(selected==='manual-apply'||selected==='bypass-apply'){
   await f.as();if(selected==='bypass-apply'){await assert.rejects(f.db.query("UPDATE public.document_extractions SET raw_extract='{\"unbound\":true}' WHERE id=$1",[f.applyId]),{code:'42501'});await assert.rejects(f.db.query('SELECT public.save_document_text_review($1,$2,$3,$4,$5,$6,$7,$8)',[f.applyId,f.student,x.document,x.revision,'2026-01-01T00:00:00Z','in_review','{}','{}']),{code:'42501'});}
   const sections=structuredClone(f.applySections);sections.strengths.value='Manually reviewed strength';const r=(await f.db.query("UPDATE public.document_extractions SET sections=$2,review_notes='A manual review note',status='in_review' WHERE id=$1 RETURNING updated_at::text AS revision",[f.applyId,sections])).rows[0];const current={...x,revision:r.revision};const claim=await begin(current,f.actors.family,{sections});await apply(current,claim,{sections});const s=await state();assert.equal(s.student[0].strengths_summary,'Manually reviewed strength');assert.equal(s.units,0);assert.equal(s.extraction.find(e=>e.id===f.applyId).review_notes,'A manual review note');return;
  }
  const held=await reviewedHold(x,selected==='recover-unknown'?'provider_unknown':'manual_review');const before=await state();
  if(selected.startsWith('recover-deny-')){await f.as(f.actors.owner,selected.slice('recover-deny-'.length));await assert.rejects(f.reconcileApplyNoSave(held),{code:'42501'});assert.deepEqual(await state(),before);return;}
  await f.db.exec('RESET ROLE');await f.db.query("SELECT set_config('request.jwt.claim.sub','',false)");
  if(selected==='recover-unknown'){await assert.rejects(f.reconcileApplyNoSave(held),{code:'55000'});assert.deepEqual(await state(),before);return;}
  if(selected==='recover-rollback'){await f.db.exec('BEGIN');await f.reconcileApplyNoSave(held);await f.db.exec('ROLLBACK');assert.deepEqual(await state(),before);return;}
  const result=await f.reconcileApplyNoSave(held);assert.equal(result.outcome,'no_save_confirmed');const after=await state();for(const key of['student','profiles','audit','evidence'])assert.deepEqual(after[key],before[key]);assert.equal(after.units,0);const old=before.extraction.find(e=>e.id===f.applyId),saved=after.extraction.find(e=>e.id===f.applyId);const strip=({updated_at,...rest})=>rest;assert.deepEqual(strip(saved),strip(old));const prior=before.extractionRevisions.find(e=>e.id===f.applyId).revision;const current=after.extractionRevisions.find(e=>e.id===f.applyId).revision;assert.notEqual(current,prior);assert.equal((await f.db.query('SELECT $1::timestamptz>$2::timestamptz AS advanced',[current,prior])).rows[0].advanced,true);assert.equal(after.leases[0].state,'needs_review');
  if(selected==='recover-fresh'){await pauseTo(false);await assert.rejects(begin(x,f.actors.family,{operation:id(71003)}),{code:'42501'});const current={...x,revision:result.replacement_revision};const claim=await begin(current,f.actors.family,{operation:id(71003)});await f.as();await assert.rejects(f.applyAtomic(x),{code:'42501'});await apply(current,claim);assert.equal((await state()).units,0);}
 });
}
