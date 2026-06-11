
DO $$ BEGIN
  CREATE TYPE public.document_extraction_status AS ENUM ('pending','needs_review','in_review','complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.document_extraction_status NOT NULL DEFAULT 'needs_review',
  raw_extract jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  missing_information text[] NOT NULL DEFAULT '{}',
  suggested_questions text[] NOT NULL DEFAULT '{}',
  review_notes text,
  reviewer_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (document_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_extractions TO authenticated;
GRANT ALL ON public.document_extractions TO service_role;

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extractions_select_via_student"
  ON public.document_extractions FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "extractions_insert_via_student"
  ON public.document_extractions FOR INSERT TO authenticated
  WITH CHECK (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "extractions_update_via_student"
  ON public.document_extractions FOR UPDATE TO authenticated
  USING (public.can_access_student(auth.uid(), student_id))
  WITH CHECK (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "extractions_delete_via_student"
  ON public.document_extractions FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER document_extractions_set_updated_at
  BEFORE UPDATE ON public.document_extractions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS document_extractions_student_idx ON public.document_extractions(student_id);
