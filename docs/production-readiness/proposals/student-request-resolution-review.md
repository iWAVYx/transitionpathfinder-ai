# Unknown Creation Outcomes and Student Cleanup — November 21

## Completed Source Components

- [x] A linked-student request can be explicitly closed on the server. Closing reserves its old UUID permanently without deleting a saved student. Creation and closure compete for the same unique lifecycle record: a committed creation is preserved; a closure that wins prevents delayed creation. Closure itself is repeatable after a lost response.
- [x] Add Student and Family/Educator onboarding offer **Close This Setup Request** only after a missing/removed outcome is checked. The browser marker is cleared only after an exact actor/request-bound `closed` response. A committed profile instead returns to normal reconciliation. No automatic creation or onboarding completion follows closure.
- [x] The existing two-tab lock, account guard and exact-marker comparison also cover closure. Lost/contradictory replies keep the request saved. Student self-profile requests never use the unrelated linked-request UUID closure.
- [x] Student deletion now transactionally cleans exactly three student-scoped categories: `feed_events`, `in_app_notifications` and `student_saved_partners`. Real foreign keys also prevent new orphan writes and hold concurrent parent deletion. Other students' rows and shared partner directory entries are preserved.
- [x] Nine remaining soft-reference categories now block unsafe student deletion: five document-processing receipt/binding tables, saved form responses, PPT preparation, Student Voice and message threads. No unresolved capacity/source receipt is removed.
- [x] Existing `channels` and `student_channel_removals` student cascades become restrictive. Student removal cannot silently erase channel messages, attachments, history grants or recorded history-retention choices. Retention policy itself is unchanged; its cleanup workflow remains open.
- [x] Deletion confirmation names the actual cleanup categories. Recognized blockers use plain language for documents, saved planning content, meetings and conversation retention; raw database details are not shown.

## Remaining Checklist

- [ ] Student self-profile unknown outcomes need their own account-bound resolution protocol. No ensuring/recreation call is used as a read or as proof of absence.
- [ ] Legacy/untracked or ownership-retired identities remain unconfirmed. Closing does not claim authority over another person's profile or revive retired visibility.
- [ ] Browser-cleared and cross-device/origin intent recovery remains separate from this same-browser workflow.
- [ ] Safe storage/provider deletion, document-job reconciliation and retention handling for the nine guarded categories remain open. Guards prevent loss; they are not complete cleanup.
- [ ] Explicit conversation cleanup must honor the user's chosen chat-history retention. This batch intentionally does not select that choice automatically.
- [ ] Existing orphan rows need a read-only inventory and an approved disposition before validating the new `NOT VALID` foreign keys. New writes/deletes are enforced immediately; no historical rows are silently swept.
- [ ] Draft17 canonical packaging, separately authorized staging migration/release/acceptance, PR merge and production rollout remain open.

## Evidence Boundary

Draft17 follows the unchanged first sixteen review drafts. It adds no table-level grants or broad Owner/admin access. Actual deletion still requires the existing owned, loaded-version application predicate and caller RLS. Native/full-schema evidence is recorded separately after exact-source verification. No hosted migration, records, AI, publication, payment, secret or production changes occurred.

Verified SQL source: `ceb9e989`, exact push run44955869841, attempt1. **80 local and91 native cases** and the complete **225+41+17-draft** replay pass. Native cases observe both creation/closure races and parent-delete/child-write waits. Actual Parent/Educator full-schema cleanup preserves the other student's records and shared partner directory. All297 original SQL identities independently match.

Application verification: **6,985 unit tests /413 files**, **125 final focused tests**, **51 readiness/role contracts**, **72 release/security contracts**, TypeScript, the isolated browser lock check and the environment-file-free staging build pass. [Combined evidence](../evidence/student-request-resolution-2026-11-21.json).
