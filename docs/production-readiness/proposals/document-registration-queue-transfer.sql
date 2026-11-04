-- DRAFT ONLY: atomic registration queue transfer; not canonical or hosted.
-- Install only with reviewed reservation admission and final shared safeguards.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$ BEGIN
 IF to_regprocedure('public.lock_internal_document_capacity_completion()') IS NULL
  OR to_regprocedure('public.validate_internal_document_rescan_outcome(uuid)') IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR has_function_privilege('service_role','public.queue_internal_document_capacity(uuid,uuid)','EXECUTE')
  OR has_function_privilege('authenticated','public.queue_internal_document_capacity(uuid,uuid)','EXECUTE')
  OR has_function_privilege('anon','public.queue_internal_document_capacity(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed paused private queue prerequisites required'; END IF;
END; $preflight$;
CREATE FUNCTION public.bind_registration_summary_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $queue_registration$
DECLARE d public.documents%ROWTYPE;b public.document_upload_operation_bindings%ROWTYPE;
BEGIN
 IF NEW.job_type<>'document_summary' THEN RETURN NEW; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO d FROM public.documents WHERE id::text=lower(NEW.input_source->>'document_id') FOR SHARE;
 IF NOT FOUND THEN RETURN NEW; END IF;
 -- Rescan persistence owns its distinct reservation. Accept only the exact
 -- same-transaction queued receipt already guarded by the rescan protocol.
 IF EXISTS(SELECT 1 FROM public.document_rescan_outcome_receipts r
  JOIN public.document_rescan_source_bindings source USING(operation_id)
  JOIN public.document_operation_leases lease USING(operation_id)
  WHERE r.document_id=d.id AND r.disposition='clean_queued' AND r.summary_job_id=NEW.id
   AND r.outcome_txid=txid_current() AND r.actor_id=NEW.triggered_by_user_id
   AND source.student_id=NEW.student_id AND lease.state='active'
   AND NEW.input_source=jsonb_build_object('document_id',source.document_id,'storage_path',source.storage_path)) THEN
  RETURN NEW;
 END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=d.upload_attempt_id;
 IF NOT FOUND THEN RETURN NEW; END IF; -- Legacy starts require a separate cutover fence.
 IF NEW.student_id IS DISTINCT FROM b.student_id OR NEW.triggered_by_user_id IS DISTINCT FROM b.actor_id
  OR NEW.input_source->>'storage_path' IS DISTINCT FROM b.storage_path
  OR d.student_id IS DISTINCT FROM b.student_id OR d.uploaded_by IS DISTINCT FROM b.actor_id
  OR d.storage_path IS DISTINCT FROM b.storage_path OR d.content_hash IS DISTINCT FROM b.content_sha256
  OR d.storage_object_id IS DISTINCT FROM b.claimed_object_id OR d.storage_object_version IS DISTINCT FROM b.claimed_object_version
  OR d.deleted_at IS NOT NULL OR d.archived_at IS NOT NULL OR d.scan_status IS DISTINCT FROM 'clean'
  OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean' OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive'
  OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy'
  OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256
  OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb OR d.scan_verdict->'blocked_reasons' IS DISTINCT FROM '[]'::jsonb
  OR d.scanned_at IS NULL OR NULLIF(btrim(d.scan_data_id),'') IS NULL
  OR public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true
  OR public.can_view_document(b.actor_id,d.id) IS DISTINCT FROM true OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'The registered summary source could not be confirmed.' USING ERRCODE='42501'; END IF;
 PERFORM public.queue_internal_document_capacity(b.operation_id,NEW.id);
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations WHERE operation_id=b.operation_id
  AND actor_id=b.actor_id AND student_id=b.student_id AND producer_kind='register' AND reserved_units=2
  AND summary_job_id=NEW.id AND summary_operation_id IS NULL) THEN
  RAISE EXCEPTION 'The exact summary capacity transfer was not saved.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $queue_registration$;
REVOKE ALL ON FUNCTION public.bind_registration_summary_capacity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER registration_summary_capacity AFTER INSERT ON public.ai_jobs FOR EACH ROW EXECUTE FUNCTION public.bind_registration_summary_capacity();
COMMIT;
