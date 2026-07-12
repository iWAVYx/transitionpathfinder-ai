DROP POLICY IF EXISTS "Create invitations when authorized" ON public.invitations;

CREATE POLICY "Create invitations when authorized"
ON public.invitations
FOR INSERT
WITH CHECK (
  (invited_by_user_id = auth.uid())
  AND (invited_role NOT IN ('admin','platform_admin','platform_owner','owner'))
  AND (
    is_platform_admin(auth.uid())
    OR ((organization_id IS NOT NULL) AND is_org_admin(auth.uid(), organization_id))
    OR ((student_profile_id IS NOT NULL) AND can_edit_student(auth.uid(), student_profile_id))
  )
);

-- Also update UPDATE policy to prevent changing invited_role to a privileged value after creation
DROP POLICY IF EXISTS "Update own invitations or platform admin" ON public.invitations;

CREATE POLICY "Update own invitations or platform admin"
ON public.invitations
FOR UPDATE
USING ((invited_by_user_id = auth.uid()) OR is_platform_admin(auth.uid()))
WITH CHECK (
  ((invited_by_user_id = auth.uid()) OR is_platform_admin(auth.uid()))
  AND (is_platform_admin(auth.uid()) OR invited_role NOT IN ('admin','platform_admin','platform_owner','owner'))
);