# Add Student and Onboarding Recovery — November 21

## Completed Source / Local Components

- [x] Add Student and onboarding persist one account-scoped request before creating a student. Only a version, random request ID, entry point, linked/self kind and role are stored; no names, answers, document text or school details.
- [x] Reloads/remounts read the existing request instead of generating a new ID. Both entry points share a nonqueued Web Lock and re-read storage inside that lock. Another tab cannot start a second creation while the first is pending.
- [x] Explicit **Check Saved Setup** reads a strict actor/request-bound status and the current authorized profile. It never creates, ensures, updates or deletes a student. Unknown/deleted outcomes do not permit replay.
- [x] Add Student can acknowledge a freshly confirmed saved profile, refresh its list and retire that exact request. An onboarding request must be continued in onboarding.
- [x] Family/Educator onboarding resumes a saved profile after creation or completion reply loss, without another creation call. The loaded role must match the original setup role; the wizard cannot overwrite an unresolved setup.
- [x] Student self-profile recovery reads the actual direct identity instead of using the unrelated creation request UUID or calling the ensuring/creation function again.
- [x] Pending requests survive completion failure. Even an already-completed profile does not bypass an unresolved local request; successful explicit completion clears it. A completed in-page submission cannot run again.
- [x] Account changes suppress departed replies and bind progress/completion writes to the expected viewer. Storage corruption, storage failure and unsupported Web Locks stop creation with a readable explanation.
- [x] Completion rejects role clearing/assignment errors instead of reporting success.

## Validation / Release Boundary

Focused tests cover actual page/hook flows, initial creation followed by failed completion and refresh, all three onboarding roles, current ownership, contradictory replies, role/account changes and unavailable locks/storage. This closes the named same-browser recovery integration; it is not a claim that every profile/role write is transactional.

The existing **draft16** database recovery function remains a deployment prerequisite. No SQL changed in this batch. Canonical packaging, authorized staging migration/deployment/publication, real-browser/hosted acceptance and production remain open. No hosted fixtures or provider calls were made.

## Remaining Work

- [ ] Hosted/browser acceptance on the exact reviewed release after separately authorized rollout; include full-application two-tab and account-switching journeys. The isolated real-browser storage/lock check already passes.
- [x] Source/local linked-request resolution now uses a permanent server closure before clearing its marker; see [draft17 checklist](student-request-resolution-review.md). Self-profile and ownership-retired cases remain blocked for separate handling.
- [ ] Cross-device/origin recovery: browser-local markers cannot coordinate another device, another staging hostname or cleared browsing data. Do not label this global server idempotency.
- [ ] Full atomic profile/role completion and confirmation across every onboarding role. Current source surfaces role errors and preserves the pending creation request; its existing profile/role operations remain separate statements.
- [ ] Actual document/storage/provider deletion cleanup and the twelve retained/soft-reference tables remain on the [lifecycle checklist](student-lifecycle-recovery-review.md).

Verification: **6,955 unit tests /412 files**, **95 focused tests**, **51 readiness/role contracts**, **72 release/security contracts**, TypeScript and the isolated staging build pass. A separate real-browser case passes using two isolated tabs and the bundled actual recovery module: cross-tab exclusion, refresh persistence, duplicate-intent rejection, account separation and exact clearing. [Scoped evidence](../evidence/student-creation-ui-recovery-2026-11-21.json).
