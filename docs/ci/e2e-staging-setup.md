# E2E / Staging environment for Playwright live verification

## Why this exists

Production (`https://transitionforwardct.com`) and the custom staging zone can
be protected by Cloudflare browser challenges. Headless Playwright in GitHub
Actions must not weaken or bypass those protections just to run CI.

TransitionForward therefore runs browser E2E against the isolated staging
Worker directly:

```text
https://transitionforward-staging.caysi101.workers.dev
```

This is the same Worker deployed by `.github/workflows/deploy-staging.yml`.
It is staging-only, uses the staging Supabase project and sandbox billing
configuration, and does not route browser CI through the production zone.

## Canonical browser-test URL

`dashboard-regression.yml` and `role-guard-qa.yml` set:

```text
PLAYWRIGHT_BASE_URL=https://transitionforward-staging.caysi101.workers.dev
```

The URL is public routing information, not a credential, so it is kept in the
workflow rather than stored as a secret. Role usernames, passwords, and TOTP
secrets remain GitHub Actions secrets.

Do not point these workflows at:

- `https://transitionforwardct.com`
- `https://www.transitionforwardct.com`
- a custom hostname that returns Cloudflare's `Just a moment...` challenge

The custom `e2e.transitionforwardct.com` hostname may still be useful for
human staging review, but automated browser verification should prefer the
direct Worker endpoint.

## Cloudflare note

Do not rely on a WAF Skip rule to bypass ordinary Cloudflare Bot Fight Mode.
Bot Fight Mode is not a skippable WAF phase. Keep the public zone protected
and route CI to the isolated `workers.dev` staging endpoint instead.

If the account later uses Super Bot Fight Mode or a different Cloudflare
security configuration, review the current Cloudflare documentation before
changing the CI route. Do not create a production bypass header or public WAF
exception merely to make Playwright pass.

## Preflight guards in the repo

- `tests/e2e/scripts/check-role-creds.mjs` reports which of the seven seeded
  role accounts are configured without printing credential values.
- `tests/e2e/scripts/check-base-url.mjs` verifies HTTPS, DNS, root and `/login`
  reachability, and fails if it sees a Cloudflare challenge.
- `tests/e2e/auth-roles.setup.ts` verifies that the deployed app exposes the
  current dashboard test-id contract and, when a build SHA is available, that
  the deployed build matches the commit under test.

That final deployment-parity check is intentional: if a PR changes the app
but the staging Worker still serves an older commit, browser CI should fail
with a clear request to deploy the exact PR commit to staging. It must not
silently test old code and report success.

## Test accounts

Use only the seeded E2E accounts provisioned in the staging database. Never
commit credentials to the repository. These remain GitHub Actions secrets:

- `E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD`
- `E2E_PARENT_EMAIL` / `E2E_PARENT_PASSWORD`
- `E2E_EDUCATOR_EMAIL` / `E2E_EDUCATOR_PASSWORD`
- `E2E_SCHOOL_ADMIN_EMAIL` / `E2E_SCHOOL_ADMIN_PASSWORD`
- `E2E_DISTRICT_ADMIN_EMAIL` / `E2E_DISTRICT_ADMIN_PASSWORD`
- `E2E_PARTNER_EMAIL` / `E2E_PARTNER_PASSWORD`
- `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD` / `E2E_OWNER_TOTP_SECRET`

Other role TOTP secrets may also be configured when those accounts require
2FA.

## Login selectors (stable contract)

The login route exposes:

- `data-testid="login-form"`
- `data-testid="login-email"`
- `data-testid="login-password"`
- `data-testid="login-submit"`

Keep these stable; the auth setup relies on them.

## Expected workflow sequence

1. Static/unit/security checks run against the PR code.
2. Browser CI preflights the direct staging Worker endpoint.
3. Auth setup checks deployment parity before signing in all configured roles.
4. If staging is behind the PR, stop and deploy the exact PR commit to staging.
5. Re-run Dashboard regression and Role-guard QA against that exact staging
   deployment.
6. Keep production promotion blocked until staging evidence is reviewed.
