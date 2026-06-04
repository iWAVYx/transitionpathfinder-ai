
-- 1. Tighten goal_statuses to require student access
DROP POLICY IF EXISTS "Users manage their own goal statuses (insert)" ON public.goal_statuses;
DROP POLICY IF EXISTS "Users manage their own goal statuses (update)" ON public.goal_statuses;
DROP POLICY IF EXISTS "Users manage their own goal statuses (delete)" ON public.goal_statuses;
DROP POLICY IF EXISTS "Users manage their own goal statuses (select)" ON public.goal_statuses;

CREATE POLICY "goal_statuses select own with student access"
  ON public.goal_statuses FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses insert own with student access"
  ON public.goal_statuses FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses update own with student access"
  ON public.goal_statuses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses delete own"
  ON public.goal_statuses FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Explicit deny UPDATE on user_roles (defense-in-depth against future grants)
CREATE POLICY "Block all role updates"
  ON public.user_roles FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- 3. Set search_path on remaining SECURITY DEFINER functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 4. Revoke EXECUTE on internal/email queue functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;

-- 5. Revoke EXECUTE on RLS-helper SECURITY DEFINER functions from anon
-- (still callable by authenticated, and by RLS evaluation regardless of caller grants)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_admin_role(uuid, admin_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_hub_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM anon;
