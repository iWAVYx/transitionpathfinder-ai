CREATE TABLE public.demo_meeting_edits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_key text not null check (student_key in ('maya','jordan')),
  minutes jsonb not null default '{}'::jsonb,
  agenda jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, student_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demo_meeting_edits TO authenticated;
GRANT ALL ON public.demo_meeting_edits TO service_role;

ALTER TABLE public.demo_meeting_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own demo meeting edits"
  ON public.demo_meeting_edits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER demo_meeting_edits_set_updated_at
  BEFORE UPDATE ON public.demo_meeting_edits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
