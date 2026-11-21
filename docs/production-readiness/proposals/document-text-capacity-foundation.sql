-- DRAFT FOUNDATION ONLY. Private accounting, not permission for provider IO.
-- No public begin/hold/save protocol, completion, release, expiry or activation.
BEGIN;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $text_capacity_preflight$
DECLARE item record;caller text;rel text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('public.lock_internal_document_capacity()','2f5b3f16774b99e22e8e61bcce8d7828',false),
 ('public.guard_document_capacity_reservation()','f16664ce92d6398ccfea11b43fb5fc74',false),
 ('public.lock_internal_document_capacity_completion()','be973fc53b7930db60f9456ba1f26548',false),
 ('public.lock_document_text_review_authority(uuid)','f437d1d92e80319c437aaba69590685e',true)
 ) expected(signature,body_md5,definer) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef=item.definer AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Exact reviewed capacity and authority foundations are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH rel IN ARRAY ARRAY['public.document_capacity_policy','public.document_capacity_reservations','public.document_operation_control','public.document_capacity_summary_settlements','public.document_capacity_registration_settlements','public.document_capacity_rescan_settlements','public.document_apply_capacity_settlements','public.document_apply_no_save_reconciliations'] LOOP
  IF row_security_active(rel::regclass) OR NOT has_table_privilege(current_user,rel,'SELECT') THEN
   RAISE EXCEPTION 'Full trusted capacity visibility is required.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_table_privilege(caller,'public.document_capacity_reservations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
   OR has_any_column_privilege(caller,'public.document_capacity_reservations','SELECT,INSERT,UPDATE') THEN
   RAISE EXCEPTION 'Existing capacity must remain private.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_capacity_reservations'::regclass AND tgname='document_capacity_frozen' AND tgfoid='public.guard_document_capacity_reservation()'::regprocedure AND tgtype=31 AND tgenabled='O' AND NOT tgisinternal AND tgqual IS NULL AND tgattr::text='') THEN RAISE EXCEPTION 'Enabled existing capacity guard required.' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.document_capacity_policy WHERE singleton AND global_units=32 AND actor_units=4 AND student_units=2) THEN
  RAISE EXCEPTION 'The selected32/4/2 policy is required.' USING ERRCODE='55000';END IF;
 FOR item IN SELECT * FROM (VALUES
 ('public.set_document_operation_pause(uuid,bigint,boolean,text)','cf8584352cf80b6b51ee2190b7c73f3c'),
 ('public.inspect_document_operation_drain()','7b00cc3117fe90d6acfe882eb0903c33')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND proowner=(SELECT relowner FROM pg_class WHERE oid='public.document_operation_control'::regclass) AND proowner NOT IN('anon'::regrole::oid,'authenticated'::regrole::oid,'service_role'::regrole::oid)) THEN
   RAISE EXCEPTION 'Exact reviewed pause and inventory functions are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 PERFORM public.lock_internal_document_capacity_completion();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Keep processing paused while preparing text capacity.' USING ERRCODE='55000';END IF;
 LOCK TABLE public.document_capacity_reservations IN SHARE ROW EXCLUSIVE MODE;
END; $text_capacity_preflight$;
CREATE TABLE public.document_text_extraction_capacity(
 operation_id uuid PRIMARY KEY,receipt_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
 extraction_id uuid NOT NULL REFERENCES public.document_extractions(id) ON DELETE RESTRICT,
 source_revision timestamptz NOT NULL,document_revision timestamptz NOT NULL,source_status text NOT NULL,
 source_text_sha256 text NOT NULL CHECK(source_text_sha256 ~ '^[a-f0-9]{64}$'),
 source_document_sha256 text NOT NULL,source_sections_sha256 text NOT NULL,
 admitted_revision bigint NOT NULL CHECK(admitted_revision>0),admission_txid bigint NOT NULL DEFAULT txid_current(),
 state text NOT NULL DEFAULT 'active' CHECK(state IN('active','needs_review')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),held_at timestamptz,hold_reason text,
 CHECK(receipt_id<>operation_id),
 CHECK((state='active' AND held_at IS NULL AND hold_reason IS NULL) OR
  (state='needs_review' AND held_at IS NOT NULL AND hold_reason IN('provider_uncertain','save_uncertain','source_changed')))
);
CREATE INDEX document_text_capacity_actor ON public.document_text_extraction_capacity(actor_id);
CREATE INDEX document_text_capacity_student ON public.document_text_extraction_capacity(student_id);
CREATE UNIQUE INDEX document_text_capacity_source ON public.document_text_extraction_capacity(extraction_id);
ALTER TABLE public.document_text_extraction_capacity ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_text_extraction_capacity FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.lock_internal_document_text_authority(_actor_id uuid,_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $text_authority$
DECLARE actor uuid:=_actor_id;s public.students%ROWTYPE;proof uuid;
BEGIN
 IF actor IS NULL OR _student_id IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 -- Hash collisions only add contention; they cannot create an access proof.
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 IF public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.students WHERE id=_student_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 IF s.owner_id IS DISTINCT FROM actor AND s.student_user_id IS DISTINCT FROM actor THEN
  SELECT id INTO proof FROM public.student_collaborators
   WHERE student_id=_student_id AND user_id=actor AND status='accepted' AND role='editor'
   ORDER BY id LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
   SELECT id INTO proof FROM public.student_relationships
    WHERE student_id=_student_id AND related_user_id=actor AND consent_status='approved'
     AND permission_level IN('collaborate','manage_documents','manage_plan')
    ORDER BY id LIMIT 1 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
  END IF;
 END IF;
 -- A fresh command snapshot after any row/role lock wait checks current rules.
 IF public.can_edit_student(actor,_student_id) IS DISTINCT FROM true
  OR public.can_access_student(actor,_student_id) IS DISTINCT FROM true
  OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
END; $text_authority$;
CREATE FUNCTION public.count_internal_document_text_capacity(_actor uuid,_student uuid,_state text)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $text_count$
 SELECT count(*) FROM public.document_text_extraction_capacity
 WHERE (_actor IS NULL OR actor_id=_actor) AND (_student IS NULL OR student_id=_student) AND (_state IS NULL OR state=_state);
$text_count$;
CREATE FUNCTION public.count_internal_combined_document_capacity(_actor uuid,_student uuid)
RETURNS bigint LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $combined_count$
 SELECT COALESCE((SELECT sum(r.reserved_units-CASE WHEN done.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(producer.released_units,0)-COALESCE(rescan.released_units,0)-CASE WHEN applied.operation_id IS NULL THEN 0 ELSE 1 END-COALESCE(no_save.released_units,0)) FROM public.document_capacity_reservations r LEFT JOIN public.document_capacity_summary_settlements done ON done.operation_id=r.operation_id LEFT JOIN public.document_capacity_registration_settlements producer ON producer.operation_id=r.operation_id LEFT JOIN public.document_capacity_rescan_settlements rescan ON rescan.operation_id=r.operation_id LEFT JOIN public.document_apply_capacity_settlements applied ON applied.operation_id=r.operation_id LEFT JOIN public.document_apply_no_save_reconciliations no_save ON no_save.operation_id=r.operation_id WHERE (_actor IS NULL OR r.actor_id=_actor) AND (_student IS NULL OR r.student_id=_student)),0)::bigint
  +public.count_internal_document_text_capacity(_actor,_student,NULL);
$combined_count$;
CREATE FUNCTION public.assert_internal_combined_document_capacity(_actor uuid,_student uuid,_units integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $combined_assert$
DECLARE p public.document_capacity_policy%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity();
 SELECT * INTO p FROM public.document_capacity_policy WHERE singleton FOR SHARE;
 IF NOT FOUND OR p.global_units IS NULL OR p.actor_units IS NULL OR p.student_units IS NULL OR _actor IS NULL OR _student IS NULL OR _units IS NULL OR _units NOT IN(1,2)
  OR public.count_internal_combined_document_capacity(NULL,NULL)+_units>p.global_units
  OR public.count_internal_combined_document_capacity(_actor,NULL)+_units>p.actor_units
  OR public.count_internal_combined_document_capacity(NULL,_student)+_units>p.student_units THEN
  RAISE EXCEPTION 'Document processing capacity could not be confirmed.' USING ERRCODE='42501';END IF;
END; $combined_assert$;
CREATE FUNCTION public.guard_existing_capacity_text_pool()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $existing_text_pool$
BEGIN
 PERFORM public.assert_internal_combined_document_capacity(NEW.actor_id,NEW.student_id,NEW.reserved_units);RETURN NEW;
END; $existing_text_pool$;
CREATE TRIGGER document_capacity_text_pool BEFORE INSERT ON public.document_capacity_reservations
 FOR EACH ROW EXECUTE FUNCTION public.guard_existing_capacity_text_pool();
CREATE FUNCTION public.guard_document_text_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
SET TimeZone='UTC'
AS $text_capacity_guard$
DECLARE e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;r bigint;
BEGIN
 IF TG_OP IN('DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Unfinished document text capacity cannot be removed.' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE' THEN
  PERFORM public.lock_internal_document_capacity_completion();
  IF (to_jsonb(NEW)-ARRAY['state','held_at','hold_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['state','held_at','hold_reason'])
   OR OLD.state<>'active' OR NEW.state<>'needs_review' OR NEW.hold_reason IS NULL OR NEW.hold_reason NOT IN('provider_uncertain','save_uncertain','source_changed') THEN
   RAISE EXCEPTION 'Unfinished document text capacity cannot be reset or released.' USING ERRCODE='42501';END IF;
  NEW.held_at:=clock_timestamp();RETURN NEW;
 END IF;
 r:=public.lock_internal_document_capacity();
 IF NEW.state IS DISTINCT FROM 'active' OR NEW.held_at IS NOT NULL OR NEW.hold_reason IS NOT NULL OR NEW.admitted_revision IS DISTINCT FROM r OR NEW.admission_txid IS DISTINCT FROM txid_current() THEN
  RAISE EXCEPTION 'A fresh active capacity reservation is required.' USING ERRCODE='42501';END IF;
 SELECT * INTO e FROM public.document_extractions WHERE id=NEW.extraction_id FOR SHARE;
 SELECT * INTO d FROM public.documents WHERE id=NEW.document_id FOR SHARE;
 IF e.id IS NULL OR d.id IS NULL OR e.document_id IS DISTINCT FROM d.id OR e.student_id IS DISTINCT FROM NEW.student_id OR d.student_id IS DISTINCT FROM NEW.student_id
  OR e.updated_at IS DISTINCT FROM NEW.source_revision OR d.updated_at IS DISTINCT FROM NEW.document_revision OR e.status::text IS DISTINCT FROM NEW.source_status
  OR e.status::text NOT IN('pending','needs_review','in_review') OR d.scan_status IS DISTINCT FROM 'clean' OR d.review_status IS NULL OR d.review_status='rejected'
  OR d.archived_at IS NOT NULL OR d.deleted_at IS NOT NULL
  OR NEW.source_document_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex')
  OR NEW.source_sections_sha256 IS DISTINCT FROM encode(sha256(convert_to(e.sections::text,'UTF8')),'hex') THEN
  RAISE EXCEPTION 'The current document text source could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_text_authority(NEW.actor_id,NEW.student_id);
 PERFORM public.assert_internal_combined_document_capacity(NEW.actor_id,NEW.student_id,1);
 RETURN NEW;
END; $text_capacity_guard$;
CREATE TRIGGER document_text_capacity_frozen BEFORE INSERT OR UPDATE OR DELETE ON public.document_text_extraction_capacity
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_text_capacity();
CREATE TRIGGER document_text_capacity_no_truncate BEFORE TRUNCATE ON public.document_text_extraction_capacity
 FOR EACH STATEMENT EXECUTE FUNCTION public.guard_document_text_capacity();
CREATE FUNCTION public.reserve_internal_document_text_capacity(_operation_id uuid,_actor_id uuid,_student_id uuid,_document_id uuid,_extraction_id uuid,
 _source_revision timestamptz,_document_revision timestamptz,_source_status text,_text_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
SET TimeZone='UTC'
AS $text_capacity_reserve$
DECLARE e public.document_extractions%ROWTYPE;d public.documents%ROWTYPE;s public.document_text_extraction_capacity%ROWTYPE;r bigint;
BEGIN
 r:=public.lock_internal_document_capacity();
 SELECT * INTO e FROM public.document_extractions WHERE id=_extraction_id FOR SHARE;
 SELECT * INTO d FROM public.documents WHERE id=_document_id FOR SHARE;
 INSERT INTO public.document_text_extraction_capacity(operation_id,actor_id,student_id,document_id,extraction_id,source_revision,document_revision,source_status,
  source_text_sha256,source_document_sha256,source_sections_sha256,admitted_revision)
 VALUES(_operation_id,_actor_id,_student_id,_document_id,_extraction_id,_source_revision,_document_revision,_source_status,_text_sha256,
  encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex'),encode(sha256(convert_to(e.sections::text,'UTF8')),'hex'),r) RETURNING * INTO s;
 RETURN jsonb_build_object('schema','document-text-capacity-reserved-v1','operation_id',s.operation_id,'receipt_id',s.receipt_id,'reserved_units',1);
END; $text_capacity_reserve$;
CREATE FUNCTION public.hold_internal_document_text_capacity(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $text_capacity_hold$
DECLARE s public.document_text_extraction_capacity%ROWTYPE;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 UPDATE public.document_text_extraction_capacity SET state='needs_review',hold_reason=_reason
 WHERE operation_id=_operation_id AND actor_id=_actor_id AND receipt_id=_receipt_id AND state='active' RETURNING * INTO s;
 IF NOT FOUND THEN RAISE EXCEPTION 'The held reservation could not be confirmed.' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('schema','document-text-capacity-held-v1','operation_id',s.operation_id,'state',s.state);
END; $text_capacity_hold$;
REVOKE ALL ON FUNCTION public.lock_internal_document_text_authority(uuid,uuid),public.count_internal_document_text_capacity(uuid,uuid,text),
 public.count_internal_combined_document_capacity(uuid,uuid),public.assert_internal_combined_document_capacity(uuid,uuid,integer),public.guard_existing_capacity_text_pool(),
 public.guard_document_text_capacity(),public.reserve_internal_document_text_capacity(uuid,uuid,uuid,uuid,uuid,timestamptz,timestamptz,text,text),
 public.hold_internal_document_text_capacity(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

-- Preserve both original metadata function owners and privileges. Give only
-- their exact trusted owners access to the private count, never raw rows.
DO $text_capacity_metadata$
DECLARE item record;executor name:=current_user;owner_name name;editing_role name;definition text;old_expression text;replacement text;
BEGIN
 FOR item IN SELECT p.oid,p.proowner,p.oid::regprocedure::text AS signature FROM pg_proc p
  WHERE p.oid IN('public.set_document_operation_pause(uuid,bigint,boolean,text)'::regprocedure,'public.inspect_document_operation_drain()'::regprocedure) LOOP
  SELECT rolname INTO owner_name FROM pg_roles WHERE oid=item.proowner;
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.count_internal_document_text_capacity(uuid,uuid,text) TO %I',owner_name);
  definition:=pg_get_functiondef(item.oid);
  IF item.signature LIKE 'public.set_document_operation_pause%' OR item.signature LIKE 'set_document_operation_pause%' THEN
   old_expression:='IF NOT _paused AND EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN (''active'',''needs_review'') AND NOT public.is_document_apply_no_save_reconciled(operation_id)) THEN';
   replacement:='IF NOT _paused AND (EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN (''active'',''needs_review'') AND NOT public.is_document_apply_no_save_reconciled(operation_id)) OR public.count_internal_document_text_capacity(NULL,NULL,NULL)>0) THEN';
  ELSE
   old_expression:='NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN (''active'',''needs_review'') AND NOT public.is_document_apply_no_save_reconciled(operation_id))';
   replacement:='(NOT EXISTS(SELECT 1 FROM public.document_operation_leases WHERE state IN (''active'',''needs_review'') AND NOT public.is_document_apply_no_save_reconciled(operation_id)) AND public.count_internal_document_text_capacity(NULL,NULL,NULL)=0)';
   definition:=replace(definition,'''legacy_handlers_covered'',false',
    '''text_extraction_active'',public.count_internal_document_text_capacity(NULL,NULL,''active''),''text_extraction_needs_review'',public.count_internal_document_text_capacity(NULL,NULL,''needs_review''),''text_extraction_reserved_units'',public.count_internal_document_text_capacity(NULL,NULL,NULL),''legacy_handlers_covered'',false');
  END IF;
  IF position(old_expression IN definition)=0 THEN RAISE EXCEPTION 'Exact pause/inventory patch point required.' USING ERRCODE='55000';END IF;
  definition:=replace(definition,old_expression,replacement);
  IF current_user<>owner_name THEN
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=session_user AND rolsuper) THEN editing_role:=session_user;ELSE editing_role:=owner_name;END IF;
   EXECUTE format('SET LOCAL ROLE %I',editing_role);
  END IF;
  EXECUTE definition;
  IF current_user<>executor THEN EXECUTE format('SET LOCAL ROLE %I',executor);END IF;
  IF (SELECT proowner FROM pg_proc WHERE oid=item.oid) IS DISTINCT FROM item.proowner THEN RAISE EXCEPTION 'Metadata ownership changed';END IF;
 END LOOP;
END; $text_capacity_metadata$;
DO $text_capacity_private_proof$
DECLARE p record;caller text;meta_owner oid:=(SELECT relowner FROM pg_class WHERE oid='public.document_operation_control'::regclass);
BEGIN
 FOR p IN SELECT oid,proowner,proacl,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN(
  'lock_internal_document_text_authority','count_internal_document_text_capacity','count_internal_combined_document_capacity',
  'assert_internal_combined_document_capacity','guard_existing_capacity_text_pool','guard_document_text_capacity',
  'reserve_internal_document_text_capacity','hold_internal_document_text_capacity') LOOP
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,p.oid,'EXECUTE') THEN RAISE EXCEPTION 'Effective text-capacity execution must remain private.' USING ERRCODE='55000';END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) a WHERE a.privilege_type='EXECUTE'
    AND a.grantee<>p.proowner AND NOT(p.proname='count_internal_document_text_capacity' AND a.grantee=meta_owner)) THEN
   RAISE EXCEPTION 'Unexpected text-capacity execution grant.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
  WHERE c.oid='public.document_text_extraction_capacity'::regclass AND a.grantee<>c.relowner) THEN
  RAISE EXCEPTION 'Text-capacity rows must remain private.' USING ERRCODE='55000';END IF;
END; $text_capacity_private_proof$;
COMMENT ON TABLE public.document_text_extraction_capacity IS 'Private one-unit unfinished text reservations sharing32/4/2 capacity. Active/needs_review always count. No public protocol, provider authority, completion/release/expiry or hosted activation.';
COMMIT;
