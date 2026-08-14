-- 1. partner_organizations: remove remaining internal workflow column from authenticated
REVOKE SELECT (partnership_status) ON public.partner_organizations FROM authenticated;

-- 2. resources: replace blanket SELECT with column-level grants excluding internal notes
REVOKE SELECT ON public.resources FROM anon, authenticated;

GRANT SELECT (
  id, title, description, resource_type, audience, topic, format, grade_range,
  age_range, reading_level, location_scope, estimated_time, url, image_url,
  source_name, verified_status, created_by_user_id, created_at, updated_at,
  source_id, original_resource_url, reviewed_by_user_id, reviewed_at,
  accessibility_notes, age_appropriateness, role_relevance, pathway_relevance,
  published_status, featured, link_status, link_checked_at, review_status,
  last_reviewed_at
) ON public.resources TO anon, authenticated;
