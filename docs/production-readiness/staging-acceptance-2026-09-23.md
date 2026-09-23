# Exact-SHA isolated-staging acceptance — 2026-09-23

Decision: **ISOLATED STAGING DEPLOYMENT, STANDARD PROTECTED CHECKS, AND
CONSOLIDATED RELEASE READINESS PASSED. Production remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, antivirus run, real student/IEP upload,
or live payment.

## Exact candidate and deployment

Protected `main` SHA
`274813670bf9aba20aafa32d601eff305a3f0a15` (PR #164) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 35905590583](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905590583).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks,
exact-SHA identity verification, and PWA asset verification. The public health
contract independently reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false`;
- Stripe sandbox mode with `stripe_livemode=false`;
- exact commit `274813670bf9aba20aafa32d601eff305a3f0a15`; and
- `isolation.ok=true` with no isolation errors.

## Standard protected checks

Every standard protected push workflow for the candidate completed
successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [35905471029](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471029) | PASS   |
| Build & SSR Verification        | [35905471143](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471143) | PASS   |
| Report accessibility (axe-core) | [35905471004](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471004) | PASS   |
| CT Seed v2 Audit                | [35905470980](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905470980) | PASS   |
| Dashboard regression            | [35905470964](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905470964) | PASS   |
| Permission regression QA        | [35905471052](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471052) | PASS   |
| Cross-district RLS QA           | [35905471097](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471097) | PASS   |
| RLS regression QA               | [35905470990](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905470990) | PASS   |
| Role-guard QA                   | [35905471021](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905471021) | PASS   |

The authenticated Dashboard and Role-guard workflows confirmed exact-SHA
staging identity, created all seven synthetic role storage states, and passed
their dedicated browser suites. The database-facing checks stayed limited to
the isolated staging project.

## Consolidated Release Readiness

[Release Readiness run 35905951167](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35905951167)
passed against the same exact deployment in one attempt. It verified:

- isolated staging reachability and exact environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layouts, and visual
  regression;
- signed-in role journeys, access control, dashboards, and core workflows; and
- removal of credential-bearing Playwright artifacts before evidence upload.

The retained sanitized `playwright-report` artifact is `10771099833` with
digest
`sha256:9446fa0a19b0789deb70f6000ed740fdbdbf8010e2a05b9418727283a73d5778`.
No failure screenshots, traces, videos, or test-result artifacts remained to
upload.

## Scope and remaining boundary

This candidate supersedes
`62bf4113c1ef5806f7fa3d78987d62cec49413bf` as the current consolidated
isolated-staging acceptance snapshot. PR #163 connected advertised public
features to their real demo or signed-in tools, and PR #164 aligned only the 12
verified Linux visual baselines for the home, families, educators, and partners
pages across mobile, tablet, and desktop. Neither PR changed production
configuration.

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
