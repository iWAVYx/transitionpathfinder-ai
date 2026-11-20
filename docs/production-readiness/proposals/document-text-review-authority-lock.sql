-- REVIEW PROPOSAL ONLY; not a hosted installation recipe.
-- Locks one current editing proof for the reviewed atomic text-save RPC.
-- Does not fence other/raw/cached-old writers, admit generation or cancel AI.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $text_authority_preflight$
DECLARE item record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'::regprocedure
  AND md5(prosrc)='9848c61fddafcd67189f2e221b022abf' AND NOT prosecdef AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
  RAISE EXCEPTION 'Exact reviewed invoker text save is required.' USING ERRCODE='55000';END IF;
 FOR item IN SELECT * FROM (VALUES
  ('public.can_edit_student(uuid,uuid)','79b05b69377dd61a33938fe5ebb06fc7'),
  ('public.can_access_student(uuid,uuid)','c2dcc71ecab9bc4b982d7f81793da2aa'),
  ('public.is_partner_only(uuid)','47797991e8c4f44c7e8aa1bbcbc86b91'),
  ('public.can_view_document(uuid,uuid)','c983d959c1fae6d3b0311e0e059bdca2')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5 AND prosecdef AND proowner=current_user::regrole::oid AND proconfig=CASE WHEN item.signature='public.is_partner_only(uuid)' THEN ARRAY['search_path=pg_catalog, public'] ELSE ARRAY['search_path=public'] END) THEN
   RAISE EXCEPTION 'Exact explicit student access helpers are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 FOR item IN SELECT unnest(ARRAY['public.students','public.student_collaborators','public.student_relationships','public.user_roles']) AS relation_name LOOP
  IF NOT has_table_privilege(current_user,item.relation_name,'SELECT') OR NOT has_table_privilege(current_user,item.relation_name,'UPDATE') OR row_security_active(item.relation_name::regclass) THEN
   RAISE EXCEPTION 'Trusted access-proof row visibility and locks are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Pause processing before preparing access-proof locks.' USING ERRCODE='55000';END IF;
 LOCK TABLE public.user_roles IN SHARE ROW EXCLUSIVE MODE;
END; $text_authority_preflight$;

CREATE FUNCTION public.lock_document_text_review_authority(_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $text_authority$
DECLARE actor uuid:=auth.uid();s public.students%ROWTYPE;proof uuid;
BEGIN
 IF actor IS NULL OR _student_id IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 -- Hash collisions only add contention; they cannot create an access proof.
 PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 IF public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.students WHERE id=_student_id FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
 IF s.owner_id IS DISTINCT FROM actor AND s.student_user_id IS DISTINCT FROM actor THEN
  SELECT id INTO proof FROM public.student_collaborators
   WHERE student_id=_student_id AND user_id=actor AND status='accepted' AND role='editor'
   ORDER BY id LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
   SELECT id INTO proof FROM public.student_relationships
    WHERE student_id=_student_id AND related_user_id=actor AND consent_status='approved'
     AND permission_level IN('collaborate','manage_documents','manage_plan')
    ORDER BY id LIMIT 1 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
  END IF;
 END IF;
 -- A fresh command snapshot after any row/role lock wait checks current rules.
 IF public.can_edit_student(actor,_student_id) IS DISTINCT FROM true
  OR public.can_access_student(actor,_student_id) IS DISTINCT FROM true
  OR public.is_partner_only(actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current editing access could not be confirmed.' USING ERRCODE='42501';END IF;
END; $text_authority$;
REVOKE ALL ON FUNCTION public.lock_document_text_review_authority(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.lock_document_text_review_authority(uuid) TO authenticated;

CREATE FUNCTION public.lock_document_text_role_change()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $text_role_change$
DECLARE actor uuid;old_actor uuid;new_actor uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_actor:=OLD.user_id;END IF;
 IF TG_OP<>'DELETE' THEN new_actor:=NEW.user_id;END IF;
 FOR actor IN SELECT DISTINCT value FROM unnest(ARRAY[old_actor,new_actor]) AS ids(value) WHERE value IS NOT NULL ORDER BY value LOOP
  PERFORM pg_advisory_xact_lock(824602,hashtext(actor::text));
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END; $text_role_change$;
REVOKE ALL ON FUNCTION public.lock_document_text_role_change() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER user_roles_document_text_authority
 BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
 FOR EACH ROW EXECUTE FUNCTION public.lock_document_text_role_change();

DO $patch_text_save$
DECLARE signature regprocedure:='public.save_document_text_review(uuid,uuid,uuid,timestamptz,timestamptz,text,jsonb,jsonb)'::regprocedure;definition text;
BEGIN
 definition:=pg_get_functiondef(signature);
 IF position(' UPDATE public.document_extractions SET raw_extract=_raw_extract' IN definition)=0 THEN
  RAISE EXCEPTION 'The reviewed save insertion point is required.' USING ERRCODE='55000';END IF;
 definition:=replace(definition,' UPDATE public.document_extractions SET raw_extract=_raw_extract',
  ' PERFORM public.lock_document_text_review_authority(_student_id);'||chr(10)||' UPDATE public.document_extractions SET raw_extract=_raw_extract');
 EXECUTE definition;
END; $patch_text_save$;
COMMENT ON FUNCTION public.lock_document_text_review_authority(uuid) IS 'Caller-scoped editing proof locks only; no private rows returned, provider admission or hosted activation approval.';
COMMIT;
