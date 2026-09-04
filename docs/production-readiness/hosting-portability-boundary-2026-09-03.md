# Hosting portability boundary — 2026-09-03

Decision: **Production remains NO-GO. Lovable remains available for authoring
and Git synchronization, but its hosted preview and production publish path are
not accepted. This audit does not deploy, publish, migrate, route, or copy a
secret.**

Audited protected `main` SHA:
`7be709777edff97de83e297a487540943607a062`.

## What is working

The Lovable project still exposes its file view, instruction editor, and Build
mode. It also ingested the file-identical GitHub trigger commit
`92f378296c1c783d9045840b04ca0d13a3a3feb1` from the dedicated
`lovable/preview-7be70977` branch. Lovable can therefore remain a development
and code-generation surface when every change is isolated on a branch and
reviewed through GitHub.

The same hosted attempt ended as **Build unsuccessful** with **Preview is out
of date**. A Lovable edit is not evidence that a current preview exists, and it
does not authorize publication. Until the hosted builder recovers, visual and
functional acceptance must use the isolated Cloudflare staging Worker after
the relevant GitHub checks pass.

## Source boundary

The application is not a static marketing site. The machine-readable inventory
in `hosting-portability-policy.json` pins the exact current file sets so future
changes force a new review.

| Surface                             | Files | Portability consequence                                                               |
| ----------------------------------- | ----: | ------------------------------------------------------------------------------------- |
| Public top-level routes             |    68 | Candidate for an external public or pilot frontend after route-level review.          |
| Authenticated routes                |   138 | Depend on authentication state and many server functions; not independently portable. |
| Server-function files               |   116 | Require a trusted application runtime and protected request routing.                  |
| Privileged-runtime files            |    59 | Reference administrator database access or Lovable-held gateway credentials.          |
| Explicit API/Lovable endpoint files |    11 | Include health, scheduled jobs, payments, observability, and email handlers.          |

The server surface includes pathway generation and reporting, documents and
IEP processing, owner/school/district administration, partner operations,
notifications, Stripe, email, AI, malware scanning, SMS, scheduled jobs, and
webhooks. Moving only browser assets does not move these capabilities.

## Current and fallback architectures

The approved production architecture remains:

- Lovable Cloud: application origin, managed Supabase, and privileged runtime.
- Cloudflare: custom-domain edge, TLS, WAF, rate limiting, and DDoS controls.
- Cloudflare Worker: isolated staging only.

The staging Worker proves that Cloudflare can run the complete application when
it has environment-specific credentials. It does not prove a production
cutover: the production Supabase service-role credential is held inside Lovable
Cloud and is not approved or available for export.

The current branch also passed a complete local production-style build with a
4,096 MiB Node old-space limit. The build emitted the server entry, service
worker, and exactly one Workbox runtime. A separate 1,216 MiB constrained run
completed the client bundle and then failed during SSR with JavaScript heap
exhaustion. That is direct local evidence that the application is portable
with sufficient build headroom; it is not proof of Lovable's undisclosed hosted
termination cause.

The safest fallback sequence is:

1. Continue focused Lovable changes on dedicated branches.
2. Use GitHub PR checks and isolated staging as the acceptance path.
3. Treat only reviewed public/demo pages as candidates for a separately hosted
   frontend or parent pilot.
4. Inventory and reduce service-role use where authenticated RLS or a narrow
   database function can provide equivalent least privilege.
5. Assign every irreducibly privileged operation to a named trusted runtime.
6. Consider a database/auth/storage migration only if no safe managed-runtime
   boundary is available.

## Split-origin risks that must close

An external frontend with a separate protected backend introduces risks that a
single-origin Lovable deployment does not have:

- bearer-token forwarding and CORS origin validation;
- cookie scope, CSRF protection, and redirect/canonical-host behavior;
- Cloudflare caching of authenticated HTML, RPCs, APIs, webhooks, or documents;
- frontend/backend version skew;
- webhook, email, AI, scanning, SMS, and scheduled-job secret ownership;
- exact-SHA identity and coordinated rollback across two origins.

The protected request prefixes `/_serverFn/`, `/_server/`, `/api/`,
`/lovable/`, and `/email/` must never fall through to a static frontend or a
cache rule.

## Safe Lovable update procedure

1. Select or create a dedicated feature branch; never author directly on
   protected `main`.
2. Give Lovable one focused implementation request at a time.
3. Review the resulting GitHub diff, secrets boundary, migrations, and tests.
4. Open a pull request and require credential-free checks.
5. After explicit authorization, deploy the reviewed SHA to isolated staging
   and run protected staging acceptance.
6. Merge only with separate owner authorization.
7. Do not treat Lovable editing, a stale preview, or an internal Lovable version
   identifier as production acceptance.

## Production cutover gate

Changing the production host requires a new reviewed architecture decision,
not a waiver of the existing Lovable build failure. The replacement gate must
name every privileged runtime, prove that no secret reaches browser assets,
build and deploy the exact reviewed SHA, pass the full public/authenticated/
district/owner/document/pathway/billing/email/job smoke matrix, and record
rollback evidence. Production deployment and DNS cutover each require separate
explicit owner authorization.
