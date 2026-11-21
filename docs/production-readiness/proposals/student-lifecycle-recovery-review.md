# Creation Recovery and Student Deletion — Review Draft 16

## Completed Source Components

- [x] Minimal durable lifecycle receipts: original owner, student UUID and timestamps only. Creation receipts commit or roll back with the existing caller-RLS setup transaction; no student fields or documents are copied.
- [x] Permanent deletion tombstones prevent the same student UUID being recreated through setup or raw inserts. Student ID changes cannot bypass the reservation. Existing profiles acquire a tombstone on deletion; historical deletions before installation cannot be reconstructed.
- [x] Account-bound outcome read distinguishes **present**, **removed**, and **unconfirmed**. Other accounts receive no existence signal. Ownership changes permanently retire recovery visibility, including after re-addition or deletion. A present identity is not a claim that all original setup fields are unchanged or that onboarding finished.
- [x] Replace the document/student cascade with a restrictive foreign key. This closes a route around paused permanent document deletion that could discard metadata while leaving files behind. No bytes, jobs or restrictive operation records are deleted.
- [x] Add a restrictive student reference for meetings, preserving meeting notes and children until coordinated cleanup is reviewed. The constraint is initially NOT VALID so existing orphaned meetings are not silently removed; it enforces new references/deletions immediately.
- [x] Recognize both foreign-key and RESTRICT error codes in the existing plain-language removal explanation.

## Still Required Before Completion

- [x] Source/local integration: persist the browser request identity across refresh/account changes and wire explicit reconciliation into both Add Student and onboarding. Do not store private form text in browser recovery storage. A new request after an uncertain response must remain blocked.
- [x] Source/local integration: reconcile canonical student self-profile setup separately; its request UUID is not the returned student UUID. Do not apply the non-self lookup to it.
- [x] Source/local integration: resolve onboarding completion after a confirmed existing profile without recreating that profile. Re-read current authorized data; do not replay original fields onto it.
- [ ] Design approved document/storage/provider cleanup and its failure recovery. The new restrict safeguards prevent unsafe deletion; they do **not** perform cleanup. Archived documents still block deletion.
- [ ] Review remaining soft references and retained reports/intakes/licenses. No cascade or guard should be bypassed to force removal. Preserve the existing 143-edge inventory as historical evidence, not an updated deletion forecast.
- [ ] Decide lifecycle-receipt retention during account erasure. Minimal original-owner identifiers remain after student deletion; no claim of complete personal-data erasure.
- [x] Native/disposable full-schema verification: 43 local and47 native cases, including observed concurrent deletion commit/rollback and cross-account non-blocking; full225+41+16 replay passes.
- [ ] Reviewed canonical packaging and separately authorized staging rollout/acceptance. Production and PR merge remain separate gates.

## Validation Boundary

The new SQL is a **separate review draft**, not a canonical or hosted migration. Disposable tests cover old atomic-setup cases plus lost replies, rollback, tombstones, raw-ID reuse, ownership changes, privilege restrictions, document/meeting blockers and native concurrent deletion outcome reads. Full-schema replay retains the preceding fifteen drafts and records remaining student-ID soft references. Verification results are recorded separately; preparing a workflow is not a passing result.

The current UI still has its existing in-session uncertainty guard. This batch does not claim cross-refresh UI recovery or complete student cleanup. No hosted records, AI calls, publication, deployment, merge or production changes are authorized by this draft.

Verified final source: `613d9045`, exact push run44947295433, attempt1. All6,915 unit tests/409 files,50 focused receipt tests,51 readiness/role contracts,72 release/security contracts, TypeScript and the environment-file-free staging build pass. [Evidence](../evidence/student-lifecycle-verified-2026-11-21.json) · [remaining soft references](../evidence/student-lifecycle-soft-references-2026-11-21.json).

## Deletion Follow-Through Inventory

The full-schema check identified thirteen UUID `student_id` columns without student foreign keys after this draft: the new lifecycle receipt is intentionally retained; these **twelve existing tables** still need explicit handling. This inventory supplements the foreign-key inventory and does not authorize deletion.

| Remaining records | Required closure |
| --- | --- |
| `document_apply_completion_receipts`, `document_registration_completion_receipts`, `document_summary_completion_receipts`, `document_summary_operation_bindings`, `document_upload_operation_bindings` | Reconcile active/uncertain work and exact source identities; apply reviewed retention/cleanup without freeing unresolved capacity or losing receipts. |
| `feed_events`, `in_app_notifications` | Define exact student-scoped removal/redaction and verify no unrelated activity or notifications change. |
| `form_responses`, `ppt_meeting_preps`, `student_voice_responses` | Establish treatment of saved private content and verify access plus exact cleanup/retention. |
| `message_threads` | Preserve the separate explicit chat-history retention choice; student deletion must not silently decide it. |
| `student_saved_partners` | Remove only the student's saved associations; retain shared partner directory records. |

Meeting records now have a restrictive reference; existing orphan meetings require a separate read-only inventory before constraint validation. None of these rows were read or changed on staging or production.

Application integration and scoped verification are tracked in [Add Student/onboarding recovery](student-creation-ui-recovery-review.md); hosted acceptance and unresolved-outcome handling remain separate.
