# Lovable isolated-staging build profile — 2026-09-27

## Purpose

The production Lovable project serves both its Test preview and published Live
site from one application bundle. That shared production bundle must keep the
reviewed production environment label and both public Stripe modes.

The separate `TransitionForward - Isolated Staging` Lovable project never
serves production. Requiring production labels and a live Stripe public token
prevented its exact source-parity build from starting even though it remained
connected only to the isolated staging Supabase project.

## Build profiles

### Shared production Lovable project

- `APP_ENV` must be `production`.
- `VITE_APP_ENV` must be `production`.
- A sandbox Stripe publishable token is required for Test preview requests.
- A live Stripe publishable token is required for the published site.
- Existing production runtime identity and health checks remain unchanged.

### Isolated staging Lovable project

- Both `APP_ENV` and `VITE_APP_ENV` must explicitly be `staging` before the
  staging-only profile is selected.
- The tracked live Stripe public input is excluded from the build.
- An optional Stripe public token must be sandbox-only.
- If no sandbox public token is configured, the application can build while
  checkout remains disabled and environment health continues to report the
  missing payment proof instead of claiming full readiness.
- Runtime identity must still resolve to staging, the isolated Supabase project
  `qgrertkqbwanerqqemph`, and an approved isolated-staging hostname.

## Safety boundary

This change does not add or copy Stripe credentials, relax production build
requirements, alter database state, run migrations, change DNS, or authorize a
production publish. Production remains fail closed.

## Verification

- 51 focused build-input and production-readiness contract checks passed.
- TypeScript completed with no errors.
- A local Lovable-style build with explicit staging labels completed the client
  bundle, SSR bundle, Nitro manifest, and service-worker generation.
- The candidate runtime-source fingerprint is
  `5fe096a448f830dfeb9ff4c154a5e2863332653ce4dce3f189bf18ed574c0d2a`
  across 1,028 runtime-source files.

After merge, the isolated Lovable project must be synchronized to the new exact
source fingerprint, built once, and published only after its staging identity
and fingerprint are verified. The signed-in dashboards must then be compared
against their demo counterparts because the currently visible isolated preview
is the older pre-parity build.
