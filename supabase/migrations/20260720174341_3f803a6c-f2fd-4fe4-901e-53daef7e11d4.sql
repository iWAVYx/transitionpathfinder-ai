-- W6 Proof — atomic access-code redemption RPC.
-- SECURITY DEFINER so it can write the redemption row, bump uses,
-- upsert a membership, and append a lifecycle audit event in one txn
-- while still using auth.uid() for identity.

CREATE OR REPLACE FUNCTION public.redeem_access_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_row public.access_codes%ROWTYPE;
  v_inserted boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _code IS NULL OR btrim(_code) = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  v_hash := encode(extensions.digest(btrim(_code), 'sha256'), 'hex');

  SELECT * INTO v_row
  FROM public.access_codes
  WHERE code_hash = v_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unknown_code');
  END IF;

  IF v_row.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'revoked', 'code_id', v_row.id);
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired', 'code_id', v_row.id);
  END IF;

  IF v_row.capacity IS NOT NULL AND v_row.uses >= v_row.capacity THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'over_capacity', 'code_id', v_row.id);
  END IF;

  BEGIN
    INSERT INTO public.access_code_redemptions (code_id, user_id)
    VALUES (v_row.id, v_uid);
    v_inserted := true;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'already_redeemed',
      'code_id', v_row.id,
      'org_id', v_row.org_id,
      'role', v_row.role
    );
  END;

  UPDATE public.access_codes
  SET uses = uses + 1
  WHERE id = v_row.id;

  IF v_row.org_id IS NOT NULL THEN
    INSERT INTO public.organization_memberships
      (organization_id, user_id, role_within_org, status, membership_status)
    VALUES (v_row.org_id, v_uid, v_row.role, 'active', 'active')
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET status = 'active',
          membership_status = 'active',
          role_within_org = EXCLUDED.role_within_org;
  END IF;

  INSERT INTO public.license_lifecycle_events
    (org_id, event, actor_id, payload)
  VALUES (
    v_row.org_id,
    'access_code_redeemed',
    v_uid,
    jsonb_build_object(
      'code_id', v_row.id,
      'role', v_row.role,
      'scope', v_row.scope,
      'single_use', v_row.single_use
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'code_id', v_row.id,
    'org_id', v_row.org_id,
    'role', v_row.role,
    'scope', v_row.scope
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_access_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
