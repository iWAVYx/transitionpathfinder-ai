-- REVIEW-ONLY PROPOSAL. Not canonical, not authorized for any hosted execution.
-- Preserve existing report RLS/editor access. Snapshot each SQL content UPDATE,
-- including direct writes; never treat caller-controlled settings as authority.
-- This does not make history immutable or repair stale browser intent.
BEGIN;
DO $preflight$
DECLARE t regclass; actor text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.pathway_reports'::regclass,'public.pathway_report_versions'::regclass] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid=t AND relrowsecurity
      AND NOT relforcerowsecurity AND relowner=current_user::regrole) THEN
      RAISE EXCEPTION 'Unexpected report history ownership or RLS; review required.';
    END IF;
  END LOOP;
  FOREACH actor IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=actor AND (rolsuper OR rolbypassrls))
      OR pg_has_role(actor,current_user,'USAGE') THEN
      RAISE EXCEPTION 'Unexpected privileged client role; review required.';
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid='public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)'::regprocedure
    AND NOT prosecdef AND proowner=current_user::regrole AND md5(prosrc)='f80313504d2ea967cabc32dbb55d3af3') THEN
    RAISE EXCEPTION 'Unexpected atomic report function; review required.';
  END IF;
  IF NOT has_function_privilege('authenticated','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE')
    OR has_function_privilege('anon','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE')
    OR has_function_privilege('service_role','public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected atomic report execution grants; review required.';
  END IF;
  IF has_table_privilege('authenticated','public.pathway_reports','TRIGGER')
    OR has_table_privilege('authenticated','public.pathway_report_versions','TRIGGER')
    OR has_table_privilege('authenticated','public.pathway_report_versions','TRUNCATE') THEN
    RAISE EXCEPTION 'Unexpected client trigger/truncate privileges; review required.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.pathway_reports'::regclass
    AND tgname='snapshot_report_content_update') THEN
    RAISE EXCEPTION 'History trigger already exists; review required.';
  END IF;
END;
$preflight$;

CREATE FUNCTION public.snapshot_report_content_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $snapshot$
DECLARE next_version integer; summary text;
BEGIN
  IF TG_OP <> 'UPDATE' OR TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME <> 'pathway_reports' THEN
    RAISE EXCEPTION 'Invalid report history context.' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(NEW.content) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid report content.' USING ERRCODE='22023';
  END IF;
  -- Row UPDATE already holds the report lock, serializing version allocation.
  summary := NULLIF(btrim(current_setting('transitionforward.report_history_summary',true)), '');
  IF length(summary)>500 THEN RAISE EXCEPTION 'Invalid report save.' USING ERRCODE='22023'; END IF;
  SELECT COALESCE(MAX(v.version_number),0)+1 INTO next_version
    FROM public.pathway_report_versions v WHERE v.report_id=OLD.id;
  INSERT INTO public.pathway_report_versions(report_id,version_number,content,change_summary,created_by)
    VALUES(OLD.id,next_version,OLD.content,summary,auth.uid());
  RETURN NULL;
END;
$snapshot$;
REVOKE ALL ON FUNCTION public.snapshot_report_content_update() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER snapshot_report_content_update AFTER UPDATE OF content ON public.pathway_reports
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_report_content_update();

-- Revoke both table and column grants; retained RLS is not an INSERT boundary.
REVOKE INSERT,UPDATE,DELETE ON public.pathway_report_versions FROM PUBLIC,anon,authenticated;
DO $columns$
DECLARE c record;
BEGIN
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.pathway_report_versions'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT (%I), UPDATE (%I) ON public.pathway_report_versions FROM PUBLIC,anon,authenticated',c.attname,c.attname);
  IF has_column_privilege('authenticated','public.pathway_report_versions',c.attname,'INSERT')
    OR has_column_privilege('authenticated','public.pathway_report_versions',c.attname,'UPDATE') THEN
    RAISE EXCEPTION 'Inherited report history write privileges remain; review required.';
  END IF;
 END LOOP;
 IF has_table_privilege('authenticated','public.pathway_report_versions','DELETE') THEN
  RAISE EXCEPTION 'Inherited report history delete privileges remain; review required.';
 END IF;
END;
$columns$;

CREATE OR REPLACE FUNCTION public.save_pathway_report_content_atomic(
 _report_id uuid,_expected_content jsonb,_next_content jsonb,_change_summary text
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $function$
DECLARE owner_id uuid:=auth.uid(); current_content jsonb; next_version integer; previous_summary text;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Sign in before saving this report.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(_expected_content) IS DISTINCT FROM 'object' OR jsonb_typeof(_next_content) IS DISTINCT FROM 'object'
   OR length(_change_summary)>500 THEN RAISE EXCEPTION 'Invalid report save.' USING ERRCODE='22023'; END IF;
 SELECT r.content INTO current_content FROM public.pathway_reports r
   WHERE r.id=_report_id AND r.user_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not available to save.' USING ERRCODE='42501'; END IF;
 IF current_content IS DISTINCT FROM _expected_content THEN
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
REVOKE ALL ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO authenticated;
COMMENT ON FUNCTION public.snapshot_report_content_update() IS 'Review-only trigger: prior-content history for permitted SQL UPDATEs; not immutable audit storage.';
COMMIT;
