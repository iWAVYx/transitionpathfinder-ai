# Exact-SHA staging acceptance — 2026-09-06

Decision: **STAGING ACCEPTANCE PASSED; production remains NO-GO.** This was an
isolated-staging deployment and evidence run. It did not build or publish
Lovable, deploy a production application, alter production DNS or secrets,
migrate either database, or run a live payment.

## Exact candidate and isolation

Protected `main` SHA
`58804aca00c7752c5123cf29d4a7f48d75aa3755` (PR #88) was deployed by
[Deploy Staging run 34013153533](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013153533).
The deployment passed its staging-intent, locked-dependency, sandbox-Stripe,
output-contract, Wrangler dry-run, staging cron-secret, exact-SHA identity, and
PWA checks.

The public staging health endpoint independently reported:

- `app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_staging_target=true` and `is_production_target=false`;
- `stripe_mode=sandbox`;
- exact commit `58804aca00c7752c5123cf29d4a7f48d75aa3755`; and
- `isolation.ok=true` with no isolation errors.

## Protected push checks

Every listed run completed successfully on its first attempt at the exact
candidate SHA:

| Check | Run |
| --- | ---: |
| Production Readiness Audit | [34013055193](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055193) |
| Build & SSR Verification | [34013055247](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055247) |
| Report accessibility (axe-core) | [34013055202](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055202) |
| CT Seed v2 Audit | [34013055278](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055278) |
| Dashboard regression | [34013055199](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055199) |
| Permission regression QA | [34013055255](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055255) |
| Cross-district RLS QA | [34013055289](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055289) |
| RLS regression QA | [34013055284](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055284) |
| Role-guard QA | [34013055209](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013055209) |

PR #88 replaced the three security workflows' one-off npm installation with
the repository's frozen Bun lockfile. The previously observed npm-internal
`edgesOut` crash did not recur. Permission, RLS, and cross-district assertions
all executed and passed; no security assertion, environment gate, or staging
identity check was removed or weakened.

## Consolidated release-readiness run

The manually dispatched, protected
[Release readiness run 34013864397](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34013864397)
passed on attempt 1. Its GitHub deployment record identified environment
`staging` (ID `19355000275`), exact SHA
`58804aca00c7752c5123cf29d4a7f48d75aa3755`, and
`production_environment=false`.

The run passed:

- staging reachability and exact deployment identity;
- all seven synthetic role sign-ins and storage states;
- public release-readiness, accessibility, and visual-regression tests; and
- signed-in role journeys, access controls, and workflows.

An obsolete scheduled run `33752523087` for old SHA `7be70977` was waiting on
the same protected staging environment and blocked the current run's
concurrency group. It was verified as a scheduled, staging-only request and
canceled without approval or execution so the authorized exact-SHA run could
proceed.

## Remaining release gates

This evidence supersedes the 2026-09-02 staging candidate and closes the
current isolated-staging acceptance step only. Production remains NO-GO until
the independent unchecked items in `release-checklist.md` have evidence,
including:

1. a successful Lovable connected build mapped to the exact approved Git SHA;
2. verified Lovable production secret isolation, live Stripe configuration,
   email, observability, malware scanning, and closed security findings;
3. reviewed Cloudflare proxy/protection and rollback configuration;
4. approved production smoke tests and a low-risk live billing lifecycle; and
5. separate owner authorization for the exact production publish and DNS
   window, followed by observation and a recorded GO decision.

No unchecked production item is changed by this staging pass.
