-- Slice 2: Restore platform-admin audit access to counselor_scope evidence rows.
-- can_access_student only granted admin access via user_roles('admin'); platform
-- admins live in admin_roles with role IN ('platform_owner','platform_admin'),
-- so audit reads of counselor_scope rows were being blocked by the outer
-- can_access_student() clause on the evidence_items SELECT policy. Layer the
-- platform-admin audit path directly into the policy so the outer gate is
-- bypassed without loosening access for any other role.

DROP POLICY IF EXISTS "evidence_items view scoped by permission_scope" ON public.evidence_items;

CREATE POLICY "evidence_items view scoped by permission_scope"
  ON public.evidence_items
  FOR SELECT
  USING (
    public.is_platform_admin(auth.uid())
    OR (
      public.can_access_student(auth.uid(), student_id)
      AND (
        permission_scope IS DISTINCT FROM 'counselor_scope'
        OR contributor_id = auth.uid()
        OR public.is_platform_admin(auth.uid())
      )
    )
  );