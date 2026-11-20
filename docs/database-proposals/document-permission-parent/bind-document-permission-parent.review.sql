-- REVIEW ONLY: separate from the225 canonical/41 control chain, the prior
-- admin-grant retirement review draft and the15-migration batch. No ledger.
-- No hosted installation without fresh authorization. No rows are deleted or
-- rewritten; invalid historical bindings become inert in the view predicate.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.documents IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.document_permissions IN SHARE ROW EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('public.document_permissions') AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass('public.documents') AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)') AND prosecdef AND provolatile='s' AND md5(prosrc)='c983d959c1fae6d3b0311e0e059bdca2')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.document_permissions') AND polname='document_permissions_insert' AND polcmd='a')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=pg_catalog.to_regclass('public.document_permissions') AND polname='document_permissions_update' AND polcmd='w')
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=pg_catalog.to_regclass('public.document_permissions') AND tgname='enforce_document_permission_parent')
 OR pg_catalog.to_regprocedure('public.enforce_document_permission_parent()') IS NOT NULL THEN
  RAISE EXCEPTION 'Reviewed document-permission baseline is missing or changed; stop for review.' USING ERRCODE='55000';
 END IF;
END;
$baseline$;
CREATE FUNCTION public.enforce_document_permission_parent()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $parent$
DECLARE actual_student uuid;
BEGIN
 -- A grant cannot be moved to retain authority over another document/student.
 IF TG_OP='UPDATE' AND (NEW.document_id IS DISTINCT FROM OLD.document_id
                       OR NEW.student_id IS DISTINCT FROM OLD.student_id) THEN
  RAISE EXCEPTION 'Document grant identity cannot be reassigned.' USING ERRCODE='42501';
 END IF;
 -- SHARE holds the actual parent stable through this write's transaction.
 -- Invoker/RLS access remains required; this helper confers no read privilege.
 SELECT d.student_id INTO actual_student FROM public.documents d
  WHERE d.id=NEW.document_id FOR SHARE;
 IF NOT FOUND OR actual_student IS DISTINCT FROM NEW.student_id THEN
  RAISE EXCEPTION 'Document grant does not match its student.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$parent$;
REVOKE ALL ON FUNCTION public.enforce_document_permission_parent() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER enforce_document_permission_parent
 BEFORE INSERT OR UPDATE ON public.document_permissions
 FOR EACH ROW EXECUTE FUNCTION public.enforce_document_permission_parent();
DO $replace_body$
DECLARE before_proc pg_catalog.pg_proc%ROWTYPE; after_proc pg_catalog.pg_proc%ROWTYPE;
 definition text; replacement text;
BEGIN
 SELECT * INTO STRICT before_proc FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure('public.can_view_document(uuid,uuid)');
 definition:=pg_catalog.pg_get_functiondef(before_proc.oid);
 replacement:=pg_catalog.replace(before_proc.prosrc,'WHERE p.document_id = d.id',E'WHERE p.document_id = d.id\n            AND p.student_id = d.student_id');
 IF pg_catalog.md5(replacement)<>'8aa18840923b32808d48f36d7a141657' OR pg_catalog.strpos(definition,before_proc.prosrc)=0 THEN
  RAISE EXCEPTION 'Reviewed document-view replacement does not match.' USING ERRCODE='55000';
 END IF;
 EXECUTE pg_catalog.replace(definition,before_proc.prosrc,replacement);
 SELECT * INTO STRICT after_proc FROM pg_catalog.pg_proc WHERE oid=before_proc.oid;
 IF after_proc.proowner IS DISTINCT FROM before_proc.proowner
 OR after_proc.proacl IS DISTINCT FROM before_proc.proacl
 OR after_proc.proconfig IS DISTINCT FROM before_proc.proconfig
 OR after_proc.prosecdef IS DISTINCT FROM before_proc.prosecdef
 OR after_proc.provolatile IS DISTINCT FROM before_proc.provolatile
 OR after_proc.prolang IS DISTINCT FROM before_proc.prolang
 OR after_proc.prosrc IS DISTINCT FROM replacement THEN
  RAISE EXCEPTION 'Document-view metadata changed outside reviewed body.' USING ERRCODE='55000';
 END IF;
END;
$replace_body$;
-- Existing function OID, owner, mode, search path and execution ACL are retained.
-- Existing table policies/ACL and all historical rows are retained. Correctly
-- bound summary/role grants keep their prior semantics; that privacy gate is
-- deliberately NOT closed by this parent-consistency correction.
COMMIT;
