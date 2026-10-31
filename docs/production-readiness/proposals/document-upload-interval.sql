-- REVIEW PROPOSAL ONLY. After canonical225 and the three admission proposals.
-- Durable accounting/one-shot handoff; no hosted authorization, expiry, release,
-- provider cancellation, physical-byte attestation or registration-handler wiring.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $interval_preflight$
DECLARE paused_state boolean; signature text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.reserve_document_upload(uuid,uuid,text,text)') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='238eda86ba72f1141712dee84f553755')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.can_insert_reserved_student_document(text,text)') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='ede89febb64a8bf2fead5ef24b694fca')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.guard_document_upload_registration()') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='7458b36186c93d0c258e39434536a7a9')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.read_document_upload_registration(uuid,text)') AND prosecdef AND proowner=current_user::regrole AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='ddcc0b369370deaac4fa64959a9ef0cf')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.begin_document_operation(uuid,uuid,text)') AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='4ff01874b39fa3e46c24a6bf3d8149fc')
  OR has_function_privilege('authenticated','public.begin_document_operation(uuid,uuid,text)','EXECUTE') OR has_function_privilege('anon','public.begin_document_operation(uuid,uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.begin_document_operation(uuid,uuid,text)','EXECUTE')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.finish_document_operation(uuid,uuid,uuid,text)') AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='b7d311f760d66a7b9c8f6244c1441caa')
  OR has_function_privilege('authenticated','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE') OR has_function_privilege('anon','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed upload pause and operation safeguards are required.' USING ERRCODE='55000';
 END IF;
 FOREACH signature IN ARRAY ARRAY['public.reserve_document_upload(uuid,uuid,text,text)','public.can_insert_reserved_student_document(text,text)','public.read_document_upload_registration(uuid,text)'] LOOP
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
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Upload tracking must be installed while paused.' USING ERRCODE='55000';
 END IF;
 -- Control first, then attempt table: existing guarded writers use that order.
 LOCK TABLE public.document_upload_attempts IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_upload_attempts)
  OR EXISTS(SELECT 1 FROM public.documents WHERE scan_status='pending')
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status IN ('queued','processing','needs_review')) THEN
  RAISE EXCEPTION 'Existing upload work requires separate review; no tracking was invented.' USING ERRCODE='55000';
 END IF;
END; $interval_preflight$;
CREATE TABLE public.document_upload_operation_bindings (
 attempt_id uuid PRIMARY KEY REFERENCES public.document_upload_attempts(id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE REFERENCES public.document_operation_leases(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL, student_id uuid NOT NULL, storage_path text NOT NULL,
 content_sha256 text NOT NULL, review_context_sha256 text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 registration_claimed_at timestamptz, claimed_object_id uuid, claimed_object_version text,
 CHECK((registration_claimed_at IS NULL AND claimed_object_id IS NULL AND claimed_object_version IS NULL)
  OR (registration_claimed_at IS NOT NULL AND claimed_object_id IS NOT NULL AND claimed_object_version IS NOT NULL
   AND btrim(claimed_object_version)<>'' AND char_length(claimed_object_version)<=1024))
);
ALTER TABLE public.document_upload_operation_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_upload_operation_bindings FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.lock_document_upload_interval_control()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $interval_control$
BEGIN
 IF auth.uid() IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'This upload needs review before continuing.' USING ERRCODE='42501';
 END IF;
 PERFORM 1 FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload tracking is unavailable.' USING ERRCODE='55000'; END IF;
 -- No new reservation can pass begin_document_operation while paused. An exact
 -- already-admitted interval may drain; it remains counted until trusted finish.
END; $interval_control$;

CREATE FUNCTION public.assert_document_upload_interval(_attempt_id uuid,_phase text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $interval_scope$
DECLARE actor uuid:=auth.uid(); a public.document_upload_attempts%ROWTYPE;
 b public.document_upload_operation_bindings%ROWTYPE; l public.document_operation_leases%ROWTYPE;
BEGIN
 PERFORM public.lock_document_upload_interval_control();
 IF _phase IS NULL OR _phase NOT IN ('reserved','storage','registration') OR _attempt_id IS NULL THEN
  RAISE EXCEPTION 'This upload needs review before continuing.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=_attempt_id AND actor_id=actor FOR SHARE;
 IF NOT FOUND OR a.state<>'reserved' OR a.registered_document_id IS NOT NULL OR a.held_at IS NOT NULL OR a.hold_reason IS NOT NULL
  OR public.can_edit_student(actor,a.student_id) IS DISTINCT FROM true OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This upload needs review before continuing.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=a.id FOR SHARE;
 IF NOT FOUND OR b.actor_id IS DISTINCT FROM actor OR b.student_id IS DISTINCT FROM a.student_id
  OR b.storage_path IS DISTINCT FROM a.storage_path OR b.content_sha256 IS DISTINCT FROM a.claimed_content_sha256
  OR b.review_context_sha256 IS DISTINCT FROM a.review_context_sha256
  OR (_phase='registration' AND b.registration_claimed_at IS NULL)
  OR (_phase<>'registration' AND b.registration_claimed_at IS NOT NULL) THEN
  RAISE EXCEPTION 'This upload handoff needs review before continuing.' USING ERRCODE='55000';
 END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR l.actor_id IS DISTINCT FROM actor OR l.operation_kind<>'register' OR l.state<>'active' THEN
  RAISE EXCEPTION 'This upload handoff needs review before continuing.' USING ERRCODE='55000';
 END IF;
 IF _phase='registration' THEN
  PERFORM 1 FROM storage.objects o WHERE o.id=b.claimed_object_id AND o.bucket_id='student-documents' AND o.name=b.storage_path
   AND to_jsonb(o)->>'owner_id'=actor::text AND to_jsonb(o)->>'version'=b.claimed_object_version FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The saved upload copy needs review.' USING ERRCODE='55000'; END IF;
 END IF;
END; $interval_scope$;

CREATE FUNCTION public.assert_document_upload_registered_outcome(_attempt_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $registered_outcome$
DECLARE b public.document_upload_operation_bindings%ROWTYPE; l public.document_operation_leases%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'This saved upload needs confirmation.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=_attempt_id AND actor_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION 'This saved upload needs confirmation.' USING ERRCODE='55000'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR l.actor_id IS DISTINCT FROM b.actor_id OR l.operation_kind<>'register' OR l.state<>'completed' THEN
  RAISE EXCEPTION 'This saved upload needs confirmation.' USING ERRCODE='55000';
 END IF;
END; $registered_outcome$;

CREATE FUNCTION public.bind_document_upload_operation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $bind_interval$
DECLARE operation uuid:=gen_random_uuid(); receipt jsonb;
BEGIN
 IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid() OR NEW.state<>'reserved'
  OR NEW.registered_document_id IS NOT NULL OR NEW.held_at IS NOT NULL OR NEW.hold_reason IS NOT NULL
  OR public.can_edit_student(NEW.actor_id,NEW.student_id) IS DISTINCT FROM true OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This upload could not be tracked.' USING ERRCODE='42501';
 END IF;
 receipt:=public.begin_document_operation(operation,NEW.actor_id,'register');
 IF receipt->>'schema' IS DISTINCT FROM 'document-operation-admitted-v1' OR receipt->>'operation_id' IS DISTINCT FROM operation::text THEN
  RAISE EXCEPTION 'This upload could not be tracked.' USING ERRCODE='55000';
 END IF;
 INSERT INTO public.document_upload_operation_bindings(attempt_id,operation_id,actor_id,student_id,storage_path,content_sha256,review_context_sha256)
  VALUES(NEW.id,operation,NEW.actor_id,NEW.student_id,NEW.storage_path,NEW.claimed_content_sha256,NEW.review_context_sha256);
 RETURN NEW;
END; $bind_interval$;
CREATE TRIGGER upload_attempt_bind_operation AFTER INSERT ON public.document_upload_attempts
 FOR EACH ROW EXECUTE FUNCTION public.bind_document_upload_operation();

CREATE FUNCTION public.guard_document_upload_operation_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $binding_guard$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Upload tracking cannot be removed.' USING ERRCODE='42501'; END IF;
 IF (to_jsonb(NEW)-ARRAY['registration_claimed_at','claimed_object_id','claimed_object_version']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['registration_claimed_at','claimed_object_id','claimed_object_version'])
  OR OLD.registration_claimed_at IS NOT NULL OR NEW.registration_claimed_at IS NULL
  OR NEW.claimed_object_id IS NULL OR NEW.claimed_object_version IS NULL THEN
  RAISE EXCEPTION 'This upload handoff cannot be changed or repeated.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $binding_guard$;
CREATE TRIGGER upload_operation_binding_frozen BEFORE UPDATE OR DELETE ON public.document_upload_operation_bindings
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_upload_operation_binding();

CREATE FUNCTION public.guard_document_upload_interval_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $attempt_guard$
DECLARE b public.document_upload_operation_bindings%ROWTYPE; l public.document_operation_leases%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tracked uploads cannot be removed.' USING ERRCODE='42501'; END IF;
 IF current_setting('transaction_isolation')<>'read committed' OR
  (to_jsonb(NEW)-ARRAY['state','registered_document_id','held_at','hold_reason']) IS DISTINCT FROM
  (to_jsonb(OLD)-ARRAY['state','registered_document_id','held_at','hold_reason']) THEN
  RAISE EXCEPTION 'The tracked upload identity cannot be changed.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=OLD.id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload tracking is unavailable.' USING ERRCODE='55000'; END IF;
 IF NEW.state IS DISTINCT FROM OLD.state THEN
  SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR UPDATE;
  IF NOT FOUND OR l.actor_id IS DISTINCT FROM OLD.actor_id OR l.operation_kind<>'register' THEN
   RAISE EXCEPTION 'Upload tracking is unavailable.' USING ERRCODE='55000';
  END IF;
  IF OLD.state<>'reserved' OR NEW.state NOT IN ('registered','review_required') THEN
   RAISE EXCEPTION 'This upload cannot be reopened or reassigned.' USING ERRCODE='42501';
  END IF;
  IF NEW.state='registered' THEN
   IF b.registration_claimed_at IS NULL OR l.state<>'active' THEN
    RAISE EXCEPTION 'The upload handoff could not be confirmed.' USING ERRCODE='55000';
   END IF;
  ELSE
   IF l.state='active' THEN
    PERFORM public.finish_document_operation(l.operation_id,l.actor_id,l.receipt_id,'needs_review');
   ELSIF l.state<>'needs_review' THEN RAISE EXCEPTION 'This upload needs review.' USING ERRCODE='55000'; END IF;
  END IF;
 ELSIF NEW.registered_document_id IS DISTINCT FROM OLD.registered_document_id
  OR NEW.held_at IS DISTINCT FROM OLD.held_at OR NEW.hold_reason IS DISTINCT FROM OLD.hold_reason THEN
  RAISE EXCEPTION 'This upload state cannot be reassigned.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $attempt_guard$;
CREATE TRIGGER upload_attempt_interval_guard BEFORE UPDATE OR DELETE ON public.document_upload_attempts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_upload_interval_attempt();

-- A registered row alone never clears the browser interval. The existing
-- generic service finish must pass a source-bound outcome check for this kind.
CREATE FUNCTION public.guard_document_upload_interval_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $interval_completion$
DECLARE b public.document_upload_operation_bindings%ROWTYPE; a public.document_upload_attempts%ROWTYPE;
 d record;
BEGIN
 IF NEW.state<>'completed' OR OLD.state='completed' THEN RETURN NEW; END IF;
 -- No attempt/binding lock inversion with hold/claim (attempt -> binding ->
 -- lease). Their source fields are immutable; registered cannot reopen.
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE operation_id=OLD.operation_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=b.attempt_id;
 IF NOT FOUND OR a.state<>'registered' OR a.registered_document_id IS NULL OR b.registration_claimed_at IS NULL
  OR OLD.actor_id IS DISTINCT FROM b.actor_id OR OLD.operation_kind<>'register'
  OR a.actor_id IS DISTINCT FROM b.actor_id OR a.student_id IS DISTINCT FROM b.student_id OR a.storage_path IS DISTINCT FROM b.storage_path
  OR a.claimed_content_sha256 IS DISTINCT FROM b.content_sha256 OR a.review_context_sha256 IS DISTINCT FROM b.review_context_sha256 THEN
  RAISE EXCEPTION 'This upload interval needs review before completion.' USING ERRCODE='55000';
 END IF;
 SELECT doc.id,doc.scan_status,doc.review_status,doc.archived_at,doc.scanned_at,doc.scan_data_id,
  doc.scan_verdict->>'provider' AS provider,doc.scan_verdict->>'code' AS code,
  doc.scan_verdict->>'content_sha256' AS content_sha256,doc.scan_verdict->>'source' AS scan_source,
  doc.scan_verdict->'clean_result' AS clean_result,doc.scan_verdict->'blocked_reasons' AS blocked_reasons
 INTO d FROM public.documents doc WHERE doc.id=a.registered_document_id AND doc.upload_attempt_id=a.id
  AND doc.uploaded_by=b.actor_id AND doc.student_id=b.student_id AND doc.storage_path=b.storage_path AND doc.content_hash=b.content_sha256
  AND doc.upload_review_context_sha256=b.review_context_sha256 AND doc.storage_object_id=b.claimed_object_id
  AND doc.storage_object_version=b.claimed_object_version AND doc.mime_type='text/plain' AND doc.deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'The saved upload outcome needs review.' USING ERRCODE='55000'; END IF;
 IF d.scanned_at IS NULL OR d.scan_data_id IS NULL OR btrim(d.scan_data_id)=''
  OR d.provider IS DISTINCT FROM 'cloudmersive' THEN
  RAISE EXCEPTION 'The saved security review needs confirmation.' USING ERRCODE='55000';
 END IF;
 IF d.scan_status='infected' AND d.code='infected' AND d.review_status='rejected' AND d.archived_at IS NOT NULL THEN RETURN NEW; END IF;
 IF d.scan_status IS DISTINCT FROM 'clean' OR d.code IS DISTINCT FROM 'clean'
  OR d.content_sha256 IS DISTINCT FROM b.content_sha256
  OR d.scan_source IS DISTINCT FROM 'registration_reviewed_copy'
  OR d.clean_result IS DISTINCT FROM 'true'::jsonb OR d.blocked_reasons IS DISTINCT FROM '[]'::jsonb
  OR d.archived_at IS NOT NULL OR NULLIF(btrim(d.review_status),'') IS NULL OR d.review_status='rejected'
  OR NOT EXISTS(SELECT 1 FROM public.ai_jobs j WHERE j.job_type='document_summary' AND j.student_id=b.student_id
   AND j.triggered_by_user_id=b.actor_id AND j.input_source->>'document_id'=d.id::text AND j.input_source->>'storage_path'=b.storage_path
   AND j.status IN ('queued','processing','completed','needs_review')) THEN
  RAISE EXCEPTION 'The saved upload outcome needs review.' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END; $interval_completion$;
CREATE TRIGGER document_operation_upload_completion BEFORE UPDATE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_upload_interval_completion();

CREATE FUNCTION public.claim_document_upload_registration_operation(_attempt_id uuid,_actor_id uuid,_review_context_sha256 text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $registration_claim$
DECLARE a public.document_upload_attempts%ROWTYPE; b public.document_upload_operation_bindings%ROWTYPE;
 l public.document_operation_leases%ROWTYPE; object_id uuid; object_version text;
BEGIN
 IF _attempt_id IS NULL OR _actor_id IS NULL OR _review_context_sha256 IS NULL OR _review_context_sha256 !~ '^[0-9a-f]{64}$'
  OR current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'The upload handoff could not be confirmed.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload tracking is unavailable.' USING ERRCODE='55000'; END IF;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=_attempt_id AND actor_id=_actor_id FOR UPDATE;
 IF NOT FOUND OR a.review_context_sha256 IS DISTINCT FROM _review_context_sha256 OR a.state<>'reserved'
  OR a.registered_document_id IS NOT NULL OR a.held_at IS NOT NULL OR a.hold_reason IS NOT NULL
  OR public.can_edit_student(_actor_id,a.student_id) IS DISTINCT FROM true OR public.is_partner_only(_actor_id) IS DISTINCT FROM false
  OR EXISTS(SELECT 1 FROM public.documents WHERE storage_path=a.storage_path) THEN
  RAISE EXCEPTION 'The upload handoff could not be confirmed.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=a.id FOR UPDATE;
 IF NOT FOUND OR b.registration_claimed_at IS NOT NULL OR b.actor_id IS DISTINCT FROM a.actor_id OR b.student_id IS DISTINCT FROM a.student_id
  OR b.storage_path IS DISTINCT FROM a.storage_path OR b.content_sha256 IS DISTINCT FROM a.claimed_content_sha256
  OR b.review_context_sha256 IS DISTINCT FROM a.review_context_sha256 THEN
  RAISE EXCEPTION 'The upload handoff needs review before another attempt.' USING ERRCODE='55000';
 END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR l.actor_id IS DISTINCT FROM a.actor_id OR l.operation_kind<>'register' OR l.state<>'active' THEN
  RAISE EXCEPTION 'The upload handoff needs review before another attempt.' USING ERRCODE='55000';
 END IF;
 SELECT o.id,to_jsonb(o)->>'version' INTO object_id,object_version FROM storage.objects o
  WHERE o.bucket_id='student-documents' AND o.name=a.storage_path AND to_jsonb(o)->>'owner_id'=_actor_id::text FOR SHARE;
 IF NOT FOUND OR object_version IS NULL OR btrim(object_version)='' OR char_length(object_version)>1024 THEN
  RAISE EXCEPTION 'The saved upload copy needs review.' USING ERRCODE='55000';
 END IF;
 UPDATE public.document_upload_operation_bindings SET registration_claimed_at=clock_timestamp(),claimed_object_id=object_id,claimed_object_version=object_version
  WHERE attempt_id=a.id RETURNING * INTO b;
 RETURN jsonb_build_object('schema','document-upload-registration-operation-v1','attempt_id',a.id,'actor_id',a.actor_id,'student_id',a.student_id,
  'storage_path',a.storage_path,'content_sha256',a.claimed_content_sha256,'review_context_sha256',a.review_context_sha256,
  'operation_id',l.operation_id,'receipt_id',l.receipt_id,'revision',l.admitted_revision,'object_id',b.claimed_object_id,
  'object_version',b.claimed_object_version,'claimed_at',b.registration_claimed_at);
END; $registration_claim$;
REVOKE ALL ON FUNCTION public.lock_document_upload_interval_control(),public.assert_document_upload_interval(uuid,text),public.assert_document_upload_registered_outcome(uuid),
 public.bind_document_upload_operation(),public.guard_document_upload_operation_binding(),public.guard_document_upload_interval_attempt(),public.guard_document_upload_interval_completion(),
 public.claim_document_upload_registration_operation(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
-- Control/scope helpers are owner-internal; existing definer upload RPCs call them.
-- No new browser-callable RPC or receipt capability is introduced.
GRANT EXECUTE ON FUNCTION public.claim_document_upload_registration_operation(uuid,uuid,text) TO service_role;
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
  PERFORM public.lock_document_upload_interval_control();
  IF actor IS NULL OR _path IS NULL OR _owner IS DISTINCT FROM actor::text
    OR public.is_partner_only(actor) IS DISTINCT FROM false THEN RETURN false; END IF;
  SELECT * INTO attempt FROM public.document_upload_attempts
    WHERE storage_path=_path AND actor_id=actor FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM public.assert_document_upload_interval(attempt.id,'storage');
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
  IF TG_OP='INSERT' THEN
    PERFORM public.lock_document_upload_interval_control();
    PERFORM public.assert_document_upload_interval(NEW.upload_attempt_id,'registration');
  END IF;
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
REVOKE ALL ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text),public.can_insert_reserved_student_document(text,text),public.guard_document_upload_registration() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_document_upload(uuid,uuid,text,text),public.can_insert_reserved_student_document(text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.read_document_upload_registration(_attempt_id uuid,_review_context_sha256 text)
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
  PERFORM public.assert_document_upload_registered_outcome(attempt.id);
  -- Registration receipt only: it does not claim clean bytes or completed AI.
  RETURN jsonb_build_object('schema','document-upload-registration-v1','attempt_id',attempt.id,'document_id',doc.id,
    'actor_id',actor,'student_id',doc.student_id,'storage_path',doc.storage_path,
    'scan_status',doc.scan_status,'review_status',doc.review_status,'archived_at',doc.archived_at,'deleted_at',doc.deleted_at);
END;
$receipt$;
REVOKE ALL ON FUNCTION public.read_document_upload_registration(uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_document_upload_registration(uuid,text) TO authenticated;
COMMENT ON TABLE public.document_upload_operation_bindings IS
 'Private source/actor-bound register operation from reservation across browser upload and one-shot service handoff. Tokens never enter browser receipts. No expiry, release, provider stop/byte proof, completion-from-registration or deletion authority.';
COMMIT;
