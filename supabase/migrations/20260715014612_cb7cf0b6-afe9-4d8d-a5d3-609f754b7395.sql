ALTER TABLE public.report_evidence_links
  ADD COLUMN IF NOT EXISTS snippet_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS report_evidence_links_dedupe_idx
  ON public.report_evidence_links (student_id, report_section, source_kind, COALESCE(source_id::text, ''), snippet_hash)
  WHERE snippet_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS report_evidence_links_source_idx
  ON public.report_evidence_links (student_id, source_kind, source_id);