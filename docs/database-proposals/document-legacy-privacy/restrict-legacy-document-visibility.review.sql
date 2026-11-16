-- REVIEW ONLY: sixth separate permission draft; no canonical/ledger entry.
-- Preserve legacy labels and data. No automatic promotion to team visibility.
-- Requires five preceding permission drafts and reviewed producer controls.
BEGIN;
SET LOCAL search_path=pg_catalog;
SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.documents,public.document_permissions,public.document_extractions,
 public.document_summaries,storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
DECLARE item record;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('public.can_view_document(uuid,uuid)','11c8b030778623060352f51e75cfc670'),
  ('public.read_reviewed_student_document_summaries(uuid,uuid,uuid,timestamptz,timestamptz)','ee191140a405e4959433e96845b8e90a'),
  ('public.storage_can_read_student_doc(uuid,text)','dd10685db5e204f9d88dc188ad2638d4')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(item.signature)
   AND md5(prosrc)=item.body_md5 AND prosecdef AND provolatile='s'
   AND proowner=current_user::regrole::oid) THEN
   RAISE EXCEPTION 'Exact reviewed document reader chain is required.' USING ERRCODE='55000';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_class WHERE oid IN('public.documents'::regclass,'storage.objects'::regclass,'public.document_permissions'::regclass) AND NOT relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.document_permissions'::regclass AND tgname='document_grant_lifecycle' AND tgenabled='O')
 OR to_regprocedure('public.document_visibility_allows(uuid,uuid)') IS NOT NULL THEN
  RAISE EXCEPTION 'Reviewed visibility prerequisites are missing or changed.' USING ERRCODE='55000';END IF;
END;$baseline$;
CREATE FUNCTION public.document_visibility_allows(_actor uuid,_document uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $visibility$
 SELECT EXISTS(SELECT 1 FROM public.documents d WHERE d.id=_document
 AND public.can_access_student(_actor,d.student_id) AND NOT public.is_partner_only(_actor)
 AND (d.visibility='team' OR d.uploaded_by=_actor OR EXISTS(
  SELECT 1 FROM public.document_permissions p WHERE p.document_id=d.id AND p.student_id=d.student_id
   AND p.context_bound AND p.retired_at IS NULL AND p.user_id=_actor AND p.role_type IS NULL
   AND p.permission_level::text='view_document'
   AND public.can_edit_student(p.granted_by,p.student_id) AND NOT public.is_partner_only(p.granted_by)
 )));
$visibility$;
REVOKE ALL ON FUNCTION public.document_visibility_allows(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $readers$
DECLARE item record;before_proc pg_proc%ROWTYPE;after_proc pg_proc%ROWTYPE;definition text;replacement text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
 ('public.can_view_document(uuid,uuid)','    WHERE d.id = _document_id',E'    WHERE d.id = _document_id\n      AND public.document_visibility_allows(_user_id,d.id)'),
 ('public.read_reviewed_student_document_summaries(uuid,uuid,uuid,timestamptz,timestamptz)','  WHERE d.student_id=_student_id AND',E'  WHERE public.document_visibility_allows(actor,d.id) AND d.student_id=_student_id AND')
 ) changes(signature,anchor,replacement) LOOP
  SELECT * INTO STRICT before_proc FROM pg_proc WHERE oid=to_regprocedure(item.signature);
  IF (length(before_proc.prosrc)-length(replace(before_proc.prosrc,item.anchor,'')))/length(item.anchor)<>1 THEN
   RAISE EXCEPTION 'Exact reader insertion point is required.' USING ERRCODE='55000';END IF;
  definition:=pg_get_functiondef(before_proc.oid);replacement:=replace(before_proc.prosrc,item.anchor,item.replacement);
  EXECUTE replace(definition,before_proc.prosrc,replacement);
  SELECT * INTO STRICT after_proc FROM pg_proc WHERE oid=before_proc.oid;
  -- PostgreSQL15 stores source locations inside the defaults parse tree.
  -- Compare the unchanged default expressions, not those parser offsets.
  IF (to_jsonb(after_proc)-ARRAY['prosrc','proargdefaults']) IS DISTINCT FROM (to_jsonb(before_proc)-ARRAY['prosrc','proargdefaults'])
   OR pg_get_expr(after_proc.proargdefaults,0) IS DISTINCT FROM pg_get_expr(before_proc.proargdefaults,0)
   OR after_proc.prosrc IS DISTINCT FROM replacement THEN
   RAISE EXCEPTION 'Reader metadata changed outside reviewed body.' USING ERRCODE='55000', DETAIL=(SELECT string_agg(key,',' ORDER BY key) FROM jsonb_each(to_jsonb(after_proc)) j WHERE j.value IS DISTINCT FROM to_jsonb(before_proc)->j.key AND j.key<>'prosrc');END IF;
 END LOOP;
END;$readers$;
-- New uploads already describe student-team access. Cached requests cannot
-- create misleading private/family/student labels through another writer.
CREATE POLICY document_team_only_new_upload ON public.documents AS RESTRICTIVE
 FOR INSERT TO anon,authenticated WITH CHECK(visibility='team');
CREATE POLICY document_visible_metadata_update ON public.documents AS RESTRICTIVE
 FOR UPDATE TO anon,authenticated USING(public.can_view_document(auth.uid(),id))
 WITH CHECK(public.can_view_document(auth.uid(),id));
CREATE FUNCTION public.guard_document_visibility_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $identity$
BEGIN
 IF NEW.visibility IS DISTINCT FROM OLD.visibility OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
 OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
  RAISE EXCEPTION 'Document sharing and ownership need a separately reviewed change.' USING ERRCODE='42501';END IF;
 RETURN NEW;
END;$identity$;
REVOKE ALL ON FUNCTION public.guard_document_visibility_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER document_visibility_identity BEFORE UPDATE ON public.documents
 FOR EACH ROW EXECUTE FUNCTION public.guard_document_visibility_identity();
-- Ordinary accounts have archive/review actions, not a raw hard-delete API.
-- Keep trusted cleanup authority separate. A future permissive policy cannot
-- restore this client path, even if DELETE privilege is accidentally re-added.
REVOKE DELETE ON public.documents FROM PUBLIC,anon,authenticated;
CREATE POLICY document_no_client_hard_delete ON public.documents AS RESTRICTIVE
 FOR DELETE TO anon,authenticated USING(false);
CREATE FUNCTION public.may_delete_unregistered_student_document(_path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog
AS $registered$
DECLARE parent uuid;actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL OR public.is_partner_only(actor) THEN RETURN false;END IF;
 BEGIN parent:=((storage.foldername(_path))[1])::uuid;EXCEPTION WHEN others THEN RETURN false;END;
 IF public.can_edit_student(actor,parent) IS DISTINCT FROM true THEN RETURN false;END IF;
 RETURN NOT EXISTS(SELECT 1 FROM public.documents WHERE storage_path=_path);
END; $registered$;
REVOKE ALL ON FUNCTION public.may_delete_unregistered_student_document(text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.may_delete_unregistered_student_document(text) TO anon,authenticated;
CREATE POLICY student_document_registered_delete_boundary ON storage.objects AS RESTRICTIVE
 FOR DELETE TO anon,authenticated USING(bucket_id IS DISTINCT FROM 'student-documents'
 OR public.may_delete_unregistered_student_document(name));
CREATE FUNCTION public.guard_registered_student_document_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $delete_guard$
BEGIN
 -- The row is locked before BEFORE DELETE runs. Use a fresh command snapshot
 -- after a competing registration's row-lock wait, not the earlier RLS snapshot.
 IF OLD.bucket_id='student-documents' AND current_user IN('anon','authenticated')
 AND public.may_delete_unregistered_student_document(OLD.name) IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Registered document files require trusted cleanup.' USING ERRCODE='42501';END IF;
 RETURN OLD;
END;$delete_guard$;
REVOKE ALL ON FUNCTION public.guard_registered_student_document_delete() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER student_document_registered_delete_guard BEFORE DELETE ON storage.objects
 FOR EACH ROW EXECUTE FUNCTION public.guard_registered_student_document_delete();
-- No existing row/label/object/grant is rewritten or deleted. Existing original,
-- quarantine, archive and child-row checks continue to apply. Bearer URLs and
-- copied data cannot be retroactively revoked by these policies.
COMMIT;
