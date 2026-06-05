CREATE OR REPLACE FUNCTION public.debug_auth_uid()
RETURNS TABLE(uid uuid, role text, jwt_sub text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT auth.uid(), auth.role(), current_setting('request.jwt.claim.sub', true);
$$;
GRANT EXECUTE ON FUNCTION public.debug_auth_uid() TO authenticated, anon;