-- Prepared canonical upload/summary boundary; hosted execution requires separate authorization.
-- Review mirror: docs/production-readiness/proposals/document-summary-source-binding.sql; execute only this canonical file.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
DO $preflight$
BEGIN
  IF to_regprocedure('public.claim_document_upload_resolution(uuid,text,uuid)') IS NULL
    OR to_regprocedure('public.read_verified_document_summary_source(uuid,timestamptz,integer)') IS NULL
    OR to_regprocedure('public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb)') IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass
      AND tgname='documents_guard_storage_binding' AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'The reviewed source and upload safeguards are required first.' USING ERRCODE='55000';
  END IF;
END;
$preflight$;
CREATE TABLE public.document_summary_source_bindings (
  job_id uuid PRIMARY KEY REFERENCES public.ai_jobs(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  storage_path text NOT NULL,
  object_id uuid NOT NULL,
  object_version text NOT NULL CHECK(btrim(object_version)<>'' AND char_length(object_version)<=1024),
  content_sha256 text NOT NULL CHECK(content_sha256 ~ '^[0-9a-f]{64}$'),
  first_claim_at timestamptz NOT NULL,
  first_claim_attempt integer NOT NULL CHECK(first_claim_attempt>0),
  first_admission_txid bigint NOT NULL DEFAULT txid_current(),
  bound_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.document_summary_source_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_summary_source_bindings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reject_document_source_binding_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $immutable$
BEGIN
  RAISE EXCEPTION 'This document source binding cannot be changed or removed.' USING ERRCODE='42501';
END;
$immutable$;
CREATE TRIGGER document_source_binding_immutable BEFORE UPDATE OR DELETE
  ON public.document_summary_source_bindings FOR EACH ROW
  EXECUTE FUNCTION public.reject_document_source_binding_mutation();
CREATE FUNCTION public.guard_bound_document_summary_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $guard$
DECLARE summary_row boolean:=OLD.job_type='document_summary';
BEGIN
  IF TG_OP='UPDATE' THEN summary_row:=summary_row OR NEW.job_type='document_summary'; END IF;
  IF summary_row AND current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'This document summary change could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=OLD.id) THEN
    IF TG_OP='DELETE' THEN
      RAISE EXCEPTION 'This document summary source is retained for review.' USING ERRCODE='42501';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.job_type IS DISTINCT FROM OLD.job_type
      OR NEW.student_id IS DISTINCT FROM OLD.student_id
      OR NEW.triggered_by_user_id IS DISTINCT FROM OLD.triggered_by_user_id
      OR NEW.input_source IS DISTINCT FROM OLD.input_source THEN
      RAISE EXCEPTION 'This document summary source cannot be reassigned.' USING ERRCODE='42501';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$guard$;
CREATE TRIGGER ai_jobs_guard_bound_document_source BEFORE UPDATE OR DELETE ON public.ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.guard_bound_document_summary_job();
CREATE OR REPLACE FUNCTION public.read_verified_document_summary_source(_job_id uuid,_claim_at timestamptz,_attempt integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $read_source$
DECLARE j public.ai_jobs%ROWTYPE; d public.documents%ROWTYPE; o storage.objects%ROWTYPE; context jsonb; binding public.document_summary_source_bindings%ROWTYPE;
BEGIN
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=_job_id AND job_type='document_summary'
    AND status='processing' AND locked_at=_claim_at AND attempts=_attempt AND _attempt>0 FOR UPDATE;
  IF NOT FOUND OR j.student_id IS NULL OR j.triggered_by_user_id IS NULL
    OR coalesce(j.input_source->>'document_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO d FROM public.documents WHERE id=(j.input_source->>'document_id')::uuid AND student_id=j.student_id
    AND archived_at IS NULL AND deleted_at IS NULL AND scan_status='clean' AND review_status<>'rejected'
    AND mime_type='text/plain' AND storage_object_id IS NOT NULL AND storage_object_version IS NOT NULL
    AND content_hash ~ '^[0-9a-f]{64}$'
    AND storage_path ~ ('^'||student_id::text||'/([A-Za-z0-9._-]+-)?privacy-safe-document[.]txt$')
    AND scan_verdict->>'code'='clean' AND scan_verdict->>'provider'='cloudmersive'
    AND scan_verdict->'clean_result'='true'::jsonb AND scan_verdict->'blocked_reasons'='[]'::jsonb
    AND scan_verdict->>'content_sha256'=content_hash AND scan_verdict->>'source'='registration_reviewed_copy'
    AND scanned_at IS NOT NULL AND scan_data_id IS NOT NULL AND btrim(scan_data_id)<>''
    FOR SHARE;
  IF NOT FOUND OR public.is_partner_only(j.triggered_by_user_id) IS DISTINCT FROM false
    OR public.can_edit_student(j.triggered_by_user_id,d.student_id) IS DISTINCT FROM true
    OR public.can_view_document(j.triggered_by_user_id,d.id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  SELECT object_row.* INTO o FROM storage.objects object_row WHERE object_row.id=d.storage_object_id AND object_row.bucket_id='student-documents' AND object_row.name=d.storage_path
    AND to_jsonb(object_row)->>'owner_id'=d.uploaded_by::text
    AND to_jsonb(object_row)->>'version'=d.storage_object_version FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object('studentFirstName',to_jsonb(s)->>'first_name','studentLastName',to_jsonb(s)->>'last_name',
    'schoolName',to_jsonb(s)->>'school_name','dateOfBirth',to_jsonb(s)->>'date_of_birth')
    INTO context FROM public.students s WHERE s.id=d.student_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO binding FROM public.document_summary_source_bindings WHERE job_id=j.id;
  IF FOUND THEN
    IF binding.actor_id IS DISTINCT FROM j.triggered_by_user_id OR binding.student_id IS DISTINCT FROM d.student_id
      OR binding.document_id IS DISTINCT FROM d.id OR binding.storage_path IS DISTINCT FROM d.storage_path
      OR binding.object_id IS DISTINCT FROM o.id OR binding.object_version IS DISTINCT FROM d.storage_object_version
      OR binding.content_sha256 IS DISTINCT FROM d.content_hash THEN
      RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
    END IF;
  ELSE
    INSERT INTO public.document_summary_source_bindings(job_id,actor_id,student_id,document_id,
      storage_path,object_id,object_version,content_sha256,first_claim_at,first_claim_attempt)
      VALUES(j.id,j.triggered_by_user_id,d.student_id,d.id,d.storage_path,o.id,d.storage_object_version,
        d.content_hash,j.locked_at,j.attempts);
  END IF;
  RETURN jsonb_build_object('schema','verified-document-summary-source-v1','job_id',j.id,'claim_at',j.locked_at,'claim_attempt',j.attempts,
    'document_id',d.id,'student_id',d.student_id,'actor_id',j.triggered_by_user_id,'storage_path',d.storage_path,
    'object_id',o.id,'object_version',d.storage_object_version,'content_sha256',d.content_hash,'context',context);
END;
$read_source$;
CREATE OR REPLACE FUNCTION public.complete_verified_document_summary(_job_id uuid,_claim_at timestamptz,_attempt integer,
  _actor_id uuid,_student_id uuid,_document_id uuid,_object_id uuid,_object_version text,_content_sha256 text,_privacy_context jsonb,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $complete_source$
DECLARE source jsonb; updated integer;
BEGIN
  -- Completion cannot invent provenance after model work. A prior successful
  -- source admission must have committed its immutable binding first.
  IF NOT EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=_job_id AND first_admission_txid<>txid_current()) THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='42501';
  END IF;
  source:=public.read_verified_document_summary_source(_job_id,_claim_at,_attempt);
  IF source->>'actor_id' IS DISTINCT FROM _actor_id::text OR source->>'student_id' IS DISTINCT FROM _student_id::text
    OR source->'context' IS DISTINCT FROM _privacy_context
    OR _document_id IS NULL OR _object_id IS NULL OR _object_version IS NULL OR _content_sha256 IS NULL
    OR source->>'document_id' IS DISTINCT FROM _document_id::text
    OR source->>'object_id' IS DISTINCT FROM _object_id::text
    OR source->>'object_version' IS DISTINCT FROM _object_version
    OR source->>'content_sha256' IS DISTINCT FROM _content_sha256
    OR _payload IS NULL OR jsonb_typeof(_payload)<>'object' OR char_length(_payload::text)>60000
    OR _payload->'_source'->>'document_id' IS DISTINCT FROM _document_id::text
    OR _payload->'_source'->>'object_id' IS DISTINCT FROM _object_id::text
    OR _payload->'_source'->>'object_version' IS DISTINCT FROM _object_version
    OR _payload->'_source'->>'content_sha256' IS DISTINCT FROM _content_sha256 THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='42501';
  END IF;
  UPDATE public.ai_jobs SET status='completed',result_payload=_payload,error_message=NULL,locked_at=NULL
    WHERE id=_job_id AND status='processing' AND locked_at=_claim_at AND attempts=_attempt;
  GET DIAGNOSTICS updated=ROW_COUNT;
  IF updated<>1 THEN
    RAISE EXCEPTION 'The document summary completion could not be verified.' USING ERRCODE='40001';
  END IF;
  RETURN jsonb_build_object('schema','verified-document-summary-commit-v1','job_id',_job_id,'status','completed',
    'document_id',_document_id,'actor_id',_actor_id,'student_id',_student_id,'content_sha256',_content_sha256);
END;
$complete_source$;
REVOKE ALL ON FUNCTION public.reject_document_source_binding_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_bound_document_summary_job() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) TO service_role;
REVOKE ALL ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) TO service_role;
COMMENT ON TABLE public.document_summary_source_bindings IS
  'Permanent first verified source identity, no document text or privacy context. Blocks job/document/student row deletion and source reassignment. No expiry, provider cancellation, physical-byte retention guarantee or cleanup authority.';
COMMIT;
