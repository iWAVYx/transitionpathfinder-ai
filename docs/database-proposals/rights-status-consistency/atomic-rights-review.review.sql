-- REVIEW ONLY: separate rights-review draft after the six permission drafts.
-- No canonical/ledger promotion or hosted execution authority. Existing status,
-- history, consent and audit values are retained; only revision UUIDs are added.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.students,public.student_collaborators,public.student_relationships,
 public.user_roles,public.rights_transfer_status,public.audit_log IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
DECLARE item record;caller text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('public.lock_internal_document_producer_authority(uuid,uuid)','e690e7381ac2fc648aad398aac81d8c6'),
 ('public.lock_document_text_role_change()','15b2fa145f63b5612ba71394d5b503dc')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND NOT prosecdef AND provolatile='v' AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Exact reviewed transaction-held authority helpers are required.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') THEN RAISE EXCEPTION 'Authority helpers must remain private.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
 ('public.can_edit_student(uuid,uuid)','79b05b69377dd61a33938fe5ebb06fc7'),
 ('public.can_access_student(uuid,uuid)','c2dcc71ecab9bc4b982d7f81793da2aa'),
 ('public.is_partner_only(uuid)','47797991e8c4f44c7e8aa1bbcbc86b91')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef
   AND proowner=current_user::regrole::oid AND provolatile='s') THEN
   RAISE EXCEPTION 'Exact canonical explicit student access is required.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF to_regclass('public.rights_review_operations') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.rights_transfer_status'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.lock_internal_document_producer_authority(uuid,uuid)') AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority' AND tgenabled='O' AND tgfoid='public.lock_document_text_role_change()'::regprocedure) THEN
  RAISE EXCEPTION 'Reviewed explicit editing-proof and rights history baseline is required.' USING ERRCODE='55000';END IF;
END;$baseline$;
ALTER TABLE public.students ADD COLUMN rights_status_revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE public.rights_review_operations(
 id uuid PRIMARY KEY,actor_id uuid NOT NULL,student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 expected_revision uuid NOT NULL,revision uuid NOT NULL UNIQUE,history_id uuid NOT NULL UNIQUE,audit_id uuid NOT NULL UNIQUE,
 payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),transaction_id bigint NOT NULL,
 acknowledged_at timestamptz,completed boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rights_review_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rights_review_operations FROM PUBLIC,anon,authenticated,service_role;
CREATE POLICY private_rights_review_operations ON public.rights_review_operations AS RESTRICTIVE
 FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE FUNCTION public.internal_rights_review_payload(_row public.rights_transfer_status)
RETURNS jsonb LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path=pg_catalog
AS $payload$
 SELECT jsonb_build_object('current_status',_row.current_status,'transfer_notice_date',_row.transfer_notice_date,
  'student_authorized_parent_access',_row.student_authorized_parent_access,'decision_making_notes',_row.decision_making_notes,
  'legal_representative_notes',_row.legal_representative_notes);
$payload$;
REVOKE ALL ON FUNCTION public.internal_rights_review_payload(public.rights_transfer_status) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.guard_rights_review_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $history$
BEGIN
 IF TG_OP='UPDATE' OR NOT EXISTS(SELECT 1 FROM public.rights_review_operations o
  WHERE o.history_id=NEW.id AND o.actor_id=auth.uid() AND o.actor_id=NEW.reviewed_by_user_id
   AND o.student_id=NEW.student_id AND o.transaction_id=txid_current() AND NOT o.completed
   AND o.payload_sha256=encode(sha256(convert_to(public.internal_rights_review_payload(NEW)::text,'UTF8')),'hex')) THEN
  RAISE EXCEPTION 'Rights reviews require the current atomic save.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END;$history$;
REVOKE ALL ON FUNCTION public.guard_rights_review_history() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER rights_review_history_guard BEFORE INSERT OR UPDATE ON public.rights_transfer_status
 FOR EACH ROW EXECUTE FUNCTION public.guard_rights_review_history();
CREATE FUNCTION public.guard_student_rights_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $student_guard$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.rights_status<>'unknown_needs_review' OR NEW.transfer_notice_acknowledged_at IS NOT NULL THEN
   RAISE EXCEPTION 'Record a rights review after creating the student.' USING ERRCODE='42501';END IF;
  RETURN NEW;
 END IF;
 IF NEW.rights_status IS NOT DISTINCT FROM OLD.rights_status
  AND NEW.transfer_notice_acknowledged_at IS NOT DISTINCT FROM OLD.transfer_notice_acknowledged_at
  AND NEW.rights_status_revision IS NOT DISTINCT FROM OLD.rights_status_revision THEN RETURN NEW;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rights_review_operations o JOIN public.rights_transfer_status h ON h.id=o.history_id
  WHERE o.student_id=NEW.id AND o.actor_id=auth.uid() AND o.transaction_id=txid_current() AND NOT o.completed
   AND o.expected_revision=OLD.rights_status_revision AND o.revision=NEW.rights_status_revision
   AND NEW.rights_status=h.current_status AND h.student_id=NEW.id AND h.reviewed_by_user_id=o.actor_id
   AND NEW.transfer_notice_acknowledged_at IS NOT DISTINCT FROM o.acknowledged_at) THEN
  RAISE EXCEPTION 'Rights status needs a matching current review.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END;$student_guard$;
REVOKE ALL ON FUNCTION public.guard_student_rights_review() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER student_rights_review_guard BEFORE INSERT OR UPDATE ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.guard_student_rights_review();
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.rights_transfer_status FROM PUBLIC,anon,authenticated;
CREATE POLICY rights_review_no_raw_insert ON public.rights_transfer_status AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY rights_review_no_raw_update ON public.rights_transfer_status AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY rights_review_no_raw_delete ON public.rights_transfer_status AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(false);
CREATE POLICY rights_review_current_read ON public.rights_transfer_status AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(public.can_access_student(auth.uid(),student_id) AND NOT public.is_partner_only(auth.uid()));
CREATE FUNCTION public.read_student_rights_review(_student_id uuid,_expected_viewer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $read_review$
DECLARE actor uuid:=auth.uid();student_json jsonb;reviews jsonb;consistent boolean;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _student_id IS NULL
  OR public.can_access_student(actor,_student_id) IS DISTINCT FROM true OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current rights review could not be loaded.' USING ERRCODE='42501';END IF;
 SELECT jsonb_build_object('id',s.id,'rights_status',s.rights_status,'rights_status_revision',s.rights_status_revision,
  'transfer_notice_acknowledged_at',s.transfer_notice_acknowledged_at,'date_of_birth',s.date_of_birth,'age',s.age),
  coalesce((SELECT jsonb_agg(to_jsonb(h)) FROM(
   SELECT r.* FROM public.rights_transfer_status r WHERE r.student_id=s.id
   ORDER BY (r.id=(SELECT o.history_id FROM public.rights_review_operations o WHERE o.student_id=s.id AND o.revision=s.rights_status_revision AND o.completed)) DESC NULLS LAST,r.created_at DESC,r.id DESC LIMIT 20
  )h),'[]'::jsonb)
 INTO student_json,reviews FROM public.students s WHERE s.id=_student_id;
 IF student_json IS NULL THEN RAISE EXCEPTION 'Current rights review could not be loaded.' USING ERRCODE='42501';END IF;
 consistent:=CASE WHEN jsonb_array_length(reviews)=0 THEN student_json->>'rights_status'='unknown_needs_review'
  ELSE reviews->0->>'current_status'=student_json->>'rights_status' END;
 RETURN jsonb_build_object('schema','rights-status-read-v1','actor_id',actor,'student',student_json,'history',reviews,
  'latest',CASE WHEN consistent THEN reviews->0 ELSE NULL END,'can_edit',public.can_edit_student(actor,_student_id),'needs_review',NOT consistent);
END;$read_review$;
REVOKE ALL ON FUNCTION public.read_student_rights_review(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_student_rights_review(uuid,uuid) TO authenticated;
CREATE FUNCTION public.save_student_rights_review(_request_id uuid,_expected_viewer_id uuid,_student_id uuid,_expected_revision uuid,_changes jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $save_review$
DECLARE actor uuid:=auth.uid();s public.students%ROWTYPE;o public.rights_review_operations%ROWTYPE;h public.rights_transfer_status%ROWTYPE;
 saved_student public.students%ROWTYPE;audit_receipt uuid;finished boolean;
 payload_hash text;next_revision uuid:=gen_random_uuid();ack timestamptz;replayed boolean:=false;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _request_id IS NULL OR _student_id IS NULL OR _expected_revision IS NULL
  OR current_setting('transaction_isolation')<>'read committed' OR jsonb_typeof(_changes) IS DISTINCT FROM 'object'
  OR (SELECT count(*) FROM jsonb_object_keys(_changes))<>5
  OR _changes-ARRAY['current_status','transfer_notice_date','student_authorized_parent_access','decision_making_notes','legal_representative_notes']<>'{}'::jsonb
  OR jsonb_typeof(_changes->'current_status') IS DISTINCT FROM 'string'
  OR (_changes->>'current_status') NOT IN('under_18_parent_rights_active','approaching_transfer_of_rights','rights_transferred_to_student','student_shared_decision_making','parent_guardian_authorized_by_student','legal_representative_or_conservator','unknown_needs_review')
  OR jsonb_typeof(_changes->'student_authorized_parent_access') IS DISTINCT FROM 'boolean'
  OR jsonb_typeof(_changes->'transfer_notice_date') NOT IN('string','null')
  OR jsonb_typeof(_changes->'decision_making_notes') NOT IN('string','null')
  OR jsonb_typeof(_changes->'legal_representative_notes') NOT IN('string','null')
  OR coalesce(length(_changes->>'decision_making_notes'),0)>2000 OR coalesce(length(_changes->>'legal_representative_notes'),0)>2000
  OR (_changes->>'transfer_notice_date' IS NOT NULL AND _changes->>'transfer_notice_date' !~ '^\d{4}-\d{2}-\d{2}$') THEN
  RAISE EXCEPTION 'Current rights review could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 SELECT * INTO s FROM public.students WHERE id=_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current rights review could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 payload_hash:=encode(sha256(convert_to(_changes::text,'UTF8')),'hex');
 SELECT * INTO o FROM public.rights_review_operations WHERE id=_request_id;
 IF FOUND THEN
  IF o.actor_id IS DISTINCT FROM actor OR o.student_id IS DISTINCT FROM _student_id OR o.expected_revision IS DISTINCT FROM _expected_revision
   OR o.payload_sha256 IS DISTINCT FROM payload_hash OR NOT o.completed THEN
   RAISE EXCEPTION 'Current rights review could not be confirmed.' USING ERRCODE='42501';END IF;
  SELECT * INTO h FROM public.rights_transfer_status WHERE id=o.history_id;
  IF NOT FOUND OR public.internal_rights_review_payload(h) IS DISTINCT FROM _changes OR h.student_id IS DISTINCT FROM _student_id OR h.reviewed_by_user_id IS DISTINCT FROM actor THEN
   RAISE EXCEPTION 'Recorded rights review needs reconciliation.' USING ERRCODE='55000';END IF;
  replayed:=true;
 ELSE
  IF s.rights_status_revision IS DISTINCT FROM _expected_revision THEN
   RAISE EXCEPTION 'Rights status changed; refresh before saving.' USING ERRCODE='40001';END IF;
  IF next_revision=_expected_revision THEN RAISE EXCEPTION 'A fresh revision could not be confirmed.' USING ERRCODE='55000';END IF;
  ack:=CASE WHEN _changes->>'current_status' IN('rights_transferred_to_student','parent_guardian_authorized_by_student') THEN statement_timestamp() ELSE s.transfer_notice_acknowledged_at END;
  INSERT INTO public.rights_review_operations(id,actor_id,student_id,expected_revision,revision,history_id,audit_id,payload_sha256,transaction_id,acknowledged_at)
   VALUES(_request_id,actor,_student_id,_expected_revision,next_revision,gen_random_uuid(),gen_random_uuid(),payload_hash,txid_current(),ack) RETURNING * INTO o;
  INSERT INTO public.rights_transfer_status(id,student_id,current_status,transfer_notice_date,student_authorized_parent_access,decision_making_notes,legal_representative_notes,reviewed_by_user_id)
   VALUES(o.history_id,_student_id,_changes->>'current_status',(_changes->>'transfer_notice_date')::date,(_changes->>'student_authorized_parent_access')::boolean,_changes->>'decision_making_notes',_changes->>'legal_representative_notes',actor) RETURNING * INTO h;
  IF NOT FOUND OR h.id IS DISTINCT FROM o.history_id OR h.student_id IS DISTINCT FROM _student_id OR h.reviewed_by_user_id IS DISTINCT FROM actor OR public.internal_rights_review_payload(h) IS DISTINCT FROM _changes THEN
   RAISE EXCEPTION 'Rights review history could not be confirmed.' USING ERRCODE='55000';END IF;
  UPDATE public.students SET rights_status=h.current_status,transfer_notice_acknowledged_at=ack,rights_status_revision=next_revision WHERE id=_student_id RETURNING * INTO saved_student;
  IF NOT FOUND OR saved_student.rights_status IS DISTINCT FROM h.current_status OR saved_student.rights_status_revision IS DISTINCT FROM next_revision
   OR saved_student.transfer_notice_acknowledged_at IS DISTINCT FROM ack THEN
   RAISE EXCEPTION 'Rights status mirror could not be confirmed.' USING ERRCODE='55000';END IF;
  INSERT INTO public.audit_log(id,actor_id,student_id,action,entity_type,entity_id,metadata)
   VALUES(o.audit_id,actor,_student_id,'rights_status.updated','student',_student_id,jsonb_build_object('status',h.current_status,'authorized_parent_access',h.student_authorized_parent_access,'request_id',_request_id,'history_id',h.id)) RETURNING id INTO audit_receipt;
  IF NOT FOUND OR audit_receipt IS DISTINCT FROM o.audit_id OR NOT EXISTS(SELECT 1 FROM public.audit_log a WHERE a.id=o.audit_id AND a.actor_id=actor AND a.student_id=_student_id AND a.action='rights_status.updated') THEN
   RAISE EXCEPTION 'Rights review audit could not be confirmed.' USING ERRCODE='55000';END IF;
  UPDATE public.rights_review_operations SET completed=true WHERE id=_request_id RETURNING completed INTO finished;
  IF NOT FOUND OR finished IS DISTINCT FROM true THEN RAISE EXCEPTION 'Rights operation completion could not be confirmed.' USING ERRCODE='55000';END IF;
 END IF;
 RETURN jsonb_build_object('schema','rights-status-save-v1','request_id',_request_id,'actor_id',actor,'student_id',_student_id,
  'expected_revision',_expected_revision,'revision',o.revision,'row',to_jsonb(h),'replayed',replayed);
END;$save_review$;
REVOKE ALL ON FUNCTION public.save_student_rights_review(uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_student_rights_review(uuid,uuid,uuid,uuid,jsonb) TO authenticated;
COMMIT;
