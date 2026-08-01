-- ============ 1. Jurisdiction system ============
CREATE TABLE public.jurisdictions (
  code text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL DEFAULT 'US',
  status text NOT NULL DEFAULT 'disabled'
    CHECK (status IN ('active','in_review','disabled')),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jurisdictions TO anon, authenticated;
GRANT ALL ON public.jurisdictions TO service_role;
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read jurisdictions" ON public.jurisdictions
  FOR SELECT USING (true);
CREATE POLICY "Platform admins manage jurisdictions" ON public.jurisdictions
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TABLE public.jurisdiction_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code text NOT NULL REFERENCES public.jurisdictions(code) ON DELETE CASCADE,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','active','superseded')),
  effective_from date NOT NULL DEFAULT current_date,
  review_due date,
  superseded_by uuid REFERENCES public.jurisdiction_versions(id) ON DELETE SET NULL,
  terminology jsonb NOT NULL DEFAULT '{}'::jsonb,
  planning_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  role_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_requirements jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (jurisdiction_code, version)
);
CREATE UNIQUE INDEX jurisdiction_versions_one_active
  ON public.jurisdiction_versions (jurisdiction_code)
  WHERE status = 'active';
GRANT SELECT ON public.jurisdiction_versions TO anon, authenticated;
GRANT ALL ON public.jurisdiction_versions TO service_role;
ALTER TABLE public.jurisdiction_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active jurisdiction versions"
  ON public.jurisdiction_versions FOR SELECT USING (status = 'active');
CREATE POLICY "Platform admins manage jurisdiction versions"
  ON public.jurisdiction_versions FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TABLE public.jurisdiction_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.jurisdiction_versions(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  url text,
  phone text,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jurisdiction_agencies_version ON public.jurisdiction_agencies(version_id);
GRANT SELECT ON public.jurisdiction_agencies TO anon, authenticated;
GRANT ALL ON public.jurisdiction_agencies TO service_role;
ALTER TABLE public.jurisdiction_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read agencies of active versions"
  ON public.jurisdiction_agencies FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jurisdiction_versions v
                 WHERE v.id = version_id AND v.status = 'active'));
CREATE POLICY "Platform admins manage agencies"
  ON public.jurisdiction_agencies FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TABLE public.jurisdiction_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.jurisdiction_versions(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  publisher text,
  official boolean NOT NULL DEFAULT true,
  last_verified_at timestamptz,
  review_due date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_jurisdiction_sources_version ON public.jurisdiction_sources(version_id);
GRANT SELECT ON public.jurisdiction_sources TO anon, authenticated;
GRANT ALL ON public.jurisdiction_sources TO service_role;
ALTER TABLE public.jurisdiction_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read sources of active versions"
  ON public.jurisdiction_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jurisdiction_versions v
                 WHERE v.id = version_id AND v.status = 'active'));
CREATE POLICY "Platform admins manage sources"
  ON public.jurisdiction_sources FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TABLE public.jurisdiction_resource_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES public.jurisdiction_versions(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version_id, slug)
);
GRANT SELECT ON public.jurisdiction_resource_packs TO anon, authenticated;
GRANT ALL ON public.jurisdiction_resource_packs TO service_role;
ALTER TABLE public.jurisdiction_resource_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read packs of active versions"
  ON public.jurisdiction_resource_packs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jurisdiction_versions v
                 WHERE v.id = version_id AND v.status = 'active'));
CREATE POLICY "Platform admins manage packs"
  ON public.jurisdiction_resource_packs FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER jurisdictions_touch BEFORE UPDATE ON public.jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jurisdiction_versions_touch BEFORE UPDATE ON public.jurisdiction_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.active_jurisdiction_version(_code text DEFAULT 'US-CT')
RETURNS public.jurisdiction_versions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.* FROM public.jurisdiction_versions v
  JOIN public.jurisdictions j ON j.code = v.jurisdiction_code
  WHERE v.jurisdiction_code = _code
    AND v.status = 'active'
    AND j.status = 'active'
    AND v.effective_from <= current_date
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.active_jurisdiction_version(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.active_jurisdiction_version(text) TO anon, authenticated, service_role;

-- Connecticut: the only production jurisdiction.
INSERT INTO public.jurisdictions (code, name, country, status, is_default)
VALUES ('US-CT', 'Connecticut', 'US', 'active', true)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.jurisdictions (code, name, country, status)
VALUES
  ('US-MA', 'Massachusetts', 'US', 'disabled'),
  ('US-NY', 'New York', 'US', 'disabled'),
  ('US-RI', 'Rhode Island', 'US', 'disabled')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.jurisdiction_versions (
  jurisdiction_code, version, status, effective_from, review_due,
  terminology, planning_rules, role_labels, privacy_requirements, notes
) VALUES (
  'US-CT', 1, 'active', '2026-07-01', '2027-07-01',
  jsonb_build_object(
    'plan_meeting', 'PPT',
    'plan_meeting_long', 'Planning and Placement Team meeting',
    'plan_document', 'IEP',
    'transition_plan_section', 'Secondary Transition Plan',
    'rights_transfer_age', 18,
    'transition_planning_start_age', 14,
    'services_end_age', 22,
    'vr_agency_short', 'BRS'
  ),
  jsonb_build_object(
    'transition_assessment_required', true,
    'annual_review_months', 12,
    'reevaluation_years', 3,
    'invite_student_from_age', 14,
    'agency_invite_requires_consent', true,
    'summary_of_performance_required_at_exit', true
  ),
  jsonb_build_object(
    'case_manager', 'Case Manager',
    'transition_coordinator', 'Transition Coordinator',
    'counselor', 'School Counselor',
    'district_admin', 'District Administrator',
    'school_admin', 'School Administrator'
  ),
  jsonb_build_object(
    'student_records_law', 'FERPA',
    'state_supplement', 'CT General Statutes Sec. 10-76',
    'parent_consent_required_for_agency_referral', true,
    'record_retention_after_exit_years', 6
  ),
  'Baseline Connecticut pack. Reviewed against CSDE secondary transition guidance.'
) ON CONFLICT (jurisdiction_code, version) DO NOTHING;

INSERT INTO public.jurisdiction_agencies (version_id, name, kind, url, description, sort_order)
SELECT v.id, a.name, a.kind, a.url, a.description, a.sort_order
FROM public.jurisdiction_versions v,
LATERAL (VALUES
  ('Connecticut State Department of Education', 'education', 'https://portal.ct.gov/sde', 'Oversees special education and secondary transition requirements.', 10),
  ('Bureau of Rehabilitation Services (BRS)', 'vocational_rehabilitation', 'https://portal.ct.gov/dors', 'Vocational rehabilitation and pre-employment transition services.', 20),
  ('Department of Developmental Services (DDS)', 'developmental_services', 'https://portal.ct.gov/dds', 'Adult services eligibility and supports for qualifying individuals.', 30),
  ('Board of Education and Services for the Blind (BESB)', 'sensory_services', 'https://portal.ct.gov/besb', 'Services for students who are blind or visually impaired.', 40),
  ('Connecticut Parent Advocacy Center (CPAC)', 'family_support', 'https://cpacinc.org', 'Statewide parent training and information center.', 50)
) AS a(name, kind, url, description, sort_order)
WHERE v.jurisdiction_code = 'US-CT' AND v.version = 1;

INSERT INTO public.jurisdiction_sources (version_id, title, url, publisher, official, last_verified_at, review_due)
SELECT v.id, s.title, s.url, s.publisher, true, now(), '2027-07-01'::date
FROM public.jurisdiction_versions v,
LATERAL (VALUES
  ('CT Secondary Transition Resources', 'https://portal.ct.gov/sde/special-education/secondary-transition', 'CSDE'),
  ('IDEA Part B Secondary Transition Requirements', 'https://sites.ed.gov/idea/regs/b/d/300.320/b', 'US Dept. of Education'),
  ('CT Bureau of Rehabilitation Services Pre-ETS', 'https://portal.ct.gov/dors/service-programs/pre-employment-transition-services', 'CT DORS')
) AS s(title, url, publisher)
WHERE v.jurisdiction_code = 'US-CT' AND v.version = 1;

-- ============ 2. Entitlement audit trail ============
CREATE TABLE public.entitlement_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  license_type text,
  allocation_id uuid,
  pool_id uuid,
  reason text NOT NULL CHECK (length(btrim(reason)) >= 10),
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entitlement_audit_org ON public.entitlement_audit_events(organization_id, created_at DESC);
GRANT SELECT ON public.entitlement_audit_events TO authenticated;
GRANT ALL ON public.entitlement_audit_events TO service_role;
ALTER TABLE public.entitlement_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org admins read their entitlement audit trail"
  ON public.entitlement_audit_events FOR SELECT TO authenticated
  USING (
    public.is_platform_admin(auth.uid())
    OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
  );

CREATE OR REPLACE FUNCTION public.tg_entitlement_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Entitlement audit events are immutable' USING ERRCODE = '42501';
END;
$$;
CREATE TRIGGER entitlement_audit_no_update BEFORE UPDATE ON public.entitlement_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_entitlement_audit_immutable();
CREATE TRIGGER entitlement_audit_no_delete BEFORE DELETE ON public.entitlement_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_entitlement_audit_immutable();

CREATE OR REPLACE FUNCTION public.record_entitlement_audit(
  _event text,
  _reason text,
  _organization_id uuid DEFAULT NULL,
  _subject_user_id uuid DEFAULT NULL,
  _license_type text DEFAULT NULL,
  _allocation_id uuid DEFAULT NULL,
  _pool_id uuid DEFAULT NULL,
  _before jsonb DEFAULT NULL,
  _after jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF _organization_id IS NOT NULL
     AND NOT (public.is_org_admin(auth.uid(), _organization_id)
              OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized for this organization' USING ERRCODE = '42501';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 10 THEN
    RAISE EXCEPTION 'A written reason of at least 10 characters is required'
      USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.entitlement_audit_events (
    actor_id, organization_id, subject_user_id, event, license_type,
    allocation_id, pool_id, reason, before_state, after_state
  ) VALUES (
    auth.uid(), _organization_id, _subject_user_id, _event, _license_type,
    _allocation_id, _pool_id, btrim(_reason), _before, _after
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.record_entitlement_audit(text,text,uuid,uuid,text,uuid,uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_entitlement_audit(text,text,uuid,uuid,text,uuid,uuid,jsonb,jsonb) TO authenticated, service_role;

-- ============ 3. District umbrella routing ============
-- A school covered by its district's plan draws staff/admin/pathway coverage
-- from the district pool, so the same employee is never billed twice.
CREATE OR REPLACE FUNCTION public.sponsoring_org_for(_org_id uuid, _license_type text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT parent.id
       FROM public.organizations child
       JOIN public.organizations parent ON parent.id = child.parent_organization_id
       JOIN public.license_pools p ON p.organization_id = parent.id
      WHERE child.id = _org_id
        AND p.license_type = _license_type
        AND p.status = 'active'
        AND p.purchased > 0
        AND (p.effective_to IS NULL OR p.effective_to > now())
      LIMIT 1),
    _org_id
  );
$$;
REVOKE EXECUTE ON FUNCTION public.sponsoring_org_for(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sponsoring_org_for(uuid, text) TO authenticated, service_role;

-- One live allocation per person per license type per sponsoring org.
CREATE UNIQUE INDEX license_allocations_one_live_per_user
  ON public.license_allocations (sponsor_organization_id, license_type, beneficiary_user_id)
  WHERE state IN ('reserved','active') AND beneficiary_user_id IS NOT NULL;
CREATE UNIQUE INDEX license_allocations_one_live_per_email
  ON public.license_allocations (sponsor_organization_id, license_type, beneficiary_email)
  WHERE state IN ('reserved','active') AND beneficiary_email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.reserve_license_allocation(
  _org_id uuid,
  _license_type text,
  _beneficiary_email text DEFAULT NULL,
  _beneficiary_user_id uuid DEFAULT NULL,
  _student_id uuid DEFAULT NULL,
  _invitation_id uuid DEFAULT NULL,
  _invitation_source text DEFAULT 'admin_invite',
  _reserved_until timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_pool uuid;
  v_cap record;
  v_alloc uuid;
  v_requested uuid := _org_id;
  v_sponsor uuid;
  v_email text := lower(nullif(btrim(_beneficiary_email), ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.is_org_admin(auth.uid(), v_requested) OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only organization administrators can allocate licenses' USING ERRCODE = '42501';
  END IF;
  IF _license_type NOT IN ('pathway','staff','admin') THEN
    RAISE EXCEPTION 'Unknown license type: %', _license_type USING ERRCODE = '22023';
  END IF;

  -- District coverage takes priority: never bill a school and its district
  -- for the same person.
  v_sponsor := public.sponsoring_org_for(v_requested, _license_type);

  -- Lock every pool of this type for the sponsoring org: the serialization point.
  PERFORM 1 FROM public.license_pools
   WHERE organization_id = v_sponsor AND license_type = _license_type
   ORDER BY id FOR UPDATE;

  -- Reclaim expired reservations before measuring capacity.
  UPDATE public.license_allocations a
     SET state = 'expired', effective_to = now(), updated_at = now()
   WHERE a.state = 'reserved'
     AND a.reserved_until IS NOT NULL AND a.reserved_until < now()
     AND a.pool_id IN (SELECT id FROM public.license_pools
                        WHERE organization_id = v_sponsor AND license_type = _license_type);

  -- Already covered here (or by the district above this school)? Reuse it.
  SELECT a.id INTO v_alloc
    FROM public.license_allocations a
   WHERE a.sponsor_organization_id = v_sponsor
     AND a.license_type = _license_type
     AND a.state IN ('reserved','active')
     AND (
       (_beneficiary_user_id IS NOT NULL AND a.beneficiary_user_id = _beneficiary_user_id)
       OR (v_email IS NOT NULL AND a.beneficiary_email = v_email)
     )
   LIMIT 1;
  IF v_alloc IS NOT NULL THEN
    RETURN v_alloc;
  END IF;

  SELECT * INTO v_cap FROM public.license_capacity(v_sponsor, _license_type);
  IF v_cap.available < 1 THEN
    RAISE EXCEPTION 'No % capacity available (% purchased, % in use)',
      _license_type, v_cap.purchased, v_cap.reserved + v_cap.active
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_pool FROM public.license_pools
   WHERE organization_id = v_sponsor AND license_type = _license_type
     AND status = 'active' AND (effective_to IS NULL OR effective_to > now())
   ORDER BY effective_from
   LIMIT 1;
  IF v_pool IS NULL THEN
    RAISE EXCEPTION 'No active license pool for %', _license_type USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.license_allocations (
    pool_id, sponsor_organization_id, sponsor_user_id, license_type, state,
    beneficiary_user_id, beneficiary_email, student_id, invitation_id,
    invitation_source, reserved_until, created_by, notes
  ) VALUES (
    v_pool, v_sponsor, auth.uid(), _license_type, 'reserved',
    _beneficiary_user_id, v_email, _student_id, _invitation_id,
    _invitation_source, COALESCE(_reserved_until, now() + interval '14 days'), auth.uid(),
    CASE WHEN v_sponsor <> v_requested
      THEN 'Covered by district umbrella license'
      ELSE NULL END
  ) RETURNING id INTO v_alloc;

  RETURN v_alloc;
END;
$$;

-- ============ 4. One-time Pathway Snapshot ============
INSERT INTO public.plans (
  code, name, description, billing_scope, stripe_product_id,
  one_time_price_id, term_months, auto_convert, sales_assisted, is_addon,
  sort_order, active, entitlement_plan_type
) VALUES (
  'pathway_snapshot',
  'Pathway Snapshot',
  'One-time transition pathway report for a single student. Point-in-time only — no ongoing monitoring, updates, or collaboration.',
  'individual', 'tf_snapshot', 'tf_snapshot_once', NULL, false, false, false,
  5, true, 'pathway_snapshot'
) ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      one_time_price_id = EXCLUDED.one_time_price_id,
      entitlement_plan_type = EXCLUDED.entitlement_plan_type,
      updated_at = now();