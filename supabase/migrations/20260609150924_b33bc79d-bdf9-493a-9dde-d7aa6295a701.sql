
-- ============ BETA TESTERS ============
CREATE TABLE public.beta_testers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  email text NOT NULL,
  role_type text NOT NULL CHECK (role_type IN ('parent_guardian','student','educator_case_manager','school_admin','district_admin','partner_org','general_reviewer')),
  organization text,
  invited_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invitation_status text NOT NULL DEFAULT 'not_invited' CHECK (invitation_status IN ('not_invited','invited','accepted','completed','inactive')),
  testing_status text NOT NULL DEFAULT 'not_started' CHECK (testing_status IN ('not_started','in_progress','completed','needs_follow_up')),
  assigned_test_script text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX beta_testers_status_idx ON public.beta_testers(invitation_status, testing_status);
CREATE INDEX beta_testers_role_idx ON public.beta_testers(role_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_testers TO authenticated;
GRANT ALL ON public.beta_testers TO service_role;
ALTER TABLE public.beta_testers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage beta_testers" ON public.beta_testers FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER beta_testers_set_updated_at BEFORE UPDATE ON public.beta_testers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ TESTING SCRIPTS CATALOG ============
CREATE TABLE public.testing_scripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_key text NOT NULL UNIQUE,
  role_type text NOT NULL,
  title text NOT NULL,
  description text,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testing_scripts TO authenticated;
GRANT ALL ON public.testing_scripts TO service_role;
ALTER TABLE public.testing_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage testing_scripts" ON public.testing_scripts FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER testing_scripts_set_updated_at BEFORE UPDATE ON public.testing_scripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FEEDBACK SUBMISSIONS ============
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,
  related_page text,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug','confusing','feature_request','missing_resource','missing_partner','data_access','design_usability','general')),
  title text NOT NULL,
  description text NOT NULL,
  screenshot_url text,
  priority_suggestion text CHECK (priority_suggestion IN ('low','medium','high','critical') OR priority_suggestion IS NULL),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewed','in_progress','resolved','archived')),
  admin_notes text,
  linked_issue_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_status_idx ON public.feedback_submissions(status);
CREATE INDEX feedback_type_idx ON public.feedback_submissions(feedback_type);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_submissions TO authenticated;
GRANT ALL ON public.feedback_submissions TO service_role;
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read all feedback" ON public.feedback_submissions FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR submitted_by_user_id = auth.uid());
CREATE POLICY "authenticated insert own feedback" ON public.feedback_submissions FOR INSERT TO authenticated
  WITH CHECK (submitted_by_user_id = auth.uid() OR submitted_by_user_id IS NULL);
CREATE POLICY "admins update feedback" ON public.feedback_submissions FOR UPDATE TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete feedback" ON public.feedback_submissions FOR DELETE TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER feedback_set_updated_at BEFORE UPDATE ON public.feedback_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRODUCT ISSUES (Bug tracker) ============
CREATE TABLE public.product_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  reported_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_feedback_id uuid REFERENCES public.feedback_submissions(id) ON DELETE SET NULL,
  affected_role text,
  affected_feature text,
  priority text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P0','P1','P2','P3')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','triaged','in_progress','fixed','wont_fix','archived')),
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_issues_status_idx ON public.product_issues(status);
CREATE INDEX product_issues_priority_idx ON public.product_issues(priority);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_issues TO authenticated;
GRANT ALL ON public.product_issues TO service_role;
ALTER TABLE public.product_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage product_issues" ON public.product_issues FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER product_issues_set_updated_at BEFORE UPDATE ON public.product_issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ LAUNCH CHECKLIST ============
CREATE TABLE public.launch_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  item_title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete','blocked')),
  priority text DEFAULT 'medium',
  owner text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX launch_checklist_cat_idx ON public.launch_checklist_items(category, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.launch_checklist_items TO authenticated;
GRANT ALL ON public.launch_checklist_items TO service_role;
ALTER TABLE public.launch_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage launch_checklist" ON public.launch_checklist_items FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER launch_checklist_set_updated_at BEFORE UPDATE ON public.launch_checklist_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EMAIL NOTIFICATIONS LEDGER ============
CREATE TABLE public.email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type text NOT NULL,
  subject text NOT NULL,
  body_preview text,
  related_record_type text,
  related_record_id uuid,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_notif_status_idx ON public.email_notifications(status, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.email_notifications TO authenticated;
GRANT ALL ON public.email_notifications TO service_role;
ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins or recipient read email_notifications" ON public.email_notifications FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR recipient_user_id = auth.uid());
CREATE POLICY "admins manage email_notifications" ON public.email_notifications FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- ============ PILOT OUTREACH ============
CREATE TABLE public.pilot_outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  organization text,
  role_type text,
  email text,
  phone text,
  relationship_notes text,
  outreach_status text NOT NULL DEFAULT 'not_contacted' CHECK (outreach_status IN ('not_contacted','contacted','meeting_scheduled','demo_completed','interested','not_interested','follow_up_needed')),
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pilot_outreach_status_idx ON public.pilot_outreach_contacts(outreach_status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_outreach_contacts TO authenticated;
GRANT ALL ON public.pilot_outreach_contacts TO service_role;
ALTER TABLE public.pilot_outreach_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage pilot_outreach" ON public.pilot_outreach_contacts FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER pilot_outreach_set_updated_at BEFORE UPDATE ON public.pilot_outreach_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PILOT PACKAGES ============
CREATE TABLE public.pilot_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  audience text,
  description text,
  included_features text,
  suggested_price_or_status text,
  notes text,
  public_visible boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_packages TO authenticated;
GRANT SELECT ON public.pilot_packages TO anon;
GRANT ALL ON public.pilot_packages TO service_role;
ALTER TABLE public.pilot_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read visible pilot_packages" ON public.pilot_packages FOR SELECT TO anon, authenticated
  USING (public_visible = true OR is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage pilot_packages" ON public.pilot_packages FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER pilot_packages_set_updated_at BEFORE UPDATE ON public.pilot_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USAGE EVENTS ============
CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role text,
  page text,
  related_record_type text,
  related_record_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_type_idx ON public.usage_events(event_type, created_at DESC);
CREATE INDEX usage_events_user_idx ON public.usage_events(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT INSERT ON public.usage_events TO anon;
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read usage_events" ON public.usage_events FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "authenticated insert own usage_event" ON public.usage_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "anon insert anonymous usage_event" ON public.usage_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- ============ SEED: testing_scripts ============
INSERT INTO public.testing_scripts (script_key, role_type, title, description, checklist) VALUES
('parent_guardian','parent_guardian','Parent/Guardian Tester Script','End-to-end family flow.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"add_student","label":"Add a student"},
  {"key":"family_priorities","label":"Complete family priorities"},
  {"key":"review_report","label":"Review the Pathway Report"},
  {"key":"save_resource","label":"Save one resource"},
  {"key":"create_action","label":"Create one action item"},
  {"key":"add_event","label":"Add one calendar event"},
  {"key":"meeting_prep","label":"Prepare for a meeting"}
]'::jsonb),
('educator','educator_case_manager','Educator / Case Manager Tester Script','Educator workflow.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"view_caseload","label":"View or add assigned students"},
  {"key":"open_profile","label":"Open a student profile"},
  {"key":"review_gaps","label":"Review readiness gaps"},
  {"key":"recommend_resource","label":"Recommend a resource"},
  {"key":"create_action","label":"Create an action item"},
  {"key":"meeting_note","label":"Add a meeting prep note"}
]'::jsonb),
('student','student','Student Tester Script','Student-facing flow.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"voice","label":"Answer Student Voice prompts"},
  {"key":"review_pathway","label":"Review your pathway"},
  {"key":"save_resource","label":"Save one resource"},
  {"key":"complete_action","label":"Complete one action item"},
  {"key":"view_calendar","label":"View your calendar"}
]'::jsonb),
('school_admin','school_admin','School Administrator Tester Script','School-level visibility.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"school_progress","label":"Review school progress"},
  {"key":"missing_reports","label":"Check missing Pathway Reports"},
  {"key":"team_overview","label":"View staff/team overview"},
  {"key":"upcoming_dates","label":"Review upcoming transition planning dates"}
]'::jsonb),
('district_admin','district_admin','School District Administrator Tester Script','District-level visibility.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"district_overview","label":"Review district overview"},
  {"key":"school_progress","label":"Check school-by-school progress"},
  {"key":"milestones","label":"Review implementation milestones"},
  {"key":"partner_usage","label":"Examine district-level partner/resource usage"}
]'::jsonb),
('partner','partner_org','Partner Organization Tester Script','Partner onboarding & posting.', '[
  {"key":"signup","label":"Create an account"},
  {"key":"onboarding","label":"Complete onboarding"},
  {"key":"profile","label":"Complete partner profile"},
  {"key":"opportunity","label":"Submit an opportunity"},
  {"key":"deadline","label":"Add a program deadline"},
  {"key":"status","label":"View opportunity status"}
]'::jsonb),
('platform_admin','general_reviewer','Platform Admin Tester Script','Admin tool review.', '[
  {"key":"signin","label":"Sign in"},
  {"key":"system_health","label":"Review System Health"},
  {"key":"waitlist","label":"Check waitlist entries"},
  {"key":"contact","label":"Review contact submissions"},
  {"key":"partner_subs","label":"Review partner submissions"},
  {"key":"resources","label":"Manage resources"},
  {"key":"sources","label":"Check source libraries"},
  {"key":"follow_ups","label":"Manage calendar/admin follow-ups"},
  {"key":"admin_protected","label":"Confirm admin-only tools are protected"}
]'::jsonb);

-- ============ SEED: launch checklist ============
INSERT INTO public.launch_checklist_items (category, item_title, sort_order) VALUES
('Backend Readiness','Authentication works',1),
('Backend Readiness','Onboarding works',2),
('Backend Readiness','Roles save correctly',3),
('Backend Readiness','Add Student works',4),
('Backend Readiness','Data persists after refresh',5),
('Backend Readiness','Supabase tables connected',6),
('Backend Readiness','RLS/permissions tested',7),
('Product Readiness','Pathway Report works',1),
('Product Readiness','Resource Library works',2),
('Product Readiness','Partner Network works',3),
('Product Readiness','Calendar works',4),
('Product Readiness','Action Items work',5),
('Product Readiness','Meeting Prep works',6),
('Product Readiness','Demo Mode works',7),
('Product Readiness','System Health is active',8),
('Admin Readiness','Waitlist works',1),
('Admin Readiness','Contact forms work',2),
('Admin Readiness','Partner submissions work',3),
('Admin Readiness','Resource management works',4),
('Admin Readiness','Partner management works',5),
('Admin Readiness','Feedback hub works',6),
('Admin Readiness','Bug tracker works',7),
('Admin Readiness','Site settings work',8),
('Trust and Compliance','Privacy Policy added',1),
('Trust and Compliance','Terms of Use added',2),
('Trust and Compliance','AI Disclaimer added',3),
('Trust and Compliance','Student data disclaimer added',4),
('Trust and Compliance','Consent language added',5),
('Trust and Compliance','Sharing/access language added',6),
('Trust and Compliance','Data removal/access contact added',7),
('Testing Readiness','Beta testers added',1),
('Testing Readiness','Role-based test scripts created',2),
('Testing Readiness','Feedback button active',3),
('Testing Readiness','Issues tracker active',4),
('Testing Readiness','Demo accounts ready',5),
('Testing Readiness','Mobile tested',6),
('Testing Readiness','First pilot group identified',7);
