
-- Seed: [E2E] Nutmeg Public Schools fictional tenant (Workstream 6 provisioning proof)
-- All rows prefixed [E2E] or with codes prefixed NUTMEG- for easy identification/removal.
-- Owned by existing platform_owner (0b0264e6-6179-4fc9-80d6-c7d8cf0dae8d).

DO $$
DECLARE
  v_owner uuid := '0b0264e6-6179-4fc9-80d6-c7d8cf0dae8d';
  v_district uuid;
  v_school_hs uuid;
  v_school_ms uuid;
  v_school_es uuid;
  v_partner uuid;
BEGIN
  -- District
  INSERT INTO public.organizations (name, type, state, city, verified_status, status, billing_plan)
  VALUES ('[E2E] Nutmeg Public Schools', 'district', 'CT', 'Nutmeg', 'verified', 'active', 'pilot')
  RETURNING id INTO v_district;

  -- Schools (children of district)
  INSERT INTO public.organizations (name, type, state, city, verified_status, status, parent_organization_id)
  VALUES ('[E2E] Nutmeg High School', 'school', 'CT', 'Nutmeg', 'verified', 'active', v_district)
  RETURNING id INTO v_school_hs;

  INSERT INTO public.organizations (name, type, state, city, verified_status, status, parent_organization_id)
  VALUES ('[E2E] Nutmeg Middle School', 'school', 'CT', 'Nutmeg', 'verified', 'active', v_district)
  RETURNING id INTO v_school_ms;

  INSERT INTO public.organizations (name, type, state, city, verified_status, status, parent_organization_id)
  VALUES ('[E2E] Nutmeg Elementary School', 'school', 'CT', 'Nutmeg', 'verified', 'active', v_district)
  RETURNING id INTO v_school_es;

  -- District-wide entitlement (pilot)
  INSERT INTO public.access_entitlements
    (organization_id, plan_type, status, grants_family_access, grants_student_access, grants_partner_access, starts_at, ends_at)
  VALUES
    (v_district, 'district_pilot', 'pilot', true, true, false, now(), now() + interval '365 days');

  -- Partner organization
  INSERT INTO public.partner_organizations
    (organization_name, partner_type, state, city, county, description, contact_email,
     audience_served, disability_focus, pathway_categories, services_offered, opportunity_types,
     verification_status, partnership_status, is_public, is_featured)
  VALUES
    ('[E2E] Nutmeg Community Employment Alliance', 'employer', 'CT', 'Nutmeg', 'Hartford',
     'Fictional partner org for E2E provisioning tests.', 'e2e-partner@example.invalid',
     ARRAY['transition_age_youth','young_adults']::text[],
     ARRAY['autism','learning_disabilities','intellectual_disability']::text[],
     ARRAY['employment','independent_living']::text[],
     ARRAY['job_coaching','internships','skills_training']::text[],
     ARRAY['internship','part_time_job','job_shadow']::text[],
     'verified', 'active_partner', true, false)
  RETURNING id INTO v_partner;

  -- Approved license request tied to the district (audit trail for provisioning flow)
  INSERT INTO public.org_license_requests
    (org_type, requester_user_id, org_name, contact_email, contact_name,
     seat_count, status, notes, reviewed_by, reviewed_at, approved_org_id)
  VALUES
    ('district', v_owner, '[E2E] Nutmeg Public Schools', 'e2e-request@example.invalid',
     'Alex Fictional', 250, 'approved',
     'Seeded for E2E provisioning workstream. Not a real request.',
     v_owner, now(), v_district);

  -- Access codes (all rooted at NUTMEG- so easy to filter/revoke).
  -- Real codes are shown here in comments; only the sha256 hash is stored.
  --   NUTMEG-EDU-2026 -> educator, district scope, capacity 25
  --   NUTMEG-FAM-2026 -> family, district scope, capacity 500, single_use=false
  --   NUTMEG-STU-2026 -> student, district scope, capacity 500
  --   NUTMEG-ADM-2026 -> school_admin, district scope, capacity 5, expires in 90d
  INSERT INTO public.access_codes
    (code_hash, org_id, role, scope, capacity, single_use, expires_at, created_by)
  VALUES
    (encode(digest('NUTMEG-EDU-2026', 'sha256'), 'hex'), v_district, 'educator',     'district',  25, false, now() + interval '180 days', v_owner),
    (encode(digest('NUTMEG-FAM-2026', 'sha256'), 'hex'), v_district, 'family',       'district', 500, false, now() + interval '365 days', v_owner),
    (encode(digest('NUTMEG-STU-2026', 'sha256'), 'hex'), v_district, 'student',      'district', 500, false, now() + interval '365 days', v_owner),
    (encode(digest('NUTMEG-ADM-2026', 'sha256'), 'hex'), v_district, 'school_admin', 'district',   5, true,  now() + interval '90 days',  v_owner);

  -- Invitations covering each pathway
  INSERT INTO public.invitations
    (email, invited_role, invited_by_user_id, organization_id,
     invitation_type, status, token, expires_at, message)
  VALUES
    ('e2e-educator@example.invalid',     'educator',     v_owner, v_school_hs, 'join_school',        'pending', 'nutmeg-e2e-educator-'     || encode(gen_random_bytes(16), 'hex'), now() + interval '30 days', '[E2E] Join Nutmeg High as educator.'),
    ('e2e-admin@example.invalid',        'school_admin', v_owner, v_school_ms, 'join_school',        'pending', 'nutmeg-e2e-admin-'        || encode(gen_random_bytes(16), 'hex'), now() + interval '30 days', '[E2E] Join Nutmeg Middle as admin.'),
    ('e2e-district-admin@example.invalid','district_admin', v_owner, v_district,'join_district',     'pending', 'nutmeg-e2e-district-'     || encode(gen_random_bytes(16), 'hex'), now() + interval '30 days', '[E2E] Join Nutmeg district.'),
    ('e2e-partner-lead@example.invalid', 'partner',      v_owner, NULL,        'join_partner_org',   'pending', 'nutmeg-e2e-partner-'      || encode(gen_random_bytes(16), 'hex'), now() + interval '30 days', '[E2E] Join Nutmeg Community Employment Alliance.');

END $$;
