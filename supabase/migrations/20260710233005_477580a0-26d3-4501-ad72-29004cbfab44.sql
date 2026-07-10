
DROP POLICY IF EXISTS "Editors create relationships" ON public.student_relationships;

CREATE POLICY "Editors create relationships"
ON public.student_relationships
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_edit_student(auth.uid(), student_id)
  AND consent_status = 'pending'
  AND related_user_id <> auth.uid()
);

-- Prevent self-approval on UPDATE: an editor can adjust the row (e.g. cancel a
-- pending invite) but cannot set consent_status='approved' for themselves. The
-- related user must approve their own row via the (related_user_id = auth.uid())
-- branch of the existing UPDATE policy.
DROP POLICY IF EXISTS "Editors or self update relationships" ON public.student_relationships;

CREATE POLICY "Editors or self update relationships"
ON public.student_relationships
FOR UPDATE
TO authenticated
USING (
  public.can_edit_student(auth.uid(), student_id)
  OR related_user_id = auth.uid()
)
WITH CHECK (
  -- The related user can approve/deny their own consent.
  (related_user_id = auth.uid())
  OR (
    -- An editor may keep managing the row, but cannot flip consent to
    -- 'approved' on someone else's behalf.
    public.can_edit_student(auth.uid(), student_id)
    AND consent_status <> 'approved'
  )
);
