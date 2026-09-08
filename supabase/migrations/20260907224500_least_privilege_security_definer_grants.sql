-- Fail closed on execution privileges for every public-schema SECURITY DEFINER
-- routine. This migration changes grants only; it does not change function
-- bodies, RLS policies, data, auth users, extensions, or application rows.
--
-- Production application requires a separately approved maintenance window
-- after disposable replay and isolated-staging verification.

BEGIN;

-- New functions created by the migration role must not inherit PostgreSQL's
-- default PUBLIC EXECUTE grant. Each future caller must be granted explicitly.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Reset every current privileged routine to a closed client boundary. Use the
-- catalog so forgotten trigger/internal helpers cannot retain default grants.
DO $reset_client_execute$
DECLARE
  routine record;
BEGIN
  FOR routine IN
    SELECT format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_catalog.oidvectortypes(p.proargtypes)
    ) AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
    ORDER BY p.proname, pg_catalog.oidvectortypes(p.proargtypes)
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      routine.signature
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %s TO service_role',
      routine.signature
    );
  END LOOP;
END;
$reset_client_execute$;

-- Anonymous allowlist: reviewed public content, share-token, and unsubscribe
-- entry points only. None exposes an unrestricted base table or privileged
-- account mutation.
GRANT EXECUTE ON FUNCTION public.active_jurisdiction_version(text) TO anon;
GRANT EXECUTE ON FUNCTION public.consume_unsubscribe_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.list_public_resource_sources() TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_share_view(text) TO anon;

-- Authenticated allowlist: caller-authorized RPCs plus helpers required by RLS.
-- Trigger functions, queue wrappers, retention routines, and scheduled internal
-- helpers remain service-role-only.
GRANT EXECUTE ON FUNCTION public.accept_invitation_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_license_allocation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.active_jurisdiction_version(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_my_pathway_license_to_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.authorize(uuid, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_student(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_document(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_if_unclaimed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.collaborator_role_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collaborator_student_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_unsubscribe_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_entitlement_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.effective_org_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_student_self_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_share_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_network_opportunity_contact_email(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_peer_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_admin_role(uuid, public.admin_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_audience(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_recent_admin_doc_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_sponsored_license(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_hub_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_channel_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_partner_only(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_license_access_code(uuid, uuid, text, text, text, integer, boolean, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.license_access_code_options(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.license_capacity(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_resource_sources() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_activated_license_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_sponsored_access() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obs_slo_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_capacity_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_tier_allows(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_entitlement_audit(text, text, uuid, uuid, text, uuid, uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_access_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_license_allocation(uuid, text, text, uuid, uuid, uuid, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_admin_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_license_access_code(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_license_allocation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_student_coverage_state(uuid, text, text, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sponsoring_org_for(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_read_student_doc(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_pathway_licensed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_share_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_license_allocation(uuid, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_feature(uuid, text) TO authenticated;

-- Abort rather than commit a partial or stale policy. The allowlists below are
-- mirrored by docs/production-readiness/security-definer-execute-allowlist.json
-- and compared exactly by the repository contract test.
DO $verify_client_execute$
DECLARE
  anonymous_allowlist text[] := ARRAY[
    'public.active_jurisdiction_version(text)',
    'public.consume_unsubscribe_token(text)',
    'public.list_public_resource_sources()',
    'public.resolve_share_token(text)',
    'public.track_share_view(text)'
  ];
  authenticated_allowlist text[] := ARRAY[
    'public.accept_invitation_by_token(text)',
    'public.activate_license_allocation(uuid, uuid)',
    'public.active_jurisdiction_version(text)',
    'public.attach_my_pathway_license_to_student(uuid)',
    'public.authorize(uuid, text, text, uuid)',
    'public.can_access_student(uuid, uuid)',
    'public.can_edit_student(uuid, uuid)',
    'public.can_view_document(uuid, uuid)',
    'public.claim_admin_if_unclaimed()',
    'public.collaborator_role_for(uuid)',
    'public.collaborator_student_for(uuid)',
    'public.consume_unsubscribe_token(text)',
    'public.effective_entitlement_for_user(uuid)',
    'public.effective_org_access(uuid)',
    'public.ensure_student_self_profile()',
    'public.get_invitation_share_token(uuid)',
    'public.get_partner_network_opportunity_contact_email(uuid)',
    'public.get_peer_profile(uuid)',
    'public.has_active_entitlement(uuid, text)',
    'public.has_admin_role(uuid, admin_role)',
    'public.has_audience(uuid, text)',
    'public.has_recent_admin_doc_access(uuid, uuid)',
    'public.has_role(uuid, app_role)',
    'public.has_sponsored_license(uuid, text)',
    'public.is_admin_hub_member(uuid)',
    'public.is_channel_admin(uuid, uuid)',
    'public.is_channel_member(uuid, uuid)',
    'public.is_org_admin(uuid, uuid)',
    'public.is_org_member(uuid, uuid)',
    'public.is_partner_only(uuid)',
    'public.is_platform_admin(uuid)',
    'public.issue_license_access_code(uuid, uuid, text, text, text, integer, boolean, timestamp with time zone)',
    'public.license_access_code_options(uuid)',
    'public.license_capacity(uuid, text)',
    'public.list_public_resource_sources()',
    'public.my_activated_license_role()',
    'public.my_sponsored_access()',
    'public.obs_slo_status(integer)',
    'public.org_capacity_summary(uuid)',
    'public.partner_tier_allows(uuid, text)',
    'public.record_entitlement_audit(text, text, uuid, uuid, text, uuid, uuid, jsonb, jsonb)',
    'public.redeem_access_code(text)',
    'public.reserve_license_allocation(uuid, text, text, uuid, uuid, uuid, text, timestamp with time zone)',
    'public.resolve_admin_invitation(text)',
    'public.resolve_share_token(text)',
    'public.revoke_license_access_code(uuid, text)',
    'public.revoke_license_allocation(uuid, text)',
    'public.set_student_coverage_state(uuid, text, text, integer, uuid)',
    'public.sponsoring_org_for(uuid, text)',
    'public.storage_can_read_student_doc(uuid, text)',
    'public.student_pathway_licensed(uuid)',
    'public.track_share_view(text)',
    'public.transfer_license_allocation(uuid, text, uuid, uuid)',
    'public.user_has_feature(uuid, text)'
  ];
  mismatch text;
BEGIN
  SELECT string_agg(signature, ', ' ORDER BY signature)
    INTO mismatch
  FROM (
    SELECT format(
      '%I.%I(%s)', n.nspname, p.proname,
      pg_catalog.oidvectortypes(p.proargtypes)
    ) AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND EXISTS (
        SELECT 1
        FROM pg_catalog.aclexplode(
          coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) acl
        WHERE acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      )
  ) unexpected_public;
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Unexpected PUBLIC execution on SECURITY DEFINER routines: %', mismatch;
  END IF;

  SELECT string_agg(signature, ', ' ORDER BY signature)
    INTO mismatch
  FROM (
    SELECT
      p.oid,
      format(
        '%I.%I(%s)', n.nspname, p.proname,
        pg_catalog.oidvectortypes(p.proargtypes)
      ) AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  ) routines
  WHERE pg_catalog.has_function_privilege('anon', oid, 'EXECUTE')
        IS DISTINCT FROM (signature = ANY (anonymous_allowlist));
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Anonymous SECURITY DEFINER allowlist mismatch: %', mismatch;
  END IF;

  SELECT string_agg(signature, ', ' ORDER BY signature)
    INTO mismatch
  FROM (
    SELECT
      p.oid,
      format(
        '%I.%I(%s)', n.nspname, p.proname,
        pg_catalog.oidvectortypes(p.proargtypes)
      ) AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  ) routines
  WHERE pg_catalog.has_function_privilege('authenticated', oid, 'EXECUTE')
        IS DISTINCT FROM (signature = ANY (authenticated_allowlist));
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Authenticated SECURITY DEFINER allowlist mismatch: %', mismatch;
  END IF;

  SELECT string_agg(signature, ', ' ORDER BY signature)
    INTO mismatch
  FROM (
    SELECT
      p.oid,
      format(
        '%I.%I(%s)', n.nspname, p.proname,
        pg_catalog.oidvectortypes(p.proargtypes)
      ) AS signature
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  ) routines
  WHERE NOT pg_catalog.has_function_privilege('service_role', oid, 'EXECUTE');
  IF mismatch IS NOT NULL THEN
    RAISE EXCEPTION 'Service-role execution missing for SECURITY DEFINER routines: %', mismatch;
  END IF;
END;
$verify_client_execute$;

COMMIT;
