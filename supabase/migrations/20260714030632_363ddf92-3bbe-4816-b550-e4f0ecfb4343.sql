-- Tighten UPDATE policy on student_relationships to prevent self-escalation at the RLS layer.
DROP POLICY IF EXISTS "Editors or self update relationships" ON public.student_relationships;

CREATE POLICY "Editors update relationships"
ON public.student_relationships
FOR UPDATE
USING (can_edit_student(auth.uid(), student_id))
WITH CHECK (can_edit_student(auth.uid(), student_id) AND consent_status <> 'approved');

CREATE POLICY "Related user approves own consent"
ON public.student_relationships
FOR UPDATE
USING (related_user_id = auth.uid())
WITH CHECK (
  related_user_id = auth.uid()
  AND consent_status = 'approved'
);
-- Note: the enforce_student_relationship_self_update BEFORE UPDATE trigger
-- additionally blocks changes to permission_level, relationship_type,
-- student_id, and related_user_id on the self-update path — defense in depth.