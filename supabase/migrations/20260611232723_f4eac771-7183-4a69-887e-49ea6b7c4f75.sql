
-- 1. Document metadata columns (additive, all nullable)
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS school_year text,
  ADD COLUMN IF NOT EXISTS meeting_date date,
  ADD COLUMN IF NOT EXISTS effective_date date,
  ADD COLUMN IF NOT EXISTS review_date date,
  ADD COLUMN IF NOT EXISTS consent_acknowledged_at timestamptz;

-- 2. Permission level enum
DO $$ BEGIN
  CREATE TYPE public.document_permission_level AS ENUM
    ('none','view_summary','view_document','edit_metadata','manage');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. document_permissions table
CREATE TABLE IF NOT EXISTS public.document_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type text,
  permission_level public.document_permission_level NOT NULL DEFAULT 'view_document',
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT document_permissions_subject_chk
    CHECK ((user_id IS NOT NULL) <> (role_type IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS document_permissions_user_uniq
  ON public.document_permissions(document_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS document_permissions_role_uniq
  ON public.document_permissions(document_id, role_type) WHERE role_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS document_permissions_student_idx
  ON public.document_permissions(student_id);

-- 4. GRANTs (auth-only; no anon)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_permissions TO authenticated;
GRANT ALL ON public.document_permissions TO service_role;

-- 5. Updated-at trigger
DROP TRIGGER IF EXISTS set_document_permissions_updated_at ON public.document_permissions;
CREATE TRIGGER set_document_permissions_updated_at
  BEFORE UPDATE ON public.document_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Security-definer access check
CREATE OR REPLACE FUNCTION public.can_view_document(_user_id uuid, _document_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = _document_id
      AND (
        public.can_access_student(_user_id, d.student_id)
        OR EXISTS (
          SELECT 1 FROM public.document_permissions p
          WHERE p.document_id = d.id
            AND p.permission_level <> 'none'
            AND (
              p.user_id = _user_id
              OR (p.role_type IS NOT NULL AND public.has_audience(_user_id, p.role_type))
            )
        )
      )
  );
$$;

-- 7. RLS on document_permissions
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_permissions_select" ON public.document_permissions;
CREATE POLICY "document_permissions_select"
  ON public.document_permissions FOR SELECT TO authenticated
  USING (
    public.can_access_student(auth.uid(), student_id)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "document_permissions_insert" ON public.document_permissions;
CREATE POLICY "document_permissions_insert"
  ON public.document_permissions FOR INSERT TO authenticated
  WITH CHECK (
    granted_by = auth.uid()
    AND public.can_edit_student(auth.uid(), student_id)
  );

DROP POLICY IF EXISTS "document_permissions_update" ON public.document_permissions;
CREATE POLICY "document_permissions_update"
  ON public.document_permissions FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id))
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "document_permissions_delete" ON public.document_permissions;
CREATE POLICY "document_permissions_delete"
  ON public.document_permissions FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));
