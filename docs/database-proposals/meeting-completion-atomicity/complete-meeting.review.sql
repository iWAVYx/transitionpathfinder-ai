-- Separate review draft only; no hosted authorization.
BEGIN;
SET LOCAL lock_timeout='5s';
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
 IF to_regprocedure('public.complete_student_meeting(uuid,uuid,uuid,timestamptz,jsonb)')IS NOT NULL

 OR to_regprocedure('public.advance_meeting_revision()')IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.meetings'::regclass AND tgname='trg_meetings_updated_at' AND tgenabled='O' AND tgfoid='public.set_updated_at()'::regprocedure) THEN RAISE EXCEPTION 'Expected meeting baseline required.'USING ERRCODE='55000';END IF;
END;$baseline$;
CREATE FUNCTION public.advance_meeting_revision()RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $revision$BEGIN NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END;$revision$;
REVOKE ALL ON FUNCTION public.advance_meeting_revision()FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_meeting_revision BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.advance_meeting_revision();

CREATE FUNCTION public.complete_student_meeting(_student_id uuid,_expected_viewer_id uuid,_meeting_id uuid,_expected_updated_at timestamptz,_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $complete$
DECLARE actor uuid:=auth.uid();prior public.meetings%ROWTYPE;saved public.meetings%ROWTYPE;source public.meeting_action_items%ROWTYPE;
 task jsonb;linked jsonb;event jsonb;promoted jsonb:='[]';category text;expected jsonb;event_body text;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _student_id IS NULL OR _meeting_id IS NULL OR _expected_updated_at IS NULL
 OR _patch IS NULL OR jsonb_typeof(_patch)<>'object' OR current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'Invalid meeting completion intent.'USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_patch)k WHERE k NOT IN('summary','decisions','documents_to_update','next_meeting_date'))
 OR EXISTS(SELECT 1 FROM jsonb_each(_patch)e WHERE jsonb_typeof(e.value)NOT IN('string','null'))
 OR length(_patch->>'summary')>8000 OR length(_patch->>'decisions')>4000 OR length(_patch->>'documents_to_update')>4000
 OR((_patch->>'next_meeting_date')IS NOT NULL AND(_patch->>'next_meeting_date')!~'^\d{4}-\d{2}-\d{2}$')THEN RAISE EXCEPTION 'Invalid meeting fields.'USING ERRCODE='22023';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 SELECT * INTO prior FROM public.meetings WHERE id=_meeting_id AND student_id=_student_id FOR UPDATE;
 IF NOT FOUND OR prior.updated_at IS DISTINCT FROM _expected_updated_at OR prior.status<>'upcoming' THEN RAISE EXCEPTION 'Meeting changed; refresh before completing.'USING ERRCODE='40001';END IF;
 UPDATE public.meetings SET status='completed',
 summary=CASE WHEN _patch?'summary' THEN _patch->>'summary' ELSE prior.summary END,
 decisions=CASE WHEN _patch?'decisions' THEN _patch->>'decisions' ELSE prior.decisions END,
 documents_to_update=CASE WHEN _patch?'documents_to_update' THEN _patch->>'documents_to_update' ELSE prior.documents_to_update END,
 next_meeting_date=CASE WHEN _patch?'next_meeting_date' THEN(_patch->>'next_meeting_date')::date ELSE prior.next_meeting_date END
 WHERE id=_meeting_id AND student_id=_student_id AND updated_at=_expected_updated_at RETURNING * INTO saved;
 expected:=to_jsonb(prior)||_patch||jsonb_build_object('status','completed');
 IF saved.id IS NULL OR saved.updated_at<=prior.updated_at OR(to_jsonb(saved)-'updated_at')IS DISTINCT FROM(expected-'updated_at')THEN RAISE EXCEPTION 'Meeting receipt unconfirmed.'USING ERRCODE='55000';END IF;
 FOR source IN SELECT * FROM public.meeting_action_items WHERE meeting_id=_meeting_id AND promoted_action_item_id IS NULL ORDER BY id FOR UPDATE LOOP
  category:=CASE WHEN source.assignee_role IN('family','parent')THEN 'family' WHEN source.assignee_role='student'THEN 'student' WHEN source.assignee_role IN('educator','teacher')THEN 'educator' WHEN source.assignee_role='school'THEN 'school' ELSE 'team' END;
  expected:=jsonb_build_object('student_id',_student_id,'title',source.title,'description','From meeting: '||saved.title,'category',category,'priority','medium','status',CASE WHEN source.status='done'THEN 'completed' ELSE 'not_started' END,'due_date',source.due_date,'created_by_user_id',actor,'assigned_to_user_id',NULL,'pathway_report_id',NULL,'related_goal_area',NULL);
  INSERT INTO public.action_items(student_id,title,description,category,priority,status,due_date,created_by_user_id)
  VALUES(_student_id,source.title,'From meeting: '||saved.title,category,'medium',expected->>'status',source.due_date,actor)RETURNING to_jsonb(action_items.*)INTO task;
  IF task IS NULL OR NOT(task@>expected)OR(task->>'id')IS NULL THEN RAISE EXCEPTION 'Follow-up creation unconfirmed.'USING ERRCODE='55000';END IF;
  UPDATE public.meeting_action_items SET promoted_action_item_id=(task->>'id')::uuid WHERE id=source.id AND meeting_id=_meeting_id AND promoted_action_item_id IS NULL RETURNING to_jsonb(meeting_action_items.*)INTO linked;
  IF linked IS NULL OR(linked-'updated_at'-'promoted_action_item_id')IS DISTINCT FROM(to_jsonb(source)-'updated_at'-'promoted_action_item_id')OR linked->>'promoted_action_item_id'IS DISTINCT FROM task->>'id'THEN RAISE EXCEPTION 'Follow-up linkage unconfirmed.'USING ERRCODE='55000';END IF;
  promoted:=promoted||jsonb_build_array(jsonb_build_object('source_id',source.id,'action',task));
 END LOOP;
 event_body:=CASE WHEN jsonb_array_length(promoted)>0 THEN jsonb_array_length(promoted)::text||' follow-up action item'||CASE WHEN jsonb_array_length(promoted)=1 THEN '' ELSE 's'END||' added.'ELSE NULL END;
 expected:=jsonb_build_object('student_id',_student_id,'actor_id',actor,'kind','meeting.completed','title','Meeting completed: '||saved.title,'body',event_body,'ref_table','meetings','ref_id',_meeting_id);
 INSERT INTO public.feed_events(student_id,actor_id,kind,title,body,ref_table,ref_id)VALUES(_student_id,actor,'meeting.completed','Meeting completed: '||saved.title,event_body,'meetings',_meeting_id)RETURNING to_jsonb(feed_events.*)INTO event;
 IF event IS NULL OR NOT(event@>expected)OR(event->>'id')IS NULL THEN RAISE EXCEPTION 'Meeting activity unconfirmed.'USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','meeting-completion-v1','actor_id',actor,'student_id',_student_id,'meeting_id',_meeting_id,'expected_updated_at',_expected_updated_at,'row',to_jsonb(saved),'promoted',promoted,'event',event);
END;$complete$;
REVOKE ALL ON FUNCTION public.complete_student_meeting(uuid,uuid,uuid,timestamptz,jsonb)FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.complete_student_meeting(uuid,uuid,uuid,timestamptz,jsonb)TO authenticated;
COMMIT;
