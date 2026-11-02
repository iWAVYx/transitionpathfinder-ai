-- REVIEW PROPOSAL ONLY; fourteenth noncanonical/unapplied proposal.
-- Atomic transfer of the existing counted summary slot inside the existing
-- service-only one-use claim. No endpoint activation, fresh capacity unit,
-- paused starts, held release, provider IO, selected limits or hosted execution.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $counted_worker_preflight$
DECLARE item record;role_name text;paused_state boolean;admission_owner oid;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 IF admission_owner IS NULL OR admission_owner IS DISTINCT FROM (SELECT relowner FROM pg_class WHERE oid='public.document_operation_leases'::regclass) THEN
  RAISE EXCEPTION 'Reviewed admission ownership is required.' USING ERRCODE='55000'; END IF;
 FOR item IN SELECT * FROM (VALUES
  ('public.read_internal_document_rescan_completion(uuid,text)','6027e68e0591c80ac53fe6e79024c513',false,false),
  ('public.guard_document_rescan_completion_receipt()','66fc62f3994165d4d1cc5d2baae32f88',false,false),
  ('public.record_internal_document_rescan_completion(uuid)','d33cda072581b15c7172ca9046d8b958',true,false),
  ('public.guard_unfinished_document_rescan()','be1187efef8bef6e42bd2932bbc1f634',true,false),
  ('public.guard_completed_document_rescan_lease()','1217646df6772f74ae458ce269c71a49',true,false),
  ('public.guard_document_capacity_rescan_settlement()','d0847740f46ca699471dab7a2df59c00',false,false),
  ('public.settle_internal_document_rescan_capacity(uuid)','27739ecef53efbe6d20e553200bcca56',false,false),
  ('public.finish_document_operation(uuid,uuid,uuid,text)','02a82f905e1a198511cdeacade5f5138',true,true),
  ('public.guard_document_capacity_reservation()','4c09f0f14edc20a934e14923c5d80ff6',false,false),
  ('public.claim_admitted_document_summary(uuid,integer)','f583bd75fedfe8ab4ce31abefe7b12b3',true,false),
  ('public.claim_internal_document_capacity(uuid,uuid)','7cd786969a6084b1c51e26a182cc9200',false,false),
  ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828',false,false),
  ('public.read_verified_document_summary_source(uuid,timestamptz,integer)','6beb7e73b75e358ff530c8316650c1e5',true,false),
  ('public.read_internal_document_registration_completion(uuid)','dc3b28d28174e13759e47896e549a3b8',false,false),
  ('public.guard_document_registration_completion_receipt()','47defe9db1ab2e654d178d25e8dcb199',false,false),
  ('public.guard_rescan_document_summary_queue()','87ae8af9a7d7b2b7f30c0f2b5c106112',true,false),
  ('public.guard_document_summary_operation_binding()','b049daec1448ce2bc28812c4588c8b97',true,false)
,
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
  ('public.guard_bound_document_summary_job()','bec9836beb73d0e1ee37de07be97438c',true,false)
,
  ('public.guard_document_summary_operation_completion()','80e1d39564ed282104abea744faa45ea',true,false)
 ) x(signature,body_md5,definer,admission_owned) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proconfig=ARRAY['search_path=pg_catalog'] AND proowner=CASE WHEN item.admission_owned THEN admission_owner ELSE current_user::regrole::oid END) THEN
   RAISE EXCEPTION 'Reviewed counted worker prerequisites are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') IS DISTINCT FROM
    (role_name='service_role' AND item.signature IN ('public.begin_document_operation(uuid,uuid,text)','public.finish_document_operation(uuid,uuid,uuid,text)',
      'public.claim_admitted_document_summary(uuid,integer)','public.read_verified_document_summary_source(uuid,timestamptz,integer)')) THEN
    RAISE EXCEPTION 'Counted worker permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 PERFORM 1 FROM public.document_operation_leases WHERE false FOR SHARE;
 FOR item IN SELECT * FROM (VALUES
  ('public.document_capacity_reservations'),('public.document_summary_source_bindings'),('public.document_summary_operation_bindings'),
  ('public.document_registration_completion_receipts'),('public.document_rescan_source_bindings'),('public.document_rescan_outcome_receipts'),
  ('public.document_rescan_completion_receipts'),('public.document_capacity_rescan_settlements'),('public.document_upload_operation_bindings'),
  ('public.document_capacity_policy'),('public.document_capacity_summary_settlements'),('public.document_capacity_registration_settlements'),
  ('public.document_summary_completion_receipts'),('public.document_rescan_pending_receipts')
 ) x(relation_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Reviewed private worker tables are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private worker table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.document_summary_source_bindings','document_source_binding_immutable','public.reject_document_source_binding_mutation()',27,false),
  ('public.ai_jobs','ai_jobs_guard_bound_document_source','public.guard_bound_document_summary_job()',27,false),
  ('public.document_operation_leases','document_operation_summary_completion','public.guard_document_summary_operation_completion()',19,false),
  ('public.document_rescan_completion_receipts','document_rescan_completion_frozen','public.guard_document_rescan_completion_receipt()',31,false),
  ('public.document_summary_operation_bindings','summary_operation_binding_frozen','public.guard_document_summary_operation_binding()',27,false),
  ('public.document_capacity_reservations','document_capacity_frozen','public.guard_document_capacity_reservation()',31,false),
  ('public.document_registration_completion_receipts','document_registration_completion_frozen','public.guard_document_registration_completion_receipt()',31,false),
  ('public.document_rescan_outcome_receipts','document_rescan_outcome_frozen','public.guard_document_rescan_outcome_receipt()',31,false),
  ('public.document_rescan_outcome_receipts','document_rescan_outcome_committed','public.check_document_rescan_outcome_commit()',5,true),
  ('public.document_operation_leases','document_rescan_completed_lease_frozen','public.guard_completed_document_rescan_lease()',27,false)
 ) x(relation_name,trigger_name,signature,kind,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name) AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature)
   AND tgtype=item.kind AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred) THEN
   RAISE EXCEPTION 'Reviewed counted worker triggers are required.' USING ERRCODE='55000'; END IF;
 END LOOP;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Counted worker installation requires paused review.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate counted worker review.' USING ERRCODE='55000'; END IF;
END; $counted_worker_preflight$;

-- A held producer may supply read-only source/queue proof to its already
-- reserved summary. Actual producer finish and settlement still require active
-- and completed respectively; this does not create a held->completed path.
CREATE OR REPLACE FUNCTION public.read_internal_document_rescan_completion(_operation_id uuid,_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_completion_source$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;p public.document_rescan_pending_receipts%ROWTYPE;o public.document_rescan_outcome_receipts%ROWTYPE;
 a public.document_upload_attempts%ROWTYPE;origin public.document_upload_operation_bindings%ROWTYPE;d public.documents%ROWTYPE;
 l public.document_operation_leases%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;j public.ai_jobs%ROWTYPE;
 worker public.document_operation_leases%ROWTYPE;binding public.document_summary_operation_bindings%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO b FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id FOR SHARE;
 IF NOT FOUND OR public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(b.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN RAISE EXCEPTION 'This rescan completion could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO o FROM public.document_rescan_outcome_receipts WHERE operation_id=_operation_id FOR SHARE;
 IF NOT FOUND OR _state IS NULL OR _state NOT IN ('active','completed','needs_review') OR l.state IS DISTINCT FROM _state OR l.actor_id IS DISTINCT FROM b.actor_id
  OR l.operation_kind IS DISTINCT FROM 'rescan' OR (_state='completed' AND l.finished_at IS NULL)
  OR c.actor_id IS DISTINCT FROM b.actor_id OR c.student_id IS DISTINCT FROM b.student_id OR c.producer_kind IS DISTINCT FROM 'rescan' OR c.reserved_units<>2
  OR o.actor_id IS DISTINCT FROM b.actor_id OR o.document_id IS DISTINCT FROM b.document_id OR o.content_sha256 IS DISTINCT FROM b.content_sha256 OR o.outcome_txid=txid_current() THEN
  RAISE EXCEPTION 'This rescan needs exact saved completion evidence.' USING ERRCODE='55000'; END IF;
 SELECT * INTO p FROM public.document_rescan_pending_receipts WHERE operation_id=_operation_id FOR SHARE;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=b.attempt_id FOR SHARE;
 SELECT * INTO origin FROM public.document_upload_operation_bindings WHERE attempt_id=b.attempt_id FOR SHARE;
 IF NOT FOUND OR p.actor_id IS DISTINCT FROM b.actor_id OR p.document_id IS DISTINCT FROM b.document_id OR p.source_revision IS DISTINCT FROM b.source_revision
  OR p.content_sha256 IS DISTINCT FROM b.content_sha256 OR p.pending_revision IS DISTINCT FROM o.pending_revision OR o.outcome_revision<=p.pending_revision
  OR a.state IS DISTINCT FROM 'registered' OR a.registered_document_id IS DISTINCT FROM b.document_id OR a.student_id IS DISTINCT FROM b.student_id
  OR a.actor_id IS DISTINCT FROM origin.actor_id OR origin.student_id IS DISTINCT FROM b.student_id OR origin.operation_id IS DISTINCT FROM b.registration_operation_id
  OR a.storage_path IS DISTINCT FROM b.storage_path OR origin.storage_path IS DISTINCT FROM b.storage_path OR a.claimed_content_sha256 IS DISTINCT FROM b.content_sha256
  OR origin.registration_claimed_at IS NULL OR origin.content_sha256 IS DISTINCT FROM b.content_sha256 OR origin.review_context_sha256 IS DISTINCT FROM a.review_context_sha256
  OR origin.claimed_object_id IS DISTINCT FROM b.object_id OR origin.claimed_object_version IS DISTINCT FROM b.object_version
  OR NOT EXISTS(SELECT 1 FROM public.document_registration_completion_receipts done JOIN public.document_operation_leases reg ON reg.operation_id=done.operation_id
    WHERE done.operation_id=b.registration_operation_id AND done.operation_finished_at=reg.finished_at AND reg.state='completed' AND reg.operation_kind='register'
     AND reg.actor_id=a.actor_id AND done.actor_id=a.actor_id AND done.student_id=b.student_id AND done.attempt_id=a.id AND done.document_id=b.document_id
     AND done.disposition='clean_queued' AND done.object_id=b.object_id AND done.object_version=b.object_version AND done.storage_path=b.storage_path
     AND done.content_sha256=b.content_sha256 AND done.review_context_sha256=a.review_context_sha256) THEN
  RAISE EXCEPTION 'This rescan needs exact saved completion evidence.' USING ERRCODE='55000'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id FOR SHARE;
 IF NOT FOUND OR d.student_id IS DISTINCT FROM b.student_id OR d.upload_attempt_id IS DISTINCT FROM b.attempt_id OR d.uploaded_by IS DISTINCT FROM a.actor_id
  OR d.upload_review_context_sha256 IS DISTINCT FROM a.review_context_sha256 OR d.storage_path IS DISTINCT FROM b.storage_path
  OR d.storage_object_id IS DISTINCT FROM b.object_id OR d.storage_object_version IS DISTINCT FROM b.object_version OR d.content_hash IS DISTINCT FROM b.content_sha256
  OR d.size_bytes IS DISTINCT FROM b.size_bytes OR d.mime_type IS DISTINCT FROM b.mime_type OR d.deleted_at IS NOT NULL
  OR d.scan_data_id IS DISTINCT FROM o.scan_id::text OR d.scanned_at IS DISTINCT FROM o.scanned_at OR d.scan_verdict->>'provider' IS DISTINCT FROM 'cloudmersive'
  OR d.scan_verdict->>'content_sha256' IS DISTINCT FROM b.content_sha256 OR d.scan_verdict->>'source' IS DISTINCT FROM 'registration_reviewed_copy'
  OR d.scan_verdict->'rescan_reviewed_copy' IS DISTINCT FROM 'true'::jsonb OR jsonb_typeof(d.scan_verdict->'threats') IS DISTINCT FROM 'array'
  OR jsonb_typeof(d.scan_verdict->'blocked_reasons') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='55000'; END IF;
 IF jsonb_array_length(d.scan_verdict->'threats')<>o.threat_count OR jsonb_array_length(d.scan_verdict->'blocked_reasons')<>o.blocked_count THEN
  RAISE EXCEPTION 'This rescan source could not be confirmed.' USING ERRCODE='55000'; END IF;
 PERFORM 1 FROM storage.objects s WHERE s.id=b.object_id AND s.bucket_id='student-documents' AND s.name=b.storage_path
  AND to_jsonb(s)->>'owner_id'=a.actor_id::text AND to_jsonb(s)->>'version'=b.object_version AND s.metadata->'size'=to_jsonb(b.size_bytes)
  AND s.metadata->>'mimetype' ~* '^text/plain([;][[:space:]]*charset[[:space:]]*=[[:space:]]*(utf-8|us-ascii))?$' FOR SHARE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.document_rescan_source_bindings other JOIN public.document_operation_leases work USING(operation_id)
   WHERE other.document_id=b.document_id AND other.operation_id<>b.operation_id AND work.state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_operation_leases work WHERE operation_kind='rescan' AND state IN ('active','needs_review') AND operation_id<>b.operation_id
   AND NOT EXISTS(SELECT 1 FROM public.document_rescan_source_bindings known WHERE known.operation_id=work.operation_id)) THEN
  RAISE EXCEPTION 'This rescan source needs separate review.' USING ERRCODE='55000'; END IF;
 IF o.disposition='quarantined' THEN
  IF d.scan_status IS DISTINCT FROM 'infected' OR d.scan_verdict->>'code' IS DISTINCT FROM 'infected' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'false'::jsonb
   OR o.threat_count<=0 OR d.review_status IS DISTINCT FROM 'rejected' OR d.archived_at IS DISTINCT FROM o.scanned_at OR d.archived_by IS DISTINCT FROM b.actor_id
   OR d.archive_reason IS DISTINCT FROM 'auto-quarantined by reviewed rescan' OR c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL
   OR o.summary_job_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=b.operation_id)
   OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND lower(input_source->>'document_id')=b.document_id::text AND status<>'completed') THEN
   RAISE EXCEPTION 'This rescan quarantine could not be confirmed.' USING ERRCODE='55000'; END IF;
 ELSE
  IF d.scan_status IS DISTINCT FROM 'clean' OR d.scan_verdict->>'code' IS DISTINCT FROM 'clean' OR d.scan_verdict->'clean_result' IS DISTINCT FROM 'true'::jsonb
   OR o.threat_count<>0 OR o.blocked_count<>0 OR d.archived_at IS NOT NULL OR NULLIF(btrim(d.review_status),'') IS NULL OR d.review_status='rejected'
   OR c.summary_job_id IS DISTINCT FROM o.summary_job_id OR o.summary_job_id IS NULL THEN
   RAISE EXCEPTION 'This rescan clean result could not be confirmed.' USING ERRCODE='55000'; END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=o.summary_job_id FOR SHARE;
  IF NOT FOUND OR j.job_type IS DISTINCT FROM 'document_summary' OR j.student_id IS DISTINCT FROM b.student_id OR j.triggered_by_user_id IS DISTINCT FROM b.actor_id
   OR j.input_source IS DISTINCT FROM jsonb_build_object('document_id',b.document_id,'storage_path',b.storage_path) THEN
   RAISE EXCEPTION 'This rescan queue could not be confirmed.' USING ERRCODE='55000'; END IF;
  IF c.summary_operation_id IS NULL THEN
   IF j.status IS DISTINCT FROM 'queued' OR j.locked_at IS NOT NULL OR j.attempts<>0 OR j.result_id IS NOT NULL OR j.result_payload IS NOT NULL OR j.error_message IS NOT NULL THEN
    RAISE EXCEPTION 'This rescan queue needs separate review.' USING ERRCODE='55000'; END IF;
  ELSE
   SELECT * INTO binding FROM public.document_summary_operation_bindings WHERE job_id=j.id AND operation_id=c.summary_operation_id FOR SHARE;
   SELECT * INTO worker FROM public.document_operation_leases WHERE operation_id=c.summary_operation_id FOR SHARE;
   IF NOT FOUND OR binding.job_id IS NULL OR binding.actor_id IS DISTINCT FROM b.actor_id OR binding.student_id IS DISTINCT FROM b.student_id OR binding.document_id IS DISTINCT FROM b.document_id
    OR binding.storage_path IS DISTINCT FROM b.storage_path OR binding.object_id IS DISTINCT FROM b.object_id OR binding.object_version IS DISTINCT FROM b.object_version
    OR binding.content_sha256 IS DISTINCT FROM b.content_sha256 OR worker.actor_id IS DISTINCT FROM b.actor_id OR worker.operation_kind IS DISTINCT FROM 'summary'
    OR j.attempts IS DISTINCT FROM binding.claim_attempt THEN RAISE EXCEPTION 'This rescan worker needs separate review.' USING ERRCODE='55000'; END IF;
   IF j.status='processing' AND worker.state IN ('active','needs_review') AND j.locked_at=binding.claim_at THEN NULL;
   ELSIF j.status='needs_review' AND worker.state='needs_review' AND (j.locked_at IS NULL OR j.locked_at=binding.claim_at) THEN NULL;
   ELSIF j.status='completed' AND worker.state IN ('active','completed','needs_review') AND j.locked_at IS NULL
    AND EXISTS(SELECT 1 FROM public.document_summary_completion_receipts done WHERE done.job_id=j.id AND done.operation_id=worker.operation_id
     AND done.actor_id=b.actor_id AND done.student_id=b.student_id AND done.document_id=b.document_id AND done.object_id=b.object_id
     AND done.object_version=b.object_version AND done.storage_path=b.storage_path AND done.content_sha256=b.content_sha256
     AND done.claim_at=binding.claim_at AND done.claim_attempt=binding.claim_attempt
     AND j.result_payload->'_source'->>'document_id'=b.document_id::text AND j.result_payload->'_source'->>'object_id'=b.object_id::text
     AND j.result_payload->'_source'->>'object_version'=b.object_version AND j.result_payload->'_source'->>'content_sha256'=b.content_sha256) THEN NULL;
   ELSE RAISE EXCEPTION 'This rescan worker needs separate review.' USING ERRCODE='55000'; END IF;
  END IF;
 END IF;
 IF public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(b.actor_id,b.document_id) IS DISTINCT FROM true OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan completion could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- The twelfth-stage full-row snapshot is a commit-time witness only. Benign
 -- later metadata/derived-result updates do not change this immutable file tuple.
 RETURN jsonb_build_object('operation_id',b.operation_id,'actor_id',b.actor_id,'student_id',b.student_id,'document_id',b.document_id,'attempt_id',b.attempt_id,
  'object_id',b.object_id,'object_version',b.object_version,'storage_path',b.storage_path,'content_sha256',b.content_sha256,'size_bytes',b.size_bytes,'mime_type',b.mime_type,
  'source_revision',to_char(b.source_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'pending_revision',to_char(p.pending_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'outcome_revision',to_char(o.outcome_revision AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'scan_id',o.scan_id,'scanned_at',to_char(o.scanned_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'disposition',o.disposition,'summary_job_id',o.summary_job_id,'operation_finished_at',to_char(l.finished_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
END; $rescan_completion_source$;

CREATE OR REPLACE FUNCTION public.claim_admitted_document_summary(_job_id uuid,_expected_attempt integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=pg_catalog
AS $counted_summary_claim$
DECLARE j public.ai_jobs%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;attached public.document_capacity_reservations%ROWTYPE;
 parent public.document_operation_leases%ROWTYPE;registered public.document_registration_completion_receipts%ROWTYPE;
 bound public.document_summary_operation_bindings%ROWTYPE;source jsonb;producer jsonb;admitted jsonb;
BEGIN
 IF _job_id IS NULL OR _expected_attempt IS DISTINCT FROM 0 OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'The counted summary handoff could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- One common order: control -> capacity serialization -> exact reservation ->
 -- producer/source/job. The already-reserved summary adds no new capacity unit.
 PERFORM public.lock_internal_document_capacity();
 SELECT * INTO c FROM public.document_capacity_reservations WHERE summary_job_id=_job_id FOR UPDATE;
 IF NOT FOUND OR c.producer_kind NOT IN ('register','rescan') OR c.reserved_units<>2 OR c.summary_operation_id IS NOT NULL
  OR EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=c.operation_id) THEN
  RAISE EXCEPTION 'The exact counted summary reservation is required.' USING ERRCODE='42501'; END IF;
 SELECT * INTO parent FROM public.document_operation_leases WHERE operation_id=c.operation_id FOR SHARE;
 IF NOT FOUND OR parent.actor_id IS DISTINCT FROM c.actor_id OR parent.operation_kind IS DISTINCT FROM c.producer_kind
  OR parent.state NOT IN ('active','needs_review','completed') THEN
  RAISE EXCEPTION 'The counted summary producer could not be confirmed.' USING ERRCODE='42501'; END IF;
 IF c.producer_kind='register' THEN
  -- Registration has no separate immutable pre-finish outcome receipt yet.
  -- Require its actual guarded completion, never a typed clean/queued state.
  SELECT * INTO registered FROM public.document_registration_completion_receipts WHERE operation_id=c.operation_id FOR SHARE;
  IF NOT FOUND OR registered.disposition IS DISTINCT FROM 'clean_queued' OR registered.summary_job_id IS DISTINCT FROM _job_id
   OR registered.actor_id IS DISTINCT FROM c.actor_id OR registered.student_id IS DISTINCT FROM c.student_id
   OR registered.operation_finished_at IS DISTINCT FROM parent.finished_at OR registered.completion_txid=txid_current() THEN
   RAISE EXCEPTION 'The committed upload outcome is required.' USING ERRCODE='42501'; END IF;
  producer:=public.read_internal_document_registration_completion(c.operation_id);
  IF producer->>'disposition' IS DISTINCT FROM 'clean_queued' OR producer->>'summary_job_id' IS DISTINCT FROM _job_id::text
   OR producer->>'document_id' IS DISTINCT FROM registered.document_id::text OR producer->>'object_id' IS DISTINCT FROM registered.object_id::text
   OR producer->>'object_version' IS DISTINCT FROM registered.object_version OR producer->>'storage_path' IS DISTINCT FROM registered.storage_path
   OR producer->>'content_sha256' IS DISTINCT FROM registered.content_sha256 THEN
   RAISE EXCEPTION 'The counted upload source could not be confirmed.' USING ERRCODE='55000'; END IF;
 ELSE
  producer:=public.read_internal_document_rescan_completion(c.operation_id,parent.state);
  IF producer->>'disposition' IS DISTINCT FROM 'clean_queued' OR producer->>'summary_job_id' IS DISTINCT FROM _job_id::text THEN
   RAISE EXCEPTION 'The committed rescan queue is required.' USING ERRCODE='42501'; END IF;
 END IF;
 IF producer->>'operation_id' IS DISTINCT FROM c.operation_id::text OR producer->>'actor_id' IS DISTINCT FROM c.actor_id::text
  OR producer->>'student_id' IS DISTINCT FROM c.student_id::text THEN
  RAISE EXCEPTION 'The counted producer identity could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO j FROM public.ai_jobs WHERE id=_job_id AND job_type='document_summary' AND status='queued'
  AND locked_at IS NULL AND attempts=_expected_attempt FOR UPDATE;
 IF NOT FOUND OR j.triggered_by_user_id IS DISTINCT FROM c.actor_id OR j.student_id IS DISTINCT FROM c.student_id
  OR j.input_source IS DISTINCT FROM jsonb_build_object('document_id',(producer->>'document_id')::uuid,'storage_path',producer->>'storage_path')
  OR j.result_id IS NOT NULL OR j.result_payload IS NOT NULL OR j.error_message IS NOT NULL
  OR EXISTS(SELECT 1 FROM public.document_summary_operation_bindings WHERE job_id=j.id)
  OR EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=j.id) THEN
  RAISE EXCEPTION 'The counted summary job could not be confirmed.' USING ERRCODE='42501'; END IF;
 UPDATE public.ai_jobs SET status='processing',locked_at=clock_timestamp(),attempts=attempts+1 WHERE id=j.id RETURNING * INTO j;
 IF NOT FOUND OR j.status IS DISTINCT FROM 'processing' OR j.locked_at IS NULL OR j.attempts<>1 THEN
  RAISE EXCEPTION 'The counted job claim was not saved.' USING ERRCODE='55000'; END IF;
 source:=public.read_verified_document_summary_source(j.id,j.locked_at,j.attempts);
 IF source->>'schema' IS DISTINCT FROM 'verified-document-summary-source-v1' OR source->>'job_id' IS DISTINCT FROM j.id::text
  OR (source->>'claim_at')::timestamptz IS DISTINCT FROM j.locked_at OR (source->>'claim_attempt')::integer IS DISTINCT FROM j.attempts
  OR source->>'actor_id' IS DISTINCT FROM c.actor_id::text OR source->>'student_id' IS DISTINCT FROM c.student_id::text
  OR source->>'document_id' IS DISTINCT FROM producer->>'document_id' OR source->>'object_id' IS DISTINCT FROM producer->>'object_id'
  OR source->>'object_version' IS DISTINCT FROM producer->>'object_version' OR source->>'storage_path' IS DISTINCT FROM producer->>'storage_path'
  OR source->>'content_sha256' IS DISTINCT FROM producer->>'content_sha256'
  OR NOT EXISTS(SELECT 1 FROM public.document_summary_source_bindings WHERE job_id=j.id AND first_claim_at=j.locked_at
   AND first_claim_attempt=j.attempts AND first_admission_txid=txid_current()) THEN
  RAISE EXCEPTION 'The counted summary source could not be confirmed.' USING ERRCODE='55000'; END IF;
 admitted:=public.begin_document_operation(gen_random_uuid(),j.triggered_by_user_id,'summary');
 INSERT INTO public.document_summary_operation_bindings(job_id,operation_id,actor_id,student_id,document_id,object_id,object_version,storage_path,content_sha256,claim_at,claim_attempt)
 VALUES(j.id,(admitted->>'operation_id')::uuid,c.actor_id,c.student_id,(source->>'document_id')::uuid,(source->>'object_id')::uuid,
  source->>'object_version',source->>'storage_path',source->>'content_sha256',j.locked_at,j.attempts) RETURNING * INTO bound;
 IF NOT FOUND OR bound.job_id IS DISTINCT FROM j.id OR bound.operation_id IS DISTINCT FROM (admitted->>'operation_id')::uuid
  OR bound.actor_id IS DISTINCT FROM c.actor_id OR bound.student_id IS DISTINCT FROM c.student_id OR bound.document_id IS DISTINCT FROM (source->>'document_id')::uuid
  OR bound.object_id IS DISTINCT FROM (source->>'object_id')::uuid OR bound.object_version IS DISTINCT FROM source->>'object_version'
  OR bound.storage_path IS DISTINCT FROM source->>'storage_path' OR bound.content_sha256 IS DISTINCT FROM source->>'content_sha256'
  OR bound.claim_at IS DISTINCT FROM j.locked_at OR bound.claim_attempt IS DISTINCT FROM j.attempts THEN
  RAISE EXCEPTION 'The counted operation binding was not saved.' USING ERRCODE='55000'; END IF;
 PERFORM public.claim_internal_document_capacity(j.id,bound.operation_id);
 SELECT * INTO attached FROM public.document_capacity_reservations WHERE operation_id=c.operation_id FOR SHARE;
 IF NOT FOUND OR attached.summary_operation_id IS DISTINCT FROM bound.operation_id
  OR (to_jsonb(attached)-'summary_operation_id') IS DISTINCT FROM (to_jsonb(c)-'summary_operation_id') THEN
  RAISE EXCEPTION 'The counted summary transfer was not saved.' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('schema','document-summary-operation-claim-v1','job_id',j.id,'claim_at',j.locked_at,'claim_attempt',j.attempts,
  'actor_id',c.actor_id,'student_id',c.student_id,'document_id',source->>'document_id','object_id',source->>'object_id',
  'object_version',source->>'object_version','storage_path',source->>'storage_path','content_sha256',source->>'content_sha256',
  'operation_id',admitted->>'operation_id','receipt_id',admitted->>'receipt_id','revision',admitted->'revision');
END; $counted_summary_claim$;
-- CREATE OR REPLACE preserves the two existing owners and execution grants.
-- Only the existing claim RPC remains service-callable; no raw/private grant.
COMMIT;
