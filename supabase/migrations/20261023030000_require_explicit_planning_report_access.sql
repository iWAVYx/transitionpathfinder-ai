-- Owner-approved policy direction: management status alone is not consent
-- to read or edit private planning records. Apply only after release approval.
BEGIN;

CREATE FUNCTION public.has_explicit_planning_student_access(
  _student_id uuid, _require_edit boolean DEFAULT false
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $access$
 SELECT auth.uid() IS NOT NULL AND _require_edit IS NOT NULL AND (
   EXISTS (SELECT 1 FROM public.students s WHERE s.id = _student_id
     AND (s.owner_id = auth.uid() OR s.student_user_id = auth.uid()))
   OR EXISTS (SELECT 1 FROM public.student_collaborators c
     WHERE c.student_id = _student_id AND c.user_id = auth.uid()
       AND c.status = 'accepted' AND (NOT _require_edit OR c.role = 'editor'))
   OR EXISTS (SELECT 1 FROM public.student_relationships r
     WHERE r.student_id = _student_id AND r.related_user_id = auth.uid()
       AND r.consent_status = 'approved'
       AND (NOT _require_edit OR r.permission_level IN ('collaborate','manage_documents','manage_plan')))
 );
$access$;
REVOKE ALL ON FUNCTION public.has_explicit_planning_student_access(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_explicit_planning_student_access(uuid,boolean) TO authenticated, service_role;

-- Restrictive policies AND with every permissive policy, including inherited
-- admin exceptions. Existing grants and ordinary policies are not widened.
CREATE POLICY "Require explicit private report read access"
 ON public.pathway_reports AS RESTRICTIVE FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.has_explicit_planning_student_access(student_id,false));

CREATE POLICY "Require explicit private report edit access"
 ON public.pathway_reports AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (user_id = auth.uid() OR public.has_explicit_planning_student_access(student_id,true))
 WITH CHECK (user_id = auth.uid() OR public.has_explicit_planning_student_access(student_id,true));

CREATE POLICY "Require explicit private intake read access"
 ON public.student_intakes AS RESTRICTIVE FOR SELECT TO authenticated
 USING (user_id = auth.uid() OR public.has_explicit_planning_student_access(student_id,false));

CREATE POLICY "Require explicit private report history read access"
 ON public.pathway_report_versions AS RESTRICTIVE FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.pathway_reports r WHERE r.id = report_id AND (
   (r.user_id = auth.uid() AND (r.student_id IS NULL OR public.has_explicit_planning_student_access(r.student_id,false)))
   OR public.has_explicit_planning_student_access(r.student_id,false)
 )));

COMMIT;
