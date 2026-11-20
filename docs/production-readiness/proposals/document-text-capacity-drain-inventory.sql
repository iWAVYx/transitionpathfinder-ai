-- READ-ONLY UNIFIED TEXT-CAPACITY OPERATOR INVENTORY, not a migration, cancellation or approval.
-- Requires full trusted visibility after the reviewed capacity/no-save drafts.
-- Counts are one database snapshot; they do not prove external work has stopped.
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $drain_visibility$
DECLARE relation_name text;
BEGIN
 IF to_regclass('public.document_text_save_completions') IS NOT NULL THEN
  RAISE EXCEPTION 'Use completion-aware text capacity drain inventory.' USING ERRCODE='55000';END IF;
 IF current_setting('transaction_read_only')<>'on' OR current_setting('transaction_isolation')<>'repeatable read' THEN
  RAISE EXCEPTION 'A consistent read-only drain snapshot is required' USING ERRCODE='55000';END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_text_extraction_capacity','public.document_operation_control','public.document_operation_leases','public.document_capacity_reservations',
  'public.document_capacity_registration_settlements','public.document_capacity_rescan_settlements','public.document_apply_capacity_settlements',
  'public.document_capacity_summary_settlements','public.document_apply_no_save_reconciliations','public.ai_jobs'] LOOP
  IF to_regclass(relation_name) IS NULL OR NOT has_table_privilege(current_user,relation_name,'SELECT') OR row_security_active(relation_name::regclass) THEN
   RAISE EXCEPTION 'Full trusted drain visibility is required' USING ERRCODE='42501';END IF;
  EXECUTE format('LOCK TABLE %s IN ACCESS SHARE MODE',relation_name);
 END LOOP;
 IF (SELECT count(*) FROM public.document_operation_control)<>1 OR NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused IS NOT NULL) THEN
  RAISE EXCEPTION 'The exact control row is required' USING ERRCODE='55000';END IF;
END; $drain_visibility$;
WITH capacities AS MATERIALIZED (
 SELECT r.*,l.operation_id IS NOT NULL AND l.operation_kind=r.producer_kind AND l.actor_id=r.actor_id AS producer_matches,
  COALESCE(p.released_units,0) AS registered,COALESCE(x.released_units,0) AS rescanned,COALESCE(a.released_units,0) AS applied,
  COALESCE(n.released_units,0) AS reconciled,CASE WHEN s.operation_id IS NULL THEN 0 ELSE 1 END AS summarized,
  n.operation_id IS NULL OR (n.released_units=1 AND n.outcome='no_save_confirmed' AND l.operation_kind='apply' AND l.state='needs_review') AS no_save_matches,
  r.summary_job_id IS NULL OR (j.id IS NOT NULL AND j.job_type='document_summary') AS job_matches,
  r.summary_operation_id IS NULL OR (w.operation_id IS NOT NULL AND w.operation_kind='summary' AND w.actor_id=r.actor_id AND r.summary_job_id IS NOT NULL) AS worker_matches
 FROM public.document_capacity_reservations r
 LEFT JOIN public.document_operation_leases l USING(operation_id)
 LEFT JOIN public.document_capacity_registration_settlements p USING(operation_id)
 LEFT JOIN public.document_capacity_rescan_settlements x USING(operation_id)
 LEFT JOIN public.document_apply_capacity_settlements a USING(operation_id)
 LEFT JOIN public.document_capacity_summary_settlements s USING(operation_id)
 LEFT JOIN public.document_apply_no_save_reconciliations n USING(operation_id)
 LEFT JOIN public.ai_jobs j ON j.id=r.summary_job_id
 LEFT JOIN public.document_operation_leases w ON w.operation_id=r.summary_operation_id
), accounted AS MATERIALIZED (
 SELECT *,reserved_units-registered-rescanned-applied-reconciled-summarized AS remaining,
  producer_matches AND no_save_matches AND job_matches AND worker_matches
   AND reserved_units=CASE WHEN producer_kind='apply' THEN 1 ELSE 2 END AND producer_kind IN('register','rescan','apply')
   AND registered BETWEEN 0 AND 2 AND rescanned BETWEEN 0 AND 2 AND applied BETWEEN 0 AND 1 AND reconciled BETWEEN 0 AND 1
   AND (registered=0 OR producer_kind='register') AND (rescanned=0 OR producer_kind='rescan')
   AND (applied+reconciled=0 OR producer_kind='apply') AND (summarized=0 OR (reserved_units=2 AND summary_job_id IS NOT NULL AND summary_operation_id IS NOT NULL))
   AND (producer_kind<>'apply' OR (summary_job_id IS NULL AND summary_operation_id IS NULL))
   AND reserved_units-registered-rescanned-applied-reconciled-summarized BETWEEN 0 AND reserved_units AS consistent
 FROM capacities
), jobs AS MATERIALIZED (
 SELECT j.status,r.operation_id IS NOT NULL AS counted,r.summary_operation_id
 FROM public.ai_jobs j LEFT JOIN public.document_capacity_reservations r ON r.summary_job_id=j.id WHERE j.job_type='document_summary'
), leases AS MATERIALIZED (
 SELECT l.*,n.operation_id IS NOT NULL AND n.released_units=1 AND n.outcome='no_save_confirmed' AND l.operation_kind='apply' AND l.state='needs_review' AS reconciled_no_save
 FROM public.document_operation_leases l LEFT JOIN public.document_apply_no_save_reconciliations n USING(operation_id)
), totals AS (
 SELECT (SELECT count(*) FROM public.document_text_extraction_capacity) AS text_units,
  (SELECT count(*) FROM public.document_text_extraction_capacity WHERE state='active') AS text_active,
  (SELECT count(*) FROM public.document_text_extraction_capacity WHERE state='needs_review') AS text_held,
  (SELECT count(*) FROM leases WHERE state='active') AS active,
  (SELECT count(*) FROM leases WHERE state='needs_review' AND NOT reconciled_no_save) AS held,
  (SELECT count(*) FROM leases WHERE reconciled_no_save) AS reconciled,
  (SELECT count(*) FROM leases l WHERE l.state IN('active','needs_review') AND NOT l.reconciled_no_save AND NOT EXISTS(SELECT 1 FROM accounted r WHERE r.operation_id=l.operation_id OR r.summary_operation_id=l.operation_id)) AS uncounted_leases,
  (SELECT count(*) FROM accounted WHERE consistent IS DISTINCT FROM true) AS conflicts,
  (SELECT COALESCE(sum(remaining),0) FROM accounted) AS remaining,
  (SELECT count(*) FROM accounted WHERE reserved_units=2 AND summary_job_id IS NULL AND summarized=0 AND remaining>0) AS promised,
  (SELECT count(*) FROM jobs WHERE status='queued') AS queued,
  (SELECT count(*) FROM jobs WHERE status='queued' AND counted AND summary_operation_id IS NULL) AS queued_counted,
  (SELECT count(*) FROM jobs WHERE status='processing') AS processing,
  (SELECT count(*) FROM jobs WHERE status IS DISTINCT FROM 'completed' AND NOT counted) AS uncovered_jobs,
  (SELECT count(*) FROM jobs WHERE status IS NULL OR status NOT IN('queued','processing','needs_review','completed','failed')) AS unknown_states,
  (SELECT count(*) FROM jobs WHERE status='queued' AND summary_operation_id IS NOT NULL) AS queued_claim_conflicts,
  (SELECT count(*) FROM jobs WHERE status IS DISTINCT FROM 'completed') AS unfinished_jobs
)
SELECT jsonb_build_object('schema','document-text-capacity-drain-inventory-v1','read_only_transaction',true,'consistent_snapshot',true,
 'complete_relation_visibility',true,'private_values_emitted',false,'paused',c.paused,'control_revision',c.revision,
 'active_operations',t.active+t.text_active,'unresolved_held_operations',t.held+t.text_held,'text_extraction_reserved_units',t.text_units,'reconciled_no_save_operations',t.reconciled,
 'uncounted_operations',t.uncounted_leases,'capacity_conflicts',t.conflicts,
 'remaining_capacity_units',CASE WHEN t.conflicts=0 THEN t.remaining+t.text_units ELSE NULL END,
 'promised_unqueued_summary_units',t.promised,'queued_summaries',t.queued,'counted_queued_summaries',t.queued_counted,
 'processing_summaries',t.processing,'uncovered_unfinished_summaries',t.uncovered_jobs,'unknown_summary_states',t.unknown_states,
 'queued_claim_conflicts',t.queued_claim_conflicts,'tracked_operations_clear',t.active=0 AND t.held=0 AND t.text_units=0,
 'database_work_clear',t.active=0 AND t.held=0 AND t.text_units=0 AND t.uncounted_leases=0 AND t.conflicts=0 AND t.remaining=0 AND t.unfinished_jobs=0 AND t.unknown_states=0 AND t.queued_claim_conflicts=0,
 'provider_quiescence_verified',false,'legacy_writer_coverage_verified',false,'ready_for_cutover',false,'cleanup_authorized',false
) AS inventory FROM totals t CROSS JOIN public.document_operation_control c WHERE c.singleton;
COMMIT;
