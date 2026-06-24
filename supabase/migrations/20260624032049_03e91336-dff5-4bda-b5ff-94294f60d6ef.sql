
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS uploaded_by_role text,
  ADD COLUMN IF NOT EXISTS organization_id  uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_status    text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS consent_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at      timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason   text,
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delete_reason    text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_review_status_chk') THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_review_status_chk
      CHECK (review_status IN ('pending_review','in_review','reviewed','needs_followup','rejected'));
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='download_document' AND enumtypid='public.document_permission_level'::regtype) THEN
    ALTER TYPE public.document_permission_level ADD VALUE 'download_document';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='request_summary' AND enumtypid='public.document_permission_level'::regtype) THEN
    ALTER TYPE public.document_permission_level ADD VALUE 'request_summary';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='review_document' AND enumtypid='public.document_permission_level'::regtype) THEN
    ALTER TYPE public.document_permission_level ADD VALUE 'review_document';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.document_access_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES public.students(id)  ON DELETE CASCADE,
  actor_id      uuid NOT NULL REFERENCES auth.users(id)       ON DELETE CASCADE,
  actor_role    text,
  action        text NOT NULL CHECK (action IN (
                  'view_metadata','download','preview','summarize',
                  'archive','restore','hard_delete','admin_override','upload')),
  reason        text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_access_log_doc_idx     ON public.document_access_log(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_access_log_actor_idx   ON public.document_access_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS document_access_log_student_idx ON public.document_access_log(student_id, created_at DESC);

GRANT SELECT, INSERT ON public.document_access_log TO authenticated;
GRANT ALL            ON public.document_access_log TO service_role;

ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_access_log_insert_self ON public.document_access_log;
CREATE POLICY document_access_log_insert_self ON public.document_access_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP POLICY IF EXISTS document_access_log_select_admin ON public.document_access_log;
CREATE POLICY document_access_log_select_admin ON public.document_access_log FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.admin_doc_access_grants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid NOT NULL REFERENCES auth.users(id)      ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (length(btrim(reason)) >= 8),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_doc_access_grants_lookup_idx
  ON public.admin_doc_access_grants(actor_id, document_id, expires_at DESC);

GRANT SELECT, INSERT ON public.admin_doc_access_grants TO authenticated;
GRANT ALL            ON public.admin_doc_access_grants TO service_role;

ALTER TABLE public.admin_doc_access_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_doc_access_grants_admin_select ON public.admin_doc_access_grants;
CREATE POLICY admin_doc_access_grants_admin_select ON public.admin_doc_access_grants FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS admin_doc_access_grants_admin_insert ON public.admin_doc_access_grants;
CREATE POLICY admin_doc_access_grants_admin_insert ON public.admin_doc_access_grants FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.is_platform_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.is_partner_only(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'partner')
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = _user_id
         AND role IN ('student','parent','guardian','educator','teacher','case_manager','school_admin','district_admin','admin')
     );
$$;

CREATE OR REPLACE FUNCTION public.has_recent_admin_doc_access(_user_id uuid, _document_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_admin(_user_id) AND EXISTS (
    SELECT 1 FROM public.admin_doc_access_grants
    WHERE actor_id = _user_id AND document_id = _document_id AND expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.storage_can_read_student_doc(_user_id uuid, _path text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE
  v_student_id uuid; v_doc_id uuid; v_archived timestamptz; v_deleted timestamptz;
BEGIN
  IF public.is_partner_only(_user_id) THEN RETURN false; END IF;
  BEGIN
    v_student_id := ((storage.foldername(_path))[1])::uuid;
  EXCEPTION WHEN others THEN
    RETURN false;
  END;
  SELECT id, archived_at, deleted_at INTO v_doc_id, v_archived, v_deleted
    FROM public.documents WHERE storage_path = _path LIMIT 1;
  IF v_doc_id IS NULL THEN
    RETURN public.can_edit_student(_user_id, v_student_id);
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

DROP POLICY IF EXISTS "Access docs via student"          ON public.documents;
DROP POLICY IF EXISTS "Insert docs via student"          ON public.documents;
DROP POLICY IF EXISTS "Update docs via student"          ON public.documents;
DROP POLICY IF EXISTS "Delete docs via student"          ON public.documents;
DROP POLICY IF EXISTS documents_select_active            ON public.documents;
DROP POLICY IF EXISTS documents_select_archived_editors  ON public.documents;
DROP POLICY IF EXISTS documents_select_admin_override    ON public.documents;
DROP POLICY IF EXISTS documents_insert                   ON public.documents;
DROP POLICY IF EXISTS documents_update                   ON public.documents;
DROP POLICY IF EXISTS documents_delete_platform_admin    ON public.documents;

CREATE POLICY documents_select_active ON public.documents FOR SELECT TO authenticated
  USING (
    archived_at IS NULL AND deleted_at IS NULL
    AND NOT public.is_partner_only(auth.uid())
    AND (
      public.can_access_student(auth.uid(), student_id)
      OR public.can_view_document(auth.uid(), id)
    )
  );

CREATE POLICY documents_select_archived_editors ON public.documents FOR SELECT TO authenticated
  USING (
    archived_at IS NOT NULL AND deleted_at IS NULL
    AND NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), student_id)
  );

CREATE POLICY documents_select_admin_override ON public.documents FOR SELECT TO authenticated
  USING (public.has_recent_admin_doc_access(auth.uid(), id));

CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    NOT public.is_partner_only(auth.uid())
    AND auth.uid() = uploaded_by
    AND public.can_edit_student(auth.uid(), student_id)
  );

CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
  USING (
    NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), student_id)
  )
  WITH CHECK (
    NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), student_id)
  );

CREATE POLICY documents_delete_platform_admin ON public.documents FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Access student docs via student access" ON storage.objects;
DROP POLICY IF EXISTS "Upload student docs via edit access"    ON storage.objects;
DROP POLICY IF EXISTS "Update student docs via edit access"    ON storage.objects;
DROP POLICY IF EXISTS "Delete student docs via edit access"    ON storage.objects;
DROP POLICY IF EXISTS "Read student docs"   ON storage.objects;
DROP POLICY IF EXISTS "Upload student docs" ON storage.objects;
DROP POLICY IF EXISTS "Update student docs" ON storage.objects;
DROP POLICY IF EXISTS "Delete student docs" ON storage.objects;

CREATE POLICY "Read student docs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'student-documents' AND public.storage_can_read_student_doc(auth.uid(), name));

CREATE POLICY "Upload student docs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Update student docs" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'student-documents'
    AND NOT public.is_partner_only(auth.uid())
    AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Delete student docs" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (
      public.is_platform_admin(auth.uid())
      OR (NOT public.is_partner_only(auth.uid())
          AND public.can_edit_student(auth.uid(), ((storage.foldername(name))[1])::uuid))
    )
  );
