# Exact-SHA isolated-staging evidence — 2026-09-07

Decision: **ISOLATED STAGING DEPLOYMENT AND PROTECTED PUSH CHECKS PASSED;
production remains NO-GO.** This evidence records the latest protected `main`
deployment. It does not claim a Lovable hosted-build pass and does not authorize
a production publish, production DNS change, database migration, secret change,
or live payment.

## Exact candidate and isolation

Protected `main` SHA
`3cc06ade646e2d73779ee38c029209a68eada179` (PR #96) was deployed by
[Deploy Staging run 34154404480](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34154404480).

The workflow checked out that exact 40-character SHA and deployed only the
`transitionforward-staging` Cloudflare Worker. Its fail-closed health check saw
the prior SHA on the first propagation attempt, then passed on the second attempt
after the public endpoint reported:

- `app_env=staging` and `vite_app_env=staging`;
- hostname `transitionforward-staging.caysi101.workers.dev`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact commit `3cc06ade646e2d73779ee38c029209a68eada179`; and
- `isolation.ok=true` with no isolation errors.

The deployment also passed its staging-intent, locked-dependency,
sandbox-payment, output-contract, Wrangler dry-run, staging cron-secret,
exact-SHA identity, and privacy-safe service-worker checks.

## Protected push checks

Every protected push workflow attached to the merge completed successfully at
the exact candidate SHA:

| Check | Run |
| --- | ---: |
| Production Readiness Audit | [34153945946](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945946) |
| Build & SSR Verification | [34153945953](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945953) |
| Report accessibility (axe-core) | [34153945980](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945980) |
| CT Seed v2 Audit | [34153945930](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945930) |
| Dashboard regression | [34153945990](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945990) |
| Permission regression QA | [34153946007](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153946007) |
| Cross-district RLS QA | [34153946004](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153946004) |
| RLS regression QA | [34153945935](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945935) |
| Role-guard QA | [34153945936](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34153945936) |

No comparison threshold, environment gate, role guard, permission assertion,
RLS assertion, staging identity check, or security boundary was weakened.

## Consolidated-suite boundary

No separate manually dispatched `Release Readiness` run is attached to
`3cc06ade646e2d73779ee38c029209a68eada179`. The most recent consolidated
browser-suite evidence remains the protected run documented for the preceding
accepted candidate. This record therefore supersedes the repository's current
isolated-staging deployment identity and protected-push evidence, but it does
not misrepresent that older consolidated run as having executed at this SHA.

## Lovable status and remaining gates

Lovable Settings → Git showed repository `iWAVYx/transitionpathfinder-ai`, branch
`main`, and an in-sync state after PR #96. The Lovable hosted-build history for
the same merge still displayed `Build unsuccessful` and `Preview is out of
date`, while the editor's live preview rendered the TransitionForward homepage.
A sanitized evidence packet was prepared for the existing Lovable Support case;
no preview token was disclosed and no build, retry, or publish was triggered.

Production remains NO-GO until the independent unchecked items in
`release-checklist.md` are closed with evidence, including:

1. a successful Lovable connected build mapped to the exact approved Git SHA;
2. verified production secret isolation and live Stripe readiness;
3. email, observability, malware scanning, incident response, and legal/privacy
   controls required before real student or IEP data is accepted;
4. completed Cloudflare proxy/protection and rollback evidence;
5. approved production smoke and billing-lifecycle tests; and
6. separate owner authorization for the exact production publish and DNS window.

No unchecked production item is closed by this staging-only record.
