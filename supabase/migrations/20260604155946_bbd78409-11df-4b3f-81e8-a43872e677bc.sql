-- Slice 1: role audience helper (additive only, no destructive changes)

CREATE OR REPLACE FUNCTION public.audience_for_role(_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _role
    WHEN 'student' THEN 'student'
    WHEN 'parent' THEN 'family'
    WHEN 'guardian' THEN 'family'
    WHEN 'educator' THEN 'educator'
    WHEN 'teacher' THEN 'educator'
    WHEN 'case_manager' THEN 'educator'
    WHEN 'school_admin' THEN 'school_admin'
    WHEN 'admin' THEN 'admin'
    WHEN 'partner' THEN 'partner'
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.has_audience(_user_id uuid, _audience text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND public.audience_for_role(role::text) = _audience
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_audience(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audience_for_role(text) TO authenticated, service_role;