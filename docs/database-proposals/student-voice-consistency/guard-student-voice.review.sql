-- REVIEW ONLY: ninth separate review draft. No canonical/ledger or hosted authority.
-- Preserve all old answers and the existing current-editor deletion policy.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.student_voice_responses IN SHARE ROW EXCLUSIVE MODE;
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
 IF to_regprocedure('public.read_student_voice_answers(uuid,uuid)') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.student_voice_responses'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority' AND tgenabled='O' AND tgfoid='public.lock_document_text_role_change()'::regprocedure) THEN
  RAISE EXCEPTION 'Reviewed student voice baseline is required.' USING ERRCODE='55000';END IF;
END;$baseline$;

CREATE FUNCTION public.guard_student_voice_answer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $voice_guard$
DECLARE actor uuid:=auth.uid();stamp timestamptz:=clock_timestamp();
BEGIN
 IF TG_OP='DELETE' THEN
  PERFORM public.lock_internal_document_producer_authority(actor,OLD.student_id);RETURN OLD;
 END IF;
 IF TG_OP='INSERT'AND NEW.created_by IS DISTINCT FROM actor THEN
  RAISE EXCEPTION 'Current student editing access is required.' USING ERRCODE='42501';END IF;
 IF TG_OP='UPDATE'AND(NEW.id IS DISTINCT FROM OLD.id OR NEW.student_id IS DISTINCT FROM OLD.student_id
  OR NEW.prompt_key IS DISTINCT FROM OLD.prompt_key OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at)THEN
  RAISE EXCEPTION 'Student answer identity cannot be reassigned.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,NEW.student_id);
 IF TG_OP='UPDATE'THEN stamp:=greatest(stamp,OLD.updated_at+interval '1 microsecond');ELSE NEW.created_at:=stamp;END IF;
 NEW.updated_at:=stamp;RETURN NEW;
END;$voice_guard$;
REVOKE ALL ON FUNCTION public.guard_student_voice_answer() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER zz_student_voice_answer_guard BEFORE INSERT OR UPDATE OR DELETE ON public.student_voice_responses
 FOR EACH ROW EXECUTE FUNCTION public.guard_student_voice_answer();
REVOKE INSERT,UPDATE,TRUNCATE ON public.student_voice_responses FROM PUBLIC,anon,authenticated;
CREATE POLICY voice_current_read ON public.student_voice_responses AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(public.can_access_student(auth.uid(),student_id)AND NOT public.is_partner_only(auth.uid()));
CREATE POLICY voice_no_raw_insert ON public.student_voice_responses AS RESTRICTIVE FOR INSERT TO anon,authenticated WITH CHECK(false);
CREATE POLICY voice_no_raw_update ON public.student_voice_responses AS RESTRICTIVE FOR UPDATE TO anon,authenticated USING(false)WITH CHECK(false);
CREATE POLICY voice_current_delete ON public.student_voice_responses AS RESTRICTIVE FOR DELETE TO anon,authenticated
 USING(public.can_edit_student(auth.uid(),student_id)AND NOT public.is_partner_only(auth.uid()));
CREATE FUNCTION public.read_student_voice_answers(_student_id uuid,_expected_viewer_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $voice_read$
DECLARE actor uuid:=auth.uid();answers jsonb;total bigint;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR public.can_access_student(actor,_student_id)IS DISTINCT FROM true
 OR public.is_partner_only(actor)IS DISTINCT FROM false THEN RAISE EXCEPTION 'Student answers could not be loaded.' USING ERRCODE='42501';END IF;
 SELECT count(*),coalesce(jsonb_agg(jsonb_build_object('id',v.id,'student_id',v.student_id,'prompt_key',v.prompt_key,
 'response_text',v.response_text,'age_band',v.age_band,'updated_at',v.updated_at)ORDER BY v.id),'[]'::jsonb)
 INTO total,answers FROM public.student_voice_responses v WHERE v.student_id=_student_id;
 RETURN jsonb_build_object('schema','student-voice-read-v1','actor_id',actor,'student_id',_student_id,'can_edit',public.can_edit_student(actor,_student_id),'total',total,'responses',answers);
END;$voice_read$;
REVOKE ALL ON FUNCTION public.read_student_voice_answers(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.read_student_voice_answers(uuid,uuid) TO authenticated;
CREATE FUNCTION public.save_student_voice_answer(_student_id uuid,_expected_viewer_id uuid,_prompt_key text,_response_text text,
 _age_band text,_expected_row_id uuid,_expected_updated_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $voice_save$
DECLARE actor uuid:=auth.uid();saved public.student_voice_responses%ROWTYPE;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM _expected_viewer_id OR _prompt_key IS NULL OR _prompt_key!~'^[a-z0-9_-]{1,64}$'
 OR _response_text IS NULL OR length(_response_text)>4000 OR _age_band IS NULL OR _age_band NOT IN('middle','early-high','late-high','post-secondary')
 OR NOT((_age_band='middle'AND _prompt_key IN('community','enjoy','hard','ms-enjoy','ms-hard','ms-hs-hopes','ms-hs-worries','ms-strengths','ms-support','strengths','support','voice-meeting'))
 OR (_age_band='early-high'AND _prompt_key IN('community','enjoy','future-learn','future-work','hard','strengths','support','voice-meeting'))
 OR (_age_band='late-high'AND _prompt_key IN('community','enjoy','future-learn','future-work','hard','living','strengths','support','voice-meeting'))
 OR (_age_band='post-secondary'AND _prompt_key IN('community','enjoy','future-learn','future-work','hard','living','strengths','support','voice-meeting')))
 OR (_expected_row_id IS NULL)IS DISTINCT FROM(_expected_updated_at IS NULL) THEN
  RAISE EXCEPTION 'Student answer could not be confirmed.' USING ERRCODE='42501';END IF;
 PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
 IF _expected_row_id IS NULL THEN
  BEGIN
   INSERT INTO public.student_voice_responses(student_id,prompt_key,response_text,age_band,created_by)
    VALUES(_student_id,_prompt_key,_response_text,_age_band,actor)RETURNING * INTO saved;
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'Saved answers changed; refresh them.' USING ERRCODE='40001';END;
 ELSE
  UPDATE public.student_voice_responses SET response_text=_response_text,age_band=_age_band
   WHERE id=_expected_row_id AND student_id=_student_id AND prompt_key=_prompt_key AND updated_at=_expected_updated_at RETURNING * INTO saved;
  IF NOT FOUND OR saved.updated_at<=_expected_updated_at THEN RAISE EXCEPTION 'Saved answers changed; refresh them.' USING ERRCODE='40001';END IF;
 END IF;
 IF saved.id IS NULL OR saved.student_id IS DISTINCT FROM _student_id OR saved.prompt_key IS DISTINCT FROM _prompt_key
 OR saved.response_text IS DISTINCT FROM _response_text OR saved.age_band IS DISTINCT FROM _age_band THEN
  RAISE EXCEPTION 'Student answer receipt could not be confirmed.' USING ERRCODE='55000';END IF;
 RETURN jsonb_build_object('schema','student-voice-save-v1','actor_id',actor,'student_id',_student_id,'row',jsonb_build_object(
 'id',saved.id,'student_id',saved.student_id,'prompt_key',saved.prompt_key,'response_text',saved.response_text,'age_band',saved.age_band,'updated_at',saved.updated_at));
END;$voice_save$;
REVOKE ALL ON FUNCTION public.save_student_voice_answer(uuid,uuid,text,text,text,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_student_voice_answer(uuid,uuid,text,text,text,uuid,timestamptz) TO authenticated;
COMMIT;
