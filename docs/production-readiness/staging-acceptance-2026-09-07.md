# Exact-SHA isolated-staging evidence — 2026-09-07

Decision: **ISOLATED STAGING DEPLOYMENT, PROTECTED CHECKS, AND CONSOLIDATED
RELEASE READINESS PASSED; production remains NO-GO.** This evidence records the
latest protected `main` deployment and the post-deployment security scan. It does
not claim a Lovable hosted-build pass and does not authorize a production
publish, production DNS change, database migration, secret change, or live
payment.

## Exact candidate and isolation

Protected `main` SHA
`2b256c8389f7c400d24d449e7af31558a0e2a40a` (PR #98) was deployed by
[Deploy Staging run 34176604002](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176604002).

The workflow checked out that exact 40-character SHA and deployed only the
`transitionforward-staging` Cloudflare Worker. Its fail-closed public health
check reported:

- `app_env=staging` and `vite_app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact commit `2b256c8389f7c400d24d449e7af31558a0e2a40a`; and
- `isolation.ok=true` with no isolation errors.

The deployment also passed its staging-intent, locked-dependency,
sandbox-payment, output-contract, Wrangler dry-run, staging cron-secret,
exact-SHA identity, and privacy-safe service-worker checks.

## Protected push checks

Every protected push workflow attached to the merge completed successfully at
the exact candidate SHA:

| Check | Run |
| --- | ---: |
| Production Readiness Audit | [34176545831](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545831) |
| Build & SSR Verification | [34176545845](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545845) |
| Report accessibility (axe-core) | [34176545832](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545832) |
| CT Seed v2 Audit | [34176545842](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545842) |
| Dashboard regression | [34176545808](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545808) |
| Permission regression QA | [34176545840](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545840) |
| Cross-district RLS QA | [34176545820](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545820) |
| RLS regression QA | [34176545825](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545825) |
| Role-guard QA | [34176545811](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545811) |
| Migration Replay | [34176545827](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34176545827) |

No comparison threshold, environment gate, role guard, permission assertion,
RLS assertion, staging identity check, or security boundary was weakened.

## Consolidated Release Readiness

[Release Readiness run 34177650200](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34177650200)
passed against the same exact deployed SHA. Its role-based browser journeys and
release checks completed successfully. The report artifact was uploaded with
digest `sha256:1d86c3fb34047294e529d432fed33a0397933982e0dd12c478187ced1ca69b60`.

## Lovable status and remaining gates

Lovable's basic and deep security scans were refreshed after the PR #98 staging
acceptance. Lovable reported that the scans were current, with no active issues,
9 ignored findings, and 0 known issues among 77 packages. The live staging
catalog independently verified findings 1–6 as controlled and did not reproduce
the public-schema extension finding. Findings 7–8 remain open because 17
security-definer routines are executable by PUBLIC, 24 by anonymous callers,
and 68 by authenticated callers. Every one of the 74 routines has an explicit
search path, but the execution grants still require a focused least-privilege
review and migration. Full details are recorded in
`security-finding-alignment-2026-09-07.md`.

The separate Lovable exact-SHA hosted-build gate remains unresolved. No Lovable
build, retry, or publish was triggered during this security evidence pass.

Production remains NO-GO until the independent unchecked items in
`release-checklist.md` are closed with evidence, including:

1. a focused least-privilege correction and regression suite for privileged
   routine execution grants;
2. a successful Lovable connected build mapped to the exact approved Git SHA;
3. verified production secret isolation and live Stripe readiness;
4. email, observability, malware scanning, incident response, and legal/privacy
   controls required before real student or IEP data is accepted;
5. completed Cloudflare proxy/protection and rollback evidence;
6. approved production smoke and billing-lifecycle tests; and
7. separate owner authorization for the exact production publish and DNS window.

No unchecked production item is closed by this staging-only record.
