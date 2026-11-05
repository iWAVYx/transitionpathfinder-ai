-- DRAFT ONLY: guarded one-unit Apply release at commit. No hosted installation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR to_regprocedure('public.validate_bound_document_apply_completion(uuid)') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.guard_document_capacity_reservation()'::regprocedure
   AND md5(prosrc)='4c09f0f14edc20a934e14923c5d80ff6') THEN
  RAISE EXCEPTION 'Reviewed paused Apply settlement prerequisites required'; END IF;
END; $preflight$;
CREATE TABLE public.document_apply_capacity_settlements(
 operation_id uuid PRIMARY KEY REFERENCES public.document_apply_completion_receipts(operation_id),
 released_units integer NOT NULL CHECK(released_units=1),settled_txid bigint NOT NULL DEFAULT txid_current()
);
ALTER TABLE public.document_apply_capacity_settlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_apply_capacity_settlements FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_settlement_retained BEFORE UPDATE OR DELETE ON public.document_apply_capacity_settlements
 FOR EACH ROW EXECUTE FUNCTION public.guard_apply_completion_receipt();
CREATE FUNCTION public.guard_bound_apply_finish()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $guard_apply_finish$
BEGIN
 IF OLD.operation_kind<>'apply' OR NOT EXISTS(SELECT 1 FROM public.document_apply_source_bindings WHERE operation_id=OLD.operation_id) THEN
  IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
 END IF;
 IF TG_OP='DELETE' OR (OLD.state='completed' AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN
  RAISE EXCEPTION 'Bound Apply work is retained' USING ERRCODE='42501'; END IF;
 IF NEW.state='completed' AND NOT EXISTS(SELECT 1 FROM public.audit_log audit
  JOIN public.document_apply_source_bindings source ON source.operation_id=OLD.operation_id
  WHERE audit.actor_id=source.actor_id AND audit.student_id=source.student_id
   AND audit.entity_type='document_extraction' AND audit.entity_id=source.extraction_id
   AND audit.action='document.extraction.applied' AND audit.xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'Actual Apply audit write required' USING ERRCODE='55000'; END IF;
 IF NEW.state='completed' THEN PERFORM public.validate_bound_document_apply_completion(OLD.operation_id); END IF;
 RETURN NEW;
END; $guard_apply_finish$;
REVOKE ALL ON FUNCTION public.guard_bound_apply_finish() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_bound_apply_finished BEFORE UPDATE OR DELETE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_bound_apply_finish();
CREATE FUNCTION public.release_completed_apply_at_commit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $release_apply$
DECLARE lease public.document_operation_leases%ROWTYPE;reply jsonb;stored public.document_apply_capacity_settlements%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 PERFORM public.validate_bound_document_apply_completion(NEW.operation_id);
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.operation_id FOR UPDATE;
 IF NOT FOUND OR lease.operation_kind<>'apply' OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM NEW.actor_id
  OR NEW.receipt_txid<>txid_current() THEN RAISE EXCEPTION 'Exact Apply finish required' USING ERRCODE='55000'; END IF;
 reply:=public.finish_document_operation(lease.operation_id,lease.actor_id,lease.receipt_id,'completed');
 IF reply->>'schema' IS DISTINCT FROM 'document-operation-finished-v1' OR reply->>'operation_id' IS DISTINCT FROM lease.operation_id::text
  OR reply->>'state' IS DISTINCT FROM 'completed' THEN RAISE EXCEPTION 'Actual Apply finish required' USING ERRCODE='55000'; END IF;
 INSERT INTO public.document_apply_capacity_settlements(operation_id,released_units) VALUES(lease.operation_id,1) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM lease.operation_id OR stored.released_units<>1 OR stored.settled_txid<>txid_current() THEN
  RAISE EXCEPTION 'Actual Apply release required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $release_apply$;
REVOKE ALL ON FUNCTION public.release_completed_apply_at_commit() FROM PUBLIC,anon,authenticated,service_role;
CREATE CONSTRAINT TRIGGER zz_document_apply_capacity_release AFTER INSERT ON public.document_apply_completion_receipts
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.release_completed_apply_at_commit();
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
  IF COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id WHERE r.actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id WHERE r.student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
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
COMMIT;
