-- REVIEW PROPOSAL ONLY. Apply after all eleven preceding upload proposals.
-- Read-only recovery observations for the original actor and review intent.
-- No file reads, registration, hold release, retry, expiry or cleanup authority.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.read_document_upload_registration(uuid,text)') IS NULL
    OR to_regprocedure('public.hold_document_upload_for_review(uuid,text,text)') IS NULL
    OR to_regclass('public.document_upload_unresolved_actor') IS NULL
    OR to_regclass('public.document_upload_unresolved_student') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid='storage.objects'::regclass
      AND polname='student_document_reserved_insert' AND polcmd='a' AND NOT polpermissive) THEN
    RAISE EXCEPTION 'The reviewed upload safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;
CREATE FUNCTION public.read_document_upload_recovery(_attempt_id uuid,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $recovery$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
  object_id uuid; object_owner text; object_version text; registration jsonb;
BEGIN
  IF actor IS NULL OR _attempt_id IS NULL OR _review_context_sha256 IS NULL
    OR _review_context_sha256 !~ '^[0-9a-f]{64}$'
    OR current_setting('transaction_isolation') <> 'read committed'
    OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'This upload recovery could not be confirmed.' USING ERRCODE='42501';
  END IF;
  -- Same lock order as registration/hold: attempt before exact object metadata.
  -- A foreign actor's row is neither returned nor locked by this lookup.
  SELECT * INTO attempt FROM public.document_upload_attempts
    WHERE id=_attempt_id AND actor_id=actor FOR SHARE;
  IF NOT FOUND OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256
    OR public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,attempt.student_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This upload recovery could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF attempt.state='registered' THEN
    -- Use the existing exact registration/document permission checks. This says
    -- a row saved, not that its bytes are available, clean or processed by AI.
    registration:=public.read_document_upload_registration(attempt.id,_review_context_sha256);
    RETURN jsonb_build_object('schema','document-upload-recovery-v1','attempt_id',attempt.id,
      'actor_id',actor,'student_id',attempt.student_id,'state','registered','registration',registration,
      'metadata',NULL,'observed_at',clock_timestamp());
  END IF;
  -- An active reservation must first be held through the separate guarded RPC.
  -- Never turn an observational read into a state mutation or retry capability.
  IF attempt.state<>'review_required' OR attempt.registered_document_id IS NOT NULL
    OR attempt.held_at IS NULL OR attempt.hold_reason IS NULL
    OR EXISTS(SELECT 1 FROM public.documents WHERE storage_path=attempt.storage_path) THEN
    RAISE EXCEPTION 'This upload recovery could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT o.id,pg_catalog.to_jsonb(o)->>'owner_id',pg_catalog.to_jsonb(o)->>'version'
    INTO object_id,object_owner,object_version FROM storage.objects o
    WHERE o.bucket_id='student-documents' AND o.name=attempt.storage_path FOR SHARE;
  IF FOUND THEN
    -- Legacy/missing/foreign ownership is not a recoverable owned file receipt.
    IF object_owner IS DISTINCT FROM actor::text OR object_version IS NULL
      OR btrim(object_version)='' OR char_length(object_version)>1024 THEN
      RAISE EXCEPTION 'This upload recovery could not be confirmed.' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN jsonb_build_object('schema','document-upload-recovery-v1','attempt_id',attempt.id,
    'actor_id',actor,'student_id',attempt.student_id,'state','review_required','registration',NULL,
    'held_at',attempt.held_at,'reason',attempt.hold_reason,
    'metadata',CASE WHEN object_id IS NULL THEN jsonb_build_object('status','not_observed')
      ELSE jsonb_build_object('status','observed','object_id',object_id,'version',object_version) END,
    'observed_at',clock_timestamp());
END;
$recovery$;
REVOKE ALL ON FUNCTION public.read_document_upload_recovery(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_document_upload_recovery(uuid,text) TO authenticated;
COMMENT ON FUNCTION public.read_document_upload_recovery(uuid,text) IS
  'Read-only original-actor recovery observation. Registered receipt or held metadata observation, never physical-byte/absence proof, cleanup authority or a reservation release. READ COMMITTED only.';
COMMIT;
