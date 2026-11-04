-- DRAFT ONLY. Automatic registration producer release after guarded completion.
-- Not canonical, installed hosted, or ready for cutover.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure AND md5(prosrc)='e182bc060bdfdca5637ce8685836222d') THEN
  RAISE EXCEPTION 'Exact paused completion prerequisite required'; END IF;
END; $preflight$;
CREATE FUNCTION public.settle_completed_document_registration(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $settle_registration$
DECLARE expected integer;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE operation_id=_operation_id
  AND operation_kind='register' AND state='completed' AND finished_at IS NOT NULL
  AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'Registration finish must commit with its settlement' USING ERRCODE='55000'; END IF;
 SELECT CASE WHEN disposition='quarantined' THEN 2 ELSE 1 END INTO expected
  FROM public.document_registration_completion_receipts WHERE operation_id=_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exact registration completion receipt required' USING ERRCODE='55000'; END IF;
 PERFORM public.settle_internal_document_registration_capacity(_operation_id);
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_registration_settlements
  WHERE operation_id=_operation_id AND released_units=expected) THEN
  RAISE EXCEPTION 'Actual registration settlement required' USING ERRCODE='55000'; END IF;
END; $settle_registration$;
REVOKE ALL ON FUNCTION public.settle_completed_document_registration(uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $bridge$ DECLARE owner_name text; BEGIN
 SELECT proowner::regrole::text INTO owner_name FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.settle_completed_document_registration(uuid) TO %I',owner_name);
END; $bridge$;
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
DECLARE lease public.document_operation_leases%ROWTYPE;finished public.document_operation_leases%ROWTYPE;
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
 UPDATE public.document_operation_leases SET state=_outcome,finished_at=clock_timestamp() WHERE operation_id=_operation_id RETURNING * INTO finished;
 IF NOT FOUND OR finished.state IS DISTINCT FROM _outcome OR finished.finished_at IS NULL
  OR (to_jsonb(finished)-ARRAY['state','finished_at']) IS DISTINCT FROM (to_jsonb(lease)-ARRAY['state','finished_at']) THEN
  RAISE EXCEPTION 'The actual worker finish could not be confirmed.' USING ERRCODE='55000'; END IF;
 IF _outcome='completed' THEN
  PERFORM public.record_internal_document_registration_completion(_operation_id);
  PERFORM public.record_internal_document_rescan_completion(_operation_id);
  IF lease.operation_kind='register' THEN PERFORM public.settle_completed_document_registration(_operation_id); END IF;
  IF lease.operation_kind='summary' THEN PERFORM public.settle_completed_document_summary(_operation_id); END IF;
 END IF;
 RETURN jsonb_build_object('schema','document-operation-finished-v1','operation_id',_operation_id,'state',_outcome);
END; $finish_operation$;
 $owned_finish_definition$;
 IF (SELECT proowner FROM pg_proc WHERE oid='public.finish_document_operation(uuid,uuid,uuid,text)'::regprocedure) IS DISTINCT FROM original_owner THEN
  RAISE EXCEPTION 'Completion function ownership must be preserved.' USING ERRCODE='55000';
 END IF;
 IF current_user<>migration_executor THEN EXECUTE format('SET LOCAL ROLE %I',migration_executor); END IF;
 IF current_user<>migration_executor THEN RAISE EXCEPTION 'Migration role restoration failed.' USING ERRCODE='55000'; END IF;
END; $replace_owned_finish$;
COMMIT;
