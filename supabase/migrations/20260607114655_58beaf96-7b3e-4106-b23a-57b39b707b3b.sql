
-- ============= partner_outreach_log =============
CREATE TABLE public.partner_outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL DEFAULT 'email', -- email, phone, meeting, event, other
  contact_person text,
  summary text NOT NULL,
  outcome text, -- no_response, interested, declined, follow_up, approved
  next_follow_up_date date,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_outreach_partner ON public.partner_outreach_log(partner_id, contacted_at DESC);
CREATE INDEX idx_outreach_followup ON public.partner_outreach_log(next_follow_up_date) WHERE next_follow_up_date IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_outreach_log TO authenticated;
GRANT ALL ON public.partner_outreach_log TO service_role;

ALTER TABLE public.partner_outreach_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage outreach log"
  ON public.partner_outreach_log FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_outreach_updated_at
  BEFORE UPDATE ON public.partner_outreach_log
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============= partner_submissions =============
CREATE TABLE public.partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  organization_type text,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website_url text,
  region text,
  services_offered text,
  audience_served text,
  pathway_fit text,
  age_range text,
  message text,
  consent_to_contact boolean NOT NULL DEFAULT true,
  source text DEFAULT 'partners-apply',
  status text NOT NULL DEFAULT 'pending_review',
  -- pending_review, approved, declined, needs_more_info, archived
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  promoted_partner_id uuid REFERENCES public.partner_organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_status ON public.partner_submissions(status, created_at DESC);

GRANT INSERT ON public.partner_submissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_submissions TO authenticated;
GRANT ALL ON public.partner_submissions TO service_role;

ALTER TABLE public.partner_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (anon + authenticated)
CREATE POLICY "Anyone can submit a partner application"
  ON public.partner_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(organization_name) BETWEEN 1 AND 255
    AND length(contact_name) BETWEEN 1 AND 255
    AND length(contact_email) BETWEEN 3 AND 255
    AND contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND (message IS NULL OR length(message) <= 5000)
    AND (services_offered IS NULL OR length(services_offered) <= 5000)
  );

CREATE POLICY "Platform admins read all submissions"
  ON public.partner_submissions FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update submissions"
  ON public.partner_submissions FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins delete submissions"
  ON public.partner_submissions FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.partner_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
