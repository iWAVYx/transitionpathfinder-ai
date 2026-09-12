# Production release checklist

Every box requires attached evidence. A blank or unknown item is a NO-GO.

## Approval and identity

- [ ] Release PR merged through protected `main`; exact 40-character SHA recorded.
- [ ] Separate owner approval recorded for the exact Lovable publish and DNS window.
- [ ] Production Supabase ref is exactly `lrqcntqyekucamifpffs`; staging ref is absent.
- [ ] The Lovable project, connected GitHub repository/branch, publish owner,
      current published snapshot, and last known-good snapshot are reviewed.
- [ ] The Cloudflare account and `transitionforwardct.com` zone owner access,
      DNS/proxy source, WAF/rate-limit/cache rules, and rollback export are reviewed.
- [ ] No Cloudflare Worker route or custom domain serves the production application;
      the `transitionforward-production` placeholder remains outside the release path.
- [ ] `/api/public/env-health` proves production labels, project, live Stripe,
      allowed hostname, exact SHA, and passing isolation.

## Database

- [x] Production migration history read and content-aware baseline attached;
      the completed 2026-08-26 window accounts for all 184 production rows and
      the then-approved three-file delta.
- [ ] The security-alignment migration
      `20260907190000_security_finding_alignment.sql` is applied and verified in
      isolated staging but remains unapplied to production. Regenerate the
      production baseline and review the exact production delta, including the
      draft `20260907224500_least_privilege_security_definer_grants.sql`, before
      requesting a separate production maintenance-window authorization.
- [x] Staging-only E2E fixture remains explicitly production-forbidden and is
      absent from the production migration plan.
- [x] Isolated staging records
      `20260909010000_create_private_channel_attachments_bucket` after a
      ledger-only correction with zero recorded statements. The migration SQL
      was not rerun and `channel-attachments` remained private. Evidence:
      `staging-migration-ledger-repair-2026-09-11.md`.
- [x] Lovable Cloud backup recovery point was recorded and the isolated export
      restore drill passed; both are linked from the migration-window evidence.
- [ ] Maintenance and abort owners are present.
- [x] The approved migration applied one file at a time with stop-on-error and
      recorded post-file invariants; publish did not apply migrations.
- [ ] Production Vault cron values are provisioned and privileged jobs are
      rescheduled only after the hook-isolation migration verifies them.

## Configuration and third parties

- [ ] Privileged production secrets remain only in Lovable Cloud's managed
      production runtime; the Supabase service-role key is absent from GitHub,
      Cloudflare, repository variables, logs, and PR code.
- [ ] Staging database, Supabase service-role, and Stripe secrets are absent from
      the Lovable production project's secret store.
- [ ] Lovable preview activity cannot mutate real production records, or an
      approved isolation control and operating procedure is documented and tested.
- [ ] Stripe live account/catalog/prices/webhook/signature/portal/tax settings
      verified; sandbox objects are absent and the live readiness check passes.
- [ ] Production email provider and SPF/DKIM/DMARC verified, or email remains disabled.
- [ ] Sentry/observability environment, redaction, alert routes, and retention verified.
- [ ] Malware scanning, incident response, backup restoration, and legal/privacy
      blockers for real student/IEP data are closed. The fail-closed document
      scanner exists and the Channel attachment gate is implemented in draft, but
      clean-file/EICAR evidence, isolated-staging verification, production
      configuration, and OPSWAT subprocessor approval are still required. See
      `channel-attachment-malware-gate-2026-09-08.md`.
- [ ] Lovable security findings are rescanned and closed; ignored findings and
      known dependency vulnerabilities are reviewed and dispositioned. Basic
      and deep scans are current with 0 known dependency issues, but all 9
      findings remain ignored rather than closed. Staging verified findings
      1–6 and did not reproduce the public-schema extension finding; findings
      7–8 now have a draft least-privilege migration and exact allowlist, but
      still require review, replay, isolated-staging application, protected
      regression tests, and a rescan. Production also needs a read-only
      extension inventory. Details are in
      `security-finding-alignment-2026-09-07.md`.

## Exact-SHA acceptance

Current isolated-staging deployment evidence: protected `main` SHA
`c0cee6269363fa3368654191ad3b5efd7b58c5c1` passed deployment run
`34663612644`, Build & SSR Verification, accessibility, CT Seed v2, dashboard,
all seven role storage states, role-guard, permission, RLS, and cross-district
RLS checks. The protected database and browser checks were rerun successfully
after the staging-only `20260909010000` ledger correction; the exact evidence is
recorded in `staging-migration-ledger-repair-2026-09-11.md`.

Lovable's hosted preview evidence remains attached to application-bearing SHA
`a0396a3af276e978d10920f29dc429f2820e47b9`, because PR #116 changed only
production-readiness documentation. Lovable connected to `main`, reported the
repository in sync, and rendered the homepage for short SHA `a0396a3a` after
exactly one build attempt with no retry or publish. That evidence is recorded
in `lovable-preview-acceptance-2026-09-11.md`. These records do not close the
remaining production boxes below.

- [x] Build and SSR verification passed for the approved SHA.
- [x] Lovable's connected build succeeded for the last application-bearing SHA.
      The current hosted preview rendered the TransitionForward homepage for
      `a0396a3a`; historical failure cards for older commits remain history
      only. The later `c0cee626` merge is documentation-only.
- [ ] If the approved Lovable application origin is replaced, the reviewed
      `hosting-portability-policy.json` inventory is current; every protected
      request prefix and privileged capability has a named trusted runtime;
      exact-SHA acceptance, secret isolation, smoke coverage, and coordinated
      rollback pass before any production deployment or DNS cutover.
- [x] Migration replay and RLS/permission/cross-district suites passed. The
      canonical migration tree, including the security-alignment migration,
      passed replay run `34176545827`; the live staging RLS suites passed for
      the candidate SHA.
- [x] Seven-role auth, role guards, dashboard regression, accessibility, and
      release-readiness journeys passed on the exact candidate.
- [ ] Public routes, login/MFA, owner strict MFA, document access, report flow,
      invitation linking, licensing, and billing smoke checks passed.
- [ ] Low-risk live Stripe transaction, webhook receipt, entitlement result,
      cancellation/refund, and ledger reconciliation passed under approval.

## Cloudflare edge setup

- [ ] Lovable domain settings use the supported **Domain uses Cloudflare or a
      similar proxy** option and the exact Lovable-supplied CNAME is recorded.
- [ ] Required ownership-verification records remain DNS-only when required.
- [ ] Application hostnames are proxied to Lovable; no Worker route, Pages
      project, origin rewrite, or guessed target is in the request path.
- [ ] Authenticated HTML/API responses and `/api/*`, `/lovable/*`, OAuth,
      payment/email webhook, and cron traffic are not cached.
- [ ] WAF/challenge/rate-limit rules preserve signed webhook, OAuth, email, and
      cron reachability without bypassing their application-level authentication.
- [ ] TLS mode, HSTS plan, canonical redirects, `www` behavior, and emergency
      DNS-only rollback are tested and recorded.

## Release and observation

- [ ] Operator repeats target/SHA/project confirmation immediately before publish.
- [ ] The exact reviewed Lovable snapshot is selected; publishing remains manual
      and requires separate explicit authorization.
- [ ] DNS/proxy changes occur only in their separately approved window and match
      the recorded Lovable target; staging configuration and secrets are not reused.
- [ ] Post-publish health, headers, logs, error rate, cron, auth, database, email,
      and Stripe checks pass for the observation window.
- [ ] Rollback owner confirms the last known-good Lovable snapshot, prior
      Cloudflare configuration, and database recovery triggers.
- [ ] Evidence links and final GO decision are recorded; otherwise rollback/NO-GO.
