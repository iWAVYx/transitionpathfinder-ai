
-- W1: Editable Account Profiles, Preferences, Security foundations

-- 1) Extend public.profiles with editable common fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_name text,
  ADD COLUMN IF NOT EXISTS pronouns text,
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS communication_preference text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'team_only',
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS title text;

-- Length + enum guards (drop-if-exists then add for idempotence)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_communication_preference_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_communication_preference_check
  CHECK (communication_preference = ANY (ARRAY['email','in_app','both']));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_visibility_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_visibility_check
  CHECK (profile_visibility = ANY (ARRAY['team_only','org','private']));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_bio_length_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_bio_length_check
  CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_preferred_name_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_preferred_name_length
  CHECK (preferred_name IS NULL OR char_length(preferred_name) <= 80);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_pronouns_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_pronouns_length
  CHECK (pronouns IS NULL OR char_length(pronouns) <= 40);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_title_length;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_title_length
  CHECK (title IS NULL OR char_length(title) <= 120);

-- 2) Extend notification_prefs with quiet hours
ALTER TABLE public.notification_prefs
  ADD COLUMN IF NOT EXISTS quiet_hours_start time,
  ADD COLUMN IF NOT EXISTS quiet_hours_end time,
  ADD COLUMN IF NOT EXISTS quiet_hours_tz text;

-- 3) New user_preferences table for accessibility / UX prefs
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reduced_motion boolean NOT NULL DEFAULT false,
  high_contrast boolean NOT NULL DEFAULT false,
  dyslexia_friendly boolean NOT NULL DEFAULT false,
  reading_level text NOT NULL DEFAULT 'standard',
  calendar_view text NOT NULL DEFAULT 'week',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_reading_level_check
    CHECK (reading_level = ANY (ARRAY['plain','standard'])),
  CONSTRAINT user_preferences_calendar_view_check
    CHECK (calendar_view = ANY (ARRAY['list','week','month']))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own preferences" ON public.user_preferences;
CREATE POLICY "Users view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own preferences" ON public.user_preferences;
CREATE POLICY "Users insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_preferences;
CREATE POLICY "Users update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Platform admins view all preferences" ON public.user_preferences;
CREATE POLICY "Platform admins view all preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

DROP TRIGGER IF EXISTS user_preferences_set_updated_at ON public.user_preferences;
CREATE TRIGGER user_preferences_set_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) New security_events audit trail (user-scoped)
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT security_events_event_type_check CHECK (event_type = ANY (ARRAY[
    'password_change','mfa_enroll','mfa_disable','email_change_requested',
    'email_change_confirmed','session_revoked','profile_field_change',
    'preferences_change','notification_prefs_change','avatar_change'
  ]))
);

CREATE INDEX IF NOT EXISTS security_events_user_created_idx
  ON public.security_events (user_id, created_at DESC);

-- Users may read only their own events; only service_role can insert (server fns use admin client)
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own security events" ON public.security_events;
CREATE POLICY "Users view own security events" ON public.security_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Platform admins view all security events" ON public.security_events;
CREATE POLICY "Platform admins view all security events" ON public.security_events
  FOR SELECT TO authenticated USING (public.is_platform_admin(auth.uid()));

-- No authenticated INSERT/UPDATE/DELETE: writes go through server functions using service_role.

-- 5) Update handle_new_user() trigger to also seed preferences + notification_prefs atomically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    WHERE public.profiles.email IS NULL OR public.profiles.email = '';

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.notification_prefs (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- 6) Backfill defaults for existing profiles (idempotent — never overwrites existing rows)
INSERT INTO public.user_preferences (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.user_preferences up ON up.user_id = p.id
WHERE up.user_id IS NULL;

INSERT INTO public.notification_prefs (user_id)
SELECT p.id FROM public.profiles p
LEFT JOIN public.notification_prefs np ON np.user_id = p.id
WHERE np.user_id IS NULL;
