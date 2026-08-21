# Retired production Worker secret path

Status: **retired and non-runnable; production remains NO-GO.**

The `transitionforward-production` placeholder Worker was created unrouted with
`workers.dev` and preview URLs disabled. It has no custom domain, route, or
application secrets. It is not part of the approved production release path.

The former Worker secret-provisioning workflow was removed after a diagnostic
confirmed that Lovable Cloud does not expose or forward the managed production
Supabase service-role credential. An external Worker that performs privileged
database operations therefore cannot be provisioned safely while production
remains on Lovable Cloud.

## Enforced decision

- Lovable Cloud remains the application origin, backend, and privileged server
  runtime for project ref `lrqcntqyekucamifpffs`.
- Cloudflare may provide DNS, TLS, proxy, WAF, rate limiting, and other edge
  protections for `transitionforwardct.com`; it must not receive the Supabase
  service-role key or serve the privileged application routes.
- No GitHub workflow may deploy or provision `transitionforward-production`.
- No Cloudflare Worker route or custom domain may be attached as part of the
  selected release path.
- The placeholder Worker may be deleted later only under separate explicit
  authorization after its exact unrouted state is reverified.

Do not add `PRODUCTION_SUPABASE_SERVICE_ROLE_KEY`, Stripe server secrets, or
cron secrets to GitHub or Cloudflare to revive the retired design. A future
move to an owner-controlled Supabase project would require a new reviewed
architecture, migration plan, recovery proof, and explicit production
authorization.
