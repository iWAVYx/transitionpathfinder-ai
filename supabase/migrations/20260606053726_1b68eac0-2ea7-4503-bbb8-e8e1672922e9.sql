-- 1) user_roles: only platform admins can grant/revoke roles
DROP POLICY IF EXISTS "Admins manage roles - insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles - delete" ON public.user_roles;
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;

CREATE POLICY "Platform admins manage roles - insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins manage roles - delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 2) profiles: scope bulk admin read to platform admins
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Platform admins view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- 3) realtime.messages: gate channel subscriptions
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read scoped realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can read scoped realtime messages"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    -- Per-user topics: "user:<uid>"
    (realtime.topic() = 'user:' || auth.uid()::text)
    OR
    -- Student-scoped topics like "student:<uuid>" or "<table>:student:<uuid>"
    (
      realtime.topic() ~ '(^|:)student:[0-9a-f-]{36}$'
      AND public.can_access_student(
        auth.uid(),
        substring(realtime.topic() FROM 'student:([0-9a-f-]{36})$')::uuid
      )
    )
  );
