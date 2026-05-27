
-- Replace the "always true" waitlist insert policy with explicit validation
DROP POLICY "Anyone can submit to waitlist" ON public.waitlist;
CREATE POLICY "Anyone can submit to waitlist" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(email) BETWEEN 3 AND 255
    AND length(full_name) BETWEEN 1 AND 200
    AND length(role) BETWEEN 1 AND 50
    AND (state IS NULL OR length(state) <= 100)
    AND (student_grade_band IS NULL OR length(student_grade_band) <= 50)
    AND (reason IS NULL OR length(reason) <= 2000)
  );

-- Lock down has_role: callable only by authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- handle_new_user is invoked by a trigger as auth admin; revoke any direct execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
