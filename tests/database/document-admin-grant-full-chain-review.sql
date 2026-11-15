-- Disposable full-chain post-baseline verification only. Not a migration.
-- Snapshot the real catalog after225 canonical +41 existing control drafts.
CREATE TEMP TABLE grant_review_routines AS
 SELECT p.oid,p.prosrc,p.proconfig,p.prosecdef,p.provolatile,p.proowner,p.proacl
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public';
CREATE TEMP TABLE grant_review_relations AS
 SELECT c.oid,c.relacl,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','storage');
CREATE TEMP TABLE grant_review_policies AS
 SELECT p.polrelid,p.polname,to_jsonb(p)-'oid' AS definition FROM pg_policy p
 JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','storage');
CREATE TEMP TABLE grant_review_state AS SELECT
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(d) ORDER BY id),'[]'::jsonb)::text) FROM public.documents d) AS documents,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(g) ORDER BY id),'[]'::jsonb)::text) FROM public.admin_doc_access_grants g) AS grants,
 (SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id),'[]'::jsonb)::text) FROM storage.objects o) AS objects,
 (SELECT to_jsonb(c) FROM public.document_operation_control c) AS control,
 has_table_privilege('authenticated','public.admin_doc_access_grants','SELECT') AS authenticated_select,
 has_table_privilege('service_role','public.admin_doc_access_grants','INSERT') AS service_insert;
\ir ../../docs/database-proposals/document-admin-grant-retirement/retire-admin-document-grants.review.sql
DO $grant_review$
DECLARE helper_before grant_review_routines%ROWTYPE;now_routine pg_proc%ROWTYPE;
BEGIN
 SELECT * INTO STRICT helper_before FROM grant_review_routines WHERE oid='public.has_recent_admin_doc_access(uuid,uuid)'::regprocedure;
 SELECT * INTO STRICT now_routine FROM pg_proc WHERE oid=helper_before.oid;
 IF now_routine.proowner<>helper_before.proowner OR now_routine.proacl IS DISTINCT FROM helper_before.proacl OR now_routine.prosecdef
   OR now_routine.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']::text[]
   OR public.has_recent_admin_doc_access(gen_random_uuid(),gen_random_uuid()) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Retired helper signature/ACL/mode/result mismatch';END IF;
 SELECT * INTO STRICT helper_before FROM grant_review_routines WHERE oid='public.storage_can_read_student_doc(uuid,text)'::regprocedure;
 SELECT * INTO STRICT now_routine FROM pg_proc WHERE oid=helper_before.oid;
 IF now_routine.proowner<>helper_before.proowner OR now_routine.proacl IS DISTINCT FROM helper_before.proacl OR NOT now_routine.prosecdef
  OR now_routine.proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog']::text[] OR md5(now_routine.prosrc)<>'dd10685db5e204f9d88dc188ad2638d4' THEN RAISE EXCEPTION 'Explicit Storage predicate identity/ACL/body mismatch';END IF;
 IF EXISTS(SELECT 1 FROM grant_review_routines old LEFT JOIN pg_proc p ON p.oid=old.oid
  WHERE old.oid NOT IN('public.has_recent_admin_doc_access(uuid,uuid)'::regprocedure,'public.storage_can_read_student_doc(uuid,text)'::regprocedure) AND (p.oid IS NULL OR
   (p.prosrc,p.proconfig,p.prosecdef,p.provolatile,p.proowner,p.proacl) IS DISTINCT FROM (old.prosrc,old.proconfig,old.prosecdef,old.provolatile,old.proowner,old.proacl))) THEN
  RAISE EXCEPTION 'An unrelated public routine changed';END IF;
 IF EXISTS(SELECT 1 FROM grant_review_relations old LEFT JOIN pg_class c ON c.oid=old.oid
  WHERE c.oid IS NULL OR (c.relrowsecurity,c.relforcerowsecurity) IS DISTINCT FROM (old.relrowsecurity,old.relforcerowsecurity)
   OR (c.oid<>'public.admin_doc_access_grants'::regclass AND c.relacl IS DISTINCT FROM old.relacl)) THEN
  RAISE EXCEPTION 'Unrelated relation permissions or row security changed';END IF;
 IF has_table_privilege('authenticated','public.admin_doc_access_grants','INSERT')
  OR has_table_privilege('anon','public.admin_doc_access_grants','INSERT')
  OR has_table_privilege('authenticated','public.admin_doc_access_grants','SELECT') IS DISTINCT FROM (SELECT authenticated_select FROM grant_review_state)
  OR has_table_privilege('service_role','public.admin_doc_access_grants','INSERT') IS DISTINCT FROM (SELECT service_insert FROM grant_review_state) THEN
  RAISE EXCEPTION 'Grant table privilege retirement mismatch';END IF;
 IF EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.documents'::regclass AND polname='documents_select_admin_override')
  OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.admin_doc_access_grants'::regclass AND polname='admin_doc_access_grants_admin_insert')
  OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.admin_doc_access_grants'::regclass AND polname='retired_admin_document_grant_insert' AND polcmd='a' AND NOT polpermissive AND pg_get_expr(polwithcheck,polrelid)='false') THEN
  RAISE EXCEPTION 'Grant policy retirement mismatch';END IF;
 IF EXISTS(SELECT 1 FROM grant_review_policies old LEFT JOIN pg_policy p ON p.polrelid=old.polrelid AND p.polname=old.polname
  WHERE old.polname NOT IN('documents_select_admin_override','admin_doc_access_grants_admin_insert') AND (p.polname IS NULL OR (to_jsonb(p)-'oid') IS DISTINCT FROM old.definition))
  OR EXISTS(SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname IN('public','storage') AND p.polname<>'retired_admin_document_grant_insert'
    AND NOT EXISTS(SELECT 1 FROM grant_review_policies old WHERE old.polrelid=p.polrelid AND old.polname=p.polname)) THEN
  RAISE EXCEPTION 'Unrelated row policy changed';END IF;
 IF (SELECT documents FROM grant_review_state) IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(d) ORDER BY id),'[]'::jsonb)::text) FROM public.documents d)
  OR (SELECT grants FROM grant_review_state) IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(g) ORDER BY id),'[]'::jsonb)::text) FROM public.admin_doc_access_grants g)
  OR (SELECT objects FROM grant_review_state) IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id),'[]'::jsonb)::text) FROM storage.objects o)
  OR (SELECT control FROM grant_review_state) IS DISTINCT FROM (SELECT to_jsonb(c) FROM public.document_operation_control c) THEN
  RAISE EXCEPTION 'Retirement changed document/grant/Storage/control data';END IF;
END;$grant_review$;
SELECT jsonb_build_object('schema','document-grant-retirement-full-chain-v1','canonical_count',225,'prior_review_drafts',41,'separate_review_drafts',1,'helper_signature_acl_preserved',true,'reviewed_storage_predicate_updated',true,'unrelated_public_routines_unchanged',true,'unrelated_policy_and_acl_unchanged',true,'document_grant_storage_control_data_unchanged',true,'native_full_chain_installed',true,'canonical_or_ledger_promotion_claimed',false,'hosted_applied',false,'ready_for_cutover',false);
