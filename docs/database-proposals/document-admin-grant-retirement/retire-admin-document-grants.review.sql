-- REVIEW-ONLY. Not canonical, not part of the existing225+41 chain.
-- Never execute against a hosted target without separate reviewed authorization.
-- No data deletion and no Storage/provider operation. Existing signed URLs can
-- remain valid until expiry. Concurrent old transactions require native review.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $reviewed_baseline$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('public.admin_doc_access_grants') AND relrowsecurity)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('public.documents') AND relrowsecurity)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.documents') AND polname='documents_select_admin_override' AND polcmd='r')
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.admin_doc_access_grants') AND polname='admin_doc_access_grants_admin_insert' AND polcmd='a')
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.has_recent_admin_doc_access(uuid,uuid)') AND md5(prosrc)='0a849906306df42e59d2a5618855630a') THEN
    RAISE EXCEPTION 'Reviewed legacy document-grant baseline is missing or changed; stop for review.' USING ERRCODE='55000';
  END IF;
END;
$reviewed_baseline$;
LOCK TABLE public.admin_doc_access_grants IN SHARE ROW EXCLUSIVE MODE;
-- Keep the table and every historical row for audit. Block authenticated cached
-- insert paths even if a future permissive policy/privilege is introduced.
REVOKE INSERT ON TABLE public.admin_doc_access_grants FROM PUBLIC,anon,authenticated;
DROP POLICY admin_doc_access_grants_admin_insert ON public.admin_doc_access_grants;
CREATE POLICY retired_admin_document_grant_insert ON public.admin_doc_access_grants
  AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
DROP POLICY documents_select_admin_override ON public.documents;
-- Retain signature/OID for cached dependent Storage policies, but all historic
-- grant rows (including service-written or unexpired ones) are now inert.
CREATE OR REPLACE FUNCTION public.has_recent_admin_doc_access(_user_id uuid,_document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $retired$ SELECT false; $retired$;
COMMENT ON FUNCTION public.has_recent_admin_doc_access(uuid,uuid) IS 'Retired private document override. Platform management roles and legacy grant rows confer no read access.';
COMMIT;
