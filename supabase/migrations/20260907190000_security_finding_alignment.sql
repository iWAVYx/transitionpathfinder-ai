-- Close the remaining code-level gaps from the 2026-09-07 security-finding
-- alignment review. This file is forward-only and must be applied to isolated
-- staging before it is ever considered for production.

-- A partner-only account is one whose complete app-role set contains partner
-- and no other role. Comparing every other row to partner makes this fail
-- closed when a future app_role enum value is added; a new role no longer has
-- to be remembered in a hard-coded exclusion list.
CREATE OR REPLACE FUNCTION public.is_partner_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = 'partner'::public.app_role
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role <> 'partner'::public.app_role
    );
$$;

REVOKE ALL ON FUNCTION public.is_partner_only(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_partner_only(uuid)
  TO authenticated, service_role;

-- Form templates are intentionally available to signed-in product users, but
-- a table-wide SELECT grant would silently expose any sensitive column added
-- later. Convert the grant to an explicit, reviewed column allowlist. RLS and
-- the existing authenticated-only SELECT policy remain in force.
REVOKE SELECT ON public.form_templates FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  slug,
  title,
  description,
  audience,
  category,
  schema,
  created_at,
  updated_at
) ON public.form_templates TO authenticated;
