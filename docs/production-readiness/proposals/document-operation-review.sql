-- DRAFT ONLY. Trusted metadata review and immutable retain-work audit.
-- No release, completion, provider action, new student access or hosted install.
-- Operator UUID/artifact digest are attribution, not human authorization or
-- independent evidence that any external work has stopped.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $review_install$
DECLARE relation_name text; caller text; admission_owner oid;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.lock_internal_document_capacity_completion()')
   AND md5(prosrc)='be973fc53b7930db60f9456ba1f26548' AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
  RAISE EXCEPTION 'Reviewed paused metadata inspection prerequisites required' USING ERRCODE='55000'; END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.lock_internal_document_capacity_completion()','EXECUTE') THEN
   RAISE EXCEPTION 'Private capacity inspection helper required' USING ERRCODE='55000'; END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_capacity_reservations',
  'public.document_registration_completion_receipts','public.document_rescan_completion_receipts','public.document_apply_completion_receipts','public.document_summary_completion_receipts',
  'public.document_capacity_registration_settlements','public.document_capacity_rescan_settlements','public.document_apply_capacity_settlements','public.document_capacity_summary_settlements'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relkind='r' AND relrowsecurity
   AND relowner=CASE WHEN relation_name IN('public.document_operation_control','public.document_operation_leases') THEN admission_owner ELSE current_user::regrole::oid END)
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass(relation_name)) THEN
   RAISE EXCEPTION 'Reviewed private operation metadata required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Operation review metadata must remain private' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
END; $review_install$;
CREATE TABLE public.document_operation_reconciliation_reviews(
 review_id uuid PRIMARY KEY,operation_id uuid NOT NULL REFERENCES public.document_operation_leases(operation_id),
 operator_id uuid NOT NULL,snapshot_sha256 text NOT NULL CHECK(snapshot_sha256~'^[a-f0-9]{64}$'),
 artifact_digest text NOT NULL CHECK(artifact_digest~'^sha256:[a-f0-9]{64}$'),
 reason_class text NOT NULL CHECK(reason_class IN('provider_unknown','missing_receipt','source_changed','manual_review')),
 decision text NOT NULL DEFAULT 'retain_work' CHECK(decision='retain_work'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),review_txid bigint NOT NULL DEFAULT txid_current()
);
ALTER TABLE public.document_operation_reconciliation_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_operation_reconciliation_reviews FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_document_operation_review()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $immutable_review$
BEGIN RAISE EXCEPTION 'Operation review is retained' USING ERRCODE='42501'; END; $immutable_review$;
REVOKE ALL ON FUNCTION public.guard_document_operation_review() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_operation_review_retained BEFORE UPDATE OR DELETE ON public.document_operation_reconciliation_reviews
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_operation_review();
CREATE FUNCTION public.inspect_internal_document_operation_review(_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC'
AS $inspect_review$
DECLARE lease public.document_operation_leases%ROWTYPE;caps jsonb;cap public.document_capacity_reservations%ROWTYPE;facts jsonb;
 remaining integer;released integer;relation_name text;revision bigint;consistent boolean:=false;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT c.revision INTO revision FROM public.document_operation_control c WHERE singleton AND paused FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pause processing before trusted review' USING ERRCODE='55000'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_control','public.document_operation_leases','public.document_capacity_reservations',
  'public.document_registration_completion_receipts','public.document_rescan_completion_receipts','public.document_apply_completion_receipts','public.document_summary_completion_receipts',
  'public.document_capacity_registration_settlements','public.document_capacity_rescan_settlements','public.document_apply_capacity_settlements','public.document_capacity_summary_settlements'] LOOP
  IF row_security_active(relation_name::regclass) OR NOT has_table_privilege(current_user,relation_name,'SELECT') THEN
   RAISE EXCEPTION 'Full trusted metadata visibility required' USING ERRCODE='55000'; END IF;
 END LOOP;
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=_operation_id;
 IF NOT FOUND OR _operation_id IS NULL THEN RAISE EXCEPTION 'Exact operation review could not be confirmed' USING ERRCODE='42501'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(r) ORDER BY r.operation_id),'[]'::jsonb) INTO caps FROM public.document_capacity_reservations r
  WHERE r.operation_id=_operation_id OR r.summary_operation_id=_operation_id;
 IF jsonb_array_length(caps)=1 THEN
  SELECT * INTO cap FROM public.document_capacity_reservations WHERE operation_id=(caps->0->>'operation_id')::uuid;
  released:=COALESCE((SELECT released_units FROM public.document_capacity_registration_settlements WHERE operation_id=cap.operation_id),0)
   +COALESCE((SELECT released_units FROM public.document_capacity_rescan_settlements WHERE operation_id=cap.operation_id),0)
   +COALESCE((SELECT released_units FROM public.document_apply_capacity_settlements WHERE operation_id=cap.operation_id),0)
   +CASE WHEN EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=cap.operation_id) THEN 1 ELSE 0 END;
  remaining:=cap.reserved_units-released;
  consistent:=cap.actor_id=lease.actor_id AND cap.reserved_units IN(1,2) AND remaining BETWEEN 0 AND cap.reserved_units
   AND lease.state IN('active','needs_review','completed') AND (lease.state='completed' OR remaining>0)
   AND ((lease.operation_kind='summary' AND cap.summary_operation_id=lease.operation_id)
    OR (lease.operation_kind=cap.producer_kind AND cap.operation_id=lease.operation_id));
 END IF;
 facts:=jsonb_build_object('schema','document-operation-review-snapshot-v1','operation_id',lease.operation_id,
  'operation_kind',lease.operation_kind,'state',lease.state,'control_revision',revision,
  'reservation_present',jsonb_array_length(caps)=1,'accounting_consistent',COALESCE(consistent,false),
  'shared_reserved_units',CASE WHEN consistent THEN cap.reserved_units ELSE NULL END,
  'remaining_shared_units',CASE WHEN consistent THEN remaining ELSE NULL END,
  'recorded_completion',EXISTS(SELECT 1 FROM public.document_registration_completion_receipts WHERE operation_id=_operation_id)
   OR EXISTS(SELECT 1 FROM public.document_rescan_completion_receipts WHERE operation_id=_operation_id)
   OR EXISTS(SELECT 1 FROM public.document_apply_completion_receipts WHERE operation_id=_operation_id)
   OR EXISTS(SELECT 1 FROM public.document_summary_completion_receipts WHERE operation_id=_operation_id),
  'external_quiescence_verified',false,'release_permitted',false);
 RETURN facts||jsonb_build_object('snapshot_sha256',encode(sha256(convert_to((facts||jsonb_build_object('private_lease',to_jsonb(lease)-'receipt_id','private_capacity',caps))::text,'UTF8')),'hex'));
END; $inspect_review$;
REVOKE ALL ON FUNCTION public.inspect_internal_document_operation_review(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.inspect_document_operation_review(_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $review_boundary$
BEGIN RETURN public.inspect_internal_document_operation_review(_operation_id);END; $review_boundary$;
REVOKE ALL ON FUNCTION public.inspect_document_operation_review(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.inspect_document_operation_review(uuid) TO service_role;
CREATE FUNCTION public.record_document_operation_review(_review_id uuid,_operation_id uuid,_operator_id uuid,_expected_snapshot_sha256 text,_artifact_digest text,_reason_class text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $record_review$
DECLARE snapshot jsonb;stored public.document_operation_reconciliation_reviews%ROWTYPE;
BEGIN
 IF _review_id IS NULL OR _operation_id IS NULL OR _operator_id IS NULL OR _expected_snapshot_sha256 IS NULL
  OR _expected_snapshot_sha256 !~ '^[a-f0-9]{64}$' OR _artifact_digest IS NULL OR _artifact_digest !~ '^sha256:[a-f0-9]{64}$'
  OR _reason_class IS NULL OR _reason_class NOT IN('provider_unknown','missing_receipt','source_changed','manual_review') THEN
  RAISE EXCEPTION 'Exact metadata review reference required' USING ERRCODE='42501'; END IF;
 snapshot:=public.inspect_internal_document_operation_review(_operation_id);
 IF snapshot->>'snapshot_sha256' IS DISTINCT FROM _expected_snapshot_sha256 OR snapshot->>'state' IS NULL OR snapshot->>'state' NOT IN('active','needs_review') THEN
  RAISE EXCEPTION 'Operation review changed; inspect again' USING ERRCODE='55000'; END IF;
 INSERT INTO public.document_operation_reconciliation_reviews(review_id,operation_id,operator_id,snapshot_sha256,artifact_digest,reason_class)
 VALUES(_review_id,_operation_id,_operator_id,_expected_snapshot_sha256,_artifact_digest,_reason_class) RETURNING * INTO stored;
 IF NOT FOUND OR stored.review_id IS DISTINCT FROM _review_id OR stored.operation_id IS DISTINCT FROM _operation_id
  OR stored.operator_id IS DISTINCT FROM _operator_id OR stored.snapshot_sha256 IS DISTINCT FROM _expected_snapshot_sha256
  OR stored.artifact_digest IS DISTINCT FROM _artifact_digest OR stored.reason_class IS DISTINCT FROM _reason_class
  OR stored.decision IS DISTINCT FROM 'retain_work' OR stored.created_at IS NULL OR stored.review_txid<>txid_current() THEN
  RAISE EXCEPTION 'Actual retained operation review required' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('schema','document-operation-review-retained-v1','review_id',stored.review_id,'operation_id',stored.operation_id,'decision','retain_work','release_permitted',false);
END; $record_review$;
REVOKE ALL ON FUNCTION public.record_document_operation_review(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.record_document_operation_review(uuid,uuid,uuid,text,text,text) TO service_role;
COMMIT;
