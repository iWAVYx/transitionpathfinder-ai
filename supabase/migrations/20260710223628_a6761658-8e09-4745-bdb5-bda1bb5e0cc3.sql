DROP POLICY IF EXISTS "Accept my own collaborator invite" ON public.student_collaborators;

CREATE POLICY "Accept my own collaborator invite"
ON public.student_collaborators
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND status = 'pending'
)
WITH CHECK (
  user_id = auth.uid()
  AND status = 'accepted'
);

CREATE OR REPLACE FUNCTION public.enforce_student_collaborator_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT DISTINCT FROM auth.uid()
     AND OLD.status = 'pending'
     AND NEW.status = 'accepted'
  THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Cannot change role while accepting an invite' USING ERRCODE = '42501';
    END IF;
    IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      RAISE EXCEPTION 'Cannot change student_id while accepting an invite' USING ERRCODE = '42501';
    END IF;
    IF NEW.invited_by IS DISTINCT FROM OLD.invited_by THEN
      RAISE EXCEPTION 'Cannot change invited_by while accepting an invite' USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change user_id while accepting an invite' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_student_collaborator_accept_tg ON public.student_collaborators;

CREATE TRIGGER enforce_student_collaborator_accept_tg
BEFORE UPDATE ON public.student_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.enforce_student_collaborator_accept();