
-- W7: Counselor within Educator role
-- 1. Add professional_focus label to profiles (descriptive only)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS professional_focus TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_professional_focus_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_professional_focus_check
  CHECK (
    professional_focus IS NULL OR professional_focus IN (
      'special_education_teacher',
      'case_manager',
      'school_counselor',
      'transition_coordinator',
      'related_service_professional',
      'other_authorized_staff'
    )
  );

-- 2. Tighten evidence_items SELECT so counselor-scope rows never leak
--    through the general educator record. Contributor + platform admin only.
DROP POLICY IF EXISTS "evidence_items view via student access" ON public.evidence_items;
DROP POLICY IF EXISTS "evidence_items view scoped by permission_scope" ON public.evidence_items;

CREATE POLICY "evidence_items view scoped by permission_scope"
ON public.evidence_items
FOR SELECT
USING (
  public.can_access_student(auth.uid(), student_id)
  AND (
    permission_scope IS DISTINCT FROM 'counselor_scope'
    OR contributor_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  )
);

-- Prevent write-side scope escalation: only the contributor (or platform admin)
-- can create/update a counselor_scope evidence row.
DROP POLICY IF EXISTS "evidence_items insert via student edit" ON public.evidence_items;
CREATE POLICY "evidence_items insert scoped"
ON public.evidence_items
FOR INSERT
WITH CHECK (
  public.can_edit_student(auth.uid(), student_id)
  AND (
    permission_scope IS DISTINCT FROM 'counselor_scope'
    OR (contributor_id = auth.uid() OR public.is_platform_admin(auth.uid()))
  )
);

DROP POLICY IF EXISTS "evidence_items update via student edit" ON public.evidence_items;
CREATE POLICY "evidence_items update scoped"
ON public.evidence_items
FOR UPDATE
USING (
  public.can_edit_student(auth.uid(), student_id)
  AND (
    permission_scope IS DISTINCT FROM 'counselor_scope'
    OR contributor_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  )
)
WITH CHECK (
  public.can_edit_student(auth.uid(), student_id)
  AND (
    permission_scope IS DISTINCT FROM 'counselor_scope'
    OR contributor_id = auth.uid()
    OR public.is_platform_admin(auth.uid())
  )
);
