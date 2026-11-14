-- CANONICAL REVIEW MIRROR: 20261029020500_verified_document_summary_source.sql.
-- Do not execute this mirror as an additional migration. Hosted authorization is separate.
-- Apply after the five reviewed document/upload/summary-privacy proposals.
-- Service-only source receipt and compare-and-set completion; no provider IO.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $source_preflight$
BEGIN
  IF (SELECT count(*) FROM pg_catalog.pg_policy WHERE polrelid='public.ai_jobs'::regclass
    AND polname IN ('document_summary_explicit_read','document_summary_scoped_request','document_summary_server_update','document_summary_server_delete') AND NOT polpermissive)<>4
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='documents_guard_storage_binding' AND tgenabled='O' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='documents_guard_scan_state' AND tgenabled='O' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'The reviewed source and result privacy boundaries are required.' USING ERRCODE='55000';
  END IF;
END;
$source_preflight$;

CREATE FUNCTION public.read_verified_document_summary_source(_job_id uuid,_claim_at timestamptz,_attempt integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $read_source$
DECLARE j public.ai_jobs%ROWTYPE; d public.documents%ROWTYPE; o storage.objects%ROWTYPE; context jsonb;
BEGIN
  SELECT * INTO j FROM public.ai_jobs WHERE id=_job_id AND job_type='document_summary'
    AND status='processing' AND locked_at=_claim_at AND attempts=_attempt AND _attempt>0 FOR SHARE;
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
  RETURN jsonb_build_object('schema','verified-document-summary-source-v1','job_id',j.id,'claim_at',j.locked_at,'claim_attempt',j.attempts,
    'document_id',d.id,'student_id',d.student_id,'actor_id',j.triggered_by_user_id,'storage_path',d.storage_path,
    'object_id',o.id,'object_version',d.storage_object_version,'content_sha256',d.content_hash,'context',context);
END;
$read_source$;
REVOKE ALL ON FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_verified_document_summary_source(uuid,timestamptz,integer) TO service_role;

CREATE FUNCTION public.complete_verified_document_summary(_job_id uuid,_claim_at timestamptz,_attempt integer,
  _actor_id uuid,_student_id uuid,_document_id uuid,_object_id uuid,_object_version text,_content_sha256 text,_privacy_context jsonb,_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $complete_source$
DECLARE source jsonb; updated integer;
BEGIN
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
REVOKE ALL ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_verified_document_summary(uuid,timestamptz,integer,uuid,uuid,uuid,uuid,text,text,jsonb,jsonb) TO service_role;
COMMIT;
