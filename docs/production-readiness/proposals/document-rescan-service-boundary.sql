-- DRAFT REVIEW PROPOSAL ONLY. Not canonical, installed, or approved for rollout.
-- Workstream1.1: narrow service interfaces to existing source-bound operations.
-- Application integration, producer release, final preflight and native tests remain open.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $preflight$
DECLARE dependency record; caller text; relation_name text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.document_operation_control WHERE singleton AND paused) THEN
  RAISE EXCEPTION 'Document processing must be paused before boundary installation';
 END IF;
 FOREACH relation_name IN ARRAY ARRAY['public.document_rescan_source_bindings','public.document_rescan_pending_receipts','public.document_rescan_outcome_receipts','public.document_capacity_reservations'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(relation_name)
   AND relowner=current_user::regrole::oid AND relrowsecurity) THEN
   RAISE EXCEPTION 'Reviewed private rescan table ownership and RLS required';
  END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_table_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(caller,relation_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
    RAISE EXCEPTION 'Private rescan table grants must remain private';
   END IF;
  END LOOP;
 END LOOP;
 FOR dependency IN SELECT * FROM (VALUES
  ('public.begin_internal_document_rescan(uuid,uuid,uuid,timestamptz,jsonb)','5813809f271e1b2b94af7ffa0b11ffd4'),
  ('public.mark_internal_document_rescan_pending(uuid,uuid,uuid,text)','57f36c2761a64969624bc597a38f8b31'),
  ('public.persist_internal_document_rescan_result(uuid,uuid,uuid,jsonb)','d1c35df9ea20a3416f3fbc2b93e881b5')
 ) expected(signature,body_md5) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(dependency.signature)
   AND md5(prosrc)=dependency.body_md5 AND NOT prosecdef
   AND proowner=current_user::regrole::oid AND proconfig=ARRAY['search_path=pg_catalog']) THEN
   RAISE EXCEPTION 'Reviewed private rescan dependency required';
  END IF;
  FOREACH caller IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
   IF has_function_privilege(caller,dependency.signature,'EXECUTE') THEN
    RAISE EXCEPTION 'Private rescan helper must remain private';
   END IF;
  END LOOP;
 END LOOP;
END; $preflight$;
CREATE FUNCTION public.begin_bound_document_rescan(_operation_id uuid,_actor_id uuid,_document_id uuid,_expected_revision timestamptz,_source jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $boundary$
BEGIN
 -- Service execution is narrowly granted; the private helper rechecks exact
 -- actor/student/source/capability and performs its atomic guarded transition.
 RETURN public.begin_internal_document_rescan(_operation_id,_actor_id,_document_id,_expected_revision,_source);
END; $boundary$;
REVOKE ALL ON FUNCTION public.begin_bound_document_rescan(uuid,uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.begin_bound_document_rescan(uuid,uuid,uuid,timestamptz,jsonb) TO service_role;
CREATE FUNCTION public.mark_bound_document_rescan_pending(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_observed_content_sha256 text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $boundary$
BEGIN
 -- Service execution is narrowly granted; the private helper rechecks exact
 -- actor/student/source/capability and performs its atomic guarded transition.
 RETURN public.mark_internal_document_rescan_pending(_operation_id,_actor_id,_receipt_id,_observed_content_sha256);
END; $boundary$;
REVOKE ALL ON FUNCTION public.mark_bound_document_rescan_pending(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.mark_bound_document_rescan_pending(uuid,uuid,uuid,text) TO service_role;
CREATE FUNCTION public.persist_bound_document_rescan_result(_operation_id uuid,_actor_id uuid,_receipt_id uuid,_scan jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $boundary$
BEGIN
 -- Service execution is narrowly granted; the private helper rechecks exact
 -- actor/student/source/capability and performs its atomic guarded transition.
 RETURN public.persist_internal_document_rescan_result(_operation_id,_actor_id,_receipt_id,_scan);
END; $boundary$;
REVOKE ALL ON FUNCTION public.persist_bound_document_rescan_result(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.persist_bound_document_rescan_result(uuid,uuid,uuid,jsonb) TO service_role;
COMMIT;
