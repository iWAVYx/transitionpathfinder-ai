# Production readiness

Current decision: **NO-GO** (audit opened 2026-08-13).

The dated audit, migration/rollback plan, and release checklist in this
directory are the production release control set. `audit-state.json` is the
machine-readable summary enforced by `npm run test:production-readiness`.

This audit does not authorize a production deployment or database migration.
The status can move to `go` only in a reviewed PR after every blocking item is
closed with evidence. A production release still requires a separate,
explicitly approved publish and DNS window.

Documents:

- `audit-2026-08-13.md` — evidence and original blockers.
- `alignment-2026-08-14.md` — staging RLS and migration-alignment evidence.
- `alignment-2026-08-15.md` — PR #19 failure and permission-alignment controls.
- `alignment-2026-08-16.md` — GitHub protections and Lovable production evidence.
- `alignment-2026-08-20.md` — superseded historical Cloudflare Worker target.
- `alignment-2026-08-21.md` — current Lovable application/backend origin and
  Cloudflare domain/protection boundary.
- `hosting-portability-boundary-2026-09-03.md` — Lovable authoring continuity,
  external-hosting feasibility, protected runtime boundary, and fail-closed
  fallback sequence.
- `hosting-portability-policy.json` — machine-readable source inventory,
  protected request/secret boundary, and external-production cutover gates.
- `student-route-hosting-boundary-alignment-2026-09-21.md` — reviewed
  authenticated-route inventory update for the student directory/detail route
  correction, with hosting and production boundaries unchanged.
- `lovable-build-trigger-2026-08-24.md` — documentation-only connected-build
  trigger scope and exact-SHA post-merge acceptance requirements.
- `lovable-build-recovery-2026-08-28.md` — evidence and acceptance gate for
  restoring the last known successful Lovable hosted-build pipeline.
- `lovable-low-memory-build-2026-08-29.md` — local failure-boundary evidence and
  the narrowly scoped memory cap for Lovable's supported single-pass build.
- `lovable-sandbox-output-alignment-2026-08-29.md` — exact Lovable sandbox
  reproduction, current wrapper alignment, and deployed PWA output correction.
- `lovable-embedded-memory-isolation-2026-08-29.md` — exact hosted failure
  reproduction and supported-command process isolation for final packaging.
- `lovable-hosted-container-headroom-2026-08-29.md` — PR #75 diagnostic,
  exact Node reproduction, and the lower verified heap cap that preserves
  native-memory headroom inside Lovable's hosted container.
- `lovable-hosted-memory-floor-2026-08-30.md` — exact PR #78 diagnostic and
  constrained-build evidence establishing a 1,024 MiB failure boundary and a
  complete 1,280 MiB build.
- `lovable-hosted-container-boundary-2026-08-30.md` — exact PR #79 result,
  process-tree measurements, and the lowest tested passing 1,216 MiB boundary.
- `staging-acceptance-2026-08-28.md` — historical exact-SHA isolated-staging
  deployment, protected workflow, and consolidated browser-suite evidence.
- `staging-acceptance-2026-09-02.md` — historical exact-SHA isolated-staging
  deployment and consolidated release-readiness evidence for `09ccdf6d`.
- `staging-acceptance-2026-09-06.md` — historical exact-SHA isolated-staging
  deployment, Phase 1 branding and visual-baseline alignment, protected
  security workflows, and full acceptance evidence for `29b0575d`.
- `staging-acceptance-2026-09-07.md` — historical exact-SHA isolated-staging
  deployment and protected push-check evidence for `3cc06ade`; it explicitly
  preserves the boundary around the older consolidated browser-suite run.
- `staging-acceptance-2026-09-17.md` — historical exact-SHA isolated-staging
  deployment, protected security checks, corrected dashboard contrast, and full
  consolidated Release Readiness evidence for `83890ab4`.
- `staging-acceptance-2026-09-18.md` — historical exact-SHA isolated-staging
  deployment, protected push checks, independent environment-health verification,
  and full consolidated Release Readiness evidence for `308c274f`.
- `staging-acceptance-2026-09-20.md` — historical exact-SHA isolated-staging
  deployment, protected push checks, consolidated Release Readiness, and the
  one-attempt Cloudmersive channel-attachment clean/EICAR proof for `193bed60`.
- `staging-acceptance-2026-09-22.md` — historical exact-SHA isolated-staging
  deployment, protected push checks, corrected homepage contrast and visual
  baseline, and full consolidated Release Readiness evidence for `7cdb7cdc`.
- `staging-acceptance-2026-09-23.md` — historical exact-SHA isolated-staging
  deployment, protected push checks, and full consolidated Release Readiness
  evidence for `27481367`, including the connected public feature routes and 12
  reviewed public visual baselines while retaining both historical synthetic
  malware-path proofs.
- `staging-acceptance-2026-09-25.md` — current exact-SHA isolated-staging
  deployment, all nine standard protected checks, and full consolidated Release
  Readiness evidence for `484827c0` after the live dashboard and Pathway intake
  alignment work.
- `student-document-malware-proof-2026-09-22.md` — exact-SHA, one-attempt
  protected Cloudmersive proof for the synthetic `student-documents` clean and
  harmless-EICAR paths, with production approval deliberately left open.
- `staging-playwright-artifact-containment-2026-09-20.md` — containment of the
  synthetic staging Playwright artifact incident, session revocation, artifact
  deletion, and the post-fix artifact-sanitization evidence.
- `lovable-preview-acceptance-2026-09-06.md` — current `ee444f1a` isolated-
  staging acceptance, file-identical Lovable trigger mapping, successful live
  preview evidence, and the production conditions that remain NO-GO.
- `lovable-preview-acceptance-2026-09-11.md` — current protected `main` merge,
  exact-SHA isolated-staging acceptance, successful Lovable hosted preview, and
  the still-enforced production NO-GO boundary for `a0396a3a`.
- `staging-migration-ledger-repair-2026-09-11.md` — ledger-only repair for
  `20260909010000`, unchanged private Channel attachment bucket, and protected
  post-repair staging evidence at `c0cee626`.
- `preflight-2026-08-25.md` — current exact-SHA staging acceptance, three-file
  production migration delta, production health recheck, and remaining release
  gates.
- `preflight-2026-08-23.md` — refreshed exact-SHA staging acceptance, live
  production health, GitHub control, Cloudflare, and email-authentication evidence.
- `production-migration-baseline-2026-08-23.md` — historical content-aware
  production migration evidence captured when one migration was pending; the
  current three-file comparison is recorded in `preflight-2026-08-25.md`.
- `recovery-gate-2026-08-23.md` — current Lovable backup/restore evidence,
  support response, live backup and Storage inventory, and the still-blocking
  isolated restore drill.
- `isolated-restore-drill-plan-2026-08-25.md` — fail-closed Data Export restore
  procedure, target-isolation rules, cost gate, timing, and pass criteria.
- `export-evidence-2026-08-25.md` — completed Lovable export filename, size,
  checksum, target capacity, and handoff into the isolated local drill.
- `restore-drill-evidence-2026-08-26.md` — completed isolated database restore,
  measured RPO/RTO, aggregate recovery checks, access-control smoke tests, and
  the local three-migration rehearsal.
- `production-migration-window-2026-08-26.md` — authorized production database
  window, recovery point, exact three-file application, post-file invariants,
  and final zero-pending content-aware baseline.
- `staging-credential-containment-2026-08-23.md` — synthetic staging credential
  containment, rotation evidence, and the password-form native fallback fix.
- `production-migration-baseline-2026-08-17.md` — prior historical baseline.
- `production-security-inventory-2026-09-14.md` — current SELECT-only Lovable
  production bucket, policy, permission, privileged-routine, and default-
  function-ACL evidence plus the still-enforced NO-GO boundary.
- `staging-security-default-privileges-2026-09-14.md` — current exact-SHA
  isolated-staging ledger, default-function permission, environment-identity,
  and protected post-migration evidence for `73c3c36a`.
- `production-security-migration-plan-2026-09-14.md` — non-authorizing,
  fail-closed production procedure for the exact three-file
  antivirus-independent security release unit.
- `production-security-maintenance-2026-09-17.md` — authorized production
  execution evidence for the three antivirus-independent security migrations,
  exact ledger hashes, post-file invariants, final 187-row baseline, and the
  still-enforced overall production NO-GO boundary.
- `evidence/production-migration-history-2026-09-17.csv` — fresh SELECT-only
  post-window production migration baseline used by the content-aware
  comparator.
- `production-security-inventory.sql` — reusable SELECT-only metadata query for
  the production security inventory; it does not read application rows or
  credentials.
- `production-pg-net-hosting-boundary-2026-09-15.md` — production catalog
  evidence for the non-relocatable, `supabase_admin`-owned `pg_net` hosting
  boundary and the still-open finding 9 disposition.
- `production-pg-net-dependency-inventory.sql` — reusable SELECT-only member,
  ownership, and dependency inventory with a fail-closed zero-public-member
  guard.
- `cloudmersive-substitution-2026-09-18.md` — reviewed Cloudmersive adapter
  boundary, successful synthetic channel-attachment proof, and the privacy,
  legal, plan, `student-documents`, and production gates that remain open.
- `lovable-production-build-input-alignment-2026-09-15.md` — current public
  production health diagnosis and the review-only virtual-module alignment for
  missing Lovable public build inputs.
- `production-migration-policy.json` — pinned aliases, historical variants,
  supersessions, and the production-forbidden staging fixture.
- `migration-and-rollback-plan.md` — ordering, verification, and rollback.
- `release-checklist.md` — operator go/no-go procedure.
- `production-worker-secret-provisioning.md` — retired, non-runnable Worker
  secret path and controls preventing accidental revival.
- `audit-state.json` — fail-closed CI contract.
