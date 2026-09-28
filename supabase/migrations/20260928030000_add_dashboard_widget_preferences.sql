-- Per-user, per-role dashboard layout. Existing user_ui_prefs RLS restricts
-- reads and writes to auth.uid() = user_id; this adds no new grants or policy.
ALTER TABLE public.user_ui_prefs
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.user_ui_prefs.dashboard_layout IS
  'Allowlisted, per-role dashboard widget choices; no student or document data.';
