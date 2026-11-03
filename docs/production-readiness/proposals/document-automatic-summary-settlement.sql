-- REVIEW PROPOSAL ONLY; fifteenth noncanonical/unapplied proposal.
-- Actual-row-confirmed one-unit worker settlement inside guarded finish only.
-- No producer/held release, new capacity, provider IO or hosted activation.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $counted_worker_proof$
DECLARE item record;role_name text;admission_owner oid;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_rescan_completion_receipt()','66fc62f3994165d4d1cc5d2baae32f88',false,false),
  ('public.record_internal_document_rescan_completion(uuid)','d33cda072581b15c7172ca9046d8b958',true,false),
  ('public.guard_unfinished_document_rescan()','be1187efef8bef6e42bd2932bbc1f634',true,false),
  ('public.guard_completed_document_rescan_lease()','1217646df6772f74ae458ce269c71a49',true,false),
  ('public.guard_document_capacity_rescan_settlement()','d0847740f46ca699471dab7a2df59c00',false,false),
  ('public.settle_internal_document_rescan_capacity(uuid)','27739ecef53efbe6d20e553200bcca56',false,false),
  ('public.finish_document_operation(uuid,uuid,uuid,text)','02a82f905e1a198511cdeacade5f5138',true,true),
  ('public.guard_document_capacity_reservation()','4c09f0f14edc20a934e14923c5d80ff6',false,false),
  ('public.claim_admitted_document_summary(uuid,integer)','c447fea2a55afefc6ad1451986ac1eea',true,false),
  ('public.read_internal_document_rescan_completion(uuid,text)','a8217daa37516c4f7a433a64acf8e43f',false,false)
 ) x(signature,body_md5,definer,admission_owned) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proconfig=ARRAY['search_path=pg_catalog']
   AND proowner=CASE WHEN item.admission_owned THEN admission_owner ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Exact counted worker definitions and ownership required'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') IS DISTINCT FROM (role_name='service_role'
    AND item.signature IN ('public.finish_document_operation(uuid,uuid,uuid,text)','public.claim_admitted_document_summary(uuid,integer)')) THEN
    RAISE EXCEPTION 'Unexpected counted worker execution grant'; END IF;
  END LOOP;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(role_name,'public.claim_internal_document_capacity(uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Private transfer must not become service callable'; END IF;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  FOR item IN SELECT * FROM (VALUES ('public.document_capacity_reservations'),('public.document_summary_source_bindings'),
   ('public.document_summary_operation_bindings'),('public.document_rescan_completion_receipts'),('public.document_capacity_rescan_settlements')) x(relation_name) LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid)
    OR has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private counted worker ownership, RLS and raw permissions required'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.document_summary_source_bindings','document_source_binding_immutable','public.reject_document_source_binding_mutation()',27,false),
  ('public.document_summary_operation_bindings','summary_operation_binding_frozen','public.guard_document_summary_operation_binding()',27,false),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()',31,false),
  ('public.document_rescan_outcome_receipts','document_rescan_outcome_committed','public.check_document_rescan_outcome_commit()',5,true),
  ('public.document_operation_leases','document_rescan_completed_lease_frozen','public.guard_completed_document_rescan_lease()',27,false)
 ) x(relation_name,trigger_name,signature,kind,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name) AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature)
   AND tgtype=item.kind AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred) THEN
   RAISE EXCEPTION 'Reviewed counted worker triggers required'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL)
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed') THEN
  RAISE EXCEPTION 'Counted worker must remain paused, empty and unset'; END IF;
END; $counted_worker_proof$;
DO $auto_summary_preflight$
DECLARE item record;role_name text;admission_owner oid;admission_table text;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 FOREACH admission_table IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases'] LOOP
  IF admission_owner IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(admission_table)
   AND relrowsecurity AND relowner=admission_owner) THEN
   RAISE EXCEPTION 'Coherent private admission ownership and RLS are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,admission_table,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(role_name,admission_table,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Admission operation records must remain private.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.read_internal_document_rescan_completion(uuid,text)','a8217daa37516c4f7a433a64acf8e43f',false,false),
 ('public.guard_document_rescan_completion_receipt()','66fc62f3994165d4d1cc5d2baae32f88',false,false),
 ('public.record_internal_document_rescan_completion(uuid)','d33cda072581b15c7172ca9046d8b958',true,false),
 ('public.guard_unfinished_document_rescan()','be1187efef8bef6e42bd2932bbc1f634',true,false),
 ('public.guard_completed_document_rescan_lease()','1217646df6772f74ae458ce269c71a49',true,false),
 ('public.guard_document_capacity_rescan_settlement()','d0847740f46ca699471dab7a2df59c00',false,false),
 ('public.settle_internal_document_rescan_capacity(uuid)','27739ecef53efbe6d20e553200bcca56',false,false),
 ('public.finish_document_operation(uuid,uuid,uuid,text)','02a82f905e1a198511cdeacade5f5138',true,true),
 ('public.guard_document_capacity_reservation()','4c09f0f14edc20a934e14923c5d80ff6',false,false),
 ('public.claim_admitted_document_summary(uuid,integer)','c447fea2a55afefc6ad1451986ac1eea',true,false),
 ('public.claim_internal_document_capacity(uuid,uuid)','7cd786969a6084b1c51e26a182cc9200',false,false),
 ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828',false,false),
 ('public.read_verified_document_summary_source(uuid,timestamptz,integer)','6beb7e73b75e358ff530c8316650c1e5',true,false),
 ('public.read_internal_document_registration_completion(uuid)','dc3b28d28174e13759e47896e549a3b8',false,false),
 ('public.guard_document_registration_completion_receipt()','47defe9db1ab2e654d178d25e8dcb199',false,false),
 ('public.guard_rescan_document_summary_queue()','87ae8af9a7d7b2b7f30c0f2b5c106112',true,false),
 ('public.guard_document_summary_operation_binding()','b049daec1448ce2bc28812c4588c8b97',true,false),
 ('public.guard_document_rescan_source_binding()','9cde41dda57eaaac0ac7aacb666e27a2',false,false),
 ('public.guard_document_rescan_pending_receipt()','29807c2edbe76ea0c3d175e829828b72',false,false),
 ('public.guard_document_summary_completion_receipt()','bce8b9ca58259f9b3f237d79f4167069',false,false),
 ('public.guard_completed_document_summary_job()','a01db85f8c132ac05ac3a1227616278c',true,false),
 ('public.guard_registered_document_summary_queue()','0bdef1bb3b14b5e0bb6f341e5464bbeb',true,false),
 ('public.guard_document_rescan_outcome_receipt()','8b0ea9df1b8c345c01ecc3ee431328c9',false,false),
 ('public.validate_internal_document_rescan_outcome(uuid)','5566056a58c43008264d5050e8a1234f',false,false),
 ('public.check_document_rescan_outcome_commit()','1af8dd3b1338f86104829e80be091c29',false,false),
 ('public.persist_internal_document_rescan_result(uuid,uuid,uuid,jsonb)','d1c35df9ea20a3416f3fbc2b93e881b5',false,false),
 ('public.queue_internal_document_capacity(uuid,uuid)','ad5e04be560b2b4b364031581e886b4b',false,false),
 ('public.begin_document_operation(uuid,uuid,text)','4ff01874b39fa3e46c24a6bf3d8149fc',true,true),
 ('public.reject_document_source_binding_mutation()','1f541c412d592bef234c15d4309e505c',true,false),
 ('public.guard_bound_document_summary_job()','bec9836beb73d0e1ee37de07be97438c',true,false),
 ('public.guard_document_summary_operation_completion()','80e1d39564ed282104abea744faa45ea',true,false),
 ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false,false)
 ) x(signature,body_md5,definer,admission_owned) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proconfig=ARRAY['search_path=pg_catalog']
   AND proowner=CASE WHEN item.admission_owned THEN admission_owner ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Inherited private control routines require exact review.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') IS DISTINCT FROM (role_name='service_role' AND item.signature IN ('public.begin_document_operation(uuid,uuid,text)','public.claim_admitted_document_summary(uuid,integer)','public.finish_document_operation(uuid,uuid,uuid,text)','public.read_verified_document_summary_source(uuid,timestamptz,integer)')) THEN
    RAISE EXCEPTION 'Inherited private control execution drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOREACH admission_table IN ARRAY ARRAY['public.document_capacity_reservations','public.document_summary_source_bindings','public.document_summary_operation_bindings','public.document_registration_completion_receipts','public.document_rescan_source_bindings','public.document_rescan_outcome_receipts','public.document_rescan_completion_receipts','public.document_capacity_rescan_settlements','public.document_upload_operation_bindings','public.document_capacity_policy','public.document_capacity_summary_settlements','public.document_capacity_registration_settlements','public.document_summary_completion_receipts','public.document_rescan_pending_receipts'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(admission_table) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Inherited private control table ownership/RLS drift.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,admission_table,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(role_name,admission_table,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Inherited private control table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.settle_internal_document_summary_capacity(uuid)','2a8cd633152ab18e7343edff5c70e2e2',false),
 ('public.guard_document_capacity_summary_settlement()','b1b7f4cb2e1c0bb2ce0e5d4035c19029',false),
 ('public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)','540e960a20055d3a28d1327752a1c57d',true)
 ) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Reviewed automatic summary prerequisites are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') IS DISTINCT FROM (role_name='service_role' AND item.signature LIKE 'public.complete_verified_document_summary(%') THEN
    RAISE EXCEPTION 'Automatic summary execution permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(role_name,'public.document_capacity_summary_settlements','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
   OR has_any_column_privilege(role_name,'public.document_capacity_summary_settlements','SELECT,INSERT,UPDATE') THEN
   RAISE EXCEPTION 'Summary settlement table must stay private.' USING ERRCODE='55000'; END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.document_capacity_summary_settlements'::regclass AND relrowsecurity AND relowner=current_user::regrole::oid)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_capacity_summary_settlements'::regclass
   AND tgname='document_capacity_summary_settlement_frozen' AND tgfoid='public.guard_document_capacity_summary_settlement()'::regprocedure
   AND tgtype=31 AND tgenabled='O' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'Reviewed immutable summary settlements are required.' USING ERRCODE='55000'; END IF;
END; $auto_summary_preflight$;

CREATE OR REPLACE FUNCTION public.settle_internal_document_summary_capacity(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $settle_summary_capacity$
DECLARE expected public.document_capacity_reservations%ROWTYPE;stored public.document_capacity_summary_settlements%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=_operation_id) THEN
  RAISE EXCEPTION 'The counted summary completion cannot be repeated.' USING ERRCODE='42501'; END IF;
 SELECT * INTO expected FROM public.document_capacity_reservations WHERE operation_id=_operation_id
  AND producer_kind IN ('register','rescan') AND reserved_units=2 AND summary_job_id IS NOT NULL AND summary_operation_id IS NOT NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'The counted summary completion could not be confirmed.' USING ERRCODE='55000'; END IF;
 INSERT INTO public.document_capacity_summary_settlements(operation_id,summary_job_id,summary_operation_id)
 VALUES(expected.operation_id,expected.summary_job_id,expected.summary_operation_id) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM expected.operation_id OR stored.summary_job_id IS DISTINCT FROM expected.summary_job_id
  OR stored.summary_operation_id IS DISTINCT FROM expected.summary_operation_id THEN
  RAISE EXCEPTION 'The actual counted summary settlement was not confirmed.' USING ERRCODE='55000'; END IF;
END; $settle_summary_capacity$;

CREATE FUNCTION public.settle_completed_document_summary(_worker_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $auto_summary_settlement$
DECLARE reservation public.document_capacity_reservations%ROWTYPE;lease public.document_operation_leases%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=_worker_operation_id FOR SHARE;
 IF NOT FOUND OR lease.operation_kind IS DISTINCT FROM 'summary' OR lease.state IS DISTINCT FROM 'completed' OR lease.finished_at IS NULL THEN
  RAISE EXCEPTION 'The worker finish could not be confirmed.' USING ERRCODE='55000'; END IF;
 -- Read system xmin explicitly: it is not a field of a table %ROWTYPE.
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE operation_id=_worker_operation_id
  AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'The worker finish must commit with its own settlement.' USING ERRCODE='55000'; END IF;
 SELECT * INTO reservation FROM public.document_capacity_reservations WHERE summary_operation_id=_worker_operation_id FOR SHARE;
 IF NOT FOUND THEN
  IF EXISTS(SELECT 1 FROM public.document_summary_operation_bindings WHERE operation_id=_worker_operation_id) THEN
   RAISE EXCEPTION 'The tracked worker has no counted reservation.' USING ERRCODE='55000'; END IF;
  RETURN; -- Preserve the isolated generic admission protocol; no unit is freed.
 END IF;
 IF reservation.actor_id IS DISTINCT FROM lease.actor_id OR reservation.producer_kind NOT IN ('register','rescan') OR reservation.reserved_units<>2 THEN
  RAISE EXCEPTION 'The counted worker identity could not be confirmed.' USING ERRCODE='55000'; END IF;
 -- The existing immutable completion guard validates the exact selected job,
 -- source/result/attempt and completed worker. The hardened helper confirms the
 -- actual row saved, so neither a skipped nor a late altered write can succeed.
 PERFORM public.settle_internal_document_summary_capacity(reservation.operation_id);
END; $auto_summary_settlement$;
REVOKE ALL ON FUNCTION public.settle_completed_document_summary(uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $auto_summary_bridge_grant$
DECLARE admission_owner text;
BEGIN
 SELECT relowner::regrole::text INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.settle_completed_document_summary(uuid) TO %I',admission_owner);
END; $auto_summary_bridge_grant$;

CREATE FUNCTION public.guard_settled_document_summary_lease()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $settled_summary_lease$
BEGIN
 IF EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE summary_operation_id=OLD.operation_id)
  AND (TG_OP='DELETE' OR to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD)) THEN
  RAISE EXCEPTION 'The settled worker completion is retained.' USING ERRCODE='42501'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END; $settled_summary_lease$;
REVOKE ALL ON FUNCTION public.guard_settled_document_summary_lease() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_settled_summary_lease_frozen BEFORE UPDATE OR DELETE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_settled_document_summary_lease();

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
