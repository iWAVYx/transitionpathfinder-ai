-- Slice B8 — Provenance coverage view for pathway reports.
-- One row per pathway_reports row the caller can see (RLS on pathway_reports
-- applies via security_invoker), with a count of evidence_edges attached to
-- that report id as the pathway_recommendation surrogate. Edge visibility is
-- gated by evidence_edges RLS (derived from the source evidence item's
-- student access), so counts silently exclude edges the caller can't see.

CREATE OR REPLACE VIEW public.report_provenance_coverage_v1
WITH (security_invoker = on) AS
SELECT
  pr.id AS report_id,
  pr.student_id,
  COALESCE(ec.evidence_edge_count, 0)::int AS evidence_edge_count,
  (COALESCE(ec.evidence_edge_count, 0) > 0) AS has_coverage
FROM public.pathway_reports pr
LEFT JOIN LATERAL (
  SELECT count(*)::int AS evidence_edge_count
  FROM public.evidence_edges ee
  WHERE ee.to_type = 'pathway_recommendation'
    AND ee.to_id = pr.id
    AND ee.from_type = 'evidence_item'
) ec ON TRUE;

GRANT SELECT ON public.report_provenance_coverage_v1 TO authenticated;