# Report Access Release Review — October 22, 2026

## October 24 — Indirect Student Access Follow-Up Prepared, Not Applied

- [x] Reproduced three indirect gaps locally after the earlier restrictive report policies: unlinked admin student takeover, editor report takeover surviving removal, and admin viewer self-promotion through the consent guard. The prior report restriction is still useful; it does not close these indirect paths by itself.
- [x] Prepared additive `20261024010000_remove_implicit_admin_student_access.sql`: require actual student access in both canonical helpers and pin ordinary API ownership/identity fields. Preserve real viewer/editor consent paths, permitted content edits with truthful history, authorized owner report linking, internal maintenance and separate website management. Owner Hub remains management-only.
- [x] Disposable SQL: 65 pass, two native concurrency skips; 45 release/security contracts, 4,439 Node unit tests and TypeScript pass. Native [replay40102467169](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/40102467169) on `6937b4fa` passes all 67 report/history cases with zero skips, all 207 migrations and 93 privileged routines. Historical baseline reproductions remain explicit, not accepted post-fix behavior.
- [ ] Obtain new authorization for this one staging migration plus one bounded no-AI acceptance run: seven existing sign-ins, at most one fictional student/intake/report, two temporary relationships and three history snapshots, followed by exact cleanup and independent privileged zero-count verification. No new accounts, shares or PDFs. No fixtures have run.
- [ ] The database correction alone is runtime-neutral. However, both clean-build checks discovered high-severity Undici advisory GHSA-xjj6-f33q-929c. Updated only the existing 7.29.1 security pin to patched 7.30.1 and its lock entry; frozen install and high/critical audit pass (12 below threshold remain). Candidate fingerprint is now `a91b789b…8cc289` /1,184 files, so the final authorization must also include staging builds/sync/publication. Final patched-candidate checks remain pending. No hosted migration, production/main merge, AI, payment or secret change occurred. Thirteen migrations are pending against saved September 17 production evidence, not a fresh production read.

See [follow-up evidence](evidence/student-access-boundary-followup-2026-10-24.json). Native/hosted acceptance and broader production gates remain open. Full TF-01–TF-26 is retained; report polish and Parent Pilot/Pathway Snapshot remain deferred.

## October 23 — Authorized History Repeat Passed; Exact Cleanup Confirmed

- [x] Human-approved repeat39980508504 on test-only d44620fb passed all seven existing role sessions and both Family/Educator report journeys, with zero retries/AI. Both stable staging identities passed before fixture creation.
- [x] Exactly two fictional intake/report pairs and six truthful prior-content versions were created. Actual RPC save, direct owner edit/actor attribution, UI restore/reload, denied fabricated/altered/deleted history, other-role read/write/RPC boundaries, Owner/admin nonowner Restore/Regenerate hiding, and two PDF exports passed. Existing admin SELECT was observed, not removed or expanded. No new users, relationships, sharing grants or links.
- [x] Caller cleanup passed. Independent postgres BEGIN READ ONLY exact-ID counts at16:57:47UTC confirm zero reports, intakes, versions and share links remain; table-owner/no-FORCE-RLS guards prevent a misleading RLS-filtered count.
- [x] Sanitizer passed before artifact retrieval. Both PDF exports retain the restored summary on page2, no empty pages/out-of-page text, the complete meeting sheet/source note on page8 and complete endings. All64 pages were reviewed as contact-sheet overviews; selected meeting/final pages were inspected at full resolution with top-right logo marks and aligned sections. This is not all-text proofreading or native-print acceptance.
- [ ] Report density remains32pages per sample. Compactness/native printing, hosted linked-editor acceptance, Owner/admin planning-data policy, stale browser intent, metadata/retention/bearer lifecycle and broader role/provider/security/operations production gates remain open.

[Passing repeat evidence](evidence/report-history-repeat-acceptance-2026-10-23.json) retains the exact source, fixtures, PDF hashes and independent cleanup. The earlier five-second empty-shell failure remains recorded separately; the strict loaded-report wait allowed both journeys to pass, but this does not certify global route-loading performance. Browser dependency downloads delayed the run; GitHub completed it successfully in14m9s. A stale live display/read-only command approval timeout delayed observation, not execution, and no workflow rerun was issued. No app deployment, migration, publication or production change occurred in the repeat. Both approved staging publications retain5ba40cce…ad43b58c/1,184 files. The named staging-history gate is closed; production remains NO-GO. All TF-01–TF-26/full-roadmap work and deferred Parent Pilot/Pathway Snapshot remain retained.


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


Reviewed source: `202dc28c058f41f5ed738f7ee9cb8d3476223a7d`, application `eb72bd87f287eeea86c6540616b66f5ec48a1346`. This is a checked-in policy/caller review, not an inspection of production or a current hosted grant inventory. No database, account, sharing link, provider or application record was changed.

## Additive Canonical Candidate Prepared — October 23, 2026

The [staging packet](share-token-staging-acceptance-packet.md#canonical-candidate-finalized--october-23-2026) now pins `20261023010000_restrict_report_share_token_writes.sql`, requiring the separately reviewed server-only RPC grants before token restriction. Twenty-three local SQL cases pass, including exact proposal equality and the missing-prerequisite abort; disposable native PostgreSQL CI is wired but pending. No migration was applied. The mixed broad Node entry point is explicitly not accepted because protected-suite credentials/loader prerequisites are absent; 19 scoped source contracts pass. Full runtime unit/TypeScript evidence is unchanged. Production's saved-baseline pending count is now ten, not a fresh production inventory.

## Actual Staging Catalog Confirmed — October 23, 2026

Read-only inspection of the signed-in isolated target confirms authenticated UPDATE on every token column, creator-only UPDATE policy, and authenticated token DELETE. Both raw resolver/tracking RPCs also remain executable by anonymous/authenticated roles; `20261006180000` is absent from the selected ledger. This is an additional confirmed staging prerequisite gap, not merely a source finding. No real report/link or mutation was used. [Evidence and revised two-step plan](share-token-staging-acceptance-packet.md#read-only-isolated-staging-preflight-completed--october-23-2026). Do not infer production state or canonical hash alignment from this metadata query. Raw grants and write restrictions need separately reviewed/authorized migrations; the production blocker remains open.

## Compatibility Packet Prepared — October 22, 2026

[The staging packet](share-token-staging-acceptance-packet.md) records the caller matrix, exact proposal/preflight hashes, uncommitted source identity, ordered catalog/migration/release gates, bounded fixture/cleanup plan and fail-closed rollback criteria. No token edit/delete/reactivation product caller was found. The SQL proposal now adds a restrictive policy so other permissive policies cannot bypass creator-only one-way revocation, and checks RLS/client-role assumptions. Twenty in-memory SQL cases pass, including preflight execution, extra permissive policies, preserved service tracking/maintenance and disabled-RLS abort. The preceding 16-case result is historical; runtime remains unchanged since its full 4,363-unit/TypeScript validation. No canonical migration or hosted approval/execution is implied.

## Local Reproduction and Candidate — October 22, 2026

- [x] Reproduce the canonical policy issue in credential-free PGlite 0.5.8: an authenticated issuer changes its existing token to a foreign fictional report, and the service-only resolver returns that foreign report. Actual table grants, RLS and canonical resolver SQL execute inside the in-memory database. Student-access and admin helpers are fixture stubs returning false; this does not certify the full hosted schema or all roles.
- [x] Prepare [the review-only SQL restriction](proposals/share-token-write-restriction.sql), outside the canonical migration tree. It revokes client table/column UPDATE and DELETE privileges, permits only authenticated `revoked` updates, requires creator ownership and a true resulting revoked flag, and aborts on unexpected effective inherited/column grants. Service administration and legitimate INSERT policy are preserved. DELETE restriction prevents ordinary issuers deleting and recreating the same link to bypass revocation. Review this availability change explicitly before migration approval.
- [x] Sixteen in-memory database cases pass: baseline reproduction; exact/repeated revoke and fresh resolver denial; nine protected-column denials with unchanged rows; non-issuer/missing IDs; reactivation/deletion denial; allowed creation/foreign creation denial; expiry/anonymous RPC/update denial; inherited-grant abort. No network database URL is accepted, no concurrency case is claimed and no hosted table was touched.
- [x] Implement a shared local `revokeOwnedShareToken` helper for both Students and Trust callers. It filters the exact ID and authenticated creator, requests only `id, revoked`, and requires matching returned ID plus `revoked=true`. Empty/filtered/mismatched responses, database errors and transport failures return friendly generic failure; no privileged fallback or permission expansion.
- [x] Fourteen new actual-handler mocked cases pass across both callers, including repeated revoke, no-row denial, mismatched/false confirmation, sanitized errors and input validation. Initial malformed-ID assertions exposed a synchronous mock-validation mismatch; the mock now matches the asynchronous transport and all cases pass without changing validation.
- [x] Full unit suite: 309 files / 4,363 tests and final TypeScript pass. Fifteen retained source contracts covering share RPC grants, atomic history, authorization defense and hosting boundaries pass. The focused caller/projection/student-list run passes 59 tests. These mocked/source results supplement the 16 database cases; they do not establish hosted grants or browser acceptance.

Run the database fixture with the pinned PGlite runtime installed outside the repository:

```sh
SHARE_POLICY_PGLITE_MODULE=/absolute/path/pglite/dist/index.js node --test tests/database/share-token-write-restriction.test.mjs
```

The application candidate and SQL proposal are local only. The database blocker remains open until a reviewed canonical migration, target-specific preflight/approval, application/grant verification and acceptance are completed. Do not apply this proposal as an ad hoc hosted patch. Actual staging remains eb72bd87; production is unchanged. Other findings below remain open.

## Release Findings

### P1 — Share-token UPDATE permits more than revocation in canonical source

The initial migration `20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql` grants authenticated SELECT/INSERT/UPDATE/DELETE on `share_tokens`. Its UPDATE policy checks only `auth.uid() = created_by`; there is no column restriction or report-access predicate on the updated row. The July migration `20260715152133_8ed7834a-7f65-4ccc-987e-ad11d1ded410.sql` hardens INSERT only. No later share-token UPDATE policy/column-grant replacement was found in canonical migrations.

Consequently, under that canonical policy an issuer can update their own token's report reference, audience, expiry or revoked state, rather than only revoke it. The privileged resolver joins the token's current report reference and checks token expiry/revocation without rechecking issuer access. A retarget to a known foreign report ID could expose its projected document. This is a source-level authorization finding; do not claim exploitation or the same effective grants on any hosted environment without verification. The server-only resolver migration does not repair token-table writes.

Proposed direction for review: retain server-validated creation, but restrict authenticated UPDATE to `revoked` only if no legitimate client requires other token edits; keep service-only administration separate. A reviewed change must also account for existing column grants, inherited roles and intended reactivation semantics. Candidate grant shape, not executable migration authorization:

```sql
REVOKE UPDATE ON TABLE public.share_tokens FROM authenticated;
GRANT UPDATE (revoked) ON public.share_tokens TO authenticated;
```

This sketch alone is not a complete migration: fresh catalog inspection must establish PUBLIC/inherited/column privileges; effective-grant assertions and disposable behavioral tests must prove other columns cannot be updated. A one-way revoke operation would additionally need an explicitly reviewed rule preventing reactivation. Do not apply this snippet to a hosted database.

Required acceptance: issuer revocation succeeds; retarget to a foreign report, audience/token/expiry/creator edits and non-issuer changes fail with unchanged data; authorized creation and public projected reads still work. Test direct authenticated API writes as well as the UI. Verify effective grants and canonical ledger hashes after any separately authorized migration. This is a production release blocker until repaired or the affected surface is safely disabled under accepted scope.

### P1 — Report content/history is not an exclusive transactional write boundary

`20260605050011_dea7210b-36a2-424b-b150-4e85e892dec9.sql` permits report UPDATE for owners, linked editors and admin, while the original table grant permits authenticated UPDATE. Version policies permit eligible report owners to INSERT versions directly. The atomic RPC is SECURITY INVOKER and depends on caller privileges; routing normal handlers through it does not prevent direct table writes or guarantee that all edits create history. The RPC and save/regenerate handlers also deliberately require report ownership, a narrower boundary than direct editor/admin UPDATE.

Required disposition: decide whether direct edits are supported and document the exact integrity guarantee, or design a reviewed database write boundary that preserves intended owner/editor behavior while enforcing transactional history. A simple UPDATE revoke would break the invoker RPC and is not a safe standalone fix. Actual effective permissions and browser/API denial tests remain required. Stale client intent is a separate known limitation: comparison uses the server-observed content, not a client-observed revision.

### P1 scope decision — Management-only Owner UI does not mean data denial

Canonical report/intake SELECT policies include `has_role(..., 'admin')`; student read/edit helpers also include admin. This matches the recent synthetic test observing the Owner/admin SELECT exception. Do not equate the Owner-only navigation shell with a backend prohibition on planning data. Decide and record necessary administrative access, purpose, safeguards and test expectations before changing policies. No automatic removal or widening of Owner access is proposed here.

### Sharing lifecycle and confirmation limits

- Public links are bearer access independent of current collaborator membership. Resolver SQL checks token revocation/expiry, not continuing issuer membership. Removing a collaborator does not itself revoke a previously created public link in this reviewed path. Required release decision: explicit independent-link semantics or coordinated revocation, with actual removed-user tests.
- Share-token SELECT/UPDATE/DELETE policies are creator-scoped. `getStudentAccessOverview` reads with caller RLS; a complete query result is not necessarily every link another collaborator created. Do not label this a universal access inventory without policy/UX reconciliation.
- Both revoke handlers (`students.functions.ts` and `trust.functions.ts`) return success when an UPDATE has no error, without selecting/counting the affected row. A nonexistent or inaccessible token can therefore receive an unconfirmed success response. Confirm exact mutation outcomes before representing revocation as verified; this does not itself grant access.
- A revoked link can prevent future resolution; already downloaded/printed documents and content already delivered cannot be recalled. Test refreshed/new requests separately from previously delivered content.

## Source Permission Matrix

| Actor / surface | Canonical source behavior | Remaining evidence |
| --- | --- | --- |
| Report owner | Read own report; save/regenerate/restore handler requires owner; version reads/inserts additionally require student access when linked. | Student-owned and linked ownership changes, stale intent, actual grants and request limits. |
| Accepted student collaborator / approved relationship | Student helper permits reads; edit helper requires editor or allowed relationship permission. Report SELECT can follow student access. | Viewer/editor/relationship separation and loss-of-access transitions on exact candidate. |
| Linked Student identity | `can_access_student` / `can_edit_student` recognize `student_user_id`. | Does not imply ownership of someone else's report, history or generation rights; test each operation. |
| School / District / Partner | Role label alone is not report ownership or linked-student permission. | Actual organization/student scope, unrelated-account denials and allowed exports. |
| Owner/admin | Canonical admin SELECT and report UPDATE exceptions; normal save RPC still explicit owner only. | Management/data-access decision and direct API tests. |
| Public link viewer | Valid token with family/educator audience; server projects allowed document fields. | Direct RPC denial, token mutation, expiry/revocation, removed issuer and retained-content semantics. |

## Validation Completed

Five existing Node source-contract checks pass across server-only share RPC and atomic-history contracts. Five existing mocked unit files pass 61 tests: share resolver contract, share resolver, audience projection, report-content write and access-overview reader. They cover projection, invalid audiences/content, generic resolver failures, RPC error behavior and counted read completeness. They do not execute PostgreSQL RLS, prove effective table grants or reproduce the retarget finding against a real database. No new fixture run, provider call or production access occurred.

## Next Work and Authorization Boundary

- [x] Complete this source permission inventory and distinguish known staging results from untested database behavior.
- [ ] Prepare/review a disposable-database regression and narrow share-token write hardening proposal, preserving legitimate creation/revocation. Do not edit applied migrations.
- [ ] Resolve report direct-write/history, Owner access and sharing lifecycle decisions as a bounded release scope.
- [ ] Fix and test exact revoke outcome confirmation in both callers with friendly failure language, without changing role access.
- [ ] Obtain separate authorization before any hosted migration, new fixture run, deployment/publication or production action. Fresh production inventory and recovery preparation follow source/scope review.

The full product roadmap and deferred Parent Pilot/Pathway Report Snapshot remain preserved. Both staging applications remain unchanged at eb72bd87.
