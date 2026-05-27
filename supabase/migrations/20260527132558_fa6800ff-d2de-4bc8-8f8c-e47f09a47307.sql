ALTER TABLE public.student_intakes
  ADD COLUMN IF NOT EXISTS family_voice TEXT,
  ADD COLUMN IF NOT EXISTS educator_input TEXT;