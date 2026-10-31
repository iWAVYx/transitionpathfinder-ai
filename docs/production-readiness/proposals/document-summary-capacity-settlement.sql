-- REVIEW PROPOSAL ONLY; eighth noncanonical/unapplied proposal.
-- Atomic immutable summary completion receipt plus one-unit owner-internal
-- settlement. No producer/Apply settlement, held release, expiry or IO authority.
-- No app hooks or new ordinary execution grants. Hosted authorization separate.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $settlement_preflight$
DECLARE expected record; relation_name text; role_name text; privilege_name text; paused_state boolean;
BEGIN
 FOR expected IN SELECT * FROM (VALUES
  ('public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)','cbbb8ff55dfd00b8bad86fde7f7d1524',true),
  ('public.guard_document_summary_operation_completion()','80e1d39564ed282104abea744faa45ea',true),
  ('public.guard_document_capacity_reservation()','d07897b4d300a74245ed98aa37311015',false),
  ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828',false),
  ('public.read_verified_document_summary_source(uuid,timestamptz,integer)','6beb7e73b75e358ff530c8316650c1e5',true),
  ('public.reject_document_source_binding_mutation()','1f541c412d592bef234c15d4309e505c',true),
  ('public.guard_bound_document_summary_job()','bec9836beb73d0e1ee37de07be97438c',true),
  ('public.guard_document_summary_operation_binding()','b049daec1448ce2bc28812c4588c8b97',true)
 ) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(expected.signature) AND prosecdef=expected.definer
    AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)=expected.body_md5 AND proowner=current_user::regrole) THEN
   RAISE EXCEPTION 'Reviewed summary settlement prerequisites are required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,expected.signature,'EXECUTE') IS DISTINCT FROM
      (role_name='service_role' AND (expected.signature LIKE 'public.complete_verified_document_summary(%' OR expected.signature LIKE 'public.read_verified_document_summary_source(%')) THEN
    RAISE EXCEPTION 'Reviewed summary settlement permissions are required.' USING ERRCODE='55000';
   END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_capacity_policy','public.document_capacity_reservations','public.document_summary_source_bindings','public.document_summary_operation_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity AND relowner=current_user::regrole) THEN
   RAISE EXCEPTION 'Reviewed private summary settlement tracking is required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE'] LOOP
    IF has_table_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private summary settlement prerequisite drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
   FOREACH privilege_name IN ARRAY ARRAY['SELECT','INSERT','UPDATE'] LOOP
    IF has_any_column_privilege(role_name,relation_name,privilege_name) THEN RAISE EXCEPTION 'Private summary settlement prerequisite drift.' USING ERRCODE='55000'; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 FOR expected IN SELECT * FROM (VALUES
  ('public.document_summary_source_bindings','document_source_binding_immutable','public.reject_document_source_binding_mutation()'),
  ('public.document_summary_operation_bindings','summary_operation_binding_frozen','public.guard_document_summary_operation_binding()'),
  ('public.document_operation_leases','document_operation_summary_completion','public.guard_document_summary_operation_completion()'),
  ('public.ai_jobs','ai_jobs_guard_bound_document_source','public.guard_bound_document_summary_job()'),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()')
 ) x(relation_name,trigger_name,signature) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(expected.relation_name)
   AND tgname=expected.trigger_name AND tgfoid=to_regprocedure(expected.signature) AND tgenabled='O' AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Reviewed source and capacity guards must remain enabled.' USING ERRCODE='55000';
  END IF;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Summary settlement requires paused review.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing capacity requires separate summary settlement review.' USING ERRCODE='55000';
 END IF;
END; $settlement_preflight$;
CREATE TABLE public.document_summary_completion_receipts (
 job_id uuid PRIMARY KEY REFERENCES public.document_summary_source_bindings(job_id) ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE REFERENCES public.document_summary_operation_bindings(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,student_id uuid NOT NULL,document_id uuid NOT NULL,
 object_id uuid NOT NULL,object_version text NOT NULL,storage_path text NOT NULL,content_sha256 text NOT NULL,
 claim_at timestamptz NOT NULL,claim_attempt integer NOT NULL CHECK(claim_attempt>0),
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),completion_txid bigint NOT NULL DEFAULT txid_current()
);
CREATE TABLE public.document_capacity_summary_settlements (
 operation_id uuid PRIMARY KEY REFERENCES public.document_capacity_reservations(operation_id) ON DELETE RESTRICT,
 summary_job_id uuid NOT NULL UNIQUE REFERENCES public.document_summary_completion_receipts(job_id) ON DELETE RESTRICT,
 summary_operation_id uuid NOT NULL UNIQUE REFERENCES public.document_summary_operation_bindings(operation_id) ON DELETE RESTRICT,
 settled_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.document_summary_completion_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_capacity_summary_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_summary_completion_receipts,public.document_capacity_summary_settlements FROM PUBLIC,anon,authenticated,service_role;

-- Completion may drain an already-active operation while paused. This lock
-- never authorizes admission, a fresh claim, file/provider IO or a held release.
CREATE FUNCTION public.lock_internal_document_capacity_completion()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $completion_lock$
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Summary completion could not be confirmed.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.document_operation_control WHERE singleton FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Summary completion requires reviewed control.' USING ERRCODE='55000'; END IF;
 PERFORM pg_advisory_xact_lock(824601,19);
END; $completion_lock$;
CREATE FUNCTION public.guard_document_summary_completion_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $completion_receipt_guard$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'The summary completion receipt is retained.' USING ERRCODE='42501'; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NEW.completion_txid IS DISTINCT FROM txid_current() OR NOT EXISTS(
  SELECT 1 FROM public.document_summary_operation_bindings b
  JOIN public.document_summary_source_bindings s ON s.job_id=b.job_id
  JOIN public.document_operation_leases l ON l.operation_id=b.operation_id
  JOIN public.ai_jobs j ON j.id=b.job_id
  WHERE b.job_id=NEW.job_id AND b.operation_id=NEW.operation_id AND b.actor_id=NEW.actor_id AND b.student_id=NEW.student_id
   AND b.document_id=NEW.document_id AND b.object_id=NEW.object_id AND b.object_version=NEW.object_version
   AND b.storage_path=NEW.storage_path AND b.content_sha256=NEW.content_sha256 AND b.claim_at=NEW.claim_at AND b.claim_attempt=NEW.claim_attempt
   AND s.actor_id=b.actor_id AND s.student_id=b.student_id AND s.document_id=b.document_id AND s.object_id=b.object_id
   AND s.object_version=b.object_version AND s.storage_path=b.storage_path AND s.content_sha256=b.content_sha256
   AND s.first_claim_at=b.claim_at AND s.first_claim_attempt=b.claim_attempt AND s.first_admission_txid<>txid_current()
   AND l.state='active' AND l.operation_kind='summary' AND l.actor_id=b.actor_id
   AND j.status='completed' AND j.job_type='document_summary' AND j.locked_at IS NULL AND j.attempts=b.claim_attempt
   AND j.student_id=b.student_id AND j.triggered_by_user_id=b.actor_id
   AND j.result_payload->'_source'->>'document_id'=b.document_id::text
   AND j.result_payload->'_source'->>'object_id'=b.object_id::text AND j.result_payload->'_source'->>'object_version'=b.object_version
   AND j.result_payload->'_source'->>'content_sha256'=b.content_sha256
 ) THEN RAISE EXCEPTION 'The summary completion receipt could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $completion_receipt_guard$;
CREATE TRIGGER summary_completion_receipt_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_summary_completion_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_summary_completion_receipt();
CREATE FUNCTION public.guard_completed_document_summary_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $completed_job_guard$
BEGIN
 IF EXISTS(SELECT 1 FROM public.document_summary_completion_receipts WHERE job_id=OLD.id) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'The confirmed summary is retained.' USING ERRCODE='42501'; END IF;
  IF (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at') THEN
   RAISE EXCEPTION 'The confirmed summary cannot be changed or replayed.' USING ERRCODE='42501';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $completed_job_guard$;
CREATE TRIGGER ai_jobs_guard_completed_document_summary BEFORE UPDATE OR DELETE ON public.ai_jobs
 FOR EACH ROW EXECUTE FUNCTION public.guard_completed_document_summary_job();

CREATE OR REPLACE FUNCTION public.complete_verified_document_summary(_job_id uuid,_claim_at timestamptz,_attempt integer,
  _actor_id uuid,_student_id uuid,_document_id uuid,_object_id uuid,_object_version text,_content_sha256 text,_privacy_context jsonb,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $complete_source$
DECLARE source jsonb; updated integer;
BEGIN
  PERFORM public.lock_internal_document_capacity_completion();
  -- Completion cannot invent provenance after model work. A prior successful
  -- source admission must have committed its immutable binding first.
  IF NOT EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=_job_id AND first_admission_txid<>txid_current()) THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='42501';
  END IF;
  source:=public.read_verified_document_summary_source(_job_id,_claim_at,_attempt);
  IF source->>'actor_id' IS DISTINCT FROM _actor_id::text OR source->>'student_id' IS DISTINCT FROM _student_id::text
    OR source->'context' IS DISTINCT FROM _privacy_context
    OR _document_id IS NULL OR _object_id IS NULL OR _object_version IS NULL OR _content_sha256 IS NULL
    OR source->>'document_id' IS DISTINCT FROM _document_id::text
    OR source->>'object_id' IS DISTINCT FROM _object_id::text
    OR source->>'object_version' IS DISTINCT FROM _object_version
    OR source->>'content_sha256' IS DISTINCT FROM _content_sha256
    OR _payload IS NULL OR jsonb_typeof(_payload)<>'object' OR char_length(_payload::text)>60000
    OR _payload->'_source'->>'document_id' IS DISTINCT FROM _document_id::text
    OR _payload->'_source'->>'object_id' IS DISTINCT FROM _object_id::text
    OR _payload->'_source'->>'object_version' IS DISTINCT FROM _object_version
    OR _payload->'_source'->>'content_sha256' IS DISTINCT FROM _content_sha256 THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='42501';
  END IF;
  -- The immutable operation binding must already exist. Do not invent one
  -- after generation or recover an unknown claim. No lease row lock is taken
  -- here: ordinary finish locks lease -> job. A concurrent review hold can
  -- conservatively retain the operation; it can never authorize settlement.
  IF NOT EXISTS(SELECT 1 FROM public.document_summary_operation_bindings b
    JOIN public.document_operation_leases l ON l.operation_id=b.operation_id
    WHERE b.job_id=_job_id AND b.claim_at=_claim_at AND b.claim_attempt=_attempt
      AND b.actor_id=_actor_id AND b.student_id=_student_id AND b.document_id=_document_id
      AND b.object_id=_object_id AND b.object_version=_object_version AND b.content_sha256=_content_sha256
      AND b.storage_path=source->>'storage_path' AND l.actor_id=b.actor_id AND l.operation_kind='summary' AND l.state='active') THEN
    RAISE EXCEPTION 'The tracked summary completion could not be confirmed.' USING ERRCODE='55000';
  END IF;
  UPDATE public.ai_jobs SET status='completed',result_payload=_payload,error_message=NULL,locked_at=NULL
    WHERE id=_job_id AND status='processing' AND locked_at=_claim_at AND attempts=_attempt;
  GET DIAGNOSTICS updated=ROW_COUNT;
  IF updated<>1 THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.document_summary_completion_receipts(job_id,operation_id,actor_id,student_id,document_id,
    object_id,object_version,storage_path,content_sha256,claim_at,claim_attempt)
    SELECT job_id,operation_id,actor_id,student_id,document_id,object_id,object_version,storage_path,content_sha256,claim_at,claim_attempt
    FROM public.document_summary_operation_bindings WHERE job_id=_job_id;
  RETURN jsonb_build_object('schema','verified-document-summary-commit-v1','job_id',_job_id,'status','completed',
    'document_id',_document_id,'actor_id',_actor_id,'student_id',_student_id,'content_sha256',_content_sha256);
END;
$complete_source$;

CREATE FUNCTION public.guard_document_capacity_summary_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $summary_settlement_guard$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'The counted summary settlement is retained.' USING ERRCODE='42501'; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations r
  JOIN public.document_summary_completion_receipts done ON done.job_id=r.summary_job_id AND done.operation_id=r.summary_operation_id
  JOIN public.document_summary_operation_bindings b ON b.job_id=done.job_id AND b.operation_id=done.operation_id
  JOIN public.document_operation_leases l ON l.operation_id=done.operation_id
  JOIN public.ai_jobs j ON j.id=done.job_id
  WHERE r.operation_id=NEW.operation_id AND r.producer_kind IN ('register','rescan') AND r.reserved_units=2
   AND r.summary_job_id=NEW.summary_job_id AND r.summary_operation_id=NEW.summary_operation_id
   AND r.actor_id=done.actor_id AND r.student_id=done.student_id
   AND b.actor_id=done.actor_id AND b.student_id=done.student_id AND b.document_id=done.document_id
   AND b.object_id=done.object_id AND b.object_version=done.object_version AND b.storage_path=done.storage_path
   AND b.content_sha256=done.content_sha256 AND b.claim_at=done.claim_at AND b.claim_attempt=done.claim_attempt
   AND l.state='completed' AND l.operation_kind='summary' AND l.actor_id=done.actor_id
   AND j.status='completed' AND j.job_type='document_summary' AND j.locked_at IS NULL AND j.attempts=done.claim_attempt
   AND j.student_id=done.student_id AND j.triggered_by_user_id=done.actor_id
   AND j.result_payload->'_source'->>'document_id'=done.document_id::text
   AND j.result_payload->'_source'->>'object_id'=done.object_id::text AND j.result_payload->'_source'->>'object_version'=done.object_version
   AND j.result_payload->'_source'->>'content_sha256'=done.content_sha256
  FOR SHARE OF r,l,j
 ) THEN RAISE EXCEPTION 'The counted summary completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $summary_settlement_guard$;
CREATE TRIGGER document_capacity_summary_settlement_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_capacity_summary_settlements
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_capacity_summary_settlement();
CREATE FUNCTION public.settle_internal_document_summary_capacity(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $settle_summary_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=_operation_id) THEN
  RAISE EXCEPTION 'The counted summary completion cannot be repeated.' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.document_capacity_summary_settlements(operation_id,summary_job_id,summary_operation_id)
  SELECT operation_id,summary_job_id,summary_operation_id FROM public.document_capacity_reservations
  WHERE operation_id=_operation_id AND summary_job_id IS NOT NULL AND summary_operation_id IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'The counted summary completion could not be confirmed.' USING ERRCODE='55000'; END IF;
END; $settle_summary_capacity$;

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
  IF COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id WHERE r.actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id WHERE r.student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
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

REVOKE ALL ON FUNCTION public.lock_internal_document_capacity_completion(),public.guard_document_summary_completion_receipt(),
 public.guard_completed_document_summary_job(),public.guard_document_capacity_summary_settlement(),public.settle_internal_document_summary_capacity(uuid)
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) TO service_role;
COMMENT ON TABLE public.document_capacity_summary_settlements IS
 'Owner-internal immutable one-unit summary settlements require the exact atomic domain-completion receipt, finished operation, counted claim and retained job/source proof. Producer/Apply units and active/held/uncertain summaries stay counted. No expiry/reset/manual-held release, source-bound producer/worker hooks or hosted/provider authority.';
COMMIT;
