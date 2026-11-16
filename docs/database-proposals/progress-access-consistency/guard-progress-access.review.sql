-- REVIEW ONLY: eighth separate review draft, after the six document-permission
-- and atomic rights-review drafts. No canonical/ledger or hosted authority.
-- Existing progress rows are retained; new writes use current proof and versions.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.pathway_progress,public.goal_statuses,public.pathway_reports IN SHARE ROW EXCLUSIVE MODE;
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
 IF to_regprocedure('public.read_student_roadmap_progress(uuid,text,uuid)') IS NOT NULL
 OR (SELECT count(*) FROM pg_class WHERE oid IN('public.pathway_progress'::regclass,'public.goal_statuses'::regclass,'public.pathway_reports'::regclass)AND relrowsecurity)<>3
 OR to_regprocedure('public.lock_internal_document_producer_authority(uuid,uuid)') IS NULL
 OR to_regprocedure('public.lock_internal_document_grant_recipient(uuid,uuid)') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority' AND tgenabled='O' AND tgfoid='public.lock_document_text_role_change()'::regprocedure) THEN
  RAISE EXCEPTION 'Reviewed current-proof and progress tables are required.' USING ERRCODE='55000';END IF;
END;$baseline$;
CREATE FUNCTION public.guard_roadmap_progress_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $roadmap_guard$
DECLARE actor uuid:=auth.uid();stamp timestamptz:=clock_timestamp();
BEGIN
 IF actor IS NULL OR NEW.updated_by IS DISTINCT FROM actor THEN
  RAISE EXCEPTION 'Current roadmap editing access is required.' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.student_id IS DISTINCT FROM OLD.student_id
  OR NEW.pathway_id IS DISTINCT FROM OLD.pathway_id OR NEW.step_index IS DISTINCT FROM OLD.step_index OR NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
  RAISE EXCEPTION 'Progress identity cannot be reassigned.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,NEW.student_id);
 IF TG_OP='UPDATE' THEN stamp:=greatest(stamp,OLD.updated_at+interval '1 microsecond');ELSE NEW.created_at:=stamp;END IF;
 NEW.updated_at:=stamp;RETURN NEW;
END;$roadmap_guard$;
REVOKE ALL ON FUNCTION public.guard_roadmap_progress_write() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_roadmap_progress_write_guard BEFORE INSERT OR UPDATE ON public.pathway_progress
 FOR EACH ROW EXECUTE FUNCTION public.guard_roadmap_progress_write();
REVOKE INSERT,UPDATE,DELETE,TRUNCATE ON public.pathway_progress FROM PUBLIC,anon,authenticated;
CREATE POLICY roadmap_current_reader ON public.pathway_progress AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(public.can_access_student(auth.uid(),student_id)AND NOT public.is_partner_only(auth.uid()));
CREATE POLICY roadmap_no_raw_insert ON public.pathway_progress AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY roadmap_no_raw_update ON public.pathway_progress AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false)WITH CHECK(false);
CREATE POLICY roadmap_no_raw_delete ON public.pathway_progress AS RESTRICTIVE FOR DELETE TO anon,authenticated USING(false);
CREATE FUNCTION public.read_student_roadmap_progress(_student_id uuid,_pathway_id text,_expected_viewer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $roadmap_read$
DECLARE actor uuid:=auth.uid();rows jsonb;total bigint;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _pathway_id IS DISTINCT FROM 'transition-roadmap-v1'
  OR public.can_access_student(actor,_student_id)IS DISTINCT FROM true OR public.is_partner_only(actor)IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Saved roadmap could not be loaded.' USING ERRCODE='42501';END IF;
 SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('id',p.id,'student_id',p.student_id,'pathway_id',p.pathway_id,
  'step_index',p.step_index,'completed',p.completed,'note',p.note,'updated_at',p.updated_at)ORDER BY p.id),'[]'::jsonb)
 INTO total,rows FROM public.pathway_progress p WHERE p.student_id=_student_id AND p.pathway_id=_pathway_id;
 RETURN jsonb_build_object('schema','student-roadmap-read-v1','actor_id',actor,'student_id',_student_id,'pathway_id',_pathway_id,
  'can_edit',public.can_edit_student(actor,_student_id),'total',total,'progress',rows);
END;$roadmap_read$;
REVOKE ALL ON FUNCTION public.read_student_roadmap_progress(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_student_roadmap_progress(uuid,text,uuid) TO authenticated;
CREATE FUNCTION public.save_student_roadmap_progress(_student_id uuid,_pathway_id text,_expected_viewer_id uuid,_step_index integer,
 _completed boolean,_note text,_expected_row_id uuid,_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $roadmap_save$
DECLARE actor uuid:=auth.uid();saved public.pathway_progress%ROWTYPE;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _pathway_id IS DISTINCT FROM 'transition-roadmap-v1'
  OR _step_index IS NULL OR _step_index NOT IN(0,1,2,100,101,102,200,201,202,300,301,302) OR _completed IS NULL
  OR coalesce(length(_note),0)>1000 OR (_expected_row_id IS NULL)IS DISTINCT FROM(_expected_updated_at IS NULL) THEN
  RAISE EXCEPTION 'Roadmap update could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 IF _expected_row_id IS NULL THEN
  BEGIN
   INSERT INTO public.pathway_progress(student_id,pathway_id,step_index,completed,note,updated_by)
    VALUES(_student_id,_pathway_id,_step_index,_completed,_note,actor)RETURNING * INTO saved;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Saved progress changed; refresh it.' USING ERRCODE='40001';END;
 ELSE
  UPDATE public.pathway_progress SET completed=_completed,note=_note,updated_by=actor
   WHERE id=_expected_row_id AND student_id=_student_id AND pathway_id=_pathway_id AND step_index=_step_index
    AND updated_at=_expected_updated_at RETURNING * INTO saved;
  IF NOT FOUND OR saved.updated_at<=_expected_updated_at THEN RAISE EXCEPTION 'Saved progress changed; refresh it.' USING ERRCODE='40001';END IF;
 END IF;
 IF saved.id IS NULL OR saved.student_id IS DISTINCT FROM _student_id OR saved.pathway_id IS DISTINCT FROM _pathway_id
  OR saved.step_index IS DISTINCT FROM _step_index OR saved.completed IS DISTINCT FROM _completed
  OR saved.note IS DISTINCT FROM _note OR saved.updated_by IS DISTINCT FROM actor THEN
  RAISE EXCEPTION 'Roadmap receipt could not be confirmed.' USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','student-roadmap-save-v1','actor_id',actor,'student_id',_student_id,'pathway_id',_pathway_id,
  'step_index',_step_index,'row',jsonb_build_object('id',saved.id,'student_id',saved.student_id,'pathway_id',saved.pathway_id,
   'step_index',saved.step_index,'completed',saved.completed,'note',saved.note,'updated_at',saved.updated_at,'updated_by',saved.updated_by));
END;$roadmap_save$;
REVOKE ALL ON FUNCTION public.save_student_roadmap_progress(uuid,text,uuid,integer,boolean,text,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_student_roadmap_progress(uuid,text,uuid,integer,boolean,text,uuid,timestamptz) TO authenticated;
REVOKE TRUNCATE ON public.goal_statuses FROM PUBLIC,anon,authenticated;
-- These restrictive policies AND with the original broad own-row policies.
-- The later permissive policies alone did not replace those original rules.
CREATE POLICY goal_progress_current_read ON public.goal_statuses AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(user_id=auth.uid()AND NOT public.is_partner_only(auth.uid())AND EXISTS(SELECT 1 FROM public.pathway_reports r WHERE r.id=report_id AND public.can_access_student(auth.uid(),r.student_id)));
CREATE POLICY goal_progress_current_insert ON public.goal_statuses AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK(user_id=auth.uid()AND NOT public.is_partner_only(auth.uid())AND EXISTS(SELECT 1 FROM public.pathway_reports r WHERE r.id=report_id AND public.can_access_student(auth.uid(),r.student_id)));
CREATE POLICY goal_progress_current_update ON public.goal_statuses AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(user_id=auth.uid()AND NOT public.is_partner_only(auth.uid())AND EXISTS(SELECT 1 FROM public.pathway_reports r WHERE r.id=report_id AND public.can_access_student(auth.uid(),r.student_id)))
 WITH CHECK(user_id=auth.uid()AND NOT public.is_partner_only(auth.uid())AND EXISTS(SELECT 1 FROM public.pathway_reports r WHERE r.id=report_id AND public.can_access_student(auth.uid(),r.student_id)));
CREATE FUNCTION public.guard_goal_progress_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $goal_guard$
DECLARE actor uuid:=auth.uid();report public.pathway_reports%ROWTYPE;stamp timestamptz:=clock_timestamp();
BEGIN
 IF actor IS NULL OR NEW.user_id IS DISTINCT FROM actor OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current report progress access is required.' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE'AND(NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.report_id IS DISTINCT FROM OLD.report_id
  OR NEW.item_id IS DISTINCT FROM OLD.item_id OR NEW.created_at IS DISTINCT FROM OLD.created_at)THEN
  RAISE EXCEPTION 'Goal progress identity cannot be reassigned.' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 SELECT * INTO report FROM public.pathway_reports WHERE id=NEW.report_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current report progress access is required.' USING ERRCODE='42501';END IF;
 IF report.student_id IS NULL THEN
  IF report.user_id=actor THEN RAISE EXCEPTION 'Link the report to an accessible student.' USING ERRCODE='PT409';END IF;
  RAISE EXCEPTION 'Current report progress access is required.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_grant_recipient(actor,report.student_id);
 IF TG_OP='UPDATE'THEN stamp:=greatest(stamp,OLD.updated_at+interval '1 microsecond');ELSE NEW.created_at:=stamp;END IF;
 NEW.updated_at:=stamp;RETURN NEW;
END;$goal_guard$;
REVOKE ALL ON FUNCTION public.guard_goal_progress_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_goal_progress_identity_guard BEFORE INSERT OR UPDATE ON public.goal_statuses
 FOR EACH ROW EXECUTE FUNCTION public.guard_goal_progress_identity();
CREATE FUNCTION public.can_read_report_goal_progress(_report_id uuid,_expected_viewer_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $goal_access$
DECLARE actor uuid:=auth.uid();parent uuid;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR public.is_partner_only(actor)THEN RETURN false;END IF;
 SELECT student_id INTO parent FROM public.pathway_reports WHERE id=_report_id;
 IF NOT FOUND THEN RETURN false;END IF;
 IF parent IS NULL THEN RAISE EXCEPTION 'Link the report to an accessible student.' USING ERRCODE='PT409';END IF;
 RETURN public.can_access_student(actor,parent);
END;$goal_access$;
REVOKE ALL ON FUNCTION public.can_read_report_goal_progress(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_read_report_goal_progress(uuid,uuid) TO authenticated;
CREATE FUNCTION public.summarize_own_report_goal_progress(_report_ids uuid[],_expected_viewer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog
AS $goal_totals$
DECLARE actor uuid:=auth.uid();ids uuid[];eligible bigint;total bigint;in_progress bigint;met_count bigint;not_started bigint;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _report_ids IS NULL OR cardinality(_report_ids)>500
  OR array_position(_report_ids,NULL)IS NOT NULL OR public.is_partner_only(actor)THEN
  RAISE EXCEPTION 'Saved progress totals could not be loaded.' USING ERRCODE='42501';END IF;
 SELECT coalesce(array_agg(value ORDER BY value),'{}'::uuid[])INTO ids FROM(SELECT DISTINCT unnest(_report_ids)AS value)x;
 IF EXISTS(SELECT 1 FROM public.pathway_reports WHERE id=ANY(ids)AND student_id IS NULL)THEN
  RAISE EXCEPTION 'Link the reports to accessible students.' USING ERRCODE='PT409';END IF;
 SELECT count(*)INTO eligible FROM public.pathway_reports WHERE id=ANY(ids)AND public.can_access_student(actor,student_id);
 IF eligible<>cardinality(ids)THEN RAISE EXCEPTION 'Saved progress totals could not be loaded.' USING ERRCODE='42501';END IF;
 SELECT count(*),count(*)FILTER(WHERE status='in-progress'),count(*)FILTER(WHERE status='met'),count(*)FILTER(WHERE status='not-started')
 INTO total,in_progress,met_count,not_started FROM public.goal_statuses WHERE user_id=actor AND report_id=ANY(ids);
 RETURN jsonb_build_object('schema','goal-progress-totals-v1','actor_id',actor,'report_ids',to_jsonb(ids),'total',total,'inProgress',in_progress,'met',met_count,'notStarted',not_started);
END;$goal_totals$;
REVOKE ALL ON FUNCTION public.summarize_own_report_goal_progress(uuid[],uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.summarize_own_report_goal_progress(uuid[],uuid) TO authenticated;
-- Personal goal DELETE ownership is preserved; no student records or progress
-- are rewritten/deleted by installation. Existing unsupported rows remain for
-- target review, rather than being reset or silently relabelled.
COMMIT;
