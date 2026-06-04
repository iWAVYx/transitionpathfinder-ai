
-- Let an invited user see their own invitation row even before it's "accepted"
CREATE POLICY "View my own collaborator invites"
ON public.student_collaborators
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Let an invited user accept their own pending invite (status only)
CREATE POLICY "Accept my own collaborator invite"
ON public.student_collaborators
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Backfill: any collaborator whose user_id is already known is treated as accepted.
-- Pending status only made sense pre-Lovable-Cloud where we couldn't resolve users by email.
UPDATE public.student_collaborators
SET status = 'accepted', updated_at = now()
WHERE user_id IS NOT NULL AND status = 'pending';
