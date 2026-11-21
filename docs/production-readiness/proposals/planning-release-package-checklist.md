# Remaining Planning Access and Release Package

This is the bounded source-review checklist under existing Workstreams 4.1, 5.2 and 5.3. It does not authorize a migration, staging publication, main merge or production access.

The selected review covers **52 endpoints in 12 named modules**. Ten have scoped existing verification. The other 42 are grouped into the four batches below; **42 is a review scope, not 42 confirmed bugs or 42 new features**. The inventory records source hashes and rejects new/removed handlers, changed source or missing classifications until re-reviewed. It is not a global call graph or a whole-platform security certificate.

| Batch | Endpoints | Concrete Remaining Work |
| --- | ---: | --- |
| P1 — Student Records and Planning | 24 | Check profile/student access, goal/action creation and mutation, BridgeForward profile/options/fit/snapshot reads and writes, complete loads, exact returned identities, loaded versions and linked-report side effects. Remove false empty/success results and preserve account/student context in consumers. |
| P2 — Confidential Notes and History | 6 | Preserve the existing contributor-specific note restriction; review explicit student proof, account/student changes, safe errors and confirmed note identity. Verify existing history keyset/export guards against current source and retain intentional author/admin semantics for separate privacy review. |
| P3 — Membership and Sharing | 8 | Verify exact loaded member/student/actor identities and confirmed side effects. Retain the chosen chat-history access option and permanently retired report links after removal/re-addition. Recheck cached clients under the final package. |
| P4 — Personal Drafts | 4 | Distinguish unavailable data from no draft, validate saved/removed receipts and loaded revisions, restrict return destinations to safe internal paths, and fence departed accounts. |

Known findings are attached to their source families in [the machine-readable inventory](student-planning-endpoint-inventory.json). Entries requiring review do not all represent newly confirmed vulnerabilities. Existing document/storage/worker/rights/report/PPT, organization, directory, channel, licensing/billing and provider work remains in the full roadmap and its own evidence; this selected inventory does not silently close those scopes.

## P1 Goals and Actions — November 19 Component

- [x] Confirm exact creation/update/deletion replies, actor/student identities and supplied loaded revisions before reporting success; no service fallback or write retries.
- [x] Read all goal/action pages with exact counts; expose unavailable data and current edit capability instead of false empty success.
- [x] Guard the student action panel and family/general/educator action-page replies against departed contexts; preserve read-only controls where current capability is available. Uncertain writes require saved-record refresh.
- [x] Recognize both legacy `complete` and current `completed` values in affected role counters; display legacy teacher actions as Educator without rewriting stored records.
- [x] Prepare the additive tenth review draft for existing/current action values. All 44 local and 44 native constraint cases pass; the full 225 + 41 + ten-draft schema and 35 authenticated value combinations pass. [Scoped evidence](../evidence/planning-goals-actions-verified-2026-11-19.json).
- [ ] Finish transaction-held access and competing/cached/trusted-writer review for remaining action CRUD/goals and other planning paths. The normal RPC components are listed below; raw/trusted paths and broader planning handlers remain separate review scopes.
- [x] Verify the normal-update atomic action/activity/report-marker RPC, current proof held through commit, loaded revisions and access-removal/competing-write races. Separate eleventh draft:39 local/74 native cases,32 observed removal races, two competing updates and a cached recheck pass; full225+41+eleven-draft schema and real linked-report smoke pass. Raw completion writers remain outside this bounded component. [Scoped evidence](../evidence/action-completion-atomicity-verified-2026-11-20.json).
- [x] Require the student and loaded revision on every normal goal-status request, including direct API callers (2026-11-21). This closes the omitted-context validation gap; transaction-held status/creation verification is tracked below.
- [x] Guard the remaining normal action-creation screens: report recommendations, partner suggestions, resources and PPT prep. They share actor/request/student-bound receipts, duplicate-click fencing, departed-reply suppression and uncertainty controls. Resource/partner load failures remain visible; the resource picker uses plain saved-status language. [Scoped source/local evidence](../evidence/planning-action-creators-verified-2026-11-19.json).
- [x] Verify normal goal/action deletion through current-proof, loaded-version, exact deleted-row receipts and commit/rollback removal/competing races. Separate twelfth draft:40 local/106 native cases,56 removal races,eight competing cases,two cached rechecks and full225+41+twelve-draft real-schema verification pass. Existing raw/trusted deletion remains separately open. [Scoped evidence](../evidence/planning-record-delete-verified-2026-11-20.json).
- [ ] Verify the thirteenth draft for normal goal/action creation and goal-status saves: held editing proof, exact receipts, linked-report binding, duplicate/stale rejection, removal/competing/cached races and full-schema integration. Source is prepared; verification is in progress.
- [ ] Finish educator caseload completeness/capability, raw/trusted writers, student/profile handlers and BridgeForward review.

The eight goal/action endpoint entries remain **review-required** until those database and remaining-consumer gates close. P1 as a whole remains open. The tenth draft changes only two CHECK constraints, not RLS, routine grants or existing records. It is separate from the nine-draft routine catalogue below and is not a canonical migration or a hosted change.

## Verified Review-Draft Order

The 225 canonical migrations and 41 prior control drafts remain separate from these thirteen drafts (the thirteenth is still under verification). The pre-existing 15-migration rollout batch remains separately tracked; it must not be double-counted as new canonical files. No new canonical filename, ledger entry or target installation is introduced here.

1. Retire the legacy admin document override — `document-admin-grant-retirement/retire-admin-document-grants.review.sql`.
2. Bind document grants to their actual parent — `document-permission-parent/bind-document-permission-parent.review.sql`.
3. Restrict original-file grant scope — `document-original-access/restrict-original-file-grants.review.sql`.
4. Expose reviewed-only document summaries — `document-summary-scope/separate-reviewed-summary-access.review.sql`.
5. Permanently retire document grants after final access loss — `document-grant-lifecycle/retire-document-grants.review.sql`.
6. Contain legacy visibility and unsafe raw deletion — `document-legacy-privacy/restrict-legacy-document-visibility.review.sql`.
7. Save rights reviews atomically — `rights-status-consistency/atomic-rights-review.review.sql`.
8. Guard shared roadmap and personal goal progress — `progress-access-consistency/guard-progress-access.review.sql`.
9. Guard Student Voice answers — `student-voice-consistency/guard-student-voice.review.sql`.
10. Preserve existing and current action values — `action-item-value-compatibility/allow-current-action-values.review.sql` (two CHECK constraints only; no new or modified routines).
11. Atomic normal action updates — `action-completion-atomicity/atomic-action-update.review.sql` (verified source/disposable component; one authenticated-only RPC and one private timestamp trigger helper).
12. Current-proof normal goal/action deletion — `planning-record-delete/atomic-planning-delete.review.sql` (source/disposable verified; one authenticated-only RPC, no new triggers or changed table grants).

Paths above are relative to `docs/database-proposals/`. Their tested order and hashes are collected from the fresh disposable installation. The packaging collector snapshots the routine catalog **after the 225 + 41 baseline and before the first separate draft**, preserves all 56 original installer/catalog stage scripts, runs all existing separate-draft verifiers, then captures the final catalog.

The first-nine routine catalogue remains scoped historical evidence. The fresh tenth-draft full-schema verifier confirms an unchanged before/after routine/policy/grant/catalog snapshot; the eleventh draft separately verifies its two new routines, one new trigger and unchanged existing catalogue. Final combined canonical packaging remains open.

## Workstream 4.1 Packaging Gates

- [x] Preserve the first nine source/disposable-verified drafts and their tested order.
- [x] Verify the additive tenth value-compatibility draft after that chain, preserving the existing routine/policy/grant catalogue and all action rows.
- [x] Prepare a dedicated fake-credential disposable-only collector for owners, security modes, search paths, effective execution grants and body/definition hashes.
- [x] Verify and retain its fresh before/after catalog: 24 additions, three reviewed existing-helper changes, no removed or unrelated changed routines. The fresh run preserves all 56 original stages, all nine draft hashes and 272 unchanged routines. [Verified package evidence](../evidence/planning-release-package-verified-2026-11-16.json); [proposed routine catalogue](../evidence/planning-release-package-catalog-2026-11-16.json).
- [ ] Review the captured catalog and routine inventory for the final release. Capturing metadata does not grant routine approval.
- [ ] Promote the final reviewed chain to canonical files and exact ledger records after prerequisites/installation-state review. Do not blindly rerun partially installed drafts.
- [ ] Finish the current target legacy/consent/creator/prompt/retention and unfinished-work impact review under 4.2/5.4, with separately authorized target access.
- [ ] Freeze exact application, separate worker, schema, ledger and environment identities; complete ordered pause/drain/cutover and rollback procedures.
- [ ] Run final combined package regression and the authorized coordinated staging release/acceptance before considering production.

Hosted/provider acceptance remains under Workstreams 3/7. Staging rollout and main/production remain under 6/8 and separate authorization. The previous broader regression results are retained historical evidence; the package catalog run does not claim to rerun all earlier native regression cases.

13. Normal goal/action creation and goal-status saves — `planning-record-write/atomic-planning-write.review.sql` (prepared, verification in progress; two authenticated RPCs and a private goal revision helper/trigger).
