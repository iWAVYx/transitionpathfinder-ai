
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS iep_annual_review_date date,
  ADD COLUMN IF NOT EXISTS iep_reevaluation_date date,
  ADD COLUMN IF NOT EXISTS graduation_target_date date;

ALTER TABLE public.saved_resources
  ADD COLUMN IF NOT EXISTS follow_up_date date;

ALTER TABLE public.pathway_reports
  ADD COLUMN IF NOT EXISTS inputs_stale_at timestamp with time zone;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS next_meeting_date date,
  ADD COLUMN IF NOT EXISTS decisions text,
  ADD COLUMN IF NOT EXISTS documents_to_update text;

ALTER TABLE public.meeting_action_items
  ADD COLUMN IF NOT EXISTS promoted_action_item_id uuid;
