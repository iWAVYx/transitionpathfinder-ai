
-- Slice F: Add channel digest tracking to notification_prefs
ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS channel_digest_frequency text NOT NULL DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS channel_mentions_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS channel_assignments_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_channel_digest_at timestamptz;

ALTER TABLE public.notification_prefs
  DROP CONSTRAINT IF EXISTS notification_prefs_channel_digest_frequency_check;
ALTER TABLE public.notification_prefs
  ADD CONSTRAINT notification_prefs_channel_digest_frequency_check
  CHECK (channel_digest_frequency IN ('off','daily','weekly'));

-- Helper: is the given user currently inside their quiet-hours window?
CREATE OR REPLACE FUNCTION public.user_in_quiet_hours(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start time; v_end time; v_tz text; v_now time;
BEGIN
  SELECT quiet_hours_start, quiet_hours_end, COALESCE(quiet_hours_tz, 'UTC')
    INTO v_start, v_end, v_tz
    FROM public.notification_prefs
   WHERE user_id = _user_id;
  IF v_start IS NULL OR v_end IS NULL THEN RETURN false; END IF;
  v_now := (now() AT TIME ZONE v_tz)::time;
  IF v_start = v_end THEN RETURN false; END IF;
  IF v_start < v_end THEN
    RETURN v_now >= v_start AND v_now < v_end;
  ELSE
    -- Overnight window (e.g. 22:00 → 07:00)
    RETURN v_now >= v_start OR v_now < v_end;
  END IF;
END;
$$;
