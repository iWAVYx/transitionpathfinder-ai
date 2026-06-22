DROP POLICY IF EXISTS "Authenticated can read partner directory" ON public.partner_organizations;

CREATE POLICY "Authenticated can read public partner directory"
ON public.partner_organizations
FOR SELECT
TO authenticated
USING (is_public = true OR public.is_platform_admin(auth.uid()));