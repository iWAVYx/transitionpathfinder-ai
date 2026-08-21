# Superseded production hosting alignment — 2026-08-20

> **Superseded on 2026-08-21.** This document is historical and must not be
> used as release authority. `alignment-2026-08-21.md` is the current decision.

On 2026-08-20, Cloudflare Workers was selected as a possible production
application host after the exact candidate passed GitHub and isolated-staging
builds while Lovable's hosted preview build remained unsuccessful. A guarded
Worker deployment design was prepared, but it was never authorized or run.

The next day's Lovable diagnostic established that the managed production
Supabase service-role credential cannot be exported or securely forwarded to
an external Worker. Because the application's privileged routes require that
credential, the proposed Worker application path was unprovisionable without a
backend migration.

The user selected the lower-risk supported architecture instead: Lovable Cloud
continues to host the application and privileged backend, while Cloudflare is
limited to the domain and edge protections. The production Worker deployment
configuration and secret-provisioning workflows were removed. Production
remains NO-GO, and no production deployment, publish, DNS change, secret
change, payment, restore, or database migration was authorized by either
alignment.
