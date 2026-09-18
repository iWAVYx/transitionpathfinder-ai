# Exact-SHA isolated-staging evidence — 2026-09-18

Decision: **ISOLATED STAGING DEPLOYMENT, PROTECTED CHECKS, AND CONSOLIDATED
RELEASE READINESS PASSED; production remains NO-GO.** This record captures the
current protected `main` candidate after the production-security maintenance
evidence merge. It does not authorize a Lovable build or publish, production
DNS or configuration change, database migration, secret change, antivirus
retry, or live payment.

## Exact candidate and isolation

Protected `main` SHA
`308c274f7ffbdb8a9eb7ed0f4ff1a02a3d4eb430` (PR #136) was deployed by
[Deploy Staging run 35307324390](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35307324390).

The workflow checked out that exact 40-character SHA and deployed only the
`transitionforward-staging` Cloudflare Worker. The workflow's fail-closed check
and an independent post-run request to `/api/public/env-health` both reported:

- `app_env=staging` and `vite_app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact commit `308c274f7ffbdb8a9eb7ed0f4ff1a02a3d4eb430`; and
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
| Production Readiness Audit | [35306972293](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972293) | PASS |
| Build & SSR Verification | [35306972295](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972295) | PASS |
| Report accessibility (axe-core) | [35306972298](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972298) | PASS |
| CT Seed v2 Audit | [35306972292](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972292) | PASS |
| Dashboard regression | [35306972336](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972336) | PASS |
| Permission regression QA | [35306972301](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972301) | PASS |
| Cross-district RLS QA | [35306972319](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972319) | PASS |
| RLS regression QA | [35306972283](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972283) | PASS |
| Role-guard QA | [35306972290](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35306972290) | PASS |

PR #136 changed production-readiness documentation only. It changed no
migration or application file, so no migration was applied or reapplied and a
new Migration Replay run was not triggered by this merge.

## Consolidated Release Readiness

[Release Readiness run 35337890892](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35337890892)
passed against the same exact deployed SHA. It verified:

- staging reachability and exact environment identity;
- all seven synthetic staging role credentials and storage states;
- public release-readiness, accessibility, responsive layout, and visual
  regression; and
- signed-in role journeys, access control, and core workflows.

The retained `playwright-report` artifact has digest
`sha256:bcd51e69551dbef14b19e14d9bdcfd86426fcda5e5baca0c54ecc822a9d3cf83`.

An unapproved scheduled run for older SHA
`f933401803e26ac76e3190d71cab9ca8c8b52536` was holding the workflow's
single-run queue. Run `35221113451` was canceled without approving its staging
environment so the explicitly authorized exact-SHA run could proceed. The
stale run did not deploy or change staging or production.

## Boundaries and remaining gates

This pass supersedes the prior staging-acceptance candidate. It does not close
the independent production requirements in `release-checklist.md`.

In particular:

1. the two attachment migrations remain blocked on private-scanning
   provider/privacy approval and protected clean-file/EICAR proof;
2. production secret isolation, live Stripe, email, observability,
   legal/privacy, Cloudflare, smoke-test, and rollback evidence remain open;
3. production application health must identify the exact reviewed SHA,
   production environment, and live Stripe configuration; and
4. a production Lovable publish, DNS window, database migration, or live
   payment still requires its own explicit authorization.

No unchecked production item is closed by this staging-only record.
