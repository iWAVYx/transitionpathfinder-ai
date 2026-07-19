-- Workstream B, Slice B3: read-side views for the evidence graph.
-- Both views use security_invoker so RLS on the underlying tables applies
-- to the caller. GRANT SELECT to authenticated; no anon access.

CREATE OR REPLACE VIEW public.student_evidence_v1
WITH (security_invoker = on) AS
SELECT
  ei.id                    AS evidence_id,
  ei.student_id,
  ei.kind,
  ei.subject_type,
  ei.subject_id,
  ei.source_kind,
  ei.source_id,
  ei.contributor_id,
  ei.occurred_at,
  ei.confidence,
  ei.verification_state,
  ei.permission_scope,
  ei.payload,
  ei.extraction_id,
  ei.created_at,
  ei.updated_at,
  COALESCE(edge_agg.edge_count, 0)   AS edge_count,
  edge_agg.relations                  AS relations
FROM public.evidence_items ei
LEFT JOIN LATERAL (
  SELECT
    count(*)::int                                       AS edge_count,
    array_agg(DISTINCT ee.relation ORDER BY ee.relation) AS relations
  FROM public.evidence_edges ee
  WHERE ee.from_type = 'evidence_item'
    AND ee.from_id   = ei.id
) edge_agg ON true;

GRANT SELECT ON public.student_evidence_v1 TO authenticated;

CREATE OR REPLACE VIEW public.recommendation_provenance_v1
WITH (security_invoker = on) AS
SELECT
  ee.to_id                         AS recommendation_id,
  ei.student_id,
  ee.id                            AS edge_id,
  ee.relation,
  ei.id                            AS evidence_id,
  ei.kind                          AS evidence_kind,
  ei.source_kind,
  ei.source_id,
  ei.verification_state,
  ei.confidence,
  ei.occurred_at,
  ei.payload                       AS evidence_payload,
  ee.created_at                    AS edge_created_at,
  ee.created_by                    AS edge_created_by
FROM public.evidence_edges ee
JOIN public.evidence_items ei
  ON ei.id = ee.from_id
WHERE ee.from_type = 'evidence_item'
  AND ee.to_type   = 'pathway_recommendation';

GRANT SELECT ON public.recommendation_provenance_v1 TO authenticated;

COMMENT ON VIEW public.student_evidence_v1 IS
  'Slice B3: RLS-invoking view of evidence_items with per-item edge summary. Access mirrors evidence_items policy (can_access_student).';

COMMENT ON VIEW public.recommendation_provenance_v1 IS
  'Slice B3: RLS-invoking view exposing evidence_edges targeting pathway_recommendations. Access mirrors evidence_items policy on the source side.';