# Production release checklist

## October 23 — Authorized History Migration Verified; Release Pending

The user explicitly authorized the staged rollout and one bounded no-AI test. Only `20261023020000_enforce_pathway_report_content_history.sql` and its exact canonical ledger record committed on isolated staging `qgrertkqbwanerqqemph`. Fresh read-only preflight found no drift/new ledger/active report writer. Independent post-commit verification at `2026-10-23T15:04:33.993742+00:00` confirms both exact function bodies, fixed search paths/invoker/definer flags, the enabled trigger, restricted client grants, unchanged policies and retained service table administration. The original ledger remains unchanged. See `docs/production-readiness/evidence/report-history-staging-rollout-2026-10-23.json`. No real reports were read or mutated.

Cloudflare run39975596569 waits for required human staging review. Its allowed-branch commit09824338 differs from approved f821aa75 only in documentation; runtime/migration hashes match. An attempt on a new pinned branch was rejected by existing environment restrictions before any deploy step. Protection was preserved. The docs-head accessibility job timed out downloading browser dependencies; exact approved f821aa75 passed accessibility and all automatic checks.

Isolated Lovable received only the three approved reader-control files; settings, dependencies, generated types and the builder title are preserved. Preview update is pending verification/publication. The old report test's fabricated version seed is replaced by a legitimate RPC save and direct owner edit, then actual UI restore/export and exact cleanup. It also checks denied history mutations and nonowner controls; both stable hosts must match before fixtures. TypeScript,49 focused scope/cleanup/write tests and discovery of exactly two fixture tests pass. No hosted fixture has run; the single approved allowance remains unused. Linked-editor hosted acceptance is explicitly unperformed because these fixtures are unlinked and new relationships are not authorized. Production remains unchanged/NO-GO.


## October 23 — Canonical Report-History Candidate (Not Applied)

- [x] Prepared additive `20261023020000_enforce_pathway_report_content_history.sql` from the validated proposal; no applied migration was edited. Permitted content updates snapshot prior content and actual actor; client version fabrication and structural grants are removed while report RLS/editing and service table administration remain.
- [x] Registered the exact internal trigger as client-execution-forbidden and the sole service-role EXECUTE exception. It has no ordinary RPC caller. All other privileged routines retain their reviewed service grants; PUBLIC/client allowlists are unchanged.
- [x] Local disposable validation: 37 database cases pass, two multi-session cases await native PostgreSQL; 41 source/permission/readiness contracts pass. Earlier prototype native evidence remains historical, not acceptance of this canonical candidate.
- [x] Exact candidate `f821aa753bd52281f4ffe897ff99e0f301e281e6` passes all automatic checks, including 4,399 units, build/SSR and accessibility. Native history passes 39 cases with zero skips; combined 205-migration replay verifies all 92 privileged routines, the exact trigger exception, trigger metadata, table/column grants and invoker RPC permissions. Protected hosted skips are unperformed. See `docs/production-readiness/evidence/report-history-canonical-validation-2026-10-23.json` and the concrete `docs/production-readiness/report-history-staging-candidate-2026-10-23.md` packet.
- [ ] Review exact candidate/checksum and staged application compatibility; settle Owner/admin planning-data access separately. Existing administrative exceptions are preserved, not approved for production by this change.
- [ ] Obtain new specific authorization before any hosted migration, deployment, publication or bounded fixture acceptance run. Previously approved fixture runs are complete.

Canonical source inventory is now 205 migrations; 11 are pending against the **saved September 17 production observation**. This does not claim a fresh production inspection. Current staging remains approved `a2c5564c` / runtime `c4e3096b…9adb13d`, 1,184 files. The local reader-control fix and this migration are not deployed. Production remains NO-GO. Stale browser intent, retention/large reports, removed-member bearer access and full role/demo/provider/export acceptance remain open. Full TF-01–TF-26 roadmap and deferred Parent Pilot/Pathway Report Snapshot are retained.


## Owner-Only Report Controls Prepared Across Role Readers — October 23, 2026

The authenticated report reader now returns a strict `is_report_owner` hint derived from the stored report owner and authenticated caller, without exposing the owner ID or accepting a client ownership claim. The saved reader hides both regeneration entry points and Restore for non-owning/unconfirmed readers while retaining readable history, printing and existing sharing. Owners retain restore and linked-student generation. The panel defaults to read-only when the capability is absent and cancels a pending version fetch if restore eligibility disappears. Existing mutation handlers still independently enforce ownership/RLS/entitlements; this hint does not grant access or settle Owner/admin report SELECT.

Validation: 103 focused component/actual-handler cases pass, including both ownership outcomes for all seven role labels, forged hints, missing/malformed capability, existing router/late-response recovery and permission loss during a version fetch. Full unit suite: 311 files /4,399 tests; TypeScript and diff checks pass. Local runtime fingerprint `5ba40cce2a4b1a0e1213a37c3ea5c40e854b8fb2c001c60c5145b335ad43b58c`, 1,184 files. All eight automatic checks pass on exact `ee3cbf5c77117b84196719a6cb9da19af9b76372`, including build/SSR, native replay, full units, accessibility, readiness, role guard and seed checks. Protected skips are not acceptance. Hosted acceptance remains required; no publication/sync is implied.

Both actual staging sites retain the approved `c4e3096b…9adb13d` runtime. The report-history proposal remains unapplied and unchanged from its 39-case native/concurrency/full-replay acceptance. Next: review and prepare an additive canonical migration for that database boundary, then obtain specific authorization before any migration, deployment/publication or bounded fixture test. Owner data-access policy and stale browser intent remain distinct gates. No hosted/database/account/access/payment/secret or AI/production action occurred in this local change. Full roadmap and deferred Parent Pilot/Pathway Snapshot are retained.


## Target-Reconciled History Boundary Passed Native Validation — October 23, 2026

Review-only proposal `95678424` passes all 39 native PostgreSQL cases, zero skips, both concurrency journeys and full canonical replay in [run39964618618](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39964618618); all eight automatic checks pass. The source/fixture now reflects the read-only staging catalog's broad grants and current Team history policies. It snapshots permitted content updates and proposes explicit removal of ordinary-client structural/version-write privileges while preserving report CRUD/RLS/editor and service behavior. [Exact checksums, evidence, all-role assessment and next gates](report-history-write-boundary-review-2026-10-23.md).

This remains an unapplied proposal outside canonical migrations. Next: review the new trigger privilege boundary, canonical migration/ledger/recovery scope, Owner administrative planning-data access and source-confirmed owner-only Restore/Regenerate controls shown to non-owning readers. Stale browser intent remains separate. No new hosted fixtures, schema/grant/ledger writes, synchronization, deployment/publication, AI call, account/access change or production action. Both approved staging runtimes and the full roadmap/deferred Parent Pilot–Pathway Snapshot remain unchanged.


## Report History Proposal Reconciled to Actual Staging Catalog — October 23, 2026

Initial review-only candidate `01c1a57d` passes all 37 native PostgreSQL cases (zero skips, both concurrency journeys), full canonical replay and all eight automatic checks. A subsequent read-only isolated staging catalog query confirms the RPC identity and current Team history policies but finds broader effective client TRIGGER/TRUNCATE and version write grants than the narrow initial fixture. No hosted mutation was attempted. The replacement proposal explicitly narrows those structural/version-write capabilities, preserves report CRUD/RLS/editor/service behavior and uses the actual Team policies plus broad grants in its disposable fixture. Local replacement: 37 pass/two native concurrency skips, 39 total. Exact-head native CI remains required. [Evidence, scoped proposal, role matrix and limits](report-history-write-boundary-review-2026-10-23.md).

Only catalog metadata was read; no application content, hosted fixture, schema/grant/ledger change, synchronization, deployment/publication, AI call or production access. The proposal remains outside canonical migrations, with both staging runtimes unchanged. Owner administrative report access, stale browser intent, full roadmap and deferred Parent Pilot/Pathway Snapshot remain open.


## Direct Report History Boundary Proposed — October 23, 2026

Disposable SQL now reproduces direct owner content edits without history and fabricated version insertion/actor attribution. A review-only trigger proposal snapshots every permitted SQL content UPDATE and blocks ordinary direct version mutations while preserving existing report RLS/editor capabilities and the owner-only invoker RPC. Owner administrative SELECT/UPDATE remains an explicit unresolved policy decision; the proposal does not silently remove it. Local SQL: 35 pass, two native concurrency cases skipped; three retained source contracts pass. Exact-commit native PostgreSQL/replay and fresh read-only staging catalog review are next. [Scope, all-role assessment, security/recovery gates and limitations](report-history-write-boundary-review-2026-10-23.md).

No canonical migration or application source changed; runtime remains approved `c4e3096b…9adb13d` /1,184 files. No hosted query/fixture, synchronization/deployment/publication, provider call, account/access change or production action occurred. Production stays NO-GO and the complete roadmap/deferred Parent Pilot–Pathway Snapshot remain preserved.


## Isolated Sharing Acceptance Passed and Cleaned — October 23, 2026

- [x] Both separately authorized sharing migrations committed and verified on isolated backend `qgrertkqbwanerqqemph`; browser RPC execution is removed, service execution retained, and token writes limited to creator-owned one-way revocation.
- [x] Cloudflare serves exact approved `a2c5564c`; isolated Lovable serves sync `38cae2626da442b89b16b0d954bb5c02cd5e31dd`. Both stable health endpoints independently report fingerprint `c4e3096bb114388a5ff91157df2c8dd75ec8b92f2fa358d8cfbe2e14f9adb13d`, 1,184 files, staging backend, sandbox payments and isolation true. Lovable's earlier post-publication dynamic-route timeouts resolved without a source/settings/security workaround; retain that failure history.
- [x] Human-approved [run39918095920](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39918095920) passed all seven existing role sign-ins and the single no-AI sharing test, with retries disabled. Exactly two fictional Family/Educator intake/report pairs and eight links were used. Link creation/revocation through the actual report UI, uniquely identified Family Trust revocation, both fixed public audiences on both sites, protected-field/non-issuer/missing-ID/raw-RPC/deletion/reactivation denial and inactive links passed.
- [x] Exact caller-RLS fixture cleanup passed. A subsequent privileged `BEGIN READ ONLY` query as postgres confirmed zero reports, intakes, history versions and tokens for those exact recorded IDs/report relationships. The sanitizer passed and only its small sanitized artifact was downloaded. No AI calls, new accounts/memberships, real-report sharing or production access occurred.

[Sanitized acceptance, both health identities and privileged cleanup evidence](evidence/staging-sharing-acceptance-2026-10-23.json). This closes the named isolated sharing rollout/test only. It does not close whole-product/all-tool generation/export/permissions acceptance, existing Owner report SELECT policy, direct report/history write integrity or membership-removal bearer-link lifecycle. Production remains NO-GO; retain report density/native-print, provider/privacy, billing/email/security/operations/migration/recovery gates and every full-roadmap item. Parent Pilot/Pathway Report Snapshot remains deferred. Entries below are historical and superseded only for the explicitly verified scope.


## Authorized Sharing Rollout; Hosted Acceptance Still Open — October 23, 2026

- [x] Both individually authorized sharing migrations committed and verified on isolated backend `qgrertkqbwanerqqemph`, preserving service RPC access and narrowing browser token writes to creator-owned revocation.
- [x] Exact `a2c5564c` deployed to Cloudflare staging after human GitHub approval; fingerprint `c4e3096b…9adb13d`, 1,184 files, sandbox payments and isolation true verified.
- [x] Three approved runtime files synced to isolated Lovable commit `38cae2626da442b89b16b0d954bb5c02cd5e31dd`; its external private preview matches the source/backend/payment identity. Existing staging publication updated with the owner's authorization.
- [ ] Verify stable Lovable dynamic routes. After publication, existing static favicon returns HTTP 200, but health and home requests time out after TLS/request delivery (HTTP/2 and HTTP/1.1 checked). Server logs show no newer matching health requests; the private health 503 is the expected rejected-alias identity result, not a waived gate. Do not claim stable parity or change secrets/security/build limits to bypass this.
- [ ] Complete the authorized bounded no-AI sharing acceptance and privileged exact-ID cleanup readback. [Protected run39918095920](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39918095920) is queued for human staging review. Its 15-second two-host health gates precede fixtures. No new test reports, intakes or tokens have been created. No retry is implied.

The test-only harness passes 49 focused tests, three artifact-safety checks, TypeScript and single-test Playwright discovery. All eight automatic checks passed on harness commit `6312f847`; follow-up `4b91ca22` only bounds pre-fixture health requests. Traces/video/screenshots are disabled for bearer-link journeys; cleanup remains exact owner/model/ID scoped. This is not hosted acceptance. [Migration evidence and execution limits](share-token-staging-acceptance-packet.md#authorized-isolated-staging-rollout--october-23-2026).

Production remains NO-GO and untouched. Preserve the wider role/tool/provider, report density/integrity, access lifecycle, billing/email/security/operations/migration/recovery gates, the complete roadmap and deferred Parent Pilot/Pathway Report Snapshot. The dated entries below are historical and superseded only where this current result explicitly says so.


## Native Sharing Regression Passed; Inventory Reconciled — October 23, 2026

Draft candidate 7cd69645 passes all 23 native PostgreSQL sharing cases, complete canonical migration replay and retained RLS/grant/security invariants in [automatic replay39912312267](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39912312267); independent PR replay also passes. Build/SSR, unit, accessibility, role guard and static seed checks pass; protected hosted suites are skipped. The readiness gate correctly catches stale 203/nine migration inventory expectations. Reconcile them to 204/ten and include the exact new pending filename in all saved-CSV comparisons while preserving historical production read dates/counts, comparator controls and NO-GO. All 53 affected local contracts pass. [Evidence and exact-head follow-up requirement](share-token-staging-acceptance-packet.md#native-postgresql-acceptance-and-inventory-correction--october-23-2026).

No hosted migration, fixture, grant/account/secret/provider change, deployment/publication or production access. Candidate is only on existing draft PR211; both staging applications remain eb72bd87. Full roadmap and deferred Parent Pilot/Pathway Snapshot retained.


## Canonical Sharing Security Candidate Prepared — October 23, 2026

Prepared additive `20261023010000_restrict_report_share_token_writes.sql` with an enforced server-only sharing prerequisite; no applied migration changed. All 23 local disposable SQL cases pass. Existing CI now runs the cases in native disposable PostgreSQL before complete canonical replay; that hosted CI result is pending. Nineteen scoped source contracts pass. The broad mixed Node invocation is not accepted (credential/loader prerequisites absent); no protected test credentials or hosted workaround were used. Runtime remains unchanged since 4,363 unit tests and TypeScript passed. Saved September production evidence now yields ten pending migrations including this candidate; this is not a production inspection. [Exact hashes, validation limits and rollback plan](share-token-staging-acceptance-packet.md#canonical-candidate-finalized--october-23-2026).

Next: record/review the candidate commit and exact-head automatic checks, then present the two ordered staging migrations plus bounded release/test scope for specific authorization. No migration, deployment/publication, provider call, fixture, permission/secret/account or production action. Both staging sites remain eb72bd87; full roadmap and deferred Parent Pilot/Pathway Snapshot retained.


## Actual Isolated Sharing Catalog Read — October 23, 2026

One metadata-only BEGIN READ ONLY query in signed-in Supabase staging/E2E (`qgrertkqbwanerqqemph`) confirms broad authenticated share-token UPDATE/DELETE and creator-only UPDATE policy. It also finds browser execution still granted on both raw share RPCs and no selected ledger entry for `20261006180000`. Source-only server grant tests did not establish hosted closure. The existing canonical server-only grants and proposed narrow token-write restriction must be reviewed as two separate ordered changes before authorization. [Captured metadata, export provenance and revised packet](share-token-staging-acceptance-packet.md#read-only-isolated-staging-preflight-completed--october-23-2026). No retarget/report read, grant/schema/ledger change, fixture, deployment/publication, provider call or production access occurred. The query/export is not rerun after a delayed browser download callback; the downloaded CSV agrees with the observed result. Twenty-one disposable SQL cases now include the single-row catalog query; existing runtime validation remains 4,363 units/TypeScript/15 source contracts. Both staging applications remain eb72bd87; full roadmap and deferred Parent Pilot/Pathway Snapshot retained.


## Sharing Compatibility and Staging Packet Prepared — October 22, 2026

[Reviewed compatibility/acceptance packet](share-token-staging-acceptance-packet.md) records the uncommitted candidate identity, exact SQL/preflight hashes, caller compatibility, ordered catalog/canonical-migration/release steps, bounded no-AI fixtures and exact trusted cleanup. No product token delete/edit/reactivation path was found. Strengthened the unapplied proposal with a restrictive policy and RLS/client-role assertions; all 20 in-memory SQL cases pass, including read-only preflight execution, an additional permissive policy and preserved service tracking. Runtime is unchanged since the 4,363-unit/TypeScript/15-source-contract results. The packet requires fresh isolated catalog/dependency review and an authentic committed candidate before any hosted authorization request. No canonical migration, hosted fixture, provider call, deployment/publication, account/access/secret change or production action occurred. Both staging sites remain eb72bd87; full roadmap and deferred Parent Pilot/Pathway Snapshot retained.


## Sharing Restriction Reproduced; Revoke Confirmation Prepared — October 22, 2026

Credential-free in-memory PostgreSQL reproduces canonical token retargeting and foreign fictional report resolution. Sixteen database cases pass for the review-only write restriction, including protected columns, exact/repeated revocation, creation/foreign creation, expiry, anonymous denial and inherited-grant abort. The proposal lives outside applied migrations and restricts client deletion/reactivation as well as retargeting; availability/scope review and a separately authorized canonical migration remain required. Local Students/Trust callers now share exact caller-owned revoke confirmation, with 14 new handler regressions. Full unit suite passes 309 files /4,363 tests; 15 retained source contracts and final TypeScript pass. [Evidence, scope and unapplied proposal](report-access-release-review-2026-10-22.md#local-reproduction-and-candidate--october-22-2026).

Next: finish the proposal/compatibility review and prepare a concrete staged acceptance/migration packet before asking for any hosted change. The SQL blocker is not closed by local evidence; direct report/history writes, Owner administrative access and bearer-link lifecycle remain release decisions. No hosted fixtures, provider calls, migrations, deployment/publication, account/access/payment/secret changes or production action. Both staging sites remain eb72bd87; full roadmap and deferred Parent Pilot/Pathway Snapshot preserved.


## Report Permission Source Review — October 22, 2026

[Scoped report-access review](report-access-release-review-2026-10-22.md) identifies a production blocker in canonical share-token UPDATE permissions: token creators can modify more than revocation, and the privileged resolver follows the token's report reference. This is a source finding, not a claim about freshly inspected production grants. Also retain direct report/version write integrity, management-only Owner versus backend admin access, independent bearer-link revocation and unconfirmed zero-row revoke outcomes as explicit release decisions/work. Five source checks and 61 existing mocked unit tests pass; these do not execute the affected PostgreSQL policies.

Next: prepare a disposable-database regression and reviewed narrow share-write restriction, fix exact revoke confirmation, then resolve the named access/scope decisions before requesting hosted changes. No runtime or applied-migration edits, fixture/provider calls, merge, deployment/publication, permissions/account/secret changes or production actions. Both staging sites remain eb72bd87; full roadmap and deferred Parent Pilot/Pathway Snapshot remain retained.


## Report Writer Release Review — October 22, 2026

Completed the checked-in report/content/version writer inventory in [the transactional history plan](../pathway-transactional-history-plan.md#current-writer-inventory-and-release-order--october-22-2026). Normal save/regenerate/restore use the caller-authenticated atomic history RPC; creation, link/freshness metadata, deletion, demo seeding and admin shadow writes are separately classified. Three existing source contract checks pass. This closes the scoped source inventory only, not external writers, current production grants, stale-client intent, all-role/provider acceptance or production approval. Default-off shadow input is not a server-enforced disable; shadow/demo-seed release availability needs explicit disposition. Historical draft-only caller statements are superseded by the plan's current checkpoint and completed staging acceptance.

Next: resolve the named source/scope decisions and remaining acceptance, then prepare a fresh production inventory/migration/recovery packet for separate authorization. Both staging sites remain eb72bd87. No runtime edit, fixture/provider call, merge, deployment, publication, migration, account/access/payment/secret change or production action. Preserve the full roadmap and deferred Parent Pilot/Pathway Report Snapshot.


## Homepage, Demo Centering and Meeting Spacing Released — October 22, 2026

Earlier checkpoints below are historical. This section records current release and test status; unrelated roadmap work remains open.

- [x] Release user-authorized eb72bd87 to Cloudflare staging through human-approved [run39869886107](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39869886107). Deployment guards, exact source identity and PWA checks pass. All eight automatic checks and 4,349 unit tests passed before release. Both stable staging sites now serve fingerprint `550c963f1472ef6723c1125011deb400a3acfab5da9d79602cf2ce0a1f673b64`, 1,183 files, staging backend and sandbox payments with isolation true.
- [x] Isolated Lovable sync dc60dac changes only the three approved runtime files. Fetch confirms no intervening builder edits; environment hashes remain identical, frozen install makes no changes and before/after fingerprints match the independently restored archive. Preserve the Your Dashboard Widgets edit and Git history. Native Chrome verifies the active private preview fingerprint before one authorized existing-site publication. Stable public health confirms that publication and reports isolated dc60dac as its Git field, not upstream eb72bd87. Do not invent upstream build identity.
- [x] Retain the browser mismatch evidence: an earlier DOM-control session returned stale private metadata and then a zero-size viewport; the visible native Chrome session showed the current preview. Use its visible JSON/screenshot plus independent stable HTTP verification, rather than treating the stale helper response as the deployed identity. No support request, source workaround, access change or duplicate publication is used.
- [x] Twenty read-only public layout checks pass across both stable hosts: homepage and `/demo` at 320, 390, 768, 1440 and 1920px in empty browser sessions. Real-Life and Pathways share the second heading line; the demo outer container has equal side margins; neither page has horizontal overflow at these sizes. Representative hosted desktop screenshots reviewed. This is bounded public layout acceptance, not all-role feature or native print acceptance.
- [x] Complete the separately authorized, human-approved [no-AI report recheck 39870631001](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39870631001) on exact eb72bd87. All seven existing role sessions/fresh-context checks and both Family/Educator restore/reload/history/export journeys pass, one worker, retries zero. GitHub initially had no recorded approval; after the visible review handoff it records the user's approval and runs successfully. Browser installation takes 23 seconds in this run; no workflow change or replacement fixture run was needed. Retain sanitized artifact 12466851789 only.
- [x] Verify both exact-ID cleanups have no errors and owner-RLS zero-count readbacks for reports, intakes and report versions. Both expected versions remain correct before cleanup. Five other non-owning, non-Owner roles cannot read each unlinked synthetic report; the existing Owner/admin SELECT exception exposes its ID and is observed, not changed. This is bounded caller-RLS evidence, not privileged global absence or a complete permission audit. No sharing grants were created.
- [x] Independently inspect both saved exports: the restored summary is present, replaced summary absent, all five meeting questions appear once, all three follow-ups and the complete source note share page 8. Both retain complete endings and no text-empty pages. Visually review pages 1, 2, 8 and 32 of each: readable content, role-specific next steps, clear sections and top-right watermark are present in the inspected samples. Do not claim an all 64-page visual audit or native print-dialog acceptance. Fixture content is copied from the fictional sample; this run makes no AI call and does not validate live generation/provenance.
- [ ] Overall report density remains open: both saved PDFs still total 32 pages; the meeting-sheet repair did not shorten the whole report. Preserve native print, broader permissions/privacy/provider/configuration/security/billing/operations/schema/rollback, full TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot gates. Both staging sites remain eb72bd87; documentation updates are not a new runtime release. No production/main merge, migrations, AI/provider calls, account/access/payment or manual secrets changes. Only the two explicitly authorized fixture sets were created and cleaned up.

Evidence: `/private/tmp/tf211-centered-meeting-release` (archive restoration/checksum, passed CI, human approval, Cloudflare log/health, isolated sync/env hashes, stale/native private evidence, verified stable health, 20 layout measurements/screenshots, completed protected-test approval/logs, sanitized acceptance records, two saved PDFs and rendered samples).

## Demo Centering and Complete Meeting Sheet — Local Candidate, October 22, 2026

- [x] Center `/demo` by adding automatic side margins to its existing width-limited outer container. Preserve its cards, text alignment rules, links, spacing and content. An isolated actual-route-content fixture measures equal margins and no horizontal overflow at320,390,768,1440,1920px; desktop/mobile samples reviewed. The initial measurement caught the route-entry animation mid-transform; reduced-motion fixture measurements verify the settled layout without changing product animation. This is local content verification, not a hosted SiteShell audit.
- [x] Reproduce the saved-reader meeting split with the site stylesheet, explicitly loaded bundled variable fonts, signed-in publication wrapper and recorded-section metadata. The earlier font-blocked fixture was insufficient. The new baseline fails for all Family/Educator/Student saved views on Letter and A4: questions are on page8 and all three follow-ups on page9.
- [x] Scope the correction to printed meeting-section spacing: spread margins, detail-group padding, checklist margins/row gaps, sidebar inset and source-note inset. Preserve all words, font sizes, columns and permissions. Intermediate checks fit the questions/follow-ups but leave the source note on the next page; retain those failures and require the complete source note on the meeting sheet too.
- [x] Final real-font regression passes all11 export combinations: three saved audiences on Letter/A4, three demo audiences and two fixed shared audiences on Letter. Questions, follow-ups and the complete source note share page8. Six saved before/after PDF pairs retain the same normalized character inventory and31-page length in this fixture. This does not reduce the previously observed hosted32-page saved reports or prove exact text order/byte identity. Representative final meeting pages reviewed with the top-right watermark.
- [x] The full46-case offline document suite passes on the initial spacing candidate; after the final source-note refinements, recheck all three affected saved-shell/prepared/real-font cases successfully. TypeScript passes. Recheck the homepage heading with an explicitly loaded display font: same-line Real-Life/Pathways and no overflow at all five checked widths. No backend, AI or staging records are used for these local checks.
- [ ] Candidate fingerprint `550c963f1472ef6723c1125011deb400a3acfab5da9d79602cf2ce0a1f673b64`,1,183 files, includes the pending homepage heading, demo centering and meeting spacing. Automatic checks and separately authorized staging release/sync/publication plus hosted acceptance remain required. Both stable staging sites remain d3dbd1e0. Production/main, migrations, accounts/access, payments and secrets remain untouched. Keep whole-report density, native print, full TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot open.

Evidence: `/private/tmp/tf211-saved-pagination`, `/private/tmp/tf-demo-center`, `/private/tmp/tf-home-headline` (failure/passing logs, page matrices, content comparisons, type-check, viewport measurements and rendered samples).

## Homepage Heading Line Break — Local Change, October 22, 2026

- [x] Move the existing “Real-Life” accent down to the same dedicated line as “Pathways.” Preserve the editable hero fields, wording, gradient, underline, typography and surrounding layout. A network-blocked browser fixture using the exact heading markup, site stylesheet and bundled font verifies the shared text baseline and no horizontal overflow at320,390,768,1024,1440px; mobile/desktop images reviewed. This is bounded heading-layout verification, not a full-page hosted audit.
- [ ] This small homepage change is not deployed or synced to Lovable yet. Both staging publications remain d3dbd1e0. Saved-report pagination remains the next document task; production and the complete roadmap stay unchanged.

Evidence: `/private/tmp/tf-home-headline` (before/after measurements and mobile/desktop heading previews).

## Saved-Report Restore and Cleanup Verified; Export Pagination Still Open — October 22, 2026

- [x] Run the separately user-authorized, human-approved [saved-report acceptance39865603885](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39865603885) once on verified d3dbd1e0, fingerprint `aada1bd6b4887a4df136d81c2341dcf7a36047e7c2edda0f506d76cc5f9db73f`, 1,183 files, staging backend and sandbox isolation. All seven existing role session/fresh-context checks and both Family/Educator fixture journeys pass, one worker, retries zero. Browser installation takes about ten minutes before tests; retain this repeated runner delay separately from product acceptance. No replacement fixture run occurred.
- [x] Create only two fictional intakes/reports and their initial history versions using synthetic account clients and caller RLS. Each owner restores once, reopens the saved report, retains the appropriate audience and reads back the restored content plus both expected versions. Other five non-owning, non-Owner role clients cannot read that unlinked report; the existing Owner/admin SELECT exception makes each synthetic report ID visible. This is a bounded report-read check, not full permission, sharing or all-tool acceptance; no grants were created.
- [x] Exact-ID cleanup succeeds for both runs: report deletion, intake deletion and owner-RLS zero-count readbacks for reports, intakes and report versions. Both acceptance records report no cleanup errors. This is caller-visible absence, not privileged global database proof. Twenty local isolation/cleanup unit checks also pass. Only sanitized artifact12463573634 was downloaded; no auth states or credential-bearing traces were retrieved.
- [x] Both exported fictional PDFs contain the restored summary (page2), omit the replaced current summary, have complete endings and no text-empty pages. Review pages1,2,8,9,32 of each PDF: readable columns, role-specific next steps and top-right watermark are present in these inspected samples. Preserve the initial local failed first-page-summary assumption; the separate snapshot occupies page1 and the correctly normalized full-document check passes. No native print or all64-page visual audit is claimed. These reports copy fictional demo content; this test calls no AI and does not validate live generation/provenance.
- [ ] Saved-report visual parity remains open: both PDFs are32 pages, and the meeting-prep section begins on page8 but student voice, follow-ups and its source note continue on page9. Prior prepared-demo PDFs remain31 pages with their compact meeting sheet; do not generalize those prepared-view passes to these saved exports. Next, reproduce this exact saved-reader pagination locally, preserve all content, and review a shared correction across applicable demo/saved/shared audiences before seeking any new staging release authorization.
- [ ] Preserve whole-report density, native print, broader permissions/privacy, provider/configuration, security/billing/operations/schema/rollback, all TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot gates. Runtime remains d3dbd1e0 on both staging sites. This test did not deploy, publish, merge main, migrate, call AI/providers, modify account/access/payment/secrets settings or touch production. Temporary fixture writes and exact cleanup were authorized only for this completed run.

Evidence: `/private/tmp/tf211-saved-report-acceptance` (human approval, final job status/log, sanitized fixture evidence, two PDFs, parsed content checks and rendered samples).

## Security and Meeting-Sheet Release Verified on Both Staging Sites — October 22, 2026

- [x] User-authorized d3dbd1e0 is released on Cloudflare and the existing isolated Lovable publication. Human-approved [release39849511366](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39849511366) passes exact source identity, sandbox isolation and PWA checks. Both stable sites independently serve fingerprint `aada1bd6b4887a4df136d81c2341dcf7a36047e7c2edda0f506d76cc5f9db73f`,1,183 files, staging backend and sandbox payments with isolation true. Lovable's Git field remains dev; its content identity is verified by fingerprint. Preserve its initial stale response as propagation evidence.
- [x] Isolated sync2e1df335 changes only the report stylesheet, package.json and bun.lock. Environment hashes remain unchanged, frozen install preserves exact source and the Your Dashboard Widgets edit is retained. Eight automatic checks and4,349 unit tests passed for this runtime; seven protected/credentialed skips were not counted as acceptance. The high/critical dependency audit passes after the DOMPurify patch; seven lower-severity findings remain outside that threshold.
- [x] Human-approved [report run39850311552](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39850311552) succeeds on exact d3dbd1e0: all seven existing role sessions/fresh-context checks, then four anonymous report journeys at390/1440px, Family/Educator origins, one worker and retries0. Retain sanitized artifact12458705135 only. Its browser prerequisite took about ten minutes but completed; no application test failed, no cancellation/replacement run occurred. A local preinstalled-Chrome workflow alternative was prepared/tested but left unshipped once the original run succeeded; configuration/workflow/test files are restored to the reviewed runtime baseline.
- [x] Independently run the same four anonymous public-report journeys against published Lovable using installed local Chrome:4/4 pass without retries. This separate public check uses empty sessions and does not replace the protected seven-role preflight. Manual1214px checks also verify Family/Educator/Student lens/edition/URL agreement and one-click optional-details returns from both Builder contexts. Preserve the older intermittent observation as historical evidence; current bounded checks pass without claiming its original cause was diagnosed or all possible intermittency disproved.
- [x] Independently parse all six exported fictional PDFs:31 pages each, complete endings, no blank pages, five recorded meeting questions printed exactly once and all three short follow-up actions on the same meeting sheet, page8. Hosted final-question/source grouping assertions also pass. Visually inspect the revised meeting page on each host and representative Lovable first/closing pages; the top-right mark remains visible on the inspected meeting pages. Do not claim all186 pages or native OS printing were visually audited.
- [x] Preserve the extra cross-renderer comparison failures: extracted word tokens and exact text sequences differ through spacing, page-boundary reading order and apostrophe mapping. Full normalized character inventories agree after only whitespace/compatibility/apostrophe normalization, and the bounded semantic question/follow-up/ending checks pass. No byte-identical or exact extracted-text parity claim is made between Linux Chromium and Mac Chrome.
- [ ] Whole-report length/density remains open: the hosted reports are still31 pages. Next, complete live saved-report/history/export acceptance with separately authorized temporary records as needed; current release scope created none. Native print, permissions/privacy, provider/configuration, security/billing/operations/schema/rollback, full TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot remain tracked. No production/main merge, migration, fixtures/records, AI/provider call, account/access, payment or manual secrets change.

Evidence: `/private/tmp/tf211-security-reader` (exact automatic checks, unit/build/audit logs, independent source archive restoration, release/test approvals, stable-health parity, isolated sync hashes, sanitized CI evidence, separate Lovable report log/PDFs, bounded manual checks and rendered samples).

## Dependency Audit and Reader-Test Budget — Local Candidate, October 22, 2026

- [x] Preserve the failed ee664920 CI results: unit run39837898764 passes4,348 tests but the full-reader Family lens journey exceeds its5s aggregate limit; the parallel Educator journey passes at4.26s. Build run39837898747 stops at the dependency audit before compiling, on DOMPurify3.4.13 advisories GHSA-cg2g-xh64-v4q7 and GHSA-mrv2-3pqr-j5jr. Do not relabel these failed runs as passes or infer a product routing defect from this timeout alone.
- [x] Pin only DOMPurify3.4.17, the maintainer's patched release for both findings: [release notes](https://github.com/cure53/DOMPurify/releases/tag/3.4.17), [template/shadow-root advisory](https://github.com/advisories/GHSA-cg2g-xh64-v4q7), [detached-node advisory](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr). package.json and bun.lock change only that dependency resolution. High/critical audit passes; seven findings below that selected threshold remain, so this is not an all-severity clean audit. Frozen install makes no further changes. Existing jsPDF optional-HTML boundaries remain intact.
- [x] The unchanged11-case reader file passes locally before any test-budget change; full route behavior remains under test. Allow10s aggregate time only for the two parameterized multi-page journey groups (lens/history and optional-detail return). Per-step wait limits, real router/reader rendering, fixed-audience checks, URL/Back/Forward checks, server-call prohibition and retries remain unchanged. Direct/simple cases and global defaults stay at5s. This accommodates measured multi-render work; hosted confirmation is still required, and the timeout's exact environmental cause is not established.
- [x] Full local unit run passes308 files /4,349 tests. Preserve prior44 offline document passes plus the new meeting-sheet case across three audiences; no report layout/content change is introduced by this security/test follow-up. Candidate fingerprint `aada1bd6b4887a4df136d81c2341dcf7a36047e7c2edda0f506d76cc5f9db73f`,1,183 files. TypeScript passes; exact-head automatic checks must complete before requesting any new staging release authorization.
- [ ] Both stable staging sites remain approved51df6118; the pending meeting-sheet spacing and dependency patch are not deployed. Overall report length/density, live saved-report/history/export, native print, retained Lovable optional-return observation and all production readiness/TF-01–TF-26 gates remain open. Parent Pilot/Pathway Snapshot stays deferred. No production/main merge, deployment/publication, migration, records, provider calls, account/access, payment or secrets changes.

Evidence: `/private/tmp/tf211-security-reader` (unchanged-reader timing baseline, targeted install/audit, frozen install, full unit log and candidate manifest), plus `/private/tmp/tf211-report-density` (retained failing CI logs and local document/PDF evidence).

## Compact Meeting Sheet — Local Candidate, October 22, 2026

- [x] Tighten checklist item spacing and the outer gaps around report callouts, checklists and source notes in both screen reading and export. Keep existing section/column geometry, text size, line height, wording and source/question grouping. Only the shared report stylesheet changes at runtime; dashboard cards and other page layouts are unaffected.
- [x] Assess the shared report presentation used by applicable Student/Family/Educator demo, saved and fixed-share readers. The existing44 offline document cases all pass in one run, including role visibility, long questions/source grouping, headings/margins and saved-route print shells. A separate new full-report PDF regression passes across all three document audiences: the prepared questions and all three short follow-up actions share the meeting sheet. TypeScript passes. These are offline presentation checks, not hosted authentication or live-record acceptance.
- [x] Compare six otherwise identical fictional fixture PDFs: before, final follow-up lands on page9 while questions are on page8; after, all fit on page8 for Family/Educator/Student. All extracted content tokens are retained, typography stays14px with20.3px line height, and no blank pages or missing closing text appear. Visually inspect the revised meeting and closing pages. The two broader column-layout trials were discarded because they did not improve pagination; they are not in this candidate.
- [ ] Overall length remains open: comparable fixture outputs remain30 pages; the last hosted app outputs remain31 pages. Do not claim a reduced full-report page count or equate fixture and app pagination. Candidate fingerprint `a4a807a3b90f822047d3a14d5aac32a5e663f8ea8adc95eac33c8058be53c472`,1,183 files. Automatic review and any new staging release/publication remain pending separate authorization; both stable staging sites remain verified51df6118.
- [ ] Preserve live saved-report/history/export, native print, older intermittent Lovable optional-return observation, permission/privacy, provider/configuration, security/billing/operations/schema/rollback and TF-01–TF-26 gates. Parent Pilot/Pathway Snapshot remains deferred. No deployment/publication, main merge, production, migration, records, AI/provider calls, account/access, payment or secrets change.

Evidence: `/private/tmp/tf211-report-density` (44-case run plus focused new case, TypeScript, six fixture PDFs, exact text/typography comparison, before/after meeting-page proof and rendered samples). The initial bunx launcher path was unavailable; tests ran successfully through the installed Playwright CLI instead. This tooling failure is not a product failure or a test pass.

## Meeting-Question Release and Hosted Checks Complete — October 22, 2026

- [x] User authorized exact `51df6118e52986dcfc9e6e49fd44914404d5be1a` for staging-only deployment, isolated Lovable sync/existing publication and read-only report checks. Human-approved [Cloudflare release39821061775](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39821061775) passes exact source identity and PWA verification.
- [x] Both stable sites now independently serve fingerprint `bf86706808e0501819627aa0e713afa272a5df6a1f6fcdc3a62271e725fa5056`,1,183 files, staging backend, sandbox payments and isolation true. Cloudflare reports exact source SHA51df6118; Lovable now reports its isolated sync commit `3a3a39059d2da05b01595b610c93511d7d534fc3`. That is the isolated repository identity, not the upstream source commit; matching runtime content is established by fingerprint. Preserve earlier dev responses as historical observations.
- [x] Isolated sync changes only three reviewed runtime files; no intervening builder edits, environment changes or dependency changes. Private preview parity was verified before publication. Existing publication confirmed Your website was updated; stable-host health was then independently recorded. Preserve the Your Dashboard Widgets builder edit.
- [x] Human-approved [read-only report check39821798006](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39821798006) passes all seven existing-role session/fresh-context checks and four public report journeys at390/1440px, Family/Educator origins, one worker and retries0. Audience/edition/URL, Builder return, Back/Forward, direct Student URL, reload and optional-details round trip remain asserted. This does not establish every role feature or live saved-record acceptance.
- [x] Retain sanitized artifact12444779859 only. Independently decode its four successful journey results and parse three fictional hosted PDFs:31 pages each, no blank pages, complete endings, five meeting questions each printed exactly once. Final question/source grouping also passes the hosted assertion. Visually inspect the Family meeting page, Student closing page and Educator first page; watermark remains top-right and headings/text are readable. These samples do not mean all93 pages or the native OS print dialog were visually verified.
- [ ] Overall length/density remains open: the31-page app output did not shrink. Keep live saved-report/history/export, native print, prior intermittent manual Lovable optional-return observation, permission/privacy, provider/configuration, security/billing/operations/schema/rollback and full TF-01–TF-26 gates open. Cloudflare's passing optional-return journeys do not retroactively resolve the older Lovable observation. Deferred Parent Pilot/Pathway Snapshot remains recorded.

Evidence: `/private/tmp/tf211-report-concision` (release/test approvals and logs, exact stable-health parity, unchanged environment hashes, publication screenshots, sanitized reader results, PDF text/page checks and rendered visual samples). No production/source-main merge, migrations, fixtures/records, AI/provider calls, account/access, payment or manual secrets changes. Earlier checkpoints below remain historical evidence.

## Meeting Questions Consolidated — Local Candidate, October 22, 2026

- [x] Reproduce12 failures against the deployed reader/helper/sample data through an isolated baseline loader; the final corrected question tests pass. Legacy reports now show the complete family/toolkit question union once in the meeting-prep chapter; Bring To The Team links back to that real destination instead of printing the same list again. A legacy report without a toolkit still has the reachable chapter. All distinct recorded requests and first-occurrence wording/order remain; only exact repeats differing in whitespace collapse.
- [x] Reconcile the two fictional source arrays for Maya (five questions) and Jordan (six). Keep spring timing, real volunteer-site context, age18/DDS, weekly measurement across classes, transportation and executive-function support details. No fuzzy/AI semantic merging is applied to real records. Newer reports retain their audience-filtered question records/context; their closing section already linked to the question chapter.
- [x] Assess demo, saved and fixed-share readers for Student/Family/Educator where applicable. Actual share-projection fixtures remain inside existing schema limits; no validation or access rule is weakened. The first expanded shared fixtures exceeded those limits and were corrected, not accepted as production data. Screen-only Add to Actions controls intentionally reuse recorded questions and remain functional/no-print; document-body duplication is checked separately.
- [x] Local validation:308 unit files /4,349 tests and TypeScript pass. The document browser run passes43/44; its remaining test initially counted the intentional no-print action controls. Correct that document-specific assertion and rerun the focused saved-shell case successfully across Family/Educator/Student, retaining exact one-copy print checks and earlier alignment/source-grouping assertions. These are43 full-run passes plus one focused pass, not a claimed single all-green44-case run.
- [x] All four actual local anonymous reader journeys pass without retries at390/1440px; existing one-click audience, Builder context, Back/Forward, direct-link, reload and optional-details assertions stay intact. The strengthened PDF assertion verifies five sample questions printed exactly once. Measured PDF extraction wraps Pre-Employment at its hyphen; comparison ignores that layout-only space while preserving all words/hyphens and the exact occurrence count. Three local app PDFs retain31 pages, no blanks and complete closing text.
- [x] Compare six fictional full-reader fixture PDFs with the same fonts/margins: baseline and candidate remain30 pages per audience in that renderer. Candidate sample text is59 words shorter, from removed repetition and reconciled fictional phrasing, with the same14px/10.5pt question text and20.3px line height. Visually review changed meeting/summary and closing pages; no global layout or text-size change. Do not declare overall report length solved or compare the fixture30-page count with hosted31-page output as a reduction.
- [ ] Complete automatic candidate checks and review before requesting any new staging release authorization. Candidate runtime fingerprintbf86706808e0501819627aa0e713afa272a5df6a1f6fcdc3a62271e725fa5056 /1,183 files. Both stable staging sites remain authorized e32de48b /31325193…0c7a51; no new release, hosted acceptance, records or provider calls.
- [ ] Keep overall report length/density and broader live saved-report/history/export, permission/privacy, provider/configuration, security/billing/operations/schema/rollback and TF-01–TF-26 gates open. Preserve the passing4-journey hosted e32de48b audit, prior failed runs and unresolved manual Lovable optional-return observation. Deferred Parent Pilot/Pathway Snapshot retained.

Evidence: `/private/tmp/tf211-report-concision` (baseline/corrected tests, six-PDF comparison, typography/text/page measures, actual local four-case/three-PDF reader check, rendered changed pages). PDF skill used for creation/render/text/visual verification. No production/source-main merge, deployments/publications, migrations, fixtures/records, AI/provider calls, account/access, payment or manual secrets changes.

## Hosted Report Audience and PDF Checks Pass — October 22, 2026

- [x] Human-approved [run39807614502](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39807614502) passes on verified e32de48b runtime: all seven existing role sessions, including District, verify in fresh contexts; then four anonymous prepared-report journeys pass at390/1440px, Family/Educator origins, one worker, retries0. Single-click Family/Educator/Student selection agrees with edition and URL, preserves eligible Builder return, and passes Back/Forward, refresh, direct Student URL and optional-details round trip. This is bounded public-report acceptance, not every role feature or live saved-record acceptance.
- [x] Three hosted fictional PDFs (Family, Educator, Student) are retained and independently parsed:31 pages each, complete closing section and no blank pages. Each unique final source note appears once on page30 with its final question. Visual review of first page, closing page and final question/source grouping shows readable text and the first-page top-right watermark. Do not claim all93 pages were visually audited, native OS print-dialog acceptance or compactness from text checks.
- [x] Both stable staging sites remain matching fingerprint3132519370437cfa45c3ac8490335ac0db30b20f28805687d3ade9190c0c7a51 /1,183 files, staging backend, sandbox payments and isolation true. Source application e32de48b; displayed audit commit9090e6b2 changes tests/docs only. Isolated Lovable sync5c9ddfa is published; its hosted Git field remains dev and uses the approved fingerprint proof.
- [x] Preserve failed run39806084356 (reports never ran) and successful corrected setup run separately. Removing the repeated test navigation is verified by the passing fresh-context role preflight; the earlier React418 cause is not established as a production defect or definitively fixed. Sanitized artifact12438796681 uploaded successfully; no session-state artifacts were retrieved.
- [ ] Keep the earlier isolated-Lovable manual optional-return observation open: first click did not complete, second returned correctly, and the following attempt was interrupted by tab ownership changing. Cloudflare's four independent optional round trips pass; they do not retroactively turn that Lovable observation into a pass or diagnose its cause.
- [ ] Next document-content pass: the31-page prepared sample still needs length/density review, and its last meeting-question list contains overlapping BRS, travel-training, employment and DDS questions. Consolidate only where distinct details/source meaning are preserved; assess shared/demo/saved/fixed-share readers and every applicable audience. These are content-quality follow-ups, not failures of the four current navigation journeys or authorization to release another change.
- [ ] Preserve broader live saved-report/history/export, permission/privacy, provider/configuration, security/billing/operations/schema/rollback, full TF-01–TF-26 and deferred Parent Pilot/Pathway Snapshot gates. No production/source-main merge, migrations, fixtures/records, AI/provider calls, account/access, payment or manual secrets changes.

Evidence: `/private/tmp/tf211-reader-lens-review` (human approvals, successful/failing logs, sanitized report, decoded journey attachments, three hosted PDFs, page30 source proof, rendered visual samples, stable publication parity). The PDF skill's inspection workflow is used for rendered/text evidence; headless export is distinct from the native print dialog.

## Report Audience Fix Released to Both Staging Sites; Hosted Acceptance Pending — October 22, 2026

- [x] User authorized exact `e32de48b362d73b553c837ebf6df12de474a919f` for staging-only release, isolated Lovable sync/existing publication and read-only report checks. Human-approved Cloudflare [release39805424174](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39805424174) passes exact deployed identity and PWA verification. Workflow-recorded public health confirms runtime `3132519370437cfa45c3ac8490335ac0db30b20f28805687d3ade9190c0c7a51`,1,183 files, exact source SHA, staging backend, sandbox payments and isolation true. The first propagation attempt still served a736e42e; the second matched. A separate local HTTP request received403; use the retained successful workflow response rather than claiming that local request succeeded.
- [x] Isolated Lovable sync `5c9ddfaab2014349be55bce30ef8986ead1c2a00` changes only three reviewed runtime files. No intervening builder edits were present; environment hashes stayed unchanged, frozen install made no changes and fingerprints match before/after install. Private hosted preview now independently serves the approved fingerprint/1,183 files. Its `dev` SHA/private-host isolation errors remain expected; no authentic hosted Git SHA is invented.
- [x] Existing isolated publication now confirms “Your website was updated”; stable gentle-forward-reach health matches the exact fingerprint/1,183 files, staging backend, sandbox payments and isolation true. Lovable still reports dev; its approved fingerprint identity is verified, not an authentic hosted Git SHA. Production/source-main and access settings remain unchanged.
- [ ] Human-approved [report check39806084356](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39806084356) fails before the four report cases run. Exact deployed identity passes; six existing-account sign-ins pass, District times out during the setup's final repeated document navigation (ERR_ABORTED, React418, no readable body at failure). Preserve this failed run and sanitized artifact. Do not classify unrun reports as passes or claim the hydration cause is resolved.
- [x] Prepare a test-only correction that preserves an existing canonical dashboard arrival and its organization query rather than issuing that last redundant document reload. All seven roles, dashboard assertions, independent fresh-context reload/session verification, no-write policy, exact deployed identity and artifact sanitization remain required.25 focused policy cases,34 readiness contracts and TypeScript pass. Runtime remains exact e32de48b; hosted confirmation is still required.
- [ ] Stable Lovable manual1214px checks verify Family→Educator→Student→Family, URL/edition/Builder context, Back/Forward and direct Student/refresh with no report-root overflow. One optional-details return stayed on details before deadline; a second click returned correctly. A subsequent fresh attempt was interrupted by tab ownership changing. Preserve this incomplete/intermittent manual observation, not a single-click optional-return pass or a proven product cause. Native print-dialog acceptance remains open.
- [ ] Retain broader saved-report/live-record, permission/privacy, provider/configuration, security/billing/operations/schema/rollback and full TF-01–TF-26 gates. Local4 browser/3PDF,4,337 unit and44 offline document passes remain bounded evidence. Earlier failures,32 prior navigation passes and deferred Parent Pilot/Pathway Snapshot remain recorded.

Evidence: `/private/tmp/tf211-reader-lens-review` (candidate/archive parity, human release review, deployment log/health, unchanged environment hashes, private preview health, publication-start screenshot and pending report-check review). No migrations, report fixtures/records, AI/provider calls, account/access, payment or manual secrets changes; no source-main merge or production actions.

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
