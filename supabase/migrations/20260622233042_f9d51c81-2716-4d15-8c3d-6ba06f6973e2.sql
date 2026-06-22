-- Restrict contact_email on partner_network_opportunities to platform admins / service role only.
-- 1) Strip column-level SELECT for anon and authenticated (idempotent reaffirmation).
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM anon, authenticated, PUBLIC;

-- 2) Ensure service role retains explicit access.
GRANT SELECT (contact_email) ON public.partner_network_opportunities TO service_role;

-- 3) Provide an admin-only accessor for contact_email so platform admins can still read it
--    through a SECURITY DEFINER function (RLS cannot restrict at column level).
CREATE OR REPLACE FUNCTION public.get_partner_network_opportunity_contact_email(_opportunity_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_email
  FROM public.partner_network_opportunities
  WHERE id = _opportunity_id
    AND public.is_platform_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.get_partner_network_opportunity_contact_email(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_partner_network_opportunity_contact_email(uuid) TO authenticated, service_role;