-- READ-ONLY REVIEW INVENTORY, not a migration or an execution permission.
-- Run only with specifically authorized database access and ON_ERROR_STOP=1.
-- Requires the retained-source proposal. No private IDs, paths, hashes or text
-- are emitted. Counts are one snapshot; they do not prove worker quiescence.
BEGIN READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $visibility$
BEGIN
  IF current_setting('transaction_read_only') <> 'on'
    OR to_regclass('public.document_summary_source_bindings') IS NULL THEN
    RAISE EXCEPTION 'The read-only source review prerequisites are unavailable.' USING ERRCODE='55000';
  END IF;
  -- Hold relation/RLS definitions stable without blocking row writers.
  LOCK TABLE public.ai_jobs,public.documents,public.document_summary_source_bindings IN ACCESS SHARE MODE;
  IF NOT has_table_privilege(current_user,'public.ai_jobs','SELECT')
    OR NOT has_table_privilege(current_user,'public.document_summary_source_bindings','SELECT')
    OR NOT has_table_privilege(current_user,'public.documents','SELECT')
    OR row_security_active('public.ai_jobs'::regclass)
    OR row_security_active('public.document_summary_source_bindings'::regclass)
    OR row_security_active('public.documents'::regclass) THEN
    RAISE EXCEPTION 'Complete visibility is required for this source review.' USING ERRCODE='42501';
  END IF;
END;
$visibility$;
-- COUNTS QUERY
WITH jobs AS MATERIALIZED (
  SELECT j.status,j.locked_at,j.attempts,b.job_id IS NOT NULL AS bound
    FROM public.ai_jobs j LEFT JOIN public.document_summary_source_bindings b ON b.job_id=j.id
    WHERE j.job_type='document_summary'
), states AS (
  SELECT state FROM (VALUES('queued'),('processing'),('needs_review'),('completed'),('failed')) s(state)
), retained AS (
  SELECT b.job_id,
    j.id IS NULL OR j.job_type IS DISTINCT FROM 'document_summary'
      OR j.student_id IS DISTINCT FROM b.student_id
      OR j.triggered_by_user_id IS DISTINCT FROM b.actor_id
      OR j.input_source->>'document_id' IS DISTINCT FROM b.document_id::text AS job_conflict,
    d.id IS NULL OR d.student_id IS DISTINCT FROM b.student_id
      OR d.storage_path IS DISTINCT FROM b.storage_path
      OR d.storage_object_id IS DISTINCT FROM b.object_id
      OR d.storage_object_version IS DISTINCT FROM b.object_version
      OR d.content_hash IS DISTINCT FROM b.content_sha256 AS document_conflict
    FROM public.document_summary_source_bindings b
    LEFT JOIN public.ai_jobs j ON j.id=b.job_id
    LEFT JOIN public.documents d ON d.id=b.document_id
)
SELECT jsonb_build_object(
  'schema','document-summary-rollout-inventory-v1',
  'read_only_transaction',current_setting('transaction_read_only')='on',
  'complete_relation_visibility',true,
  'private_values_emitted',false,
  'by_state',(SELECT jsonb_agg(jsonb_build_object('state',s.state,
    'bound',(SELECT count(*) FROM jobs j WHERE j.status=s.state AND j.bound),
    'unbound',(SELECT count(*) FROM jobs j WHERE j.status=s.state AND NOT j.bound)) ORDER BY s.state) FROM states s),
  'unknown_state_count',(SELECT count(*) FROM jobs WHERE status IS NULL OR status NOT IN(SELECT state FROM states)),
  'processing_claim_conflict_count',(SELECT count(*) FROM jobs WHERE status='processing' AND (locked_at IS NULL OR attempts IS NULL OR attempts<1)),
  'nonprocessing_locked_count',(SELECT count(*) FROM jobs WHERE status IS DISTINCT FROM 'processing' AND locked_at IS NOT NULL),
  'unbound_reconciliation_count',(SELECT count(*) FROM jobs WHERE NOT bound),
  'retained_binding_count',(SELECT count(*) FROM retained),
  'retained_job_identity_conflict_count',(SELECT count(*) FROM retained WHERE job_conflict),
  'retained_document_identity_conflict_count',(SELECT count(*) FROM retained WHERE document_conflict),
  'worker_quiescence_verified',false,'provider_work_reconciled',false,
  'retention_review_complete',false,'rollout_authorized',false,'cleanup_authorized',false
) AS inventory;
COMMIT;
