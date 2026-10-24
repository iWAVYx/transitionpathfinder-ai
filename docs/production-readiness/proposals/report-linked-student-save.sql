-- LOCAL PROPOSAL ONLY. Not a canonical migration or authorization to run hosted SQL.
-- Caller switch, canonical replay, migration ledger and release window need review.
-- Retire the four-argument caller atomically; do not keep a context-free fallback.
BEGIN;
DO $preflight$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)'::regprocedure
  AND NOT prosecdef AND proconfig=ARRAY['search_path=pg_catalog']
  AND proowner=current_user::regrole AND md5(prosrc)='1da92cf69d03dc9ece6597b503a9383a')
  OR NOT has_function_privilege('authenticated','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE')
  OR has_function_privilege('anon','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE')
  OR has_function_privilege('service_role','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Unexpected content-save prerequisite; review required.';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.pathway_reports'::regclass
  AND tgname='snapshot_report_content_update' AND NOT tgisinternal AND tgenabled='O'
  AND tgfoid='public.snapshot_report_content_update()'::regprocedure AND tgtype=17
  AND tgattr::text=(SELECT attnum::text FROM pg_attribute WHERE attrelid='public.pathway_reports'::regclass AND attname='content'))
  OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN('public.pathway_reports'::regclass,'public.pathway_report_versions'::regclass)
   AND (NOT relrowsecurity OR relforcerowsecurity OR relowner<>current_user::regrole
    OR pg_has_role('authenticated',relowner,'USAGE') OR pg_has_role('anon',relowner,'USAGE')))
  OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN('anon','authenticated') AND (rolsuper OR rolbypassrls)) THEN
  RAISE EXCEPTION 'Unexpected report history boundary; review required.';
 END IF;
END;
$preflight$;
CREATE FUNCTION public.save_pathway_report_content_for_student(
 _report_id uuid,_expected_student_id uuid,_expected_content jsonb,_next_content jsonb,_change_summary text
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $function$
DECLARE owner_id uuid:=auth.uid(); current_content jsonb; current_student uuid; next_version integer; previous_summary text;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Sign in before saving this report.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_expected_content) IS DISTINCT FROM 'object' OR jsonb_typeof(_next_content) IS DISTINCT FROM 'object'
   OR length(_change_summary)>500 THEN RAISE EXCEPTION 'Invalid report save.' USING ERRCODE='22023'; END IF;
 SELECT r.content,r.student_id INTO current_content,current_student FROM public.pathway_reports r
   WHERE r.id=_report_id AND r.user_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not available to save.' USING ERRCODE='42501'; END IF;
 IF current_content IS DISTINCT FROM _expected_content OR current_student IS DISTINCT FROM _expected_student_id THEN
   RAISE EXCEPTION 'This report changed. Reload it before trying again.' USING ERRCODE='40001';
 END IF;
 previous_summary:=current_setting('transitionforward.report_history_summary',true);
 PERFORM set_config('transitionforward.report_history_summary',COALESCE(_change_summary,''),true);
 UPDATE public.pathway_reports r SET content=_next_content WHERE r.id=_report_id AND r.user_id=owner_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Could not save the report.' USING ERRCODE='42501'; END IF;
 PERFORM set_config('transitionforward.report_history_summary',COALESCE(previous_summary,''),true);
 SELECT MAX(v.version_number) INTO next_version FROM public.pathway_report_versions v WHERE v.report_id=_report_id;
 IF next_version IS NULL THEN RAISE EXCEPTION 'Could not confirm report history.' USING ERRCODE='42501'; END IF;
 RETURN next_version;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text) TO authenticated;
REVOKE ALL ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
DO $verify$
DECLARE actor text;
BEGIN
 FOREACH actor IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
  IF has_function_privilege(actor,'public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE') THEN
   RAISE EXCEPTION 'Context-free save execution remains; review required.';
  END IF;
  IF has_function_privilege(actor,'public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)','EXECUTE') IS DISTINCT FROM (actor='authenticated') THEN
   RAISE EXCEPTION 'Unexpected context-save execution; review required.';
  END IF;
 END LOOP;
END;
$verify$;
COMMENT ON FUNCTION public.save_pathway_report_content_for_student(uuid,uuid,jsonb,jsonb,text)
 IS 'Owner/RLS-preserving content and linked-student comparison under one row lock; prior-content history remains trigger-owned.';
COMMIT;
