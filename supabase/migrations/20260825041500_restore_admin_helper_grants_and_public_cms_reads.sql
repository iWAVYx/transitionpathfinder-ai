-- Restore the authenticated admin-helper contract without making either
-- helper callable by anonymous visitors. Direct RPC callers use
-- is_platform_admin, while CMS management policies use is_admin_hub_member.
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_hub_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_hub_member(uuid)
  TO authenticated, service_role;

-- Anonymous CMS reads must evaluate only publication state. Draft visibility
-- remains available to authenticated admin-hub members through the separate
-- existing management policies, which are combined permissively for SELECT.
DROP POLICY IF EXISTS "Public can view published page sections"
  ON public.page_sections;
CREATE POLICY "Public can view published page sections"
ON public.page_sections
FOR SELECT
TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Public can view published faqs"
  ON public.faqs;
CREATE POLICY "Public can view published faqs"
ON public.faqs
FOR SELECT
TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Public can view published testimonials"
  ON public.testimonials;
CREATE POLICY "Public can view published testimonials"
ON public.testimonials
FOR SELECT
TO anon, authenticated
USING (is_published = true);

DROP POLICY IF EXISTS "Public can view published blog posts"
  ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
ON public.blog_posts
FOR SELECT
TO anon, authenticated
USING (status = 'published');
