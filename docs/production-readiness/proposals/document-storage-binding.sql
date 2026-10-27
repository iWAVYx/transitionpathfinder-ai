-- REVIEW PROPOSAL ONLY. Not canonical or authorized for hosted execution.
-- Apply after the path, scan-state and storage client-write proposals.
-- Binds new document rows to exact managed object identity/version and uploader.
-- Not an immutable object store, byte hash attestation, scan receipt or cleanup lock.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;

DO $binding_preflight$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index
    WHERE indexrelid=pg_catalog.to_regclass('public.documents_storage_path_unique')
      AND indrelid='public.documents'::regclass AND indisunique AND indisvalid)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_guard_scan_state' AND tgenabled='O' AND NOT tgisinternal)
    OR (SELECT count(*) FROM pg_catalog.pg_policy WHERE polrelid='storage.objects'::regclass
      AND polname IN ('student_document_no_client_replace','student_document_no_client_delete')
      AND NOT polpermissive)<>2 THEN
    RAISE EXCEPTION 'The reviewed upload safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$binding_preflight$;

-- Existing rows remain unbound; do not invent historical object provenance.
ALTER TABLE public.documents ADD COLUMN storage_object_id uuid;
ALTER TABLE public.documents ADD COLUMN storage_object_version text;

CREATE FUNCTION public.guard_document_storage_binding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog
AS $storage_binding$
DECLARE
  object_id uuid;
  object_owner text;
  object_version text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.storage_object_id IS DISTINCT FROM OLD.storage_object_id
      OR NEW.storage_object_version IS DISTINCT FROM OLD.storage_object_version THEN
      RAISE EXCEPTION 'A saved document cannot be reassigned to another uploaded copy.' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Recheck the claimed uploader's current explicit access before the privileged
  -- storage lookup, including trusted INSERTs. Existing RLS/scan guard additionally
  -- authenticates the caller identity; this function does not grant student access.
  IF NEW.uploaded_by IS NULL
    OR public.can_edit_student(NEW.uploaded_by,NEW.student_id) IS DISTINCT FROM true
    OR public.is_partner_only(NEW.uploaded_by) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'The uploaded copy and its uploader could not be confirmed.' USING ERRCODE='42501';
  END IF;
  -- This exact lookup returns no storage row to the caller.
  -- Managed metadata must exist; never infer ownership from a filename or JWT hint.
  SELECT o.id, pg_catalog.to_jsonb(o)->>'owner_id', pg_catalog.to_jsonb(o)->>'version'
    INTO object_id,object_owner,object_version
    FROM storage.objects o
    WHERE o.bucket_id='student-documents' AND o.name=NEW.storage_path
    FOR SHARE;
  IF NOT FOUND OR NEW.uploaded_by IS NULL OR object_owner IS DISTINCT FROM NEW.uploaded_by::text
    OR object_version IS NULL OR btrim(object_version)='' OR char_length(object_version)>1024
    OR (NEW.storage_object_id IS NOT NULL AND NEW.storage_object_id IS DISTINCT FROM object_id)
    OR (NEW.storage_object_version IS NOT NULL AND NEW.storage_object_version IS DISTINCT FROM object_version) THEN
    RAISE EXCEPTION 'The uploaded copy and its uploader could not be confirmed.' USING ERRCODE='42501';
  END IF;
  NEW.storage_object_id:=object_id;
  NEW.storage_object_version:=object_version;
  RETURN NEW;
END;
$storage_binding$;

REVOKE ALL ON FUNCTION public.guard_document_storage_binding() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER documents_guard_storage_binding
  BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_storage_binding();
COMMIT;
