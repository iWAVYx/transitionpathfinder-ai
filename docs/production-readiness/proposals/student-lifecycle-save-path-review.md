# Student Lifecycle and Remaining Save Paths — November 21

## Source Components Completed

- Recommendation-to-action creation delegates to the existing exact-receipt, held-authority planning RPC; the legacy status endpoint delegates to the atomic action/activity/report-marker RPC with required student and loaded revision. Neither falls back to raw writes or retries.
- Student self-profile replies must identify the actual authenticated student. Account mismatch fails before database work.
- Non-self creation stops on unavailable/mismatched account details rather than assuming Parent. The requested UUID, student owner and every supplied profile field must match the saved row. Creator relationship inserts now inspect returned errors and exact actor/student/field identity. Optional license attachment accepts literal true/false only (false means no reserved seat). Missing/contradictory replies cannot produce a success result.
- Student deletion includes exact student, authenticated owner and loaded revision predicates and requires an actual returned deleted row. Zero-row, stale and contradictory responses fail. Existing RLS and cascades are unchanged. Non-owners do not see enabled delete controls.
- Student-list and onboarding submissions fence departed contexts and repeated/uncertain writes. Student-list read failures are visible, not displayed as an empty list. Recommendation controls serialize writes and stop after uncertainty.

## Still Open — Do Not Mark P1 Complete

- Non-self creation remains several caller-RLS requests. Student insertion, creator relationship and license attachment are **not atomic**; partial setup requires reconciliation. There is no persistent idempotency or cross-refresh duplicate guarantee. The current uncertainty message and blocked in-session repeat do not solve recovery after refresh.
- Student deletion proves the exact row receipt only. Cascade inventory, linked storage/provider cleanup, competing updates to dependent records and full role/permission review remain required before lifecycle release acceptance.
- The meeting/channel conversion writers, bulk extracted-goal save and trusted seed paths require composed transaction review; routing several writes through individual RPCs would not make them one transaction.
- Recommendation calendar/meeting-prep writers retain caller-RLS implementations; the account-intent guard does not establish transaction-held authority. Their exact receipts and linked side effects remain open.
- Student list shape/capability review, onboarding recovery and BridgeForward remain P1 work. P2 notes/history, P3 membership/sharing and P4 drafts remain open.

No new SQL draft, canonical migration, hosted change, provider call or fixture run is included. The existing thirteen separate SQL drafts and their historical evidence are unchanged. Local tests prove the listed application contracts only; hosted acceptance and final release authorization remain separate.

## Local Validation

The five focused suites pass 72 cases, including actual Student-page ownership controls, unavailable-list feedback, uncertain deletion repeat blocking and departed-account replies. The complete collected suite passes 6,833 tests across 406 files; the five newly added component cases are included in the 72-case focused run. TypeScript, 51 readiness/inventory/role contracts and the environment-file-free staging build pass. Source and build-copy fingerprints match across 1,252 files. [Evidence](../evidence/student-lifecycle-save-paths-local-2026-11-21.json). No native SQL rerun is claimed because this batch adds or changes no SQL.
