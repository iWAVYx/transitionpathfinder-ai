-- Follow-up to explicit planning-report policies: a management role must not
-- manufacture the student access those policies require. Preserve the existing
-- helper signatures and genuine ownership, self-identity and consent paths.
BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND (s.owner_id = _user_id OR s.student_user_id = _user_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
  ) OR EXISTS (
    SELECT 1
    FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_student(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = _student_id
      AND (s.owner_id = _user_id OR s.student_user_id = _user_id)
  ) OR EXISTS (
    SELECT 1
    FROM public.student_collaborators c
    WHERE c.student_id = _student_id
      AND c.user_id = _user_id
      AND c.status = 'accepted'
      AND c.role = 'editor'
  ) OR EXISTS (
    SELECT 1
    FROM public.student_relationships r
    WHERE r.student_id = _student_id
      AND r.related_user_id = _user_id
      AND r.consent_status = 'approved'
      AND r.permission_level IN ('collaborate','manage_documents','manage_plan')
  );
$$;

-- Replacing functions preserves their existing grants. Reassert the reviewed
-- caller boundary; website/CMS administration uses its separate admin helpers.
REVOKE ALL ON FUNCTION public.can_access_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) TO authenticated, service_role;

-- Editing a profile is not permission to reassign its access-control identity.
-- Privileged internal self-link/maintenance routines retain their own checks.
CREATE FUNCTION public.prevent_client_student_identity_reassignment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $student_identity$
BEGIN
 IF current_user IN ('anon','authenticated') AND (
   NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
   NEW.student_user_id IS DISTINCT FROM OLD.student_user_id
 ) THEN
   RAISE EXCEPTION 'Student identity reassignment requires an authorized internal workflow.' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END;
$student_identity$;
REVOKE ALL ON FUNCTION public.prevent_client_student_identity_reassignment() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prevent_client_student_identity_reassignment
 BEFORE UPDATE OF owner_id,student_user_id ON public.students
 FOR EACH ROW EXECUTE FUNCTION public.prevent_client_student_identity_reassignment();

-- Preserve ordinary content edits and owner linking; editors cannot take over
-- the report or move it to a new student to retain access after removal.
CREATE FUNCTION public.prevent_client_report_identity_reassignment()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $report_identity$
BEGIN
 IF current_user IN ('anon','authenticated') THEN
   IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.intake_id IS DISTINCT FROM OLD.intake_id THEN
     RAISE EXCEPTION 'Report ownership and original intake cannot be reassigned directly.' USING ERRCODE='42501';
   END IF;
   IF NEW.student_id IS DISTINCT FROM OLD.student_id AND (
     auth.uid() IS DISTINCT FROM OLD.user_id OR
     (NEW.student_id IS NOT NULL AND NOT public.can_edit_student(auth.uid(),NEW.student_id))
   ) THEN
     RAISE EXCEPTION 'Only the report owner can link an authorized student.' USING ERRCODE='42501';
   END IF;
 END IF;
 RETURN NEW;
END;
$report_identity$;
REVOKE ALL ON FUNCTION public.prevent_client_report_identity_reassignment() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER prevent_client_report_identity_reassignment
 BEFORE UPDATE OF user_id,intake_id,student_id ON public.pathway_reports
 FOR EACH ROW EXECUTE FUNCTION public.prevent_client_report_identity_reassignment();

COMMIT;
