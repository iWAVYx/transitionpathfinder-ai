-- REVIEW PROPOSAL ONLY. Apply after all twelve preceding upload proposals.
-- Pins an existing original-actor review hold to one immutable operation key.
-- No file IO, provider/processing fence, terminal state, release or cleanup.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.document_upload_attempts IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF to_regprocedure('public.read_document_upload_recovery(uuid,text)') IS NULL
    OR to_regclass('public.document_upload_unresolved_actor') IS NULL
    OR to_regclass('public.document_upload_unresolved_student') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE conrelid='public.document_upload_attempts'::regclass
      AND conname='document_upload_attempts_hold_check' AND convalidated)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_aa_guard_upload_registration' AND tgenabled='O' AND NOT tgisinternal)
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid='storage.objects'::regclass
      AND polname='student_document_reserved_insert' AND polcmd='a' AND NOT polpermissive) THEN
    RAISE EXCEPTION 'The reviewed upload safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;
CREATE TABLE public.document_upload_resolution_claims (
  attempt_id uuid PRIMARY KEY REFERENCES public.document_upload_attempts(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(actor_id,operation_id)
);
ALTER TABLE public.document_upload_resolution_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_upload_resolution_claims FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.document_upload_resolution_claims TO authenticated;
CREATE POLICY upload_resolution_creator_read ON public.document_upload_resolution_claims
  FOR SELECT TO authenticated USING(actor_id=auth.uid() AND public.is_partner_only(auth.uid()) IS FALSE
    AND EXISTS(SELECT 1 FROM public.document_upload_attempts a WHERE a.id=document_upload_resolution_claims.attempt_id
      AND a.actor_id=auth.uid() AND public.can_edit_student(auth.uid(),a.student_id) IS TRUE));

CREATE FUNCTION public.reject_upload_resolution_claim_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $immutable$
BEGIN
  RAISE EXCEPTION 'This upload review claim cannot be changed or removed.' USING ERRCODE='42501';
END;
$immutable$;
CREATE TRIGGER upload_resolution_claim_immutable BEFORE UPDATE OR DELETE
  ON public.document_upload_resolution_claims FOR EACH ROW
  EXECUTE FUNCTION public.reject_upload_resolution_claim_mutation();
CREATE FUNCTION public.guard_claimed_upload_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $freeze$
BEGIN
  -- Claims do not rewrite the attempt row. A stronger transaction snapshot
  -- could miss a claim committed during a row-lock wait; refuse such writes.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'This upload change could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.document_upload_resolution_claims WHERE attempt_id=OLD.id) THEN
    RAISE EXCEPTION 'This upload is held for review and cannot be changed or removed.' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$freeze$;
CREATE TRIGGER upload_attempt_resolution_frozen BEFORE UPDATE OR DELETE
  ON public.document_upload_attempts FOR EACH ROW
  EXECUTE FUNCTION public.guard_claimed_upload_attempt();

CREATE FUNCTION public.claim_document_upload_resolution(_attempt_id uuid,_review_context_sha256 text,_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $claim$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
  claim public.document_upload_resolution_claims%ROWTYPE;
BEGIN
  IF actor IS NULL OR _attempt_id IS NULL OR _operation_id IS NULL OR _review_context_sha256 IS NULL
    OR _review_context_sha256 !~ '^[0-9a-f]{64}$'
    OR current_setting('transaction_isolation') <> 'read committed'
    OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'This upload review claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
  -- Lock order: exact original-actor attempt, then claim. Admission capacity is
  -- unchanged; no global admission lock or file/metadata read is needed here.
  SELECT * INTO attempt FROM public.document_upload_attempts
    WHERE id=_attempt_id AND actor_id=actor FOR UPDATE;
  IF NOT FOUND OR attempt.review_context_sha256 IS DISTINCT FROM _review_context_sha256
    OR attempt.state<>'review_required' OR attempt.registered_document_id IS NOT NULL
    OR attempt.held_at IS NULL OR attempt.hold_reason IS NULL
    OR public.is_partner_only(actor) IS DISTINCT FROM false
    OR public.can_edit_student(actor,attempt.student_id) IS DISTINCT FROM true
    OR EXISTS(SELECT 1 FROM public.documents WHERE storage_path=attempt.storage_path) THEN
    RAISE EXCEPTION 'This upload review claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO claim FROM public.document_upload_resolution_claims WHERE attempt_id=attempt.id FOR SHARE;
  IF FOUND THEN
    IF claim.actor_id IS DISTINCT FROM actor OR claim.operation_id IS DISTINCT FROM _operation_id THEN
      RAISE EXCEPTION 'This upload review claim could not be confirmed.' USING ERRCODE='42501';
    END IF;
  ELSE
    BEGIN
      INSERT INTO public.document_upload_resolution_claims(attempt_id,actor_id,operation_id)
        VALUES(attempt.id,actor,_operation_id) RETURNING * INTO claim;
    EXCEPTION WHEN unique_violation THEN
      -- Operation keys are actor-scoped and cannot be reassigned to another
      -- attempt. Do not disclose the other attempt or operation receipt.
      RAISE EXCEPTION 'This upload review claim could not be confirmed.' USING ERRCODE='42501';
    END;
  END IF;
  RETURN jsonb_build_object('schema','document-upload-resolution-claim-v1','attempt_id',attempt.id,
    'actor_id',actor,'student_id',attempt.student_id,'storage_path',attempt.storage_path,
    'state','review_required','operation_id',claim.operation_id,'claimed_at',claim.claimed_at,
    'held_at',attempt.held_at,'reason',attempt.hold_reason);
END;
$claim$;
REVOKE ALL ON FUNCTION public.reject_upload_resolution_claim_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_claimed_upload_attempt() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.claim_document_upload_resolution(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_document_upload_resolution(uuid,text,uuid) TO authenticated;
COMMENT ON TABLE public.document_upload_resolution_claims IS
  'Immutable original-actor review operation only. Pins held attempt identity/state without freeing quota. No takeover, expiry, release, metadata/byte attestation, processing fence or deletion authority.';
COMMIT;
