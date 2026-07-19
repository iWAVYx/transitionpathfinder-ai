CREATE TABLE public.document_pipeline_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  attempt INTEGER NOT NULL DEFAULT 1,
  stage TEXT NOT NULL CHECK (stage IN ('upload','sniff','hash','extract','verify','publish')),
  status TEXT NOT NULL CHECK (status IN ('pending','running','succeeded','failed','quarantined','skipped')),
  engine_version TEXT,
  model_version TEXT,
  prompt_version TEXT,
  error_code TEXT,
  error_message TEXT,
  latency_ms INTEGER,
  cost_cents INTEGER,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX document_pipeline_runs_document_idx ON public.document_pipeline_runs(document_id);
CREATE INDEX document_pipeline_runs_student_idx ON public.document_pipeline_runs(student_id);
CREATE INDEX document_pipeline_runs_correlation_idx ON public.document_pipeline_runs(correlation_id);
CREATE INDEX document_pipeline_runs_stage_status_idx ON public.document_pipeline_runs(stage, status);
CREATE INDEX document_pipeline_runs_created_at_idx ON public.document_pipeline_runs(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_pipeline_runs TO authenticated;
GRANT ALL ON public.document_pipeline_runs TO service_role;

ALTER TABLE public.document_pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view pipeline runs"
  ON public.document_pipeline_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can manage pipeline runs"
  ON public.document_pipeline_runs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_document_pipeline_runs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_document_pipeline_runs_updated_at
  BEFORE UPDATE ON public.document_pipeline_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_document_pipeline_runs_updated_at();