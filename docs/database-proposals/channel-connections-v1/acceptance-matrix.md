# Required Acceptance Evidence — Not Executed

All cases below remain open. Parser results are not substitutes. Use an explicitly authorized disposable DB and synthetic fixtures first. Multi-session tests require a shared committed synthetic baseline in that isolated DB; do not silently create accounts/fixtures in staging to approximate rollback-only tests. Any staging test scope must be authorized separately.

| Area | Required Case | Evidence Needed |
| --- | --- | --- |
| Target | Directory and workspace happen to share a UUID or name but have no link | No delivery target or request; no automatic linkage. |
| Link | Active, suspended, remapped, stale version, hidden/unverified directory and unverified workspace | Clear unavailable/conflict result; original request attribution never changes. |
| Management | Owner mapping vs other roles, including metadata errors and uncertain CAS response | Only actual platform Owner/admin can map; read-back confirms recorded version without repeating a change. |
| Suspension | Existing workspace loses verification or changes type | Owner can suspend the existing link; activation still requires eligible verified target. |
| Consent | Missing, false, true, unchanged-save, off/on cycle and stale version | No send without explicit consent; unchanged save does not invalidate pending requests; toggles do. |
| Role | Each recorded eligible role/context; profile-only labels; mixed roles; Owner plus another role | Only the approved role/context works; profile labels never grant access and Owner precedence remains. |
| Context | Missing source organization, wrong type, pending verification, inactive/deleted membership | No guessed/first organization, no create or acceptance after access loss. |
| Receiver | Admin/owner member vs ordinary member, legacy global admin, wrong workspace and revoked Partner role | Only the approved receiving actor can consent/respond; no broad admin-helper fallback. |
| Self | Same person, same source/target organization, existing target membership or membership gained while pending | No self-acceptance or unintended internal connection; check concurrency with target membership insert. |
| Inputs | Empty/oversized fields, unknown purpose, null keys/versions and malicious text | Controlled failure and no writes; text stays data, never dynamic SQL. |
| Create Key | Same actor/key/payload, changed payload, another actor and ambiguous transport result | One durable request; key conflict cannot retarget; authenticated lookup gives exact recorded outcome. |
| Pending Slot | Two tabs, two listings for one receiving workspace and overlapping creates | One pending slot per approved actual context/purpose; loser creates no request/key/audit residue. |
| Quota | Proposed rolling limit, replay at limit, expired/terminal records and boundary time | Defaults are explicitly approved and deterministic; replay is not counted as a new create. |
| Expiry | Before/at/after deadline, long metadata lock wait and slot expiry/create race | Recheck after blocking reads; no acceptance after deadline and no broad legacy expiry rewrite. |
| Response Race | Accept/accept, accept/decline and accept/withdraw in two real sessions | One terminal decision; at most one channel and exactly the intended fresh memberships. |
| Atomic Failure | Fail channel, each membership, request link, audit or event insertion | Entire response transaction and operation-key claim roll back; no accepted partial setup. |
| Operation Key | Same response/withdrawal key vs different request, decision or expected revision | Exact replay or controlled conflict; no repeat membership/resource creation. |
| Revision | Stale revision, timestamp ordering and competing state updates | Revision drives CAS; trigger timing does not authorize a stale write. |
| Unknown Result | Network loss after commit, failed navigation, later role/membership revocation | Read-back/open-only retry; complete setup remains complete but current opening capability can be false. |
| Owner Read-Back | Former participant gains platform Owner/admin or legacy admin role while still a channel member | Completed setup remains recorded; lookup never offers personal opening and existing memberships/history are untouched. |
| History | Remove vs keep-read-only history, revoked participant and archived channel | Existing history/removal semantics remain; lookup/retry never reactivates membership. |
| Legacy | Pending v0 cleanup; accepted complete, incomplete, wrong-linked and unlinked candidates | No automatic acceptance repair/backfill; original access remains through legitimate existing navigation. |
| Additive Phase | Old direct writer tries new attribution, revision, completion marker or binding | Seals reject fabricated v1 data/binding even before full write cutover; legacy compatibility is bounded. |
| Direct API | Requester edits target/status/responded fields, receiving admin arbitrary update, DELETE and column grants | Direct API denied after cutover, including inherited/column ACLs; approved RPCs still work. |
| Read Scope | Legacy global admin vs actual receiver, ordinary stranger, requester and Owner oversight | v1 RLS exposes only the intended request scope and no private link evidence/key tables. |
| Channel Binding | Squat on pending request ID, change or clear binding, normal title/archive changes | Ordinary direct binding writes fail; reviewed definer acceptance and legitimate unrelated edits work. |
| Ownership | Function/table ownership mismatch, FORCE RLS, private schema exposure and function grants | No accidental privileged path; fail closed and reconcile ownership before activation. |
| Other Transactions | User deletion, role grant/revocation, membership changes, FK waits and alternate lock order | Document actual blocking/deadlock behavior; rollback and key lookup recover without duplicate effects. |
| Retention | Account/directory/request deletion and audit/key lifecycle | Approved retention/erasure behavior; RESTRICT FKs do not break supported deletion workflows. |
| UI | Four eligible role routes, Family/Student exclusion, Owner-only management, errors, mobile/keyboard and back/forward | Exact staged build; correct target/version, no wrong-role tools, no false success or unexpected first-channel fallback. |
| Demo | Fictional role/context switch, pending/accepted/incomplete/archived/unavailable states and retry | Approved local-only behavior matches the actual flow without impersonating permission or delivery success. |
| Release | Exact commit, runtime and SQL hashes, database ledger, isolated staging settings and old clients | Reviewed compatibility matrix; no production action or implicit merge/deployment. |

For SQL permission cases use the real authenticated role and synthetic JWT subject, not only a privileged session calling helper functions. Compare resulting rows from a separately authorized inspector. Record exact row counts/identities privately; keep names, email, messages, tokens and credentials out of general reports.
