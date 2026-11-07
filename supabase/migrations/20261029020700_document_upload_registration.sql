-- Prepared canonical upload/summary boundary; hosted execution requires separate authorization.
-- Review mirror: docs/production-readiness/proposals/document-upload-registration.sql; execute only this canonical file.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF to_regclass('public.document_upload_attempts') IS NULL
    OR to_regprocedure('public.reserve_document_upload(uuid,uuid,text,text)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('public.document_upload_attempts') AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_guard_storage_binding' AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'The reviewed upload reservation safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;

-- Preserve old rows as unlinked; never invent historical reservations.
ALTER TABLE public.documents ADD COLUMN upload_attempt_id uuid UNIQUE REFERENCES public.document_upload_attempts(id) ON DELETE RESTRICT;
ALTER TABLE public.documents ADD COLUMN upload_review_context_sha256 text;
ALTER TABLE public.documents ADD CONSTRAINT documents_upload_review_binding_check CHECK (
  (upload_attempt_id IS NULL AND upload_review_context_sha256 IS NULL)
  OR (upload_attempt_id IS NOT NULL AND upload_review_context_sha256 ~ '^[0-9a-f]{64}$' AND upload_review_context_sha256 IS NOT NULL));
ALTER TABLE public.document_upload_attempts ADD COLUMN registered_document_id uuid UNIQUE REFERENCES public.documents(id) ON DELETE RESTRICT;
ALTER TABLE public.document_upload_attempts DROP CONSTRAINT document_upload_attempts_state_check;
ALTER TABLE public.document_upload_attempts ADD CONSTRAINT document_upload_attempts_state_check CHECK(state IN ('reserved','review_required','registered'));
ALTER TABLE public.document_upload_attempts ADD CONSTRAINT document_upload_attempts_registration_check CHECK ((state='registered')=(registered_document_id IS NOT NULL));
COMMENT ON TABLE public.document_upload_attempts IS
  'Reserved/review/registered upload intents. Claimed hashes are not byte or consent attestations. Registered rows bind atomically to one document. No expiry, release, cleanup authority or Storage INSERT enforcement.';

CREATE FUNCTION public.guard_document_upload_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $guard$
DECLARE attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.upload_attempt_id IS DISTINCT FROM OLD.upload_attempt_id
      OR NEW.upload_review_context_sha256 IS DISTINCT FROM OLD.upload_review_context_sha256 THEN
      RAISE EXCEPTION 'A saved document cannot be reassigned to another upload attempt.' USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.upload_attempt_id IS NULL OR auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.uploaded_by
    OR public.is_partner_only(NEW.uploaded_by) IS DISTINCT FROM false
    OR public.can_edit_student(NEW.uploaded_by,NEW.student_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This document registration could not be confirmed.' USING ERRCODE='42501';
  END IF;
  -- Lock the attempt before any object-metadata lock taken by later triggers.
  SELECT * INTO attempt FROM public.document_upload_attempts WHERE id=NEW.upload_attempt_id FOR UPDATE;
  IF NOT FOUND OR attempt.state<>'reserved' OR attempt.registered_document_id IS NOT NULL
    OR attempt.actor_id IS DISTINCT FROM NEW.uploaded_by OR attempt.student_id IS DISTINCT FROM NEW.student_id
    OR attempt.storage_path IS DISTINCT FROM NEW.storage_path
    OR attempt.claimed_content_sha256 IS DISTINCT FROM NEW.content_hash
    OR attempt.review_context_sha256 IS DISTINCT FROM NEW.upload_review_context_sha256 THEN
    RAISE EXCEPTION 'This document registration could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$guard$;
CREATE FUNCTION public.link_document_upload_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $link$
DECLARE changed integer;
BEGIN
  -- Runs only after the actual INSERT, all BEFORE guards and ordinary row RLS.
  UPDATE public.document_upload_attempts SET state='registered',registered_document_id=NEW.id
    WHERE id=NEW.upload_attempt_id AND state='reserved' AND registered_document_id IS NULL
      AND actor_id=NEW.uploaded_by AND student_id=NEW.student_id AND storage_path=NEW.storage_path
      AND claimed_content_sha256=NEW.content_hash AND review_context_sha256=NEW.upload_review_context_sha256;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN
    RAISE EXCEPTION 'This document registration could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$link$;
REVOKE ALL ON FUNCTION public.guard_document_upload_registration() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.link_document_upload_registration() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER documents_aa_guard_upload_registration BEFORE INSERT OR UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_upload_registration();
CREATE TRIGGER documents_link_upload_registration AFTER INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.link_document_upload_registration();

CREATE FUNCTION public.read_document_upload_registration(_attempt_id uuid,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $receipt$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE; doc public.documents%ROWTYPE;
BEGIN
  SELECT * INTO attempt FROM public.document_upload_attempts WHERE id=_attempt_id FOR SHARE;
  IF actor IS NULL OR NOT FOUND OR attempt.actor_id IS DISTINCT FROM actor OR attempt.state<>'registered'
    OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256
    OR public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,attempt.student_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This document registration could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO doc FROM public.documents WHERE id=attempt.registered_document_id
    AND upload_attempt_id=attempt.id AND uploaded_by=actor AND student_id=attempt.student_id
    AND storage_path=attempt.storage_path AND content_hash=attempt.claimed_content_sha256
    AND upload_review_context_sha256=attempt.review_context_sha256 FOR SHARE;
  IF NOT FOUND OR public.can_view_document(actor,doc.id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This document registration could not be confirmed.' USING ERRCODE='42501';
  END IF;
  -- Registration receipt only: it does not claim clean bytes or completed AI.
  RETURN jsonb_build_object('schema','document-upload-registration-v1','attempt_id',attempt.id,'document_id',doc.id,
    'actor_id',actor,'student_id',doc.student_id,'storage_path',doc.storage_path,
    'scan_status',doc.scan_status,'review_status',doc.review_status,'archived_at',doc.archived_at,'deleted_at',doc.deleted_at);
END;
$receipt$;
REVOKE ALL ON FUNCTION public.read_document_upload_registration(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_document_upload_registration(uuid,text) TO authenticated;
COMMIT;
