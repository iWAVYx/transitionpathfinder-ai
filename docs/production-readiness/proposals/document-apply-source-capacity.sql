-- DRAFT ONLY. Source-bound Apply admission; save/settlement is not wired.
-- No canonical installation, hosted action, new student access or release path.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR to_regclass('public.document_extractions') IS NULL
  OR has_function_privilege('service_role','public.reserve_internal_document_capacity(uuid,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Reviewed paused Apply prerequisites required'; END IF;
END; $preflight$;
CREATE TABLE public.document_apply_source_bindings(
 operation_id uuid PRIMARY KEY REFERENCES public.document_operation_leases(operation_id),
 actor_id uuid NOT NULL,student_id uuid NOT NULL REFERENCES public.students(id),
 document_id uuid NOT NULL REFERENCES public.documents(id),
 extraction_id uuid NOT NULL REFERENCES public.document_extractions(id),
 source_revision timestamptz NOT NULL,sections_sha256 text NOT NULL CHECK(sections_sha256~'^[a-f0-9]{64}$'),
 emit_evidence boolean NOT NULL,document_sha256 text NOT NULL CHECK(document_sha256~'^[a-f0-9]{64}$')
);
ALTER TABLE public.document_apply_source_bindings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_apply_source_bindings FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_document_apply_source_binding()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $immutable$
BEGIN RAISE EXCEPTION 'Apply source binding is retained.' USING ERRCODE='42501'; END; $immutable$;
REVOKE ALL ON FUNCTION public.guard_document_apply_source_binding() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_binding_retained BEFORE UPDATE OR DELETE ON public.document_apply_source_bindings
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_apply_source_binding();
CREATE FUNCTION public.begin_bound_document_apply(_operation_id uuid,_actor_id uuid,_student_id uuid,_document_id uuid,_extraction_id uuid,_expected_revision timestamptz,_expected_sections jsonb,_emit_evidence boolean)
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
   WHERE b.extraction_id=_extraction_id AND l.state IN('active','needs_review')) THEN
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
REVOKE ALL ON FUNCTION public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean) TO service_role;
COMMIT;
