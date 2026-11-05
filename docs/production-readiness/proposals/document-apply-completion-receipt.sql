-- DRAFT ONLY: private observed Apply completion proof. No capacity release.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $apply_install_boundary$
DECLARE item record; caller text; relation_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Paused reviewed Apply installation required' USING ERRCODE='55000'; END IF;
 FOR item IN SELECT * FROM (VALUES
 ('public.begin_bound_document_apply(uuid,uuid,uuid,uuid,uuid,timestamptz,jsonb,boolean)','6f601210e16ce169478e8277e9263228',true,true,'service_role'),
 ('public.assert_bound_document_apply(uuid,uuid,uuid,timestamptz,jsonb,boolean)','105e3e1c77801ad75384526521e336c3',true,true,'authenticated'),
 ('public.apply_reviewed_document_extraction(uuid,uuid,uuid,timestamptz,jsonb,boolean)','169bbd1099b39afe9411d5e5497ac645',false,false,'authenticated'),
 ('public.guard_document_apply_source_binding()','5c64a025bbdff1fe50a44c3bd40cd0d8',false,false,'')
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
 FOREACH relation_name IN ARRAY ARRAY['public.document_apply_source_bindings'] LOOP
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
 ('public.document_apply_source_bindings','document_apply_binding_retained','public.guard_document_apply_source_binding()',27,false)
 ) expected(relation_name,trigger_name,signature,trigger_type,deferred) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(item.relation_name)
   AND tgname=item.trigger_name AND tgfoid=to_regprocedure(item.signature) AND tgtype=item.trigger_type
   AND tgenabled='O' AND NOT tgisinternal AND tgdeferrable=item.deferred AND tginitdeferred=item.deferred
   AND (tgconstraint<>0)=item.deferred AND tgqual IS NULL AND tgattr::text='') THEN
   RAISE EXCEPTION 'Exact enabled Apply trigger required' USING ERRCODE='55000'; END IF;
 END LOOP;
END; $apply_install_boundary$;
CREATE TABLE public.document_apply_completion_receipts(
 operation_id uuid PRIMARY KEY REFERENCES public.document_apply_source_bindings(operation_id),
 actor_id uuid NOT NULL,student_id uuid NOT NULL,extraction_id uuid NOT NULL,
 extraction_sha256 text NOT NULL,student_sha256 text NOT NULL,transition_sha256 text NOT NULL,
 evidence_id uuid,evidence_sha256 text,receipt_txid bigint NOT NULL DEFAULT txid_current()
);
ALTER TABLE public.document_apply_completion_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_apply_completion_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.record_bound_document_apply_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC'
AS $record_apply$
DECLARE b public.document_apply_source_bindings%ROWTYPE;mapping record;section jsonb;val text;actual jsonb;written boolean;counted integer:=0;stored public.document_apply_completion_receipts%ROWTYPE;ev public.evidence_items%ROWTYPE;student_fields text[]:=ARRAY[]::text[];transition_fields text[]:=ARRAY[]::text[];wanted_evidence uuid;wanted_evidence_sha text;
BEGIN
 IF NEW.status::text<>'complete' OR OLD.status::text='complete' THEN RETURN NEW; END IF;
 PERFORM public.lock_internal_document_capacity_completion();
 SELECT source.* INTO b FROM public.document_apply_source_bindings source
  JOIN public.document_operation_leases lease USING(operation_id)
  JOIN public.document_capacity_reservations capacity USING(operation_id)
  WHERE source.extraction_id=NEW.id AND source.actor_id=auth.uid() AND source.student_id=NEW.student_id
   AND source.document_id=NEW.document_id AND source.source_revision=OLD.updated_at
   AND source.sections_sha256=encode(sha256(convert_to(OLD.sections::text,'UTF8')),'hex')
   AND lease.state='active' AND lease.operation_kind='apply' AND lease.actor_id=source.actor_id
   AND capacity.producer_kind='apply' AND capacity.reserved_units=1 AND capacity.student_id=source.student_id;
 IF NOT FOUND OR NEW.sections IS DISTINCT FROM OLD.sections OR NEW.reviewer_id IS DISTINCT FROM b.actor_id
  OR NEW.reviewed_at IS NULL OR NEW.updated_at<=OLD.updated_at
  OR public.can_edit_student(b.actor_id,b.student_id) IS DISTINCT FROM true
  OR public.can_view_document(b.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(b.actor_id) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Exact reviewed Apply completion required' USING ERRCODE='42501'; END IF;
 FOR mapping IN SELECT * FROM (VALUES
  ('student_first_name','student','first_name'),('grade_band','student','grade_band'),
  ('strengths','student','strengths_summary'),('interests','student','interests_summary'),
  ('needs','student','support_needs_summary'),('student_voice','student','student_voice_statement'),
  ('family_concerns','student','family_priorities'),('transportation','transition','transportation_goal'),
  ('supports','transition','current_services_summary'),('current_goals','transition','education_training_goal')
 ) fields(section_key,target,field) LOOP
  section:=NEW.sections->mapping.section_key;
  IF section->>'state' IN('accepted','edited') THEN
   IF jsonb_typeof(section->'value') IS DISTINCT FROM 'string' OR char_length(section->>'value')>4000 THEN
    RAISE EXCEPTION 'Reviewed value could not be confirmed' USING ERRCODE='42501'; END IF;
   val:=btrim(section->>'value');
   IF val<>'' THEN
    IF mapping.section_key='grade_band' AND val NOT IN('6-8','9-10','11-12','post-secondary','not-applicable') THEN
     RAISE EXCEPTION 'Reviewed grade could not be confirmed' USING ERRCODE='42501'; END IF;
    IF mapping.target='student' THEN
     student_fields:=array_append(student_fields,mapping.field);
     SELECT to_jsonb(s),s.xmin::text::bigint=mod(txid_current(),4294967296) INTO actual,written FROM public.students s WHERE id=b.student_id;
    ELSE
     transition_fields:=array_append(transition_fields,mapping.field);
     SELECT to_jsonb(p),p.xmin::text::bigint=mod(txid_current(),4294967296) INTO actual,written FROM public.transition_profiles p WHERE student_id=b.student_id;
    END IF;
    IF NOT FOUND OR written IS DISTINCT FROM true OR actual->>mapping.field IS DISTINCT FROM val THEN
     RAISE EXCEPTION 'Actual reviewed profile write required' USING ERRCODE='55000'; END IF;
    counted:=counted+1;
   END IF;
  END IF;
 END LOOP;
 IF counted=0 THEN RAISE EXCEPTION 'Reviewed profile values required' USING ERRCODE='42501'; END IF;
 IF b.emit_evidence THEN
  SELECT * INTO ev FROM public.evidence_items WHERE student_id=b.student_id AND source_kind='document_extraction' AND source_id=NEW.id;
  IF NOT FOUND OR ev.kind IS DISTINCT FROM 'document_extraction' OR ev.subject_type IS DISTINCT FROM 'document'
   OR ev.subject_id IS DISTINCT FROM b.document_id OR ev.extraction_id IS DISTINCT FROM NEW.id
   OR ev.contributor_id IS DISTINCT FROM b.actor_id OR ev.occurred_at IS DISTINCT FROM NEW.reviewed_at
   OR ev.verification_state IS DISTINCT FROM 'human_confirmed' OR ev.permission_scope IS DISTINCT FROM 'student_team'
   OR ev.payload IS DISTINCT FROM jsonb_build_object('applied_student_fields',(SELECT COALESCE(jsonb_agg(f ORDER BY f),'[]'::jsonb) FROM unnest(student_fields) f),
    'applied_transition_fields',(SELECT COALESCE(jsonb_agg(f ORDER BY f),'[]'::jsonb) FROM unnest(transition_fields) f))
   OR NOT EXISTS(SELECT 1 FROM public.evidence_items WHERE id=ev.id AND xmin::text::bigint=mod(txid_current(),4294967296)) THEN
   RAISE EXCEPTION 'Actual reviewed evidence write required' USING ERRCODE='55000'; END IF;
  wanted_evidence:=ev.id;wanted_evidence_sha:=encode(sha256(convert_to(to_jsonb(ev)::text,'UTF8')),'hex');
 END IF;
 INSERT INTO public.document_apply_completion_receipts(operation_id,actor_id,student_id,extraction_id,extraction_sha256,student_sha256,transition_sha256,evidence_id,evidence_sha256)
 VALUES(b.operation_id,b.actor_id,b.student_id,NEW.id,encode(sha256(convert_to(to_jsonb(NEW)::text,'UTF8')),'hex'),
  (SELECT encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex') FROM public.students s WHERE id=b.student_id),
  encode(sha256(convert_to(COALESCE((SELECT to_jsonb(p) FROM public.transition_profiles p WHERE student_id=b.student_id),'null'::jsonb)::text,'UTF8')),'hex'),wanted_evidence,wanted_evidence_sha) RETURNING * INTO stored;
 IF NOT FOUND OR stored.operation_id IS DISTINCT FROM b.operation_id OR stored.actor_id IS DISTINCT FROM b.actor_id
  OR stored.student_id IS DISTINCT FROM b.student_id OR stored.extraction_id IS DISTINCT FROM NEW.id
  OR stored.extraction_sha256 IS DISTINCT FROM encode(sha256(convert_to(to_jsonb(NEW)::text,'UTF8')),'hex')
  OR stored.evidence_id IS DISTINCT FROM wanted_evidence OR stored.evidence_sha256 IS DISTINCT FROM wanted_evidence_sha
  OR stored.receipt_txid<>txid_current() THEN RAISE EXCEPTION 'Apply completion receipt was not saved' USING ERRCODE='55000'; END IF;
 RETURN NEW;
END; $record_apply$;
REVOKE ALL ON FUNCTION public.record_bound_document_apply_completion() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_completed AFTER UPDATE ON public.document_extractions
 FOR EACH ROW EXECUTE FUNCTION public.record_bound_document_apply_completion();
CREATE FUNCTION public.guard_apply_completion_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC' AS $receipt_guard$
BEGIN RAISE EXCEPTION 'Apply completion receipt is retained' USING ERRCODE='42501'; END; $receipt_guard$;
REVOKE ALL ON FUNCTION public.guard_apply_completion_receipt() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_apply_receipt_retained BEFORE UPDATE OR DELETE ON public.document_apply_completion_receipts
 FOR EACH ROW EXECUTE FUNCTION public.guard_apply_completion_receipt();
CREATE FUNCTION public.validate_bound_document_apply_completion(_operation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC' AS $validate_apply$
DECLARE r public.document_apply_completion_receipts%ROWTYPE;b public.document_apply_source_bindings%ROWTYPE;
BEGIN
 SELECT * INTO r FROM public.document_apply_completion_receipts WHERE operation_id=_operation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saved Apply receipt required' USING ERRCODE='55000'; END IF;
 SELECT * INTO b FROM public.document_apply_source_bindings WHERE operation_id=r.operation_id;
 IF NOT FOUND OR b.actor_id IS DISTINCT FROM r.actor_id OR b.student_id IS DISTINCT FROM r.student_id
  OR b.extraction_id IS DISTINCT FROM r.extraction_id
  OR (b.emit_evidence AND (r.evidence_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.evidence_items ev WHERE id=r.evidence_id AND encode(sha256(convert_to(to_jsonb(ev)::text,'UTF8')),'hex')=r.evidence_sha256)))
  OR (NOT b.emit_evidence AND r.evidence_id IS NOT NULL)
  OR public.can_edit_student(r.actor_id,r.student_id) IS DISTINCT FROM true
  OR public.can_view_document(r.actor_id,b.document_id) IS DISTINCT FROM true
  OR public.is_partner_only(r.actor_id) IS DISTINCT FROM false
  OR NOT EXISTS(SELECT 1 FROM public.document_extractions e WHERE id=r.extraction_id
   AND encode(sha256(convert_to(to_jsonb(e)::text,'UTF8')),'hex')=r.extraction_sha256)
  OR NOT EXISTS(SELECT 1 FROM public.students s WHERE id=r.student_id
   AND encode(sha256(convert_to(to_jsonb(s)::text,'UTF8')),'hex')=r.student_sha256)
  OR NOT EXISTS(SELECT 1 FROM public.documents d WHERE id=b.document_id
   AND encode(sha256(convert_to(to_jsonb(d)::text,'UTF8')),'hex')=b.document_sha256)
  OR encode(sha256(convert_to(COALESCE((SELECT to_jsonb(p) FROM public.transition_profiles p WHERE student_id=r.student_id),'null'::jsonb)::text,'UTF8')),'hex') IS DISTINCT FROM r.transition_sha256 THEN
  RAISE EXCEPTION 'Saved Apply outcome changed' USING ERRCODE='55000'; END IF;
END; $validate_apply$;
REVOKE ALL ON FUNCTION public.validate_bound_document_apply_completion(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.check_bound_apply_commit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog SET TimeZone='UTC' AS $commit_apply$
BEGIN
 IF NEW.receipt_txid<>txid_current() THEN RAISE EXCEPTION 'Current Apply transaction proof required' USING ERRCODE='55000'; END IF;
 PERFORM public.validate_bound_document_apply_completion(NEW.operation_id);
 RETURN NEW;
END; $commit_apply$;
REVOKE ALL ON FUNCTION public.check_bound_apply_commit() FROM PUBLIC,anon,authenticated,service_role;
CREATE CONSTRAINT TRIGGER document_apply_outcome_committed AFTER INSERT ON public.document_apply_completion_receipts
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_bound_apply_commit();
COMMIT;
