-- 1) Backfill profiles.email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 2) Update new-user trigger to capture email going forward
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    WHERE public.profiles.email IS NULL OR public.profiles.email = '';
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Make sure the trigger is wired (Supabase managed; recreate defensively)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) Extend organizations SELECT so members can see their own org even before verification
DROP POLICY IF EXISTS "Authenticated can view verified organizations" ON public.organizations;
CREATE POLICY "View verified or member organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    verified_status = 'verified'
    OR public.is_org_member(auth.uid(), id)
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4) Allow a signed-in user to bootstrap their first organization (school or partner).
-- The accompanying memberships INSERT policy already permits the user to add themselves
-- as the first admin only through the server fn that uses the admin client, so this
-- mainly unblocks future direct flows. Keep existing admin-managed ALL policy intact.
CREATE POLICY "Authenticated can create their organization"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND verified_status = 'pending');
