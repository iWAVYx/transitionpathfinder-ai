# Isolated-staging security default-privilege evidence — 2026-09-14

Decision: **THE THREE ANTIVIRUS-INDEPENDENT SECURITY MIGRATIONS PASSED
ISOLATED-STAGING ACCEPTANCE; production remains NO-GO.** This record does not
authorize a production migration, Lovable publish, DNS change, secret change,
live payment, or antivirus retry.

## Exact candidate and target

- Protected `main` SHA:
  `73c3c36a340cf6ef03174d503da5751a4eb1a4a4` (PR #124).
- Isolated staging deployment:
  [Deploy Staging run 34868713078](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868713078).
- Staging Supabase project: `qgrertkqbwanerqqemph`.
- Staging hostname: `transitionforward-staging.caysi101.workers.dev`.

The final public environment-health response reported both environment labels
as `staging`, the exact 40-character candidate SHA, the isolated staging
project ref, `is_production_project=false`, `is_production_target=false`,
Stripe sandbox mode with `stripe_livemode=false`, and `isolation.ok=true` with
no errors.

## Migration ledger and default privileges

A SELECT-only ledger verification returned exactly these three rows, in order,
with one recorded statement each:

1. `20260907190000_security_finding_alignment`
2. `20260907224500_least_privilege_security_definer_grants`
3. `20260914120000_harden_application_function_default_privileges`

The third migration was applied once as the `postgres` migration role. Its
canonical ledger statement was normalized to repository line endings without
rerunning the migration SQL. The final recorded hashes are:

- statement MD5: `5db71d69000f8c0d6f2d1cb202a57e0f`;
- executable-code MD5 after comments and whitespace are removed:
  `a0a57957f380d54efa83f579339a46ff`.

The live post-apply catalog check found:

- `0` default function-`EXECUTE` entries for `PUBLIC`, `anon`, or
  `authenticated` under the applying role;
- `1` default function-`EXECUTE` entry for `service_role`; and
- the remaining current defaults were only `postgres:EXECUTE:false` and
  `service_role:EXECUTE:false`.

This changes only the defaults inherited by future public-schema functions
created by the applying migration role. It does not change existing routines,
tables, rows, RLS policies, buckets, storage objects, auth users, extensions,
or application data.

Operator note: the first SQL-editor buffer was rejected by PostgreSQL at parse
time before any statement ran. The buffer was replaced and the exact migration
was then applied once. A narrowly guarded ledger-only CRLF-to-LF normalization
made the stored statement byte-equivalent to the reviewed repository file; it
did not execute the migration again.

## Post-migration protected checks

The live protected checks were rerun as attempt 2 after the migration. Every run
was pinned to exact SHA
`73c3c36a340cf6ef03174d503da5751a4eb1a4a4` and passed:

| Check | Run |
| --- | ---: |
| Cross-district RLS QA | [34868525031](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868525031) |
| RLS regression QA | [34868524987](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868524987) |
| Permission regression QA | [34868524913](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868524913) |
| CT Seed v2 Audit | [34868524860](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868524860) |
| Role-guard QA | [34868524944](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868524944) |
| Dashboard regression | [34868525011](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34868525011) |

The same SHA's push-time Build & SSR, accessibility, migration replay, and
standard production-readiness audit had already passed before the database-only
application. No threshold, role guard, RLS assertion, permission assertion,
environment gate, or exact-SHA check was weakened.

## Boundary and next gate

The two attachment migrations remain a separate blocked release unit:

- `20260908000500_channel_attachment_malware_gate.sql`;
- `20260909010000_create_private_channel_attachments_bucket.sql`.

They are not authorized for production until the private-scanning provider and
privacy terms are approved and a protected clean-file/EICAR staging run passes.

The next database step is preparation only: refresh the SELECT-only production
baseline, name the maintenance and abort owners, and review the three-file
procedure in `production-security-migration-plan-2026-09-14.md`. Production
execution still requires a separate, exact authorization.
