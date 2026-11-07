-- PRE-INSTALL READ-ONLY review. Separate authorization and trusted target identity required.
-- Aggregate metadata only. No provider IO, repair, worker drain or release authority.
BEGIN READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $visibility$
DECLARE relation_name text; relation_id regclass;
BEGIN
 IF current_setting('transaction_read_only')<>'on' THEN RAISE EXCEPTION 'Read-only review required.' USING ERRCODE='55000'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.students','public.documents','public.ai_jobs','storage.objects','supabase_migrations.schema_migrations'] LOOP
  relation_id:=to_regclass(relation_name);
  IF relation_id IS NULL OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=relation_id AND relkind IN ('r','p')) THEN
   RAISE EXCEPTION 'Expected base relation unavailable.' USING ERRCODE='55000';
  END IF;
  EXECUTE format('LOCK TABLE %s IN ACCESS SHARE MODE',relation_id);
  IF NOT has_table_privilege(current_user,relation_id,'SELECT') OR row_security_active(relation_id) THEN
   RAISE EXCEPTION 'Complete visibility required for document rollout review.' USING ERRCODE='42501';
  END IF;
 END LOOP;
 IF to_regclass('public.document_upload_attempts') IS NOT NULL
  OR to_regclass('public.document_summary_source_bindings') IS NOT NULL
  OR to_regprocedure('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)') IS NOT NULL
  OR EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version>='20261029010000') THEN
  RAISE EXCEPTION 'Partial or newer installation requires separate reconciliation.' USING ERRCODE='55000';
 END IF;
END; $visibility$;
-- COUNTS QUERY
WITH document_state AS MATERIALIZED (
 SELECT d.*,s.id IS NULL AS missing_student,o.id IS NULL AS missing_object,
   to_jsonb(o)->>'owner_id' AS managed_owner,to_jsonb(o)->>'version' AS managed_version
 FROM public.documents d LEFT JOIN public.students s ON s.id=d.student_id
 LEFT JOIN storage.objects o ON o.bucket_id='student-documents' AND o.name=d.storage_path
), collisions AS (
 SELECT storage_path FROM public.documents WHERE storage_path IS NOT NULL AND storage_path<>'' GROUP BY storage_path HAVING count(*)>1
), jobs AS MATERIALIZED (SELECT status,locked_at FROM public.ai_jobs WHERE job_type='document_summary')
SELECT jsonb_build_object(
 'schema','document-upload-chain-preflight-v1','read_only',true,'complete_relation_visibility',true,
 'document_count',(SELECT count(*) FROM document_state),
 'duplicate_path_groups',(SELECT count(*) FROM collisions),
 'legacy_path_review_count',(SELECT count(*) FROM document_state WHERE student_id IS NULL OR storage_path IS NULL OR storage_path !~ ('^'||student_id::text||'/[A-Za-z0-9._-]+$') OR split_part(storage_path,'/',2) IN ('.','..') OR length(storage_path)>500),
 'missing_student_count',(SELECT count(*) FROM document_state WHERE missing_student),
 'missing_managed_object_count',(SELECT count(*) FROM document_state WHERE missing_object),
 'owner_metadata_review_count',(SELECT count(*) FROM document_state WHERE NOT missing_object AND (managed_owner IS DISTINCT FROM uploaded_by::text OR uploaded_by IS NULL)),
 'version_metadata_review_count',(SELECT count(*) FROM document_state WHERE NOT missing_object AND (managed_version IS NULL OR btrim(managed_version)='' OR length(managed_version)>1024)),
 'quarantine_review_count',(SELECT count(*) FROM document_state WHERE scan_status IS DISTINCT FROM 'clean' OR scan_verdict->>'code'='infected' OR review_status='rejected' OR archived_at IS NOT NULL OR deleted_at IS NOT NULL),
 'summary_job_count',(SELECT count(*) FROM jobs),
 'summary_processing_or_claimed_count',(SELECT count(*) FROM jobs WHERE status='processing' OR locked_at IS NOT NULL),
 'summary_unknown_state_count',(SELECT count(*) FROM jobs WHERE status IS NULL OR status NOT IN ('queued','processing','needs_review','completed','failed')),
 'prerequisite_ledger',COALESCE((SELECT jsonb_agg(jsonb_build_object('version',version,'name',name,'statements_md5',md5(statements::text)) ORDER BY version) FROM supabase_migrations.schema_migrations WHERE version IN ('20261023030000','20261024010000','20261026010000')),'[]'::jsonb),
 'old_handlers_drained',false,'legacy_data_reconciled',false,'provider_bytes_verified',false,
 'retention_approved',false,'rollout_authorized',false,'cleanup_authorized',false
) AS inventory;
COMMIT;
