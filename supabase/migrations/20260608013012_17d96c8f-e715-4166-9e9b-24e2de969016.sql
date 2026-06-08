
-- Phase 1a: SMS + in-app columns on notification_prefs
ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS in_app_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_phone_e164 text,
  ADD COLUMN IF NOT EXISTS sms_verified_at timestamptz;

-- Light format check on phone (E.164: leading + then 8-15 digits). NULL allowed.
ALTER TABLE public.notification_prefs
  DROP CONSTRAINT IF EXISTS notification_prefs_sms_phone_format;
ALTER TABLE public.notification_prefs
  ADD CONSTRAINT notification_prefs_sms_phone_format
  CHECK (sms_phone_e164 IS NULL OR sms_phone_e164 ~ '^\+[1-9][0-9]{7,14}$');

-- Phase 1b: in_app_notifications table
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS in_app_notifications_user_created_idx
  ON public.in_app_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS in_app_notifications_user_unread_idx
  ON public.in_app_notifications (user_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.in_app_notifications TO authenticated;
GRANT ALL ON public.in_app_notifications TO service_role;

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Own in-app notifications select"
  ON public.in_app_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can mark their own notifications read (UPDATE only — no INSERT, no DELETE)
CREATE POLICY "Own in-app notifications mark-read"
  ON public.in_app_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Inserts happen server-side via service_role only (no client INSERT policy).

-- Enable realtime for the bell
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
