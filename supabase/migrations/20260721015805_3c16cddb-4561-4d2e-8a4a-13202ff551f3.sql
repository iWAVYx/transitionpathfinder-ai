-- Slice D: Structured records need mutability so assignees/promoters/admins
-- can move actions through their lifecycle. Existing policies only cover
-- INSERT (promote) and SELECT (view).

CREATE POLICY "Assignees and admins update actions"
  ON public.channel_actions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_channel_member(auth.uid(), channel_id)
    AND (
      assignee_user_id = auth.uid()
      OR promoted_by = auth.uid()
      OR public.is_channel_admin(auth.uid(), channel_id)
    )
  )
  WITH CHECK (
    public.is_channel_member(auth.uid(), channel_id)
    AND (
      assignee_user_id = auth.uid()
      OR promoted_by = auth.uid()
      OR public.is_channel_admin(auth.uid(), channel_id)
    )
  );

CREATE POLICY "Promoters and admins delete actions"
  ON public.channel_actions
  FOR DELETE
  TO authenticated
  USING (
    public.is_channel_member(auth.uid(), channel_id)
    AND (
      promoted_by = auth.uid()
      OR public.is_channel_admin(auth.uid(), channel_id)
    )
  );