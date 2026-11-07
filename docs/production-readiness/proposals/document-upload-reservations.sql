-- CANONICAL REVIEW MIRROR: 20261029020600_document_upload_reservations.sql.
-- Do not execute this mirror as an additional migration. Hosted authorization is separate.
-- Foundation only. No app/storage policy integration, finalizer, expiry, cleanup,
-- deletion authority or provider IO. Apply after the six reviewed proposals.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.read_verified_document_summary_source(uuid,timestamptz,integer)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_guard_storage_binding' AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'The reviewed document safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;

CREATE TABLE public.document_upload_attempts (
  id uuid PRIMARY KEY,
  actor_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  claimed_content_sha256 text NOT NULL CHECK (claimed_content_sha256 ~ '^[0-9a-f]{64}$'),
  review_context_sha256 text NOT NULL CHECK (review_context_sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','review_required')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (storage_path=student_id::text||'/'||id::text||'-privacy-safe-document.txt'),
  UNIQUE(student_id,claimed_content_sha256)
);
COMMENT ON TABLE public.document_upload_attempts IS
  'Unresolved upload reservations only. Hashes are caller claims, not scan/byte attestations. No expiry or deletion authority. Registration and storage do not yet enforce this ledger.';
ALTER TABLE public.document_upload_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_upload_attempts FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.document_upload_attempts TO authenticated,service_role;
CREATE POLICY upload_attempt_creator_read ON public.document_upload_attempts FOR SELECT TO authenticated
  USING(actor_id=auth.uid() AND public.is_partner_only(auth.uid()) IS FALSE
    AND public.can_edit_student(auth.uid(),student_id) IS TRUE);
-- Trusted maintenance may inspect but gets no ordinary mutation path here.
CREATE POLICY upload_attempt_service_read ON public.document_upload_attempts FOR SELECT TO service_role USING(true);

CREATE FUNCTION public.reserve_document_upload(_attempt_id uuid,_student_id uuid,
  _claimed_content_sha256 text,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $reserve$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  IF actor IS NULL OR _attempt_id IS NULL OR _student_id IS NULL
    OR _claimed_content_sha256 IS NULL OR _claimed_content_sha256 !~ '^[0-9a-f]{64}$'
    OR _review_context_sha256 IS NULL OR _review_context_sha256 !~ '^[0-9a-f]{64}$'
    OR public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,_student_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
  END IF;
  BEGIN
    INSERT INTO public.document_upload_attempts(id,actor_id,student_id,claimed_content_sha256,review_context_sha256,storage_path)
      VALUES(_attempt_id,actor,_student_id,_claimed_content_sha256,_review_context_sha256,
        _student_id::text||'/'||_attempt_id::text||'-privacy-safe-document.txt') ON CONFLICT(id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN
    -- Do not disclose another actor's ID, path or an existing file's contents.
    RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
  END;
  SELECT * INTO attempt FROM public.document_upload_attempts WHERE id=_attempt_id FOR UPDATE;
  IF NOT FOUND OR attempt.actor_id IS DISTINCT FROM actor OR attempt.student_id IS DISTINCT FROM _student_id
    OR attempt.claimed_content_sha256 IS DISTINCT FROM _claimed_content_sha256
    OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256 OR attempt.state<>'reserved' THEN
    RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN jsonb_build_object('schema','document-upload-reservation-v1','attempt_id',attempt.id,
    'student_id',attempt.student_id,'actor_id',attempt.actor_id,'storage_path',attempt.storage_path,'state',attempt.state);
END;
$reserve$;
REVOKE ALL ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) TO authenticated;
COMMIT;
