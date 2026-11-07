-- The historical dedupe index is partial and contains an expression, so a
-- PostgREST column-only conflict target cannot infer it. Keep that index and
-- all existing table policies; insert the bounded batch in one caller-RLS
-- transaction with untargeted conflict handling. Existing rows are never updated.
BEGIN;

CREATE FUNCTION public.save_extracted_report_evidence(
  _student_id uuid,
  _source_kind text,
  _source_id uuid,
  _source_label text,
  _items jsonb
)
RETURNS TABLE(id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $evidence_save$
DECLARE
  actor uuid := auth.uid();
  item jsonb;
BEGIN
  IF actor IS NULL OR NOT coalesce(public.can_edit_student(actor, _student_id), false) THEN
    RAISE EXCEPTION 'You do not have permission to save evidence for this student.' USING ERRCODE = '42501';
  END IF;
  IF _source_label IS NULL OR btrim(_source_label) = '' OR char_length(_source_label) > 200 THEN
    RAISE EXCEPTION 'The evidence source label is not ready to save.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Evidence items must be a list.' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(_items) > 12 THEN
    RAISE EXCEPTION 'Save at most twelve evidence items at a time.' USING ERRCODE = '22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(_items) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR jsonb_typeof(item->'report_section') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item->'note') IS DISTINCT FROM 'string'
      OR jsonb_typeof(item->'snippet_hash') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'An evidence item is not ready to save.' USING ERRCODE = '22023';
    END IF;
    IF btrim(item->>'note') = '' OR char_length(item->>'note') > 2000
      OR (item->>'snippet_hash') !~ '^[0-9a-f]{32}$' THEN
      RAISE EXCEPTION 'An evidence item is not ready to save.' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  RETURN QUERY
    INSERT INTO public.report_evidence_links AS saved (
      student_id, report_section, source_kind, source_id, source_label,
      note, snippet_hash, created_by
    )
    SELECT _student_id, parsed.report_section, _source_kind, _source_id,
      btrim(_source_label), parsed.note, parsed.snippet_hash, actor
    FROM jsonb_to_recordset(_items) AS parsed(report_section text, note text, snippet_hash text)
    ON CONFLICT DO NOTHING
    RETURNING saved.id;
END;
$evidence_save$;

REVOKE ALL ON FUNCTION public.save_extracted_report_evidence(uuid,text,uuid,text,jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_extracted_report_evidence(uuid,text,uuid,text,jsonb) TO authenticated;
COMMENT ON FUNCTION public.save_extracted_report_evidence(uuid,text,uuid,text,jsonb)
  IS 'Atomically inserts at most twelve extracted items under existing caller RLS; duplicate sources/snippets are skipped without updating existing evidence.';

COMMIT;
