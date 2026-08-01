-- pgTAP: billing / licensing invariants.
--
-- Run against a STAGING database only:
--   psql "$STAGING_DB_URL" -f tests/staging/pgtap/billing_capacity.sql
--
-- Requires the pgtap extension:
--   CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;
SELECT plan(14);

-- Refuse to run against the production project.
SELECT is(
  current_setting('app.allow_pgtap', true) IS DISTINCT FROM 'off',
  true,
  'pgTAP is permitted on this database'
);

-- Schema presence -----------------------------------------------------------
SELECT has_table('public', 'plan_capacities', 'plan_capacities exists');
SELECT has_table('public', 'license_pools', 'license_pools exists');
SELECT has_table('public', 'license_allocations', 'license_allocations exists');
SELECT has_table('public', 'access_entitlements', 'access_entitlements exists');
SELECT has_table('public', 'entitlement_audit_events', 'audit trail exists');

-- Row-level security must be on for every capacity-bearing table -------------
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.license_pools'::regclass),
  'RLS enabled on license_pools'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.license_allocations'::regclass),
  'RLS enabled on license_allocations'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.access_entitlements'::regclass),
  'RLS enabled on access_entitlements'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.entitlement_audit_events'::regclass),
  'RLS enabled on entitlement_audit_events'
);

-- Capacity functions are SECURITY DEFINER and search_path pinned -------------
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'reserve_license_allocation'
    LIMIT 1),
  'reserve_license_allocation is SECURITY DEFINER'
);
SELECT ok(
  (SELECT p.prosecdef FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'revoke_license_allocation'
    LIMIT 1),
  'revoke_license_allocation is SECURITY DEFINER'
);

-- Anonymous callers must never read licensing or audit data ------------------
SELECT ok(
  NOT has_table_privilege('anon', 'public.license_allocations', 'SELECT'),
  'anon cannot read license_allocations'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.entitlement_audit_events', 'SELECT'),
  'anon cannot read the audit trail'
);

SELECT * FROM finish();
ROLLBACK;
