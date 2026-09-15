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

- [x] Production migration history was reread on 2026-09-13 and its
      content-aware baseline attached. Production still records 184 rows through
      `20260825050000`; the normalized result is line-for-line identical to the
      2026-08-26 post-window evidence. See
      `production-migration-baseline-2026-09-13.md`.
- [x] The SELECT-only production security inventory is recorded in
      `production-security-inventory-2026-09-14.md`. It confirms the existing
      `channel-attachments` bucket is private, captures its current constraints
      and policies, and records current routine and default-function grants
      without reading application rows or changing production.
- [x] The separate SELECT-only production extension namespace and dependency
      inventory is recorded in
      `production-pg-net-hosting-boundary-2026-09-15.md`. It confirms
      `pg_net` 0.20.3 has a `public` metadata namespace while all 28 actual
      members are outside `public`, under `net`, and owned by
      `supabase_admin`. PostgreSQL marks the extension non-relocatable. Finding
      9 remains open pending a reviewed platform-managed disposition; this
      evidence does not authorize moving, dropping, or reinstalling it.
- [ ] Five canonical migrations remain pending in production. Three are the
      antivirus-independent security alignment sequence, including the new
      forward-only application-function default-permission migration. All three
      are now reviewed, replayed, recorded once in isolated staging, and covered
      by protected post-migration evidence for exact SHA `73c3c36a`. Production
      still requires a fresh baseline, named maintenance/abort owners, final
      procedure review, and a separately approved production window. The two
      attachment migrations stay blocked on provider/privacy approval and
      clean-file/EICAR staging proof. See
      `staging-security-default-privileges-2026-09-14.md` and
      `production-security-migration-plan-2026-09-14.md`.
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
      blockers for real student/IEP data are closed. The fail-closed document and
      attachment controls are implemented and deployed to isolated staging. A
      protected run for SHA `625ea0de386cd44fbef12344a1b1f852af4ae07d`
      stopped before login or upload because the staging OPSWAT key lacks paid
      private-scanning entitlement. No clean file or EICAR file was uploaded and
      no retry occurred. Provider contractual/privacy approval, protected
      clean-file/EICAR evidence, and production configuration are still required.
      See `channel-attachment-malware-gate-2026-09-08.md`.
- [ ] Lovable security findings are rescanned and closed; ignored findings and
      known dependency vulnerabilities are reviewed and dispositioned. Basic
      and deep scans are current with 0 known dependency issues, but all 9
      findings remain ignored rather than closed. Production inventory confirms
      76 public-schema privileged routines: 17 PUBLIC-executable, 26 anonymous-
      executable, and 70 authenticated-executable before the pending alignment.
      The exact current-routine allowlists and forward-only default-permission
      hardening are represented in canonical migrations and passed review,
      replay, isolated-staging application, and protected exact-SHA regression.
      They still require a separately approved production window and a Lovable
      rescan afterward. Details are in
      `staging-security-default-privileges-2026-09-14.md`,
      `production-security-inventory-2026-09-14.md`, and
      `production-pg-net-hosting-boundary-2026-09-15.md`. Finding 9 remains
      open because the non-relocatable, `supabase_admin`-owned `pg_net`
      registration uses `public`, although the fail-closed member inventory
      confirms zero actual extension members are in `public`. Do not attempt an
      automatic move or reinstall.

## Exact-SHA acceptance

Current isolated-staging deployment evidence: protected `main` SHA
`73c3c36a340cf6ef03174d503da5751a4eb1a4a4` passed deployment run
`34868713078`. Its push-time Build and SSR, accessibility, migration replay, and
standard production-readiness checks passed. After the three-file security
sequence was confirmed in the live staging ledger, CT Seed v2, dashboard, all
seven role storage states, role-guard, permission, RLS, and cross-district RLS
were rerun and passed for that same exact SHA. See
`staging-security-default-privileges-2026-09-14.md`.

The separately authorized antivirus run `34744192572` failed closed during its
provider-entitlement preflight, before login, file upload, or scanning. That
blocked run is not clean-file/EICAR acceptance evidence and production remains
NO-GO.

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
      canonical migration tree, including all three antivirus-independent
      security-alignment migrations, passed replay; the live staging RLS and
      permission suites passed again after application for the candidate SHA.
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
