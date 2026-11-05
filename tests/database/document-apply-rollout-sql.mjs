// Prepared strings only. No connection, credentials, provider or hosted action.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const plan=JSON.parse(readFileSync('docs/production-readiness/proposals/document-apply-atomic-install-plan.json','utf8'));
const names=['source-capacity','bound-save','completion-receipt','capacity-release'];
if(plan.sequence.length!==4||plan.single_transaction!==true)throw Error('Reviewed atomic Apply sequence required');
export const applyChainSources=plan.sequence.map((entry,i)=>{
 if(entry.path!==`docs/production-readiness/proposals/document-apply-${names[i]}.sql`)throw Error('Unexpected Apply install order');
 const source=readFileSync(entry.path,'utf8');
 if(createHash('sha256').update(source).digest('hex')!==entry.sha256)throw Error('Apply source drift; review the atomic install plan');
 if(!source.includes('\nBEGIN;\n')||!source.endsWith('COMMIT;\n'))throw Error('Unexpected Apply transaction envelope');
 return {...entry,source};
});
const bodies=applyChainSources.map(({source})=>source.replace('\nBEGIN;\n','\n').replace(/COMMIT;\n$/,''));
const prior=applyChainSources[3].source.match(/DO \$apply_install_boundary\$[\s\S]*?END; \$apply_install_boundary\$;/)?.[0];
if(!prior)throw Error('Reviewed complete Apply boundary required');
const release=applyChainSources[3].source;
const functions=[['guard_bound_apply_finish','guard_apply_finish'],['release_completed_apply_at_commit','release_apply'],['guard_document_capacity_reservation','capacity_guard']];
const exact=functions.map(([name,tag])=>{
 const body=release.match(new RegExp('AS \\$'+tag+'\\$([\\s\\S]*?)\\$'+tag+'\\$;'))?.[1];
 if(!body)throw Error('Missing final Apply routine');
 return `('public.${name}()','${createHash('md5').update(body).digest('hex')}',${name!=='guard_document_capacity_reservation'})`;
}).join(',\n');
const final=`DO $apply_complete_install$
DECLARE item record; caller text;
BEGIN
 FOR item IN SELECT * FROM (VALUES ${exact}) expected(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature)
   AND proowner=current_user::regrole::oid AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Complete Apply implementation required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Private Apply implementation required' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.document_apply_capacity_settlements')
  AND relrowsecurity AND relowner=current_user::regrole::oid)
  OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass('public.document_apply_capacity_settlements')) THEN
  RAISE EXCEPTION 'Private final Apply settlement required' USING ERRCODE='55000'; END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(caller,'public.document_apply_capacity_settlements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
   OR has_any_column_privilege(caller,'public.document_apply_capacity_settlements','SELECT,INSERT,UPDATE,REFERENCES') THEN
   RAISE EXCEPTION 'Private final Apply settlement permissions required' USING ERRCODE='55000'; END IF;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.document_operation_leases','document_bound_apply_finished','public.guard_bound_apply_finish()',27,false),
 ('public.document_apply_completion_receipts','zz_document_apply_capacity_release','public.release_completed_apply_at_commit()',5,true),
 ('public.document_apply_capacity_settlements','document_apply_settlement_retained','public.guard_apply_completion_receipt()',27,false)
 ) expected(relation_name,trigger_name,signature,trigger_type,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name)
   AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature) AND tgtype=item.trigger_type
   AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred
   AND (tgconstraint<>0)=item.deferred AND tgqual IS NULL AND tgattr::text='') THEN
   RAISE EXCEPTION 'Complete Apply release triggers required' USING ERRCODE='55000'; END IF;
 END LOOP;
END; $apply_complete_install$;`;
// No intermediate COMMIT: RPC grants and changed save body become visible only
// after the final owner/private-table/deferred-trigger checks all succeed.
export const applyChainRolloutSql='BEGIN;\n'+bodies.join('\n')+'\n'+prior+'\n'+final+'\nCOMMIT;\n';
