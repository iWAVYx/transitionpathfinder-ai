
-- 1) student_collaborators: restrict broad SELECT to editors/owners
DROP POLICY IF EXISTS "View collaborators of accessible students" ON public.student_collaborators;
CREATE POLICY "View collaborators of editable students"
  ON public.student_collaborators FOR SELECT
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

-- 2) student_guardians: restrict broad SELECT to editors/owners
DROP POLICY IF EXISTS "Access guardians via student" ON public.student_guardians;
CREATE POLICY "Edit-access guardians via student"
  ON public.student_guardians FOR SELECT
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

-- 3) student_team_members: restrict broad SELECT to editors/owners
DROP POLICY IF EXISTS "Access team via student" ON public.student_team_members;
CREATE POLICY "Edit-access team via student"
  ON public.student_team_members FOR SELECT
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

-- 4) organizations.contact_email: revoke column SELECT from anon/authenticated.
-- Authorized reads go through service_role (platform admin, verified org members).
REVOKE SELECT (contact_email) ON public.organizations FROM authenticated;
REVOKE SELECT (contact_email) ON public.organizations FROM anon;

-- 5) partner_opportunities.contact_email: revoke column SELECT from anon/authenticated.
REVOKE SELECT (contact_email) ON public.partner_opportunities FROM authenticated;
REVOKE SELECT (contact_email) ON public.partner_opportunities FROM anon;
