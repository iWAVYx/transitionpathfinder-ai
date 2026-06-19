# E2E / Staging environment for Playwright live verification

## Why this exists

Production (`https://transitionforwardct.com`) is protected by Cloudflare's
"Just a moment..." browser challenge. Headless Playwright in GitHub Actions
cannot solve the challenge, so every role auth-setup test fails before it
can even reach the `/login` form. The fix is **not** to bypass Cloudflare
on production — it is to run E2E against a dedicated subdomain that serves
the same app but is exempt from the challenge.

## Recommended setup

Pick one of:

- `https://e2e.transitionforwardct.com`
- `https://staging.transitionforwardct.com`

### DNS + Cloudflare

1. Add a DNS record for the chosen subdomain that points at the same
   Lovable-published origin as production (CNAME to the published
   `*.lovable.app` URL, or an A record per Lovable's custom-domain
   instructions).
2. In Cloudflare, for the **subdomain only**:
   - Disable "Under Attack Mode" / Bot Fight Mode for the hostname.
   - Add a WAF custom rule: `http.host eq "e2e.transitionforwardct.com"` →
     **Skip → All remaining custom rules, Managed Rules, Bot Fight Mode,
     Super Bot Fight Mode**.
   - Keep TLS on. Do not disable Cloudflare entirely — just the challenge.
3. Leave production (`transitionforwardct.com`, `www.transitionforwardct.com`)
   fully protected. The subdomain rule must not match the apex host.

### Connect the subdomain to Lovable

Follow **Project Settings → Domains → Connect Domain** for the new
subdomain. Once it shows **Active**, browse to
`https://e2e.transitionforwardct.com/login` from an incognito window and
confirm the sign-in form renders without an interstitial.

### GitHub Actions secret

Update `E2E_BASE_URL` (the secret consumed by `PLAYWRIGHT_BASE_URL` in
`.github/workflows/dashboard-regression.yml` and `role-guard-qa.yml`) to
the new URL:

```
E2E_BASE_URL = https://e2e.transitionforwardct.com
```

No other secret changes. Seeded role accounts
(`E2E_<ROLE>_EMAIL` / `_PASSWORD` / `_TOTP_SECRET`) stay as-is.

## Preflight guards already in the repo

- `tests/e2e/scripts/check-role-creds.mjs` fails the workflow when
  `E2E_BASE_URL` points at the production apex (no `e2e.` / `staging.`
  prefix) in live mode (exit code 4).
- `tests/e2e/auth-roles.setup.ts` detects the Cloudflare challenge body
  (`/just a moment/i`, `cf-chl-`, HTTP 403) before attempting to fill the
  login form and throws a remediation error with the exact subdomain
  guidance — so the report no longer just says "selector not found".

## Test accounts

Use only the seeded E2E accounts already provisioned in the database.
Never commit credentials to the repo; all values come from GitHub Actions
secrets.

## Login selectors (stable contract)

The login route exposes:

- `data-testid="login-form"`
- `data-testid="login-email"`
- `data-testid="login-password"`
- `data-testid="login-submit"`

Keep these stable; the auth setup relies on them.

## Fallback (only if a subdomain is impossible)

If ops cannot create a staging subdomain, the alternative is a Cloudflare
WAF rule that lets a specific request header bypass the challenge — for
example, require `X-E2E-Bypass: <secret>` and store the secret as
`E2E_CF_BYPASS_HEADER` / `E2E_CF_BYPASS_TOKEN` in GitHub Actions. Playwright
would then attach the header via `extraHTTPHeaders` in `playwright.config.ts`.
Treat this only as a last resort: any leak of the header value re-opens the
production challenge bypass to the public internet.
