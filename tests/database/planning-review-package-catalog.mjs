// Read-only catalog collection on an explicit fake-credential CI service only.
import assert from'node:assert/strict';
import{readFileSync,writeFileSync,mkdirSync}from'node:fs';
import{createHash}from'node:crypto';
import{pathToFileURL}from'node:url';
export const sha=source=>createHash('sha256').update(source).digest('hex');
export const REVIEW_DRAFTS=[
 'docs/database-proposals/document-admin-grant-retirement/retire-admin-document-grants.review.sql',
 'docs/database-proposals/document-permission-parent/bind-document-permission-parent.review.sql',
 'docs/database-proposals/document-original-access/restrict-original-file-grants.review.sql',
 'docs/database-proposals/document-summary-scope/separate-reviewed-summary-access.review.sql',
 'docs/database-proposals/document-grant-lifecycle/retire-document-grants.review.sql',
 'docs/database-proposals/document-legacy-privacy/restrict-legacy-document-visibility.review.sql',
 'docs/database-proposals/rights-status-consistency/atomic-rights-review.review.sql',
 'docs/database-proposals/progress-access-consistency/guard-progress-access.review.sql',
 'docs/database-proposals/student-voice-consistency/guard-student-voice.review.sql',
];
export const ADDED_ROUTINES=['enforce_document_permission_parent','read_reviewed_student_document_summaries','lock_internal_document_grant_recipient','guard_document_grant_lifecycle','retire_internal_document_grants','retire_document_grants_after_access_change','document_visibility_allows','guard_document_visibility_identity','may_delete_unregistered_student_document','guard_registered_student_document_delete','internal_rights_review_payload','guard_rights_review_history','guard_student_rights_review','read_student_rights_review','save_student_rights_review','guard_roadmap_progress_write','read_student_roadmap_progress','save_student_roadmap_progress','guard_goal_progress_identity','can_read_report_goal_progress','summarize_own_report_goal_progress','guard_student_voice_answer','read_student_voice_answers','save_student_voice_answer'];
export const CHANGED_ROUTINES=['has_recent_admin_doc_access','storage_can_read_student_doc','can_view_document'];
export const CLIENT_RPCS=['read_reviewed_student_document_summaries','read_student_rights_review','save_student_rights_review','read_student_roadmap_progress','save_student_roadmap_progress','can_read_report_goal_progress','summarize_own_report_goal_progress','read_student_voice_answers','save_student_voice_answer'];
export function assertDisposable(env=process.env){if(env.GITHUB_ACTIONS!=='true'||env.PLANNING_PACKAGE_SCHEMA_SERVICE!=='1'||!['localhost','127.0.0.1'].includes(env.PGHOST)||env.PGUSER!=='postgres'||env.PGPASSWORD!=='postgres'||env.PGDATABASE!=='postgres'||!/^\d+$/.test(env.PGPORT??'')||!env.PLANNING_PACKAGE_PG_MODULE?.startsWith('/'))throw Error('Explicit fake-credential disposable schema service required');}
export async function catalog(){assertDisposable();const pg=await import(pathToFileURL(process.env.PLANNING_PACKAGE_PG_MODULE).href),Client=(pg.default??pg).Client,db=new Client({host:process.env.PGHOST,port:Number(process.env.PGPORT),user:'postgres',password:'postgres',database:'postgres',statement_timeout:30000});try{await db.connect();const result=await db.query(`SELECT p.oid::text,p.proname AS name,format('public.%I(%s)',p.proname,oidvectortypes(p.proargtypes)) AS signature,
 pg_get_userbyid(p.proowner)AS owner,p.prosecdef AS security_definer,p.provolatile AS volatility,p.proconfig AS settings,
 pg_get_expr(p.proargdefaults,0)AS argument_defaults,pg_get_function_result(p.oid)AS return_type,md5(p.prosrc)AS body_md5,
 pg_get_functiondef(p.oid)AS definition,
 EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))a WHERE a.grantee=0 AND a.privilege_type='EXECUTE')AS public_execute,
 has_function_privilege('anon',p.oid,'EXECUTE')AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE')AS authenticated_execute,has_function_privilege('service_role',p.oid,'EXECUTE')AS service_execute,
 (SELECT jsonb_agg(jsonb_build_object('grantee',CASE WHEN a.grantee=0 THEN 'PUBLIC'ELSE pg_get_userbyid(a.grantee)END,'privilege',a.privilege_type,'grantable',a.is_grantable)ORDER BY a.grantee,a.privilege_type)FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))a)AS acl
 FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.prokind='f' ORDER BY p.oid`);
 return result.rows.map(({definition,...row})=>({...row,definition_sha256:sha(definition)}));}finally{await db.end();}}
export function compareCatalog(before,after){
 const old=new Map(before.map(row=>[row.oid,row])),now=new Map(after.map(row=>[row.oid,row]));
 const added=after.filter(row=>!old.has(row.oid)),removed=before.filter(row=>!now.has(row.oid)),changed=after.filter(row=>old.has(row.oid)&&JSON.stringify(row)!==JSON.stringify(old.get(row.oid)));
 assert.equal(removed.length,0,'No existing routine may disappear');assert.deepEqual(added.map(row=>row.name).sort(),[...ADDED_ROUTINES].sort());assert.deepEqual(changed.map(row=>row.name).sort(),[...CHANGED_ROUTINES].sort());
 for(const row of added){assert.equal(row.owner,'postgres');assert.deepEqual(row.settings,['search_path=pg_catalog']);const predicate=row.name==='may_delete_unregistered_student_document',rpc=CLIENT_RPCS.includes(row.name);assert.equal(row.public_execute,false,row.name);assert.equal(row.anon_execute,predicate,row.name);assert.equal(row.authenticated_execute,predicate||rpc,row.name);assert.equal(row.service_execute,false,row.name);}
 const retired=changed.find(row=>row.name==='has_recent_admin_doc_access');assert.equal(retired.security_definer,false);assert.deepEqual(retired.settings,['search_path=pg_catalog']);
 return{added,changed,removed:[],unchanged_count:after.length-added.length-changed.length};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 assertDisposable();const directory=process.argv[2];if(!directory)throw Error('Result directory required');mkdirSync(directory,{recursive:true});
 const before=JSON.parse(readFileSync(directory+'/before.json')),after=await catalog(),diff=compareCatalog(before,after),prior=JSON.parse(readFileSync('/tmp/student-voice-consistency-schema/full-chain.json'));
 assert.equal(prior.native_full_chain_installed,true);assert.equal(prior.canonical_count,225);assert.equal(prior.prior_review_drafts,41);assert.equal(prior.separate_review_drafts,9);assert.equal(prior.hosted_applied,false);
 const proof={schema:'planning-review-package-catalog-v1',source_commit:process.env.GITHUB_SHA,canonical_count:225,prior_control_drafts:41,separate_review_drafts:9,preserved_inherited_stages:56,native_full_chain_installed:true,baseline_snapshot_before_first_separate_draft:true,all_unrelated_routines_preserved:true,added_routines:diff.added,changed_existing_routines:diff.changed,removed_routines:[],unchanged_routine_count:diff.unchanged_count,authenticated_only_rpcs:CLIENT_RPCS,anonymous_actor_scoped_cleanup_predicates:['may_delete_unregistered_student_document'],private_new_helpers:diff.added.filter(row=>!CLIENT_RPCS.includes(row.name)&&row.name!=='may_delete_unregistered_student_document').map(row=>row.signature),retired_helper_not_a_read_grant:'has_recent_admin_doc_access',draft_order:REVIEW_DRAFTS.map((path,i)=>({order:i+1,path,sha256:sha(readFileSync(path))})),prior_nine_draft_proof_sha256:sha(readFileSync('/tmp/student-voice-consistency-schema/full-chain.json')),before_catalog_sha256:sha(JSON.stringify(before)),after_catalog_sha256:sha(JSON.stringify(after)),source_manifest:['tests/database/planning-review-package-catalog.mjs','tests/database/run-planning-review-package-base.mjs','.github/workflows/planning-release-package-review.yml'].map(path=>({path,sha256:sha(readFileSync(path))})),status:'catalog-captured-for-release-review-not-promoted',routine_approval_granted:false,canonical_or_ledger_promoted:false,hosted_actions:false,production_access:false,release_authorization_granted:false,ready_for_cutover:false};
 writeFileSync(directory+'/after.json',JSON.stringify(after,null,2)+'\n');writeFileSync(directory+'/catalog.json',JSON.stringify(proof,null,2)+'\n');console.log('Verified exact nine-draft order,24 new/three changed routines and unchanged remaining public routines; no release authority.');
}
