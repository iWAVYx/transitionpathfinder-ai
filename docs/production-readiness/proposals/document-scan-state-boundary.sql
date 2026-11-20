-- CANONICAL REVIEW MIRROR: 20261029020100_document_scan_state_boundary.sql.
-- Do not execute this mirror as an additional migration. Hosted authorization is separate.
-- Apply after document-path-exclusivity.sql. Does not prove object ownership,
-- immutable stored bytes, provider provenance or retrospective legacy safety.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;

DO $scan_prerequisite$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_index
    WHERE indexrelid=pg_catalog.to_regclass('public.documents_storage_path_unique')
      AND indrelid='public.documents'::regclass AND indisunique AND indisvalid
      AND indpred IS NOT NULL
      AND indkey::text=(SELECT attnum::text FROM pg_catalog.pg_attribute
        WHERE attrelid='public.documents'::regclass AND attname='storage_path')
  ) THEN
    RAISE EXCEPTION 'The reviewed document path boundary is required first.' USING ERRCODE='55000';
  END IF;
END;
$scan_prerequisite$;

CREATE FUNCTION public.guard_document_scan_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path=pg_catalog
AS $document_scan_state$
BEGIN
  IF TG_OP='UPDATE' THEN
    -- An uploader is an identity, not editable document metadata.
    IF NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by THEN
      RAISE EXCEPTION 'The document uploader cannot be reassigned.' USING ERRCODE='42501';
    END IF;
  END IF;

  -- Trust the database execution role, never a client-supplied JWT role claim
  -- or custom setting. Existing trusted backend calls use the service role.
  IF current_user IN ('anon','authenticated') THEN
    IF TG_OP='INSERT' THEN
      IF auth.uid() IS NULL OR NEW.uploaded_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'The document must identify its authenticated uploader.' USING ERRCODE='42501';
      END IF;
      IF NEW.scan_status IS DISTINCT FROM 'pending' OR NEW.scan_verdict IS NOT NULL
         OR NEW.scan_data_id IS NOT NULL OR NEW.scanned_at IS NOT NULL
         OR NEW.review_status IS DISTINCT FROM 'pending_review' THEN
        RAISE EXCEPTION 'New uploads must wait for a security review.' USING ERRCODE='42501';
      END IF;
    ELSE
      IF NEW.scan_status IS DISTINCT FROM OLD.scan_status
         OR NEW.scan_verdict IS DISTINCT FROM OLD.scan_verdict
         OR NEW.scan_data_id IS DISTINCT FROM OLD.scan_data_id
         OR NEW.scanned_at IS DISTINCT FROM OLD.scanned_at
         OR NEW.review_status IS DISTINCT FROM OLD.review_status
         OR NEW.content_hash IS DISTINCT FROM OLD.content_hash THEN
        RAISE EXCEPTION 'Security review results are managed by trusted processing.' USING ERRCODE='42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$document_scan_state$;

REVOKE ALL ON FUNCTION public.guard_document_scan_state()
  FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER documents_guard_scan_state
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_scan_state();
COMMIT;
