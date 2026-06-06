-- organizations: drop table-wide SELECT for anon/authenticated, then grant
-- SELECT only on the non-sensitive columns. Service role keeps full access.
REVOKE SELECT ON public.organizations FROM anon, authenticated;
GRANT SELECT (
  id, name, type, address, city, state, website,
  verified_status, created_at, updated_at, parent_organization_id
) ON public.organizations TO anon, authenticated;

-- partner_opportunities: same pattern. Public/anon and authenticated lose
-- access to contact_email; everything else stays readable.
REVOKE SELECT ON public.partner_opportunities FROM anon, authenticated;
GRANT SELECT (
  id, organization_id, title, description, opportunity_type, location,
  eligibility, age_range, related_career_clusters, support_needs_fit,
  application_url, status, created_at, updated_at
) ON public.partner_opportunities TO anon, authenticated;