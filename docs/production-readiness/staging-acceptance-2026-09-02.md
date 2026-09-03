# Exact-SHA staging acceptance — 2026-09-02

Decision: **STAGING ACCEPTANCE PASSED; production remains NO-GO.** This was an
isolated-staging deployment and evidence run. It did not build or publish
Lovable, deploy a production application, alter production DNS or secrets,
migrate either database, or run a live payment.

## Exact candidate and isolation

Protected `main` SHA
`09ccdf6da1f1e444b5c004287855050334e209b4` (PR #85) was deployed by
[Deploy Staging run 33700426165](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33700426165).
The deployment passed its staging-intent, sandbox-Stripe, output-contract,
Wrangler dry-run, staging cron-secret, exact-SHA identity, and PWA checks.

The public staging health endpoint independently reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact commit `09ccdf6da1f1e444b5c004287855050334e209b4`; and
- `isolation.ok=true` with no isolation errors.

## Protected push checks

Every listed run completed successfully at the exact candidate SHA:

| Check | Run |
| --- | ---: |
| Production Readiness Audit | [33699889389](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889389) |
| Build & SSR Verification | [33699889357](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889357) |
| Report accessibility (axe-core) | [33699889395](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889395) |
| CT Seed v2 Audit | [33699889340](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889340) |
| Dashboard regression | [33699889363](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889363) |
| Permission regression QA | [33699889391](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889391) |
| Cross-district RLS QA | [33699889460](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889460) |
| RLS regression QA | [33699889413](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889413) |
| Role-guard QA | [33699889382](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33699889382) |

The Role-guard QA signed-in job had a transient failure on attempt 1 after its
credential-free matrix, deployment identity, per-role authentication, and all
seven storage-state checks had passed. The independent Dashboard regression
run passed the same final role-leak and access-rule guard. Only the failed
Role-guard job was rerun, unchanged, against the same protected environment and
exact SHA; attempt 2 passed. No assertion, permission, role guard, or deployment
identity check was weakened.

## Consolidated release-readiness run

The manually dispatched, protected
[Release readiness run 33704016464](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33704016464)
passed on attempt 1. Before approval, its pending deployment was verified as
environment `staging` (ID `19355000275`), non-production, and exact SHA
`09ccdf6da1f1e444b5c004287855050334e209b4`.

The run passed:

- staging reachability and exact deployment identity;
- all seven synthetic role sign-ins and storage states;
- public release-readiness, accessibility, and visual-regression tests; and
- signed-in role journeys, access controls, and workflows.

## Remaining release gates

This evidence supersedes the 2026-08-28 staging candidate and closes the current
isolated-staging acceptance step only. Production remains NO-GO until the
independent unchecked items in `release-checklist.md` have evidence, including:

1. a successful Lovable connected build mapped to the exact approved Git SHA;
2. verified Lovable production secret isolation, live Stripe configuration,
   email, observability, malware scanning, and closed security findings;
3. reviewed Cloudflare proxy/protection and rollback configuration;
4. approved production smoke tests and a low-risk live billing lifecycle; and
5. separate owner authorization for the exact production publish and DNS
   window, followed by observation and a recorded GO decision.

No unchecked production item is changed by this staging pass.
