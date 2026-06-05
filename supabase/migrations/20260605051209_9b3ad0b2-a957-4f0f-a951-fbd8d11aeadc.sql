
DROP POLICY IF EXISTS "Owners insert students" ON public.students;
CREATE POLICY "Owners insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP FUNCTION IF EXISTS public.diag_insert_student(uuid);
DROP FUNCTION IF EXISTS public.whoami();

-- Clean up the stray service-role test row created during the QA pass
DELETE FROM public.students WHERE first_name = 'ServiceTest' AND owner_id = '038f92be-916f-4dc9-84e4-b36f9645f5c2';
