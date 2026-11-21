-- REVIEW-ONLY proposal39. No hosted installation or activation authority.
-- Hold current actor/student editing proof across upload reservation,
-- registration/recovery, and rescan begin/pending/result transactions.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $producer_authority_preflight$
DECLARE item record;caller text;relation_name text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR public.count_internal_combined_document_capacity(NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Pause and reconcile unfinished work before preparing producer access locks.' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.lock_internal_document_summary_authority(uuid,uuid,uuid)')
  AND proowner=current_user::regrole::oid AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog'] AND provolatile='v') THEN
  RAISE EXCEPTION 'Reviewed summary authority preparation is required.' USING ERRCODE='55000';END IF;
 FOR item IN SELECT * FROM (VALUES
  ('public.can_edit_student(uuid,uuid)','79b05b69377dd61a33938fe5ebb06fc7'),
  ('public.can_access_student(uuid,uuid)','c2dcc71ecab9bc4b982d7f81793da2aa'),
  ('public.is_partner_only(uuid)','47797991e8c4f44c7e8aa1bbcbc86b91'),
  ('public.can_view_document(uuid,uuid)','c983d959c1fae6d3b0311e0e059bdca2')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef AND proowner=current_user::regrole::oid
   AND proconfig=CASE WHEN item.signature='public.is_partner_only(uuid)' THEN ARRAY['search_path=pg_catalog, public'] ELSE ARRAY['search_path=public'] END) THEN
   RAISE EXCEPTION 'Exact canonical explicit-access helpers are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.students','public.student_collaborators','public.student_relationships','public.user_roles'] LOOP
  IF NOT has_table_privilege(current_user,relation_name,'SELECT') OR NOT has_table_privilege(current_user,relation_name,'UPDATE') OR row_security_active(relation_name::regclass) THEN RAISE EXCEPTION 'Trusted editing-proof visibility and locks are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
END;$producer_authority_preflight$;
CREATE FUNCTION public.lock_internal_document_producer_authority(_actor uuid,_student uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $summary_authority$
DECLARE s public.students%ROWTYPE;proof uuid;
BEGIN
 IF _actor IS NULL OR _student IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current student access could not be confirmed.' USING ERRCODE='42501';END IF;
 -- This namespace is shared with the reviewed role-change trigger. Collisions
 -- add contention only; they never create an editing proof.
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(_actor::text));
 SELECT * INTO s FROM public.students WHERE id=_student FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current student access could not be confirmed.' USING ERRCODE='42501';END IF;
 IF s.owner_id IS DISTINCT FROM _actor AND s.student_user_id IS DISTINCT FROM _actor THEN
  SELECT id INTO proof FROM public.student_collaborators WHERE student_id=_student AND user_id=_actor
   AND status='accepted' AND role='editor' ORDER BY id LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
   SELECT id INTO proof FROM public.student_relationships WHERE student_id=_student AND related_user_id=_actor
    AND consent_status='approved' AND permission_level IN('collaborate','manage_documents','manage_plan')
    ORDER BY id LIMIT 1 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Current student access could not be confirmed.' USING ERRCODE='42501';END IF;
  END IF;
 END IF;
 -- A fresh command snapshot after any proof/role wait checks current rules.
 -- Existing callers still enforce exact document/source/actor/capability checks.
 IF public.can_edit_student(_actor,_student) IS DISTINCT FROM true
  OR public.can_access_student(_actor,_student) IS DISTINCT FROM true
  OR public.is_partner_only(_actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current student access could not be confirmed.' USING ERRCODE='42501';END IF;
END;$summary_authority$;
REVOKE ALL ON FUNCTION public.lock_internal_document_producer_authority(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

DO $patch_producer_authority$
DECLARE item record;caller text;definition text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.assert_internal_document_rescan_source(uuid,uuid,text,timestamptz)','535eec88a7abb5695252922280c3d01b',false,false,' SELECT * INTO d FROM public.documents WHERE id=b.document_id;',' PERFORM public.lock_internal_document_producer_authority(b.actor_id,b.student_id);
'),
  ('public.guard_document_rescan_source_binding()','9cde41dda57eaaac0ac7aacb666e27a2',false,false,' -- Match the established attempt -> document -> object order.',' PERFORM public.lock_internal_document_producer_authority(NEW.actor_id,d.student_id);
'),
  ('public.guard_document_upload_registration()','ec1020d6a943332c2fb1716e4512adbc',true,false,'  -- Lock the attempt before any object-metadata lock taken by later triggers.','  PERFORM public.lock_internal_document_producer_authority(NEW.uploaded_by,NEW.student_id);
'),
  ('public.read_document_upload_registration(uuid,text)','8bed2c13998cb9749d5a793d14cec62a',true,true,'  SELECT * INTO doc FROM public.documents WHERE id=attempt.registered_document_id','  PERFORM public.lock_internal_document_producer_authority(actor,attempt.student_id);
'),
  ('public.reserve_document_upload(uuid,uuid,text,text)','dc8972ceac29738817b32b74ad411e1b',true,true,'  SELECT * INTO attempt FROM public.document_upload_attempts WHERE id=_attempt_id FOR UPDATE;','  PERFORM public.lock_internal_document_producer_authority(actor,_student_id);
')
 ) expected(signature,body_md5,definer,actor_exec,anchor,prefix) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND proowner=current_user::regrole::oid AND prosecdef=item.definer AND proconfig=ARRAY['search_path=pg_catalog'] AND provolatile='v') THEN
   RAISE EXCEPTION 'Exact reviewed producer boundary is required.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') IS DISTINCT FROM (caller='authenticated' AND item.actor_exec) THEN
    RAISE EXCEPTION 'Reviewed producer boundary permissions are required.' USING ERRCODE='55000';END IF;
  END LOOP;
  definition:=pg_get_functiondef(to_regprocedure(item.signature));
  IF position(item.anchor IN definition)=0 OR (length(definition)-length(replace(definition,item.anchor,'')))/length(item.anchor)<>1 THEN
   RAISE EXCEPTION 'Exact producer access insertion point is required.' USING ERRCODE='55000';END IF;
  EXECUTE replace(definition,item.anchor,item.prefix||item.anchor);
 END LOOP;
 PERFORM public.assert_internal_document_text_protocol();
END;$patch_producer_authority$;
COMMENT ON FUNCTION public.lock_internal_document_producer_authority(uuid,uuid) IS 'Private transaction-held editing proof only. No provider cessation, new grant, cleanup authority or hosted activation approval.';
COMMIT;
