-- REVIEW ONLY: twelfth separate draft. No canonical/ledger or hosted authority.
-- Normal API deletion only; existing raw/trusted DELETE paths are not retired.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.goals,public.action_items IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
DECLARE item record;caller text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('public.lock_internal_document_producer_authority(uuid,uuid)','e690e7381ac2fc648aad398aac81d8c6'),
 ('public.lock_document_text_role_change()','15b2fa145f63b5612ba71394d5b503dc'),
 ('public.lock_internal_document_grant_recipient(uuid,uuid)','3a43f15f80f82c44a4b217a06172efa2')
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


 IF to_regprocedure('public.delete_student_planning_record(text,uuid,uuid,uuid,timestamptz)')IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)')AND md5(prosrc)='172e6035efbcd6271054ec6f0829e4c7'AND prosecdef AND provolatile='v'AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority'AND tgenabled='O'AND tgfoid='public.lock_document_text_role_change()'::regprocedure)
 OR(SELECT count(*)FROM pg_class WHERE oid IN('public.goals'::regclass,'public.action_items'::regclass)AND relrowsecurity)<>2 THEN
  RAISE EXCEPTION 'Exact reviewed planning deletion baseline required.'USING ERRCODE='55000';END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role']LOOP
  IF has_function_privilege(caller,'public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)','EXECUTE')IS DISTINCT FROM(caller='authenticated')THEN
   RAISE EXCEPTION 'Exact reviewed action RPC privileges required.'USING ERRCODE='55000';END IF;
 END LOOP;
END;$baseline$;

CREATE FUNCTION public.delete_student_planning_record(_kind text,_student_id uuid,_expected_viewer_id uuid,_record_id uuid,_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $planning_delete$
DECLARE actor uuid:=auth.uid();prior jsonb;removed jsonb;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _kind IS NULL OR _kind NOT IN('goals','action_items')
 OR _student_id IS NULL OR _record_id IS NULL OR _expected_updated_at IS NULL OR current_setting('transaction_isolation')<>'read committed'THEN
  RAISE EXCEPTION 'Planning deletion could not be confirmed.'USING ERRCODE='42501';END IF;
 -- Editing proof, student ownership/self identity and role/relationship rows
 -- remain locked until commit/rollback. Assignee status does not grant deletion.
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 IF _kind='goals'THEN
  SELECT to_jsonb(g)INTO prior FROM public.goals g WHERE id=_record_id AND student_id=_student_id FOR UPDATE;
 ELSE
  SELECT to_jsonb(a)INTO prior FROM public.action_items a WHERE id=_record_id AND student_id=_student_id FOR UPDATE;
 END IF;
 IF prior IS NULL OR(prior->>'updated_at')::timestamptz IS DISTINCT FROM _expected_updated_at THEN
  RAISE EXCEPTION 'Saved planning records changed; refresh them.'USING ERRCODE='40001';END IF;
 IF _kind='goals'THEN
  DELETE FROM public.goals g WHERE id=_record_id AND student_id=_student_id AND updated_at=_expected_updated_at RETURNING to_jsonb(g)INTO removed;
 ELSE
  DELETE FROM public.action_items a WHERE id=_record_id AND student_id=_student_id AND updated_at=_expected_updated_at RETURNING to_jsonb(a)INTO removed;
 END IF;
 IF removed IS NULL OR removed IS DISTINCT FROM prior OR(removed->>'id')::uuid IS DISTINCT FROM _record_id
 OR(removed->>'student_id')::uuid IS DISTINCT FROM _student_id THEN
  RAISE EXCEPTION 'Planning deletion receipt could not be confirmed.'USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','planning-record-delete-v1','kind',_kind,'actor_id',actor,'student_id',_student_id,
  'record_id',_record_id,'expected_updated_at',_expected_updated_at,'deleted',true,'deleted_row',removed);
END;$planning_delete$;
REVOKE ALL ON FUNCTION public.delete_student_planning_record(text,uuid,uuid,uuid,timestamptz)FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.delete_student_planning_record(text,uuid,uuid,uuid,timestamptz)TO authenticated;
COMMIT;
