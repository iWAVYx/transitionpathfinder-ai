-- Additive security candidate; no hosted execution is authorized by this file.
-- Requires 20261006180000_server_only_report_share_rpcs.sql and reviewed effective grants.
-- Preserve creator-owned revocation; prevent token retargeting and reactivation.
BEGIN;
-- This change does not close raw report disclosure if the older grant migration is missing.
DO $prerequisite$
DECLARE signature text;
BEGIN
  FOREACH signature IN ARRAY ARRAY['public.resolve_share_token(text)','public.track_share_view(text)'] LOOP
    IF pg_catalog.has_function_privilege('anon', signature, 'EXECUTE')
       OR pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE')
       OR NOT pg_catalog.has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Server-only sharing prerequisite is not satisfied: %', signature;
    END IF;
  END LOOP;
END;
$prerequisite$;
REVOKE UPDATE, DELETE ON TABLE public.share_tokens FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, token, report_id, created_by, audience, expires_at, revoked,
  view_count, last_viewed_at, created_at)
  ON public.share_tokens FROM PUBLIC, anon, authenticated;
GRANT UPDATE (revoked) ON public.share_tokens TO authenticated;

DROP POLICY "Owners revoke share tokens" ON public.share_tokens;
CREATE POLICY "Owners revoke share tokens" ON public.share_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by AND revoked = true);

-- Other permissive UPDATE policies must not bypass creator-only, one-way revocation.
DROP POLICY IF EXISTS "Share token updates only revoke" ON public.share_tokens;
CREATE POLICY "Share token updates only revoke" ON public.share_tokens
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by AND revoked = true);

-- Unexpected inherited/column privileges abort rather than silently widening access.
DO $verify$
DECLARE col record; actor text;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_catalog.pg_class WHERE oid='public.share_tokens'::regclass)
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls))
     OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid='public.share_tokens'::regclass
       AND (pg_catalog.pg_has_role('authenticated',c.relowner,'MEMBER') OR pg_catalog.pg_has_role('anon',c.relowner,'MEMBER'))) THEN
    RAISE EXCEPTION 'Share-token RLS or client role ownership assumptions failed';
  END IF;
  FOR col IN SELECT attname FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.share_tokens'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    IF pg_catalog.has_column_privilege('authenticated', 'public.share_tokens', col.attname, 'UPDATE')
       IS DISTINCT FROM (col.attname = 'revoked') THEN
      RAISE EXCEPTION 'Unexpected authenticated share-token UPDATE privilege: %', col.attname;
    END IF;
    IF pg_catalog.has_column_privilege('anon', 'public.share_tokens', col.attname, 'UPDATE') THEN
      RAISE EXCEPTION 'Anonymous share-token UPDATE remains';
    END IF;
  END LOOP;
  FOREACH actor IN ARRAY ARRAY['authenticated', 'anon'] LOOP
    IF pg_catalog.has_table_privilege(actor, 'public.share_tokens', 'DELETE') THEN
      RAISE EXCEPTION 'Unexpected share-token DELETE privilege: %', actor;
    END IF;
  END LOOP;
END;
$verify$;
COMMIT;
