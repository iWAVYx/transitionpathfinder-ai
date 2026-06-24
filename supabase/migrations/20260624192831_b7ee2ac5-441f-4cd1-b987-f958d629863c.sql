-- GRANTs: Data API was previously unreachable on these tables.
GRANT SELECT ON public.resources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;

GRANT SELECT ON public.resource_sources TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_sources TO authenticated;
GRANT ALL ON public.resource_sources TO service_role;

-- Narrow public SELECT policy on resources: only published/featured/approved rows.
DROP POLICY IF EXISTS "Public reads published resources" ON public.resources;
CREATE POLICY "Public reads published resources"
ON public.resources
FOR SELECT
TO anon, authenticated
USING (published_status IN ('published', 'featured', 'approved'));

-- Narrow public SELECT policy on resource_sources: non-archived only.
DROP POLICY IF EXISTS "Public reads non-archived sources" ON public.resource_sources;
CREATE POLICY "Public reads non-archived sources"
ON public.resource_sources
FOR SELECT
TO anon, authenticated
USING (review_status <> 'archived');