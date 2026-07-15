
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS used_in_report_at timestamptz;

UPDATE public.documents SET doc_type = 'other' WHERE doc_type IS NULL OR doc_type = '';

CREATE INDEX IF NOT EXISTS documents_student_doc_type_idx ON public.documents(student_id, doc_type);
CREATE INDEX IF NOT EXISTS documents_reviewed_at_idx ON public.documents(reviewed_at) WHERE reviewed_at IS NOT NULL;
