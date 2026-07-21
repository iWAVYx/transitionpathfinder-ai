DROP POLICY IF EXISTS "Editors invite collaborators" ON public.student_collaborators;
CREATE POLICY "Editors invite collaborators"
ON public.student_collaborators
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_edit_student(auth.uid(), student_id)
  AND auth.uid() = invited_by
  AND status = 'pending'
  AND user_id IS NULL
);