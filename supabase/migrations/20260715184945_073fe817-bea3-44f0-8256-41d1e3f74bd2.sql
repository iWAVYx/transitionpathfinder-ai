DROP POLICY IF EXISTS "Authed users create resources" ON public.resources;

CREATE POLICY "Authed users create resources"
ON public.resources
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by_user_id
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (
      COALESCE(published_status, 'draft') = 'draft'
      AND COALESCE(verified_status, 'pending') = 'pending'
      AND COALESCE(featured, false) = false
    )
  )
);

DROP POLICY IF EXISTS "Owners or admins update resources" ON public.resources;

CREATE POLICY "Owners or admins update resources"
ON public.resources
FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by_user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    auth.uid() = created_by_user_id
    AND COALESCE(published_status, 'draft') = 'draft'
    AND COALESCE(verified_status, 'pending') = 'pending'
    AND COALESCE(featured, false) = false
  )
);