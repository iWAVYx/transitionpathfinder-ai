-- REVIEW PROPOSAL ONLY. Not canonical or authorized for hosted execution.
-- Apply after all eight reviewed upload proposals. Restricts new authenticated
-- Storage reads/signing for infected/retired files, including uploader/admin
-- exceptions and hidden document rows. It grants no new read/delete authority.
-- Does not revoke previously minted signed URLs, purge bytes, or constrain
-- trusted service-role reads. Those remain separate rollout/operations gates.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
    WHERE oid='storage.objects'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index
      WHERE indexrelid=pg_catalog.to_regclass('public.documents_storage_path_unique')
        AND indrelid='public.documents'::regclass AND indisunique AND indisvalid)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger
      WHERE tgrelid='public.documents'::regclass AND tgname='documents_guard_scan_state'
        AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Reviewed document path, scan-state and Storage row-security boundaries are required.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;

-- Denial-only predicate. A definer must see blocked references even when the
-- caller cannot read their archived document metadata. Baseline permissive
-- policies still decide all other read access. No row identifiers are returned.
CREATE FUNCTION public.student_document_not_blocked(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $predicate$
  SELECT auth.uid() IS NOT NULL AND _path IS NOT NULL AND _path<>'' AND NOT EXISTS (
    SELECT 1 FROM public.documents AS d WHERE d.storage_path=_path AND (
      d.scan_status IN ('infected','deleted') OR d.scan_verdict->>'code'='infected'
    )
  );
$predicate$;
REVOKE ALL ON FUNCTION public.student_document_not_blocked(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.student_document_not_blocked(text) TO anon,authenticated;
CREATE POLICY student_document_no_blocked_read ON storage.objects
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (bucket_id IS DISTINCT FROM 'student-documents' OR public.student_document_not_blocked(name));
COMMIT;
