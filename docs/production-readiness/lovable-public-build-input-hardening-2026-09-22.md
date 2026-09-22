# Lovable public build-input hardening — 2026-09-22

## Decision

**DRAFT FOR REVIEW; PRODUCTION REMAINS NO-GO.** This change does not authorize a
merge, Lovable build or publish, deployment, secret change, database action,
payment, antivirus run, or change to staging, Stripe, Cloudflare, or production.

## Evidence from the authorized publish

Lovable published connected `main` at exact Git SHA
`c3f1bd0bc374be0d6cd7ecf0c76b19b93b7cfc13`. The canonical homepage and the
public login, pricing, resources, privacy, trust-and-safety, and service-worker
paths returned HTTP 200. The `www` hostname redirected to the canonical domain.

The public deployment-identity endpoint correctly remained fail closed with
HTTP 503. It confirmed the exact Git SHA, the production hostname, the
production Supabase project, and `APP_ENV=production`, but reported:

- `VITE_APP_ENV=unknown`; and
- Stripe mode `unknown`.

No live payment or mutating production smoke test was performed.

## Narrow alignment

Lovable Test and Live use one hosted application build, while the hosted
preview command can request Vite's development mode. The build now takes the
reviewed application label from `.env.production` only when Lovable's hosted
builder is detected. Ordinary local development keeps its existing behavior.

Before a Lovable hosted build begins, a fail-closed assertion requires:

- the reviewed `production` application label;
- a sandbox Stripe publishable token for preview and staging hosts; and
- a live Stripe publishable token for production hosts.

The split client/server child builds receive those already-reviewed public
values explicitly. This prevents Vite's active preview-mode environment from
masking the live public token during a later child build.

These are public browser build inputs. No private Stripe key is read, copied,
logged, or embedded. The production identity check still requires the separate
Lovable-owned live server credential before it can report live mode.

The public health response now reports only the classified public and server
Stripe modes (`sandbox`, `live`, or `unknown`). It never returns either token or
credential. This separates a missing public build input from a missing private
hosting binding without weakening the two-sided payment proof.

## Acceptance sequence

1. Review this draft and require green credential-free checks.
2. Merge only with separate authorization.
3. Deploy the exact merge SHA to isolated staging and pass its standard
   protected checks.
4. Allow one Lovable preview build for that exact SHA and inspect only the
   non-sensitive identity fields.
5. Publish only with separate authorization after preview evidence is accepted.
6. After publishing, require HTTP 200, both production environment labels,
   live public and server Stripe modes, the production Supabase ref, the
   canonical hostname, the exact Git SHA, and `isolation.ok=true`.

Any missing, mismatched, staging, sandbox, or unknown production value remains
a hard failure.
