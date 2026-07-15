
-- 1) Documents: enforce storage_path starts with student_id/
CREATE OR REPLACE FUNCTION public.tg_documents_enforce_storage_path()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.storage_path IS NOT NULL
     AND NEW.storage_path <> ''
     AND position((NEW.student_id::text || '/') in NEW.storage_path) <> 1 THEN
    RAISE EXCEPTION 'storage_path must start with student_id folder (%/)', NEW.student_id
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_enforce_storage_path ON public.documents;
CREATE TRIGGER documents_enforce_storage_path
BEFORE INSERT OR UPDATE OF storage_path, student_id ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.tg_documents_enforce_storage_path();

-- 2) Harden storage read function to require folder-embedded student_id
--    matches the document row's own student_id.
CREATE OR REPLACE FUNCTION public.storage_can_read_student_doc(_user_id uuid, _path text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_student_id uuid; v_doc_id uuid; v_doc_student uuid;
  v_archived timestamptz; v_deleted timestamptz;
BEGIN
  IF public.is_partner_only(_user_id) THEN RETURN false; END IF;
  BEGIN
    v_student_id := ((storage.foldername(_path))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  SELECT id, student_id, archived_at, deleted_at
    INTO v_doc_id, v_doc_student, v_archived, v_deleted
    FROM public.documents WHERE storage_path = _path LIMIT 1;
  IF v_doc_id IS NULL THEN
    RETURN public.can_edit_student(_user_id, v_student_id);
  END IF;
  -- Reject rows whose declared student doesn't match the folder in the path.
  IF v_doc_student IS DISTINCT FROM v_student_id THEN
    RETURN public.has_recent_admin_doc_access(_user_id, v_doc_id);
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
$function$;

-- 3) Organizations INSERT policy: restrict parent_organization_id
DROP POLICY IF EXISTS "Authenticated can create their organization" ON public.organizations;
CREATE POLICY "Authenticated can create their organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND verified_status = 'pending'
  AND (
    parent_organization_id IS NULL
    OR public.is_org_admin(auth.uid(), parent_organization_id)
  )
);

-- 4) Media assets: restrict SELECT to platform admins
DROP POLICY IF EXISTS "Public can view media metadata" ON public.media_assets;
CREATE POLICY "Platform admins can view media metadata"
ON public.media_assets
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));
