-- DRAFT ONLY. Fence raw legacy summary starts after private admission.
-- No existing work adoption, cancellation, retry, unpause or hosted install.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $claim_writer_preflight$
DECLARE caller text;relation_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.begin_document_operation(uuid,uuid,text)'::regprocedure AND proowner=(SELECT relowner FROM pg_class WHERE oid='public.document_operation_control'::regclass) AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='4ff01874b39fa3e46c24a6bf3d8149fc') THEN RAISE EXCEPTION 'Exact private admission body required' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.claim_admitted_document_summary(uuid,integer)'::regprocedure AND proowner=current_user::regrole::oid
  AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND md5(prosrc)='c447fea2a55afefc6ad1451986ac1eea') THEN RAISE EXCEPTION 'Exact trusted counted claim required' USING ERRCODE='55000';END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.begin_document_operation(uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'Private generic admission must precede the writer fence' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_capacity_reservations','public.document_summary_operation_bindings','public.document_summary_source_bindings','public.document_summary_completion_receipts','public.document_capacity_summary_settlements','public.document_operation_leases'] LOOP
  IF NOT has_table_privilege(current_user,relation_name,'SELECT') OR row_security_active(relation_name::regclass) THEN RAISE EXCEPTION 'Full trusted claim visibility required' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN RAISE EXCEPTION 'Private claim records required' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN RAISE EXCEPTION 'Paused claim fence installation required' USING ERRCODE='55000';END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.ai_jobs j WHERE j.job_type='document_summary' AND j.status='processing' AND NOT EXISTS(
  SELECT 1 FROM public.document_summary_operation_bindings b JOIN public.document_capacity_reservations c ON c.summary_operation_id=b.operation_id AND c.summary_job_id=b.job_id
   JOIN public.document_operation_leases w ON w.operation_id=b.operation_id
  WHERE b.job_id=j.id AND b.claim_at=j.locked_at AND b.claim_attempt=j.attempts AND b.actor_id=j.triggered_by_user_id AND b.student_id=j.student_id
   AND w.operation_kind='summary' AND w.actor_id=b.actor_id AND w.state IN('active','needs_review') AND c.reserved_units=2 AND c.producer_kind IN('register','rescan'))) THEN
  RAISE EXCEPTION 'Existing untracked processing requires reconciliation' USING ERRCODE='55000';END IF;
END; $claim_writer_preflight$;
CREATE FUNCTION public.guard_document_summary_claim_writer()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $claim_writer$
BEGIN
 IF NEW.job_type IS DISTINCT FROM 'document_summary' OR NEW.status IS DISTINCT FROM 'processing' THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.job_type='document_summary' AND OLD.status='processing' AND OLD.id=NEW.id AND OLD.locked_at IS NOT DISTINCT FROM NEW.locked_at AND OLD.attempts IS NOT DISTINCT FROM NEW.attempts THEN RETURN NEW;END IF;
 END IF;
 IF current_user::regrole::oid IS DISTINCT FROM (SELECT proowner FROM pg_proc WHERE oid='public.claim_admitted_document_summary(uuid,integer)'::regprocedure) THEN
  RAISE EXCEPTION 'Start this document summary through its verified claim' USING ERRCODE='42501';END IF;
 RETURN NEW;
END; $claim_writer$;
REVOKE ALL ON FUNCTION public.guard_document_summary_claim_writer() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER ai_jobs_guard_document_summary_claim BEFORE INSERT OR UPDATE ON public.ai_jobs FOR EACH ROW EXECUTE FUNCTION public.guard_document_summary_claim_writer();
CREATE FUNCTION public.check_document_summary_claim_committed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $claim_committed$
BEGIN
 IF NEW.job_type IS DISTINCT FROM 'document_summary' OR NEW.status IS DISTINCT FROM 'processing' THEN RETURN NEW;END IF;
 IF TG_OP='UPDATE' THEN
  IF OLD.job_type='document_summary' AND OLD.status='processing' AND OLD.id=NEW.id AND OLD.locked_at IS NOT DISTINCT FROM NEW.locked_at AND OLD.attempts IS NOT DISTINCT FROM NEW.attempts THEN RETURN NEW;END IF;
 END IF;
 IF NEW.locked_at IS NULL OR NEW.attempts IS DISTINCT FROM 1 OR NOT EXISTS(
  SELECT 1 FROM public.ai_jobs j JOIN public.document_summary_operation_bindings b ON b.job_id=j.id
  JOIN public.document_summary_source_bindings s ON s.job_id=b.job_id
  JOIN public.document_capacity_reservations c ON c.summary_operation_id=b.operation_id AND c.summary_job_id=b.job_id
  JOIN public.document_operation_leases w ON w.operation_id=b.operation_id
  WHERE j.id=NEW.id AND j.job_type='document_summary' AND j.student_id=b.student_id AND j.triggered_by_user_id=b.actor_id AND j.attempts=NEW.attempts
   AND b.claim_at=NEW.locked_at AND b.claim_attempt=NEW.attempts AND j.input_source->>'document_id'=b.document_id::text
   AND s.actor_id=b.actor_id AND s.student_id=b.student_id AND s.document_id=b.document_id AND s.storage_path=b.storage_path
   AND s.object_id=b.object_id AND s.object_version=b.object_version AND s.content_sha256=b.content_sha256 AND s.first_claim_at=b.claim_at AND s.first_claim_attempt=b.claim_attempt
   AND c.actor_id=b.actor_id AND c.student_id=b.student_id AND c.producer_kind IN('register','rescan') AND c.reserved_units=2
   AND w.actor_id=b.actor_id AND w.operation_kind='summary'
   AND ((j.status='processing' AND j.locked_at=NEW.locked_at AND w.state IN('active','needs_review')
      AND NOT EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE summary_operation_id=w.operation_id))
    OR (j.status='completed' AND j.locked_at IS NULL AND w.state IN('active','completed') AND EXISTS(
      SELECT 1 FROM public.document_summary_completion_receipts done WHERE done.job_id=j.id AND done.operation_id=w.operation_id
       AND done.claim_at=b.claim_at AND done.claim_attempt=b.claim_attempt)))) THEN
  RAISE EXCEPTION 'The real counted summary claim was not committed' USING ERRCODE='55000';END IF;
 RETURN NEW;
END; $claim_committed$;
REVOKE ALL ON FUNCTION public.check_document_summary_claim_committed() FROM PUBLIC,anon,authenticated,service_role;
CREATE CONSTRAINT TRIGGER ai_jobs_document_summary_claim_committed AFTER INSERT OR UPDATE ON public.ai_jobs DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_document_summary_claim_committed();
COMMIT;
