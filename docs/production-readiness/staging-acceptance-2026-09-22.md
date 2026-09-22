# Exact-SHA isolated-staging acceptance — 2026-09-22

Decision: **ISOLATED STAGING DEPLOYMENT, PROTECTED CHECKS, AND CONSOLIDATED
RELEASE READINESS PASSED. Production remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, antivirus run, real student/IEP upload,
or live payment.

## Exact candidate and deployment

Protected `main` SHA
`7cdb7cdcb88a186d7428f52a45a60d833578f39b` (PR #155) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 35692279156](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692279156).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks, exact-SHA
identity verification, and PWA asset verification. The protected deployment
record identifies environment `staging`, `production_environment=false`, and
exact commit `7cdb7cdcb88a186d7428f52a45a60d833578f39b`.

## Protected push checks

Every standard protected push workflow for the candidate completed
successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [35692210346](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210346) | PASS   |
| Build & SSR Verification        | [35692210358](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210358) | PASS   |
| Report accessibility (axe-core) | [35692210366](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210366) | PASS   |
| CT Seed v2 Audit                | [35692210379](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210379) | PASS   |
| Dashboard regression            | [35692210334](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210334) | PASS   |
| Permission regression QA        | [35692210371](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210371) | PASS   |
| Cross-district RLS QA           | [35692210438](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210438) | PASS   |
| RLS regression QA               | [35692210487](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210487) | PASS   |
| Role-guard QA                   | [35692210365](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35692210365) | PASS   |

The authenticated Dashboard and Role-guard workflows confirmed exact-SHA
staging identity, created all seven synthetic role storage states, and passed
their dedicated browser suites. The database-facing protected checks remained
limited to the isolated staging project.

## Consolidated Release Readiness

[Release Readiness run 35693326975](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35693326975)
passed against the same exact deployment. It verified:

- isolated staging reachability and exact environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layout, and visual
  regression, including the corrected homepage hero contrast and mobile
  baseline;
- signed-in role journeys, access control, and core workflows; and
- credential-safe evidence sanitization before artifact upload.

The retained `playwright-report` artifact is `10679334709` with digest
`sha256:e9ea90a60cb371f07f8de2d6a1693ddc244599538b20ba066e92dca5d1629370`.
No failure media remained to upload.

## Scope and remaining boundary

This acceptance supersedes `193bed60f8d3d4233aab7cc043709e52cb388790` as the
current isolated-staging application candidate. It records the homepage
contrast repair, aligned mobile visual baseline, exact deployment, standard
protected checks, and consolidated browser acceptance.

No antivirus workflow was dispatched or rerun for this candidate. The single
synthetic Cloudmersive channel-attachment proof recorded in
`staging-acceptance-2026-09-20.md` remains historical evidence for its exact SHA
only; it is not promoted to this candidate. Provider/privacy approval,
equivalent `student-documents` proof, production configuration, and the pending
production migrations remain separate gates.

No Lovable publish, database migration, production deployment, DNS change,
secret change, live payment, or production smoke test occurred while collecting
this evidence.

Production remains **NO-GO**.
