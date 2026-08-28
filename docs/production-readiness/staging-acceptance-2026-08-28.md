# Exact-SHA staging acceptance — 2026-08-28

Decision: **STAGING ACCEPTANCE PASSED; production remains NO-GO.** This was an
isolated-staging deployment and evidence run. It did not publish Lovable,
deploy a production application, alter production DNS or secrets, migrate the
production database, or run a live payment.

## Exact candidate and isolation

Protected `main` SHA
`eb9fc5d4d065159ec01713dac2e936b2a005454f` (PR #68) was deployed by
[Deploy Staging run 33144143505](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33144143505).
The deployment passed its staging-intent, sandbox-Stripe, output-contract,
Wrangler dry-run, exact-SHA identity, and PWA checks.

The public staging health endpoint independently reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- the exact 40-character candidate SHA; and
- `isolation.ok=true` with no isolation errors.

## Protected checks

Every listed run completed successfully at the exact candidate SHA:

| Check | Run |
| --- | ---: |
| Build & SSR Verification | [33143981851](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981851) |
| Report accessibility (axe-core) | [33143981882](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981882) |
| CT Seed v2 Audit | [33143981839](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981839) |
| Dashboard regression | [33143981855](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981855) |
| Permission regression QA | [33143981764](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981764) |
| Cross-district RLS QA | [33143981725](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981725) |
| RLS regression QA | [33143981710](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981710) |
| Role-guard QA | [33143981810](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981810) |
| Production Readiness Audit | [33143981763](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33143981763) |

The manually dispatched, protected
[Release readiness run 33147001032](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33147001032)
also passed on attempt 1. Before approval, its pending deployment was verified
as environment `staging` (ID `19355000275`), non-production, and exact SHA
`eb9fc5d4d065159ec01713dac2e936b2a005454f`. It then passed all seven synthetic
role sign-ins and storage states, public accessibility and visual journeys, and
signed-in role journeys and access controls.

An obsolete scheduled release-readiness run for old SHA
`9a4bbb979118abb05d34da79dd44c8db8a76d2e3` was cancelled because it had been
waiting at the staging approval gate since 2026-08-26 and occupied the workflow
concurrency slot. It did not execute protected tests or change an environment.

## Remaining release gates

This evidence closes the current isolated-staging acceptance step only. The
release remains NO-GO until the independent unchecked items in
`release-checklist.md` have evidence, including:

1. a successful Lovable connected build mapped to the exact approved Git SHA;
2. separately authorized production publish and health verification;
3. live Stripe, email, observability, malware-scanning, security, incident,
   privacy/legal, and operational evidence; and
4. reviewed Cloudflare proxy/protection configuration and rollback evidence.

No unchecked production item is changed by this staging pass.
