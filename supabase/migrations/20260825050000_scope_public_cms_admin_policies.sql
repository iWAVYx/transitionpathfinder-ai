-- Publicly readable CMS tables must not evaluate authenticated-only admin
-- helpers for anonymous visitors. Keep the existing platform-admin predicates,
-- but scope the management policies to the authenticated role that can execute
-- those helpers.

DROP POLICY IF EXISTS "Platform admins can manage blog posts"
  ON public.blog_posts;
CREATE POLICY "Platform admins can manage blog posts"
ON public.blog_posts
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage testimonials"
  ON public.testimonials;
CREATE POLICY "Platform admins can manage testimonials"
ON public.testimonials
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage page sections"
  ON public.page_sections;
CREATE POLICY "Platform admins can manage page sections"
ON public.page_sections
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage faqs"
  ON public.faqs;
CREATE POLICY "Platform admins can manage faqs"
ON public.faqs
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins can manage media"
  ON public.media_assets;
CREATE POLICY "Platform admins can manage media"
ON public.media_assets
FOR ALL
TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));
