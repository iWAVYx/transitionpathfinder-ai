
CREATE TABLE public.admin_audit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  role_label text NOT NULL,
  purpose text NOT NULL DEFAULT '',
  issues_found text NOT NULL DEFAULT '',
  issues_fixed text NOT NULL DEFAULT '',
  staged_items text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  last_reviewed_at timestamptz,
  last_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_audit_reviews TO authenticated;
GRANT ALL ON public.admin_audit_reviews TO service_role;

ALTER TABLE public.admin_audit_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can read audit reviews"
  ON public.admin_audit_reviews FOR SELECT
  TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can insert audit reviews"
  ON public.admin_audit_reviews FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can update audit reviews"
  ON public.admin_audit_reviews FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can delete audit reviews"
  ON public.admin_audit_reviews FOR DELETE
  TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_audit_reviews_set_updated_at
  BEFORE UPDATE ON public.admin_audit_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.admin_audit_reviews (role_key, role_label, purpose) VALUES
  ('student',        'Student',                      'Student Voice, plain-language planning, strengths/interests, supports, BridgeForward (6–8) or TransitionForward (9–12), Pathway Report / Readiness Snapshot, action items, calendar, meeting prep, saved resources, connected support team.'),
  ('parent',         'Parent / Guardian',            'Connected students, document upload/review, family priorities, consent/sharing, rights status, BridgeForward/TransitionForward by grade, meeting prep, action items, calendar, resources, opportunities, connection requests.'),
  ('educator',       'Educator / Case Manager',      'Caseload overview, connected students, missing info alerts, document review, Student Voice / family input status, transition readiness, Pathway Reports, BridgeForward records, meeting prep, action items, calendar, collaboration notes, resource recommendations.'),
  ('school_admin',   'School Administrator',         'School implementation, connected educators / case managers, access requests, permitted student progress, aggregate indicators, school resources, pilot / access status. Must NOT show Platform Admin controls.'),
  ('district_admin', 'School District Administrator','District overview, connected schools, school admins / staff, access entitlements, aggregate progress, school onboarding, implementation indicators, invitations, membership management. Must NOT show Platform Admin internal controls.'),
  ('partner',        'Partner Organization',         'Partner profile, opportunity submissions and statuses, admin feedback, partner resources, PartnerForward Incentives & Support, impact overview. Must NEVER see private student data.'),
  ('owner',          'Platform Admin',               'Internal platform operations only: Access & Accounts, Organizations & Entitlements, Students & Relationships, Content & Resources, Partners & Opportunities, BridgeForward Source Manager, PartnerForward Resource Manager, Product Operations, Launch & Pilot Readiness, Feedback & Bugs, System Health.')
ON CONFLICT (role_key) DO NOTHING;
