
-- 1. Add columns to students (text + CHECK so we don't introduce a new enum type unnecessarily)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS rights_status text NOT NULL DEFAULT 'unknown_needs_review',
  ADD COLUMN IF NOT EXISTS transfer_notice_acknowledged_at timestamptz;

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_rights_status_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_rights_status_check CHECK (rights_status IN (
    'under_18_parent_rights_active',
    'approaching_transfer_of_rights',
    'rights_transferred_to_student',
    'student_shared_decision_making',
    'parent_guardian_authorized_by_student',
    'legal_representative_or_conservator',
    'unknown_needs_review'
  ));

-- 2. Rights transfer status history table
CREATE TABLE IF NOT EXISTS public.rights_transfer_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  current_status text NOT NULL,
  transfer_notice_date date,
  student_authorized_parent_access boolean NOT NULL DEFAULT false,
  decision_making_notes text,
  legal_representative_notes text,
  reviewed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rights_transfer_status_status_check CHECK (current_status IN (
    'under_18_parent_rights_active',
    'approaching_transfer_of_rights',
    'rights_transferred_to_student',
    'student_shared_decision_making',
    'parent_guardian_authorized_by_student',
    'legal_representative_or_conservator',
    'unknown_needs_review'
  ))
);

CREATE INDEX IF NOT EXISTS rights_transfer_status_student_idx
  ON public.rights_transfer_status (student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rights_transfer_status TO authenticated;
GRANT ALL ON public.rights_transfer_status TO service_role;

ALTER TABLE public.rights_transfer_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Viewers of student can read rights status" ON public.rights_transfer_status;
CREATE POLICY "Viewers of student can read rights status"
  ON public.rights_transfer_status
  FOR SELECT
  TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Editors can insert rights status" ON public.rights_transfer_status;
CREATE POLICY "Editors can insert rights status"
  ON public.rights_transfer_status
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Editors can update rights status" ON public.rights_transfer_status;
CREATE POLICY "Editors can update rights status"
  ON public.rights_transfer_status
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id))
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

DROP POLICY IF EXISTS "Editors can delete rights status" ON public.rights_transfer_status;
CREATE POLICY "Editors can delete rights status"
  ON public.rights_transfer_status
  FOR DELETE
  TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

-- 3. updated_at trigger reuses existing set_updated_at()
DROP TRIGGER IF EXISTS rights_transfer_status_set_updated_at ON public.rights_transfer_status;
CREATE TRIGGER rights_transfer_status_set_updated_at
  BEFORE UPDATE ON public.rights_transfer_status
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
