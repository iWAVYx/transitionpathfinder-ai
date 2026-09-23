# Exact-SHA isolated-staging acceptance — 2026-09-23

Decision: **ISOLATED STAGING DEPLOYMENT, STANDARD PROTECTED CHECKS, AND
CONSOLIDATED RELEASE READINESS PASSED. Production remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, antivirus run, real student/IEP upload,
or live payment.

## Exact candidate and deployment

Protected `main` SHA
`62bf4113c1ef5806f7fa3d78987d62cec49413bf` (PR #161) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 35811577541](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811577541).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks,
exact-SHA identity verification, and PWA asset verification. The public health
contract independently reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false`;
- Stripe sandbox mode with `stripe_livemode=false`;
- exact commit `62bf4113c1ef5806f7fa3d78987d62cec49413bf`; and
- `isolation.ok=true` with no isolation errors.

## Standard protected checks

Every standard protected push workflow for the candidate completed
successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [35811002374](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002374) | PASS   |
| Build & SSR Verification        | [35811002366](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002366) | PASS   |
| Report accessibility (axe-core) | [35811002344](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002344) | PASS   |
| CT Seed v2 Audit                | [35811002346](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002346) | PASS   |
| Dashboard regression            | [35811002421](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002421) | PASS   |
| Permission regression QA        | [35811002385](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002385) | PASS   |
| Cross-district RLS QA           | [35811002353](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002353) | PASS   |
| RLS regression QA               | [35811002433](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002433) | PASS   |
| Role-guard QA                   | [35811002376](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35811002376) | PASS   |

The authenticated Dashboard and Role-guard workflows confirmed exact-SHA
staging identity, created all seven synthetic role storage states, and passed
their dedicated browser suites. The database-facing checks stayed limited to
the isolated staging project.

## Consolidated Release Readiness

[Release Readiness run 35812391876](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35812391876)
passed against the same exact deployment in one attempt. It verified:

- isolated staging reachability and exact environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layouts, and visual
  regression;
- signed-in role journeys, access control, dashboards, and core workflows; and
- removal of credential-bearing Playwright artifacts before evidence upload.

The retained sanitized `playwright-report` artifact is `10730336556` with
digest
`sha256:fcd3a64f075dcf4cae880f309fa350dcb3f2287905011f48acc2864add60a14e`.
No failure screenshots, traces, videos, or test-result artifacts remained to
upload.

## Scope and remaining boundary

This candidate supersedes
`7cdb7cdcb88a186d7428f52a45a60d833578f39b` as the current consolidated
isolated-staging acceptance snapshot. PR #161 recorded the separately proven
student-document malware path and did not change production configuration.

No antivirus workflow was dispatched or rerun for this candidate. The
Cloudmersive channel-attachment proof remains tied to exact SHA
`193bed60f8d3d4233aab7cc043709e52cb388790` and run `35521640583`; the
student-document proof remains tied to exact SHA
`848af3ef0220a31df8d5c3b65937b328898f8082` and run `35810041318`. Both are
historical, synthetic-only evidence and do not set
`production.malwareScanningVerified=true`.

No Lovable publish, database migration, production deployment, DNS change,
secret change, live payment, or production smoke test occurred while collecting
this evidence. Provider/privacy approval, production configuration, three
pending production migrations, live Stripe, email, observability, legal,
Cloudflare, smoke-test, and rollback gates remain open.

Production remains **NO-GO**.
