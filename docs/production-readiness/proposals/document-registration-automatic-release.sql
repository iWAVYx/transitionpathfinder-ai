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
DO $registration_dependencies$
DECLARE item record; caller text; relation_name text; admission_owner oid;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 FOR item IN SELECT * FROM (VALUES
 ('public.guard_document_rescan_completion_receipt()','66fc62f3994165d4d1cc5d2baae32f88',false,false),
 ('public.record_internal_document_rescan_completion(uuid)','d33cda072581b15c7172ca9046d8b958',true,false),
 ('public.guard_unfinished_document_rescan()','be1187efef8bef6e42bd2932bbc1f634',true,false),
 ('public.guard_completed_document_rescan_lease()','1217646df6772f74ae458ce269c71a49',true,false),
 ('public.guard_document_capacity_rescan_settlement()','d0847740f46ca699471dab7a2df59c00',false,false),
 ('public.settle_internal_document_rescan_capacity(uuid)','27739ecef53efbe6d20e553200bcca56',false,false),
 ('public.guard_document_capacity_reservation()','4c09f0f14edc20a934e14923c5d80ff6',false,false),
 ('public.claim_admitted_document_summary(uuid,integer)','c447fea2a55afefc6ad1451986ac1eea',true,false),
 ('public.read_internal_document_rescan_completion(uuid,text)','a8217daa37516c4f7a433a64acf8e43f',false,false),
 ('public.finish_document_operation(uuid,uuid,uuid,text)','e182bc060bdfdca5637ce8685836222d',true,true),
 ('public.settle_internal_document_summary_capacity(uuid)','2f42438a87505bab82291fce38cb60a9',false,false),
 ('public.settle_completed_document_summary(uuid)','9d9fa98f0d49a6ba04dcc5cff40e056a',true,false),
 ('public.guard_settled_document_summary_lease()','a710ef5817995460006b1af2b6c97c72',true,false),
 ('public.settle_internal_document_registration_capacity(uuid)','174b6e74b5cd821d41f731915b546d73',false,false),
 ('public.record_internal_document_registration_completion(uuid)','4b2881100167d594248a391149957ae8',true,false)
 ) expected(signature,body_md5,definer,admission_owned) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proconfig=ARRAY['search_path=pg_catalog']
   AND proowner=CASE WHEN item.admission_owned THEN admission_owner ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Exact registration dependency required'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller='service_role' AND item.signature IN
    ('public.finish_document_operation(uuid,uuid,uuid,text)','public.claim_admitted_document_summary(uuid,integer)')) THEN
    RAISE EXCEPTION 'Private registration dependency permissions changed'; END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_capacity_reservations',
  'public.document_registration_completion_receipts','public.document_capacity_registration_settlements','public.document_rescan_outcome_receipts','public.document_upload_operation_bindings'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relrowsecurity
   AND relowner=CASE WHEN relation_name IN ('public.document_operation_control','public.document_operation_leases') THEN admission_owner ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Private registration table ownership and RLS required'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private registration table permissions changed'; END IF;
  END LOOP;
 END LOOP;
END; $registration_dependencies$;
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
