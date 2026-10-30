-- REVIEW PROPOSAL ONLY; fifth noncanonical/unapplied control proposal.
-- After canonical225 and all four reviewed upload/admission proposals.
-- Preserve existing five-per-actor / ten-per-student limits across registered
-- but unsettled intervals. No new API/grant, expiry, release or cleanup power.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $retained_quota_preflight$
DECLARE expected record; signature text; role_name text; relation_name text; action text; paused_state boolean;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
   ('public.lock_document_upload_interval_control()','38603745b263fde8b7d35473dc43c682'),
   ('public.assert_document_upload_interval(uuid,text)','5e323dc02b8883f9b88642b0e999b69d'),
   ('public.assert_document_upload_registered_outcome(uuid)','caa29a430e3b266bf41bc4d701de8dd0'),
   ('public.bind_document_upload_operation()','3c523e43d31e411968ea0c768fd33222'),
   ('public.guard_document_upload_operation_binding()','9633c665d11d0c4d1fae2478d3c34dc5'),
   ('public.guard_document_upload_interval_attempt()','3563a08fd8a10e553ca93232292d4119'),
   ('public.guard_document_upload_interval_completion()','a76a313e56cc031f99201be9dc515e87'),
   ('public.claim_document_upload_registration_operation(uuid,uuid,text)','5e71996316ae4c2dfb63b412eaf85a69'),
   ('public.reserve_document_upload(uuid,uuid,text,text)','7521db3914d60d480c48cee8874f7b82'),
   ('public.can_insert_reserved_student_document(text,text)','206a8202fe3d2fbe29b2811d43e991f7'),
   ('public.guard_document_upload_registration()','ec1020d6a943332c2fb1716e4512adbc'),
   ('public.read_document_upload_registration(uuid,text)','8bed2c13998cb9749d5a793d14cec62a'),
   ('public.begin_document_operation(uuid,uuid,text)','4ff01874b39fa3e46c24a6bf3d8149fc'),
   ('public.finish_document_operation(uuid,uuid,uuid,text)','b7d311f760d66a7b9c8f6244c1441caa')) AS signatures(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(expected.signature)
   AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)=expected.body_md5) THEN
   RAISE EXCEPTION 'Reviewed upload interval definitions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY['public.reserve_document_upload(uuid,uuid,text,text)','public.can_insert_reserved_student_document(text,text)',
  'public.read_document_upload_registration(uuid,text)'] LOOP
  IF NOT has_function_privilege('authenticated',signature,'EXECUTE') OR has_function_privilege('anon',signature,'EXECUTE')
   OR has_function_privilege('service_role',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Reviewed upload permissions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY['public.begin_document_operation(uuid,uuid,text)','public.finish_document_operation(uuid,uuid,uuid,text)',
  'public.claim_document_upload_registration_operation(uuid,uuid,text)'] LOOP
  IF NOT has_function_privilege('service_role',signature,'EXECUTE') OR has_function_privilege('anon',signature,'EXECUTE')
   OR has_function_privilege('authenticated',signature,'EXECUTE') THEN
   RAISE EXCEPTION 'Reviewed private operation permissions are required.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 FOREACH signature IN ARRAY ARRAY['public.lock_document_upload_interval_control()','public.assert_document_upload_interval(uuid,text)',
  'public.assert_document_upload_registered_outcome(uuid)','public.bind_document_upload_operation()',
  'public.guard_document_upload_operation_binding()','public.guard_document_upload_interval_attempt()',
  'public.guard_document_upload_interval_completion()','public.guard_document_upload_registration()'] LOOP
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Reviewed internal operation permissions are required.' USING ERRCODE='55000';
   END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_upload_operation_bindings','public.document_operation_leases','public.document_operation_control'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity) THEN
   RAISE EXCEPTION 'Reviewed private tracking tables are required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   FOREACH action IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF has_any_column_privilege(role_name,relation_name,action) THEN
     RAISE EXCEPTION 'Reviewed private tracking column permissions are required.' USING ERRCODE='55000';
    END IF;
   END LOOP;
   FOREACH action IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
    IF has_table_privilege(role_name,relation_name,action) THEN
     RAISE EXCEPTION 'Reviewed private tracking permissions are required.' USING ERRCODE='55000';
    END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 -- Same control-before-attempt order as the preceding proposal and writers.
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Upload tracking must be reviewed while paused.' USING ERRCODE='55000';
 END IF;
 LOCK TABLE public.document_upload_attempts IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_upload_attempts)
  OR EXISTS(SELECT 1 FROM public.documents WHERE scan_status='pending')
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status IN ('queued','processing','needs_review')) THEN
  RAISE EXCEPTION 'Existing upload work requires separate review before installation.' USING ERRCODE='55000';
 END IF;
END; $retained_quota_preflight$;

CREATE OR REPLACE FUNCTION public.reserve_document_upload(_attempt_id uuid,_student_id uuid,
  _claimed_content_sha256 text,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $reserve$
DECLARE actor uuid:=auth.uid(); attempt public.document_upload_attempts%ROWTYPE;
BEGIN
      PERFORM public.lock_document_upload_interval_control();
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
    PERFORM public.assert_document_upload_interval(attempt.id,'reserved');
  ELSE
    -- Registration is a transition, not completion. Count every reserved/held
    -- attempt plus registered work without its exact completed private binding.
    -- Missing/mismatched proof stays counted; timestamps never free capacity.
    IF (SELECT count(*) FROM (SELECT 1 FROM public.document_upload_attempts a
          WHERE a.actor_id=actor AND (a.state IN ('reserved','review_required') OR (a.state='registered' AND NOT EXISTS(
            SELECT 1 FROM public.document_upload_operation_bindings b
             JOIN public.document_operation_leases l ON l.operation_id=b.operation_id
            WHERE b.attempt_id=a.id AND b.actor_id=a.actor_id AND b.student_id=a.student_id
             AND b.storage_path=a.storage_path AND b.content_sha256=a.claimed_content_sha256
             AND b.review_context_sha256=a.review_context_sha256 AND b.registration_claimed_at IS NOT NULL
             AND l.actor_id=a.actor_id AND l.operation_kind='register' AND l.state='completed'))) LIMIT 5) active_actor) >= 5
      OR (SELECT count(*) FROM (SELECT 1 FROM public.document_upload_attempts a
          WHERE a.student_id=_student_id AND (a.state IN ('reserved','review_required') OR (a.state='registered' AND NOT EXISTS(
            SELECT 1 FROM public.document_upload_operation_bindings b
             JOIN public.document_operation_leases l ON l.operation_id=b.operation_id
            WHERE b.attempt_id=a.id AND b.actor_id=a.actor_id AND b.student_id=a.student_id
             AND b.storage_path=a.storage_path AND b.content_sha256=a.claimed_content_sha256
             AND b.review_context_sha256=a.review_context_sha256 AND b.registration_claimed_at IS NOT NULL
             AND l.actor_id=a.actor_id AND l.operation_kind='register' AND l.state='completed'))) LIMIT 10) active_student) >= 10 THEN
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

COMMIT;
