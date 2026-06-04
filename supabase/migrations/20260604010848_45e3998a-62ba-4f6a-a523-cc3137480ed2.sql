
-- Drop the permissive UPDATE policy that lets an invitee update their own collaborator row
-- (which allowed viewer -> editor self-escalation). Replace with an owner-only policy.
DROP POLICY IF EXISTS "Invitee or owner updates collaborator" ON public.student_collaborators;
DROP POLICY IF EXISTS "Owner updates collaborator" ON public.student_collaborators;

CREATE POLICY "Owner updates collaborator"
ON public.student_collaborators
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_collaborators.student_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_collaborators.student_id
      AND s.owner_id = auth.uid()
  )
);
