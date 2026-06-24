
-- 1. New columns
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS routing_category text,
  ADD COLUMN IF NOT EXISTS urgency text,
  ADD COLUMN IF NOT EXISTS wants_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS connected_to_student boolean,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS caseload_size integer,
  ADD COLUMN IF NOT EXISTS estimated_student_count integer,
  ADD COLUMN IF NOT EXISTS estimated_school_count integer,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS service_area text,
  ADD COLUMN IF NOT EXISTS populations_supported text,
  ADD COLUMN IF NOT EXISTS services_offered text;

-- 2. Tighten status vocabulary
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_status_check;
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_status_check CHECK (
    status IN (
      'new',
      'needs_review',
      'routed_family_early_access',
      'routed_educator_demo',
      'routed_school_pilot',
      'routed_district_pilot',
      'routed_partner_review',
      'invited',
      'converted',
      'not_eligible_yet',
      'archived'
    )
  );

-- 3. Routing category vocabulary
ALTER TABLE public.waitlist DROP CONSTRAINT IF EXISTS waitlist_routing_category_check;
ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_routing_category_check CHECK (
    routing_category IS NULL OR routing_category IN (
      'family_early_access',
      'educator_demo',
      'school_pilot',
      'district_pilot',
      'partner_review',
      'future_updates',
      'needs_review'
    )
  );

-- 4. Replace public INSERT policy: require consent + block platform-admin self-claim
DROP POLICY IF EXISTS "Anyone can submit to waitlist" ON public.waitlist;
CREATE POLICY "Anyone can submit to waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    consent_to_contact = true
    AND lower(coalesce(role, '')) NOT IN ('admin','platform_admin','platform_owner','owner')
    AND lower(coalesce(requested_role, '')) NOT IN ('admin','platform_admin','platform_owner','owner')
    AND length(email) BETWEEN 3 AND 255
    AND length(full_name) BETWEEN 1 AND 200
    AND length(role) BETWEEN 1 AND 50
    AND (state IS NULL OR length(state) <= 100)
    AND (student_grade_band IS NULL OR length(student_grade_band) <= 50)
    AND (reason IS NULL OR length(reason) <= 2000)
    AND (interest_type IS NULL OR length(interest_type) <= 50)
    AND (organization_name IS NULL OR length(organization_name) <= 200)
    AND (organization_type IS NULL OR length(organization_type) <= 100)
    AND (district_name IS NULL OR length(district_name) <= 200)
    AND (school_name IS NULL OR length(school_name) <= 200)
    AND (intended_use IS NULL OR length(intended_use) <= 2000)
    AND (referral_source IS NULL OR length(referral_source) <= 200)
    AND (urgency IS NULL OR length(urgency) <= 50)
    AND (timeline IS NULL OR length(timeline) <= 200)
    AND (service_area IS NULL OR length(service_area) <= 500)
    AND (populations_supported IS NULL OR length(populations_supported) <= 1000)
    AND (services_offered IS NULL OR length(services_offered) <= 2000)
    AND (routing_category IS NULL OR length(routing_category) <= 50)
    AND (caseload_size IS NULL OR (caseload_size >= 0 AND caseload_size <= 100000))
    AND (estimated_student_count IS NULL OR (estimated_student_count >= 0 AND estimated_student_count <= 10000000))
    AND (estimated_school_count IS NULL OR (estimated_school_count >= 0 AND estimated_school_count <= 100000))
    AND assigned_admin_id IS NULL
    AND converted_to_user_id IS NULL
    AND converted_invitation_id IS NULL
  );

-- Helpful index for admin filtering
CREATE INDEX IF NOT EXISTS waitlist_status_idx ON public.waitlist(status);
CREATE INDEX IF NOT EXISTS waitlist_routing_category_idx ON public.waitlist(routing_category);
