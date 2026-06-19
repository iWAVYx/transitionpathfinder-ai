
-- Fix 1: extractions INSERT should require edit, not view, access.
DROP POLICY IF EXISTS extractions_insert_via_student ON public.document_extractions;
CREATE POLICY extractions_insert_via_student
  ON public.document_extractions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id));

-- Fix 2: prevent self-escalation on student_collaborators acceptance.
-- The accept policy must only allow flipping status; role/student_id/user_id stay locked
-- to whatever the inviter set. We compare against the existing row via a SECURITY DEFINER
-- helper to avoid recursive RLS.
CREATE OR REPLACE FUNCTION public.collaborator_role_for(_collab_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.student_collaborators WHERE id = _collab_id
$$;

CREATE OR REPLACE FUNCTION public.collaborator_student_for(_collab_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id FROM public.student_collaborators WHERE id = _collab_id
$$;

DROP POLICY IF EXISTS "Accept my own collaborator invite" ON public.student_collaborators;
CREATE POLICY "Accept my own collaborator invite"
  ON public.student_collaborators
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role::text = public.collaborator_role_for(id)
    AND student_id = public.collaborator_student_for(id)
  );
