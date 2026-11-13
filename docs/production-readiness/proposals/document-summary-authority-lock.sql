-- REVIEW-ONLY proposal38. No hosted installation/activation authority.
-- Preserve current summary source/claim/receipt semantics; hold the actual
-- actor role and one accepted student editing proof until transaction end.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
DO $summary_authority_preflight$
DECLARE relation_name text;item record;caller text;
BEGIN
 PERFORM public.lock_internal_document_capacity_completion();
 PERFORM public.assert_internal_document_text_protocol();
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused)
  OR public.count_internal_combined_document_capacity(NULL,NULL)<>0 THEN
  RAISE EXCEPTION 'Pause and reconcile unfinished work before preparing summary authority locks.' USING ERRCODE='55000';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.read_verified_document_summary_source(uuid,timestamptz,integer)'::regprocedure
  AND md5(prosrc)='6beb7e73b75e358ff530c8316650c1e5' AND prosecdef AND proowner=current_user::regrole::oid
  AND proconfig=ARRAY['search_path=pg_catalog'] AND provolatile='v')
  OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.lock_document_text_role_change()'::regprocedure
   AND md5(prosrc)='15b2fa145f63b5612ba71394d5b503dc' AND proowner=current_user::regrole::oid AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog'])
  OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority'
   AND tgfoid='public.lock_document_text_role_change()'::regprocedure AND tgtype=31 AND tgenabled='O' AND NOT tgisinternal) THEN
  RAISE EXCEPTION 'Exact summary reader and actor-role serialization are required.' USING ERRCODE='55000';END IF;
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
 FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(caller,'public.read_verified_document_summary_source(uuid,timestamptz,integer)','EXECUTE') IS DISTINCT FROM (caller='service_role') THEN
   RAISE EXCEPTION 'Reviewed service-only summary reader permissions are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOREACH relation_name IN ARRAY ARRAY['public.students','public.student_collaborators','public.student_relationships','public.user_roles'] LOOP
  IF NOT has_table_privilege(current_user,relation_name,'SELECT') OR NOT has_table_privilege(current_user,relation_name,'UPDATE')
   OR row_security_active(relation_name::regclass) THEN
   RAISE EXCEPTION 'Trusted current access-proof visibility and locks are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
END;$summary_authority_preflight$;

CREATE FUNCTION public.lock_internal_document_summary_authority(_actor uuid,_student uuid,_document uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $summary_authority$
DECLARE s public.students%ROWTYPE;proof uuid;
BEGIN
 IF _actor IS NULL OR _student IS NULL OR _document IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 -- This namespace is shared with the reviewed role-change trigger. Collisions
 -- add contention only; they never create an editing proof.
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(_actor::text));
 SELECT * INTO s FROM public.students WHERE id=_student FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 IF s.owner_id IS DISTINCT FROM _actor AND s.student_user_id IS DISTINCT FROM _actor THEN
  SELECT id INTO proof FROM public.student_collaborators WHERE student_id=_student AND user_id=_actor
   AND status='accepted' AND role='editor' ORDER BY id LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
   SELECT id INTO proof FROM public.student_relationships WHERE student_id=_student AND related_user_id=_actor
    AND consent_status='approved' AND permission_level IN('collaborate','manage_documents','manage_plan')
    ORDER BY id LIMIT 1 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
  END IF;
 END IF;
 -- A fresh command snapshot after any proof/role wait uses the canonical
 -- current rules. An explicit document permission cannot replace student access.
 IF public.can_edit_student(_actor,_student) IS DISTINCT FROM true
  OR public.can_access_student(_actor,_student) IS DISTINCT FROM true
  OR public.is_partner_only(_actor) IS DISTINCT FROM false
  OR public.can_view_document(_actor,_document) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
END;$summary_authority$;
REVOKE ALL ON FUNCTION public.lock_internal_document_summary_authority(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

DO $patch_summary_authority$
DECLARE definition text;anchor text;replacement text;
BEGIN
 definition:=pg_get_functiondef('public.read_verified_document_summary_source(uuid,timestamptz,integer)'::regprocedure);
 anchor:='  IF NOT FOUND OR public.is_partner_only(j.triggered_by_user_id) IS DISTINCT FROM false';
 replacement:=$summary_patch$  IF NOT FOUND THEN
    RAISE EXCEPTION 'The document summary source could not be verified.' USING ERRCODE='42501';
  END IF;
  PERFORM public.lock_internal_document_summary_authority(j.triggered_by_user_id,d.student_id,d.id);
  IF public.is_partner_only(j.triggered_by_user_id) IS DISTINCT FROM false$summary_patch$;
 IF position(anchor IN definition)=0 OR (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 THEN
  RAISE EXCEPTION 'Exact summary source authority boundary is required.' USING ERRCODE='55000';END IF;
 EXECUTE replace(definition,anchor,replacement);
 PERFORM public.assert_internal_document_text_protocol();
END;$patch_summary_authority$;
COMMENT ON FUNCTION public.lock_internal_document_summary_authority(uuid,uuid,uuid) IS 'Private summary-source transaction locks only. No provider cancellation, processing admission, new grant or hosted activation authority.';
COMMIT;
