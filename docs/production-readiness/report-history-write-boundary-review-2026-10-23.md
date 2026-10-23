# Report History Write Boundary Review — October 23, 2026

Status: **review-only proposal, not canonical or applied**. No hosted query, fixture, migration, source synchronization, deployment, publication, account/access change or provider call occurred in this work. Both staging applications retain approved `a2c5564c` runtime fingerprint `c4e3096bb114388a5ff91157df2c8dd75ec8b92f2fa358d8cfbe2e14f9adb13d`, 1,184 files. Production remains unchanged and NO-GO.

## Confirmed Disposable Reproductions

The existing credential-free history fixture executes real canonical table grants, RLS/update/version policies and the atomic RPC, with identity/student-access helpers stubbed for the named cases. It now reproduces:

1. An authenticated report owner directly updates `pathway_reports.content`, changing the report without a history row.
2. The owner directly inserts a fictional version with arbitrary content/number and another existing user's `created_by` ID. The current INSERT policy validates report ownership, not historical truth or actor identity.

These are canonical-source/disposable-database findings, not claims of exploitation or a fresh hosted report/version privilege inventory. Earlier sharing acceptance and catalog checks do not close them.

## Proposed Direction: Preserve Existing Editing Rights

[Unapplied SQL proposal](proposals/report-content-history-boundary.sql), SHA256 `a1b484cfd36d5c1f187406390267027b3107ea496af4c1c71ddb57e5b9d75220`:

- An AFTER UPDATE OF content trigger records the exact prior report content and JWT actor under the report row lock. A direct permitted write therefore also produces history. Identical-content saves retain one snapshot per save; metadata-only updates and initial report creation do not create content versions.
- The existing save RPC stays SECURITY INVOKER, retains explicit report-owner scope, full-content conflict checks and its signature/response. It updates once and confirms the resulting version instead of inserting a second snapshot. Existing application save, restore and regeneration callers remain compatible.
- Ordinary clients lose direct version INSERT/UPDATE/DELETE at table and column level. Their existing SELECT/RLS policies and report editing permissions remain unchanged. Service maintenance privileges remain intact.
- The small trigger function is SECURITY DEFINER with a fixed `pg_catalog` search path, fully qualified objects, a checked trigger context and no PUBLIC/anonymous/authenticated/service EXECUTE. It is not a browser-callable privileged save RPC. This new elevated boundary requires review before canonicalization.
- RPC summaries use a transaction-local setting, restored after the update. Summary text is untrusted annotation, never authorization or evidence that an action was approved. The trigger derives content and actor itself. Maintenance without a user claim records a null actor.
- Missing prerequisites, changed original function body/grants, unexpected ownership/RLS/privileged clients, client trigger/truncate rights or inherited version write privileges cause the transaction to abort. No error path restores broad rights automatically.

Revoking report UPDATE outright was rejected as an implementation shortcut: it would break the current invoker RPC and implicitly remove existing linked-editor/admin capabilities. An owner-only elevated RPC is an alternative only after explicit access-policy review, with additional privilege/security design and compatible callers.

## Role and Surface Assessment

| Role or surface | Effect of the proposal |
| --- | --- |
| Student, Family/Guardian, Educator | If the caller owns the report and existing student/RLS conditions allow it, save/restore/regenerate remains owner scoped. Their permitted direct content updates would also produce history. A role name alone does not confer ownership. |
| Accepted editor / permitted relationship | Existing RLS editing remains; a permitted direct update records the actual editor. This does not grant access to somebody else's version history or the owner-only save RPC. |
| Read-only collaborator | Existing read access does not acquire UPDATE or version-write access. |
| School administrator, District administrator, Partner | No role-wide write grant is added. Existing owner/student/organization/relationship conditions still decide access; arbitrary other reports remain outside that scope. These fixture cases do not certify all real organization helpers. |
| Owner/admin | The management-only UI is preserved, but canonical admin SELECT/UPDATE exceptions remain. The fixture explicitly demonstrates that preserving/attributing an admin edit is not backend denial. Administrative planning-data access still needs a distinct purpose/safeguards/scope decision before production. |
| Signed-out/public bearer viewer | No authenticated write or RPC/trigger execution grant is introduced. Fixed audience projection and the accepted sharing restrictions remain separate. |
| Demo | Fictional demo readers do not write these tables. No UI redesign or fabricated saved-history feature is introduced. |

## Validation and Limits

Local PGlite: **35 pass, 2 native-concurrency cases skipped**, 37 total. Includes prior atomic/ledger checks plus direct-write/fabrication reproductions; exact prior snapshots; one RPC version; save/restore summaries; identical saves; denied direct version mutations; unrelated/read-only/editor/admin boundaries; metadata-only updates; failures rolling back direct and RPC writes; skipped updates; stale server-content conflict; trigger grants; malformed content; privileged maintenance; disabled-RLS/privileged-client/inherited-grant aborts. Three retained atomic-history source contracts pass. Logs: `/private/tmp/tf-sharing-rollout-a2c5564c/report-history-boundary-local.log`.

The existing manual/automatic disposable PostgreSQL workflow now also selects this proposal on changes and runs the same behavioral suite before the separate canonical replay. Native results, including the new direct/direct concurrency case and existing RPC concurrency case, remain pending for the committed proposal. No arbitrary database URL is accepted; tests use a unique throwaway database on literal loopback and drop it afterward.

This is **not immutable audit storage**: report deletion still cascades history; privileged operators/service maintenance retain their existing powers. It does not verify content quality, stop stale browser intent that predates the server read, constrain every report identity/provenance metadata mutation, or settle Owner data access and removed-member bearer-link lifecycle. Direct UPDATEs remain subject to their existing authorization model; they do not gain an expected browser revision. Snapshot storage/retention and large-report request/native export limits still need review.

## Required Next Gates

1. Pass exact-commit native PostgreSQL concurrency/behavioral tests and full canonical replay; review this new SECURITY DEFINER trigger and service/client privilege boundaries.
2. Read only the exact isolated staging catalog: complete effective table/column/inherited grants, role attributes, report/version RLS policies, existing triggers, function body/configuration/grants and canonical ledger. Do not read real report content to prove a metadata assumption.
3. Resolve Owner administrative data-access policy separately; retain management-only navigation and do not infer data denial from it. Agree on remaining stale-browser-intent requirements.
4. Only after review, prepare a new additive canonical migration with its exact checksum, canonical inventory/ledger representation and recovery/abort plan. Do not edit the applied atomic-history migration or apply this proposal ad hoc.
5. Obtain specific authorization before any new hosted migration, fixture run or release. A future bounded test must verify save/restore/direct editor changes, all applicable role denials, history contents, shared/export compatibility and trusted exact cleanup.

All TF-01–TF-26/full-roadmap work remains tracked. Parent Pilot and Pathway Report Snapshot remain deferred.
