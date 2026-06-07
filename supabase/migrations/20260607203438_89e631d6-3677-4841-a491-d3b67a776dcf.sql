
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  detail text CHECK (detail IS NULL OR char_length(detail) <= 2000),
  event_date date NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','team')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (visibility = 'private' OR student_id IS NOT NULL)
);

CREATE INDEX calendar_events_owner_idx ON public.calendar_events(owner_user_id, event_date);
CREATE INDEX calendar_events_student_idx ON public.calendar_events(student_id, event_date) WHERE student_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Owner can always read their own events; team events are visible to any
-- collaborator who can access the linked student.
CREATE POLICY "calendar_events_select"
  ON public.calendar_events FOR SELECT
  TO authenticated
  USING (
    owner_user_id = auth.uid()
    OR (
      visibility = 'team'
      AND student_id IS NOT NULL
      AND public.can_access_student(auth.uid(), student_id)
    )
  );

-- Inserts: must be owned by the caller. If student-scoped, the caller must
-- have access to that student.
CREATE POLICY "calendar_events_insert"
  ON public.calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (
      student_id IS NULL
      OR public.can_access_student(auth.uid(), student_id)
    )
  );

CREATE POLICY "calendar_events_update"
  ON public.calendar_events FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid())
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (student_id IS NULL OR public.can_access_student(auth.uid(), student_id))
  );

CREATE POLICY "calendar_events_delete"
  ON public.calendar_events FOR DELETE
  TO authenticated
  USING (owner_user_id = auth.uid());

CREATE TRIGGER calendar_events_set_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
