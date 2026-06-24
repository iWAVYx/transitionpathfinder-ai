
-- Strip direct column SELECT on invitations.token from authenticated/anon. The
-- inviter still gets the token at creation time (returned from the server
-- function's local variable) and via the existing SECURITY DEFINER helper
-- public.get_invitation_share_token. service_role keeps full access.
REVOKE SELECT (token) ON public.invitations FROM authenticated;
REVOKE SELECT (token) ON public.invitations FROM anon;
REVOKE SELECT (token) ON public.invitations FROM PUBLIC;

-- Re-affirm the rest of the columns remain readable to authenticated
-- (RLS still scopes which rows they see).
GRANT SELECT (
  id, email, invited_role, invited_by_user_id, organization_id,
  student_profile_id, invitation_type, status, expires_at, accepted_at,
  accepted_by, revoked_at, message, created_at, updated_at
) ON public.invitations TO authenticated;
