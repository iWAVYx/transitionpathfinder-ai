> Staging only. Nothing in this document touches production, and no step here
> can promote code or data to the production project.

# Isolated staging deployment (Cloudflare Worker)

Staging runs as its own Cloudflare Worker, entirely separate from the Lovable
production deployment.

| | Production | Staging |
| --- | --- | --- |
| Hostname | transitionforwardct.com | e2e.transitionforwardct.com (or `*.workers.dev`) |
| Supabase project | `lrqcntqyekucamifpffs` | `qgrertkqbwanerqqemph` |
| Stripe | live (Lovable connector gateway) | sandbox (direct `sk_test_` key) |
| APP_ENV | `production` | `staging` |

## 1. Deployment identity is enforced by code

`src/lib/env-identity.ts` holds the strict guard; `/api/public/env-health`
runs it. Any deployment that claims staging (`APP_ENV`, `VITE_APP_ENV`, a
staging hostname, or the staging Supabase ref) must satisfy **all** of:

- `APP_ENV=staging` and `VITE_APP_ENV=staging`
- Supabase project ref is exactly `qgrertkqbwanerqqemph`
- Stripe mode is sandbox
- Hostname is an allowed staging hostname and not a production hostname
- `STRIPE_LIVE_API_KEY` and `PAYMENTS_LIVE_WEBHOOK_SECRET` are absent

Otherwise the endpoint returns **503** with the list of failures, which the
deploy workflow treats as a failed deployment.

## 2. Stripe environment is server-owned

The browser can no longer choose the billing environment.

- `stripeEnvForAppEnv()` maps `production -> live`, `staging -> sandbox`, and
  throws for anything else.
- Every billing server function validator now calls
  `assertRequestedStripeEnv()`, so a client-supplied `environment` is either
  identical to the server's or the request is rejected.
- The payments webhook resolves the environment from `APP_ENV` and rejects a
  mismatched `?env=` with 400 before signature verification.
- `createStripeClient()` accepts either a Lovable gateway connection id
  (`mk_…`, proxied as before) or a direct Stripe key. A live key in the
  sandbox environment, a test key in live, or an unrecognized format throws.
  Credential values are never logged.

## 3. Deploy

```bash
bun install
bun run build                       # emits dist/server + dist/client
bunx wrangler deploy --config wrangler.staging.toml
```

Set secrets once per Worker (values never live in the repo):

```bash
bunx wrangler secret put SUPABASE_URL --config wrangler.staging.toml
bunx wrangler secret put SUPABASE_PUBLISHABLE_KEY --config wrangler.staging.toml
bunx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config wrangler.staging.toml
bunx wrangler secret put STRIPE_SANDBOX_API_KEY --config wrangler.staging.toml
bunx wrangler secret put PAYMENTS_SANDBOX_WEBHOOK_SECRET --config wrangler.staging.toml
```

CI equivalent: `.github/workflows/deploy-staging.yml` (manual dispatch only).
It requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository
secrets and refuses to run if a live Stripe secret is configured.

## 4. Stripe sandbox webhook

Point a **sandbox** endpoint at:

```
https://<staging-host>/api/public/payments/webhook?env=sandbox
```

Events: `customer.subscription.created|updated|deleted`,
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `invoice.paid`.

Store the signing secret as `PAYMENTS_SANDBOX_WEBHOOK_SECRET`. A `?env=live`
call to the staging Worker returns 400 and is never processed.

## 5. Verification

```bash
curl -s https://<staging-host>/api/public/env-health | jq
```

Expect HTTP 200, `"app_env": "staging"`, `"supabase_project_ref":
"qgrertkqbwanerqqemph"`, `"stripe_mode": "sandbox"`,
`"is_production_project": false`, `"isolation": { "ok": true, "errors": [] }`.

Unit coverage for the guard and the environment resolver:

```bash
bunx vitest run tests/unit/env-identity-staging.test.ts tests/unit/stripe-env-resolver.test.ts
```
