-- REVIEW PROPOSAL ONLY; eleventh noncanonical/unapplied proposal.
-- One owner-internal failed -> pending transition after a source/capacity claim.
-- No ordinary/service execution, endpoint wiring, scanner dispatch, source-bound
-- outcome/completion/settlement, held reconciliation or physical/provider proof.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $rescan_pending_preflight$
DECLARE item record;role_name text;paused_state boolean;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.guard_document_rescan_source_binding()','9cde41dda57eaaac0ac7aacb666e27a2',false),
  ('public.begin_internal_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)','5813809f271e1b2b94af7ffa0b11ffd4',false),
  ('public.guard_unfinished_document_rescan()','5df6d295d63bfe0a3441e1050fef1212',true),
  ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false)) x(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Reviewed private rescan prerequisites are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(role_name,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Private rescan execution drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES ('public.document_rescan_source_bindings'),('public.document_capacity_reservations')) x(relation_name) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(item.relation_name) AND relrowsecurity AND relowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Reviewed private rescan tables are required.' USING ERRCODE='55000'; END IF;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_any_column_privilege(role_name,item.relation_name,'SELECT,INSERT,UPDATE') THEN
    RAISE EXCEPTION 'Private rescan table permission drift.' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.documents'::regclass AND tgname='set_updated_at_documents' AND tgtype=19
  AND tgfoid=to_regprocedure('public.set_updated_at()') AND tgenabled='O' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'The reviewed document revision trigger is required.' USING ERRCODE='55000'; END IF;
 SELECT paused INTO paused_state FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR paused_state IS DISTINCT FROM true THEN RAISE EXCEPTION 'Pending transition review requires paused admission.' USING ERRCODE='55000'; END IF;
 LOCK TABLE public.ai_jobs IN SHARE ROW EXCLUSIVE MODE;
 IF EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.ai_jobs WHERE job_type='document_summary' AND status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_rescan_source_bindings) OR EXISTS(SELECT 1 FROM public.document_capacity_reservations)
  OR NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units IS NULL AND actor_units IS NULL AND student_units IS NULL) THEN
  RAISE EXCEPTION 'Existing work requires separate pending-transition review.' USING ERRCODE='55000'; END IF;
END; $rescan_pending_preflight$;
CREATE TABLE public.document_rescan_pending_receipts (
 operation_id uuid PRIMARY KEY REFERENCES public.document_rescan_source_bindings(operation_id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL,document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
 source_revision timestamptz NOT NULL,pending_revision timestamptz NOT NULL CHECK(pending_revision>source_revision),
 content_sha256 text NOT NULL CHECK(content_sha256~'^[a-f0-9]{64}$'),
 transition_txid bigint NOT NULL DEFAULT txid_current(),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(document_id,source_revision)
);
ALTER TABLE public.document_rescan_pending_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_rescan_pending_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.assert_internal_document_rescan_source(_operation_id uuid,_actor_id uuid,_status text,_revision timestamptz)
RETURNS public.document_rescan_source_bindings LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $assert_rescan_source$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;a public.document_upload_attempts%ROWTYPE;
 origin public.document_upload_operation_bindings%ROWTYPE;d public.documents%ROWTYPE;l public.document_operation_leases%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;
BEGIN
 -- Previously admitted work may drain while paused; this does not admit more.
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT * INTO b FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id FOR SHARE;
 IF NOT FOUND OR _actor_id IS NULL OR b.actor_id IS DISTINCT FROM _actor_id OR _revision IS NULL OR _status IS NULL OR _status NOT IN ('failed','pending') THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id;
 IF NOT FOUND OR public.can_edit_student(_actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(_actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(_actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.document_upload_attempts WHERE id=b.attempt_id FOR SHARE;
 SELECT * INTO origin FROM public.document_upload_operation_bindings WHERE attempt_id=b.attempt_id FOR SHARE;
 IF NOT FOUND OR a.state IS DISTINCT FROM 'registered' OR a.registered_document_id IS DISTINCT FROM b.document_id OR a.actor_id IS DISTINCT FROM origin.actor_id
  OR a.student_id IS DISTINCT FROM b.student_id OR origin.student_id IS DISTINCT FROM b.student_id OR origin.operation_id IS DISTINCT FROM b.registration_operation_id
  OR a.storage_path IS DISTINCT FROM b.storage_path OR origin.storage_path IS DISTINCT FROM b.storage_path
  OR a.claimed_content_sha256 IS DISTINCT FROM b.content_sha256 OR origin.content_sha256 IS DISTINCT FROM b.content_sha256
  OR origin.review_context_sha256 IS DISTINCT FROM a.review_context_sha256 OR origin.registration_claimed_at IS NULL
  OR origin.claimed_object_id IS DISTINCT FROM b.object_id OR origin.claimed_object_version IS DISTINCT FROM b.object_version THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.registration_operation_id FOR SHARE;
 IF NOT FOUND OR l.state<>'completed' OR l.operation_kind<>'register' OR l.actor_id IS DISTINCT FROM a.actor_id
  OR NOT EXISTS(SELECT 1 FROM public.document_registration_completion_receipts p WHERE p.operation_id=l.operation_id AND p.operation_finished_at=l.finished_at
    AND p.actor_id=a.actor_id AND p.student_id=b.student_id AND p.attempt_id=a.id AND p.document_id=b.document_id AND p.disposition='clean_queued'
    AND p.object_id=b.object_id AND p.object_version=b.object_version AND p.storage_path=b.storage_path AND p.content_sha256=b.content_sha256 AND p.review_context_sha256=a.review_context_sha256) THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=b.document_id FOR UPDATE;
 IF NOT FOUND OR d.updated_at IS DISTINCT FROM _revision OR d.scan_status IS DISTINCT FROM _status
  OR (_status='failed' AND _revision IS DISTINCT FROM b.source_revision) OR (_status='pending' AND _revision<=b.source_revision)
  OR d.student_id IS DISTINCT FROM b.student_id OR d.upload_attempt_id IS DISTINCT FROM b.attempt_id OR d.uploaded_by IS DISTINCT FROM a.actor_id
  OR d.upload_review_context_sha256 IS DISTINCT FROM a.review_context_sha256 OR d.storage_path IS DISTINCT FROM b.storage_path
  OR d.storage_object_id IS DISTINCT FROM b.object_id OR d.storage_object_version IS DISTINCT FROM b.object_version OR d.content_hash IS DISTINCT FROM b.content_sha256
  OR d.size_bytes IS DISTINCT FROM b.size_bytes OR d.mime_type IS DISTINCT FROM b.mime_type OR d.deleted_at IS NOT NULL OR d.archived_at IS NOT NULL
  OR d.review_status IS NULL OR d.review_status='rejected' OR d.scan_verdict->>'code'='infected' THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM storage.objects o WHERE o.id=b.object_id AND o.bucket_id='student-documents' AND o.name=b.storage_path
  AND to_jsonb(o)->>'owner_id'=d.uploaded_by::text AND to_jsonb(o)->>'version'=b.object_version
  AND jsonb_typeof(o.metadata->'size')='number' AND o.metadata->'size'=to_jsonb(b.size_bytes)
  AND o.metadata->>'mimetype' ~* '^text/plain([;][[:space:]]*charset[[:space:]]*=[[:space:]]*(utf-8|us-ascii))?$' FOR SHARE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM public.ai_jobs j WHERE j.job_type='document_summary' AND lower(j.input_source->>'document_id')=b.document_id::text AND j.status<>'completed')
  OR EXISTS(SELECT 1 FROM public.document_rescan_source_bindings other JOIN public.document_operation_leases work ON work.operation_id=other.operation_id
    WHERE other.document_id=b.document_id AND other.operation_id<>b.operation_id AND work.state IN ('active','needs_review'))
  OR EXISTS(SELECT 1 FROM public.document_operation_leases work WHERE work.operation_kind='rescan' AND work.state IN ('active','needs_review') AND work.operation_id<>b.operation_id
    AND NOT EXISTS(SELECT 1 FROM public.document_rescan_source_bindings known WHERE known.operation_id=work.operation_id)) THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR SHARE;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=b.operation_id FOR SHARE;
 IF NOT FOUND OR l.state IS DISTINCT FROM 'active' OR l.operation_kind IS DISTINCT FROM 'rescan' OR l.actor_id IS DISTINCT FROM b.actor_id
  OR c.actor_id IS DISTINCT FROM b.actor_id OR c.student_id IS DISTINCT FROM b.student_id OR c.producer_kind IS DISTINCT FROM 'rescan' OR c.reserved_units<>2
  OR c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL
  OR public.can_edit_student(_actor_id,b.student_id) IS DISTINCT FROM true OR public.can_view_document(_actor_id,b.document_id) IS DISTINCT FROM true OR public.is_partner_only(_actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 RETURN b;
END; $assert_rescan_source$;
CREATE FUNCTION public.guard_document_rescan_pending_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $rescan_pending_guard$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'This rescan transition is retained for review.' USING ERRCODE='42501'; END IF;
 b:=public.assert_internal_document_rescan_source(NEW.operation_id,NEW.actor_id,'pending',NEW.pending_revision);
 IF NEW.document_id IS DISTINCT FROM b.document_id OR NEW.source_revision IS DISTINCT FROM b.source_revision
  OR NEW.content_sha256 IS DISTINCT FROM b.content_sha256 OR NEW.transition_txid<>txid_current()
  OR NOT EXISTS(SELECT 1 FROM public.documents WHERE id=b.document_id AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- xmin is only a same-transaction row-write witness, never permanent source
 -- identity, byte attestation or evidence that a provider ran or stopped.
 RETURN NEW;
END; $rescan_pending_guard$;
CREATE TRIGGER document_rescan_pending_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_rescan_pending_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_rescan_pending_receipt();
CREATE FUNCTION public.mark_internal_document_rescan_pending(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_observed_content_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $mark_rescan_pending$
DECLARE b public.document_rescan_source_bindings%ROWTYPE;l public.document_operation_leases%ROWTYPE;before_row public.documents%ROWTYPE;after_row public.documents%ROWTYPE;stored public.document_rescan_pending_receipts%ROWTYPE;
BEGIN
 b:=public.assert_internal_document_rescan_source(_operation_id,_actor_id,'failed',(SELECT source_revision FROM public.document_rescan_source_bindings WHERE operation_id=_operation_id));
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=b.operation_id FOR UPDATE;
 IF _receipt_id IS NULL OR l.receipt_id IS DISTINCT FROM _receipt_id OR _observed_content_sha256 IS DISTINCT FROM b.content_sha256
  OR EXISTS(SELECT 1 FROM public.document_rescan_pending_receipts WHERE operation_id=b.operation_id) THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO before_row FROM public.documents WHERE id=b.document_id;
 UPDATE public.documents SET scan_status='pending' WHERE id=b.document_id AND scan_status='failed' AND updated_at=b.source_revision RETURNING * INTO after_row;
 IF NOT FOUND OR after_row.updated_at<=b.source_revision OR after_row.scan_status IS DISTINCT FROM 'pending'
  OR (to_jsonb(before_row)-ARRAY['scan_status','updated_at']) IS DISTINCT FROM (to_jsonb(after_row)-ARRAY['scan_status','updated_at']) THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 INSERT INTO public.document_rescan_pending_receipts(operation_id,actor_id,document_id,source_revision,pending_revision,content_sha256)
 VALUES(b.operation_id,b.actor_id,b.document_id,b.source_revision,after_row.updated_at,b.content_sha256) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM b.operation_id OR stored.actor_id IS DISTINCT FROM b.actor_id OR stored.document_id IS DISTINCT FROM b.document_id
  OR stored.source_revision IS DISTINCT FROM b.source_revision OR stored.pending_revision IS DISTINCT FROM after_row.updated_at
  OR stored.content_sha256 IS DISTINCT FROM b.content_sha256 OR stored.transition_txid<>txid_current() THEN
  RAISE EXCEPTION 'This rescan transition could not be confirmed.' USING ERRCODE='42501'; END IF;
 -- Only a new successful mutation returns this receipt. No duplicate/resume read.
 RETURN jsonb_build_object('schema','document-rescan-pending-v1','operation_id',b.operation_id,'document_id',b.document_id,
  'source_revision',b.source_revision,'pending_revision',after_row.updated_at,'content_sha256',b.content_sha256);
END; $mark_rescan_pending$;
REVOKE ALL ON FUNCTION public.assert_internal_document_rescan_source(uuid,uuid,text,timestamptz),public.guard_document_rescan_pending_receipt(),public.mark_internal_document_rescan_pending(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON TABLE public.document_rescan_pending_receipts IS 'Private one-use failed-to-pending transition metadata. Atomic with the exact current-source update and capability validation. Echoed hash is not physical-byte attestation. No provider dispatch/result/completion/settlement, ordinary execution, endpoint wiring, held release or legacy/direct writer/provider drain proof.';
COMMIT;
