-- Replace the SECURITY DEFINER view with an explicit, column-limited function.
-- The public resource directory still exposes only non-sensitive columns for
-- non-archived sources, without a definer view bypassing the querying role.
DROP VIEW IF EXISTS public.resource_sources_public;

CREATE OR REPLACE FUNCTION public.list_public_resource_sources()
RETURNS TABLE(
  id uuid,
  source_name text,
  source_url text,
  organization_name text,
  description text,
  source_type text,
  audience_focus text[],
  topic_focus text[],
  location_scope text,
  review_status text,
  last_reviewed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.id,
    s.source_name,
    s.source_url,
    s.organization_name,
    s.description,
    s.source_type,
    s.audience_focus,
    s.topic_focus,
    s.location_scope,
    s.review_status,
    s.last_reviewed_at
  FROM public.resource_sources s
  WHERE s.review_status <> 'archived'
  ORDER BY s.review_status, s.source_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_resource_sources() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_resource_sources()
  TO anon, authenticated, service_role;