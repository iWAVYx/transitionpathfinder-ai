
-- 1. Stop assigning a default 'parent' role to every new signup. Roles are assigned
--    once the user completes onboarding and chooses their role explicitly.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    WHERE public.profiles.email IS NULL OR public.profiles.email = '';
  -- NOTE: role assignment happens at /onboarding via completeOnboarding().
  RETURN NEW;
END;
$function$;

-- 2. Repair QA seed accounts: their primary_role was never persisted and they all
--    inherited the legacy default 'parent' role. Mirror their seeded role into
--    profiles.primary_role and drop stale 'parent' entries where parent is not
--    their actual role.

-- 2a. Set primary_role from the most-specific user_roles row when not already set.
UPDATE public.profiles p
SET primary_role = sub.role,
    onboarding_completed = true
FROM (
  SELECT user_id, MIN(role::text) AS role
  FROM public.user_roles
  WHERE role::text NOT IN ('parent')
  GROUP BY user_id
) sub
WHERE p.id = sub.user_id
  AND (p.primary_role IS NULL OR p.primary_role = '');

-- 2b. For QA accounts where primary role got set above, remove the leftover
--     default 'parent' role so RLS and dashboard routing don't treat them as
--     guardians.
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id
  AND ur.role::text = 'parent'
  AND p.primary_role IS NOT NULL
  AND p.primary_role <> 'parent'
  AND p.primary_role <> 'guardian';

-- 2c. Pre-fill first_name from full_name for those QA accounts so the dashboard
--     greeting renders correctly without requiring them to redo onboarding.
UPDATE public.profiles
SET first_name = COALESCE(NULLIF(first_name, ''), split_part(full_name, ' ', 1))
WHERE onboarding_completed = true
  AND (first_name IS NULL OR first_name = '')
  AND full_name IS NOT NULL
  AND full_name <> '';
