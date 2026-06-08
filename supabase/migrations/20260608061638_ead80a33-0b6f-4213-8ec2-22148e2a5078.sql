
CREATE TABLE public.ppt_meeting_preps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid REFERENCES public.pathway_reports(id) ON DELETE SET NULL,
  student_id uuid,
  student_name text NOT NULL DEFAULT '',
  meeting_date text,
  top_concerns text NOT NULL DEFAULT '',
  desired_outcomes text NOT NULL DEFAULT '',
  agenda jsonb NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ppt_meeting_preps_user_created_idx
  ON public.ppt_meeting_preps (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ppt_meeting_preps TO authenticated;
GRANT ALL ON public.ppt_meeting_preps TO service_role;

ALTER TABLE public.ppt_meeting_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own ppt preps select"
  ON public.ppt_meeting_preps FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Own ppt preps insert"
  ON public.ppt_meeting_preps FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own ppt preps update"
  ON public.ppt_meeting_preps FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own ppt preps delete"
  ON public.ppt_meeting_preps FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_ppt_preps
  BEFORE UPDATE ON public.ppt_meeting_preps
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
