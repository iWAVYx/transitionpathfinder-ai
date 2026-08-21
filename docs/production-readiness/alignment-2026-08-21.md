# Lovable origin and Cloudflare edge alignment — 2026-08-21

Decision: **Lovable Cloud remains the production application origin, managed
Supabase backend, and privileged server runtime. Cloudflare is limited to the
custom domain and edge protections. Production remains NO-GO.**

This alignment is based on merged `main` SHA
`a8eba6b3eba0e8aa77f7c81ef4b8ad992dd34aec` and a diagnostic performed in the
connected Lovable project. It does not publish Lovable, change DNS, attach a
Cloudflare route, deploy or delete a Worker, change a secret, run a payment,
restore a backup, or mutate the production database.

## Why the Worker application path was retired

The production application uses Lovable Cloud's managed Supabase project
`lrqcntqyekucamifpffs`. Privileged payment, email, cron, and administrative
routes require the platform-injected `SUPABASE_SERVICE_ROLE_KEY`.

Lovable Cloud intentionally does not display, export, forward, or copy that
managed credential into GitHub, Cloudflare, or another secret store. The
previous `transitionforward-production` Worker design therefore could not be
provisioned without inventing a credential or migrating the backend. Both are
forbidden. The production Worker deploy workflow, its secret-provisioning
workflow, and `wrangler.production.toml` have been removed.

The existing `transitionforward-production` placeholder remains outside the
release path. Its last verified state was unrouted, with `workers.dev` and
preview URLs disabled, no custom domain, and no application secrets. Deleting
it is optional cleanup that requires separate explicit authorization.

## Approved traffic ownership

| Layer                                                  | Approved owner                 | Boundary                                                                          |
| ------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------- |
| Application and SSR                                    | Lovable Cloud                  | Serves the published project snapshot.                                            |
| Privileged API routes                                  | Lovable Cloud                  | Keeps managed Supabase, Stripe, email, and cron credentials inside Lovable.       |
| Database, Auth, Storage, Edge services                 | Lovable Cloud managed Supabase | Remains project ref `lrqcntqyekucamifpffs`.                                       |
| DNS, TLS edge, WAF, rate limiting, and DDoS protection | Cloudflare                     | Proxies the Lovable custom-domain origin; does not run application code.          |
| Isolated staging application                           | Cloudflare Worker              | Remains staging-only and targets `qgrertkqbwanerqqemph` with Stripe sandbox mode. |

Lovable documents the supported reverse-proxy setup under **Domain uses
Cloudflare or a similar proxy**. Lovable must provide the exact CNAME target;
the repository and operators must not guess it:
<https://docs.lovable.dev/features/custom-domain#advanced-use-a-cdn-or-reverse-proxy>.
Cloudflare documents that a proxied DNS record is what applies WAF, caching,
and other edge controls:
<https://developers.cloudflare.com/dns/proxy-status/>.

## Fail-closed release procedure

1. Merge the exact reviewed candidate to protected `main` and complete every
   non-hosting blocker in `release-checklist.md`.
2. Make the connected Lovable build succeed for that exact 40-character SHA.
   `Preview is out of date` or `Build unsuccessful` is a release stop.
3. Re-run the SELECT-only production migration baseline and require aligned,
   zero-pending results. Do not apply a production migration as part of publish.
4. Verify the Lovable project still targets `lrqcntqyekucamifpffs`, live Stripe,
   the production secret store, and the approved project/domain identities.
5. In Lovable domain settings, enable the supported Cloudflare/reverse-proxy
   option and record the exact CNAME and verification records Lovable supplies.
6. Under a separately approved DNS window, configure Cloudflare to proxy the
   Lovable origin. Do not attach a Worker route. Keep verification records
   DNS-only when required by the provider.
7. Apply reviewed Cloudflare protections without caching authenticated or
   dynamic responses. Payment, email, OAuth, and cron endpoints must remain
   reachable by their intended signed callers and must continue enforcing
   application-level authentication.
8. Record the currently published Lovable snapshot and current DNS values as
   rollback evidence, then obtain separate explicit authorization to publish.
9. After publish, require `/api/public/env-health` to prove production labels,
   project ref, live Stripe mode, canonical hostname, exact SHA, and passing
   isolation. Complete the release checklist and observation window.

## Rollback

Application rollback restores the recorded last known-good Lovable published
snapshot. Edge rollback restores the recorded prior Cloudflare DNS/proxy and
rules configuration. Database recovery remains a separate decision under
`migration-and-rollback-plan.md`; no DNS or application rollback authorizes a
database restore.

## Remaining immediate blocker

The connected Lovable build must succeed and become current for the selected
`main` SHA before any publish or DNS cutover. This alignment removes an
unfillable credential path; it does not declare the product ready to release.
