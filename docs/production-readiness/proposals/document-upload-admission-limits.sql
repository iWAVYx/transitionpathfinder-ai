-- CANONICAL REVIEW MIRROR: 20261029021000_document_upload_admission_limits.sql.
-- Do not execute this mirror as an additional migration. Hosted authorization is separate.
-- Apply after all ten preceding document proposals. Prototype admission caps:
-- five unresolved claims per actor, ten per student, including review holds.
-- No release, expiry, deletion, byte/rate/spending quota or new access rights.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$
BEGIN
  IF to_regprocedure('public.hold_document_upload_for_review(uuid,text,text)') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy
      WHERE polrelid='storage.objects'::regclass AND polname='student_document_reserved_insert'
        AND polcmd='a' AND NOT polpermissive) THEN
    RAISE EXCEPTION 'The reviewed upload safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;
CREATE INDEX document_upload_unresolved_actor ON public.document_upload_attempts(actor_id)
  WHERE state IN ('reserved','review_required');
CREATE INDEX document_upload_unresolved_student ON public.document_upload_attempts(student_id)
  WHERE state IN ('reserved','review_required');
CREATE OR REPLACE FUNCTION public.reserve_document_upload(_attempt_id uuid,_student_id uuid,
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
  -- One transaction-scoped admission lock serializes all new claims. A fresh
  -- READ COMMITTED command snapshot after waiting must see earlier admissions.
  -- Reject stronger/stale transaction snapshots rather than oversubscribe.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(824601,11);
  IF public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,_student_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO attempt FROM public.document_upload_attempts WHERE id=_attempt_id FOR UPDATE;
  IF FOUND THEN
    -- An exact retry does not add a claim and remains valid even at/over cap.
    IF attempt.actor_id IS DISTINCT FROM actor OR attempt.student_id IS DISTINCT FROM _student_id
      OR attempt.claimed_content_sha256 IS DISTINCT FROM _claimed_content_sha256
      OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256
      OR attempt.state <> 'reserved' OR attempt.registered_document_id IS NOT NULL
      OR attempt.held_at IS NOT NULL OR attempt.hold_reason IS NOT NULL THEN
      RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
    END IF;
  ELSE
    IF (SELECT count(*) FROM (SELECT 1 FROM public.document_upload_attempts
          WHERE actor_id=actor AND state IN ('reserved','review_required') LIMIT 5) active_actor) >= 5
      OR (SELECT count(*) FROM (SELECT 1 FROM public.document_upload_attempts
          WHERE student_id=_student_id AND state IN ('reserved','review_required') LIMIT 10) active_student) >= 10 THEN
      -- Same refusal for quota, foreign identity and competing content claims.
      -- Do not expose another actor's unresolved upload count or identifiers.
      RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
    END IF;
    BEGIN
      INSERT INTO public.document_upload_attempts(id,actor_id,student_id,claimed_content_sha256,review_context_sha256,storage_path)
        VALUES(_attempt_id,actor,_student_id,_claimed_content_sha256,_review_context_sha256,
          _student_id::text||'/'||_attempt_id::text||'-privacy-safe-document.txt') RETURNING * INTO attempt;
    EXCEPTION WHEN unique_violation THEN
      RAISE EXCEPTION 'This upload attempt could not be confirmed.' USING ERRCODE='42501';
    END;
  END IF;
  RETURN jsonb_build_object('schema','document-upload-reservation-v1','attempt_id',attempt.id,
    'student_id',attempt.student_id,'actor_id',attempt.actor_id,'storage_path',attempt.storage_path,'state',attempt.state);
END;
$reserve$;
REVOKE ALL ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) TO authenticated;
COMMENT ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text) IS
  'Draft unresolved admission v1: actor 5 / student 10; reserved and review_required count; registered excluded; exact reserved retries allowed; READ COMMITTED only. Global transaction admission lock 824601/11. No cleanup or byte attestation.';
COMMIT;
