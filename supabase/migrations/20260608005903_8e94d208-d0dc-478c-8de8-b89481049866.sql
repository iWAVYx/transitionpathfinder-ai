ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS notification_cadence text NOT NULL DEFAULT 'daily'
  CHECK (notification_cadence IN ('instant','daily','weekly'));