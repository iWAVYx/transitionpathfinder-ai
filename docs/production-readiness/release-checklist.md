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
      the post-window 2026-08-26 evidence accounts for all 184 rows and reports
      zero unresolved or pending migrations against
      `9a4bbb979118abb05d34da79dd44c8db8a76d2e3`.
- [x] Baseline regenerated immediately before the maintenance window, its exact
      three-file delta was applied in reviewed order, and the final baseline is
      aligned with zero pending migrations.
- [x] Staging-only E2E fixture remains explicitly production-forbidden and is
      absent from the production migration plan.
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
      blockers for real student/IEP data are closed.
- [ ] Lovable security findings are rescanned and closed; ignored findings and
      known dependency vulnerabilities are reviewed and dispositioned.

## Exact-SHA acceptance

Current staging evidence: SHA `611789b11f00b86a3acaa5d092eddd3e84190d36`
passed isolated staging deployment run `33450384287`, all protected push
workflows, and protected release-readiness run `33688939519`.
These runs do not close the
production boxes below:
Lovable's internal build identifier is not a GitHub commit, and the connected
build still needs an auditable mapping to the exact GitHub SHA.

- [x] Build and SSR verification passed for the approved SHA.
- [ ] Lovable's connected build succeeded for that exact SHA; neither
      `Build unsuccessful` nor `Preview is out of date` is present.
- [x] Migration replay and RLS/permission/cross-district suites passed. The
      canonical migration tree is unchanged since replay run `32630746041`;
      the live staging RLS suites passed for the candidate SHA.
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
