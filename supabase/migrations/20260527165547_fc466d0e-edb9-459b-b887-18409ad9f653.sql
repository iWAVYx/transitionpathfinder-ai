
-- Trigger-only: nobody should call these directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Auth-gated helpers: keep for authenticated (RLS uses them), revoke anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) TO authenticated;

-- Public share-link helpers: explicit grant to anon (intentional)
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_share_view(text) TO anon, authenticated;
