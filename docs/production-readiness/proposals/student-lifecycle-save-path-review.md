# Student Lifecycle and Remaining Save Paths — November 21

## Completed Source and Disposable Components

- Student creation now uses `create_student_with_setup`: one SECURITY INVOKER transaction preserves caller RLS while saving the student, creator relationship and optional license attachment. Actual profile metadata is locked through the operation; unavailable profiles cannot become assumed Parent accounts. Student self-setup still uses the existing canonical identity function. A failure in any step rolls back the whole statement.
- The application verifies actor/request/student identity, every supplied field, organization, creator relationship and literal license state. No raw-write fallback, automatic retry or compensation. A duplicate non-self request UUID fails instead of creating another student; this is not persistent cross-refresh recovery.
- The fourteenth **separate review draft** passed 27 local and 28 native cases, including observed competing same-request creation. The complete 225 canonical + 41 prior controls + 14 separate drafts replay passed and preserves the existing catalog. Actual authenticated Parent, Educator and Student setup and owned deletion smoke passed, including creator-relationship cascades. No hosted installation.
- Recommendation action creation and legacy status changes retain their previously verified transaction routes. Recommendation calendar and meeting-preparation saves now require exact returned IDs/content rather than accepting error-free but unconfirmed writes. Preparation targets only a literal upcoming, future meeting for the selected student. Both resource and partner recommendations use the existing valid `follow_up` category; source context stays in the text. Cancelled meetings are excluded.
- Student deletion retains exact owner/revision predicates and a real deleted-row receipt. Its confirmation now says that not every saved report/uploaded file is deleted.
- The complete-schema deletion inventory identifies **143 reachable foreign-key edges**, including **53 direct student references**: 40 cascade, 7 set-null, 5 restrict and 1 no-action. This is a dependency map, not a guarantee that every reachable row is deleted. Native setup smoke verifies only the named creator-relationship cascades.

## Concrete Remaining Work

- Persist/reconcile uncertain creation intent across refreshes and onboarding completion failure. One atomic database statement prevents partial creation; it does not prove delivery of a lost response or prevent a later new UUID from creating a second profile.
- Coordinate student deletion with retained reports/intakes/license allocations, restrictive document-operation references and storage/provider cleanup. Reports/intakes can become unlinked; capacity, upload, rescan and source-binding references can block deletion. Do not bypass those foreign keys. Storage objects and provider assets have no automatic cleanup guarantee from deleting a student.
- Review multi-record meeting completion/promotion, channel mirrors/status, extracted-goal bulk saves and trusted seed writers as composed transactions. No loop of independent RPC calls should be called atomic.
- Calendar/preparation exact receipts are complete; current meeting identity/status held through commit and broader raw-writer authority remain open. Existing RLS remains authoritative; a separate read followed by insert is not a held-parent proof.
- Student-list capability review and BridgeForward remain P1; P2 notes/history, P3 membership/sharing and P4 personal drafts remain open. Workstream 5 is not complete.

## Evidence and Release Boundary

[Full-chain proof](../evidence/student-setup-2026-11-21-full-chain.json), [dependency inventory](../evidence/student-setup-2026-11-21-student-deletion-dependencies.json), [native cases](../evidence/student-setup-native-2026-11-21.tap). CI run 44936149050 passed on attempt 1. It was a pull-request event for head 82d2b617; its synthetic merge source is recorded in the proof. SQL hash and the inherited 297 original SQL identities were independently matched locally; all 56 inherited stage logs are present.

The new application creation route requires the separately reviewed SQL draft before any rollout. Canonical promotion, ledger entries, staging migration/deployment/publication and hosted acceptance require their own authorization. No production/main merge, hosted records, AI/provider calls, payments or secrets changes occurred.

Final application verification: **6,867 unit tests / 407 files**, **101 focused tests**, **51 readiness/inventory/role contracts**, **72 release/security contracts**, TypeScript and the isolated environment-file-free staging build passed. Source and build-copy fingerprints match across 1,252 runtime files. [Combined evidence](../evidence/student-setup-and-recommendation-saves-verified-2026-11-21.json).
