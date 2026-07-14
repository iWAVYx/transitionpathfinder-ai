
-- Attach existing guard triggers to prevent privilege escalation during self-accept/self-approve.
DROP TRIGGER IF EXISTS enforce_student_collaborator_accept_trg ON public.student_collaborators;
CREATE TRIGGER enforce_student_collaborator_accept_trg
  BEFORE UPDATE ON public.student_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_collaborator_accept();

DROP TRIGGER IF EXISTS enforce_student_relationship_self_update_trg ON public.student_relationships;
CREATE TRIGGER enforce_student_relationship_self_update_trg
  BEFORE UPDATE ON public.student_relationships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_student_relationship_self_update();
