-- DRAFT ONLY. Trusted DB-only Apply no-save reconciliation.
-- Not a provider cancellation, successful save, lease rewrite or auto retry.
-- Only the actual database owner can execute the resolver; no app/service grant.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $no_save_preflight$
DECLARE item record;admission_owner oid;relation_name text;caller text;
BEGIN
 SELECT relowner INTO admission_owner FROM pg_class WHERE oid='public.document_operation_control'::regclass;
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN RAISE EXCEPTION 'Paused trusted reconciliation required' USING ERRCODE='55000'; END IF;
 FOR item IN SELECT * FROM (VALUES
 ('public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)','6f601210e16ce169478e8277e9263228',true,true,false,'service_role'),
 ('public.guard_document_capacity_reservation()','43fdfb570c91ead44f38c4c5c9b02350',false,false,false,''),
 ('public.inspect_internal_document_operation_review(uuid)','66c3b886188974a67ccc94ba8be12f49',false,true,false,''),
 ('public.record_document_operation_review(uuid,uuid,uuid,text,text,text)','cce2d4ee9b50843c7ccba5576c661c15',true,true,false,'service_role'),
 ('public.set_document_operation_pause(uuid,bigint,boolean,text)','60a5c03dd7cb7cec9ebc961b73365605',true,false,true,'service_role'),
 ('public.inspect_document_operation_drain()','dcdb237f07733181472e22e51072fb86',true,false,true,'service_role'),
 ('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)','169bbd1099b39afe9411d5e5497ac645',false,false,false,'authenticated'),
 ('public.finish_document_operation(uuid,uuid,uuid,text)','b96db30c250af2e17a60159843b5392d',true,false,true,'service_role'),
 ('public.release_completed_apply_at_commit()','b269be59cb29f5892e79bc40bf6d3d7e',true,false,false,''),
 ('public.guard_bound_apply_finish()','4b278d8f5b55c1df038038577fa8acb9',true,false,false,''),
 ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false,false,false,'')
 ) expected(signature,body_md5,definer,utc,admission_owned,allowed_caller) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proowner=CASE WHEN item.admission_owned THEN admission_owner ELSE current_user::regrole::oid END
   AND proconfig=CASE WHEN item.utc THEN ARRAY['search_path=pg_catalog','TimeZone=UTC'] ELSE ARRAY['search_path=pg_catalog'] END) THEN
   RAISE EXCEPTION 'Exact reviewed Apply/review/control protocol required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller=item.allowed_caller) THEN RAISE EXCEPTION 'Exact reconciliation dependency grants required' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_apply_source_bindings','public.document_capacity_reservations','public.document_operation_reconciliation_reviews',
 'public.document_apply_completion_receipts','public.document_apply_capacity_settlements'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name) AND relowner=current_user::regrole::oid AND relrowsecurity)
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass(relation_name)) THEN RAISE EXCEPTION 'Private Apply reconciliation ownership required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private Apply reconciliation permissions required' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
END; $no_save_preflight$;
DO $no_save_apply_boundary$
DECLARE item record; caller text; relation_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Paused reviewed Apply installation required' USING ERRCODE='55000'; END IF;
 FOR item IN SELECT * FROM (VALUES
 ('public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)','6f601210e16ce169478e8277e9263228',true,true,'service_role'),
 ('public.assert_bound_document_apply(uuid,uuid,uuid,timestamptz,jsonb,boolean)','105e3e1c77801ad75384526521e336c3',true,true,'authenticated'),
 ('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)','169bbd1099b39afe9411d5e5497ac645',false,false,'authenticated'),
 ('public.guard_document_apply_source_binding()','5c64a025bbdff1fe50a44c3bd40cd0d8',false,false,''),
 ('public.record_bound_document_apply_completion()','77f019118e9a7f1276841360752c791e',true,true,''),
 ('public.guard_apply_completion_receipt()','def06c94f15e6a9fb88f4b725d3a6717',true,true,''),
 ('public.validate_bound_document_apply_completion(uuid)','23829fc200c827fec51a3dd33db457c0',true,true,''),
 ('public.check_bound_apply_commit()','40d11672ec4e4fc0bb32cf2913996f0b',true,true,'')
 ) expected(signature,body_md5,definer,utc,allowed_caller) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature)
   AND proowner=current_user::regrole::oid AND md5(prosrc)=item.body_md5 AND prosecdef=item.definer
   AND proconfig=CASE WHEN item.utc THEN ARRAY['search_path=pg_catalog','TimeZone=UTC'] ELSE ARRAY['search_path=pg_catalog'] END) THEN
   RAISE EXCEPTION 'Exact Apply routine owner/body/settings required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller=item.allowed_caller) THEN
    RAISE EXCEPTION 'Reviewed Apply routine permissions required' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.document_apply_source_bindings','public.document_apply_completion_receipts'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name)
   AND relkind='r' AND relowner=current_user::regrole::oid AND relrowsecurity)
   OR EXISTS(SELECT 1 FROM pg_policy WHERE polrelid=to_regclass(relation_name)) THEN
   RAISE EXCEPTION 'Private Apply relation ownership/RLS required' USING ERRCODE='55000'; END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private Apply relation permissions required' USING ERRCODE='55000'; END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.document_apply_source_bindings','document_apply_binding_retained','public.guard_document_apply_source_binding()',27,false),
 ('public.document_extractions','document_apply_completed','public.record_bound_document_apply_completion()',17,false),
 ('public.document_apply_completion_receipts','document_apply_receipt_retained','public.guard_apply_completion_receipt()',27,false),
 ('public.document_apply_completion_receipts','document_apply_outcome_committed','public.check_bound_apply_commit()',5,true)
 ) expected(relation_name,trigger_name,signature,trigger_type,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name)
   AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature) AND tgtype=item.trigger_type
   AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred
   AND (tgconstraint<>0)=item.deferred AND tgqual IS NULL AND tgattr::text='') THEN
   RAISE EXCEPTION 'Exact enabled Apply trigger required' USING ERRCODE='55000'; END IF;
 END LOOP;
END; $no_save_apply_boundary$;
CREATE TABLE public.document_apply_no_save_reconciliations(
 operation_id uuid PRIMARY KEY REFERENCES public.document_apply_source_bindings(operation_id),
 review_id uuid NOT NULL REFERENCES public.document_operation_reconciliation_reviews(review_id),snapshot_sha256 text NOT NULL CHECK(snapshot_sha256~'^[a-f0-9]{64}$'),
 prior_revision timestamptz NOT NULL,replacement_revision timestamptz NOT NULL CHECK(replacement_revision>prior_revision),
 released_units integer NOT NULL DEFAULT 1 CHECK(released_units=1),outcome text NOT NULL DEFAULT 'no_save_confirmed' CHECK(outcome='no_save_confirmed'),
 recorded_by_db_role name NOT NULL DEFAULT current_user,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),recorded_txid bigint NOT NULL DEFAULT txid_current()
);
ALTER TABLE public.document_apply_no_save_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_apply_no_save_reconciliations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.is_document_apply_no_save_reconciled(_operation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $no_save_exists$
 SELECT EXISTS(SELECT 1 FROM public.document_apply_no_save_reconciliations n JOIN public.document_operation_leases l USING(operation_id) WHERE n.operation_id=_operation_id AND n.released_units=1 AND n.outcome='no_save_confirmed' AND l.operation_kind='apply' AND l.state='needs_review');
$no_save_exists$;
REVOKE ALL ON FUNCTION public.is_document_apply_no_save_reconciled(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.count_document_apply_no_save_reconciliations()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $count_no_save$
 SELECT count(*) FROM public.document_apply_no_save_reconciliations;
$count_no_save$;
REVOKE ALL ON FUNCTION public.count_document_apply_no_save_reconciliations() FROM PUBLIC,anon,authenticated,service_role;
DO $no_save_bridge$ DECLARE owner_name text;BEGIN
 SELECT proowner::regrole::text INTO owner_name FROM pg_proc WHERE oid='public.set_document_operation_pause(uuid,bigint,boolean,text)'::regprocedure;
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.is_document_apply_no_save_reconciled(uuid) TO %I',owner_name);
 EXECUTE format('GRANT EXECUTE ON FUNCTION public.count_document_apply_no_save_reconciliations() TO %I',owner_name);
END; $no_save_bridge$;
CREATE FUNCTION public.guard_reconciled_document_apply_lease()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $freeze_no_save_lease$
BEGIN
 IF public.is_document_apply_no_save_reconciled(OLD.operation_id) THEN RAISE EXCEPTION 'Reconciled Apply history is retained' USING ERRCODE='42501';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END; $freeze_no_save_lease$;
REVOKE ALL ON FUNCTION public.guard_reconciled_document_apply_lease() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_no_save_lease_retained BEFORE UPDATE OR DELETE ON public.document_operation_leases FOR EACH ROW EXECUTE FUNCTION public.guard_reconciled_document_apply_lease();
CREATE FUNCTION public.assert_document_apply_no_save(_operation_id uuid,_review_id uuid,_snapshot text,_after_insert boolean)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC' AS $assert_no_save$
DECLARE l public.document_operation_leases%ROWTYPE;b public.document_apply_source_bindings%ROWTYPE;c public.document_capacity_reservations%ROWTYPE;r public.document_operation_reconciliation_reviews%ROWTYPE;e public.document_extractions%ROWTYPE;snapshot jsonb;relation_name text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN RAISE EXCEPTION 'Paused Apply reconciliation required' USING ERRCODE='55000'; END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_operation_leases','public.document_apply_source_bindings','public.document_capacity_reservations','public.document_operation_reconciliation_reviews','public.document_extractions','public.evidence_items','public.audit_log','public.document_apply_completion_receipts','public.document_apply_capacity_settlements'] LOOP
  IF row_security_active(relation_name::regclass) OR NOT has_table_privilege(current_user,relation_name,'SELECT') THEN RAISE EXCEPTION 'Full trusted Apply reconciliation visibility required' USING ERRCODE='55000'; END IF;
 END LOOP;
 SELECT * INTO l FROM public.document_operation_leases WHERE operation_id=_operation_id FOR UPDATE;
 IF NOT FOUND OR l.operation_kind IS DISTINCT FROM 'apply' OR l.state IS DISTINCT FROM 'needs_review' OR l.finished_at IS NULL THEN RAISE EXCEPTION 'Only held DB-only Apply work can reconcile' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM public.document_apply_source_bindings WHERE operation_id=l.operation_id;
 SELECT * INTO c FROM public.document_capacity_reservations WHERE operation_id=l.operation_id;
 IF NOT FOUND OR b.operation_id IS NULL OR b.actor_id IS DISTINCT FROM l.actor_id OR c.actor_id IS DISTINCT FROM l.actor_id OR c.student_id IS DISTINCT FROM b.student_id
  OR c.producer_kind IS DISTINCT FROM 'apply' OR c.reserved_units IS DISTINCT FROM 1 OR c.summary_job_id IS NOT NULL OR c.summary_operation_id IS NOT NULL THEN RAISE EXCEPTION 'Exact held Apply reservation required' USING ERRCODE='55000'; END IF;
 SELECT * INTO r FROM public.document_operation_reconciliation_reviews WHERE review_id=_review_id;
 IF NOT FOUND OR r.operation_id IS DISTINCT FROM l.operation_id OR r.snapshot_sha256 IS DISTINCT FROM _snapshot OR r.decision IS DISTINCT FROM 'retain_work'
  OR r.reason_class IS NULL OR r.reason_class NOT IN('missing_receipt','manual_review','source_changed') THEN RAISE EXCEPTION 'Exact DB-only metadata review required' USING ERRCODE='55000'; END IF;
 IF NOT _after_insert THEN
  snapshot:=public.inspect_internal_document_operation_review(l.operation_id);
  IF snapshot->>'snapshot_sha256' IS DISTINCT FROM _snapshot OR snapshot->>'reconciled_no_save' IS DISTINCT FROM 'false'
   OR snapshot->>'recorded_completion' IS DISTINCT FROM 'false' OR snapshot->>'accounting_consistent' IS DISTINCT FROM 'true' OR snapshot->>'remaining_shared_units' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'Apply reconciliation review changed' USING ERRCODE='55000'; END IF;
 END IF;
 SELECT * INTO e FROM public.document_extractions WHERE id=b.extraction_id FOR UPDATE;
 IF NOT FOUND OR e.student_id IS DISTINCT FROM b.student_id OR e.document_id IS DISTINCT FROM b.document_id OR e.status IS NULL OR e.status::text NOT IN('pending','needs_review','in_review')
  OR EXISTS(SELECT 1 FROM public.document_apply_completion_receipts WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_registration_completion_receipts WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_rescan_completion_receipts WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_summary_completion_receipts WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_apply_capacity_settlements WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_capacity_registration_settlements WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_capacity_rescan_settlements WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=l.operation_id)
  OR EXISTS(SELECT 1 FROM public.evidence_items WHERE extraction_id=b.extraction_id OR (source_kind='document_extraction' AND source_id=b.extraction_id))
  OR EXISTS(SELECT 1 FROM public.audit_log WHERE entity_type='document_extraction' AND entity_id=b.extraction_id AND action='document.extraction.applied') THEN
  RAISE EXCEPTION 'No-save Apply outcome could not be established' USING ERRCODE='55000'; END IF;
END; $assert_no_save$;
REVOKE ALL ON FUNCTION public.assert_document_apply_no_save(uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_document_apply_no_save_reconciliation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC' AS $guard_no_save$
DECLARE revision timestamptz;source_revision timestamptz;written_here boolean;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Apply no-save reconciliation is retained' USING ERRCODE='42501'; END IF;
 PERFORM public.assert_document_apply_no_save(NEW.operation_id,NEW.review_id,NEW.snapshot_sha256,false);
 SELECT e.updated_at,b.source_revision,e.xmin::text::bigint=mod(txid_current(),4294967296) INTO revision,source_revision,written_here FROM public.document_extractions e JOIN public.document_apply_source_bindings b ON b.extraction_id=e.id WHERE b.operation_id=NEW.operation_id;
 IF written_here IS DISTINCT FROM true OR NEW.prior_revision<source_revision OR NEW.replacement_revision<=source_revision
  OR NEW.replacement_revision IS DISTINCT FROM revision OR NEW.replacement_revision<=NEW.prior_revision OR NEW.released_units<>1 OR NEW.outcome<>'no_save_confirmed'
  OR NEW.recorded_by_db_role IS DISTINCT FROM current_user OR NEW.recorded_txid<>txid_current() THEN RAISE EXCEPTION 'Actual invalidated Apply revision required' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $guard_no_save$;
REVOKE ALL ON FUNCTION public.guard_document_apply_no_save_reconciliation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_no_save_guard BEFORE INSERT OR UPDATE OR DELETE ON public.document_apply_no_save_reconciliations FOR EACH ROW EXECUTE FUNCTION public.guard_document_apply_no_save_reconciliation();
CREATE FUNCTION public.check_document_apply_no_save_commit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC' AS $commit_no_save$
BEGIN
 IF NEW.recorded_txid<>txid_current() OR NOT EXISTS(SELECT 1 FROM public.document_extractions e JOIN public.document_apply_source_bindings b ON b.extraction_id=e.id WHERE b.operation_id=NEW.operation_id AND e.updated_at=NEW.replacement_revision AND e.xmin::text::bigint=mod(txid_current(),4294967296)) THEN RAISE EXCEPTION 'Committed Apply invalidation required' USING ERRCODE='55000'; END IF;
 PERFORM public.assert_document_apply_no_save(NEW.operation_id,NEW.review_id,NEW.snapshot_sha256,true);
 RETURN NEW;
END; $commit_no_save$;
REVOKE ALL ON FUNCTION public.check_document_apply_no_save_commit() FROM PUBLIC,anon,authenticated,service_role;
CREATE CONSTRAINT TRIGGER document_apply_no_save_committed AFTER INSERT ON public.document_apply_no_save_reconciliations DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_document_apply_no_save_commit();
CREATE FUNCTION public.reconcile_internal_document_apply_no_save(_operation_id uuid,_review_id uuid,_expected_snapshot_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog SET TimeZone='UTC' AS $reconcile_no_save$
DECLARE b public.document_apply_source_bindings%ROWTYPE;prior timestamptz;replacement timestamptz;before_row jsonb;after_row jsonb;stored public.document_apply_no_save_reconciliations%ROWTYPE;
BEGIN
 IF current_user::regrole::oid IS DISTINCT FROM (SELECT relowner FROM pg_class WHERE oid='public.document_apply_no_save_reconciliations'::regclass) THEN RAISE EXCEPTION 'Trusted database owner required' USING ERRCODE='42501'; END IF;
 PERFORM public.assert_document_apply_no_save(_operation_id,_review_id,_expected_snapshot_sha256,false);
 IF public.is_document_apply_no_save_reconciled(_operation_id) THEN RAISE EXCEPTION 'Apply work is already reconciled' USING ERRCODE='55000'; END IF;
 SELECT * INTO b FROM public.document_apply_source_bindings WHERE operation_id=_operation_id;
 SELECT e.updated_at,to_jsonb(e) INTO prior,before_row FROM public.document_extractions e WHERE id=b.extraction_id FOR UPDATE;
 UPDATE public.document_extractions SET updated_at=clock_timestamp() WHERE id=b.extraction_id AND updated_at=prior RETURNING updated_at,to_jsonb(document_extractions) INTO replacement,after_row;
 IF NOT FOUND OR replacement IS NULL OR replacement<=prior OR replacement<=b.source_revision OR (after_row-'updated_at') IS DISTINCT FROM (before_row-'updated_at') THEN RAISE EXCEPTION 'The old Apply revision was not invalidated' USING ERRCODE='55000'; END IF;
 INSERT INTO public.document_apply_no_save_reconciliations(operation_id,review_id,snapshot_sha256,prior_revision,replacement_revision)
 VALUES(_operation_id,_review_id,_expected_snapshot_sha256,prior,replacement) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM _operation_id OR stored.review_id IS DISTINCT FROM _review_id OR stored.snapshot_sha256 IS DISTINCT FROM _expected_snapshot_sha256
  OR stored.prior_revision IS DISTINCT FROM prior OR stored.replacement_revision IS DISTINCT FROM replacement OR stored.recorded_txid<>txid_current()
  OR stored.released_units<>1 OR stored.outcome<>'no_save_confirmed' OR stored.recorded_by_db_role IS DISTINCT FROM current_user OR stored.recorded_at IS NULL THEN RAISE EXCEPTION 'Actual Apply no-save reconciliation required' USING ERRCODE='55000'; END IF;
 RETURN jsonb_build_object('schema','document-apply-no-save-reconciled-v1','operation_id',_operation_id,'review_id',_review_id,'outcome','no_save_confirmed','released_units',1,'replacement_revision',replacement,'processing_reopened',false);
END; $reconcile_no_save$;
REVOKE ALL ON FUNCTION public.reconcile_internal_document_apply_no_save(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.begin_bound_document_apply(_operation_id uuid,_actor_id uuid,_student_id uuid,_document_id uuid,_extraction_id uuid,_expected_revision timestamptz,_expected_sections jsonb,_emit_evidence boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $apply_begin$
DECLARE e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;receipt jsonb;stored public.document_apply_source_bindings%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity();
 IF _emit_evidence IS NULL OR _actor_id IS NULL OR _operation_id IS NULL OR _expected_revision IS NULL OR jsonb_typeof(_expected_sections) IS DISTINCT FROM 'object'
  OR char_length(_expected_sections::text)>100000 OR public.can_edit_student(_actor_id,_student_id) IS DISTINCT FROM true
  OR public.can_view_document(_actor_id,_document_id) IS DISTINCT FROM true OR public.is_partner_only(_actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'This reviewed source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO e FROM public.document_extractions WHERE id=_extraction_id FOR SHARE;
 IF NOT FOUND OR e.student_id IS DISTINCT FROM _student_id OR e.document_id IS DISTINCT FROM _document_id
  OR e.status::text NOT IN('pending','needs_review','in_review') OR e.updated_at IS DISTINCT FROM _expected_revision
  OR e.sections IS DISTINCT FROM _expected_sections THEN
  RAISE EXCEPTION 'This reviewed source could not be confirmed.' USING ERRCODE='42501'; END IF;
 SELECT * INTO d FROM public.documents WHERE id=_document_id AND student_id=_student_id FOR SHARE;
 IF NOT FOUND OR d.scan_status IS DISTINCT FROM 'clean' OR d.review_status IS NULL OR d.review_status='rejected'
  OR d.archived_at IS NOT NULL OR d.deleted_at IS NOT NULL OR EXISTS(
   SELECT 1 FROM public.document_apply_source_bindings b JOIN public.document_operation_leases l USING(operation_id)
   WHERE b.extraction_id=_extraction_id AND l.state IN('active','needs_review')
    AND NOT public.is_document_apply_no_save_reconciled(l.operation_id)) THEN
  RAISE EXCEPTION 'This reviewed source could not be confirmed.' USING ERRCODE='42501'; END IF;
 receipt:=public.begin_document_operation(_operation_id,_actor_id,'apply');
 PERFORM public.reserve_internal_document_capacity(_operation_id,_student_id);
 INSERT INTO public.document_apply_source_bindings(operation_id,actor_id,student_id,document_id,extraction_id,source_revision,sections_sha256,emit_evidence,document_sha256)
 VALUES(_operation_id,_actor_id,_student_id,_document_id,_extraction_id,e.updated_at,encode(sha256(convert_to(e.sections::text,'UTF8')),'hex'),_emit_evidence,encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex')) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM _operation_id OR stored.actor_id IS DISTINCT FROM _actor_id
  OR stored.student_id IS DISTINCT FROM _student_id OR stored.document_id IS DISTINCT FROM _document_id
  OR stored.emit_evidence IS DISTINCT FROM _emit_evidence OR stored.extraction_id IS DISTINCT FROM _extraction_id OR stored.source_revision IS DISTINCT FROM e.updated_at
  OR stored.sections_sha256 IS DISTINCT FROM encode(sha256(convert_to(e.sections::text,'UTF8')),'hex')
  OR stored.document_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex') THEN
  RAISE EXCEPTION 'Actual Apply source binding required.' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_reservations WHERE operation_id=_operation_id AND producer_kind='apply'
  AND actor_id=_actor_id AND student_id=_student_id AND reserved_units=1) THEN
  RAISE EXCEPTION 'Apply capacity could not be confirmed.' USING ERRCODE='55000'; END IF;
 RETURN receipt||jsonb_build_object('schema','document-apply-source-claim-v1','student_id',_student_id,'document_id',_document_id,'extraction_id',_extraction_id,'source_revision',e.updated_at);
END; $apply_begin$;
CREATE OR REPLACE FUNCTION public.guard_document_capacity_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $capacity_guard$
DECLARE policy public.document_capacity_policy%ROWTYPE; lease public.document_operation_leases%ROWTYPE;
 control_revision bigint; binding public.document_summary_operation_bindings%ROWTYPE; j public.ai_jobs%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Tracked capacity cannot be removed.' USING ERRCODE='42501'; END IF;
 IF TG_OP='INSERT' THEN control_revision:=public.lock_internal_document_capacity();
 ELSE PERFORM public.lock_internal_document_capacity_completion(); END IF;
 IF TG_OP='INSERT' THEN
  SELECT * INTO policy FROM public.document_capacity_policy WHERE singleton FOR SHARE;
  IF NOT FOUND OR policy.global_units IS NULL OR policy.actor_units IS NULL OR policy.student_units IS NULL THEN
   RAISE EXCEPTION 'Capacity policy requires review.' USING ERRCODE='55000';
  END IF;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.operation_id FOR SHARE;
  IF NOT FOUND OR lease.state<>'active' OR lease.actor_id IS DISTINCT FROM NEW.actor_id
   OR lease.operation_kind IS DISTINCT FROM NEW.producer_kind OR lease.admitted_revision IS DISTINCT FROM control_revision
   OR NEW.student_id IS NULL OR public.can_edit_student(NEW.actor_id,NEW.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(NEW.actor_id) IS DISTINCT FROM false
   OR NEW.summary_job_id IS NOT NULL OR NEW.summary_operation_id IS NOT NULL THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  IF COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(no_save.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id LEFT JOIN public.document_apply_no_save_reconciliations no_save ON no_save.operation_id=r.operation_id),0)+NEW.reserved_units>policy.global_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(no_save.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id LEFT JOIN public.document_apply_no_save_reconciliations no_save ON no_save.operation_id=r.operation_id WHERE r.actor_id=NEW.actor_id),0)+NEW.reserved_units>policy.actor_units
   OR COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(no_save.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id LEFT JOIN public.document_apply_no_save_reconciliations no_save ON no_save.operation_id=r.operation_id WHERE r.student_id=NEW.student_id),0)+NEW.reserved_units>policy.student_units THEN
   RAISE EXCEPTION 'Capacity could not be confirmed.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END IF;
 IF (to_jsonb(NEW)-ARRAY['summary_job_id','summary_operation_id']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['summary_job_id','summary_operation_id']) THEN
  RAISE EXCEPTION 'Tracked capacity identity cannot change.' USING ERRCODE='42501';
 END IF;
 IF OLD.summary_job_id IS NULL AND NEW.summary_job_id IS NOT NULL AND NEW.summary_operation_id IS NULL
   AND OLD.producer_kind IN ('register','rescan') THEN
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=OLD.operation_id FOR SHARE;
  SELECT * INTO j FROM public.ai_jobs WHERE id=NEW.summary_job_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR NOT FOUND OR j.job_type<>'document_summary' OR j.status<>'queued'
   OR j.locked_at IS NOT NULL OR j.attempts<>0 OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id
   OR j.student_id IS DISTINCT FROM OLD.student_id OR public.can_edit_student(OLD.actor_id,OLD.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(OLD.actor_id) IS DISTINCT FROM false THEN
   RAISE EXCEPTION 'The counted queue transfer could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSIF OLD.summary_job_id IS NOT NULL AND NEW.summary_job_id IS NOT DISTINCT FROM OLD.summary_job_id
   AND OLD.summary_operation_id IS NULL AND NEW.summary_operation_id IS NOT NULL THEN
  SELECT * INTO binding FROM public.document_summary_operation_bindings
   WHERE job_id=OLD.summary_job_id AND operation_id=NEW.summary_operation_id FOR SHARE;
  IF NOT FOUND OR binding.actor_id IS DISTINCT FROM OLD.actor_id OR binding.student_id IS DISTINCT FROM OLD.student_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO j FROM public.ai_jobs WHERE id=OLD.summary_job_id FOR SHARE;
  SELECT * INTO lease FROM public.document_operation_leases WHERE operation_id=NEW.summary_operation_id FOR SHARE;
  IF lease.state IS DISTINCT FROM 'active' OR lease.operation_kind IS DISTINCT FROM 'summary' OR lease.actor_id IS DISTINCT FROM OLD.actor_id
   OR j.status IS DISTINCT FROM 'processing' OR j.locked_at IS DISTINCT FROM binding.claim_at OR j.attempts IS DISTINCT FROM binding.claim_attempt
   OR j.student_id IS DISTINCT FROM OLD.student_id OR j.triggered_by_user_id IS DISTINCT FROM OLD.actor_id THEN
   RAISE EXCEPTION 'The counted summary claim could not be confirmed.' USING ERRCODE='42501';
  END IF;
 ELSE RAISE EXCEPTION 'Tracked capacity cannot be replayed or released.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END; $capacity_guard$;
CREATE OR REPLACE FUNCTION public.inspect_internal_document_operation_review(_operation_id uuid)
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
   +COALESCE((SELECT released_units FROM public.document_apply_no_save_reconciliations WHERE operation_id=cap.operation_id),0)
   +CASE WHEN EXISTS(SELECT 1 FROM public.document_capacity_summary_settlements WHERE operation_id=cap.operation_id) THEN 1 ELSE 0 END;
  remaining:=cap.reserved_units-released;
  consistent:=cap.actor_id=lease.actor_id AND cap.reserved_units IN(1,2) AND remaining BETWEEN 0 AND cap.reserved_units
   AND lease.state IN('active','needs_review','completed') AND (lease.state='completed' OR remaining>0 OR public.is_document_apply_no_save_reconciled(lease.operation_id))
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
  'reconciled_no_save',public.is_document_apply_no_save_reconciled(lease.operation_id),
  'external_quiescence_verified',false,'release_permitted',false);
 RETURN facts||jsonb_build_object('snapshot_sha256',encode(sha256(convert_to((facts||jsonb_build_object('private_lease',to_jsonb(lease)-'receipt_id','private_capacity',caps))::text,'UTF8')),'hex'));
END; $inspect_review$;
CREATE OR REPLACE FUNCTION public.record_document_operation_review(_review_id uuid,_operation_id uuid,_operator_id uuid,_expected_snapshot_sha256 text,_artifact_digest text,_reason_class text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $record_review$
DECLARE snapshot jsonb;stored public.document_operation_reconciliation_reviews%ROWTYPE;
BEGIN
 IF _review_id IS NULL OR _operation_id IS NULL OR _operator_id IS NULL OR _expected_snapshot_sha256 IS NULL
  OR _expected_snapshot_sha256 !~ '^[a-f0-9]{64}$' OR _artifact_digest IS NULL OR _artifact_digest !~ '^sha256:[a-f0-9]{64}$'
  OR _reason_class IS NULL OR _reason_class NOT IN('provider_unknown','missing_receipt','source_changed','manual_review') THEN
  RAISE EXCEPTION 'Exact metadata review reference required' USING ERRCODE='42501'; END IF;
 snapshot:=public.inspect_internal_document_operation_review(_operation_id);
 IF snapshot->>'snapshot_sha256' IS DISTINCT FROM _expected_snapshot_sha256 OR snapshot->>'reconciled_no_save' IS DISTINCT FROM 'false' OR snapshot->>'state' IS NULL OR snapshot->>'state' NOT IN('active','needs_review') THEN
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
DO $owned_reconcile_change$ DECLARE executor name:=current_user;owner_name name;editing_role name;owner_oid oid;BEGIN
 SELECT proowner INTO owner_oid FROM pg_proc WHERE oid='public.set_document_operation_pause(uuid,bigint,boolean,text)'::regprocedure;SELECT rolname INTO owner_name FROM pg_roles WHERE oid=owner_oid;
 IF current_user<>owner_name THEN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper) THEN editing_role:=session_user;ELSE editing_role:=owner_name;END IF;EXECUTE format('SET LOCAL ROLE %I',editing_role);END IF;
 EXECUTE $owned_definition$CREATE OR REPLACE FUNCTION public.set_document_operation_pause(_operator_id uuid,_expected_revision bigint,_paused boolean,_reason_class text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $pause_operation$
DECLARE control public.document_operation_control%ROWTYPE;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' OR _operator_id IS NULL OR _expected_revision IS NULL
  OR _paused IS NULL OR _reason_class IS NULL OR _reason_class NOT IN ('maintenance','preflight','incident','resume')
  OR ((_reason_class='resume') IS DISTINCT FROM (NOT _paused)) THEN
  RAISE EXCEPTION 'Document pause change could not be confirmed.' USING ERRCODE='42501';
 END IF;
 SELECT * INTO control FROM public.document_operation_control WHERE singleton FOR UPDATE;
 IF NOT FOUND OR control.revision<>_expected_revision OR control.paused=_paused THEN
  RAISE EXCEPTION 'Document pause changed; stop for reconciliation.' USING ERRCODE='55000';
 END IF;
 IF NOT _paused AND EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review') AND NOT public.is_document_apply_no_save_reconciled(operation_id)) THEN
  RAISE EXCEPTION 'Tracked document work still requires reconciliation.' USING ERRCODE='55000';
 END IF;
 UPDATE public.document_operation_control SET paused=_paused,revision=revision+1,changed_at=clock_timestamp() WHERE singleton RETURNING * INTO control;
 INSERT INTO public.document_operation_control_events(operator_id,paused,revision,reason_class) VALUES(_operator_id,_paused,control.revision,_reason_class);
 RETURN jsonb_build_object('schema','document-operation-pause-v1','paused',control.paused,'revision',control.revision);
END; $pause_operation$;$owned_definition$;
 IF (SELECT proowner FROM pg_proc WHERE oid='public.set_document_operation_pause(uuid,bigint,boolean,text)'::regprocedure) IS DISTINCT FROM owner_oid THEN RAISE EXCEPTION 'Admission function owner must remain unchanged';END IF;
 IF current_user<>executor THEN EXECUTE format('SET LOCAL ROLE %I',executor);END IF;
END; $owned_reconcile_change$;
DO $owned_reconcile_change$ DECLARE executor name:=current_user;owner_name name;editing_role name;owner_oid oid;BEGIN
 SELECT proowner INTO owner_oid FROM pg_proc WHERE oid='public.inspect_document_operation_drain()'::regprocedure;SELECT rolname INTO owner_name FROM pg_roles WHERE oid=owner_oid;
 IF current_user<>owner_name THEN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper) THEN editing_role:=session_user;ELSE editing_role:=owner_name;END IF;EXECUTE format('SET LOCAL ROLE %I',editing_role);END IF;
 EXECUTE $owned_definition$CREATE OR REPLACE FUNCTION public.inspect_document_operation_drain()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $inspect_operation$
 SELECT jsonb_build_object('schema','document-operation-drain-v1','paused',c.paused,'revision',c.revision,
  'by_kind',(SELECT jsonb_agg(jsonb_build_object('kind',k.kind,'active',(SELECT count(*) FROM public.document_operation_leases l WHERE l.operation_kind=k.kind AND l.state='active'),'needs_review',(SELECT count(*) FROM public.document_operation_leases l WHERE l.operation_kind=k.kind AND l.state='needs_review' AND NOT public.is_document_apply_no_save_reconciled(l.operation_id))) ORDER BY k.kind) FROM (VALUES('register'),('rescan'),('apply'),('summary')) k(kind)),
  'reconciled_no_save',public.count_document_apply_no_save_reconciliations(),
  'tracked_operations_clear',NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN ('active','needs_review') AND NOT public.is_document_apply_no_save_reconciled(operation_id)),
  'legacy_handlers_covered',false,'provider_quiescence_verified',false,'ready_for_cutover',false,'cleanup_authorized',false)
 FROM public.document_operation_control c WHERE singleton;
$inspect_operation$;$owned_definition$;
 IF (SELECT proowner FROM pg_proc WHERE oid='public.inspect_document_operation_drain()'::regprocedure) IS DISTINCT FROM owner_oid THEN RAISE EXCEPTION 'Admission function owner must remain unchanged';END IF;
 IF current_user<>executor THEN EXECUTE format('SET LOCAL ROLE %I',executor);END IF;
END; $owned_reconcile_change$;
COMMIT;
