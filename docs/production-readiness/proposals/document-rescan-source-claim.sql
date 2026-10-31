-- REVIEW PROPOSAL ONLY; tenth noncanonical/unapplied proposal.
-- Private metadata/capacity foundation, not an executable app/service API.
-- No file/provider IO, pending transition, completion/settlement, reconciliation
-- or historical/provider drain proof. Existing trusted owners only.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $rescan_claim_preflight$
DECLARE paused_state boolean; item record; role_name text; privilege_name text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_capacity_reservation()','fd1a2d66f6a7c7e6a0b6f115a0b71b3a'),
  ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828'),
  ('public.reserve_internal_document_capacity(uuid,uuid)','08c62d8c20c1c5cb0eb6b1bbd14cde2d')) x(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND NOT prosecdef
   AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']
   AND md5(prosrc)=item.body_md5) THEN
   RAISE EXCEPTION 'Reviewed private source/capacity prerequisites are required.' USING ERRCODE='55000';
  END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Private source/capacity permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 IF to_regclass('public.document_registration_completion_receipts') IS NULL
  OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.documents'::regclass AND attname='size_bytes' AND atttypid='integer'::regtype AND NOT attisdropped)
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='documents_guard_storage_binding' AND tgenabled='O' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'Reviewed registration and saved-source safeguards are required.' USING ERRCODE='55000';
 END IF;
 FOR item IN SELECT * FROM (VALUES ('public.document_capacity_policy'),('public.document_capacity_reservations'),('public.document_registration_completion_receipts')) x(relation_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Reviewed private source tables are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private source table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Rescan source review requires paused admission.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate rescan review.' USING ERRCODE='55000';
 END IF;
END; $rescan_claim_preflight$;
CREATE TABLE public.document_rescan_source_bindings (
 operation_id uuid PRIMARY KEY REFERENCES public.document_capacity_reservations(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
 source_revision timestamptz NOT NULL,attempt_id uuid NOT NULL REFERENCES public.document_upload_attempts(id) ON DELETE RESTRICT,
 registration_operation_id uuid NOT NULL REFERENCES public.document_operation_leases(operation_id) ON DELETE RESTRICT,
 storage_path text NOT NULL,object_id uuid NOT NULL,object_version text NOT NULL,
 content_sha256 text NOT NULL CHECK(content_sha256~'^[a-f0-9]{64}$'),
 size_bytes integer NOT NULL CHECK(size_bytes BETWEEN 1 AND 20971520),mime_type text NOT NULL CHECK(mime_type='text/plain'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),claim_txid bigint NOT NULL DEFAULT txid_current(),
 UNIQUE(document_id,source_revision),
 CHECK(btrim(object_version)<>'' AND char_length(object_version)<=1024)
);
ALTER TABLE public.document_rescan_source_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_rescan_source_bindings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_document_rescan_source_binding()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_source_guard$
DECLARE d public.documents%ROWTYPE;a public.document_upload_attempts%ROWTYPE;b public.document_upload_operation_bindings%ROWTYPE;
 lease public.document_operation_leases%ROWTYPE;capacity public.document_capacity_reservations%ROWTYPE;revision bigint;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'This rescan source is retained for review.' USING ERRCODE='42501'; END IF;
 revision:=public.lock_internal_document_capacity();
 -- Current authority precedes private registration/provider bookkeeping lookups.
 SELECT * INTO d FROM public.documents WHERE id=NEW.document_id;
 IF NOT FOUND OR public.can_edit_student(NEW.actor_id,d.student_id) IS DISTINCT FROM true
  OR public.can_view_document(NEW.actor_id,d.id) IS DISTINCT FROM true OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- Match the established attempt -> document -> object order. The common
 -- capacity mutex precedes all source and operation row locks.
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=NEW.attempt_id FOR SHARE;
 IF NOT FOUND OR a.state<>'registered' OR a.registered_document_id IS DISTINCT FROM d.id THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.document_upload_operation_bindings WHERE attempt_id=a.id FOR SHARE;
 IF NOT FOUND OR b.operation_id IS DISTINCT FROM NEW.registration_operation_id OR b.actor_id IS DISTINCT FROM a.actor_id
  OR b.student_id IS DISTINCT FROM a.student_id OR b.registration_claimed_at IS NULL THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR lease.operation_kind<>'register' OR lease.actor_id IS DISTINCT FROM b.actor_id OR lease.state<>'completed'
  OR NOT EXISTS(SELECT 1 FROM public.document_registration_completion_receipts proof WHERE proof.operation_id=lease.operation_id
   AND proof.operation_finished_at=lease.finished_at AND proof.disposition='clean_queued' AND proof.actor_id=b.actor_id AND proof.student_id=b.student_id
   AND proof.attempt_id=a.id AND proof.document_id=d.id AND proof.object_id=b.claimed_object_id AND proof.object_version=b.claimed_object_version
   AND proof.storage_path=b.storage_path AND proof.content_sha256=b.content_sha256 AND proof.review_context_sha256=b.review_context_sha256) THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=NEW.document_id FOR UPDATE;
 IF NOT FOUND OR d.student_id IS DISTINCT FROM NEW.student_id OR d.updated_at IS DISTINCT FROM NEW.source_revision
  OR d.scan_status<>'failed' OR d.scan_verdict->>'code'='infected' OR d.deleted_at IS NOT NULL OR d.archived_at IS NOT NULL OR d.review_status='rejected'
  OR d.upload_attempt_id IS DISTINCT FROM a.id OR d.uploaded_by IS DISTINCT FROM a.actor_id
  OR d.storage_path IS DISTINCT FROM NEW.storage_path OR d.storage_path IS DISTINCT FROM a.storage_path OR b.storage_path IS DISTINCT FROM d.storage_path
  OR d.storage_object_id IS DISTINCT FROM NEW.object_id OR d.storage_object_id IS DISTINCT FROM b.claimed_object_id
  OR d.storage_object_version IS DISTINCT FROM NEW.object_version OR d.storage_object_version IS DISTINCT FROM b.claimed_object_version
  OR d.content_hash IS DISTINCT FROM NEW.content_sha256 OR d.content_hash IS DISTINCT FROM a.claimed_content_sha256 OR b.content_sha256 IS DISTINCT FROM d.content_hash
  OR d.upload_review_context_sha256 IS DISTINCT FROM a.review_context_sha256 OR b.review_context_sha256 IS DISTINCT FROM a.review_context_sha256
  OR d.mime_type IS DISTINCT FROM NEW.mime_type OR d.size_bytes IS DISTINCT FROM NEW.size_bytes
  OR d.storage_path !~ ('^'||d.student_id::text||'/([A-Za-z0-9._-]+-)?privacy-safe-document[.]txt$') THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM storage.objects o WHERE o.id=NEW.object_id AND o.bucket_id='student-documents' AND o.name=NEW.storage_path
  AND to_jsonb(o)->>'owner_id'=d.uploaded_by::text AND to_jsonb(o)->>'version'=NEW.object_version
  AND jsonb_typeof(o.metadata->'size')='number' AND o.metadata->'size'=to_jsonb(NEW.size_bytes)
  AND o.metadata->>'mimetype' ~* '^text/plain([;][[:space:]]*charset[[:space:]]*=[[:space:]]*(utf-8|us-ascii))?$' FOR SHARE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.document_rescan_source_bindings prior JOIN public.document_operation_leases l ON l.operation_id=prior.operation_id
    WHERE prior.document_id=d.id AND l.state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_operation_leases unknown_work WHERE unknown_work.operation_kind='rescan'
    AND unknown_work.state IN ('active','needs_review') AND unknown_work.operation_id<>NEW.operation_id
    AND NOT EXISTS(SELECT 1 FROM public.document_rescan_source_bindings known_source WHERE known_source.operation_id=unknown_work.operation_id))
  OR EXISTS(SELECT 1 FROM public.ai_jobs j WHERE j.job_type='document_summary' AND lower(j.input_source->>'document_id')=d.id::text AND j.status<>'completed') THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.operation_id FOR SHARE;
 SELECT * INTO capacity FROM public.document_capacity_reservations WHERE operation_id=NEW.operation_id FOR SHARE;
 IF NOT FOUND OR lease.state IS DISTINCT FROM 'active' OR lease.operation_kind IS DISTINCT FROM 'rescan'
  OR lease.actor_id IS DISTINCT FROM NEW.actor_id OR lease.admitted_revision IS DISTINCT FROM revision
  OR capacity.actor_id IS DISTINCT FROM NEW.actor_id OR capacity.student_id IS DISTINCT FROM NEW.student_id OR capacity.producer_kind<>'rescan'
  OR capacity.reserved_units<>2 OR capacity.summary_job_id IS NOT NULL OR capacity.summary_operation_id IS NOT NULL
  OR NEW.claim_txid<>txid_current()
  OR public.can_edit_student(NEW.actor_id,d.student_id) IS DISTINCT FROM true OR public.can_view_document(NEW.actor_id,d.id) IS DISTINCT FROM true
  OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END; $rescan_source_guard$;
CREATE TRIGGER document_rescan_source_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_rescan_source_bindings
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_rescan_source_binding();
CREATE FUNCTION public.begin_internal_document_rescan(_operation_id uuid,_actor_id uuid,_document_id uuid,_expected_revision timestamptz,_source jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_begin$
DECLARE d public.documents%ROWTYPE;admitted jsonb;origin uuid;
BEGIN
 PERFORM public.lock_internal_document_capacity();
 SELECT * INTO d FROM public.documents WHERE id=_document_id;
 IF _operation_id IS NULL OR _actor_id IS NULL OR _expected_revision IS NULL OR NOT FOUND
  OR d.updated_at IS DISTINCT FROM _expected_revision OR public.can_edit_student(_actor_id,d.student_id) IS DISTINCT FROM true
  OR public.can_view_document(_actor_id,d.id) IS DISTINCT FROM true OR public.is_partner_only(_actor_id) IS DISTINCT FROM false
  OR _source IS DISTINCT FROM jsonb_build_object('student_id',d.student_id,'storage_path',d.storage_path,'storage_object_id',d.storage_object_id,
   'storage_object_version',d.storage_object_version,'content_hash',d.content_hash,'size_bytes',d.size_bytes,'mime_type',d.mime_type,'upload_attempt_id',d.upload_attempt_id) THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT operation_id INTO origin FROM public.document_upload_operation_bindings WHERE attempt_id=d.upload_attempt_id;
 admitted:=public.begin_document_operation(_operation_id,_actor_id,'rescan');
 PERFORM public.reserve_internal_document_capacity(_operation_id,d.student_id);
 INSERT INTO public.document_rescan_source_bindings(operation_id,actor_id,student_id,document_id,source_revision,attempt_id,registration_operation_id,
  storage_path,object_id,object_version,content_sha256,size_bytes,mime_type)
 VALUES(_operation_id,_actor_id,d.student_id,d.id,d.updated_at,d.upload_attempt_id,origin,d.storage_path,d.storage_object_id,d.storage_object_version,d.content_hash,d.size_bytes,d.mime_type);
 -- Only this insert returns a capability, never a duplicate/resume lookup.
 RETURN jsonb_build_object('schema','document-rescan-source-claim-v1','operation_id',_operation_id,'receipt_id',admitted->>'receipt_id',
  'revision',admitted->'revision','document_id',d.id,'source_revision',d.updated_at,'reserved_units',2);
END; $rescan_begin$;
CREATE FUNCTION public.guard_unfinished_document_rescan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $rescan_no_false_finish$
BEGIN
 IF NEW.state='completed' AND EXISTS(SELECT 1 FROM public.document_rescan_source_bindings WHERE operation_id=OLD.operation_id) THEN
  RAISE EXCEPTION 'This rescan needs source-bound completion review.' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $rescan_no_false_finish$;
CREATE TRIGGER document_rescan_no_false_finish BEFORE UPDATE ON public.document_operation_leases
 FOR EACH ROW EXECUTE FUNCTION public.guard_unfinished_document_rescan();
REVOKE ALL ON FUNCTION public.guard_document_rescan_source_binding(),public.begin_internal_document_rescan(uuid,uuid,uuid,timestamptz,jsonb),public.guard_unfinished_document_rescan() FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.document_rescan_source_bindings IS 'Private exact-source reservation foundation only. No API/service execution, pending transition, provider dispatch, outcome/queue completion, settlement or trusted held-work reconciliation. A completed old registration lease is not retrospective provider-quiescence proof. No activation until legacy/direct writers, current authority and physical/provider drain are separately verified.';
COMMIT;
