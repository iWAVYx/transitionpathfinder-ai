-- Slice A2: enable audit-table writes from authenticated users.
-- Slice A1 created public.org_access_audit but did not GRANT Data API
-- privileges, so the client-side authorize() helper cannot record denial
-- rows. This adds the minimum privileges + INSERT policy needed for the
-- helper to work; SELECT stays restricted to the actor and platform admins.

GRANT SELECT, INSERT ON public.org_access_audit TO authenticated;
GRANT ALL ON public.org_access_audit TO service_role;

DROP POLICY IF EXISTS "actor can insert own audit rows" ON public.org_access_audit;
CREATE POLICY "actor can insert own audit rows"
ON public.org_access_audit
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());