
DROP POLICY IF EXISTS "Owners insert students" ON public.students;
CREATE POLICY "Owners insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (true);
