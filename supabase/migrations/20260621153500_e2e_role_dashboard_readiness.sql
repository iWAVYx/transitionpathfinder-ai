WITH role_map(email, primary_role, app_role) AS (
  VALUES
    ('e2e-student@transitionforwardct.com', 'student', 'student'::public.app_role),
    ('e2e-parent@transitionforwardct.com', 'parent', 'parent'::public.app_role),
    ('e2e-educator@transitionforwardct.com', 'educator', 'educator'::public.app_role),
    ('e2e-school-admin@transitionforwardct.com', 'school_admin', 'school_admin'::public.app_role),
    ('e2e-district-admin@transitionforwardct.com', 'district_admin', 'district_admin'::public.app_role),
    ('e2e-partner@transitionforwardct.com', 'partner', 'partner'::public.app_role),
    ('e2e-owner@transitionforwardct.com', 'admin', 'admin'::public.app_role)
), updated_profiles AS (
  UPDATE public.profiles p
  SET
    primary_role = r.primary_role,
    onboarding_completed = true,
    first_name = COALESCE(NULLIF(p.first_name, ''), 'E2E'),
    last_name = COALESCE(NULLIF(p.last_name, ''), initcap(replace(r.primary_role, '_', ' '))),
    full_name = COALESCE(NULLIF(p.full_name, ''), 'E2E ' || initcap(replace(r.primary_role, '_', ' '))),
    email = COALESCE(NULLIF(p.email, ''), r.email)
  FROM role_map r
  WHERE lower(p.email) = r.email
  RETURNING p.id, p.email, r.primary_role, r.app_role
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, app_role FROM updated_profiles
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'case_manager'::public.app_role
FROM public.profiles p
WHERE lower(p.email) = 'e2e-educator@transitionforwardct.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.admin_roles (user_id, role)
SELECT p.id, 'platform_owner'::public.admin_role
FROM public.profiles p
WHERE lower(p.email) = 'e2e-owner@transitionforwardct.com'
ON CONFLICT (user_id, role) DO NOTHING;

WITH e2e_profiles AS (
  SELECT id, email, primary_role
  FROM public.profiles
  WHERE lower(email) IN (
    'e2e-student@transitionforwardct.com',
    'e2e-parent@transitionforwardct.com',
    'e2e-educator@transitionforwardct.com'
  )
)
INSERT INTO public.students (
  owner_id,
  student_user_id,
  first_name,
  last_name,
  grade_band,
  school,
  is_demo
)
SELECT
  id,
  CASE WHEN primary_role = 'student' THEN id ELSE NULL END,
  'E2E',
  CASE WHEN primary_role = 'student' THEN 'Student' ELSE 'Learner' END,
  '11-12',
  'E2E Transition School',
  true
FROM e2e_profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.students s WHERE s.owner_id = p.id AND s.is_demo = true
);

INSERT INTO public.student_guardians (
  student_id,
  guardian_user_id,
  guardian_email,
  relationship,
  is_primary,
  verified
)
SELECT s.id, p.id, p.email, p.primary_role, true, true
FROM public.profiles p
JOIN public.students s ON s.owner_id = p.id AND s.is_demo = true
WHERE lower(p.email) IN ('e2e-student@transitionforwardct.com', 'e2e-parent@transitionforwardct.com')
  AND NOT EXISTS (
    SELECT 1 FROM public.student_guardians g
    WHERE g.student_id = s.id AND g.guardian_user_id = p.id
  );

INSERT INTO public.student_team_members (
  student_id,
  member_user_id,
  member_email,
  role_on_team,
  status
)
SELECT s.id, p.id, p.email, 'case_manager', 'active'
FROM public.profiles p
JOIN public.students s ON s.owner_id = p.id AND s.is_demo = true
WHERE lower(p.email) = 'e2e-educator@transitionforwardct.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.student_team_members tm
    WHERE tm.student_id = s.id AND tm.member_user_id = p.id
  );

INSERT INTO public.student_collaborators (
  student_id,
  user_id,
  invited_email,
  role,
  status,
  invited_by,
  is_demo
)
SELECT s.id, p.id, p.email, 'editor', 'accepted', p.id, true
FROM public.profiles p
JOIN public.students s ON s.owner_id = p.id AND s.is_demo = true
WHERE lower(p.email) = 'e2e-educator@transitionforwardct.com'
ON CONFLICT (student_id, invited_email) DO NOTHING;

INSERT INTO public.organizations (name, type, city, state, verified_status, status)
SELECT 'E2E School Admin Organization', 'school', 'Hartford', 'CT', 'verified', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE name = 'E2E School Admin Organization' AND type = 'school'
);

INSERT INTO public.organizations (name, type, city, state, verified_status, status)
SELECT 'E2E District Admin Organization', 'district', 'Hartford', 'CT', 'verified', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE name = 'E2E District Admin Organization' AND type = 'district'
);

INSERT INTO public.organizations (name, type, city, state, verified_status, status)
SELECT 'E2E Partner Organization', 'partner', 'Hartford', 'CT', 'verified', 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations WHERE name = 'E2E Partner Organization' AND type = 'partner'
);

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role_within_org,
  status,
  membership_status
)
SELECT o.id, p.id, 'school_admin', 'active', 'active'
FROM public.profiles p
JOIN public.organizations o ON o.name = 'E2E School Admin Organization' AND o.type = 'school'
WHERE lower(p.email) = 'e2e-school-admin@transitionforwardct.com'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role_within_org = EXCLUDED.role_within_org,
    status = EXCLUDED.status,
    membership_status = EXCLUDED.membership_status;

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role_within_org,
  status,
  membership_status
)
SELECT o.id, p.id, 'district_admin', 'active', 'active'
FROM public.profiles p
JOIN public.organizations o ON o.name = 'E2E District Admin Organization' AND o.type = 'district'
WHERE lower(p.email) = 'e2e-district-admin@transitionforwardct.com'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role_within_org = EXCLUDED.role_within_org,
    status = EXCLUDED.status,
    membership_status = EXCLUDED.membership_status;

INSERT INTO public.organization_memberships (
  organization_id,
  user_id,
  role_within_org,
  status,
  membership_status
)
SELECT o.id, p.id, 'admin', 'active', 'active'
FROM public.profiles p
JOIN public.organizations o ON o.name = 'E2E Partner Organization' AND o.type = 'partner'
WHERE lower(p.email) = 'e2e-partner@transitionforwardct.com'
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role_within_org = EXCLUDED.role_within_org,
    status = EXCLUDED.status,
    membership_status = EXCLUDED.membership_status;
