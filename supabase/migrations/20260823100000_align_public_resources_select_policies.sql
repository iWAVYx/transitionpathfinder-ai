-- Keep anonymous public-resource reads from evaluating authenticated-only helpers.
-- The public published-resource policy remains the anonymous access boundary; this
-- replacement policy preserves owner/admin visibility for signed-in users only.

DROP POLICY IF EXISTS "Anyone reads verified resources" ON public.resources;
DROP POLICY IF EXISTS "Authenticated reads verified resources" ON public.resources;

CREATE POLICY "Authenticated reads verified resources"
ON public.resources
FOR SELECT
TO authenticated
USING (
  verified_status = 'verified'
  OR created_by_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
