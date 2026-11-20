-- Prepared source only: apply in isolated staging only after specific authorization.
-- Keep existing callers until database acceptance passes; then switch save AND
-- regenerate together. Do not fall back to separate writes after an RPC failure.
-- Production application requires a separately approved maintenance window.
BEGIN;

CREATE OR REPLACE FUNCTION public.save_pathway_report_content_atomic(
  _report_id uuid,
  _expected_content jsonb,
  _next_content jsonb,
  _change_summary text
) RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  owner_id uuid := auth.uid();
  current_content jsonb;
  next_version integer;
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Sign in before saving this report.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_expected_content) IS DISTINCT FROM 'object'
     OR jsonb_typeof(_next_content) IS DISTINCT FROM 'object'
     OR length(_change_summary) > 500 THEN
    RAISE EXCEPTION 'Invalid report save.' USING ERRCODE = '22023';
  END IF;

  -- Explicit owner scope AND caller RLS remain in force. Hold this lock until
  -- the surrounding RPC transaction commits or rolls back.
  SELECT r.content INTO current_content
  FROM public.pathway_reports AS r
  WHERE r.id = _report_id AND r.user_id = owner_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not available to save.' USING ERRCODE = '42501';
  END IF;

  -- Compare all observed content, including the write marker. This also catches
  -- a content writer that changed fields without updating section metadata.
  IF current_content IS DISTINCT FROM _expected_content THEN
    RAISE EXCEPTION 'This report changed. Reload it before trying again.' USING ERRCODE = '40001';
  END IF;

  SELECT COALESCE(MAX(v.version_number), 0) + 1 INTO next_version
  FROM public.pathway_report_versions AS v
  WHERE v.report_id = _report_id;

  INSERT INTO public.pathway_report_versions
    (report_id, version_number, content, change_summary, created_by)
  VALUES (_report_id, next_version, current_content,
          NULLIF(btrim(_change_summary), ''), owner_id);

  UPDATE public.pathway_reports AS r
  SET content = _next_content
  WHERE r.id = _report_id AND r.user_id = owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not save the report.' USING ERRCODE = '42501';
  END IF;
  RETURN next_version;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_pathway_report_content_atomic(uuid, jsonb, jsonb, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid, jsonb, jsonb, text)
  TO authenticated;

COMMENT ON FUNCTION public.save_pathway_report_content_atomic(uuid, jsonb, jsonb, text)
  IS 'Owner-scoped, RLS-preserving atomic report snapshot and content replacement; not an immutable audit log.';

COMMIT;
