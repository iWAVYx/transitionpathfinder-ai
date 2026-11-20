-- REVIEW ONLY: third separate review draft. Not canonical or ledger-promoted.
-- Install only after reviewed admin-grant retirement and parent binding.
-- No hosted installation without fresh authorization. No data is rewritten.
-- Independent student-team access is unchanged; this restricts grant-origin
-- original-file access, not the relationship-level baseline permission model.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.document_permissions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid IN (pg_catalog.to_regclass('public.documents'),pg_catalog.to_regclass('public.document_permissions'),pg_catalog.to_regclass('storage.objects')) AND NOT relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)') AND prosecdef AND md5(prosrc)='8aa18840923b32808d48f36d7a141657')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.storage_can_read_student_doc(uuid,text)') AND prosecdef AND md5(prosrc)='dd10685db5e204f9d88dc188ad2638d4')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=pg_catalog.to_regclass('public.document_permissions') AND tgname='enforce_document_permission_parent' AND tgenabled='O' AND NOT tgisinternal)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('storage.objects') AND polname='student_document_no_blocked_read' AND NOT polpermissive)
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polname IN ('document_original_read_boundary','student_document_original_read_boundary','document_original_grant_insert_boundary','document_original_grant_no_replace')) THEN
  RAISE EXCEPTION 'Reviewed original-document prerequisites are missing or changed; stop for review.' USING ERRCODE='55000';
 END IF;
END;
$baseline$;
DO $replace_body$
DECLARE before_proc pg_catalog.pg_proc%ROWTYPE; after_proc pg_catalog.pg_proc%ROWTYPE; definition text;
 replacement text := $body$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND NOT public.is_partner_only(_user_id)
      AND (NOT public.is_platform_admin(_user_id) OR public.can_access_student(_user_id,d.student_id))
      AND (
        public.can_access_student(_user_id, d.student_id)
        OR EXISTS (
          SELECT 1 FROM public.document_permissions p
          WHERE p.document_id = d.id
            AND p.student_id = d.student_id
            AND p.user_id = _user_id
            AND p.role_type IS NULL
            AND p.permission_level IN ('view_document','download_document','review_document','edit_metadata','manage')
        )
      )
  );
$body$;
BEGIN
 SELECT * INTO STRICT before_proc FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)');
 definition:=pg_catalog.pg_get_functiondef(before_proc.oid);
 IF pg_catalog.md5(replacement)<>'c6a07b2484f7140c5d147aa6ccadf61c' OR pg_catalog.strpos(definition,before_proc.prosrc)=0 THEN
  RAISE EXCEPTION 'Reviewed original-document predicate does not match.' USING ERRCODE='55000';
 END IF;
 EXECUTE pg_catalog.replace(definition,before_proc.prosrc,replacement);
 SELECT * INTO STRICT after_proc FROM pg_catalog.pg_proc WHERE oid=before_proc.oid;
 IF after_proc.proowner IS DISTINCT FROM before_proc.proowner OR after_proc.proacl IS DISTINCT FROM before_proc.proacl
 OR after_proc.proconfig IS DISTINCT FROM before_proc.proconfig OR after_proc.prosecdef IS DISTINCT FROM before_proc.prosecdef
 OR after_proc.provolatile IS DISTINCT FROM before_proc.provolatile OR after_proc.prolang IS DISTINCT FROM before_proc.prolang
 OR after_proc.prosrc IS DISTINCT FROM replacement THEN
  RAISE EXCEPTION 'Original-document routine metadata changed outside reviewed body.' USING ERRCODE='55000';
 END IF;
END;
$replace_body$;
-- Restrictive checks remain effective if a cached/future permissive policy is
-- present. Preserve existing archive/quarantine and unrelated-bucket policies.
CREATE POLICY document_original_read_boundary ON public.documents AS RESTRICTIVE
 FOR SELECT TO anon,authenticated USING(public.can_view_document(auth.uid(),id));
CREATE POLICY student_document_original_read_boundary ON storage.objects AS RESTRICTIVE
 FOR SELECT TO anon,authenticated USING(bucket_id IS DISTINCT FROM 'student-documents' OR public.storage_can_read_student_doc(auth.uid(),name));
-- The current supported writer adds only acknowledged individual full-file
-- grants for existing student accounts. Historical limited/role grants stay
-- stored but cannot act as original-file capabilities. No blind replacement.
CREATE POLICY document_original_grant_insert_boundary ON public.document_permissions AS RESTRICTIVE
 FOR INSERT TO anon,authenticated WITH CHECK (
   role_type IS NULL AND user_id IS NOT NULL AND permission_level='view_document'
   AND granted_by=auth.uid() AND public.can_edit_student(auth.uid(),student_id)
   AND NOT public.is_partner_only(auth.uid()) AND NOT public.is_partner_only(user_id)
   AND public.can_access_student(user_id,student_id)
   AND EXISTS(SELECT 1 FROM public.documents d WHERE d.id=document_permissions.document_id AND d.student_id=document_permissions.student_id AND d.archived_at IS NULL AND d.deleted_at IS NULL)
 );
REVOKE UPDATE ON public.document_permissions FROM PUBLIC,anon,authenticated;
CREATE POLICY document_original_grant_no_replace ON public.document_permissions AS RESTRICTIVE
 FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
COMMIT;
