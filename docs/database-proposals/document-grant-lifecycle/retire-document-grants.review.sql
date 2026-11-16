-- REVIEW ONLY: fifth separate permission draft. Not canonical; no ledger.
-- Requires the four preceding permission drafts and producer/role proof locks.
-- Intentionally retires ALL legacy unbound grants, retaining their rows.
-- No hosted installation without separately reviewed impact and authorization.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.students,public.student_collaborators,public.student_relationships,
 public.user_roles,public.documents,public.document_permissions IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
DECLARE item record;caller text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.enforce_document_permission_parent()','a67b5e446642485296597ab45ffe5646'),
  ('public.lock_internal_document_producer_authority(uuid,uuid)','e690e7381ac2fc648aad398aac81d8c6'),
  ('public.lock_document_text_role_change()','15b2fa145f63b5612ba71394d5b503dc')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature)
   AND md5(prosrc)=item.body_md5 AND NOT prosecdef AND provolatile='v'
   AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Exact reviewed access-proof/parent helpers are required.' USING ERRCODE='55000';END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,item.signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Access-proof helpers must remain private.' USING ERRCODE='55000';END IF;
  END LOOP;
 END LOOP;
 FOR item IN SELECT * FROM (VALUES
  ('public.can_edit_student(uuid,uuid)','79b05b69377dd61a33938fe5ebb06fc7'),
  ('public.can_access_student(uuid,uuid)','c2dcc71ecab9bc4b982d7f81793da2aa'),
  ('public.is_partner_only(uuid)','47797991e8c4f44c7e8aa1bbcbc86b91')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature) AND md5(prosrc)=item.body_md5
   AND prosecdef AND provolatile='s' AND proowner=current_user::regrole::oid
   AND proconfig=CASE WHEN item.signature='public.is_partner_only(uuid)' THEN ARRAY['search_path=pg_catalog, public'] ELSE ARRAY['search_path=public'] END) THEN
   RAISE EXCEPTION 'Exact canonical access predicates are required.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure('public.can_view_document(uuid,uuid)') AND prosecdef AND provolatile='s' AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=public'] AND md5(prosrc)='575a42ff79a948f356c92cf0eecb3a33')
 OR to_regprocedure('public.lock_internal_document_producer_authority(uuid,uuid)') IS NULL
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.user_roles'::regclass AND tgname='user_roles_document_text_authority' AND tgenabled='O' AND tgfoid='public.lock_document_text_role_change()'::regprocedure)
 OR EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='document_permissions' AND column_name='context_bound') THEN
  RAISE EXCEPTION 'Reviewed document grant lifecycle prerequisites are missing or changed.' USING ERRCODE='55000';
 END IF;
END;$baseline$;
ALTER TABLE public.document_permissions
 ADD COLUMN context_bound boolean NOT NULL DEFAULT false,
 ADD COLUMN retired_at timestamptz,
 ADD COLUMN retirement_reason text;
-- The parent trigger must allow a strictly attenuating retirement even for an
-- invalid legacy parent or a document that was reassigned. All other fields,
-- including student/document/recipient/issuer, remain identical.
DO $attenuation$
DECLARE original text;replacement text;definition text;
BEGIN
 SELECT prosrc,pg_get_functiondef(oid) INTO STRICT original,definition FROM pg_proc
 WHERE oid='public.enforce_document_permission_parent()'::regprocedure;
 IF position(' -- A grant cannot be moved' IN original)=0 THEN
  RAISE EXCEPTION 'Reviewed parent guard insertion point is missing.' USING ERRCODE='55000';END IF;
 replacement:=replace(original,' -- A grant cannot be moved',
 $patch$ IF TG_OP='UPDATE' AND OLD.retired_at IS NULL AND NEW.retired_at IS NOT NULL
 AND (to_jsonb(NEW)-ARRAY['updated_at','retired_at','retirement_reason'])
  = (to_jsonb(OLD)-ARRAY['updated_at','retired_at','retirement_reason']) THEN RETURN NEW;END IF;
 -- A grant cannot be moved$patch$);
 EXECUTE replace(definition,original,replacement);
END;$attenuation$;
UPDATE public.document_permissions SET retired_at=statement_timestamp(),retirement_reason='legacy_unbound';
ALTER TABLE public.document_permissions ADD CONSTRAINT document_grant_lifecycle_shape CHECK(
 (context_bound OR retired_at IS NOT NULL)
 AND ((retired_at IS NULL AND retirement_reason IS NULL) OR
 (retired_at IS NOT NULL AND retirement_reason IS NOT NULL AND retirement_reason IN('legacy_unbound','access_lost','document_reassigned'))));
DROP INDEX public.document_permissions_user_uniq;
CREATE UNIQUE INDEX document_permissions_user_uniq ON public.document_permissions(document_id,user_id)
 WHERE user_id IS NOT NULL AND retired_at IS NULL;

CREATE FUNCTION public.lock_internal_document_grant_recipient(_actor uuid,_student uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $recipient$
DECLARE s public.students%ROWTYPE;proof uuid;
BEGIN
 IF _actor IS NULL OR _student IS NULL OR current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.students WHERE id=_student FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 IF s.owner_id IS DISTINCT FROM _actor AND s.student_user_id IS DISTINCT FROM _actor THEN
  SELECT id INTO proof FROM public.student_collaborators WHERE student_id=_student AND user_id=_actor AND status='accepted' ORDER BY id LIMIT 1 FOR SHARE;
  IF NOT FOUND THEN
   SELECT id INTO proof FROM public.student_relationships WHERE student_id=_student AND related_user_id=_actor AND consent_status='approved' ORDER BY id LIMIT 1 FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
  END IF;
 END IF;
 IF public.can_access_student(_actor,_student) IS DISTINCT FROM true OR public.is_partner_only(_actor) IS DISTINCT FROM false THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
END;$recipient$;
REVOKE ALL ON FUNCTION public.lock_internal_document_grant_recipient(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guard_document_grant_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $guard$
DECLARE actor uuid;d public.documents%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-ARRAY['updated_at','retired_at','retirement_reason'])
   IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['updated_at','retired_at','retirement_reason'])
   OR (OLD.retired_at IS NOT NULL AND (NEW.retired_at IS DISTINCT FROM OLD.retired_at OR NEW.retirement_reason IS DISTINCT FROM OLD.retirement_reason))
   OR NEW.retired_at IS NULL THEN
   RAISE EXCEPTION 'Document grant history cannot be replaced or reopened.' USING ERRCODE='42501';END IF;
  RETURN NEW;
 END IF;
 IF NEW.granted_by IS DISTINCT FROM auth.uid() OR NEW.user_id IS NULL OR NEW.role_type IS NOT NULL OR NEW.permission_level::text<>'view_document' THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 -- Shared with the established exclusive role-change trigger. Sorted actor
 -- locks precede proof rows, and proof rows remain held until grant commit.
 FOR actor IN SELECT DISTINCT value FROM unnest(ARRAY[NEW.granted_by,NEW.user_id]) ids(value) ORDER BY value LOOP
  PERFORM pg_advisory_xact_lock_shared(824602,hashtext(actor::text));
 END LOOP;
 PERFORM public.lock_internal_document_producer_authority(NEW.granted_by,NEW.student_id);
 PERFORM public.lock_internal_document_grant_recipient(NEW.user_id,NEW.student_id);
 SELECT * INTO d FROM public.documents WHERE id=NEW.document_id FOR SHARE;
 IF NOT FOUND OR d.student_id IS DISTINCT FROM NEW.student_id OR d.archived_at IS NOT NULL OR d.deleted_at IS NOT NULL THEN
  RAISE EXCEPTION 'Current document access could not be confirmed.' USING ERRCODE='42501';END IF;
 NEW.context_bound:=true;NEW.retired_at:=NULL;NEW.retirement_reason:=NULL;
 RETURN NEW;
END;$guard$;
REVOKE ALL ON FUNCTION public.guard_document_grant_lifecycle() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_grant_lifecycle BEFORE INSERT OR UPDATE ON public.document_permissions
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_grant_lifecycle();

CREATE FUNCTION public.retire_internal_document_grants(_student uuid,_actor uuid,_document uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $retire$
DECLARE g public.document_permissions%ROWTYPE;reason text;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN
  RAISE EXCEPTION 'Document access changes require current snapshots.' USING ERRCODE='42501';END IF;
 -- Serialize on the grant BEFORE evaluating fresh current access. This runs
 -- on additions as well as removals: independent proof continuity is retained,
 -- while re-addition after an actual loss cannot reopen retired history.
 -- Never lock proof/role rows here: another remover may hold those rows.
 FOR g IN SELECT * FROM public.document_permissions p WHERE p.retired_at IS NULL
 AND (_student IS NULL OR p.student_id=_student)
 AND (_actor IS NULL OR p.user_id=_actor OR p.granted_by=_actor)
 AND (_document IS NULL OR p.document_id=_document) ORDER BY p.id FOR UPDATE LOOP
  reason:=NULL;
  IF _document IS NOT NULL THEN reason:='document_reassigned';
  ELSIF public.can_access_student(g.user_id,g.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(g.user_id) IS DISTINCT FROM false
   OR public.can_edit_student(g.granted_by,g.student_id) IS DISTINCT FROM true
   OR public.is_partner_only(g.granted_by) IS DISTINCT FROM false THEN reason:='access_lost';END IF;
  IF reason IS NOT NULL THEN UPDATE public.document_permissions SET retired_at=statement_timestamp(),retirement_reason=reason WHERE id=g.id AND retired_at IS NULL;END IF;
 END LOOP;
END;$retire$;
REVOKE ALL ON FUNCTION public.retire_internal_document_grants(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.retire_document_grants_after_access_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $change$
DECLARE old_row jsonb;new_row jsonb;item record;
BEGIN
 IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD);END IF;
 IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW);END IF;
 IF TG_TABLE_NAME='documents' THEN
  IF OLD.student_id IS DISTINCT FROM NEW.student_id THEN PERFORM public.retire_internal_document_grants(NULL,NULL,NEW.id);END IF;
 ELSIF TG_TABLE_NAME='students' THEN
  PERFORM public.retire_internal_document_grants(coalesce((new_row->>'id')::uuid,(old_row->>'id')::uuid),NULL);
 ELSE
  FOR item IN SELECT DISTINCT
    CASE WHEN TG_TABLE_NAME='user_roles' THEN NULL::uuid ELSE (r->>'student_id')::uuid END AS student,
    coalesce((r->>'user_id')::uuid,(r->>'related_user_id')::uuid) AS actor
    FROM unnest(ARRAY[old_row,new_row]) r WHERE r IS NOT NULL
    ORDER BY 1,2 LOOP
   PERFORM public.retire_internal_document_grants(item.student,item.actor);
  END LOOP;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END;$change$;
REVOKE ALL ON FUNCTION public.retire_document_grants_after_access_change() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER collaborator_document_grant_retirement AFTER INSERT OR UPDATE OR DELETE ON public.student_collaborators FOR EACH ROW EXECUTE FUNCTION public.retire_document_grants_after_access_change();
CREATE TRIGGER relationship_document_grant_retirement AFTER INSERT OR UPDATE OR DELETE ON public.student_relationships FOR EACH ROW EXECUTE FUNCTION public.retire_document_grants_after_access_change();
CREATE TRIGGER role_document_grant_retirement AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.retire_document_grants_after_access_change();
CREATE TRIGGER student_document_grant_retirement AFTER UPDATE OF owner_id,student_user_id ON public.students FOR EACH ROW EXECUTE FUNCTION public.retire_document_grants_after_access_change();
CREATE TRIGGER document_parent_grant_retirement AFTER UPDATE OF student_id ON public.documents FOR EACH ROW EXECUTE FUNCTION public.retire_document_grants_after_access_change();
CREATE POLICY document_active_grant_read ON public.document_permissions AS RESTRICTIVE FOR SELECT TO authenticated USING(context_bound AND retired_at IS NULL);
CREATE POLICY document_retired_grant_preservation ON public.document_permissions AS RESTRICTIVE FOR DELETE TO authenticated USING(context_bound AND retired_at IS NULL);
DO $view_boundary$
DECLARE original text;replacement text;definition text;
BEGIN
 SELECT prosrc,pg_get_functiondef(oid) INTO STRICT original,definition FROM pg_proc WHERE oid='public.can_view_document(uuid,uuid)'::regprocedure;
 replacement:=replace(original,'            AND p.role_type IS NULL',
 $patch$            AND p.context_bound AND p.retired_at IS NULL
            AND public.can_access_student(p.user_id,p.student_id)
            AND public.can_edit_student(p.granted_by,p.student_id)
            AND NOT public.is_partner_only(p.granted_by)
            AND p.role_type IS NULL$patch$);
 IF replacement=original THEN RAISE EXCEPTION 'Reviewed grant predicate insertion point is missing.' USING ERRCODE='55000';END IF;
 EXECUTE replace(definition,original,replacement);
END;$view_boundary$;
COMMIT;
