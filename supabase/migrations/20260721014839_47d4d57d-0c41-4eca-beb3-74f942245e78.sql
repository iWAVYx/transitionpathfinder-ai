
-- Path convention: {channel_id}/{message_id_or_draft}/{uuid}-{filename}
-- Authorization is derived from the first path segment (the channel id).

DROP POLICY IF EXISTS "channel_attachments_select" ON storage.objects;
CREATE POLICY "channel_attachments_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'channel-attachments'
  AND public.is_channel_member(
    (string_to_array(name, '/'))[1]::uuid,
    auth.uid()
  )
);

DROP POLICY IF EXISTS "channel_attachments_insert" ON storage.objects;
CREATE POLICY "channel_attachments_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'channel-attachments'
  AND owner = auth.uid()
  AND public.is_channel_member(
    (string_to_array(name, '/'))[1]::uuid,
    auth.uid()
  )
);

DROP POLICY IF EXISTS "channel_attachments_delete" ON storage.objects;
CREATE POLICY "channel_attachments_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'channel-attachments'
  AND (
    owner = auth.uid()
    OR public.is_channel_admin(
      (string_to_array(name, '/'))[1]::uuid,
      auth.uid()
    )
  )
);
