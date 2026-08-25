# Production migration preflight — 2026-08-25

Decision: **NO-GO**. This was a staging and evidence-only preflight. It did not
publish Lovable, deploy production, modify production data or schema, change
production secrets or DNS, or run a live payment.

## Exact candidate and staging acceptance

PR #61 merged to protected `main` as
`c3abb18795914b30253c598efd27fb1db0eb3987`.

- Isolated staging deployment run
  [`32865396727`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32865396727)
  passed its staging-intent, sandbox Stripe, Worker dry-run, exact-SHA identity,
  staging Supabase identity, and deployed PWA checks.
- Migration `20260825050000_scope_public_cms_admin_policies.sql` was applied and
  recorded only in staging project `qgrertkqbwanerqqemph`. All five targeted
  management policies have roles `{authenticated}`, and real anonymous SELECTs
  succeeded on blog posts, testimonials, page sections, FAQs, and media assets.
- The exact-SHA push workflows for build/SSR, accessibility, migration replay,
  CT Seed, permissions, RLS, cross-district isolation, role guards, and dashboard
  regression all passed.
- Consolidated protected release-readiness run
  [`32902198754`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32902198754)
  passed on attempt 1. It verified isolated staging identity, all seven synthetic
  role sessions and storage states, public accessibility/visual journeys, and
  signed-in workflows and access controls.

## Production migration reconciliation

The fail-closed comparator re-read the saved SELECT-only 2026-08-23 production
history against this exact candidate:

- 181 recorded production rows;
- 191 canonical migration files;
- 181 directly covered production rows;
- 6 reviewed canonical supersessions;
- 1 production-forbidden staging-only migration;
- 0 malformed or duplicate versions, unresolved production rows, duplicate
  mappings, or reviewed-policy errors;
- exactly 3 pending production migrations, in order:
  1. `20260821230000_security_remediation_hardening.sql`
  2. `20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`
  3. `20260825050000_scope_public_cms_admin_policies.sql`

This is a comparison refresh, not a fresh read of production. Regenerate the
SELECT-only history immediately before an approved maintenance window and stop
if the pending list or any content mapping differs.

The three pending files change policies, function definitions, and grants. They
contain no row mutation, table rewrite, index build, uniqueness constraint, or
data backfill. Apply one file at a time with stop-on-error and run the per-file
invariants in `migration-and-rollback-plan.md` before advancing. Do not apply the
already-covered public-resources alignment file or the production-forbidden E2E
fixture.

## Recovery and rollback gate

The isolated restore drill remains unverified. Backup inventory and a support
request do not prove that database schema/data, Auth users, and Storage objects
can be restored within an acceptable RPO/RTO. Production migration remains
unauthorized until the drill and recovery evidence in
`recovery-gate-2026-08-23.md` pass.

Database recovery and application rollback remain separate decisions. Use a
reviewed forward correction for a safely recoverable schema defect; use the
approved pre-migration recovery point for integrity or isolation failure. A
Lovable snapshot rollback or Cloudflare DNS rollback does not undo a database
migration.

## Current published production health

A read-only request on 2026-08-25 returned HTTP 503 from
`https://transitionforwardct.com/api/public/env-health`, which is the required
fail-closed response. It still reports production project ref
`lrqcntqyekucamifpffs`, but the currently published runtime has:

- missing `APP_ENV` and `VITE_APP_ENV=production` evidence;
- unknown Stripe mode;
- build SHA `dev` instead of an exact 40-character Git commit;
- the staging-only names `STAGING_STRIPE_API_KEY`,
  `STAGING_SUPABASE_SERVICE_ROLE_KEY`, and `STAGING_SUPABASE_URL` still detected.

Configuration changes made in Lovable but not published are not treated as
live evidence. The production health gate must remain red until a separately
authorized publish exposes the correct production-only values and removes all
staging credential names.

## Remaining authorization gates

1. Complete the isolated backup/restore drill and record recovery coverage,
   recovery point, RPO, RTO, smoke tests, and operators.
2. Resolve the Lovable hosted-build/control-plane status and prove the exact
   candidate maps to a successful connected build.
3. Re-read production migration history, confirm the exact three-file delta,
   and obtain separate owner authorization for the maintenance window before
   applying any production migration.
4. Configure and verify production labels, exact build SHA, staging-secret
   absence, and Stripe live mode through a separately authorized Lovable publish.
5. Complete live Stripe, email authentication, malware scanning, security
   finding disposition, observability, legal/subprocessor, incident-response,
   and Cloudflare export/rollback evidence.

Production can move to **GO** only after every blocking checklist item has
attached evidence in a reviewed PR. Migration, publish, DNS changes, and live
payment validation each require separate explicit authorization.
