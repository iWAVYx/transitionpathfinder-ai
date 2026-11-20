-- REVIEW PROPOSAL ONLY; twelfth noncanonical/unapplied proposal.
-- Atomic private result, exact queued-summary identity and retained two-unit
-- transfer. No endpoint grants/wiring, scanner IO, finish/settlement or held release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $rescan_outcome_preflight$
DECLARE item record;role_name text;paused_state boolean;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_rescan_pending_receipt()','29807c2edbe76ea0c3d175e829828b72',false),
  ('public.guard_document_rescan_source_binding()','9cde41dda57eaaac0ac7aacb666e27a2',false),
  ('public.guard_unfinished_document_rescan()','5df6d295d63bfe0a3441e1050fef1212',true),
  ('public.guard_registered_document_summary_queue()','0bdef1bb3b14b5e0bb6f341e5464bbeb',true),
  ('public.guard_completed_document_summary_job()','a01db85f8c132ac05ac3a1227616278c',true),
  ('public.assert_internal_document_rescan_source(uuid,uuid,text,timestamptz)','535eec88a7abb5695252922280c3d01b',false),
  ('public.mark_internal_document_rescan_pending(uuid,uuid,uuid,text)','57f36c2761a64969624bc597a38f8b31',false),
  ('public.guard_document_capacity_reservation()','fd1a2d66f6a7c7e6a0b6f115a0b71b3a',false),
  ('public.queue_internal_document_capacity(uuid,uuid)','0435890175e2aeefe0af6fd93344e4f7',false),
  ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false)
 ) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Reviewed private rescan result prerequisites are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Private result execution drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES ('public.document_rescan_pending_receipts'),('public.document_rescan_source_bindings'),('public.document_capacity_reservations')) x(relation_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Reviewed private result tables are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private result table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.documents','set_updated_at_documents','public.set_updated_at()',19),
  ('public.documents','documents_guard_storage_binding','public.guard_document_storage_binding()',23),
  ('public.document_rescan_pending_receipts','document_rescan_pending_frozen','public.guard_document_rescan_pending_receipt()',31),
  ('public.document_rescan_source_bindings','document_rescan_source_frozen','public.guard_document_rescan_source_binding()',31),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()',31),
  ('public.ai_jobs','ai_jobs_guard_registered_document_summary','public.guard_registered_document_summary_queue()',31),
  ('public.ai_jobs','ai_jobs_guard_completed_document_summary','public.guard_completed_document_summary_job()',27)
 ) x(relation_name,trigger_name,signature,kind) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name) AND tgname=item.trigger_name
   AND tgfoid=to_regprocedure(item.signature) AND tgtype=item.kind AND tgenabled='O' AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Reviewed result trigger prerequisites are required.' USING ERRCODE='55000'; END IF;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Result review requires paused admission.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_rescan_pending_receipts) OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate result review.' USING ERRCODE='55000'; END IF;
END; $rescan_outcome_preflight$;
CREATE TABLE public.document_rescan_outcome_receipts (
 operation_id uuid PRIMARY KEY REFERENCES public.document_rescan_pending_receipts(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
 pending_revision timestamptz NOT NULL,outcome_revision timestamptz NOT NULL CHECK(outcome_revision>pending_revision),
 content_sha256 text NOT NULL CHECK(content_sha256~'^[a-f0-9]{64}$'),
 document_snapshot_sha256 text NOT NULL CHECK(document_snapshot_sha256~'^[a-f0-9]{64}$'),
 disposition text NOT NULL CHECK(disposition IN ('clean_queued','quarantined')),
 scan_id uuid NOT NULL,scanned_at timestamptz NOT NULL,threat_count integer NOT NULL CHECK(threat_count>=0),blocked_count integer NOT NULL CHECK(blocked_count>=0),
 summary_job_id uuid UNIQUE REFERENCES public.ai_jobs(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
 outcome_txid bigint NOT NULL DEFAULT txid_current(),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((disposition='quarantined')=(summary_job_id IS NULL)),CHECK((disposition='clean_queued' AND threat_count=0 AND blocked_count=0) OR (disposition='quarantined' AND threat_count>0))
);
ALTER TABLE public.document_rescan_outcome_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_rescan_outcome_receipts FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_document_rescan_outcome_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_outcome_guard$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;p public.document_rescan_pending_receipts%ROWTYPE;
 d public.documents%ROWTYPE;l public.document_operation_leases%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'This result is retained for review.' USING ERRCODE='42501'; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO b FROM public.document_rescan_source_bindings WHERE operation_id=NEW.operation_id FOR SHARE;
 IF NOT FOUND OR b.actor_id IS DISTINCT FROM NEW.actor_id OR b.document_id IS DISTINCT FROM NEW.document_id
  OR public.can_edit_student(NEW.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(NEW.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.document_rescan_pending_receipts WHERE operation_id=b.operation_id FOR SHARE;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id FOR UPDATE;
 IF NOT FOUND OR p.operation_id IS NULL OR p.actor_id IS DISTINCT FROM b.actor_id OR p.document_id IS DISTINCT FROM b.document_id
  OR p.source_revision IS DISTINCT FROM b.source_revision OR p.content_sha256 IS DISTINCT FROM b.content_sha256
  OR NEW.pending_revision IS DISTINCT FROM p.pending_revision OR NEW.outcome_revision IS DISTINCT FROM d.updated_at
  OR NEW.content_sha256 IS DISTINCT FROM b.content_sha256 OR NEW.document_snapshot_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex') OR NEW.outcome_txid<>txid_current()
  OR NOT EXISTS(SELECT 1 FROM public.documents WHERE id=d.id AND xmin::text::bigint=mod(txid_current(),4294967296))
  OR d.student_id IS DISTINCT FROM b.student_id OR d.upload_attempt_id IS DISTINCT FROM b.attempt_id OR d.storage_path IS DISTINCT FROM b.storage_path
  OR d.storage_object_id IS DISTINCT FROM b.object_id OR d.storage_object_version IS DISTINCT FROM b.object_version OR d.content_hash IS DISTINCT FROM b.content_sha256
  OR d.size_bytes IS DISTINCT FROM b.size_bytes OR d.mime_type IS DISTINCT FROM b.mime_type OR d.deleted_at IS NOT NULL
  OR d.scan_data_id IS DISTINCT FROM NEW.scan_id::text OR d.scanned_at IS DISTINCT FROM NEW.scanned_at
  OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive' OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256
  OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy' OR d.scan_verdict->'rescan_reviewed_copy' IS DISTINCT FROM 'true'::jsonb
  OR jsonb_typeof(d.scan_verdict->'threats') IS DISTINCT FROM 'array' OR jsonb_typeof(d.scan_verdict->'blocked_reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF jsonb_array_length(d.scan_verdict->'threats')<>NEW.threat_count OR jsonb_array_length(d.scan_verdict->'blocked_reasons')<>NEW.blocked_count THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR l.state IS DISTINCT FROM 'active' OR l.operation_kind IS DISTINCT FROM 'rescan' OR l.actor_id IS DISTINCT FROM b.actor_id
  OR c.actor_id IS DISTINCT FROM b.actor_id OR c.student_id IS DISTINCT FROM b.student_id OR c.producer_kind IS DISTINCT FROM 'rescan'
  OR c.reserved_units<>2 OR c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF NEW.disposition='clean_queued' THEN
  IF d.scan_status IS DISTINCT FROM 'clean' OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb
   OR d.review_status IS DISTINCT FROM 'pending_review' OR d.archived_at IS NOT NULL OR d.archived_by IS NOT NULL OR d.archive_reason IS NOT NULL THEN
   RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 ELSE
  IF d.scan_status IS DISTINCT FROM 'infected' OR d.scan_verdict->>'code' IS DISTINCT FROM 'infected' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'false'::jsonb
   OR d.review_status IS DISTINCT FROM 'rejected' OR d.archived_at IS DISTINCT FROM NEW.scanned_at OR d.archived_by IS DISTINCT FROM b.actor_id
   OR d.archive_reason IS DISTINCT FROM 'auto-quarantined by reviewed rescan' THEN
   RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 END IF;
 -- Historical completed summaries are allowed, but not reopened or new work.
 IF EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND lower(input_source->>'document_id')=b.document_id::text AND status<>'completed') THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $rescan_outcome_guard$;
CREATE TRIGGER document_rescan_outcome_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_rescan_outcome_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_rescan_outcome_receipt();

CREATE FUNCTION public.validate_internal_document_rescan_outcome(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $validate_rescan_outcome$
DECLARE r public.document_rescan_outcome_receipts%ROWTYPE;b public.document_rescan_source_bindings%ROWTYPE;
 c public.document_capacity_reservations%ROWTYPE;j public.ai_jobs%ROWTYPE;d public.documents%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO r FROM public.document_rescan_outcome_receipts WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO b FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id FOR SHARE;
 IF NOT FOUND OR r.operation_id IS NULL OR c.operation_id IS NULL OR r.outcome_txid<>txid_current()
  OR d.updated_at IS DISTINCT FROM r.outcome_revision OR d.content_hash IS DISTINCT FROM r.content_sha256
  OR encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex') IS DISTINCT FROM r.document_snapshot_sha256
  OR public.can_edit_student(r.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(r.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(r.actor_id) IS DISTINCT FROM false
  OR NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE operation_id=_operation_id AND state='active' AND actor_id=r.actor_id AND operation_kind='rescan') THEN
  RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF d.student_id IS DISTINCT FROM b.student_id OR d.upload_attempt_id IS DISTINCT FROM b.attempt_id
  OR d.storage_path IS DISTINCT FROM b.storage_path OR d.storage_object_id IS DISTINCT FROM b.object_id OR d.storage_object_version IS DISTINCT FROM b.object_version
  OR d.size_bytes IS DISTINCT FROM b.size_bytes OR d.mime_type IS DISTINCT FROM b.mime_type OR d.deleted_at IS NOT NULL
  OR d.scan_data_id IS DISTINCT FROM r.scan_id::text OR d.scanned_at IS DISTINCT FROM r.scanned_at
  OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive' OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256
  OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy' OR d.scan_verdict->'rescan_reviewed_copy' IS DISTINCT FROM 'true'::jsonb
  OR jsonb_typeof(d.scan_verdict->'threats') IS DISTINCT FROM 'array' OR jsonb_typeof(d.scan_verdict->'blocked_reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF jsonb_array_length(d.scan_verdict->'threats')<>r.threat_count OR jsonb_array_length(d.scan_verdict->'blocked_reasons')<>r.blocked_count THEN
  RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF r.disposition='clean_queued' THEN
  IF d.scan_status IS DISTINCT FROM 'clean' OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb
   OR d.review_status IS DISTINCT FROM 'pending_review' OR d.archived_at IS NOT NULL OR d.archived_by IS NOT NULL OR d.archive_reason IS NOT NULL THEN
   RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=r.summary_job_id FOR SHARE;
  IF NOT FOUND OR c.summary_job_id IS DISTINCT FROM j.id OR c.summary_operation_id IS NOT NULL OR j.job_type IS DISTINCT FROM 'document_summary'
   OR j.status IS DISTINCT FROM 'queued' OR j.attempts<>0 OR j.locked_at IS NOT NULL OR j.result_id IS NOT NULL OR j.result_payload IS NOT NULL OR j.error_message IS NOT NULL
   OR j.triggered_by_user_id IS DISTINCT FROM r.actor_id OR j.student_id IS DISTINCT FROM b.student_id
   OR j.input_source IS DISTINCT FROM jsonb_build_object('document_id',b.document_id,'storage_path',b.storage_path) THEN
   RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
 ELSE
  IF d.scan_status IS DISTINCT FROM 'infected' OR d.scan_verdict->>'code' IS DISTINCT FROM 'infected' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'false'::jsonb
   OR d.review_status IS DISTINCT FROM 'rejected' OR d.archived_at IS DISTINCT FROM r.scanned_at OR d.archived_by IS DISTINCT FROM r.actor_id
   OR d.archive_reason IS DISTINCT FROM 'auto-quarantined by reviewed rescan' THEN
   RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
  IF c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL THEN RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND lower(input_source->>'document_id')=b.document_id::text
  AND status<>'completed' AND id IS DISTINCT FROM r.summary_job_id) THEN
  RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
END; $validate_rescan_outcome$;
CREATE FUNCTION public.check_document_rescan_outcome_commit()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_commit_check$
BEGIN
 PERFORM public.validate_internal_document_rescan_outcome(NEW.operation_id);
 RETURN NEW;
END; $rescan_commit_check$;
-- The receipt records the chosen job before it can be inserted, allowing the
-- common queue guard to admit only that job. Commit cannot retain half a handoff.
CREATE CONSTRAINT TRIGGER document_rescan_outcome_committed AFTER INSERT ON public.document_rescan_outcome_receipts
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_document_rescan_outcome_commit();

CREATE FUNCTION public.guard_rescan_document_summary_queue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $rescan_queue_guard$
DECLARE document_key text;
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.job_type<>'document_summary' THEN RETURN NEW; END IF;
  PERFORM public.lock_internal_document_capacity_completion();
  -- Permission refusal precedes private receipt lookup and stays generic.
  IF (auth.uid() IS NOT NULL AND NEW.triggered_by_user_id IS DISTINCT FROM auth.uid()) OR public.is_partner_only(NEW.triggered_by_user_id) IS DISTINCT FROM false
   OR public.can_edit_student(NEW.triggered_by_user_id,NEW.student_id) IS DISTINCT FROM true
   OR NOT EXISTS(SELECT 1 FROM public.documents WHERE id::text=lower(NEW.input_source->>'document_id') AND student_id=NEW.student_id
    AND public.can_view_document(NEW.triggered_by_user_id,id) IS TRUE) THEN
   RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501'; END IF;
  document_key:=lower(NEW.input_source->>'document_id');
  IF EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE document_id::text=document_key) AND NOT EXISTS(
   SELECT 1 FROM public.document_rescan_outcome_receipts r JOIN public.document_rescan_source_bindings b USING(operation_id)
   JOIN public.document_operation_leases l USING(operation_id) WHERE r.document_id::text=document_key AND r.disposition='clean_queued'
    AND r.summary_job_id=NEW.id AND r.outcome_txid=txid_current() AND r.actor_id=NEW.triggered_by_user_id AND b.student_id=NEW.student_id
    AND NEW.input_source=jsonb_build_object('document_id',b.document_id,'storage_path',b.storage_path) AND l.state='active') THEN
   RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='UPDATE' AND NEW.job_type='document_summary' AND
  (NEW.id IS DISTINCT FROM OLD.id OR NEW.job_type IS DISTINCT FROM OLD.job_type OR NEW.student_id IS DISTINCT FROM OLD.student_id
   OR NEW.triggered_by_user_id IS DISTINCT FROM OLD.triggered_by_user_id OR NEW.input_source IS DISTINCT FROM OLD.input_source) THEN
  PERFORM public.lock_internal_document_capacity_completion();
  IF (auth.uid() IS NOT NULL AND NEW.triggered_by_user_id IS DISTINCT FROM auth.uid()) OR public.is_partner_only(NEW.triggered_by_user_id) IS DISTINCT FROM false
   OR public.can_edit_student(NEW.triggered_by_user_id,NEW.student_id) IS DISTINCT FROM true
   OR NOT EXISTS(SELECT 1 FROM public.documents WHERE id::text=lower(NEW.input_source->>'document_id') AND student_id=NEW.student_id
    AND public.can_view_document(NEW.triggered_by_user_id,id) IS TRUE) THEN
   RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE document_id::text=lower(NEW.input_source->>'document_id')) THEN
   RAISE EXCEPTION 'This summary request could not be confirmed.' USING ERRCODE='42501'; END IF;
 END IF;
 IF OLD.job_type='document_summary' AND EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE document_id::text=lower(OLD.input_source->>'document_id')) THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'The reviewed summary source is retained.' USING ERRCODE='42501'; END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.job_type IS DISTINCT FROM OLD.job_type OR NEW.student_id IS DISTINCT FROM OLD.student_id
   OR NEW.triggered_by_user_id IS DISTINCT FROM OLD.triggered_by_user_id OR NEW.input_source IS DISTINCT FROM OLD.input_source
   OR (OLD.status='completed' AND (to_jsonb(NEW)-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'updated_at')) THEN
   RAISE EXCEPTION 'The reviewed summary source is retained.' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $rescan_queue_guard$;
CREATE TRIGGER ai_jobs_guard_rescan_document_summary BEFORE INSERT OR UPDATE OR DELETE ON public.ai_jobs
 FOR EACH ROW EXECUTE FUNCTION public.guard_rescan_document_summary_queue();

CREATE FUNCTION public.persist_internal_document_rescan_result(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_scan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $persist_rescan_result$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;p public.document_rescan_pending_receipts%ROWTYPE;l public.document_operation_leases%ROWTYPE;
 before_row public.documents%ROWTYPE;after_row public.documents%ROWTYPE;r public.document_rescan_outcome_receipts%ROWTYPE;
 job public.ai_jobs%ROWTYPE;disposition text;job_id uuid;scan_id uuid;stamp timestamptz:=clock_timestamp();verdict jsonb;written integer;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO p FROM public.document_rescan_pending_receipts WHERE operation_id=_operation_id FOR SHARE;
 b:=public.assert_internal_document_rescan_source(_operation_id,_actor_id,'pending',p.pending_revision);
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=_operation_id FOR UPDATE;
 IF _receipt_id IS NULL OR l.receipt_id IS DISTINCT FROM _receipt_id OR p.actor_id IS DISTINCT FROM b.actor_id OR p.document_id IS DISTINCT FROM b.document_id
  OR p.content_sha256 IS DISTINCT FROM b.content_sha256 OR EXISTS(SELECT 1 FROM public.document_rescan_outcome_receipts WHERE operation_id=_operation_id)
  OR jsonb_typeof(_scan) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF (_scan-ARRAY['ok','code','provider','scan_id','clean_result','threats','blocked_reasons'])<>'{}'::jsonb
  OR _scan->>'provider' IS DISTINCT FROM 'cloudmersive' OR COALESCE(_scan->>'scan_id','')!~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
  OR jsonb_typeof(_scan->'threats') IS DISTINCT FROM 'array' OR jsonb_typeof(_scan->'blocked_reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(_scan->'threats') x WHERE jsonb_typeof(x)<>'string' OR char_length(btrim(x#>>'{}')) NOT BETWEEN 1 AND 200)
  OR EXISTS(SELECT 1 FROM jsonb_array_elements(_scan->'blocked_reasons') x WHERE jsonb_typeof(x)<>'string' OR char_length(btrim(x#>>'{}')) NOT BETWEEN 1 AND 200) THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF _scan->'ok'='true'::jsonb AND _scan->>'code'='clean' AND _scan->'clean_result'='true'::jsonb
  AND _scan->'threats'='[]'::jsonb AND _scan->'blocked_reasons'='[]'::jsonb THEN disposition:='clean_queued';job_id:=gen_random_uuid();
 ELSIF _scan->'ok'='false'::jsonb AND _scan->>'code'='infected' AND _scan->'clean_result'='false'::jsonb AND jsonb_array_length(_scan->'threats')>0 THEN disposition:='quarantined';
 ELSE RAISE EXCEPTION 'This result needs confirmation before further work.' USING ERRCODE='42501'; END IF;
 scan_id:=(_scan->>'scan_id')::uuid;
 verdict:=jsonb_build_object('code',_scan->>'code','provider','cloudmersive','clean_result',_scan->'clean_result','threats',_scan->'threats','blocked_reasons',_scan->'blocked_reasons',
  'content_sha256',b.content_sha256,'source','registration_reviewed_copy','rescan_reviewed_copy',true,'retry',true);
 SELECT * INTO before_row FROM public.documents WHERE id=b.document_id;
 UPDATE public.documents SET scan_status=CASE WHEN disposition='clean_queued' THEN 'clean' ELSE 'infected' END,scan_verdict=verdict,scan_data_id=scan_id::text,scanned_at=stamp,
  review_status=CASE WHEN disposition='clean_queued' THEN 'pending_review' ELSE 'rejected' END,
  archived_at=CASE WHEN disposition='quarantined' THEN stamp ELSE NULL END,archived_by=CASE WHEN disposition='quarantined' THEN b.actor_id ELSE NULL END,
  archive_reason=CASE WHEN disposition='quarantined' THEN 'auto-quarantined by reviewed rescan' ELSE NULL END
 WHERE id=b.document_id AND scan_status='pending' AND updated_at=p.pending_revision RETURNING * INTO after_row;
 IF NOT FOUND OR after_row.updated_at<=p.pending_revision OR after_row.scan_verdict IS DISTINCT FROM verdict
  OR (to_jsonb(before_row)-ARRAY['scan_status','scan_verdict','scan_data_id','scanned_at','review_status','archived_at','archived_by','archive_reason','updated_at']) IS DISTINCT FROM
     (to_jsonb(after_row)-ARRAY['scan_status','scan_verdict','scan_data_id','scanned_at','review_status','archived_at','archived_by','archive_reason','updated_at']) THEN
  RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 INSERT INTO public.document_rescan_outcome_receipts(operation_id,actor_id,document_id,pending_revision,outcome_revision,content_sha256,document_snapshot_sha256,disposition,scan_id,scanned_at,threat_count,blocked_count,summary_job_id)
 VALUES(b.operation_id,b.actor_id,b.document_id,p.pending_revision,after_row.updated_at,b.content_sha256,encode(sha256(convert_to(to_jsonb(after_row)::text,'UTF8')),'hex'),disposition,scan_id,stamp,jsonb_array_length(_scan->'threats'),jsonb_array_length(_scan->'blocked_reasons'),job_id) RETURNING * INTO r;
 IF NOT FOUND OR r.operation_id IS DISTINCT FROM b.operation_id OR r.actor_id IS DISTINCT FROM b.actor_id OR r.document_id IS DISTINCT FROM b.document_id
  OR r.pending_revision IS DISTINCT FROM p.pending_revision OR r.outcome_revision IS DISTINCT FROM after_row.updated_at OR r.content_sha256 IS DISTINCT FROM b.content_sha256
  OR r.document_snapshot_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(after_row)::text,'UTF8')),'hex')
  OR r.disposition IS DISTINCT FROM disposition OR r.scan_id IS DISTINCT FROM scan_id OR r.scanned_at IS DISTINCT FROM stamp
  OR r.threat_count<>jsonb_array_length(_scan->'threats') OR r.blocked_count<>jsonb_array_length(_scan->'blocked_reasons')
  OR r.summary_job_id IS DISTINCT FROM job_id OR r.outcome_txid<>txid_current() THEN RAISE EXCEPTION 'This result could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF job_id IS NOT NULL THEN
  INSERT INTO public.ai_jobs(id,student_id,triggered_by_user_id,job_type,status,input_source) VALUES(job_id,b.student_id,b.actor_id,'document_summary','queued',jsonb_build_object('document_id',b.document_id,'storage_path',b.storage_path)) RETURNING * INTO job;
  IF NOT FOUND OR job.id IS DISTINCT FROM job_id THEN RAISE EXCEPTION 'This result and queue could not be confirmed.' USING ERRCODE='42501'; END IF;
  PERFORM public.queue_internal_document_capacity(b.operation_id,job_id);
 END IF;
 PERFORM public.validate_internal_document_rescan_outcome(b.operation_id);
 RETURN jsonb_build_object('schema','document-rescan-outcome-v1','operation_id',b.operation_id,'document_id',b.document_id,'disposition',disposition,'outcome_revision',r.outcome_revision,'summary_job_id',job_id);
END; $persist_rescan_result$;

-- Preserve existing owners, grants and validation; only existing transfer UPDATE
-- uses the completion fence. Fresh reservation INSERT still requires admission.
CREATE OR REPLACE FUNCTION public.guard_document_capacity_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $capacity_guard$
DECLARE policy public.document_capacity_policy%ROWTYPE; lease public.document_operation_leases%ROWTYPE;
 control_revision bigint; binding public.document_summary_operation_bindings%ROWTYPE; j public.ai_jobs%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tracked capacity cannot be removed.' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN control_revision:=public.lock_internal_document_capacity();
 ELSE PERFORM public.lock_internal_document_capacity_completion(); END IF;
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
CREATE OR REPLACE FUNCTION public.queue_internal_document_capacity(_operation_id uuid,_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $queue_capacity$
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF _job_id IS NULL THEN RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501'; END IF;
 UPDATE public.document_capacity_reservations SET summary_job_id=_job_id
  WHERE operation_id=_operation_id AND summary_job_id IS NULL AND producer_kind IN ('register','rescan');
 IF NOT FOUND THEN RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501'; END IF;
END; $queue_capacity$;
REVOKE ALL ON FUNCTION public.guard_document_rescan_outcome_receipt(),public.validate_internal_document_rescan_outcome(uuid),
 public.check_document_rescan_outcome_commit(),public.guard_rescan_document_summary_queue(),public.persist_internal_document_rescan_result(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.document_rescan_outcome_receipts IS 'Private immutable exact rescan outcome and counted job metadata; deferred commit check forbids half handoffs. Local scan correlation is not provider/cancellation or physical-copy proof. Completed historical summaries remain frozen. All units remain counted; no rescan finish/settlement, ordinary execution, endpoint wiring, held reconciliation or activation.';
COMMIT;
