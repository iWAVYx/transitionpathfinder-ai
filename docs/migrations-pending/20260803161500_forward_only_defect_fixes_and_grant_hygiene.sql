-- PENDING migration #173 — applied to STAGING only.
-- Production application requires separate explicit approval (run through the
-- Lovable migration tool at that time; this file is the reviewed source).
--
-- Forward-only defect migration. No earlier migration is modified, reordered,
-- renamed, or repaired.

-- ---------------------------------------------------------------------------
-- 1. revoke_license_allocation: audit in the same transaction as the change.
--    The audit insert is not exception-handled, so a failed audit aborts the
--    revocation rather than producing an unaudited capacity change.
--    Idempotent: a retry finds state <> reserved/active and writes nothing.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_license_allocation(
  _allocation_id uuid,
  _reason text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.license_allocations%ROWTYPE;
  v_after public.license_allocations%ROWTYPE;
  v_reason text := btrim(coalesce(_reason, ''));
BEGIN
  SELECT * INTO v_row FROM public.license_allocations WHERE id = _allocation_id FOR UPDATE;
  IF v_row.id IS NULL THEN RETURN false; END IF;

  IF NOT (public.is_org_admin(auth.uid(), v_row.sponsor_organization_id)
          OR public.is_platform_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Only organization administrators can revoke licenses' USING ERRCODE = '42501';
  END IF;

  -- Every revocation is audited, so a written reason is mandatory.
  IF length(v_reason) < 10 THEN
    RAISE EXCEPTION 'A written reason of at least 10 characters is required to revoke a license'
      USING ERRCODE = '22023';
  END IF;

  IF v_row.state NOT IN ('reserved','active') THEN RETURN false; END IF;

  UPDATE public.license_allocations
     SET state = 'revoked', revoked_at = now(), revoked_by = auth.uid(),
         effective_to = now(), notes = v_reason, updated_at = now()
   WHERE id = _allocation_id
  RETURNING * INTO v_after;

  PERFORM public.record_entitlement_audit(
    'license_revoked',
    v_reason,
    v_row.sponsor_organization_id,
    v_row.beneficiary_user_id,
    v_row.license_type,
    v_row.id,
    v_row.pool_id,
    to_jsonb(v_row),
    to_jsonb(v_after) || jsonb_build_object('correlation_id', _allocation_id)
  );

  RETURN true;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. set_student_coverage_state: license_allocations has no `revoked_reason`.
--    The canonical free-text field for a revocation reason on that table is
--    `notes` (used by revoke_license_allocation above), so the function is
--    corrected to use it rather than adding a redundant column.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_student_coverage_state(
  _student_id uuid,
  _state text,
  _reason text,
  _export_window_days integer DEFAULT 180,
  _to_organization_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(coverage_state text, export_window_ends_at timestamp with time zone, released_allocations integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _before jsonb;
  _org uuid;
  _released integer := 0;
  _window timestamptz;
  _alloc record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _state NOT IN ('active','graduated','transferred','archived') THEN
    RAISE EXCEPTION 'Invalid coverage state';
  END IF;
  IF coalesce(length(btrim(_reason)), 0) < 10 THEN
    RAISE EXCEPTION 'A reason of at least 10 characters is required';
  END IF;
  IF NOT public.can_edit_student(auth.uid(), _student_id) THEN
    RAISE EXCEPTION 'Not authorized for this student';
  END IF;

  SELECT to_jsonb(s) - 'notes', s.organization_id
    INTO _before, _org
  FROM public.students s
  WHERE s.id = _student_id;

  IF _before IS NULL THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  IF _state IN ('graduated','archived') THEN
    _window := now() + make_interval(days => greatest(coalesce(_export_window_days, 180), 30));
  ELSE
    _window := NULL;
  END IF;

  UPDATE public.students s
     SET coverage_state = _state,
         coverage_state_changed_at = now(),
         export_window_ends_at = _window,
         organization_id = CASE
           WHEN _state = 'transferred' AND _to_organization_id IS NOT NULL
             THEN _to_organization_id ELSE s.organization_id END,
         updated_at = now()
   WHERE s.id = _student_id;

  IF _state IN ('graduated','archived') THEN
    FOR _alloc IN
      SELECT id, license_type, sponsor_organization_id, pool_id, beneficiary_user_id
        FROM public.license_allocations
       WHERE student_id = _student_id
         AND license_type = 'pathway'
         AND state IN ('reserved','active')
       FOR UPDATE
    LOOP
      UPDATE public.license_allocations
         SET state = 'expired',
             revoked_at = now(),
             revoked_by = auth.uid(),
             effective_to = now(),
             notes = left(btrim(_reason), 500),
             updated_at = now()
       WHERE id = _alloc.id;
      _released := _released + 1;

      PERFORM public.record_entitlement_audit(
        'license_released_coverage_state',
        _reason,
        _alloc.sponsor_organization_id,
        _alloc.beneficiary_user_id,
        _alloc.license_type,
        _alloc.id,
        _alloc.pool_id,
        jsonb_build_object('state','active'),
        jsonb_build_object('state','expired','coverage_state',_state)
      );
    END LOOP;
  END IF;

  PERFORM public.record_entitlement_audit(
    'student_coverage_state_changed',
    _reason,
    coalesce(_to_organization_id, _org),
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object('coverage_state', _before->>'coverage_state'),
    jsonb_build_object('coverage_state', _state, 'export_window_ends_at', _window)
  );

  RETURN QUERY SELECT _state, _window, _released;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. accept_invitation_by_token: the student_relationships ON CONFLICT target
--    (student_id, related_user_id) matches no unique index. The canonical
--    invariant on that table is one row per
--    (student_id, related_user_id, relationship_type), so the conflict target
--    is corrected to it — conflict handling is kept, not widened.
--    The invited role is also mapped onto the canonical relationship_type
--    vocabulary that the check constraint enforces, and replaying an already
--    accepted token by the same person is an explicit no-op.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(_token text)
RETURNS TABLE(invitation_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inv public.invitations%ROWTYPE;
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_perm text;
  v_type text;
  v_alloc uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO v_inv FROM public.invitations WHERE token = _token LIMIT 1;
  IF v_inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_inv.status = 'accepted' THEN
    IF v_inv.accepted_by IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Invitation is no longer pending';
    END IF;
    RETURN QUERY SELECT v_inv.invitation_type;
    RETURN;
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
    ON CONFLICT ON CONSTRAINT organization_memberships_organization_id_user_id_key DO UPDATE
      SET status = 'active',
          membership_status = 'active',
          role_within_org = EXCLUDED.role_within_org;
  END IF;

  IF v_inv.invitation_type = 'connect_to_student' AND v_inv.student_profile_id IS NOT NULL THEN
    v_type := CASE v_inv.invited_role
      WHEN 'parent' THEN 'parent_guardian'
      WHEN 'guardian' THEN 'parent_guardian'
      WHEN 'parent_guardian' THEN 'parent_guardian'
      WHEN 'case_manager' THEN 'educator_case_manager'
      WHEN 'educator' THEN 'educator_case_manager'
      WHEN 'teacher' THEN 'educator_case_manager'
      WHEN 'counselor' THEN 'educator_case_manager'
      WHEN 'educator_case_manager' THEN 'educator_case_manager'
      WHEN 'district_admin' THEN 'district_admin'
      ELSE 'school_admin'
    END;
    v_perm := CASE WHEN v_type IN ('parent_guardian','educator_case_manager')
                   THEN 'collaborate' ELSE 'view_summary' END;
    INSERT INTO public.student_relationships
      (student_id, related_user_id, relationship_type, permission_level, consent_status)
    VALUES (v_inv.student_profile_id, v_uid, v_type, v_perm, 'approved')
    -- Accepting only records consent. Scope (relationship_type,
    -- permission_level) is never widened by the invitee's own acceptance —
    -- that is what enforce_student_relationships_self_approve protects.
    ON CONFLICT ON CONSTRAINT student_relationships_unique DO UPDATE
      SET consent_status = 'approved';
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
$function$;

-- ---------------------------------------------------------------------------
-- 4. channel_retention_purge: channel_audit_events stores structured detail in
--    the canonical `metadata` jsonb column; there is no `payload` column and
--    one is not added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.channel_retention_purge()
RETURNS TABLE(channel_id uuid, purged bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_count bigint;
BEGIN
  FOR r IN
    SELECT c.id, c.retention_days
    FROM public.channels c
    WHERE c.legal_hold IS NOT TRUE
      AND c.retention_days IS NOT NULL
      AND c.retention_days > 0
  LOOP
    WITH deleted AS (
      DELETE FROM public.channel_messages m
      WHERE m.channel_id = r.id
        AND m.pinned IS NOT TRUE
        AND m.created_at < now() - make_interval(days => r.retention_days)
      RETURNING m.id
    )
    SELECT count(*) INTO v_count FROM deleted;

    IF v_count > 0 THEN
      INSERT INTO public.channel_audit_events (channel_id, event_type, metadata)
      VALUES (
        r.id,
        'retention_purge',
        jsonb_build_object(
          'purged', v_count,
          'retention_days', r.retention_days,
          'cutoff', now() - make_interval(days => r.retention_days)
        )
      );
      channel_id := r.id;
      purged := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- ---------------------------------------------------------------------------
-- B. Grant hygiene: licensing and audit tables must never be reachable by an
--    unauthenticated Data API caller. RLS is unchanged; only the blanket
--    table privileges are withdrawn.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.license_allocations FROM anon;
REVOKE ALL ON public.entitlement_audit_events FROM anon;
REVOKE ALL ON public.license_pools FROM anon;
REVOKE ALL ON public.license_allocations FROM PUBLIC;
REVOKE ALL ON public.entitlement_audit_events FROM PUBLIC;
REVOKE ALL ON public.license_pools FROM PUBLIC;

-- Re-assert exactly the privileges the application needs.
GRANT SELECT, UPDATE ON public.license_allocations TO authenticated;
GRANT ALL ON public.license_allocations TO service_role;

GRANT SELECT ON public.entitlement_audit_events TO authenticated;
GRANT ALL ON public.entitlement_audit_events TO service_role;

GRANT SELECT ON public.license_pools TO authenticated;
GRANT ALL ON public.license_pools TO service_role;
