# Lovable hosted-build trigger — 2026-09-16

Decision: **PRODUCTION REMAINS NO-GO.** This documentation-only change exists
solely to create one new protected `main` repository event for the connected
Lovable project to ingest and build. It does not authorize a Lovable publish,
production deployment, DNS or secret change, database action, live payment,
or any change to staging, Stripe, Cloudflare, or production.

## Exact accepted baseline

The trigger starts from protected `main` SHA
`92764a40a890d86516a2a5f56013be2fad89a8c4` (PR #127). That exact commit was
deployed to isolated staging and passed the standard protected staging suite,
including build/SSR, accessibility, dashboard and seven-role browser checks,
role guards, permission checks, CT Seed v2 Audit, and cross-district and general
RLS checks. The public staging identity endpoint reported the same SHA, staging
Supabase project `qgrertkqbwanerqqemph`, sandbox Stripe mode, and
`isolation.ok=true`.

## Scope

This trigger changes documentation only. It does not change application code,
dependencies, build commands, GitHub workflows, Supabase migrations or data,
RLS, authentication, MFA, role guards, Cloudflare configuration, Stripe
behavior, or any environment or secret value.

Lovable's current UI exposes no preview rebuild or retry control for the failed
PR #127 history entry. The only visible publish action would affect production
and is intentionally excluded. This protected repository event is therefore
the least invasive available trigger for one new hosted preview-build attempt.

## Post-merge acceptance

Merge requires separate explicit authorization. If merged:

1. Record the resulting full `main` merge SHA.
2. Allow only the single Lovable hosted preview build caused by that repository
   event; do not publish or retry.
3. Require Lovable to report a successful, current preview for the exact merge
   SHA. A failed, outdated, different-SHA, or unverifiable preview remains a
   release stop.
4. If the build fails, preserve its available status and diagnostic evidence
   without retrying, editing in Lovable, weakening exact-SHA checks, or changing
   production.

This trigger cannot change the production-readiness decision by itself.
