# Exact-SHA staging acceptance — 2026-09-02

Decision: **STAGING ACCEPTANCE PASSED; production remains NO-GO.** This was a
read-only verification of the already-deployed isolated staging candidate. It
did not publish Lovable, deploy or modify production, change either database,
change secrets or DNS, run a live payment, or consume a Lovable build attempt.

## Exact candidate and isolation

Protected `main` SHA
`611789b11f00b86a3acaa5d092eddd3e84190d36` (PR #82) was already deployed by
[Deploy Staging run 33450384287](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33450384287).

The public staging health endpoint was verified again on 2026-09-02 and
reported:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false` and `is_production_target=false`;
- `stripe_mode=sandbox` and `stripe_livemode=false`;
- exact SHA `611789b11f00b86a3acaa5d092eddd3e84190d36`; and
- `isolation.ok=true` with no isolation errors.

The public `e2e.transitionforwardct.com` health endpoint independently returned
the same isolated staging identity and SHA. Although Lovable's domain panel
lists that hostname, Cloudflare currently routes it to the isolated staging
deployment rather than the Lovable production origin.

## Protected checks

The existing protected push workflows for the exact SHA were successful,
including build/SSR, migration and RLS regression, permission and
cross-district checks, role guards, dashboard regression, accessibility, CT
Seed v2, and the production-readiness static audit.

The manually dispatched, protected
[Release readiness run 33688939519](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/33688939519)
was verified before approval as environment `staging`, branch `main`, and exact
SHA `611789b11f00b86a3acaa5d092eddd3e84190d36`. It then passed:

- isolated-staging password and all seven role-credential requirements;
- base URL and exact deployed-SHA preflights;
- all seven synthetic-role sign-ins and saved authentication states;
- public release-readiness, accessibility, and visual regression; and
- signed-in role journeys, access control, and core workflows.

The job completed successfully in 10 minutes 49 seconds. Test artifacts were
uploaded by the protected workflow.

An obsolete release-readiness run for old SHA
`f134a37a9b33f35d572fb7de683ed129a9992ed8` was cancelled before the new run
because it had remained at the staging approval gate and held the workflow's
single concurrency slot. It did not execute against or change staging.

## Lovable preview branch containment

The experimental `lovable/preview-611789b1` branch is not a staging deployment
source. Lovable advanced its remote head beyond the locally reviewed trigger
commit, so the branch remains quarantined and was not merged or deployed.
GitHub's staging environment continues to allow only `main`; an attempted
branch dispatch was rejected by that rule before any deployment step ran.

## Remaining release gates

This evidence closes the current isolated-staging acceptance step only. The
unchecked production items in `release-checklist.md` remain release stops,
including the exact Lovable build/publish identity, production health, live
Stripe transaction evidence, security findings, Cloudflare account-level
protections, email/monitoring/malware controls, and operational/legal approval.

