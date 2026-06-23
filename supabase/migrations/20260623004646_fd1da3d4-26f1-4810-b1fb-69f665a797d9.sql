-- Hide invitations.token from client SELECT; inviter fetches via SECURITY DEFINER RPC;
-- invitee accepts via SECURITY DEFINER RPC. Also revoke client SELECT on
-- contact_email columns of partner_network_opportunities and partner_opportunities.

REVOKE SELECT (token) ON public.invitations FROM authenticated;
REVOKE SELECT (token) ON public.invitations FROM anon;

CREATE OR REPLACE FUNCTION public.get_invitation_share_token(_invitation_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.token
  FROM public.invitations i
  WHERE i.id = _invitation_id
    AND i.status = 'pending'
    AND i.revoked_at IS NULL
    AND (i.invited_by_user_id = auth.uid() OR public.is_platform_admin(auth.uid()));
$$;
GRANT EXECUTE ON FUNCTION public.get_invitation_share_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(_token text)
RETURNS TABLE(invitation_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_perm text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_inv FROM public.invitations WHERE token = _token LIMIT 1;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;
  IF v_inv.status <> 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending';
  END IF;
  IF v_inv.expires_at < now() THEN
    UPDATE public.invitations SET status = 'expired' WHERE id = v_inv.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;
  IF lower(v_inv.email) <> v_email THEN
    RAISE EXCEPTION 'Invitation is addressed to a different email';
  END IF;

  IF v_inv.invitation_type IN ('join_school','join_district','join_partner_org')
     AND v_inv.organization_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships
      (organization_id, user_id, role_within_org, status, membership_status, invited_by)
    VALUES (v_inv.organization_id, v_uid, v_inv.invited_role, 'active', 'active', v_inv.invited_by_user_id)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET status = 'active',
          membership_status = 'active',
          role_within_org = EXCLUDED.role_within_org;
  END IF;

  IF v_inv.invitation_type = 'connect_to_student' AND v_inv.student_profile_id IS NOT NULL THEN
    v_perm := CASE WHEN v_inv.invited_role IN ('parent','case_manager') THEN 'collaborate' ELSE 'view' END;
    INSERT INTO public.student_relationships
      (student_id, related_user_id, relationship_type, permission_level, consent_status)
    VALUES (v_inv.student_profile_id, v_uid, v_inv.invited_role, v_perm, 'approved')
    ON CONFLICT (student_id, related_user_id) DO UPDATE
      SET consent_status = 'approved',
          permission_level = EXCLUDED.permission_level,
          relationship_type = EXCLUDED.relationship_type;
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.invitation_type;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated;

REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM authenticated;
REVOKE SELECT (contact_email) ON public.partner_network_opportunities FROM anon;

REVOKE SELECT (contact_email) ON public.partner_opportunities FROM authenticated;
REVOKE SELECT (contact_email) ON public.partner_opportunities FROM anon;

COMMENT ON TABLE public.profiles IS
  'Profile PII (email, phone, names). RLS restricts SELECT to self and platform admins. Peer name lookups must go through public.get_peer_profile(uuid); never join profiles client-side via student-scoped tables.';