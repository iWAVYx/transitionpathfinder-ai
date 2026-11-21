# Meeting Save and Completion Review — November 21

## Completed Components

- Meeting completion, all currently unpromoted follow-ups, their links and the activity entry now share one transaction. Every returned row is checked; failures roll back rather than silently skipping work. Current explicit editing proof is held through commit using the already-reviewed authority helper. Owner/admin has no implicit private-student exception.
- Completion requires the loaded meeting, student, actor and exact revision, and an upcoming meeting. Repeats/stale completions cannot add another set of tasks or activity. Existing completed follow-ups retain completed status; legacy teacher assignments map to Educator. Existing assignee behavior and report linkage are preserved: this operation creates unassigned, unlinked follow-ups as before.
- Ordinary meeting-field edits are a single conditional caller-RLS update requiring student and loaded revision, with an exact saved-row response. They cannot use `status=completed` to bypass the composed completion operation. This is not a new held-authority RPC for every meeting writer.
- A private revision trigger keeps meeting revisions advancing at microsecond precision. The UI uses confirmed revisions after field saves, serializes its field/completion writes, retains drafts on uncertainty and requires explicit reload before another attempt. Departed meeting/account replies cannot replace the current document or produce success toasts. Pending/uncertain export and profile import controls are disabled.
- Meeting reads now reject failed agenda/question/follow-up requests instead of displaying those failures as empty lists. Large-list pagination remains a separate review scope.
- Student removal now explains actual foreign-key blockers in user-facing terms. It does not expose constraint names or bypass safeguards, and it does not claim complete record/file erasure.

## Database Evidence

Separate **fifteenth review draft**, not a canonical migration. **28 local / 59 native cases** passed, including **28 observed cross-role removal races** (seven authority paths, both orders and commit/rollback), two competing completion outcomes and one cached-client recheck. Complete **225 canonical + 41 prior controls + 15 separate drafts** replay passed. Actual authenticated Parent, Educator and Student completion/follow-up/activity smoke passed. Existing routines, policies, indexed columns and triggers remain preserved except for the named new revision trigger. The new RPC and private trigger helper have fixed paths and restricted grants.

[Full-chain proof](../evidence/meeting-completion-full-chain-2026-11-21.json), [local cases](../evidence/meeting-completion-local-2026-11-21.tap), [native cases](../evidence/meeting-completion-native-2026-11-21.tap). Disposable CI run44941614755 passed on reviewed SQL head e13ab315. All297 inherited original SQL identities and56 original stage logs were independently checked; the prior student-setup proof hash also matches.

## Remaining Work — Not Closed by This Batch

- Creation recovery needs a durable request/outcome record and a deletion tombstone before automatic replay can be safe. An absent student can mean never created, unavailable, or created and subsequently deleted. Reusing a browser UUID or matching names is not enough. Onboarding completion recovery must reuse a confirmed student outcome without creating again; unknown outcomes must remain blocked until reconciled. No browser-only retry workaround was added.
- Coordinated student deletion must handle retained reports/intakes/licenses, restrictive document-operation references and storage/provider cleanup. The earlier143-edge inventory remains the source of truth; the clearer error message does not complete this work.
- Meeting creation/default-agenda saves, later follow-up creation/status edits, templates and other raw/trusted meeting writers remain open. The completion transaction covers pending follow-ups visible while holding the parent lock; it does not prevent a separate writer from adding a new follow-up after completion commits.
- Channel mirrors/status and extracted-goal bulk/trusted writers still need composed transaction review. Calendar/prep recommendation parent/authority proof, BridgeForward and P2/P3/P4 remain open.

The application completion route and monotonic revision checks require this draft before rollout. Canonical promotion, ledger entries, authorized staging deployment/publication and hosted acceptance remain separate. No hosted migration, records, AI/provider calls or production changes occurred.

Final application verification: **6,914 unit tests / 409 files**, **101 focused tests**, **51 readiness/inventory/role contracts**, **72 release/security contracts**, TypeScript and the environment-file-free staging build pass. The source and copy match across1,253 runtime files. [Combined evidence](../evidence/meeting-save-verified-2026-11-21.json).
