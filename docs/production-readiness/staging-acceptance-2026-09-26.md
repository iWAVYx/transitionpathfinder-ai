# Exact-SHA isolated-staging acceptance — 2026-09-26

Decision: **ISOLATED STAGING DEPLOYMENT, STANDARD PROTECTED CHECKS, AND
CONSOLIDATED RELEASE READINESS PASSED. Production remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, antivirus run, real student/IEP upload,
or live payment.

## Exact candidate and deployment

Protected `main` SHA
`ac8fe39ac71308b54704d37ec1d893895b2c9a01` (PR #181) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 36237314092](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237314092).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks,
exact-SHA identity verification, and PWA asset verification. The deployment
remained tied to isolated Supabase project `qgrertkqbwanerqqemph`, the staging
hostname, and Stripe sandbox mode.

## Standard protected checks

Every standard protected push workflow for the candidate completed
successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [36237302645](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302645) | PASS   |
| Build & SSR Verification        | [36237302729](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302729) | PASS   |
| Report accessibility (axe-core) | [36237302659](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302659) | PASS   |
| CT Seed v2 Audit                | [36237302644](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302644) | PASS   |
| Dashboard regression            | [36237302651](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302651) | PASS   |
| Permission regression QA        | [36237302669](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302669) | PASS   |
| Cross-district RLS QA           | [36237302746](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302746) | PASS   |
| RLS regression QA               | [36237302668](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302668) | PASS   |
| Role-guard QA                   | [36237302643](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237302643) | PASS   |

The authenticated Dashboard and Role-guard workflows confirmed exact-SHA
staging identity, created all seven synthetic role storage states, and passed
their dedicated browser suites. The database-facing checks stayed limited to
the isolated staging project.

## Consolidated Release Readiness

[Release Readiness run 36237715068](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/36237715068)
passed against the same exact deployment in one attempt. It verified:

- isolated staging reachability and exact environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layouts, and visual
  regression;
- signed-in role journeys, access control, dashboards, and core workflows; and
- removal of credential-bearing Playwright artifacts before evidence upload.

The retained sanitized `playwright-report` artifact is `10904856572` with
digest
`sha256:c5283e1d49a5b72a9e04444dde0a02eee5d409909094a310be4318a17c6bf35a`.
No failure screenshots, traces, videos, or test-result artifacts remained to
upload.

## Scope and remaining boundary

This candidate supersedes
`484827c0414bf4c7ce50b71e9bc5db23b1be1ebf` as the current consolidated
isolated-staging acceptance snapshot. It retains the previously accepted live
Pathway intake and Student, Family, Educator, School Admin, and District Admin
dashboard work, and adds the reviewed Partner and Owner live-data,
preview-first dashboard alignment. It also includes the three intentional
Owner Hub mobile, tablet, and desktop visual baselines merged through PR #181.
The visual threshold remains unchanged.

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
