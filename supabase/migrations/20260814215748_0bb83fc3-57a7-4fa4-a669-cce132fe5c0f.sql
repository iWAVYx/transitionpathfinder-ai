
-- 1) Gate student document downloads on a clean AV verdict
CREATE OR REPLACE FUNCTION public.storage_can_read_student_doc(_user_id uuid, _path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid; v_doc_id uuid; v_doc_student uuid;
  v_archived timestamptz; v_deleted timestamptz;
  v_scan text; v_uploaded_by uuid;
BEGIN
  IF public.is_partner_only(_user_id) THEN RETURN false; END IF;
  BEGIN
    v_student_id := ((storage.foldername(_path))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  SELECT id, student_id, archived_at, deleted_at, scan_status, uploaded_by
    INTO v_doc_id, v_doc_student, v_archived, v_deleted, v_scan, v_uploaded_by
    FROM public.documents WHERE storage_path = _path LIMIT 1;
  IF v_doc_id IS NULL THEN
    RETURN public.can_edit_student(_user_id, v_student_id);
  END IF;
  -- Reject rows whose declared student doesn't match the folder in the path.
  IF v_doc_student IS DISTINCT FROM v_student_id THEN
    RETURN public.has_recent_admin_doc_access(_user_id, v_doc_id);
  END IF;
  -- Quarantine gate: bytes are only readable once the AV scan says clean.
  -- Uploader and platform admins may still access for review/removal.
  IF v_scan IS DISTINCT FROM 'clean' THEN
    RETURN (_user_id = v_uploaded_by)
        OR public.is_platform_admin(_user_id)
        OR public.has_recent_admin_doc_access(_user_id, v_doc_id);
  END IF;
  IF v_deleted IS NOT NULL THEN
    RETURN public.has_recent_admin_doc_access(_user_id, v_doc_id);
  END IF;
  IF v_archived IS NOT NULL THEN
    RETURN public.can_edit_student(_user_id, v_student_id)
        OR public.has_recent_admin_doc_access(_user_id, v_doc_id);
  END IF;
  RETURN public.can_access_student(_user_id, v_student_id)
      OR public.can_view_document(_user_id, v_doc_id)
      OR public.has_recent_admin_doc_access(_user_id, v_doc_id);
END;
$$;

-- 2) documents table: only expose non-clean rows to uploader / admins
DROP POLICY IF EXISTS documents_select_active ON public.documents;
CREATE POLICY documents_select_active ON public.documents
FOR SELECT TO authenticated
USING (
  archived_at IS NULL
  AND deleted_at IS NULL
  AND NOT is_partner_only(auth.uid())
  AND (can_access_student(auth.uid(), student_id) OR can_view_document(auth.uid(), id))
  AND (
    scan_status = 'clean'
    OR auth.uid() = uploaded_by
    OR is_platform_admin(auth.uid())
  )
);

-- 3) audit_log: actor_email must match the authenticated user's email (or be null)
DROP POLICY IF EXISTS "Authenticated inserts audit for self" ON public.audit_log;
CREATE POLICY "Authenticated inserts audit for self" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = actor_id
  AND (
    actor_email IS NULL
    OR lower(actor_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);
