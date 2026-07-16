
-- Fix privilege escalation on self-approval / self-accept RLS policies.
-- WITH CHECK cannot reference OLD, so add BEFORE UPDATE triggers that
-- pin immutable columns when the current user is the invited/related party.

-- 1) student_collaborators: invitee accepting must not change role/student_id/invited_by
CREATE OR REPLACE FUNCTION public.enforce_student_collaborators_self_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = auth.uid() AND OLD.user_id = auth.uid() THEN
    -- Only the status column may change on self-accept path.
    IF NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.invited_by IS DISTINCT FROM OLD.invited_by
       OR NEW.invited_email IS DISTINCT FROM OLD.invited_email
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      -- If the row owner (student.owner_id) is doing the update, allow it.
      IF NOT EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id = OLD.student_id AND s.owner_id = auth.uid()
      ) THEN
        RAISE EXCEPTION 'Cannot modify collaborator fields on self-accept'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_collaborators_self_accept ON public.student_collaborators;
CREATE TRIGGER trg_student_collaborators_self_accept
BEFORE UPDATE ON public.student_collaborators
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_collaborators_self_accept();

-- 2) student_relationships: related user self-approve must not change scope/permission
CREATE OR REPLACE FUNCTION public.enforce_student_relationships_self_approve()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.related_user_id = auth.uid() AND OLD.related_user_id = auth.uid() THEN
    -- If an editor of the student is performing the update, allow it.
    IF NOT public.can_edit_student(auth.uid(), OLD.student_id) THEN
      IF NEW.student_id IS DISTINCT FROM OLD.student_id
         OR NEW.permission_level IS DISTINCT FROM OLD.permission_level
         OR NEW.relationship_type IS DISTINCT FROM OLD.relationship_type
         OR NEW.related_user_id IS DISTINCT FROM OLD.related_user_id THEN
        RAISE EXCEPTION 'Cannot modify relationship scope on self-approve'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_relationships_self_approve ON public.student_relationships;
CREATE TRIGGER trg_student_relationships_self_approve
BEFORE UPDATE ON public.student_relationships
FOR EACH ROW EXECUTE FUNCTION public.enforce_student_relationships_self_approve();
