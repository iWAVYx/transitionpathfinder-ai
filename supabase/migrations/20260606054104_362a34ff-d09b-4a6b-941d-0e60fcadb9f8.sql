DROP POLICY IF EXISTS "Update own notes" ON public.collaboration_notes;
DROP POLICY IF EXISTS "Delete own notes" ON public.collaboration_notes;

CREATE POLICY "Update own notes with edit access"
ON public.collaboration_notes
FOR UPDATE
TO authenticated
USING (created_by_user_id = auth.uid() AND can_edit_student(auth.uid(), student_id))
WITH CHECK (created_by_user_id = auth.uid() AND can_edit_student(auth.uid(), student_id));

CREATE POLICY "Delete own notes with edit access"
ON public.collaboration_notes
FOR DELETE
TO authenticated
USING (created_by_user_id = auth.uid() AND can_edit_student(auth.uid(), student_id));