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

## Verified Review-Draft Order

The 225 canonical migrations and 41 prior control drafts remain separate from these nine drafts. The pre-existing 15-migration rollout batch remains separately tracked; it must not be double-counted as new canonical files. No new canonical filename, ledger entry or target installation is introduced here.

1. Retire the legacy admin document override — `document-admin-grant-retirement/retire-admin-document-grants.review.sql`.
2. Bind document grants to their actual parent — `document-permission-parent/bind-document-permission-parent.review.sql`.
3. Restrict original-file grant scope — `document-original-access/restrict-original-file-grants.review.sql`.
4. Expose reviewed-only document summaries — `document-summary-scope/separate-reviewed-summary-access.review.sql`.
5. Permanently retire document grants after final access loss — `document-grant-lifecycle/retire-document-grants.review.sql`.
6. Contain legacy visibility and unsafe raw deletion — `document-legacy-privacy/restrict-legacy-document-visibility.review.sql`.
7. Save rights reviews atomically — `rights-status-consistency/atomic-rights-review.review.sql`.
8. Guard shared roadmap and personal goal progress — `progress-access-consistency/guard-progress-access.review.sql`.
9. Guard Student Voice answers — `student-voice-consistency/guard-student-voice.review.sql`.

Paths above are relative to `docs/database-proposals/`. Their tested order and hashes are collected from the fresh disposable installation. The packaging collector snapshots the routine catalog **after the 225 + 41 baseline and before the first separate draft**, preserves all 56 original installer/catalog stage scripts, runs all existing separate-draft verifiers, then captures the final catalog.

## Workstream 4.1 Packaging Gates

- [x] Preserve the nine source/disposable-verified drafts and their tested order.
- [x] Prepare a dedicated fake-credential disposable-only collector for owners, security modes, search paths, effective execution grants and body/definition hashes.
- [x] Verify and retain its fresh before/after catalog: 24 additions, three reviewed existing-helper changes, no removed or unrelated changed routines. The fresh run preserves all 56 original stages, all nine draft hashes and 272 unchanged routines. [Verified package evidence](../evidence/planning-release-package-verified-2026-11-16.json); [proposed routine catalogue](../evidence/planning-release-package-catalog-2026-11-16.json).
- [ ] Review the captured catalog and routine inventory for the final release. Capturing metadata does not grant routine approval.
- [ ] Promote the final reviewed chain to canonical files and exact ledger records after prerequisites/installation-state review. Do not blindly rerun partially installed drafts.
- [ ] Finish the current target legacy/consent/creator/prompt/retention and unfinished-work impact review under 4.2/5.4, with separately authorized target access.
- [ ] Freeze exact application, separate worker, schema, ledger and environment identities; complete ordered pause/drain/cutover and rollback procedures.
- [ ] Run final combined package regression and the authorized coordinated staging release/acceptance before considering production.

Hosted/provider acceptance remains under Workstreams 3/7. Staging rollout and main/production remain under 6/8 and separate authorization. The previous broader regression results are retained historical evidence; the package catalog run does not claim to rerun all earlier native regression cases.
