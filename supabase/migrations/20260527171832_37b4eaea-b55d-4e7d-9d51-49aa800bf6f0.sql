
-- Allow admins to grant/revoke roles; allow admins to delete waitlist entries.

CREATE POLICY "Admins manage roles - insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles - delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete waitlist" ON public.waitlist
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bootstrap: lets the very first signed-in user claim admin if no admin exists yet.
CREATE OR REPLACE FUNCTION public.claim_admin_if_unclaimed()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_any_admin boolean;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO has_any_admin;
  IF has_any_admin THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated;
