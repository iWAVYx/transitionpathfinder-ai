
-- Safe UUID parser for storage path folder (returns NULL on malformed paths)
CREATE OR REPLACE FUNCTION public.safe_channel_id_from_path(_path text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, storage
AS $$
DECLARE v_id uuid;
BEGIN
  BEGIN
    v_id := ((storage.foldername(_path))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  RETURN v_id;
END;
$$;

-- Rewrite channel-attachments storage policies to validate UUID safely
DROP POLICY IF EXISTS channel_attachments_select ON storage.objects;
DROP POLICY IF EXISTS channel_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS channel_attachments_delete ON storage.objects;

CREATE POLICY channel_attachments_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'channel-attachments'
    AND public.safe_channel_id_from_path(name) IS NOT NULL
    AND public.is_channel_member(auth.uid(), public.safe_channel_id_from_path(name))
  );

CREATE POLICY channel_attachments_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'channel-attachments'
    AND owner = auth.uid()
    AND public.safe_channel_id_from_path(name) IS NOT NULL
    AND public.is_channel_member(auth.uid(), public.safe_channel_id_from_path(name))
  );

CREATE POLICY channel_attachments_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'channel-attachments'
    AND public.safe_channel_id_from_path(name) IS NOT NULL
    AND (
      owner = auth.uid()
      OR public.is_channel_admin(auth.uid(), public.safe_channel_id_from_path(name))
    )
  );

-- Restrict document_permissions.role_type to vetted audience values
ALTER TABLE public.document_permissions
  DROP CONSTRAINT IF EXISTS document_permissions_role_type_chk;

ALTER TABLE public.document_permissions
  ADD CONSTRAINT document_permissions_role_type_chk
  CHECK (
    role_type IS NULL
    OR role_type IN ('student','parent','guardian','educator','teacher','case_manager','school_admin','district_admin')
  );
