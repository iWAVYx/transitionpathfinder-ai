-- Workstream B, Slice B2: idempotent backfill of the evidence graph.

-- 1) Uniqueness that makes the backfill re-runnable.
CREATE UNIQUE INDEX IF NOT EXISTS evidence_items_source_unique
  ON public.evidence_items (student_id, source_kind, source_id)
  WHERE source_id IS NOT NULL;

-- 2) Backfill from document_extractions.
--    One evidence_item per extraction. student_id, contributor, timestamp,
--    verification_state derived from the source row.
INSERT INTO public.evidence_items (
  student_id, kind, subject_type, subject_id,
  source_kind, source_id, contributor_id, occurred_at,
  confidence, verification_state, permission_scope, payload, extraction_id
)
SELECT
  de.student_id,
  'document_extraction'::text          AS kind,
  'document'::text                     AS subject_type,
  de.document_id                       AS subject_id,
  'document_extraction'::text          AS source_kind,
  de.id                                AS source_id,
  COALESCE(de.reviewer_id, de.created_by) AS contributor_id,
  COALESCE(de.reviewed_at, de.created_at) AS occurred_at,
  NULL::numeric                        AS confidence,
  CASE
    WHEN de.reviewed_at IS NOT NULL THEN 'human_confirmed'
    WHEN de.status::text = 'completed' THEN 'auto_high'
    ELSE 'unverified'
  END                                  AS verification_state,
  'student_team'::text                 AS permission_scope,
  jsonb_build_object(
    'doc_type', de.doc_type,
    'source_label', de.source_label,
    'has_sections', (de.sections IS NOT NULL),
    'missing_information', de.missing_information,
    'suggested_questions', de.suggested_questions
  )                                    AS payload,
  de.id                                AS extraction_id
FROM public.document_extractions de
WHERE de.student_id IS NOT NULL
ON CONFLICT (student_id, source_kind, source_id)
WHERE source_id IS NOT NULL
DO NOTHING;

-- 3) Backfill from report_evidence_links.
--    One evidence_item per link. The link's own source_kind/source_id
--    are preserved on the evidence_item; the report_section is stashed
--    in payload for later edge construction once a report_id is available.
INSERT INTO public.evidence_items (
  student_id, kind, subject_type, subject_id,
  source_kind, source_id, contributor_id, occurred_at,
  confidence, verification_state, permission_scope, payload, extraction_id
)
SELECT
  rel.student_id,
  'report_reference'::text             AS kind,
  'report_section'::text               AS subject_type,
  NULL::uuid                           AS subject_id,
  rel.source_kind,
  rel.source_id,
  rel.created_by,
  rel.created_at,
  NULL::numeric,
  'unverified'::text,
  'student_team'::text,
  jsonb_build_object(
    'report_section', rel.report_section,
    'source_label',   rel.source_label,
    'note',           rel.note,
    'snippet_hash',   rel.snippet_hash,
    'link_id',        rel.id
  ),
  NULL::uuid
FROM public.report_evidence_links rel
WHERE rel.student_id IS NOT NULL
  AND rel.source_id IS NOT NULL
ON CONFLICT (student_id, source_kind, source_id)
WHERE source_id IS NOT NULL
DO NOTHING;

-- 4) In-migration idempotency check: re-run both inserts and assert that
--    no new rows were produced. If this ever regresses, the migration
--    fails loudly rather than silently duplicating history.
DO $$
DECLARE
  before_count bigint;
  after_count  bigint;
BEGIN
  SELECT count(*) INTO before_count FROM public.evidence_items;

  INSERT INTO public.evidence_items (
    student_id, kind, subject_type, subject_id,
    source_kind, source_id, contributor_id, occurred_at,
    confidence, verification_state, permission_scope, payload, extraction_id
  )
  SELECT
    de.student_id, 'document_extraction', 'document', de.document_id,
    'document_extraction', de.id,
    COALESCE(de.reviewer_id, de.created_by),
    COALESCE(de.reviewed_at, de.created_at),
    NULL, 'auto_high', 'student_team',
    '{}'::jsonb, de.id
  FROM public.document_extractions de
  WHERE de.student_id IS NOT NULL
  ON CONFLICT (student_id, source_kind, source_id) WHERE source_id IS NOT NULL
  DO NOTHING;

  INSERT INTO public.evidence_items (
    student_id, kind, subject_type, subject_id,
    source_kind, source_id, contributor_id, occurred_at,
    confidence, verification_state, permission_scope, payload, extraction_id
  )
  SELECT
    rel.student_id, 'report_reference', 'report_section', NULL,
    rel.source_kind, rel.source_id, rel.created_by, rel.created_at,
    NULL, 'unverified', 'student_team',
    '{}'::jsonb, NULL
  FROM public.report_evidence_links rel
  WHERE rel.student_id IS NOT NULL AND rel.source_id IS NOT NULL
  ON CONFLICT (student_id, source_kind, source_id) WHERE source_id IS NOT NULL
  DO NOTHING;

  SELECT count(*) INTO after_count FROM public.evidence_items;

  IF after_count <> before_count THEN
    RAISE EXCEPTION 'Evidence backfill is not idempotent: before=% after=%',
      before_count, after_count;
  END IF;
END $$;