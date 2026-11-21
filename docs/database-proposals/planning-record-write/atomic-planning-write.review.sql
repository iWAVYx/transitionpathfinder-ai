-- REVIEW ONLY: thirteenth separate draft. No canonical/ledger or hosted authority.
-- Normal API creation and goal status only; raw/trusted paths remain separately open.
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


 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.delete_student_planning_record(text,uuid,uuid,uuid,timestamptz)') AND md5(prosrc)='61ff25aca073d37fbaa5be27877a6ba5' AND prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
 OR to_regprocedure('public.create_student_planning_record(text,uuid,uuid,uuid,jsonb)')IS NOT NULL
 OR to_regprocedure('public.update_student_goal_status(uuid,uuid,uuid,timestamptz,text)')IS NOT NULL
 OR to_regprocedure('public.advance_goal_revision()')IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.goals'::regclass AND tgname='set_updated_at_goals' AND tgenabled='O' AND tgfoid='public.set_updated_at()'::regprocedure)
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)')AND md5(prosrc)='172e6035efbcd6271054ec6f0829e4c7'AND prosecdef AND provolatile='v'AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog'])
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority'AND tgenabled='O'AND tgfoid='public.lock_document_text_role_change()'::regprocedure)
 OR(SELECT count(*)FROM pg_class WHERE oid IN('public.goals'::regclass,'public.action_items'::regclass)AND relrowsecurity)<>2 THEN
  RAISE EXCEPTION 'Exact reviewed planning deletion baseline required.'USING ERRCODE='55000';END IF;
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role']LOOP
  IF has_function_privilege(caller,'public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)','EXECUTE')IS DISTINCT FROM(caller='authenticated')THEN
   RAISE EXCEPTION 'Exact reviewed action RPC privileges required.'USING ERRCODE='55000';END IF;
 END LOOP;
END;$baseline$;


CREATE FUNCTION public.advance_goal_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $revision$
BEGIN NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END;$revision$;
REVOKE ALL ON FUNCTION public.advance_goal_revision()FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_goal_revision BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.advance_goal_revision();

CREATE FUNCTION public.create_student_planning_record(_kind text,_student_id uuid,_expected_viewer_id uuid,_record_id uuid,_fields jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $planning_create$
DECLARE actor uuid:=auth.uid();saved jsonb;expected jsonb;linked uuid;allowed text[];
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _kind IS NULL OR _kind NOT IN('goals','action_items')
 OR _student_id IS NULL OR _record_id IS NULL OR jsonb_typeof(_fields)IS DISTINCT FROM 'object'
 OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Planning creation could not be confirmed.'USING ERRCODE='42501';END IF;
 allowed:=CASE WHEN _kind='goals' THEN ARRAY['title','description','category','status','target_date','measurable_criteria']
 ELSE ARRAY['title','description','category','status','priority','due_date','related_goal_area','pathway_report_id'] END;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_fields)k WHERE NOT(k=ANY(allowed)))
 OR jsonb_typeof(_fields->'title')IS DISTINCT FROM 'string' OR length(btrim(_fields->>'title'))NOT BETWEEN 1 AND 200
 OR (_fields?'description'AND(jsonb_typeof(_fields->'description')NOT IN('string','null')OR length(_fields->>'description')>2000)) THEN
  RAISE EXCEPTION 'Planning fields could not be confirmed.'USING ERRCODE='42501';END IF;
 -- The caller cannot choose attribution, assignment, identity or revision fields.
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 IF _kind='goals' THEN
  expected:=jsonb_build_object('title',_fields->>'title','description',NULL,'category','general','status','not-started','target_date',NULL,'measurable_criteria',NULL)||_fields;
  IF jsonb_typeof(expected->'category')IS DISTINCT FROM 'string'OR expected->>'category'NOT IN('academic','life-skills','career','college','transportation','communication','general')
  OR jsonb_typeof(expected->'status')IS DISTINCT FROM 'string'OR expected->>'status'NOT IN('not-started','in-progress','met','paused')
  OR(jsonb_typeof(expected->'measurable_criteria')NOT IN('string','null')OR length(expected->>'measurable_criteria')>1000)
  OR(jsonb_typeof(expected->'target_date')NOT IN('string','null')OR(jsonb_typeof(expected->'target_date')='string'AND expected->>'target_date'!~'^\d{4}-\d{2}-\d{2}$'))THEN
   RAISE EXCEPTION 'Goal fields could not be confirmed.'USING ERRCODE='42501';END IF;
  INSERT INTO public.goals(id,student_id,created_by,title,description,category,status,target_date,measurable_criteria)
  VALUES(_record_id,_student_id,actor,expected->>'title',expected->>'description',expected->>'category',expected->>'status',(expected->>'target_date')::date,expected->>'measurable_criteria')
  RETURNING to_jsonb(goals)INTO saved;
  expected:=expected||jsonb_build_object('created_by',actor);
 ELSE
  expected:=jsonb_build_object('title',_fields->>'title','description',NULL,'category','family','status','not_started','priority','medium','due_date',NULL,'related_goal_area',NULL,'pathway_report_id',NULL)||_fields;
  IF jsonb_typeof(expected->'category')IS DISTINCT FROM 'string'OR expected->>'category'NOT IN('family','educator','student','school','team')
  OR expected->>'status'IS DISTINCT FROM 'not_started' OR jsonb_typeof(expected->'priority')IS DISTINCT FROM 'string'OR expected->>'priority'NOT IN('low','medium','high')
  OR(jsonb_typeof(expected->'related_goal_area')NOT IN('string','null')OR length(expected->>'related_goal_area')>80)
  OR(jsonb_typeof(expected->'due_date')NOT IN('string','null')OR(jsonb_typeof(expected->'due_date')='string'AND expected->>'due_date'!~'^\d{4}-\d{2}-\d{2}$'))
  OR jsonb_typeof(expected->'pathway_report_id')NOT IN('string','null')THEN
   RAISE EXCEPTION 'Action fields could not be confirmed.'USING ERRCODE='42501';END IF;
  IF expected->>'pathway_report_id'IS NOT NULL THEN
   SELECT student_id INTO linked FROM public.pathway_reports WHERE id=(expected->>'pathway_report_id')::uuid FOR SHARE;
   IF NOT FOUND OR linked IS DISTINCT FROM _student_id THEN RAISE EXCEPTION 'Linked report could not be confirmed.'USING ERRCODE='42501';END IF;
  END IF;
  INSERT INTO public.action_items(id,student_id,created_by_user_id,title,description,category,status,priority,due_date,related_goal_area,pathway_report_id)
  VALUES(_record_id,_student_id,actor,expected->>'title',expected->>'description',expected->>'category','not_started',expected->>'priority',(expected->>'due_date')::date,expected->>'related_goal_area',(expected->>'pathway_report_id')::uuid)
  RETURNING to_jsonb(action_items)INTO saved;
  expected:=expected||jsonb_build_object('created_by_user_id',actor,'assigned_to_user_id',NULL);
 END IF;
 expected:=expected||jsonb_build_object('id',_record_id,'student_id',_student_id);
 IF saved IS NULL OR NOT(saved @> expected)OR saved->>'updated_at'IS NULL OR saved->>'created_at'IS NULL THEN
  RAISE EXCEPTION 'Planning creation receipt could not be confirmed.'USING ERRCODE='55000';END IF;
 -- A repeated UUID is rejected by the primary key, never retried or treated as
 -- persistent idempotency. A missing reply requires a fresh read/reconciliation.
 RETURN jsonb_build_object('schema','planning-record-create-v1','kind',_kind,'actor_id',actor,'student_id',_student_id,'record_id',_record_id,'row',saved);
END;$planning_create$;
REVOKE ALL ON FUNCTION public.create_student_planning_record(text,uuid,uuid,uuid,jsonb)FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_student_planning_record(text,uuid,uuid,uuid,jsonb)TO authenticated;

CREATE FUNCTION public.update_student_goal_status(_student_id uuid,_expected_viewer_id uuid,_goal_id uuid,_expected_updated_at timestamptz,_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $goal_status$
DECLARE actor uuid:=auth.uid();prior public.goals%ROWTYPE;saved public.goals%ROWTYPE;changed boolean;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _student_id IS NULL OR _goal_id IS NULL OR _expected_updated_at IS NULL
 OR _status IS NULL OR _status NOT IN('not-started','in-progress','met','paused')OR current_setting('transaction_isolation')<>'read committed'THEN
  RAISE EXCEPTION 'Goal status could not be confirmed.'USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 SELECT * INTO prior FROM public.goals WHERE id=_goal_id AND student_id=_student_id FOR UPDATE;
 IF NOT FOUND OR prior.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'Saved goals changed; refresh them.'USING ERRCODE='40001';END IF;
 changed:=prior.status IS DISTINCT FROM _status;
 IF NOT changed THEN saved:=prior;ELSE
  UPDATE public.goals SET status=_status WHERE id=_goal_id AND student_id=_student_id AND updated_at=_expected_updated_at RETURNING * INTO saved;
  IF NOT FOUND OR saved.status IS DISTINCT FROM _status OR saved.updated_at<=_expected_updated_at
  OR(to_jsonb(saved)-'status'-'updated_at')IS DISTINCT FROM(to_jsonb(prior)-'status'-'updated_at')THEN
   RAISE EXCEPTION 'Goal status receipt could not be confirmed.'USING ERRCODE='55000';END IF;
 END IF;
 RETURN jsonb_build_object('schema','goal-status-update-v1','actor_id',actor,'student_id',_student_id,'goal_id',_goal_id,'expected_updated_at',_expected_updated_at,'previous_status',prior.status,'changed',changed,'row',to_jsonb(saved));
END;$goal_status$;
REVOKE ALL ON FUNCTION public.update_student_goal_status(uuid,uuid,uuid,timestamptz,text)FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.update_student_goal_status(uuid,uuid,uuid,timestamptz,text)TO authenticated;
COMMIT;
