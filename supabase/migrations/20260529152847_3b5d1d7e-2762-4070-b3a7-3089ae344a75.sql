CREATE TABLE public.goal_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  report_id UUID NOT NULL REFERENCES public.pathway_reports(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('not-started','in-progress','met')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_id, item_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_statuses TO authenticated;
GRANT ALL ON public.goal_statuses TO service_role;

ALTER TABLE public.goal_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own goal statuses (select)"
  ON public.goal_statuses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own goal statuses (insert)"
  ON public.goal_statuses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own goal statuses (update)"
  ON public.goal_statuses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own goal statuses (delete)"
  ON public.goal_statuses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER goal_statuses_set_updated_at
  BEFORE UPDATE ON public.goal_statuses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_goal_statuses_user_report ON public.goal_statuses(user_id, report_id);