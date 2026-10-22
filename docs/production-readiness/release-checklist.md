# Production release checklist

## Report Audience and History Correction — Local Candidate, October 22, 2026

- [x] Reproduce the demo mismatch with the actual report route, reader and browser-history router: both single-click Family/Educator cases fail before the correction. The router renders the new validated view before the browser URL commits; reading that old URL during remount selects the previous audience. Direct Student URL cases pass locally; prior inconsistent hosted refresh observations remain unresolved rather than being relabelled successful.
- [x] Assess the signed-in saved-report caller too. Three fictional Family/Educator/Student history journeys fail before the correction: Back changes the route audience while the reader retains its previous local selection. Pass the validated route-owned audience into the shared reader from both demo and saved-report routes. Fixed shared-link audience still takes precedence; ordinary uncontrolled readers retain interactive selection. No data, authorization, generation or sharing scope changes.
- [x] Local validation: 308 unit files /4,337 tests, including 62 focused demo/saved-reader/history and workflow-policy cases, pass. The 44-case offline document presentation suite also passes. Saved-report tests use fictional read stubs and an isolated guard wrapper; they are UI/history regression evidence, not hosted authentication, RLS or live-record acceptance.
- [x] TypeScript passes. All four actual local browser journeys pass at390/1440px, including three fictional Family/Educator/Student PDFs with complete final question/source grouping and no blank pages. Retain the initial cold-dev run (3/4): the first case stopped before reader mount during Vite dependency compilation; an explicit loaded-reader wait corrects readiness without changing strict lens assertions or enabling retries. Earlier missing npm/browser-cache attempts are tooling failures, not product acceptance.
- [ ] Complete automatic candidate checks; record exact candidate identity before requesting separate staging release authorization. Both stable sites remain a736e42e /27f3832c…314d3 /1,183 files. No new deployment or publication is implied by local success.
- [ ] After a separately authorized release, run the prepared read-only public report scope: four mobile/desktop Family/Educator-origin journeys covering all three lenses, exact URL/Builder return, one-click transitions, Back/Forward, direct links, refresh and optional details. It also captures three fictional headless PDFs with complete final question/source grouping and no blank pages. This scope passes locally but has not run against the hosted candidate; native OS print-dialog acceptance remains separate and open.
- [ ] Retain broader live saved-report/export, permission/privacy, provider/configuration, security/billing/operations/schema/rollback and TF-01–TF-26 gates. Earlier failures and the bounded 32 navigation passes on cfd05aea remain historical evidence. Deferred Parent Pilot/Pathway Snapshot and the Lovable “Your Dashboard Widgets” edit remain preserved.

Evidence: `/private/tmp/tf211-reader-lens-review` contains failing pre-fix router cases and corrected local results. No production/source-main merge, migrations, records/fixtures, AI/provider calls, account/access, payment or manual secrets changes.

## Source-Note Fix Released; Live Lens Mismatch Retained — October 21, 2026

- [x] User authorized exact a736e42e staging-only release/sync/existing publication and read-only demo/document checks. Human-approved Cloudflare [release39689227806](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39689227806) succeeds, including exact source identity and PWA checks. Isolated Lovable sync commit `c0f92c7e535a14ef557b5140ad497a86d1043641` contains only the two reviewed runtime files; frozen install made no changes and environment hashes stayed unchanged.
- [x] Both stable staging health endpoints now verify runtime fingerprint `27f3832cf4312d77bfff8099ac606c481c1cb7ae3a423d494d2f3a8b2dd314d3`,1,183 files, staging backend, sandbox payments and isolation true. Published Lovable health reports `git_commit_sha: dev`; accept its already-approved exact fingerprint identity, not an invented authentic hosted Git SHA. The isolated repository SHA above is not claimed as runtime metadata. Cloudflare still reports exact a736e42e; AI runtime configuration difference remains unchanged.
- [x] Read-only prepared Family report loads on both stable hosts with new grouping styles, a single screen-visible copy, matching printable question/source text and no report-root horizontal overflow at the tested desktop viewport. These DOM checks do not prove pagination, every viewport or live generation.
- [ ] Live report-lens switching is not accepted: observed URL `view=student` while Educator remains selected and Educator Edition is shown; Family→Educator also retained the previous selected lens during one observation. Save the requested/selected mismatch and post-refresh facts; do not count earlier early/second-click role observations as successful single-click acceptance. The issue was found during this release's read-only checks, not established as caused by the print-only patch.
- [ ] Reproduce the lens mismatch with the actual report reader/router, then fix and verify one-click Family/Educator/Student selection, URL/role framing, reload/history and fixed-share audience protection. Any new application release needs separate authorization. The original32 hosted navigation passes remain bounded evidence for cfd05aea; they do not cover this report-lens interaction or establish current whole-product acceptance.
- [ ] Native print was invoked only for the prepared fictional Family sample. Chrome/native inspection stalled and browser control subsequently reset; no actual hosted PDF export was captured or accepted. Preserve local44 document checks, four final edge/pagination checks and the existing30-page fictional PDF evidence as offline evidence only. Do not claim a confirmed product crash, successful native print or live saved-report acceptance from that attempt.

Evidence: `/private/tmp/tf211-source-note-candidate` (release/approval logs, both public health responses, parity/identity limit, sync hashes, DOM checks and mismatch screenshots). No production/source-main merge, migrations, report fixtures, AI/provider calls, account/access, payment or manual secrets changes. Existing permissions/privacy, report/export, provider/configuration/security/billing/operations/schema/rollback gates, full TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot remain open where previously recorded.

## Source Notes Kept With Final Questions — Local Candidate, October 21, 2026

- [x] Review all60 pages of the retained fictional Family/Educator long-report samples. No blank pages or visible clipping found in that baseline. Retain the existing30-page length and long-report density limits; this is not a claim that every generated report is compact or that hosted export acceptance is complete.
- [x] Reproduce the remaining source-note orphan with the actual shared ValueCallout at six page offsets. The deployed components fail the strengthened PDF assertion at480px: the final question prints on page2 and the Information Used note on page3. CSS-only break chains did not fix the case and were discarded.
- [x] Prepare a shared print-only final-question/source group in ValueCallout and DocumentLayoutStyles. Keep the normal screen list/source row, all wording and earlier long-list flow; select exactly one printed copy. Match both normal and compact icon gaps, question indentation and full-width separator edges. Applicable saved/demo/fixed-share document readers inherit this shared presentation; no role, data or access logic changes.
- [x] Validate306 unit files /4,322 tests and TypeScript. The44-case credential-free document browser suite passes after the compact-spacing correction; the final decorative separator adjustment additionally passes four focused checks with strict text/edge alignment, zero/single-question cases and actual PDF extraction at six offsets. Every question/source appears once, the final question/full sources share a page, and no blank stress pages are added. Preserve the intermediate alignment failure and its measured correction (3.76px→0.02px); do not weaken the one-pixel assertion.
- [x] Final fictional Family/Educator samples remain30 pages with complete closing sections, no blank pages and unchanged date-normalized word counts; visually review the corrected final-question/source grouping. This is offline renderer evidence, not a new hosted fixture run, live generation proof or linked-student/sharing/permission acceptance.
- [ ] Complete automatic candidate checks/review before proposing a separately authorized staging release. Candidate runtime fingerprint `27f3832cf4312d77bfff8099ac606c481c1cb7ae3a423d494d2f3a8b2dd314d3`,1,183 files. Both hosted staging sites remain authorized cfd05aea /00ef97d5…e9ade3b with32 bounded navigation passes. No new deployment/publication, records, provider/AI calls, migrations, accounts/access, payment/manual secrets, source-main merge or production changes.
- [ ] Keep existing Owner admin SELECT privacy exception, linked-Student and sharing/revocation/expiry behavior, School/District/Partner live exports, provider/configuration/billing/security/operations/schema/rollback and remaining TF-01–TF-26 gates open. Source inspection confirms existing School/District export membership/organization/period guards; unit checks are not new live RLS acceptance. Deferred Parent Pilot/Pathway Snapshot retained.

Evidence: `/private/tmp/tf211-full-document-review`, `/private/tmp/tf211-source-note-final-edges` and `/private/tmp/tf211-source-note-verified-suite`. The PDF skill was used for rendering/text comparisons and visual review; no production or real student documents were inspected.

## Broad Navigation Passes: 32 Bounded Hosted Journeys — October 21, 2026

- [x] Human-approved read-only [run39681330072](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39681330072) verifies deployed cfd05aea identity/isolation and seven existing-account sign-ins, then passes29/29 cases with one worker and no retries:22 signed-out journeys at390/1440px and all seven signed-in role returns. Actual source/context, one relevant Back control, loaded-content return positions and new/Forward top or focused-content behavior pass within the selected journeys.
- [x] Signed-in departure→contextual Back→browser Back after Forward coordinates: Student816→816→816px; Family666→666→666; Educator844→844→844; School7→7→7; District0→0→0; Partner0→0→0; Owner2281→2281→2281. Deep mobile run39680920412 separately passes School1684, District1309 and Partner1378px twice. Combined32 bounded cases pass on the released fix; the shallow District/Partner standard cases are not treated as deep coverage.
- [x] Both stable staging sites verify fingerprint `00ef97d5a3579afe801b43e1b37dadbf959cc80ef8c5fa73dd5337d84e9ade3b`,1,183 files, staging backend, sandbox payments and isolation true. Cloudflare source cfd05aea; isolated Lovable authentic commit6befd220. The two AI runtime configurations still differ; no provider calls were performed.
- [ ] Continue remaining report/export, role/permission/privacy, provider/configuration, billing/security/operations/schema and rollback acceptance before an exact production release proposal. Passing navigation does not establish every page, every role feature or production readiness. Retain earlier failed runs and the corrected offline-checker retraction; do not relabel them successful. Parent Pilot/Pathway Snapshot remains deferred and retained in the full TF-01–TF-26 roadmap.

Evidence: `/private/tmp/tf211-navigation-39681330072` and `/private/tmp/tf211-deep-return-39680920412` contain sanitized reports, decoded results, workflow logs and human approvals. No production/source-main merge, migrations, records, AI/provider calls, account/access, payment or manual secrets changes.

## Three Deep Mobile Journeys Pass on Released Fix — October 21, 2026

- Human-approved read-only [run39680920412](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39680920412) succeeds on exact deployed cfd05aea after identity/isolation and seven existing-account sign-in checks. Exactly three mobile cases, one worker, no retries: School 1684→1684→1684px (maximum3852), District1309→1309→1309px (maximum2966), Partner1378→1378→1378px (maximum3258). Loaded-source assertions, one main landmark, exact contextual return and Back after Forward pass; new/Forward arrival top checks retained. This is bounded evidence for the three previously affected journeys, not universal navigation acceptance.
- Broader read-only [run39681330072](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39681330072) is dispatched for22 anonymous mobile/desktop journeys and seven signed-in roles, awaiting its separate human environment review. Displayed6aa25cd4 changes only documentation; runtime remains verified cfd05aea. Previous failed runs remain historical evidence; broader production gates remain open.
- Evidence: `/private/tmp/tf211-deep-return-39680920412` (sanitized report, decoded position results, workflow and human approval). No application changes, new deployment, records, AI/provider calls, migrations, account/access, payment/manual secrets, source-main merge or production actions in this retest.

## Both Staging Releases Verified; Navigation Retest Awaiting Review — October 21, 2026

- Cloudflare release [39676110729](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39676110729) completed successfully after human review: exact source `cfd05aea2ac646fda6213bd61fefc67769b4a39e`, deployment identity and PWA checks passed.
- Both stable staging hosts verify fingerprint `00ef97d5a3579afe801b43e1b37dadbf959cc80ef8c5fa73dd5337d84e9ade3b`, 1,183 files, staging backend, sandbox payments and isolation true. Isolated Lovable's authentic build commit is `6befd220bd71a7dc5d3e0bfa0ee6a242076908a6`. Cloudflare AI remains intentionally unconfigured; Lovable managed AI is configured. Source parity does not establish provider or workflow acceptance.
- Read-only deep mobile School/District/Partner retest [39680920412](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39680920412) is dispatched and awaits its separate human environment review. Displayed `b5739ff4` adds only roadmap documentation; runtime remains verified cfd05aea. Broader 22-anonymous/seven-role navigation retest follows sequentially because the audit workflow cancels concurrent runs. Earlier failures and all broader production gates remain open pending evidence.
- No production/source-main merge, migrations, records, AI/provider calls, account/access, payment or manual secrets changes. Full roadmap and deferred Parent Pilot/Pathway Snapshot retained.

Evidence: `/private/tmp/tf211-interrupted-return-candidate`.

Every box requires attached evidence. A blank or unknown item is a NO-GO.

## Current Promotion Status — October 21, 2026

Staging and production must use the same reviewed application code when promoted, with separate databases, credentials, payment modes and deployment identities. Synchronization means promoting a tested release; it does not mean copying staging environment files, test fixtures or sandbox configuration into production.

Approved application `9d7c5dc20e724ab710333a5c17214d2abdea3f26` is externally verified on Cloudflare staging. The existing isolated Lovable staging publication is verified at authentic isolated sync commit `106d8c3f5dd2c48abc80867fce0e30759ff3176a`. Both share runtime fingerprint `f40378d17fed23c53c583308673d75d2f821bc3d598bab938fb5e8899da816bc`, 1,183 files, staging backend, sandbox Stripe and isolation true. Cloudflare has no configured AI provider; isolated Lovable uses managed AI. Source identity does not establish full provider or workflow parity.

[Loaded-dashboard audit39647870327](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39647870327) passes all seven selected signed-in role return journeys, with exact source/context, one relevant Back, restored positions after loaded content settles, and Forward-to-top. Separate same-application audit39633314251 passes22 anonymous mobile/desktop journeys while that original workflow remains failed for its historical role-test findings. Do not combine these into a fresh all-green29-case workflow or treat them as every-route acceptance. Earlier intermittent School/Owner failures remain retained without a proven cause; standard School/District/Partner departures were shallow. Human-approved deep mobile audit39661391933 passed District1309px restoration but failed School1684→0px; Partner stopped on nested main landmarks before restoration. A locally validated interrupted-return/landmark candidate is prepared but not released; exact-host acceptance remains open. Earlier standalone offline position claims using an async wait predicate are superseded by12 newly strict cases; hosted audit assertions are unaffected. See [the current roadmap](../READINESS_ROADMAP.md) for checkpoint evidence and limits.

The October19 pending release/landmark status is superseded by these named staging releases and audit results. This refresh does not complete grouped source review or waive any report/save/export, sharing/privacy (including Owner's existing admin SELECT exception), configuration, provider, billing, security, operations, schema or rollback requirement below. No new production access, application change, migration, merge, publication or release authorization is implied.

Production promotion requires a frozen reviewed candidate, applicable role/data/save-reopen/export acceptance, current production configuration/security/privacy/billing/operations evidence, a fresh separately authorized production migration baseline and reviewed dependency/rollback plan, then exact owner authorization for migration, protected-main merge and publication as applicable. The nine pending migrations below are from saved September evidence only. Production has not been queried or changed in this follow-up. The full staging package cannot be published to a production database missing its required atomic-history function or sharing grants.

Future roadmap features need not all be complete before a bounded release, but any exclusion or disabled feature must be explicit, technically enforced where required, and accepted in release scope. Do not treat green static CI, synthetic AI smoke, or staging health as a production GO decision. No production update is authorized by the user's question about timing.

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
- [x] The separately authorized 2026-09-17 production security window applied
      the three reviewed antivirus-independent migrations one at a time from
      protected-main SHA `f933401803e26ac76e3190d71cab9ca8c8b52536`.
      Exact ledger hashes and every post-file invariant passed. The fresh
      baseline contains 187 rows through `20260914120000`, with no malformed,
      duplicate, unresolved, or policy-error entries. See
      `production-security-maintenance-2026-09-17.md`.
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
- [ ] Nine canonical migrations are absent from the saved 2026-09-17 production baseline (187 rows), reconfirmed by offline comparison on 2026-10-19:
      `20260908000500_channel_attachment_malware_gate.sql`,
      `20260909010000_create_private_channel_attachments_bucket.sql`,
      `20260918190000_scope_student_policies_and_access_code_roles.sql`,
      `20260927210000_narrow_catalog_and_site_media_reads.sql`,
      `20260928030000_add_dashboard_widget_preferences.sql`,
      `20260928040000_atomic_student_channel_start.sql`,
      `20260929010000_student_channel_removal_history.sql`,
      `20261006180000_server_only_report_share_rpcs.sql`,
      `20261012190000_atomic_pathway_report_content.sql`.
      This is a saved-evidence comparison; production was not reread or changed. Reconfirm the ledger and review hashes, dependencies, rollback and invariants before an authorized window. Attachment migrations remain blocked on provider/privacy approval.
- [x] Staging-only E2E fixture remains explicitly production-forbidden and is
      absent from the production migration plan.
- [x] Isolated staging records
      `20260909010000_create_private_channel_attachments_bucket` after a
      ledger-only correction with zero recorded statements. The migration SQL
      was not rerun and `channel-attachments` remained private. Evidence:
      `staging-migration-ledger-repair-2026-09-11.md`.
- [x] Lovable Cloud backup recovery point was recorded and the isolated export
      restore drill passed; both are linked from the migration-window evidence.
- [x] Maintenance and abort owners were present for the 2026-09-17 database
      security window, with the authorizing task retained as its incident record.
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
      attachment controls are implemented and deployed to isolated staging.
      Exactly one protected Cloudmersive channel run, `35521640583`, passed
      against exact SHA `193bed60f8d3d4233aab7cc043709e52cb388790`, and exactly
      one protected student-document run, `35810041318`, passed against exact
      SHA `848af3ef0220a31df8d5c3b65937b328898f8082`. Neither was retried. Each
      synthetic clean file was released through a signed private URL and
      matched byte-for-byte, while harmless EICAR was blocked and purged. No
      real file was used. This closes both staging path proofs only.
      Cloudmersive contractual/privacy, education-data, region, subprocessor,
      retention, and production-plan approval plus separately authorized
      production configuration and migrations are still required. See
      `channel-attachment-malware-gate-2026-09-08.md` and
      `cloudmersive-substitution-2026-09-18.md` and
      `staging-acceptance-2026-09-20.md` and
      `student-document-malware-proof-2026-09-22.md`.
- [ ] Lovable security findings are rescanned and closed; ignored findings and
      known dependency vulnerabilities are reviewed and dispositioned. Basic
      and deep scans are current with 0 known dependency issues, but all 9
      findings remain ignored rather than closed. The 2026-09-17 production
      security window reduced the 76 public-schema privileged routines to the
      reviewed grants: 0 PUBLIC-executable, 5 anonymous-executable, 54
      authenticated-executable, and none missing service-role execution. Future
      application-role functions no longer default to PUBLIC, anonymous, or
      authenticated execution. A Lovable rescan and reviewed finding disposition
      are still required. Details are in
      `staging-security-default-privileges-2026-09-14.md`,
      `production-security-inventory-2026-09-14.md`, and
      `production-security-maintenance-2026-09-17.md`. Finding 9 remains
      open because the non-relocatable, `supabase_admin`-owned `pg_net`
      registration uses `public`, although the fail-closed member inventory
      confirms zero actual extension members are in `public`. Do not attempt an
      automatic move or reinstall.

## Exact-SHA acceptance

Current consolidated isolated-staging acceptance snapshot: protected `main` SHA
`ac8fe39ac71308b54704d37ec1d893895b2c9a01` passed deployment run
`36237314092` and consolidated Release Readiness run `36237715068`. Its
push-time Build and SSR, accessibility, CT Seed v2, dashboard, role-guard,
permission, RLS, cross-district RLS, and standard production-readiness checks
all passed at exact-SHA parity. This snapshot includes the deeper live Pathway
intake, preview-first real-data dashboard alignment for every role, responsive
and semantic cleanup, the reviewed Student, Educator, School Admin, Partner,
and Owner views, and the three intentional Owner Hub visual baselines. The
visual threshold was not weakened. The Release Readiness artifact was sanitized
before upload and passed the no-credential-artifact gate. The current evidence
is recorded in `staging-acceptance-2026-09-26.md`; containment and prevention
for the earlier staging Playwright artifact incident are recorded in
`staging-playwright-artifact-containment-2026-09-20.md`.

Exactly one separately authorized Cloudmersive Channel Attachment Malware QA
run, `35521640583`, passed on the earlier exact SHA
`193bed60f8d3d4233aab7cc043709e52cb388790` using only a synthetic clean file
and the harmless EICAR marker. The clean file was released through a signed
private URL; EICAR remained unavailable and was purged. No retry was performed.
The later exact-SHA deployment `848af3ef0220a31df8d5c3b65937b328898f8082`
passed its standard protected checks, then exactly one separately authorized
Student Document Malware QA run, `35810041318`, proved the synthetic clean-file
and harmless-EICAR paths without retry. The clean file stayed quarantined until
its clean verdict, then downloaded with matching bytes and entered the AI
pipeline. EICAR was marked infected/deleted, purged from private storage,
excluded from the parent-facing list, sanitized in audit metadata, and never
queued for AI. This targeted proof does not replace the earlier consolidated
Release Readiness snapshot. It is not production acceptance: provider/legal
approval and separately authorized production configuration and migrations
remain open. Production remains NO-GO.

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

### Prepared Transactional Report History — October 12, 2026

- [x] Replay `20261012190000_atomic_pathway_report_content.sql` in disposable PostgreSQL; 12 behavioral cases verify owner/RLS, simultaneous-session conflict, snapshot/update failure rollback and effective grants. Both full canonical replays pass at test source cfd7f912. This does not establish hosted schema/RLS or application acceptance.
- [x] Specifically authorized isolated-staging history migration is applied; exact body/grants/ledger and nine rollback-only hosted SQL assertions pass with zero remaining fixtures. Follow [the evidence and acceptance plan](../pathway-transactional-history-plan.md).
- [x] Switch both save/regenerate callers in draft source with authenticated SDK/RPC error tests, no old-write fallback or generation retry. All 200 unit files / 1,916 tests and TypeScript pass.
- [ ] Specifically authorize staging deployment and verify actual signed-in RPC/save/regenerate/restore/reload, applicable-role and linked-student behavior, request limits/timeouts and exact source parity.
- [ ] Before production release, separately authorize/apply/verify the same history function on production; never deploy callers to a database missing the function or use a split-write fallback.
- [ ] Inventory direct content/version writers and record limitations: current UI does not provide a client-observed revision; the operation is not an immutable audit trail. Exact-release role/provider/navigation/export acceptance remains open. Production migration/release requires separate authorization.

The history migration is applied only to isolated staging under specific user authorization and remains unused by hosted handlers until deployment; draft callers now use it. Its presence in this draft does not authorize production migration, another pending migration, a bulk migration runner or deployment.

- [x] Reconcile the atomic-history staging ledger entry: both canonical hashes now match, installed function definition/configuration/grants remain unchanged; all 16 real disposable PostgreSQL cases pass. This closes one entry only, not full staging/production migration alignment. See [candidate review](../pr211-release-review.md).
