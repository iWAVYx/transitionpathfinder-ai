-- REVIEW PROPOSAL ONLY. Not canonical or authorized for hosted execution.
-- Apply after the nine reviewed upload proposals. Adds an actor-requested,
-- non-expiring review hold and reservation-gated client Storage INSERT.
-- No application caller, terminal release, quota, expiry, cleanup, byte IO,
-- deletion authority or provider operation is introduced.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.document_upload_attempts IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF to_regprocedure('public.read_document_upload_registration(uuid,text)') IS NULL
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_aa_guard_upload_registration' AND tgenabled='O' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid='storage.objects'::regclass
      AND polname='student_document_no_blocked_read' AND polcmd='r' AND NOT polpermissive)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='storage.objects'::regclass AND relrowsecurity) THEN
    RAISE EXCEPTION 'The reviewed registration and quarantine boundaries are required first.' USING ERRCODE='55000';
  END IF;
  -- Never invent a reason or timestamp for an old ambiguous hold.
  IF EXISTS (SELECT 1 FROM public.document_upload_attempts WHERE state='review_required') THEN
    RAISE EXCEPTION 'Existing upload holds require separate review before this proposal.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;
ALTER TABLE public.document_upload_attempts ADD COLUMN held_at timestamptz;
ALTER TABLE public.document_upload_attempts ADD COLUMN hold_reason text;
ALTER TABLE public.document_upload_attempts ADD CONSTRAINT document_upload_attempts_hold_check CHECK (
  (state='review_required' AND held_at IS NOT NULL AND hold_reason IS NOT NULL
    AND hold_reason IN ('upload_uncertain','registration_uncertain','user_cancelled'))
  OR (state<>'review_required' AND held_at IS NULL AND hold_reason IS NULL));

CREATE FUNCTION public.hold_document_upload_for_review(_attempt_id uuid,_review_context_sha256 text,_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $hold$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  IF actor IS NULL OR _attempt_id IS NULL OR _review_context_sha256 IS NULL
    OR _review_context_sha256 !~ '^[0-9a-f]{64}$' OR _reason IS NULL
    OR _reason NOT IN ('upload_uncertain','registration_uncertain','user_cancelled')
    OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'This upload review hold could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO attempt FROM public.document_upload_attempts
    WHERE id=_attempt_id AND actor_id=actor FOR UPDATE;
  IF NOT FOUND OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256
    OR public.can_edit_student(actor,attempt.student_id) IS DISTINCT FROM true
    OR attempt.registered_document_id IS NOT NULL OR attempt.state NOT IN ('reserved','review_required')
    OR (attempt.state='review_required' AND attempt.hold_reason IS DISTINCT FROM _reason) THEN
    RAISE EXCEPTION 'This upload review hold could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF attempt.state='reserved' THEN
    UPDATE public.document_upload_attempts SET state='review_required',held_at=now(),hold_reason=_reason
      WHERE id=attempt.id RETURNING * INTO attempt;
  END IF;
  RETURN jsonb_build_object('schema','document-upload-review-hold-v1','attempt_id',attempt.id,
    'actor_id',attempt.actor_id,'student_id',attempt.student_id,'storage_path',attempt.storage_path,
    'state',attempt.state,'held_at',attempt.held_at,'reason',attempt.hold_reason);
END;
$hold$;
REVOKE ALL ON FUNCTION public.hold_document_upload_for_review(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.hold_document_upload_for_review(uuid,text,text) TO authenticated;

-- VOLATILE because this predicate locks the exact attempt until the metadata
-- INSERT transaction ends. FOR SHARE conflicts with hold/registration UPDATE
-- locks; FOR KEY SHARE would not protect a non-key state change. It neither
-- reads nor certifies physical file bytes. No unrelated actor's row is locked.
CREATE FUNCTION public.can_insert_reserved_student_document(_path text,_owner text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $insert_guard$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  IF actor IS NULL OR _path IS NULL OR _owner IS DISTINCT FROM actor::text
    OR public.is_partner_only(actor) IS DISTINCT FROM false THEN RETURN false; END IF;
  SELECT * INTO attempt FROM public.document_upload_attempts
    WHERE storage_path=_path AND actor_id=actor FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN attempt.state='reserved' AND attempt.registered_document_id IS NULL
    AND attempt.held_at IS NULL AND attempt.hold_reason IS NULL
    AND public.can_edit_student(actor,attempt.student_id) IS TRUE;
END;
$insert_guard$;
REVOKE ALL ON FUNCTION public.can_insert_reserved_student_document(text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_insert_reserved_student_document(text,text) TO authenticated;
CREATE POLICY student_document_reserved_insert ON storage.objects
  AS RESTRICTIVE FOR INSERT TO anon,authenticated
  WITH CHECK (CASE
    WHEN bucket_id IS DISTINCT FROM 'student-documents' THEN true
    WHEN CURRENT_USER='authenticated' THEN public.can_insert_reserved_student_document(name,owner_id::text)
    ELSE false END);
COMMENT ON TABLE public.document_upload_attempts IS
  'Reserved/review/registered intents with actor-requested non-expiring holds. Client Storage metadata INSERT requires a reserved exact actor/path. No byte attestation, terminal release, expiry, quota, cleanup or deletion authority.';
COMMIT;
