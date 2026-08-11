-- pgTAP: billing / licensing invariants.
--
-- Run against a STAGING database only:
--   PGHOST=... PGUSER=... PGPASSWORD=... psql -f tests/staging/pgtap/billing_capacity.sql
--
-- Requires the pgtap extension:
--   CREATE EXTENSION IF NOT EXISTS pgtap;

BEGIN;
SELECT plan(20);

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

-- Payment authority tables are server-written and never reachable by anon.
SELECT ok(
  NOT (
    has_table_privilege('anon', 'public.billing_accounts', 'SELECT') OR
    has_table_privilege('anon', 'public.billing_accounts', 'INSERT') OR
    has_table_privilege('anon', 'public.billing_accounts', 'UPDATE') OR
    has_table_privilege('anon', 'public.billing_accounts', 'DELETE') OR
    has_table_privilege('anon', 'public.billing_accounts', 'TRUNCATE') OR
    has_table_privilege('anon', 'public.billing_accounts', 'REFERENCES') OR
    has_table_privilege('anon', 'public.billing_accounts', 'TRIGGER')
  ),
  'anon has no privileges on billing_accounts'
);
SELECT ok(
  NOT (
    has_table_privilege('anon', 'public.subscriptions', 'SELECT') OR
    has_table_privilege('anon', 'public.subscriptions', 'INSERT') OR
    has_table_privilege('anon', 'public.subscriptions', 'UPDATE') OR
    has_table_privilege('anon', 'public.subscriptions', 'DELETE') OR
    has_table_privilege('anon', 'public.subscriptions', 'TRUNCATE') OR
    has_table_privilege('anon', 'public.subscriptions', 'REFERENCES') OR
    has_table_privilege('anon', 'public.subscriptions', 'TRIGGER')
  ),
  'anon has no privileges on subscriptions'
);
SELECT ok(
  NOT (
    has_table_privilege('anon', 'public.processed_payment_events', 'SELECT') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'INSERT') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'UPDATE') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'DELETE') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'TRUNCATE') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'REFERENCES') OR
    has_table_privilege('anon', 'public.processed_payment_events', 'TRIGGER')
  ),
  'anon has no privileges on processed_payment_events'
);

SELECT ok(
  (SELECT bool_and(
    has_table_privilege('authenticated', table_name, 'SELECT') AND
    NOT has_table_privilege('authenticated', table_name, 'INSERT') AND
    NOT has_table_privilege('authenticated', table_name, 'UPDATE') AND
    NOT has_table_privilege('authenticated', table_name, 'DELETE') AND
    NOT has_table_privilege('authenticated', table_name, 'TRUNCATE')
  ) FROM unnest(ARRAY[
    'public.billing_accounts',
    'public.subscriptions'
  ]) AS table_name),
  'authenticated has read-only customer billing grants'
);

SELECT ok(
  NOT (
    has_table_privilege('authenticated', 'public.processed_payment_events', 'SELECT') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'INSERT') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'UPDATE') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'DELETE') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'TRUNCATE') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'REFERENCES') OR
    has_table_privilege('authenticated', 'public.processed_payment_events', 'TRIGGER')
  ),
  'processed payment event ledger is service-only'
);

SELECT ok(
  (SELECT bool_and(
    has_table_privilege('service_role', table_name, 'SELECT') AND
    has_table_privilege('service_role', table_name, 'INSERT') AND
    has_table_privilege('service_role', table_name, 'UPDATE') AND
    has_table_privilege('service_role', table_name, 'DELETE')
  ) FROM unnest(ARRAY[
    'public.billing_accounts',
    'public.subscriptions',
    'public.processed_payment_events'
  ]) AS table_name),
  'service_role retains webhook billing privileges'
);

SELECT * FROM finish();
ROLLBACK;
