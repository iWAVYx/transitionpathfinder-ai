
-- 1. Allow report owners/editors to update their own pathway_reports
CREATE POLICY "Owners and editors can update reports"
ON public.pathway_reports
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR (student_id IS NOT NULL AND can_edit_student(auth.uid(), student_id))
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = user_id
  OR (student_id IS NOT NULL AND can_edit_student(auth.uid(), student_id))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Let platform admins audit the email send log
CREATE POLICY "Platform admins can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- 3. Let platform admins audit the email suppression list
CREATE POLICY "Platform admins can read suppressed emails"
ON public.suppressed_emails
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));
