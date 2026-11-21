-- DRAFT ONLY. Close legacy summary queue fallthrough after writer/admission fences.
-- Preserve old rows; no adoption, deletion, source repair, unpause or provider IO.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $queue_entry_preflight$
DECLARE caller text;relation_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.bind_registration_summary_capacity()'::regprocedure AND proowner=current_user::regrole::oid AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='ee05945cda1adf131fe1e15eb5b415f0')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.claim_admitted_document_summary(uuid,integer)'::regprocedure AND proowner=current_user::regrole::oid AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='c447fea2a55afefc6ad1451986ac1eea')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.is_document_apply_no_save_reconciled(uuid)'::regprocedure AND proowner=current_user::regrole::oid AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='239917de14a68e098877245e85e6d215')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.lock_internal_document_capacity_completion()'::regprocedure AND proowner=current_user::regrole::oid AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='be973fc53b7930db60f9456ba1f26548')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.guard_document_summary_claim_writer()'::regprocedure AND proowner=current_user::regrole::oid AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='f55a7b4a3e798b9ada2d90dee1dd630c')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.check_document_summary_claim_committed()'::regprocedure AND proowner=current_user::regrole::oid AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='d10258785f01c5cc825b43621e57f7dc') THEN RAISE EXCEPTION 'Exact reviewed private queue protocol required' USING ERRCODE='55000';END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.begin_document_operation(uuid,uuid,text)','EXECUTE') OR has_function_privilege(caller,'public.bind_registration_summary_capacity()','EXECUTE') OR has_function_privilege(caller,'public.queue_internal_document_capacity(uuid,uuid)','EXECUTE') OR has_function_privilege(caller,'public.is_document_apply_no_save_reconciled(uuid)','EXECUTE') OR has_function_privilege(caller,'public.guard_document_summary_claim_writer()','EXECUTE') OR has_function_privilege(caller,'public.check_document_summary_claim_committed()','EXECUTE') THEN RAISE EXCEPTION 'Private admission and queue helpers required' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_leases','public.document_capacity_reservations','public.document_upload_operation_bindings','public.document_rescan_outcome_receipts'] LOOP
  IF NOT has_table_privilege(current_user,relation_name,'SELECT') OR row_security_active(relation_name::regclass) THEN RAISE EXCEPTION 'Full trusted queue visibility required' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Private queue records required' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_jobs'::regclass AND tgname='registration_summary_capacity' AND tgfoid='public.bind_registration_summary_capacity()'::regprocedure AND tgtype=5 AND tgenabled='O' AND NOT tgisinternal)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_jobs'::regclass AND tgname='ai_jobs_guard_document_summary_claim' AND tgfoid='public.guard_document_summary_claim_writer()'::regprocedure AND tgtype=23 AND tgenabled='O' AND NOT tgisinternal)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.ai_jobs'::regclass AND tgname='ai_jobs_document_summary_claim_committed' AND tgfoid='public.check_document_summary_claim_committed()'::regprocedure AND tgtype=21 AND tgenabled='O' AND tgdeferrable AND tginitdeferred AND NOT tgisinternal) THEN RAISE EXCEPTION 'Enabled reviewed queue and claim guards required' USING ERRCODE='55000';END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) OR EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state='active' OR (state='needs_review' AND NOT public.is_document_apply_no_save_reconciled(operation_id))) THEN
  RAISE EXCEPTION 'Pause and finish or review tracked work before enabling this queue guard.' USING ERRCODE='55000';END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
END; $queue_entry_preflight$;
CREATE OR REPLACE FUNCTION public.bind_registration_summary_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $queue_registration$
DECLARE d public.documents%ROWTYPE;b public.document_upload_operation_bindings%ROWTYPE;
BEGIN
 IF NEW.job_type<>'document_summary' THEN RETURN NEW; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO d FROM public.documents WHERE id::text=lower(NEW.input_source->>'document_id') FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This document needs review before a summary can be started.' USING ERRCODE='42501'; END IF;
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
 IF NOT FOUND THEN RAISE EXCEPTION 'This document needs review before a summary can be started.' USING ERRCODE='42501'; END IF;
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
CREATE FUNCTION public.guard_document_summary_job_type()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $job_type_guard$
BEGIN
 IF NEW.job_type IS DISTINCT FROM OLD.job_type AND (OLD.job_type='document_summary' OR NEW.job_type='document_summary') THEN
  RAISE EXCEPTION 'This summary request cannot be changed into another tool request.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END; $job_type_guard$;
REVOKE ALL ON FUNCTION public.guard_document_summary_job_type() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER ai_jobs_guard_document_summary_type BEFORE UPDATE ON public.ai_jobs FOR EACH ROW EXECUTE FUNCTION public.guard_document_summary_job_type();
COMMIT;
