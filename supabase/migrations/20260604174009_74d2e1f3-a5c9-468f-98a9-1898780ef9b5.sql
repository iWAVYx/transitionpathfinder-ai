CREATE TABLE public.student_voice_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  prompt_key text NOT NULL,
  response_text text NOT NULL DEFAULT '',
  age_band text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, prompt_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_voice_responses TO authenticated;
GRANT ALL ON public.student_voice_responses TO service_role;

ALTER TABLE public.student_voice_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View voice via student"
  ON public.student_voice_responses FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "Insert voice via student"
  ON public.student_voice_responses FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = created_by);

CREATE POLICY "Update voice via student"
  ON public.student_voice_responses FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "Delete voice via student"
  ON public.student_voice_responses FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER set_student_voice_responses_updated_at
  BEFORE UPDATE ON public.student_voice_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX student_voice_responses_student_idx ON public.student_voice_responses(student_id);