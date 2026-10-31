-- REVIEW PROPOSAL ONLY; ninth noncanonical/unapplied proposal.
-- Atomic registration completion receipt and owner-internal source-bound
-- settlement. Clean upload releases one unit; confirmed no-summary quarantine
-- releases two. No rescan/Apply settlement, held release, expiry or activation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $registration_settlement_preflight$
DECLARE expected record; relation_name text; role_name text; privilege_name text; paused_state boolean;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
  ('public.finish_document_operation(uuid,uuid,uuid,text)','b7d311f760d66a7b9c8f6244c1441caa',true),
  ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false),
  ('public.guard_document_capacity_reservation()','0c99e9855dd99906fcb3e93c78bba1b6',false),
  ('public.guard_document_upload_interval_completion()','a76a313e56cc031f99201be9dc515e87',true),
  ('public.guard_document_upload_operation_binding()','9633c665d11d0c4d1fae2478d3c34dc5',true),
  ('public.guard_document_upload_interval_attempt()','3563a08fd8a10e553ca93232292d4119',true)) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(expected.signature) AND prosecdef=expected.definer
    AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)=expected.body_md5
    AND proowner=CASE WHEN expected.signature='public.finish_document_operation(uuid,uuid,uuid,text)'
      THEN (SELECT relowner FROM pg_class WHERE oid=to_regclass('public.document_operation_control')) ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Reviewed registration completion prerequisites are required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,expected.signature,'EXECUTE') IS DISTINCT FROM
      (role_name='service_role' AND expected.signature='public.finish_document_operation(uuid,uuid,uuid,text)') THEN
    RAISE EXCEPTION 'Reviewed registration completion permissions are required.' USING ERRCODE='55000';
   END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_capacity_policy','public.document_capacity_reservations','public.document_capacity_summary_settlements','public.document_upload_operation_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity AND relowner=CASE WHEN relation_name IN ('public.document_operation_control','public.document_operation_leases')
    THEN (SELECT relowner FROM pg_class WHERE oid='public.document_operation_control'::regclass) ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Reviewed private registration tracking is required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'] LOOP
    IF has_table_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private registration tracking drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF has_any_column_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private registration column drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 -- Upload attempts intentionally retain scoped authenticated reads and a
 -- trusted service read. Preserve those exact existing policies and grants.
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_upload_attempts'::regclass AND relrowsecurity AND relowner=current_user::regrole)
  OR (SELECT count(*) FROM pg_policy WHERE polrelid='public.document_upload_attempts'::regclass)<>2
  OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.document_upload_attempts'::regclass AND polname='upload_attempt_creator_read'
   AND polcmd='r' AND polpermissive AND polroles=ARRAY['authenticated'::regrole::oid]
   AND lower(regexp_replace(replace(pg_get_expr(polqual,polrelid),'public.',''),'[[:space:]()]','','g'))=
    'actor_id=auth.uidandis_partner_onlyauth.uidisfalseandcan_edit_studentauth.uid,student_idistrue')
  OR NOT EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.document_upload_attempts'::regclass AND polname='upload_attempt_service_read'
   AND polcmd='r' AND polpermissive AND polroles=ARRAY['service_role'::regrole::oid] AND lower(pg_get_expr(polqual,polrelid))='true') THEN
  RAISE EXCEPTION 'Reviewed scoped upload reads must be preserved.' USING ERRCODE='55000';
 END IF;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'] LOOP
   IF has_table_privilege(role_name,'public.document_upload_attempts',privilege_name)
     IS DISTINCT FROM (privilege_name='SELECT' AND role_name IN ('authenticated','service_role')) THEN
    RAISE EXCEPTION 'Reviewed upload read-only grants are required.' USING ERRCODE='55000';
   END IF;
  END LOOP;
  FOREACH privilege_name IN ARRAY ARRAY['INSERT','UPDATE'] LOOP
   IF has_any_column_privilege(role_name,'public.document_upload_attempts',privilege_name) THEN
    RAISE EXCEPTION 'Upload attempt mutation grants are not permitted.' USING ERRCODE='55000';
   END IF;
  END LOOP;
 END LOOP;
 IF (SELECT relowner FROM pg_class WHERE oid='public.document_operation_leases'::regclass)
  IS DISTINCT FROM (SELECT relowner FROM pg_class WHERE oid='public.document_operation_control'::regclass) THEN
  RAISE EXCEPTION 'Coherent admission ownership is required.' USING ERRCODE='55000';
 END IF;
 FOR expected IN SELECT * FROM (VALUES
  ('public.document_upload_operation_bindings','upload_operation_binding_frozen','public.guard_document_upload_operation_binding()'),
  ('public.document_upload_attempts','upload_attempt_interval_guard','public.guard_document_upload_interval_attempt()'),
  ('public.document_operation_leases','document_operation_upload_completion','public.guard_document_upload_interval_completion()'),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()')
 ) x(relation_name,trigger_name,signature) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(expected.relation_name) AND tgname=expected.trigger_name
    AND tgfoid=to_regprocedure(expected.signature) AND tgenabled='O' AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Reviewed registration guards must remain enabled.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Registration settlement requires paused review.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate registration settlement review.' USING ERRCODE='55000';
 END IF;
END; $registration_settlement_preflight$;
CREATE TABLE public.document_registration_completion_receipts (
 operation_id uuid PRIMARY KEY REFERENCES public.document_capacity_reservations(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,student_id uuid NOT NULL,attempt_id uuid NOT NULL UNIQUE REFERENCES public.document_upload_attempts(id) ON DELETE RESTRICT,
 document_id uuid NOT NULL UNIQUE REFERENCES public.documents(id) ON DELETE RESTRICT,
 object_id uuid NOT NULL,object_version text NOT NULL,storage_path text NOT NULL,content_sha256 text NOT NULL,review_context_sha256 text NOT NULL,
 document_revision timestamptz NOT NULL,scan_completed_at timestamptz NOT NULL,operation_finished_at timestamptz NOT NULL,
 disposition text NOT NULL CHECK(disposition IN ('clean_queued','quarantined')),
 summary_job_id uuid UNIQUE REFERENCES public.ai_jobs(id) ON DELETE RESTRICT,
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),completion_txid bigint NOT NULL DEFAULT txid_current(),
 FOREIGN KEY(operation_id) REFERENCES public.document_upload_operation_bindings(operation_id) ON DELETE RESTRICT,
 CHECK((disposition='quarantined')=(summary_job_id IS NULL))
);
CREATE TABLE public.document_capacity_registration_settlements (
 operation_id uuid PRIMARY KEY REFERENCES public.document_registration_completion_receipts(operation_id) ON DELETE RESTRICT,
 released_units integer NOT NULL CHECK(released_units IN (1,2)),settled_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.document_registration_completion_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_capacity_registration_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_registration_completion_receipts,public.document_capacity_registration_settlements FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.read_internal_document_registration_completion(_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $registration_outcome$
DECLARE r public.document_capacity_reservations%ROWTYPE;l public.document_operation_leases%ROWTYPE;
 b public.document_upload_operation_bindings%ROWTYPE;a public.document_upload_attempts%ROWTYPE;d public.documents%ROWTYPE;j public.ai_jobs%ROWTYPE;disposition text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO r FROM public.document_capacity_reservations WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=_operation_id;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE operation_id=_operation_id;
 IF NOT FOUND OR r.producer_kind IS DISTINCT FROM 'register' OR r.reserved_units IS DISTINCT FROM 2
  OR l.state IS DISTINCT FROM 'completed' OR l.operation_kind IS DISTINCT FROM 'register' OR l.finished_at IS NULL
  OR l.actor_id IS DISTINCT FROM r.actor_id OR b.actor_id IS DISTINCT FROM r.actor_id OR b.student_id IS DISTINCT FROM r.student_id
  OR b.registration_claimed_at IS NULL OR b.claimed_object_id IS NULL OR b.claimed_object_version IS NULL THEN
  RAISE EXCEPTION 'The saved upload outcome could not be confirmed.' USING ERRCODE='55000';
 END IF;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=b.attempt_id;
 IF NOT FOUND OR a.state<>'registered' OR a.registered_document_id IS NULL OR a.actor_id IS DISTINCT FROM b.actor_id
  OR a.student_id IS DISTINCT FROM b.student_id OR a.storage_path IS DISTINCT FROM b.storage_path
  OR a.claimed_content_sha256 IS DISTINCT FROM b.content_sha256 OR a.review_context_sha256 IS DISTINCT FROM b.review_context_sha256 THEN
  RAISE EXCEPTION 'The saved upload source could not be confirmed.' USING ERRCODE='55000';
 END IF;
 SELECT * INTO d FROM public.documents WHERE id=a.registered_document_id AND upload_attempt_id=a.id
  AND uploaded_by=b.actor_id AND student_id=b.student_id AND storage_path=b.storage_path AND content_hash=b.content_sha256
  AND upload_review_context_sha256=b.review_context_sha256 AND storage_object_id=b.claimed_object_id
  AND storage_object_version=b.claimed_object_version AND mime_type='text/plain' AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND OR d.updated_at IS NULL OR d.scanned_at IS NULL OR NULLIF(btrim(d.scan_data_id),'') IS NULL
  OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive' THEN
  RAISE EXCEPTION 'The saved security review could not be confirmed.' USING ERRCODE='55000';
 END IF;
 IF d.scan_status='infected' AND d.scan_verdict->>'code'='infected' AND d.scan_verdict->'clean_result'='false'::jsonb
  AND d.review_status='rejected' AND d.archived_at IS NOT NULL THEN
  IF r.summary_job_id IS NOT NULL OR r.summary_operation_id IS NOT NULL THEN
   RAISE EXCEPTION 'This upload still has tracked summary work.' USING ERRCODE='55000';
  END IF;
  PERFORM 1 FROM public.ai_jobs WHERE job_type='document_summary' AND lower(input_source->>'document_id')=d.id::text FOR SHARE;
  IF FOUND THEN RAISE EXCEPTION 'This upload still has summary work to review.' USING ERRCODE='55000'; END IF;
  disposition:='quarantined';
 ELSE
  IF d.scan_status IS DISTINCT FROM 'clean' OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean'
   OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256
   OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy'
   OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb OR d.scan_verdict->'blocked_reasons' IS DISTINCT FROM '[]'::jsonb
   OR d.archived_at IS NOT NULL OR NULLIF(btrim(d.review_status),'') IS NULL OR d.review_status='rejected' THEN
   RAISE EXCEPTION 'The saved clean upload could not be confirmed.' USING ERRCODE='55000';
  END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=r.summary_job_id AND job_type='document_summary'
   AND student_id=b.student_id AND triggered_by_user_id=b.actor_id AND lower(input_source->>'document_id')=d.id::text
   AND input_source->>'storage_path'=b.storage_path AND status IN ('queued','processing','completed','needs_review') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The exact saved summary queue could not be confirmed.' USING ERRCODE='55000'; END IF;
  disposition:='clean_queued';
 END IF;
 RETURN jsonb_build_object('operation_id',r.operation_id,'actor_id',r.actor_id,'student_id',r.student_id,'attempt_id',a.id,
  'document_id',d.id,'object_id',b.claimed_object_id,'object_version',b.claimed_object_version,'storage_path',b.storage_path,
  'content_sha256',b.content_sha256,'review_context_sha256',b.review_context_sha256,'document_revision',d.updated_at,
  'scan_completed_at',d.scanned_at,'operation_finished_at',l.finished_at,'disposition',disposition,'summary_job_id',r.summary_job_id);
END; $registration_outcome$;
CREATE FUNCTION public.guard_document_registration_completion_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $registration_receipt_guard$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'The upload completion receipt is retained.' USING ERRCODE='42501'; END IF;
 IF NEW.completion_txid IS DISTINCT FROM txid_current() OR
  (to_jsonb(NEW)-ARRAY['completed_at','completion_txid']) IS DISTINCT FROM public.read_internal_document_registration_completion(NEW.operation_id) THEN
  RAISE EXCEPTION 'The upload completion receipt could not be confirmed.' USING ERRCODE='55000';
 END IF;
 RETURN NEW;
END; $registration_receipt_guard$;
CREATE TRIGGER document_registration_completion_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_registration_completion_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_registration_completion_receipt();
CREATE FUNCTION public.record_internal_document_registration_completion(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $record_registration_completion$
DECLARE outcome jsonb;written integer;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations WHERE operation_id=_operation_id AND producer_kind='register') THEN RETURN; END IF;
 outcome:=public.read_internal_document_registration_completion(_operation_id);
 INSERT INTO public.document_registration_completion_receipts(operation_id,actor_id,student_id,attempt_id,document_id,object_id,object_version,
  storage_path,content_sha256,review_context_sha256,document_revision,scan_completed_at,operation_finished_at,disposition,summary_job_id)
 VALUES((outcome->>'operation_id')::uuid,(outcome->>'actor_id')::uuid,(outcome->>'student_id')::uuid,(outcome->>'attempt_id')::uuid,
  (outcome->>'document_id')::uuid,(outcome->>'object_id')::uuid,outcome->>'object_version',outcome->>'storage_path',outcome->>'content_sha256',
  outcome->>'review_context_sha256',(outcome->>'document_revision')::timestamptz,(outcome->>'scan_completed_at')::timestamptz,
  (outcome->>'operation_finished_at')::timestamptz,outcome->>'disposition',(outcome->>'summary_job_id')::uuid);
 GET DIAGNOSTICS written=ROW_COUNT;
 IF written<>1 THEN RAISE EXCEPTION 'The upload completion receipt was not saved.' USING ERRCODE='55000'; END IF;
END; $record_registration_completion$;

-- Serialize INSERT with quarantine completion; UPDATE retains registered queue
-- source identity but still permits normal claim/status/verified completion.
CREATE FUNCTION public.guard_registered_document_summary_queue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $registered_queue_guard$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.job_type='document_summary' THEN
   PERFORM public.lock_internal_document_capacity_completion();
   IF (auth.uid() IS NOT NULL AND NEW.triggered_by_user_id IS DISTINCT FROM auth.uid())
    OR public.is_partner_only(NEW.triggered_by_user_id) IS DISTINCT FROM false
    OR public.can_edit_student(NEW.triggered_by_user_id,NEW.student_id) IS DISTINCT FROM true
    OR NOT EXISTS(SELECT 1 FROM public.documents d WHERE d.id::text=lower(NEW.input_source->>'document_id')
      AND d.student_id=NEW.student_id AND public.can_view_document(NEW.triggered_by_user_id,d.id) IS TRUE) THEN
    RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501';
   END IF;
   IF EXISTS(SELECT 1 FROM public.document_registration_completion_receipts
    WHERE disposition='quarantined' AND document_id::text=lower(NEW.input_source->>'document_id')) THEN
    RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501';
   END IF;
  END IF;
  RETURN NEW;
 END IF;
 IF EXISTS(SELECT 1 FROM public.document_registration_completion_receipts WHERE summary_job_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'The registered summary source is retained.' USING ERRCODE='42501'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.job_type IS DISTINCT FROM OLD.job_type OR NEW.student_id IS DISTINCT FROM OLD.student_id
   OR NEW.triggered_by_user_id IS DISTINCT FROM OLD.triggered_by_user_id OR NEW.input_source IS DISTINCT FROM OLD.input_source THEN
   RAISE EXCEPTION 'The registered summary source cannot be reassigned.' USING ERRCODE='42501';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $registered_queue_guard$;
CREATE TRIGGER ai_jobs_guard_registered_document_summary BEFORE INSERT OR UPDATE OR DELETE ON public.ai_jobs
 FOR EACH ROW EXECUTE FUNCTION public.guard_registered_document_summary_queue();
CREATE FUNCTION public.guard_document_capacity_registration_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $registration_settlement_guard$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'The upload capacity settlement is retained.' USING ERRCODE='42501'; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations r
  JOIN public.document_registration_completion_receipts done ON done.operation_id=r.operation_id
  JOIN public.document_upload_operation_bindings b ON b.operation_id=r.operation_id
  JOIN public.document_upload_attempts a ON a.id=b.attempt_id
  JOIN public.document_operation_leases l ON l.operation_id=r.operation_id
  WHERE r.operation_id=NEW.operation_id AND r.producer_kind='register' AND r.reserved_units=2
   AND done.actor_id=r.actor_id AND done.student_id=r.student_id AND l.actor_id=r.actor_id AND l.operation_kind='register'
   AND l.state='completed' AND l.finished_at=done.operation_finished_at AND a.state='registered' AND a.registered_document_id=done.document_id
   AND a.id=done.attempt_id AND b.actor_id=done.actor_id AND b.student_id=done.student_id
   AND b.claimed_object_id=done.object_id AND b.claimed_object_version=done.object_version AND b.storage_path=done.storage_path
   AND b.content_sha256=done.content_sha256 AND b.review_context_sha256=done.review_context_sha256
   AND ((done.disposition='clean_queued' AND done.summary_job_id=r.summary_job_id AND NEW.released_units=1)
    OR (done.disposition='quarantined' AND r.summary_job_id IS NULL AND r.summary_operation_id IS NULL AND NEW.released_units=2
      AND NOT EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=r.operation_id)))
  FOR SHARE OF r,l
 ) THEN RAISE EXCEPTION 'The upload capacity completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $registration_settlement_guard$;
CREATE TRIGGER document_capacity_registration_settlement_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_capacity_registration_settlements
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_capacity_registration_settlement();
CREATE FUNCTION public.settle_internal_document_registration_capacity(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $settle_registration_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF EXISTS(SELECT 1 FROM public.document_capacity_registration_settlements WHERE operation_id=_operation_id) THEN
  RAISE EXCEPTION 'The upload capacity settlement cannot be repeated.' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.document_capacity_registration_settlements(operation_id,released_units)
  SELECT operation_id,CASE WHEN disposition='quarantined' THEN 2 ELSE 1 END FROM public.document_registration_completion_receipts WHERE operation_id=_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'The upload completion proof could not be confirmed.' USING ERRCODE='55000'; END IF;
END; $settle_registration_capacity$;

CREATE OR REPLACE FUNCTION public.finish_document_operation(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_outcome text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $finish_operation$
DECLARE lease public.document_operation_leases%ROWTYPE;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' OR _operation_id IS NULL OR _actor_id IS NULL
  OR _receipt_id IS NULL OR _outcome IS NULL OR _outcome NOT IN ('completed','needs_review') THEN
  RAISE EXCEPTION 'Document completion could not be confirmed.' USING ERRCODE='42501';
 END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM _actor_id OR lease.receipt_id IS DISTINCT FROM _receipt_id THEN
  RAISE EXCEPTION 'Document completion could not be confirmed.' USING ERRCODE='42501';
 END IF;
 UPDATE public.document_operation_leases SET state=_outcome,finished_at=clock_timestamp() WHERE operation_id=_operation_id;
 IF _outcome='completed' THEN PERFORM public.record_internal_document_registration_completion(_operation_id); END IF;
 RETURN jsonb_build_object('schema','document-operation-finished-v1','operation_id',_operation_id,'state',_outcome);
END; $finish_operation$;
CREATE OR REPLACE FUNCTION public.guard_document_capacity_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $capacity_guard$
DECLARE policy public.document_capacity_policy%ROWTYPE; lease public.document_operation_leases%ROWTYPE;
 control_revision bigint; binding public.document_summary_operation_bindings%ROWTYPE; j public.ai_jobs%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tracked capacity cannot be removed.' USING ERRCODE='42501'; END IF;
 control_revision:=public.lock_internal_document_capacity();
 IF TG_OP='INSERT' THEN
  SELECT * INTO policy FROM public.document_capacity_policy WHERE singleton FOR SHARE;
  IF NOT FOUND OR policy.global_units IS NULL OR policy.actor_units IS NULL OR policy.student_units IS NULL THEN
   RAISE EXCEPTION 'Capacity policy requires review.' USING ERRCODE='55000';
  END IF;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.operation_id FOR SHARE;
  IF NOT FOUND OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM NEW.actor_id
   OR lease.operation_kind IS DISTINCT FROM NEW.producer_kind OR lease.admitted_revision IS DISTINCT FROM control_revision
   OR NEW.student_id IS NULL OR public.can_edit_student(NEW.actor_id,NEW.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false
   OR NEW.summary_job_id IS NOT NULL OR NEW.summary_operation_id IS NOT NULL THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id WHERE r.actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id WHERE r.student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['summary_job_id','summary_operation_id']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['summary_job_id','summary_operation_id']) THEN
  RAISE EXCEPTION 'Tracked capacity identity cannot change.' USING ERRCODE='42501';
 END IF;
 IF OLD.summary_job_id IS NULL AND NEW.summary_job_id IS NOT NULL AND NEW.summary_operation_id IS NULL
   AND OLD.producer_kind IN ('register','rescan') THEN
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=OLD.operation_id FOR SHARE;
  SELECT * INTO j FROM public.ai_jobs WHERE id=NEW.summary_job_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR NOT FOUND OR j.job_type<>'document_summary' OR j.status<>'queued'
   OR j.locked_at IS NOT NULL OR j.attempts<>0 OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id
   OR j.student_id IS DISTINCT FROM OLD.student_id OR public.can_edit_student(OLD.actor_id,OLD.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(OLD.actor_id) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSIF OLD.summary_job_id IS NOT NULL AND NEW.summary_job_id IS NOT DISTINCT FROM OLD.summary_job_id
   AND OLD.summary_operation_id IS NULL AND NEW.summary_operation_id IS NOT NULL THEN
  SELECT * INTO binding FROM public.document_summary_operation_bindings
   WHERE job_id=OLD.summary_job_id AND operation_id=NEW.summary_operation_id FOR SHARE;
  IF NOT FOUND OR binding.actor_id IS DISTINCT FROM OLD.actor_id OR binding.student_id IS DISTINCT FROM OLD.student_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=OLD.summary_job_id FOR SHARE;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.summary_operation_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR lease.operation_kind IS DISTINCT FROM 'summary' OR lease.actor_id IS DISTINCT FROM OLD.actor_id
   OR j.status IS DISTINCT FROM 'processing' OR j.locked_at IS DISTINCT FROM binding.claim_at OR j.attempts IS DISTINCT FROM binding.claim_attempt
   OR j.student_id IS DISTINCT FROM OLD.student_id OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSE RAISE EXCEPTION 'Tracked capacity cannot be replayed or released.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $capacity_guard$;

REVOKE ALL ON FUNCTION public.read_internal_document_registration_completion(uuid),public.guard_document_registration_completion_receipt(),
 public.record_internal_document_registration_completion(uuid),public.guard_registered_document_summary_queue(),
 public.guard_document_capacity_registration_settlement(),public.settle_internal_document_registration_capacity(uuid) FROM PUBLIC,anon,authenticated,service_role;
-- Existing finish retains its admission owner. Grant only that trusted SQL role
-- the two private helper calls it needs; no ordinary role/raw data grant.
DO $finish_helper_grants$
DECLARE admission_owner name;
BEGIN
 SELECT relowner::regrole::text INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.lock_internal_document_capacity_completion() TO %I',admission_owner);
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.record_internal_document_registration_completion(uuid) TO %I',admission_owner);
END; $finish_helper_grants$;
COMMENT ON TABLE public.document_capacity_registration_settlements IS
 'Private exact registration settlements: one producer unit after clean-plus-bound queue; both units only for confirmed no-summary quarantine. Rescan/Apply and held/uncertain work remain counted. No manual held release, expiry, deletion, selected limits, producer/worker source-capacity hooks or hosted/provider proof.';
COMMIT;
