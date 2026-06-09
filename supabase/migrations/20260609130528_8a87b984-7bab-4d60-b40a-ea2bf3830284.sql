-- Add is_demo flag to dashboard-relevant tables (students already has it).
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_voice_responses ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.readiness_scores ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.pathway_reports ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_resource_recommendations ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_saved_partners ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_collaborators ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Helpful partial indexes so admin views can quickly exclude/include demo rows.
CREATE INDEX IF NOT EXISTS goals_is_demo_idx ON public.goals (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS action_items_is_demo_idx ON public.action_items (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS calendar_events_is_demo_idx ON public.calendar_events (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS pathway_reports_is_demo_idx ON public.pathway_reports (is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS student_collaborators_is_demo_idx ON public.student_collaborators (is_demo) WHERE is_demo = true;
