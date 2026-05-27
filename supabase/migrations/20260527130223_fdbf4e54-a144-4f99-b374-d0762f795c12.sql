
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.student_intakes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  submitter_role TEXT NOT NULL DEFAULT 'family',
  student_first_name TEXT NOT NULL,
  grade_band TEXT,
  strengths TEXT,
  interests TEXT,
  needs TEXT,
  supports TEXT,
  transportation TEXT,
  communication TEXT,
  current_goals TEXT,
  family_concerns TEXT,
  student_voice TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_intakes TO authenticated;
GRANT ALL ON public.student_intakes TO service_role;

ALTER TABLE public.student_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own intakes" ON public.student_intakes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own intakes" ON public.student_intakes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own intakes" ON public.student_intakes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own intakes" ON public.student_intakes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_student_intakes_updated_at
BEFORE UPDATE ON public.student_intakes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pathway_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  intake_id UUID NOT NULL REFERENCES public.student_intakes(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pathway_reports TO authenticated;
GRANT ALL ON public.pathway_reports TO service_role;

ALTER TABLE public.pathway_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reports" ON public.pathway_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reports" ON public.pathway_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reports" ON public.pathway_reports FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_student_intakes_user ON public.student_intakes(user_id, created_at DESC);
CREATE INDEX idx_pathway_reports_user ON public.pathway_reports(user_id, created_at DESC);
CREATE INDEX idx_pathway_reports_intake ON public.pathway_reports(intake_id);
