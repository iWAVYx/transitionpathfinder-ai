# Exact-SHA staging acceptance — 2026-09-06

Decision: **STAGING ACCEPTANCE PASSED; production remains NO-GO.** This was an
isolated-staging deployment and evidence run. It did not build or publish
Lovable, deploy a production application, alter production DNS or secrets,
migrate either database, or run a live payment.

## Exact candidate and isolation

Protected `main` SHA
`29b0575d4f99ad4e7f57bafa40f67535ea4675d4` (PR #91, following the
Phase 1 brand foundation in PR #90) was deployed by
[Deploy Staging run 34044555082](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044555082).
The deployment passed its staging-intent, locked-dependency, sandbox-Stripe,
output-contract, Wrangler dry-run, staging cron-secret, exact-SHA identity, and
PWA checks.

The public staging health endpoint independently reported:

- `app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_staging_target=true` and `is_production_target=false`;
- `stripe_mode=sandbox`;
- exact commit `29b0575d4f99ad4e7f57bafa40f67535ea4675d4`; and
- `isolation.ok=true` with no isolation errors.

## Protected push checks

Every listed workflow completed successfully at the exact candidate SHA. All
passed on the first attempt except the controlled Role-guard rerun documented
below:

| Check | Run |
| --- | ---: |
| Production Readiness Audit | [34044445740](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445740) |
| Build & SSR Verification | [34044445848](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445848) |
| Report accessibility (axe-core) | [34044445688](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445688) |
| CT Seed v2 Audit | [34044445760](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445760) |
| Dashboard regression | [34044445746](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445746) |
| Permission regression QA | [34044445765](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445765) |
| Cross-district RLS QA | [34044445815](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445815) |
| RLS regression QA | [34044445656](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445656) |
| Role-guard QA (attempt 2) | [34044445724](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34044445724) |

The first Role-guard browser attempt completed 236 assertions before one
School Administrator navigation was aborted by Playwright with
`net::ERR_ABORTED` while the frame detached. The independently running
Dashboard regression passed the same signed-in role-access coverage on the
same deployment. One controlled failed-job rerun, with no code or test change,
then passed the complete Role-guard suite. Permission, RLS, cross-district,
role, dashboard, and seed assertions all executed; no security assertion,
environment gate, comparison threshold, or staging identity check was removed
or weakened.

## Consolidated release-readiness run

The manually dispatched, protected
[Release readiness run 34045529249](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34045529249)
passed on attempt 1. Its GitHub deployment record identified environment
`staging` (ID `19355000275`), exact SHA
`29b0575d4f99ad4e7f57bafa40f67535ea4675d4`, and
`production_environment=false`.

The run passed:

- staging reachability and exact deployment identity;
- all seven synthetic role sign-ins and storage states;
- public release-readiness, accessibility, and visual-regression tests; and
- signed-in role journeys, access controls, and workflows.

The preceding Phase 1 brand deployment at `4fc779d2` passed 97 public,
accessibility, responsive, and functional assertions but correctly rejected 33
visual snapshots that still represented the old identity. PR #91 updated only
those 33 PNG baselines from the captured isolated-staging screenshots; it did
not change application code, visual-test logic, or the 2% comparison threshold.
The final run above passed the aligned public and signed-in visual comparisons
as well as the later signed-in journeys.

## Remaining release gates

This evidence supersedes the earlier `58804aca` acceptance recorded on the
same date and closes the current isolated-staging acceptance step only.
Production remains NO-GO until
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
