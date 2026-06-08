
-- 1. Demo flags on existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS profiles_is_demo_idx ON public.profiles(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS students_is_demo_idx ON public.students(is_demo) WHERE is_demo = true;

-- 2. system_health_checks
CREATE TABLE IF NOT EXISTS public.system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN ('working','needs_attention','not_connected','coming_soon')),
  notes text,
  route text,
  backend_table text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  action_needed text,
  last_checked_at timestamptz,
  last_checked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_health_checks TO authenticated;
GRANT ALL ON public.system_health_checks TO service_role;
ALTER TABLE public.system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read system_health_checks"
  ON public.system_health_checks FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins insert system_health_checks"
  ON public.system_health_checks FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins update system_health_checks"
  ON public.system_health_checks FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins delete system_health_checks"
  ON public.system_health_checks FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER system_health_checks_set_updated_at
  BEFORE UPDATE ON public.system_health_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. testing_script_runs
CREATE TABLE IF NOT EXISTS public.testing_script_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_key text NOT NULL,
  step_key text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  passed boolean,
  issue_found text,
  notes text,
  priority text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  assigned_follow_up text,
  run_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (script_key, step_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.testing_script_runs TO authenticated;
GRANT ALL ON public.testing_script_runs TO service_role;
ALTER TABLE public.testing_script_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read testing_script_runs"
  ON public.testing_script_runs FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins insert testing_script_runs"
  ON public.testing_script_runs FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins update testing_script_runs"
  ON public.testing_script_runs FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Platform admins delete testing_script_runs"
  ON public.testing_script_runs FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER testing_script_runs_set_updated_at
  BEFORE UPDATE ON public.testing_script_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Seed initial System Health checklist
INSERT INTO public.system_health_checks (key, label, category, status, route, backend_table, priority, sort_order) VALUES
  ('auth_signin','Authentication (sign in/up)','auth','coming_soon','/auth','auth.users','critical',10),
  ('profile_creation','Profile creation on signup','auth','coming_soon','/onboarding','profiles','critical',20),
  ('role_selection','Role selection','onboarding','coming_soon','/onboarding','user_roles','critical',30),
  ('role_onboarding','Role-based onboarding flow','onboarding','coming_soon','/onboarding','profiles','high',40),
  ('add_student','Add student','student','coming_soon','/students/new','students','critical',50),
  ('student_connections','Student connections (collaborators)','student','coming_soon','/students','student_collaborators','high',60),
  ('student_dashboard','Student dashboard','dashboard','coming_soon','/dashboard','students','high',70),
  ('parent_dashboard','Parent/Guardian dashboard','dashboard','coming_soon','/dashboard','profiles','high',80),
  ('educator_dashboard','Educator / Case Manager dashboard','dashboard','coming_soon','/dashboard','profiles','high',90),
  ('school_admin_dashboard','School Administrator dashboard','dashboard','coming_soon','/dashboard','organizations','medium',100),
  ('district_admin_dashboard','School District Administrator dashboard','dashboard','coming_soon','/dashboard','organizations','medium',110),
  ('partner_dashboard','Partner Organization dashboard','dashboard','coming_soon','/partner','partner_organizations','medium',120),
  ('platform_admin_hub','Platform Admin Hub','dashboard','coming_soon','/admin','admin_roles','critical',130),
  ('pathway_report','Pathway Report','feature','coming_soon','/pathway','pathway_reports','critical',140),
  ('student_voice','Student Voice','feature','coming_soon','/student-voice','student_voice_responses','high',150),
  ('resource_library','Resource Library','feature','coming_soon','/resources','resources','high',160),
  ('resource_saves','Resource saves','feature','coming_soon','/resources','saved_resources','medium',170),
  ('partner_directory','Partner Directory','feature','coming_soon','/partners','partner_organizations','high',180),
  ('opportunity_matches','Opportunity matches','feature','coming_soon','/opportunities','student_opportunity_matches','high',190),
  ('action_items','Action Items','feature','coming_soon','/action-items','action_items','high',200),
  ('meeting_prep','Meeting Prep','feature','coming_soon','/meetings','meetings','high',210),
  ('calendar_events','Calendar events','feature','coming_soon','/calendar','calendar_events','high',220),
  ('waitlist_submissions','Waitlist submissions','intake','coming_soon','/waitlist','waitlist','medium',230),
  ('contact_forms','Contact forms','intake','coming_soon','/contact','contact_submissions','medium',240),
  ('partner_submissions','Partner submissions','intake','coming_soon','/partners/submit','partner_submissions','medium',250),
  ('admin_content_editing','Admin content editing','admin','coming_soon','/admin/content','page_sections','low',260),
  ('site_settings','Site settings','admin','coming_soon','/admin/settings','site_settings','low',270),
  ('supabase_connection','Backend (Lovable Cloud) connection','infra','coming_soon',NULL,NULL,'critical',280),
  ('data_persistence','Data persistence after refresh','infra','coming_soon',NULL,NULL,'critical',290),
  ('rls_permissions','RLS / permissions','infra','coming_soon',NULL,NULL,'critical',300),
  ('mobile_responsive','Mobile responsiveness','infra','coming_soon',NULL,NULL,'high',310),
  ('demo_mode_ready','Demo mode readiness','infra','coming_soon','/admin/demo',NULL,'high',320)
ON CONFLICT (key) DO NOTHING;
