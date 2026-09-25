# Exact-SHA isolated-staging acceptance — 2026-09-25

Decision: **ISOLATED STAGING DEPLOYMENT, STANDARD PROTECTED CHECKS, AND
CONSOLIDATED RELEASE READINESS PASSED. Production remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, antivirus run, real student/IEP upload,
or live payment.

## Exact candidate and deployment

Protected `main` SHA
`484827c0414bf4c7ce50b71e9bc5db23b1be1ebf` (PR #177) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 36191255623](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191255623).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks,
exact-SHA identity verification, and PWA asset verification. The public health
contract independently reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_hostname=false`;
- Stripe sandbox mode with `stripe_livemode=false`;
- exact commit `484827c0414bf4c7ce50b71e9bc5db23b1be1ebf`; and
- `isolation.ok=true` with no isolation errors.

## Standard protected checks

Every standard protected push workflow for the candidate completed
successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [36191215533](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215533) | PASS   |
| Build & SSR Verification        | [36191215473](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215473) | PASS   |
| Report accessibility (axe-core) | [36191215663](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215663) | PASS   |
| CT Seed v2 Audit                | [36191215529](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215529) | PASS   |
| Dashboard regression            | [36191215499](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215499) | PASS   |
| Permission regression QA        | [36191215583](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215583) | PASS   |
| Cross-district RLS QA           | [36191215422](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215422) | PASS   |
| RLS regression QA               | [36191215590](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215590) | PASS   |
| Role-guard QA                   | [36191215537](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36191215537) | PASS   |

The authenticated Dashboard and Role-guard workflows confirmed exact-SHA
staging identity, created all seven synthetic role storage states, and passed
their dedicated browser suites. The database-facing checks stayed limited to
the isolated staging project.

## Consolidated Release Readiness

[Release Readiness run 36192088943](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36192088943)
passed against the same exact deployment in one attempt. It verified:

- isolated staging reachability and exact environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layouts, and visual
  regression;
- signed-in role journeys, access control, dashboards, and core workflows; and
- removal of credential-bearing Playwright artifacts before evidence upload.

The retained sanitized `playwright-report` artifact is `10888658139` with
digest
`sha256:9887d9c6f2c2783aefafb1d7d06419b6ccbd5305bf16b669b989b9fd177587cd`.
No failure screenshots, traces, videos, or test-result artifacts remained to
upload.

## Scope and remaining boundary

This candidate supersedes
`274813670bf9aba20aafa32d601eff305a3f0a15` as the current consolidated
isolated-staging acceptance snapshot. It includes the deeper live Pathway
intake, preview-first real-data dashboard alignment, duplicate-navigation and
semantic cleanup, mobile role-value layout correction, and the eight reviewed
Student, Educator, and School Admin Linux visual baselines merged through PR
#177. The accepted visual update did not weaken test thresholds.

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
