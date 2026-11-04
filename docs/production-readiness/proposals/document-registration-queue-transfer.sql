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
