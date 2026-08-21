# Production release checklist

Every box requires attached evidence. A blank or unknown item is a NO-GO.

## Approval and identity

- [ ] Release PR merged through protected `main`; exact 40-character SHA recorded.
- [ ] GitHub `production` environment approval granted by required reviewers.
- [ ] Production Supabase ref is exactly `lrqcntqyekucamifpffs`; staging ref is absent.
- [ ] The approved production hosting control plane, owner access, custom domains,
      deployment source, and last known-good application version are reviewed.
- [ ] If production moves to Cloudflare, its account, Worker, routes, token scope,
      WAF/access controls, and rollback version are reviewed before cutover.
- [ ] `/api/public/env-health` proves production labels, project, live Stripe,
      allowed hostname, exact SHA, and passing isolation.

## Database

- [x] Production migration history read and content-aware baseline attached;
      the 2026-08-17 evidence reports zero pending migrations.
- [ ] Baseline regenerated immediately before release and still aligned with
      zero pending migrations; if not, every pending migration is reviewed in
      canonical order and lock/uniqueness/RLS/grant risks are signed off.
- [ ] Staging-only E2E fixture remains explicitly production-forbidden and is
      absent from the production migration plan.
- [ ] Lovable Cloud backup/export recovery point recorded and an isolated restore
      drill passed; inventorying daily backups alone is not a restore test.
- [ ] Maintenance and abort owners are present.
- [ ] Migration applies one file at a time with stop-on-error; post-file
      invariants recorded.
- [ ] Production Vault cron values provisioned and privileged jobs rescheduled
      only after the hook-isolation migration verifies them.

## Configuration and third parties

- [ ] Production secrets exist only in the protected production control plane;
      none are repository-scoped, copied from staging, or exposed to PR code.
- [ ] Staging database, Supabase service-role, and Stripe secrets are absent from
      the Lovable production project's secret store.
- [ ] Lovable preview activity cannot mutate real production records, or an
      approved isolation control and operating procedure is documented and tested.
- [ ] Stripe live account/catalog/prices/webhook/signature/portal/tax settings
      verified; sandbox objects are absent and the live readiness check passes.
- [ ] Production email provider and SPF/DKIM/DMARC verified, or email remains disabled.
- [ ] Sentry/observability environment, redaction, alert routes, and retention verified.
- [ ] Malware scanning, incident response, backup restoration, and legal/privacy
      blockers for real student/IEP data are closed.
- [ ] Lovable security findings are rescanned and closed; ignored findings and
      known dependency vulnerabilities are reviewed and dispositioned.

## Exact-SHA acceptance

- [ ] Build and SSR verification passed for the approved SHA.
- [ ] Migration replay and RLS/permission/cross-district suites passed.
- [ ] Seven-role auth, role guards, dashboard regression, accessibility, and
      release-readiness journeys passed on the exact candidate.
- [ ] Public routes, login/MFA, owner strict MFA, document access, report flow,
      invitation linking, licensing, and billing smoke checks passed.
- [ ] Low-risk live Stripe transaction, webhook receipt, entitlement result,
      cancellation/refund, and ledger reconciliation passed under approval.

## Release and observation

- [ ] Operator repeats target/SHA confirmation immediately before deploy.
- [ ] Production deploy/publish is manual and approval-gated; staging
      workflow/config/secrets are not reused.
- [ ] The chosen hosting path is recorded. For Lovable, its connected `main`
      build is current and the exact SHA is selected for publish. For
      Cloudflare, the production Worker/account/routes/token scope and rollback
      version are verified and the exact approved SHA is selected for deploy.
- [ ] Post-deploy health, logs, error rate, cron, auth, database, and Stripe
      checks pass for the observation window.
- [ ] Rollback owner confirms application and database recovery triggers.
- [ ] Evidence links and final GO decision recorded; otherwise rollback/NO-GO.
