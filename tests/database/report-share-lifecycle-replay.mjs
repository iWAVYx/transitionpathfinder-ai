// Emits a rollback-only integration check for the CI job's disposable full replay.
// No network, subprocess or credential access. Not a migration/deployment command.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const proposal=readFileSync('docs/production-readiness/proposals/report-share-lifecycle.sql','utf8');
const begin=proposal.indexOf('\nBEGIN;\n'),end=proposal.lastIndexOf('\nCOMMIT;');
assert.ok(begin>=0 && end>begin,'Expected one reviewed proposal transaction');
const body=proposal.slice(begin+'\nBEGIN;\n'.length,end);
console.log(`BEGIN;
CREATE TEMP TABLE lifecycle_baseline AS SELECT
 (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.can_access_student(uuid,uuid)'::regprocedure) AS access_body,
 (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename,p.policyname) FROM pg_policies p WHERE schemaname='public' AND tablename IN('pathway_reports','pathway_report_versions','student_intakes','share_tokens','students','student_collaborators','student_relationships')) AS policies,
 (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.grantee,g.table_name,g.privilege_type) FROM information_schema.role_table_grants g WHERE table_schema='public' AND table_name IN('pathway_reports','pathway_report_versions','student_intakes','share_tokens','students','student_collaborators','student_relationships')) AS grants,
 (SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE tgrelid IN ('public.pathway_reports'::regclass,'public.students'::regclass,'public.student_collaborators'::regclass,'public.student_relationships'::regclass) AND NOT tgisinternal) AS triggers;
${body}
DO $verify$
DECLARE sig text; actor text;
BEGIN
 IF (SELECT access_body FROM lifecycle_baseline) IS DISTINCT FROM (SELECT md5(prosrc) FROM pg_proc WHERE oid='public.can_access_student(uuid,uuid)'::regprocedure) THEN RAISE EXCEPTION 'Explicit consent helper changed'; END IF;
 IF (SELECT policies FROM lifecycle_baseline) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.tablename,p.policyname) FROM pg_policies p WHERE schemaname='public' AND tablename IN('pathway_reports','pathway_report_versions','student_intakes','share_tokens','students','student_collaborators','student_relationships')) THEN RAISE EXCEPTION 'Existing report policies changed'; END IF;
 IF (SELECT grants FROM lifecycle_baseline) IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.grantee,g.table_name,g.privilege_type) FROM information_schema.role_table_grants g WHERE table_schema='public' AND table_name IN('pathway_reports','pathway_report_versions','student_intakes','share_tokens','students','student_collaborators','student_relationships')) THEN RAISE EXCEPTION 'Existing report table grants changed'; END IF;
 IF (SELECT triggers FROM lifecycle_baseline) IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_object('table',tgrelid::regclass::text,'name',tgname,'definition',pg_get_triggerdef(oid)) ORDER BY tgrelid,tgname) FROM pg_trigger WHERE tgrelid IN ('public.pathway_reports'::regclass,'public.students'::regclass,'public.student_collaborators'::regclass,'public.student_relationships'::regclass) AND NOT tgisinternal AND tgname NOT IN ('revoke_shares_on_report_context_change','close_report_links_on_collaborator_change','close_report_links_on_relationship_change','close_report_links_on_student_identity_change')) THEN RAISE EXCEPTION 'Existing report triggers changed'; END IF;
 FOREACH sig IN ARRAY ARRAY['public.report_share_is_eligible(uuid)','public.bind_report_share_context()','public.revoke_shares_on_report_context_change()','public.close_report_links_after_access_loss(uuid,uuid)','public.close_report_links_on_student_access_change()'] LOOP
  FOREACH actor IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(actor,sig,'EXECUTE') THEN RAISE EXCEPTION 'Unexpected direct helper execution: % %',actor,sig; END IF;
  END LOOP;
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=sig::regprocedure AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog']) THEN RAISE EXCEPTION 'Helper is not hardened: %',sig; END IF;
 END LOOP;
 FOREACH sig IN ARRAY ARRAY['public.resolve_share_token(text)','public.track_share_view(text)'] LOOP
  IF has_function_privilege('anon',sig,'EXECUTE') OR has_function_privilege('authenticated',sig,'EXECUTE') OR NOT has_function_privilege('service_role',sig,'EXECUTE') THEN RAISE EXCEPTION 'Resolver execution boundary changed: %',sig; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.pathway_reports'::regclass AND tgname='revoke_shares_on_report_context_change' AND tgenabled='O') OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.share_tokens'::regclass AND tgname='bind_report_share_context' AND tgenabled='O') THEN RAISE EXCEPTION 'Lifecycle trigger missing'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.columns c WHERE table_schema='public' AND table_name='share_tokens' AND column_name IN('context_bound','bound_student_id','bound_report_owner_id','bound_intake_id') AND has_column_privilege('authenticated','public.share_tokens',column_name,'UPDATE')) THEN RAISE EXCEPTION 'Client binding updates are exposed'; END IF;
 IF (SELECT count(*) FROM pg_trigger WHERE tgname IN ('close_report_links_on_collaborator_change','close_report_links_on_relationship_change','close_report_links_on_student_identity_change') AND tgenabled='O' AND NOT tgisinternal) <> 3 THEN RAISE EXCEPTION 'Permanent closure hooks missing'; END IF;
 RAISE NOTICE 'Proposal is compatible with the full canonical replay; policies, table grants and prior report triggers unchanged; helpers private; resolver service-only';
END;
$verify$;
ROLLBACK;
SELECT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='share_tokens' AND column_name='context_bound') AS proposal_rolled_back;
`);
