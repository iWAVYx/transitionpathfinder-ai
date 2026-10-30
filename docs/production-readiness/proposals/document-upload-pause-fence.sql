-- REVIEW PROPOSAL ONLY; not canonical or authorized for hosted execution.
-- After canonical225 and operation admission. Database transaction pause fence
-- only: no browser-interval receipt, provider drain/byte proof or cleanup power.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $upload_gate_prerequisite$
DECLARE paused_state boolean; signature text;
BEGIN
 IF
 NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.reserve_document_upload(uuid,uuid,text,text)') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='fb28e730f71b0b5465cc0f124d415b25')
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.can_insert_reserved_student_document(text,text)') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='ab7f2148cd25eb5e19ed07771c72bc80')
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.guard_document_upload_registration()') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='abed3995d4c5ff0607771d1c2b475367')
 OR to_regprocedure('public.set_document_operation_pause(uuid,bigint,boolean,text)') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass('public.document_operation_control') AND relrowsecurity) THEN
  RAISE EXCEPTION 'Reviewed upload and admission prerequisites are required.' USING ERRCODE='55000';
 END IF;
 FOREACH signature IN ARRAY ARRAY['public.reserve_document_upload(uuid,uuid,text,text)',
   'public.can_insert_reserved_student_document(text,text)'] LOOP
  IF has_function_privilege('anon',signature,'EXECUTE') OR has_function_privilege('service_role',signature,'EXECUTE')
   OR NOT has_function_privilege('authenticated',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Reviewed upload permissions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 IF has_function_privilege('anon','public.guard_document_upload_registration()','EXECUTE')
  OR has_function_privilege('authenticated','public.guard_document_upload_registration()','EXECUTE')
  OR has_function_privilege('service_role','public.guard_document_upload_registration()','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed registration permissions are required.' USING ERRCODE='55000';
 END IF;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true
  OR EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_upload_attempts WHERE state IN ('reserved','review_required'))
  OR EXISTS(SELECT 1 FROM public.documents WHERE scan_status='pending')
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status IN ('queued','processing','needs_review')) THEN
  RAISE EXCEPTION 'Upload work must be paused and separately reconciled before this installation.' USING ERRCODE='55000';
 END IF;
END; $upload_gate_prerequisite$;
CREATE FUNCTION public.lock_document_upload_admission()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $upload_gate$
DECLARE paused_state boolean;
BEGIN
 IF auth.uid() IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'This upload cannot continue while its access is being checked.' USING ERRCODE='42501';
 END IF;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Uploads are paused for review. Please check again later.' USING ERRCODE='55000';
 END IF;
END; $upload_gate$;
REVOKE ALL ON FUNCTION public.lock_document_upload_admission() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lock_document_upload_admission() TO authenticated;
CREATE OR REPLACE FUNCTION public.reserve_document_upload(_attempt_id uuid,_student_id uuid,
  _claimed_content_sha256 text,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $reserve$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
      PERFORM public.lock_document_upload_admission();
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

CREATE OR REPLACE FUNCTION public.can_insert_reserved_student_document(_path text,_owner text)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $insert_guard$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  PERFORM public.lock_document_upload_admission();
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

CREATE OR REPLACE FUNCTION public.guard_document_upload_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $guard$
DECLARE attempt public.document_upload_attempts%ROWTYPE;
BEGIN
  IF TG_OP='INSERT' THEN PERFORM public.lock_document_upload_admission(); END IF;
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
-- Retain every existing grant and all original private scope/capacity checks.
REVOKE ALL ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text),public.can_insert_reserved_student_document(text,text),public.guard_document_upload_registration() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text),public.can_insert_reserved_student_document(text,text) TO authenticated;
COMMENT ON FUNCTION public.lock_document_upload_admission() IS
 'Prepared transaction pause fence for reservation, client Storage INSERT and document INSERT. No student access grant, interval completion, expiry, provider stop/byte proof or cleanup authority.';
COMMIT;
