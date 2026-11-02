-- REVIEW PROPOSAL ONLY; thirteenth noncanonical/unapplied proposal.
-- Exact private rescan finish receipt and producer-only settlement. No ordinary
-- execution/source hooks, held release, IO, selected limits or hosted activation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $rescan_settlement_preflight$
DECLARE item record;role_name text;admission_owner oid;paused_state boolean;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_rescan_source_binding()','9cde41dda57eaaac0ac7aacb666e27a2',false),
  ('public.guard_document_rescan_pending_receipt()','29807c2edbe76ea0c3d175e829828b72',false),
  ('public.guard_document_registration_completion_receipt()','47defe9db1ab2e654d178d25e8dcb199',false),
  ('public.guard_document_summary_completion_receipt()','bce8b9ca58259f9b3f237d79f4167069',false),
  ('public.guard_completed_document_summary_job()','a01db85f8c132ac05ac3a1227616278c',true),
  ('public.guard_document_summary_operation_binding()','b049daec1448ce2bc28812c4588c8b97',true),
  ('public.guard_registered_document_summary_queue()','0bdef1bb3b14b5e0bb6f341e5464bbeb',true),
  ('public.guard_document_rescan_outcome_receipt()','8b0ea9df1b8c345c01ecc3ee431328c9',false),
  ('public.validate_internal_document_rescan_outcome(uuid)','5566056a58c43008264d5050e8a1234f',false),
  ('public.check_document_rescan_outcome_commit()','1af8dd3b1338f86104829e80be091c29',false),
  ('public.guard_rescan_document_summary_queue()','87ae8af9a7d7b2b7f30c0f2b5c106112',true),
  ('public.persist_internal_document_rescan_result(uuid,uuid,uuid,jsonb)','d1c35df9ea20a3416f3fbc2b93e881b5',false),
  ('public.guard_document_capacity_reservation()','8f98320cb463e998142eca029a46ae38',false),
  ('public.queue_internal_document_capacity(uuid,uuid)','ad5e04be560b2b4b364031581e886b4b',false),
  ('public.guard_unfinished_document_rescan()','5df6d295d63bfe0a3441e1050fef1212',true)
 ) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Reviewed rescan completion prerequisites are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Private rescan completion permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 IF admission_owner IN ('anon'::regrole::oid,'authenticated'::regrole::oid,'service_role'::regrole::oid)
  OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_operation_leases'::regclass AND relowner=admission_owner)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure AND proowner=admission_owner
   AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='e17e9ae509adc829e867f9723a15748d')
  OR has_function_privilege('anon','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE')
  OR has_function_privilege('authenticated','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE')
  OR NOT has_function_privilege('service_role','public.finish_document_operation(uuid,uuid,uuid,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed admission finish ownership and permissions are required.' USING ERRCODE='55000'; END IF;
 IF current_user::regrole::oid<>admission_owner AND NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper)
  AND (NOT pg_has_role(session_user::regrole::oid,admission_owner,'MEMBER') OR NOT has_schema_privilege(admission_owner,'public'::regnamespace::oid,'CREATE')) THEN
  RAISE EXCEPTION 'Use an authorized owner/admin session for completion installation.' USING ERRCODE='55000'; END IF;
 -- Exercise the exact existing trusted row-lock authority without reading data.
 PERFORM 1 FROM public.document_operation_leases WHERE false FOR SHARE;
 FOR item IN SELECT * FROM (VALUES ('public.document_rescan_outcome_receipts'),('public.document_rescan_pending_receipts'),('public.document_rescan_source_bindings'),('public.document_capacity_reservations'),('public.document_registration_completion_receipts'),('public.document_summary_completion_receipts'),('public.document_capacity_summary_settlements'),('public.document_capacity_registration_settlements'),('public.document_summary_operation_bindings')) x(relation_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Reviewed private completion tables are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private completion table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.document_rescan_source_bindings','document_rescan_source_frozen','public.guard_document_rescan_source_binding()',31,false),
  ('public.document_rescan_pending_receipts','document_rescan_pending_frozen','public.guard_document_rescan_pending_receipt()',31,false),
  ('public.document_rescan_outcome_receipts','document_rescan_outcome_frozen','public.guard_document_rescan_outcome_receipt()',31,false),
  ('public.document_rescan_outcome_receipts','document_rescan_outcome_committed','public.check_document_rescan_outcome_commit()',5,true),
  ('public.document_operation_leases','document_rescan_no_false_finish','public.guard_unfinished_document_rescan()',19,false),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()',31,false),
  ('public.document_registration_completion_receipts','document_registration_completion_frozen','public.guard_document_registration_completion_receipt()',31,false),
  ('public.document_summary_completion_receipts','summary_completion_receipt_frozen','public.guard_document_summary_completion_receipt()',31,false),
  ('public.ai_jobs','ai_jobs_guard_rescan_document_summary','public.guard_rescan_document_summary_queue()',31,false),
  ('public.ai_jobs','ai_jobs_guard_completed_document_summary','public.guard_completed_document_summary_job()',27,false)
 ) x(relation_name,trigger_name,signature,kind,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name) AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature)
   AND tgtype=item.kind AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred) THEN
   RAISE EXCEPTION 'Reviewed rescan completion trigger safeguards are required.' USING ERRCODE='55000'; END IF;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Completion review requires paused admission.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review')) OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR EXISTS(SELECT 1 FROM public.document_rescan_outcome_receipts) OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate completion review.' USING ERRCODE='55000'; END IF;
END; $rescan_settlement_preflight$;
CREATE TABLE public.document_rescan_completion_receipts (
 operation_id uuid PRIMARY KEY REFERENCES public.document_rescan_outcome_receipts(operation_id) ON DELETE RESTRICT,
 proof jsonb NOT NULL CHECK(jsonb_typeof(proof)='object'),operation_finished_at timestamptz NOT NULL,
 completion_txid bigint NOT NULL DEFAULT txid_current(),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.document_capacity_rescan_settlements (
 operation_id uuid PRIMARY KEY REFERENCES public.document_rescan_completion_receipts(operation_id) ON DELETE RESTRICT,
 released_units integer NOT NULL CHECK(released_units IN (1,2)),settled_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.document_rescan_completion_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_capacity_rescan_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_rescan_completion_receipts,public.document_capacity_rescan_settlements FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.read_internal_document_rescan_completion(_operation_id uuid,_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_completion_source$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;p public.document_rescan_pending_receipts%ROWTYPE;o public.document_rescan_outcome_receipts%ROWTYPE;
 a public.document_upload_attempts%ROWTYPE;origin public.document_upload_operation_bindings%ROWTYPE;d public.documents%ROWTYPE;
 l public.document_operation_leases%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;j public.ai_jobs%ROWTYPE;
 worker public.document_operation_leases%ROWTYPE;binding public.document_summary_operation_bindings%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO b FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id FOR SHARE;
 IF NOT FOUND OR public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(b.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'This rescan completion could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO o FROM public.document_rescan_outcome_receipts WHERE operation_id=_operation_id FOR SHARE;
 IF NOT FOUND OR _state IS NULL OR _state NOT IN ('active','completed') OR l.state IS DISTINCT FROM _state OR l.actor_id IS DISTINCT FROM b.actor_id
  OR l.operation_kind IS DISTINCT FROM 'rescan' OR (_state='completed' AND l.finished_at IS NULL)
  OR c.actor_id IS DISTINCT FROM b.actor_id OR c.student_id IS DISTINCT FROM b.student_id OR c.producer_kind IS DISTINCT FROM 'rescan' OR c.reserved_units<>2
  OR o.actor_id IS DISTINCT FROM b.actor_id OR o.document_id IS DISTINCT FROM b.document_id OR o.content_sha256 IS DISTINCT FROM b.content_sha256 OR o.outcome_txid=txid_current() THEN
  RAISE EXCEPTION 'This rescan needs exact saved completion evidence.' USING ERRCODE='55000'; END IF;
 SELECT * INTO p FROM public.document_rescan_pending_receipts WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=b.attempt_id FOR SHARE;
 SELECT * INTO origin FROM public.document_upload_operation_bindings WHERE attempt_id=b.attempt_id FOR SHARE;
 IF NOT FOUND OR p.actor_id IS DISTINCT FROM b.actor_id OR p.document_id IS DISTINCT FROM b.document_id OR p.source_revision IS DISTINCT FROM b.source_revision
  OR p.content_sha256 IS DISTINCT FROM b.content_sha256 OR p.pending_revision IS DISTINCT FROM o.pending_revision OR o.outcome_revision<=p.pending_revision
  OR a.state IS DISTINCT FROM 'registered' OR a.registered_document_id IS DISTINCT FROM b.document_id OR a.student_id IS DISTINCT FROM b.student_id
  OR a.actor_id IS DISTINCT FROM origin.actor_id OR origin.student_id IS DISTINCT FROM b.student_id OR origin.operation_id IS DISTINCT FROM b.registration_operation_id
  OR a.storage_path IS DISTINCT FROM b.storage_path OR origin.storage_path IS DISTINCT FROM b.storage_path OR a.claimed_content_sha256 IS DISTINCT FROM b.content_sha256
  OR origin.registration_claimed_at IS NULL OR origin.content_sha256 IS DISTINCT FROM b.content_sha256 OR origin.review_context_sha256 IS DISTINCT FROM a.review_context_sha256
  OR origin.claimed_object_id IS DISTINCT FROM b.object_id OR origin.claimed_object_version IS DISTINCT FROM b.object_version
  OR NOT EXISTS(SELECT 1 FROM public.document_registration_completion_receipts done JOIN public.document_operation_leases reg ON reg.operation_id=done.operation_id
    WHERE done.operation_id=b.registration_operation_id AND done.operation_finished_at=reg.finished_at AND reg.state='completed' AND reg.operation_kind='register'
     AND reg.actor_id=a.actor_id AND done.actor_id=a.actor_id AND done.student_id=b.student_id AND done.attempt_id=a.id AND done.document_id=b.document_id
     AND done.disposition='clean_queued' AND done.object_id=b.object_id AND done.object_version=b.object_version AND done.storage_path=b.storage_path
     AND done.content_sha256=b.content_sha256 AND done.review_context_sha256=a.review_context_sha256) THEN
  RAISE EXCEPTION 'This rescan needs exact saved completion evidence.' USING ERRCODE='55000'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id FOR SHARE;
 IF NOT FOUND OR d.student_id IS DISTINCT FROM b.student_id OR d.upload_attempt_id IS DISTINCT FROM b.attempt_id OR d.uploaded_by IS DISTINCT FROM a.actor_id
  OR d.upload_review_context_sha256 IS DISTINCT FROM a.review_context_sha256 OR d.storage_path IS DISTINCT FROM b.storage_path
  OR d.storage_object_id IS DISTINCT FROM b.object_id OR d.storage_object_version IS DISTINCT FROM b.object_version OR d.content_hash IS DISTINCT FROM b.content_sha256
  OR d.size_bytes IS DISTINCT FROM b.size_bytes OR d.mime_type IS DISTINCT FROM b.mime_type OR d.deleted_at IS NOT NULL
  OR d.scan_data_id IS DISTINCT FROM o.scan_id::text OR d.scanned_at IS DISTINCT FROM o.scanned_at OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive'
  OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256 OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy'
  OR d.scan_verdict->'rescan_reviewed_copy' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(d.scan_verdict->'threats') IS DISTINCT FROM 'array'
  OR jsonb_typeof(d.scan_verdict->'blocked_reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='55000'; END IF;
 IF jsonb_array_length(d.scan_verdict->'threats')<>o.threat_count OR jsonb_array_length(d.scan_verdict->'blocked_reasons')<>o.blocked_count THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='55000'; END IF;
 PERFORM 1 FROM storage.objects s WHERE s.id=b.object_id AND s.bucket_id='student-documents' AND s.name=b.storage_path
  AND to_jsonb(s)->>'owner_id'=a.actor_id::text AND to_jsonb(s)->>'version'=b.object_version AND s.metadata->'size'=to_jsonb(b.size_bytes)
  AND s.metadata->>'mimetype' ~* '^text/plain([;][[:space:]]*charset[[:space:]]*=[[:space:]]*(utf-8|us-ascii))?$' FOR SHARE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.document_rescan_source_bindings other JOIN public.document_operation_leases work USING(operation_id)
   WHERE other.document_id=b.document_id AND other.operation_id<>b.operation_id AND work.state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_operation_leases work WHERE operation_kind='rescan' AND state IN ('active','needs_review') AND operation_id<>b.operation_id
   AND NOT EXISTS(SELECT 1 FROM public.document_rescan_source_bindings known WHERE known.operation_id=work.operation_id)) THEN
  RAISE EXCEPTION 'This rescan source needs separate review.' USING ERRCODE='55000'; END IF;
 IF o.disposition='quarantined' THEN
  IF d.scan_status IS DISTINCT FROM 'infected' OR d.scan_verdict->>'code' IS DISTINCT FROM 'infected' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'false'::jsonb
   OR o.threat_count<=0 OR d.review_status IS DISTINCT FROM 'rejected' OR d.archived_at IS DISTINCT FROM o.scanned_at OR d.archived_by IS DISTINCT FROM b.actor_id
   OR d.archive_reason IS DISTINCT FROM 'auto-quarantined by reviewed rescan' OR c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL
   OR o.summary_job_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=b.operation_id)
   OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND lower(input_source->>'document_id')=b.document_id::text AND status<>'completed') THEN
   RAISE EXCEPTION 'This rescan quarantine could not be confirmed.' USING ERRCODE='55000'; END IF;
 ELSE
  IF d.scan_status IS DISTINCT FROM 'clean' OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb
   OR o.threat_count<>0 OR o.blocked_count<>0 OR d.archived_at IS NOT NULL OR NULLIF(btrim(d.review_status),'') IS NULL OR d.review_status='rejected'
   OR c.summary_job_id IS DISTINCT FROM o.summary_job_id OR o.summary_job_id IS NULL THEN
   RAISE EXCEPTION 'This rescan clean result could not be confirmed.' USING ERRCODE='55000'; END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=o.summary_job_id FOR SHARE;
  IF NOT FOUND OR j.job_type IS DISTINCT FROM 'document_summary' OR j.student_id IS DISTINCT FROM b.student_id OR j.triggered_by_user_id IS DISTINCT FROM b.actor_id
   OR j.input_source IS DISTINCT FROM jsonb_build_object('document_id',b.document_id,'storage_path',b.storage_path) THEN
   RAISE EXCEPTION 'This rescan queue could not be confirmed.' USING ERRCODE='55000'; END IF;
  IF c.summary_operation_id IS NULL THEN
   IF j.status IS DISTINCT FROM 'queued' OR j.locked_at IS NOT NULL OR j.attempts<>0 OR j.result_id IS NOT NULL OR j.result_payload IS NOT NULL OR j.error_message IS NOT NULL THEN
    RAISE EXCEPTION 'This rescan queue needs separate review.' USING ERRCODE='55000'; END IF;
  ELSE
   SELECT * INTO binding FROM public.document_summary_operation_bindings WHERE job_id=j.id AND operation_id=c.summary_operation_id FOR SHARE;
   SELECT * INTO worker FROM public.document_operation_leases WHERE operation_id=c.summary_operation_id FOR SHARE;
   IF NOT FOUND OR binding.job_id IS NULL OR binding.actor_id IS DISTINCT FROM b.actor_id OR binding.student_id IS DISTINCT FROM b.student_id OR binding.document_id IS DISTINCT FROM b.document_id
    OR binding.storage_path IS DISTINCT FROM b.storage_path OR binding.object_id IS DISTINCT FROM b.object_id OR binding.object_version IS DISTINCT FROM b.object_version
    OR binding.content_sha256 IS DISTINCT FROM b.content_sha256 OR worker.actor_id IS DISTINCT FROM b.actor_id OR worker.operation_kind IS DISTINCT FROM 'summary'
    OR j.attempts IS DISTINCT FROM binding.claim_attempt THEN RAISE EXCEPTION 'This rescan worker needs separate review.' USING ERRCODE='55000'; END IF;
   IF j.status='processing' AND worker.state IN ('active','needs_review') AND j.locked_at=binding.claim_at THEN NULL;
   ELSIF j.status='needs_review' AND worker.state='needs_review' AND (j.locked_at IS NULL OR j.locked_at=binding.claim_at) THEN NULL;
   ELSIF j.status='completed' AND worker.state IN ('active','completed','needs_review') AND j.locked_at IS NULL
    AND EXISTS(SELECT 1 FROM public.document_summary_completion_receipts done WHERE done.job_id=j.id AND done.operation_id=worker.operation_id
     AND done.actor_id=b.actor_id AND done.student_id=b.student_id AND done.document_id=b.document_id AND done.object_id=b.object_id
     AND done.object_version=b.object_version AND done.storage_path=b.storage_path AND done.content_sha256=b.content_sha256
     AND done.claim_at=binding.claim_at AND done.claim_attempt=binding.claim_attempt
     AND j.result_payload->'_source'->>'document_id'=b.document_id::text AND j.result_payload->'_source'->>'object_id'=b.object_id::text
     AND j.result_payload->'_source'->>'object_version'=b.object_version AND j.result_payload->'_source'->>'content_sha256'=b.content_sha256) THEN NULL;
   ELSE RAISE EXCEPTION 'This rescan worker needs separate review.' USING ERRCODE='55000'; END IF;
  END IF;
 END IF;
 IF public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(b.actor_id,b.document_id) IS DISTINCT FROM true OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan completion could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- The twelfth-stage full-row snapshot is a commit-time witness only. Benign
 -- later metadata/derived-result updates do not change this immutable file tuple.
 RETURN jsonb_build_object('operation_id',b.operation_id,'actor_id',b.actor_id,'student_id',b.student_id,'document_id',b.document_id,'attempt_id',b.attempt_id,
  'object_id',b.object_id,'object_version',b.object_version,'storage_path',b.storage_path,'content_sha256',b.content_sha256,'size_bytes',b.size_bytes,'mime_type',b.mime_type,
  'source_revision',to_char(b.source_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'pending_revision',to_char(p.pending_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'outcome_revision',to_char(o.outcome_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'scan_id',o.scan_id,'scanned_at',to_char(o.scanned_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'disposition',o.disposition,'summary_job_id',o.summary_job_id,'operation_finished_at',to_char(l.finished_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
END; $rescan_completion_source$;
CREATE FUNCTION public.guard_document_rescan_completion_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_completion_guard$
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'This rescan completion is retained.' USING ERRCODE='42501'; END IF;
 IF NEW.proof IS DISTINCT FROM public.read_internal_document_rescan_completion(NEW.operation_id,'completed') OR NEW.completion_txid<>txid_current()
  OR NEW.operation_finished_at IS DISTINCT FROM (NEW.proof->>'operation_finished_at')::timestamptz
  OR NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE operation_id=NEW.operation_id AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'This rescan completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $rescan_completion_guard$;
CREATE TRIGGER document_rescan_completion_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_rescan_completion_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_rescan_completion_receipt();
CREATE FUNCTION public.record_internal_document_rescan_completion(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $record_rescan_completion$
DECLARE outcome jsonb;stored public.document_rescan_completion_receipts%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id) THEN RETURN; END IF;
 outcome:=public.read_internal_document_rescan_completion(_operation_id,'completed');
 INSERT INTO public.document_rescan_completion_receipts(operation_id,proof,operation_finished_at)
 VALUES(_operation_id,outcome,(outcome->>'operation_finished_at')::timestamptz) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM _operation_id OR stored.proof IS DISTINCT FROM outcome
  OR stored.operation_finished_at IS DISTINCT FROM (outcome->>'operation_finished_at')::timestamptz OR stored.completion_txid<>txid_current() THEN
  RAISE EXCEPTION 'This rescan completion was not saved.' USING ERRCODE='55000'; END IF;
END; $record_rescan_completion$;
CREATE OR REPLACE FUNCTION public.guard_unfinished_document_rescan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $rescan_no_false_finish$
BEGIN
 IF NEW.state='completed' AND EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE operation_id=OLD.operation_id) THEN
  IF OLD.state IS DISTINCT FROM 'active' OR NEW.finished_at IS NULL OR (to_jsonb(NEW)-ARRAY['state','finished_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','finished_at']) THEN
   RAISE EXCEPTION 'This rescan needs exact completion evidence.' USING ERRCODE='55000'; END IF;
  PERFORM public.read_internal_document_rescan_completion(OLD.operation_id,'active');
 END IF;
 RETURN NEW;
END; $rescan_no_false_finish$;
CREATE FUNCTION public.guard_completed_document_rescan_lease()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $rescan_completed_lease$
BEGIN
 IF EXISTS(SELECT 1 FROM public.document_rescan_completion_receipts WHERE operation_id=OLD.operation_id) THEN
  IF TG_OP='DELETE' OR to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'The confirmed rescan is retained.' USING ERRCODE='42501'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $rescan_completed_lease$;
CREATE TRIGGER document_rescan_completed_lease_frozen BEFORE UPDATE OR DELETE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_completed_document_rescan_lease();
CREATE FUNCTION public.guard_document_capacity_rescan_settlement()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_settlement_guard$
DECLARE done public.document_rescan_completion_receipts%ROWTYPE;outcome jsonb;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'This rescan settlement is retained.' USING ERRCODE='42501'; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO done FROM public.document_rescan_completion_receipts WHERE operation_id=NEW.operation_id FOR SHARE;
 outcome:=public.read_internal_document_rescan_completion(NEW.operation_id,'completed');
 IF NOT FOUND OR done.proof IS DISTINCT FROM outcome OR done.operation_finished_at IS DISTINCT FROM (outcome->>'operation_finished_at')::timestamptz
  OR NEW.released_units IS DISTINCT FROM (CASE WHEN outcome->>'disposition'='quarantined' THEN 2 ELSE 1 END) THEN
  RAISE EXCEPTION 'This counted rescan completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $rescan_settlement_guard$;
CREATE TRIGGER document_capacity_rescan_settlement_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_capacity_rescan_settlements
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_capacity_rescan_settlement();
CREATE FUNCTION public.settle_internal_document_rescan_capacity(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $settle_rescan_capacity$
DECLARE stored public.document_capacity_rescan_settlements%ROWTYPE;units integer;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF EXISTS(SELECT 1 FROM public.document_capacity_rescan_settlements WHERE operation_id=_operation_id) THEN RAISE EXCEPTION 'This rescan capacity cannot be released twice.' USING ERRCODE='42501'; END IF;
 SELECT CASE WHEN proof->>'disposition'='quarantined' THEN 2 ELSE 1 END INTO units FROM public.document_rescan_completion_receipts WHERE operation_id=_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'This counted rescan completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 INSERT INTO public.document_capacity_rescan_settlements(operation_id,released_units) VALUES(_operation_id,units) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM _operation_id OR stored.released_units IS DISTINCT FROM units THEN
  RAISE EXCEPTION 'This rescan settlement was not saved.' USING ERRCODE='55000'; END IF;
END; $settle_rescan_capacity$;

DO $replace_owned_finish$
DECLARE migration_executor name:=current_user; admission_owner name; editing_role name; original_owner oid;
BEGIN
 SELECT proowner INTO original_owner FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure;
 SELECT rolname INTO admission_owner FROM pg_roles WHERE oid=original_owner;
 IF current_user<>admission_owner THEN
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper) THEN editing_role:=session_user;
  ELSE editing_role:=admission_owner; END IF;
  EXECUTE format('SET LOCAL ROLE %I',editing_role);
 END IF;
 EXECUTE $owned_finish_definition$
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
 IF _outcome='completed' THEN PERFORM public.record_internal_document_registration_completion(_operation_id);PERFORM public.record_internal_document_rescan_completion(_operation_id); END IF;
 RETURN jsonb_build_object('schema','document-operation-finished-v1','operation_id',_operation_id,'state',_outcome);
END; $finish_operation$;
 $owned_finish_definition$;
 IF (SELECT proowner FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure) IS DISTINCT FROM original_owner THEN
  RAISE EXCEPTION 'Completion function ownership must be preserved.' USING ERRCODE='55000';
 END IF;
 IF current_user<>migration_executor THEN EXECUTE format('SET LOCAL ROLE %I',migration_executor); END IF;
 IF current_user<>migration_executor THEN RAISE EXCEPTION 'Migration role restoration failed.' USING ERRCODE='55000'; END IF;
END; $replace_owned_finish$;
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
  IF COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id WHERE r.actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id WHERE r.student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
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
REVOKE ALL ON FUNCTION public.read_internal_document_rescan_completion(uuid,text),public.guard_document_rescan_completion_receipt(),public.record_internal_document_rescan_completion(uuid),
 public.guard_completed_document_rescan_lease(),public.guard_document_capacity_rescan_settlement(),public.settle_internal_document_rescan_capacity(uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $rescan_finish_helper_grant$
DECLARE admission_owner name;
BEGIN
 SELECT relowner::regrole::text INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.record_internal_document_rescan_completion(uuid) TO %I',admission_owner);
END; $rescan_finish_helper_grant$;
COMMENT ON TABLE public.document_capacity_rescan_settlements IS 'Private exact producer settlement: one unit after clean-plus-selected queue, two only after confirmed no-new-summary quarantine. Summary settlement is independent and frees its own one unit after guarded output/finish. Held work, unknown claims and provider uncertainty never release from a status, clock, scan UUID or metadata snapshot alone. No ordinary hooks, reconciliation, selected limits or hosted activation.';
COMMIT;
