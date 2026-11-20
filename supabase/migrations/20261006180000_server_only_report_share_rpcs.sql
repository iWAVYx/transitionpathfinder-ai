-- Reviewed source only. No application of this migration is authorized by the PR.
-- Deploy the server-only share caller before applying these grants in staging.
-- Production application requires a separately approved maintenance window.
BEGIN;

-- Public share links go through the application's validated document response.
-- Direct browser RPC access must not bypass that projection or forge view counts.
REVOKE ALL ON FUNCTION public.resolve_share_token(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.track_share_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.track_share_view(text) TO service_role;

DO $verify_server_only_shares$
DECLARE
  signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.resolve_share_token(text)',
    'public.track_share_view(text)'
  ] LOOP
    IF pg_catalog.has_function_privilege('anon', signature, 'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Client execution remains on server-only share RPC: %', signature;
    END IF;
    IF NOT pg_catalog.has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Service-role execution missing on share RPC: %', signature;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc p
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) acl
      WHERE p.oid = signature::regprocedure
        AND acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'PUBLIC execution remains on server-only share RPC: %', signature;
    END IF;
  END LOOP;
END;
$verify_server_only_shares$;

COMMIT;
