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
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('storage.objects') AND relrowsecurity)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname='student_document_no_blocked_read' AND polcmd='r' AND NOT polpermissive)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname='student_document_no_client_replace' AND polcmd='w' AND NOT polpermissive)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname='student_document_no_client_delete' AND polcmd='d' AND NOT polpermissive)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.documents') AND polname='documents_select_admin_override' AND polcmd='r')
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.admin_doc_access_grants') AND polname='admin_doc_access_grants_admin_insert' AND polcmd='a')
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=pg_catalog.to_regclass('public.admin_doc_access_grants') AND attname='revoked_at' AND NOT attisdropped)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.storage_can_read_student_doc(uuid,text)') AND prosecdef AND md5(prosrc)='9a381a8eea583a5ee6b30cf9ae723f94')
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.has_recent_admin_doc_access(uuid,uuid)') AND prosecdef AND md5(prosrc)='9b88504c966cbf066052cea3d29005f6') THEN
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
-- Preserve signature/OID/ACL while removing the remaining role-only non-clean
-- Storage exception. Existing quarantine/no-replacement policies stay in force.
CREATE OR REPLACE FUNCTION public.storage_can_read_student_doc(_user_id uuid,_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $explicit_storage$
DECLARE
  v_student_id uuid; v_doc_id uuid; v_doc_student uuid;
  v_archived timestamptz; v_deleted timestamptz; v_scan text; v_uploaded_by uuid;
BEGIN
  IF public.is_partner_only(_user_id) THEN RETURN false; END IF;
  BEGIN v_student_id := ((storage.foldername(_path))[1])::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  SELECT id,student_id,archived_at,deleted_at,scan_status,uploaded_by
    INTO v_doc_id,v_doc_student,v_archived,v_deleted,v_scan,v_uploaded_by
    FROM public.documents WHERE storage_path=_path LIMIT 1;
  IF v_doc_id IS NULL THEN RETURN public.can_edit_student(_user_id,v_student_id); END IF;
  IF v_doc_student IS DISTINCT FROM v_student_id OR v_deleted IS NOT NULL THEN RETURN false; END IF;
  -- A management role and an old upload identity are never student consent.
  IF public.is_platform_admin(_user_id) AND public.can_access_student(_user_id,v_doc_student) IS DISTINCT FROM true THEN RETURN false; END IF;
  IF public.can_view_document(_user_id,v_doc_id) IS DISTINCT FROM true THEN RETURN false; END IF;
  IF v_archived IS NOT NULL AND public.can_edit_student(_user_id,v_doc_student) IS DISTINCT FROM true THEN RETURN false; END IF;
  IF v_scan IS DISTINCT FROM 'clean' THEN
    RETURN public.can_edit_student(_user_id,v_doc_student)
      AND (_user_id=v_uploaded_by OR public.is_platform_admin(_user_id));
  END IF;
  RETURN true;
END;
$explicit_storage$;
COMMIT;
