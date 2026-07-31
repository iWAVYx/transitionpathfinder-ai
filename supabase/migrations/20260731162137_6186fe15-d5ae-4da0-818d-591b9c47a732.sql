-- resource_sources_public exposes only safe columns. It was security_invoker,
-- so anonymous visitors hit "permission denied for table resource_sources".
-- Granting anon on the base table would re-expose private notes/creator ids
-- (the exact finding this view was created to fix), so run the view as its
-- owner instead and keep the base table locked to authenticated users.
ALTER VIEW public.resource_sources_public SET (security_invoker = false);
GRANT SELECT ON public.resource_sources_public TO anon, authenticated;