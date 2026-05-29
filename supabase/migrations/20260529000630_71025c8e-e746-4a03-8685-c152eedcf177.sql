
-- 1. pathway_reports: allow student collaborators to view
DROP POLICY IF EXISTS "Users view own reports" ON public.pathway_reports;
CREATE POLICY "View reports via owner or student access"
  ON public.pathway_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- 2. student_intakes: allow team members via student access
DROP POLICY IF EXISTS "Users view own intakes" ON public.student_intakes;
CREATE POLICY "View intakes via owner or student access"
  ON public.student_intakes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR (student_id IS NOT NULL AND public.can_access_student(auth.uid(), student_id))
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. comments: require student_id on insert + scope SELECT to student access
DROP POLICY IF EXISTS "Insert own comments via student" ON public.comments;
CREATE POLICY "Insert own comments via student"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by_user_id
    AND student_id IS NOT NULL
    AND public.can_access_student(auth.uid(), student_id)
  );

DROP POLICY IF EXISTS "View comments via student or author" ON public.comments;
CREATE POLICY "View comments via student access"
  ON public.comments FOR SELECT
  TO authenticated
  USING (
    student_id IS NOT NULL
    AND public.can_access_student(auth.uid(), student_id)
  );

-- Backfill: delete any orphan comments with no student_id (no one could read them anyway)
DELETE FROM public.comments WHERE student_id IS NULL;
ALTER TABLE public.comments ALTER COLUMN student_id SET NOT NULL;

-- 4. Lock down SECURITY DEFINER helpers: revoke from anon/public, keep only what's needed
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- resolve_share_token and track_share_view stay callable by anon (share-link feature)
