ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS entitlement_plan_type text;
UPDATE public.plans SET entitlement_plan_type = CASE code
  WHEN 'individual_pathway' THEN 'family_early_access'
  WHEN 'educator_solo' THEN 'educator_individual'
  WHEN 'school_core' THEN 'school_plan'
  WHEN 'school_plus' THEN 'school_plan'
  WHEN 'founding_pilot' THEN 'school_plan'
  WHEN 'district_starter' THEN 'school_plan'
  WHEN 'district_growth' THEN 'school_plan'
  WHEN 'district_enterprise' THEN 'school_plan'
  WHEN 'partner_premium' THEN 'partner_featured'
  ELSE NULL END;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_invoice_status text,
  ADD COLUMN IF NOT EXISTS last_invoice_at timestamptz;

-- Reserved invitations that expired must return their capacity automatically.
CREATE OR REPLACE FUNCTION public.release_expired_license_allocations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.license_allocations a
    SET state = 'expired', updated_at = now()
    WHERE a.state = 'reserved'
      AND (
        (a.reserved_until IS NOT NULL AND a.reserved_until < now())
        OR EXISTS (
          SELECT 1 FROM public.invitations i
          WHERE i.id = a.invitation_id
            AND (i.expires_at < now() OR i.status IN ('revoked','expired'))
        )
      )
    RETURNING a.id
  )
  SELECT count(*) INTO v_count FROM expired;

  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();

  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.release_expired_license_allocations() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.release_expired_license_allocations() TO service_role;

-- Accepting an invitation activates the license reserved for it.
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
  v_alloc uuid;
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
    PERFORM public.release_expired_license_allocations();
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

  SELECT a.id INTO v_alloc
  FROM public.license_allocations a
  WHERE a.invitation_id = v_inv.id AND a.state = 'reserved'
  LIMIT 1;
  IF v_alloc IS NOT NULL THEN
    PERFORM public.activate_license_allocation(v_alloc, v_uid);
  END IF;

  UPDATE public.invitations
  SET status = 'accepted', accepted_at = now(), accepted_by = v_uid
  WHERE id = v_inv.id;

  RETURN QUERY SELECT v_inv.invitation_type;
END;
$$;

-- Removing an org membership immediately releases sponsored capacity while
-- leaving unrelated personal entitlements alone.
CREATE OR REPLACE FUNCTION public.tg_release_allocation_on_membership_end()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid := COALESCE(OLD.organization_id, NEW.organization_id);
  v_user uuid := COALESCE(OLD.user_id, NEW.user_id);
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.membership_status = 'active'
     AND NEW.status = 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.license_allocations
  SET state = 'revoked',
      revoked_at = now(),
      revoked_reason = 'Organization membership ended',
      updated_at = now()
  WHERE sponsor_organization_id = v_org
    AND beneficiary_user_id = v_user
    AND state IN ('reserved','active');

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS release_allocation_on_membership_delete ON public.organization_memberships;
CREATE TRIGGER release_allocation_on_membership_delete
AFTER DELETE ON public.organization_memberships
FOR EACH ROW EXECUTE FUNCTION public.tg_release_allocation_on_membership_end();

DROP TRIGGER IF EXISTS release_allocation_on_membership_update ON public.organization_memberships;
CREATE TRIGGER release_allocation_on_membership_update
AFTER UPDATE OF status, membership_status ON public.organization_memberships
FOR EACH ROW EXECUTE FUNCTION public.tg_release_allocation_on_membership_end();