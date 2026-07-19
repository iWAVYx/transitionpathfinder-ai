-- Slice A1: Identity, org, and entitlement normalization (additive only).

-- 1) Org access audit table
CREATE TABLE IF NOT EXISTS public.org_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  organization_id uuid,
  decision text NOT NULL CHECK (decision IN ('allow','deny')),
  reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_access_audit_actor ON public.org_access_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_access_audit_resource ON public.org_access_audit(resource_type, resource_id);

GRANT SELECT ON public.org_access_audit TO authenticated;
GRANT ALL ON public.org_access_audit TO service_role;

ALTER TABLE public.org_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "actor can read own audit rows" ON public.org_access_audit;
CREATE POLICY "actor can read own audit rows"
  ON public.org_access_audit FOR SELECT
  TO authenticated
  USING (actor_id = auth.uid() OR public.is_platform_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated: writes only via service_role
-- (server functions using supabaseAdmin after verifying the caller).

-- 2) effective_org_access: every org a user can reach, incl. district->school cascade
CREATE OR REPLACE FUNCTION public.effective_org_access(_user_id uuid)
RETURNS TABLE(organization_id uuid, via text, role_within_org text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Direct memberships
  SELECT m.organization_id, 'direct'::text AS via, m.role_within_org::text
  FROM public.organization_memberships m
  WHERE m.user_id = _user_id
    AND m.status = 'active'
    AND m.membership_status = 'active'
  UNION
  -- Schools reachable via district membership
  SELECT child.id AS organization_id, 'district_cascade'::text AS via, m.role_within_org::text
  FROM public.organization_memberships m
  JOIN public.organizations parent ON parent.id = m.organization_id
  JOIN public.organizations child  ON child.parent_organization_id = parent.id
  WHERE m.user_id = _user_id
    AND m.status = 'active'
    AND m.membership_status = 'active'
    AND m.role_within_org IN ('district_admin','admin','owner');
$$;

-- 3) Partner tier gate (server-side entitlement check)
CREATE OR REPLACE FUNCTION public.partner_tier_allows(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH partner_orgs AS (
    SELECT eoa.organization_id
    FROM public.effective_org_access(_user_id) eoa
    JOIN public.organizations o ON o.id = eoa.organization_id
    WHERE o.type = 'partner' OR o.type = 'partner_organization'
  ),
  tiers AS (
    SELECT e.plan_type, e.status
    FROM public.access_entitlements e
    JOIN partner_orgs p ON p.organization_id = e.organization_id
    WHERE e.status IN ('trial','pilot','active','comped')
      AND (e.ends_at IS NULL OR e.ends_at > now())
  )
  SELECT CASE _capability
    WHEN 'publish_opportunity' THEN TRUE  -- free tier allowed baseline
    WHEN 'publish_unlimited_opportunities' THEN EXISTS (SELECT 1 FROM tiers WHERE plan_type IN ('premium','partner_premium'))
    WHEN 'view_analytics'      THEN EXISTS (SELECT 1 FROM tiers WHERE plan_type IN ('premium','partner_premium'))
    WHEN 'featured_placement'  THEN EXISTS (SELECT 1 FROM tiers WHERE plan_type IN ('premium','partner_premium'))
    ELSE FALSE
  END;
$$;

-- 4) Central authorize() entry point. Additive: existing checks continue to work.
CREATE OR REPLACE FUNCTION public.authorize(
  _user_id uuid,
  _action text,
  _resource_type text,
  _resource_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow boolean := false;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Platform admins short-circuit
  IF public.is_platform_admin(_user_id) THEN
    RETURN true;
  END IF;

  v_allow := CASE _resource_type
    WHEN 'student' THEN
      CASE _action
        WHEN 'view' THEN public.can_access_student(_user_id, _resource_id)
        WHEN 'edit' THEN public.can_edit_student(_user_id, _resource_id)
        ELSE false
      END
    WHEN 'document' THEN
      CASE _action
        WHEN 'view' THEN public.can_view_document(_user_id, _resource_id)
        ELSE false
      END
    WHEN 'organization' THEN
      CASE _action
        WHEN 'view'   THEN EXISTS (SELECT 1 FROM public.effective_org_access(_user_id) WHERE organization_id = _resource_id)
        WHEN 'manage' THEN public.is_org_admin(_user_id, _resource_id)
        ELSE false
      END
    WHEN 'partner_capability' THEN
      -- _action is the capability string; _resource_id unused
      public.partner_tier_allows(_user_id, _action)
    ELSE false
  END;

  RETURN COALESCE(v_allow, false);
END;
$$;

-- Grants on functions (STABLE + SECURITY DEFINER already; grant EXECUTE explicitly)
GRANT EXECUTE ON FUNCTION public.effective_org_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.partner_tier_allows(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.authorize(uuid, text, text, uuid) TO authenticated, service_role;