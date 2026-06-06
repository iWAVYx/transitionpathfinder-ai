CREATE OR REPLACE FUNCTION public.audience_for_role(_role text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _role
    WHEN 'student' THEN 'student'
    WHEN 'parent' THEN 'family'
    WHEN 'guardian' THEN 'family'
    WHEN 'educator' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'school_admin' THEN 'school_admin'
    WHEN 'district_admin' THEN 'district_admin'
    WHEN 'admin' THEN 'admin'
    WHEN 'partner' THEN 'partner'
    ELSE NULL
  END;
$function$;

DROP POLICY IF EXISTS "goal_statuses select own with student access" ON public.goal_statuses;
DROP POLICY IF EXISTS "goal_statuses insert own with student access" ON public.goal_statuses;
DROP POLICY IF EXISTS "goal_statuses update own with student access" ON public.goal_statuses;
DROP POLICY IF EXISTS "goal_statuses delete own" ON public.goal_statuses;

CREATE POLICY "goal_statuses select own with student access"
  ON public.goal_statuses FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses insert own with student access"
  ON public.goal_statuses FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses update own with student access"
  ON public.goal_statuses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pathway_reports r
      WHERE r.id = goal_statuses.report_id
        AND public.can_access_student(auth.uid(), r.student_id)
    )
  );

CREATE POLICY "goal_statuses delete own"
  ON public.goal_statuses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
