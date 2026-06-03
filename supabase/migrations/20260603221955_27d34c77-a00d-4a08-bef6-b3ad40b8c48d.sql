
-- =====================================================================
-- 1. ADMIN ROLE TIER (separate from user app_role)
-- =====================================================================
CREATE TYPE public.admin_role AS ENUM (
  'platform_owner',
  'platform_admin',
  'content_manager',
  'support_admin'
);

CREATE TABLE public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.admin_role NOT NULL,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.admin_roles TO authenticated;
GRANT ALL ON public.admin_roles TO service_role;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Helpers (SECURITY DEFINER avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid, _role public.admin_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id AND role IN ('platform_owner','platform_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_hub_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = _user_id);
$$;

-- RLS policies
CREATE POLICY "View own admin role or platform admin can view all"
  ON public.admin_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage admin roles"
  ON public.admin_roles FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Backfill: anyone with the legacy `admin` app_role becomes a Platform Admin
INSERT INTO public.admin_roles (user_id, role)
SELECT user_id, 'platform_admin'::public.admin_role
FROM public.user_roles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- Keep new_user trigger compatible (no change needed there)

-- =====================================================================
-- 2. WAITLIST — extend existing table, add admin notes
-- =====================================================================
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS interest_area text,
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS consent_to_contact boolean NOT NULL DEFAULT false;

-- Replace old "admin" RLS with platform admin RLS
DROP POLICY IF EXISTS "Admins view waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins update waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Admins delete waitlist" ON public.waitlist;

CREATE POLICY "Platform admins view waitlist"
  ON public.waitlist FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update waitlist"
  ON public.waitlist FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete waitlist"
  ON public.waitlist FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- waitlist_admin_notes
CREATE TABLE public.waitlist_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_entry_id uuid NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_admin_notes TO authenticated;
GRANT ALL ON public.waitlist_admin_notes TO service_role;
ALTER TABLE public.waitlist_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins view waitlist notes"
  ON public.waitlist_admin_notes FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins insert waitlist notes"
  ON public.waitlist_admin_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Platform admins update own waitlist notes"
  ON public.waitlist_admin_notes FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Platform admins delete waitlist notes"
  ON public.waitlist_admin_notes FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- =====================================================================
-- 3. CONTACT SUBMISSIONS
-- =====================================================================
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  phone text,
  organization text,
  inquiry_type text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  source_page text,
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_email_len CHECK (length(email) BETWEEN 3 AND 320),
  CONSTRAINT contact_message_len CHECK (length(message) BETWEEN 1 AND 5000),
  CONSTRAINT contact_status_valid CHECK (status IN ('new','reviewed','replied','archived'))
);

GRANT INSERT ON public.contact_submissions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact"
  ON public.contact_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(first_name) BETWEEN 1 AND 100
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
  );

CREATE POLICY "Platform admins view contact"
  ON public.contact_submissions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update contact"
  ON public.contact_submissions FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete contact"
  ON public.contact_submissions FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_contact_submissions_updated_at
  BEFORE UPDATE ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================================
-- 4. SITE SETTINGS
-- =====================================================================
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read public settings"
  ON public.site_settings FOR SELECT TO anon, authenticated
  USING (is_public = true OR public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins insert settings"
  ON public.site_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update settings"
  ON public.site_settings FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete settings"
  ON public.site_settings FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults (public-readable)
INSERT INTO public.site_settings (setting_key, setting_value, is_public) VALUES
  ('site_name', '"TransitionForward"'::jsonb, true),
  ('contact_email', '"hello@transitionforward.org"'::jsonb, true),
  ('seo_title', '"TransitionForward — Transition planning for every student"'::jsonb, true),
  ('seo_description', '"Family-friendly transition planning, IEP support, and pathway reports built with educators and Connecticut families."'::jsonb, true),
  ('social_links', '{"twitter":"","linkedin":"","instagram":"","facebook":""}'::jsonb, true),
  ('footer_tagline', '"Built with families, teachers, and partners across Connecticut."'::jsonb, true),
  ('maintenance_mode', 'false'::jsonb, true),
  ('waitlist_open', 'true'::jsonb, true),
  ('demo_mode', 'false'::jsonb, true),
  ('launch_status', '"private_beta"'::jsonb, true)
ON CONFLICT (setting_key) DO NOTHING;

-- =====================================================================
-- 5. ADMIN ACTIVITY LOGS
-- =====================================================================
CREATE TABLE public.admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_activity_created_at ON public.admin_activity_logs (created_at DESC);
CREATE INDEX idx_admin_activity_admin_user ON public.admin_activity_logs (admin_user_id);

GRANT SELECT, INSERT ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.admin_activity_logs TO service_role;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins view activity logs"
  ON public.admin_activity_logs FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Admin hub members insert their own activity"
  ON public.admin_activity_logs FOR INSERT TO authenticated
  WITH CHECK (admin_user_id = auth.uid() AND public.is_admin_hub_member(auth.uid()));
