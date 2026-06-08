REVOKE SELECT (contact_email) ON public.organizations FROM authenticated;
REVOKE SELECT (contact_email) ON public.organizations FROM anon;
REVOKE SELECT (address) ON public.organizations FROM authenticated;
REVOKE SELECT (address) ON public.organizations FROM anon;

-- Ensure the revoke is tight by confirming no column-level grants remain
-- for these columns on the authenticated/anon roles.