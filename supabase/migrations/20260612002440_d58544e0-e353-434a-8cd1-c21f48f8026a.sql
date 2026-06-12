CREATE TABLE IF NOT EXISTS public.pathway_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.pathway_reports(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content jsonb NOT NULL,
  change_summary text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (report_id, version_number)
);

GRANT SELECT, INSERT ON public.pathway_report_versions TO authenticated;
GRANT ALL ON public.pathway_report_versions TO service_role;

ALTER TABLE public.pathway_report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view report versions"
  ON public.pathway_report_versions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pathway_reports r WHERE r.id = pathway_report_versions.report_id AND r.user_id = auth.uid()));

CREATE POLICY "Owners insert report versions"
  ON public.pathway_report_versions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.pathway_reports r WHERE r.id = pathway_report_versions.report_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS pathway_report_versions_report_idx
  ON public.pathway_report_versions (report_id, version_number DESC);