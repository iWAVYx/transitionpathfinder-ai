CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.student_workflow_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_key TEXT NOT NULL CHECK (char_length(task_key) BETWEEN 1 AND 128 AND task_key ~ '^[a-z0-9_.:-]+$'),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  return_to TEXT CHECK (return_to IS NULL OR char_length(return_to) <= 512),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_key)
);

CREATE INDEX IF NOT EXISTS student_workflow_drafts_user_updated_idx
  ON public.student_workflow_drafts (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_workflow_drafts TO authenticated;
GRANT ALL ON public.student_workflow_drafts TO service_role;

ALTER TABLE public.student_workflow_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own workflow drafts"
  ON public.student_workflow_drafts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own workflow drafts"
  ON public.student_workflow_drafts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own workflow drafts"
  ON public.student_workflow_drafts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own workflow drafts"
  ON public.student_workflow_drafts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_student_workflow_drafts_updated_at ON public.student_workflow_drafts;
CREATE TRIGGER trg_student_workflow_drafts_updated_at
  BEFORE UPDATE ON public.student_workflow_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();