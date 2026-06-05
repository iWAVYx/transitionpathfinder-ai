-- 1. SELECT policy: owners read directly; collaborators/admins still go through the function.
DROP POLICY IF EXISTS "Owners and collaborators view students" ON public.students;
CREATE POLICY "Owners and collaborators view students" ON public.students
  FOR SELECT TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.can_access_student(auth.uid(), id)
  );

-- 2. UPDATE policy: same short-circuit so owner edits don't trip on RETURNING.
DROP POLICY IF EXISTS "Editors update students" ON public.students;
CREATE POLICY "Editors update students" ON public.students
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.can_edit_student(auth.uid(), id)
  )
  WITH CHECK (
    auth.uid() = owner_id
    OR public.can_edit_student(auth.uid(), id)
  );

-- 3. Restore the strict INSERT check.
DROP POLICY IF EXISTS "Owners insert students" ON public.students;
CREATE POLICY "Owners insert students" ON public.students
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- 4. Clean up diagnostic helpers and any leftover test rows.
DROP FUNCTION IF EXISTS public.debug_try_insert_student();
DROP FUNCTION IF EXISTS public.debug_auth_uid();
DELETE FROM public.students
  WHERE first_name IN ('NoRepTest','RLSTest','RLSTest2','WideOpenTest','DiagInsert','DiagTest','DiagTest2','DiagTest3','SvcTest','Diag','Diag2','ServiceTest');