
-- Drop the anon-accessible SELECT policy exposing notes/created_by_user_id
DROP POLICY IF EXISTS "Public reads non-archived sources" ON public.resource_sources;

-- Revoke anon SELECT on the base table
REVOKE SELECT ON public.resource_sources FROM anon;

-- Create a safe public view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.resource_sources_public
WITH (security_invoker = true) AS
SELECT
  id, source_name, source_url, organization_name, description,
  source_type, audience_focus, topic_focus, location_scope,
  review_status, last_reviewed_at
FROM public.resource_sources
WHERE review_status <> 'archived';

GRANT SELECT ON public.resource_sources_public TO anon, authenticated;

-- Keep an authenticated SELECT policy on the base table so admins/authed
-- callers that need the full row (including notes) still work.
CREATE POLICY "Authed can view non-archived sources full"
  ON public.resource_sources
  FOR SELECT
  TO authenticated
  USING (review_status <> 'archived' OR public.is_platform_admin(auth.uid()));
