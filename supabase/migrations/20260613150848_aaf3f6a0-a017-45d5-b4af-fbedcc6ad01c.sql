
-- Properly hide PII columns from authenticated/anon by revoking table SELECT
-- and granting SELECT only on non-PII columns.

-- partner_organizations: hide contact_email, phone, admin_notes, outreach_notes, next_follow_up_date
REVOKE SELECT ON public.partner_organizations FROM anon, authenticated;
GRANT SELECT (
  id, organization_name, partner_type, description, website_url,
  address, city, county, state, service_area, audience_served, age_range,
  disability_focus, pathway_categories, services_offered, opportunity_types,
  virtual_or_in_person, transportation_notes, eligibility_notes, referral_process,
  source_url, verification_status, partnership_status, outreach_status,
  collection_tags, tags, is_public, is_featured, last_reviewed_at,
  next_review_due_at, created_by, created_at, updated_at
) ON public.partner_organizations TO authenticated;
GRANT SELECT (
  id, organization_name, partner_type, description, website_url,
  address, city, county, state, service_area, audience_served, age_range,
  disability_focus, pathway_categories, services_offered, opportunity_types,
  virtual_or_in_person, transportation_notes, eligibility_notes, referral_process,
  source_url, verification_status, partnership_status,
  collection_tags, tags, is_public, is_featured, last_reviewed_at,
  next_review_due_at, created_at, updated_at
) ON public.partner_organizations TO anon;

-- partner_network_opportunities: hide contact_email
REVOKE SELECT ON public.partner_network_opportunities FROM anon, authenticated;
GRANT SELECT (
  id, partner_id, opportunity_title, opportunity_type, description, location,
  county, pathway_category, age_range, eligibility, support_level, schedule,
  cost_or_funding_notes, application_url, next_step, status, is_public,
  created_at, updated_at
) ON public.partner_network_opportunities TO authenticated, anon;
