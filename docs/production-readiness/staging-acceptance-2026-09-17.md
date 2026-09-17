# Exact-SHA isolated-staging evidence — 2026-09-17

Decision: **ISOLATED STAGING DEPLOYMENT, PROTECTED CHECKS, AND CONSOLIDATED
RELEASE READINESS PASSED; production remains NO-GO.** This record captures the
current protected `main` candidate after the Next Actions status-badge contrast
correction. It does not authorize a Lovable build or publish, production DNS or
configuration change, database migration, secret change, antivirus retry, or
live payment.

## Exact candidate and isolation

Protected `main` SHA
`83890ab47fe55bdbac0569f68eaecc025e5d9b0e` (PR #134) was deployed by
[Deploy Staging run 35180151307](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35180151307).

The workflow checked out that exact 40-character SHA and deployed only the
`transitionforward-staging` Cloudflare Worker. The workflow's fail-closed check
and an independent post-run request to `/api/public/env-health` both reported:

- `app_env=staging` and `vite_app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact commit `83890ab47fe55bdbac0569f68eaecc025e5d9b0e`; and
- `isolation.ok=true` with no isolation errors.

The deployment also passed its staging-intent confirmation, locked dependency
install, deployment-identity and Stripe guard tests, live-credential refusal,
staging build, output contract, Wrangler dry run, protected runtime-secret
checks, exact-SHA verification, and deployed PWA asset checks.

## Protected checks

Every protected push workflow triggered for this merge completed successfully
at the exact candidate SHA:

| Check | Run | Result |
| --- | ---: | --- |
| Production Readiness Audit | [35179827671](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827671) | PASS |
| Build & SSR Verification | [35179827676](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827676) | PASS |
| Report accessibility (axe-core) | [35179827700](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827700) | PASS |
| CT Seed v2 Audit | [35179827697](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827697) | PASS |
| Dashboard regression | [35179827716](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827716) | PASS |
| Permission regression QA | [35179827720](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827720) | PASS |
| Cross-district RLS QA | [35179827670](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827670) | PASS |
| RLS regression QA | [35179827632](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827632) | PASS |
| Role-guard QA | [35179827643](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35179827643) attempt 2 | PASS |

The first Role-guard browser attempt reported 217 passed, 20 failed by timeout,
and 2 skipped out of 239 tests while several other heavy browser suites were
using staging concurrently. The failures were unrelated `page.goto` timeouts
and aborted navigations, not failed authorization assertions. After the other
suites completed, only the failed protected job was rerun without a code, test,
threshold, environment, or configuration change. Attempt 2 completed the
role-leak navigation and access guard successfully in isolation.

No migration file changed in PR #134, so a new Migration Replay run was not
triggered by this merge. The already accepted canonical migration tree and the
three antivirus-independent staging migration records were not changed or
reapplied.

## Consolidated Release Readiness

[Release Readiness run 35180363649](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35180363649)
passed against the same exact deployed SHA. It verified:

- staging reachability and exact environment identity;
- all seven synthetic staging role credentials and storage states;
- public release-readiness, accessibility, and visual regression;
- the corrected Student Dashboard status-badge contrast; and
- signed-in role journeys, access control, and core workflows.

The retained `playwright-report` artifact has digest
`sha256:b066597967defe2ac519a1f60ab6406b341965fd15fd4c5d51c9e30c395583db`.

## Boundaries and remaining gates

This pass closes the staging accessibility blocker found on the previous
candidate. It does not close independent production requirements in
`release-checklist.md`.

In particular:

1. production still requires a fresh SELECT-only pre-window baseline, named
   release/database/abort owners, and separate authorization before the three
   reviewed antivirus-independent security migrations can run;
2. the two attachment migrations remain blocked on private-scanning
   provider/privacy approval and protected clean-file/EICAR proof;
3. production secret isolation, live Stripe, email, observability,
   legal/privacy, Cloudflare, smoke-test, and rollback evidence remain open; and
4. a production Lovable publish, DNS window, database migration, or live payment
   still requires its own explicit authorization.

No unchecked production item is closed by this staging-only record.
