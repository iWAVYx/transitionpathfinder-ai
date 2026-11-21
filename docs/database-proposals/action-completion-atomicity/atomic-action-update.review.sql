-- REVIEW ONLY: eleventh separate draft; no canonical/ledger/hosted authority.
-- Ordinary raw/trusted writer paths are not retired by this bounded RPC.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.action_items,public.feed_events,public.pathway_reports IN SHARE ROW EXCLUSIVE MODE;
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

 IF to_regprocedure('public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority' AND tgenabled='O' AND tgfoid='public.lock_document_text_role_change()'::regprocedure)
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.action_items'::regclass AND tgname='trg_ai_updated' AND tgenabled='O' AND tgfoid='public.set_updated_at()'::regprocedure)
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.action_items'::regclass AND conname='action_items_status_check' AND convalidated AND pg_get_constraintdef(oid)=$expected$CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'complete'::text, 'completed'::text, 'blocked'::text])))$expected$)
 OR (SELECT count(*)FROM pg_class WHERE oid IN('public.action_items'::regclass,'public.feed_events'::regclass,'public.pathway_reports'::regclass)AND relrowsecurity)<>3 THEN
  RAISE EXCEPTION 'Exact reviewed action value, authority, trigger and RLS baseline required.' USING ERRCODE='55000';
 END IF;
END;$baseline$;
-- Keep API compare-and-save revisions increasing even for multiple changes in
-- one transaction. This does not enforce loaded revisions for raw writers.
CREATE FUNCTION public.advance_action_item_revision()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $revision$
BEGIN NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');RETURN NEW;END;$revision$;
REVOKE ALL ON FUNCTION public.advance_action_item_revision()FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_action_item_revision BEFORE UPDATE ON public.action_items FOR EACH ROW EXECUTE FUNCTION public.advance_action_item_revision();
CREATE FUNCTION public.update_student_action_atomic(_student_id uuid,_expected_viewer_id uuid,_action_id uuid,_expected_updated_at timestamptz,_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $action_update$
DECLARE actor uuid:=auth.uid();prior public.action_items%ROWTYPE;candidate public.action_items%ROWTYPE;saved public.action_items%ROWTYPE;
 linked public.pathway_reports%ROWTYPE;event public.feed_events%ROWTYPE;stamp timestamptz:=clock_timestamp();transition boolean:=false;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _student_id IS NULL OR _action_id IS NULL OR _expected_updated_at IS NULL
 OR current_setting('transaction_isolation')<>'read committed' OR jsonb_typeof(_patch)IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'Action update could not be confirmed.' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(_patch)k WHERE k NOT IN('status','priority','due_date','title','description'))
 OR (_patch?'status' AND (jsonb_typeof(_patch->'status')<>'string' OR _patch->>'status' NOT IN('not_started','in_progress','complete','completed','blocked')))
 OR (_patch?'priority' AND (jsonb_typeof(_patch->'priority')<>'string' OR _patch->>'priority' NOT IN('low','medium','high')))
 OR (_patch?'title' AND (jsonb_typeof(_patch->'title')<>'string' OR length(btrim(_patch->>'title')) NOT BETWEEN 1 AND 200))
 OR (_patch?'description' AND (jsonb_typeof(_patch->'description')NOT IN('string','null') OR length(_patch->>'description')>2000))
 OR (_patch?'due_date' AND (jsonb_typeof(_patch->'due_date')NOT IN('string','null') OR (jsonb_typeof(_patch->'due_date')='string'AND _patch->>'due_date'!~'^\d{4}-\d{2}-\d{2}$'))) THEN
  RAISE EXCEPTION 'Action update could not be confirmed.' USING ERRCODE='42501';END IF;
 -- Role changes share this advisory namespace; current student/proof rows stay
 -- locked until commit/rollback. Assignee status alone is never reading proof.
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 PERFORM public.lock_internal_document_grant_recipient(actor,_student_id);
 SELECT * INTO prior FROM public.action_items WHERE id=_action_id AND student_id=_student_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saved actions changed; refresh them.' USING ERRCODE='40001';END IF;
 IF public.can_edit_student(actor,_student_id)IS DISTINCT FROM true THEN
  IF prior.assigned_to_user_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'Current action editing access is required.' USING ERRCODE='42501';END IF;
 ELSE PERFORM public.lock_internal_document_producer_authority(actor,_student_id);END IF;
 IF prior.updated_at IS DISTINCT FROM _expected_updated_at THEN RAISE EXCEPTION 'Saved actions changed; refresh them.' USING ERRCODE='40001';END IF;
 IF prior.pathway_report_id IS NOT NULL THEN
  SELECT * INTO linked FROM public.pathway_reports WHERE id=prior.pathway_report_id FOR UPDATE;
  IF NOT FOUND OR linked.student_id IS DISTINCT FROM _student_id THEN RAISE EXCEPTION 'Linked report could not be confirmed.' USING ERRCODE='42501';END IF;
 END IF;
 SELECT * INTO candidate FROM jsonb_populate_record(prior,_patch);
 IF (candidate.title,candidate.description,candidate.priority,candidate.status,candidate.due_date)
 IS NOT DISTINCT FROM(prior.title,prior.description,prior.priority,prior.status,prior.due_date)THEN
  RETURN jsonb_build_object('schema','action-item-update-v1','actor_id',actor,'student_id',_student_id,'action_id',_action_id,
   'expected_updated_at',_expected_updated_at,'previous_status',prior.status,'changed',false,'row',to_jsonb(prior),'event_id',NULL,'stale_report_id',NULL,'inputs_stale_at',NULL);
 END IF;
 UPDATE public.action_items SET title=candidate.title,description=candidate.description,priority=candidate.priority,status=candidate.status,due_date=candidate.due_date
 WHERE id=_action_id AND student_id=_student_id AND updated_at=_expected_updated_at RETURNING * INTO saved;
 IF NOT FOUND OR saved.id IS DISTINCT FROM _action_id OR saved.student_id IS DISTINCT FROM _student_id OR saved.updated_at<=_expected_updated_at
 OR (saved.title,saved.description,saved.priority,saved.status,saved.due_date)IS DISTINCT FROM(candidate.title,candidate.description,candidate.priority,candidate.status,candidate.due_date)
 OR (saved.pathway_report_id,saved.created_by_user_id,saved.assigned_to_user_id,saved.created_at)IS DISTINCT FROM(prior.pathway_report_id,prior.created_by_user_id,prior.assigned_to_user_id,prior.created_at)THEN
  RAISE EXCEPTION 'Action receipt could not be confirmed.' USING ERRCODE='55000';END IF;
 transition:=saved.status IN('complete','completed')AND prior.status NOT IN('complete','completed');
 IF transition THEN
  INSERT INTO public.feed_events(student_id,actor_id,kind,title,body,ref_table,ref_id)
  VALUES(_student_id,actor,'action_item.completed','Action completed: '||saved.title,NULL,'action_items',saved.id)RETURNING * INTO event;
  IF event.id IS NULL OR event.student_id IS DISTINCT FROM _student_id OR event.actor_id IS DISTINCT FROM actor OR event.ref_id IS DISTINCT FROM saved.id
  OR event.kind IS DISTINCT FROM 'action_item.completed' OR event.ref_table IS DISTINCT FROM 'action_items' THEN
   RAISE EXCEPTION 'Action activity could not be confirmed.' USING ERRCODE='55000';END IF;
  IF prior.pathway_report_id IS NOT NULL THEN
   UPDATE public.pathway_reports SET inputs_stale_at=greatest(coalesce(linked.inputs_stale_at,stamp),stamp)
   WHERE id=prior.pathway_report_id AND student_id=_student_id RETURNING * INTO linked;
   IF NOT FOUND OR linked.id IS DISTINCT FROM prior.pathway_report_id OR linked.student_id IS DISTINCT FROM _student_id OR linked.inputs_stale_at IS NULL OR linked.inputs_stale_at<stamp THEN
    RAISE EXCEPTION 'Linked report update could not be confirmed.' USING ERRCODE='55000';END IF;
  END IF;
 END IF;
 RETURN jsonb_build_object('schema','action-item-update-v1','actor_id',actor,'student_id',_student_id,'action_id',_action_id,
  'expected_updated_at',_expected_updated_at,'previous_status',prior.status,'changed',true,'row',to_jsonb(saved),'event_id',event.id,
  'stale_report_id',CASE WHEN transition THEN prior.pathway_report_id ELSE NULL END,'inputs_stale_at',CASE WHEN transition AND prior.pathway_report_id IS NOT NULL THEN linked.inputs_stale_at ELSE NULL END);
END;$action_update$;
REVOKE ALL ON FUNCTION public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.update_student_action_atomic(uuid,uuid,uuid,timestamptz,jsonb)TO authenticated;
COMMIT;
