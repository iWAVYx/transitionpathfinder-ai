-- 1) Allow person-scoped entitlements
ALTER TABLE public.access_entitlements
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.access_entitlements
  ALTER COLUMN organization_id DROP NOT NULL;

ALTER TABLE public.access_entitlements
  DROP CONSTRAINT IF EXISTS access_entitlements_subject_check;
ALTER TABLE public.access_entitlements
  ADD CONSTRAINT access_entitlements_subject_check
  CHECK (num_nonnulls(organization_id, user_id) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS access_entitlements_org_plan_uidx
  ON public.access_entitlements (organization_id, plan_type)
  WHERE organization_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS access_entitlements_user_plan_uidx
  ON public.access_entitlements (user_id, plan_type)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS access_entitlements_user_idx
  ON public.access_entitlements (user_id);

-- 2) People can read their own entitlement row
DROP POLICY IF EXISTS "View my own personal entitlement" ON public.access_entitlements;
CREATE POLICY "View my own personal entitlement"
  ON public.access_entitlements FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 3) Resolution now unions org-scoped and person-scoped entitlements
CREATE OR REPLACE FUNCTION public.effective_entitlement_for_user(_user_id uuid)
RETURNS TABLE(
  organization_id uuid,
  plan_type text,
  status text,
  via_district boolean,
  grants_family_access boolean,
  grants_student_access boolean,
  grants_partner_access boolean,
  ends_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH user_orgs AS (
    SELECT m.organization_id
    FROM public.organization_memberships m
    WHERE m.user_id = _user_id AND m.membership_status = 'active'
  ),
  expanded AS (
    SELECT o.id AS org_id, false AS via_district
    FROM user_orgs u JOIN public.organizations o ON o.id = u.organization_id
    UNION
    SELECT parent.id, true
    FROM user_orgs u
    JOIN public.organizations child ON child.id = u.organization_id
    JOIN public.organizations parent ON parent.id = child.parent_organization_id
  )
  SELECT e.organization_id, e.plan_type, e.status, x.via_district,
         e.grants_family_access, e.grants_student_access, e.grants_partner_access, e.ends_at
  FROM expanded x
  JOIN public.access_entitlements e ON e.organization_id = x.org_id
  WHERE e.status IN ('trial','pilot','active','comped')
    AND (e.ends_at IS NULL OR e.ends_at > now())
  UNION ALL
  SELECT e.organization_id, e.plan_type, e.status, false,
         e.grants_family_access, e.grants_student_access, e.grants_partner_access, e.ends_at
  FROM public.access_entitlements e
  WHERE e.user_id = _user_id
    AND e.status IN ('trial','pilot','active','comped')
    AND (e.ends_at IS NULL OR e.ends_at > now());
$$;