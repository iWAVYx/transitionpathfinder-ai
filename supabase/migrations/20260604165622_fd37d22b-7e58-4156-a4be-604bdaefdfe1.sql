
CREATE OR REPLACE FUNCTION public.audience_for_role(_role text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
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

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_memberships
    WHERE user_id = _user_id AND organization_id = _org_id
      AND status = 'active'
      AND role_within_org IN ('admin','owner','school_admin','district_admin')
  ) OR public.has_role(_user_id, 'admin')
$function$;
