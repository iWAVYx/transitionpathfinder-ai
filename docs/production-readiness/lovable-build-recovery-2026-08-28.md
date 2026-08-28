# Lovable hosted-build recovery — 2026-08-28

Decision: **Production remains NO-GO.** This change repairs the connected
Lovable build path only. It does not publish Lovable, trigger a hosted build,
deploy production or staging, change a secret, run a payment, or modify either
database.

## Observed production state

Protected `main` SHA `f134a37a9b33f35d572fb7de683ed129a9992ed8`
was published once through Lovable under separate owner authorization. The
public application loads and the production health response identifies that
exact SHA, the canonical production hostname, and production Supabase project
`lrqcntqyekucamifpffs`. It does not target staging.

The health endpoint remains fail-closed with HTTP 503 because the deployed
server bundle reports `VITE_APP_ENV` and Stripe mode as unknown. Lovable's
connected-build cards for the recent commits, including PR #70, report
`Build unsuccessful` and `Preview is out of date`. Updating the published
release label therefore did not prove that Lovable rebuilt the server code.

## Recovery change

The last documented successful Lovable hosted build used the supported
single-pass `vite build` pipeline merged in PR #43. The later custom split-build
orchestrator runs client, SSR, and Nitro work through multiple builder
processes. It succeeds locally, but every observed Lovable card after that
change remains unsuccessful.

This recovery returns the default hosted build to one bounded Vite application
build, followed by the existing service-worker generator. It retains:

- the authenticated-route server stubs;
- garbage collection between build environments;
- disabled source maps and compressed-size reporting;
- bounded Rollup file concurrency;
- exact checked-out SHA resolution;
- production/staging environment identity checks; and
- all RLS, MFA, role, payment, and credential-isolation controls.

The protected staging build keeps its dedicated 4 GiB CI command and is not
changed by this recovery.

## Required post-merge acceptance

1. Merge only after review and explicit owner authorization.
2. Allow exactly one connected Lovable hosted build for the resulting exact
   40-character merge SHA. Do not publish or retry during this step.
3. Require Lovable to report `Build successful` and a current preview for that
   exact SHA. `Build unsuccessful`, `Preview is out of date`, an internal-only
   identifier, or a different SHA remains a release stop.
4. Verify the preview health contract without exposing credentials.
5. Obtain separate owner authorization before any production publish.
6. After publish, require `/api/public/env-health` to return HTTP 200 with both
   environment labels set to `production`, live Stripe mode, production
   Supabase/hostname identities, the exact merge SHA, and no isolation errors.
