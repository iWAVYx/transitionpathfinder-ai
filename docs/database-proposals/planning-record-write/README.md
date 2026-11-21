# Normal Planning Creation and Goal Status — Review Only

This thirteenth separate draft completes the database-write shape for the normal goal/action APIs: creation for either table and goal-status changes join the prior action-update and deletion RPCs. Current editing proof and role/student/relationship rows remain held until commit or rollback. Owner/admin needs an explicit editing relationship; read-only or assignment alone and partner-only access are not sufficient.

Creation allows only known fields, derives the author from the authenticated caller, preserves requested record identity and checks every saved field. Linked reports must match the student and remain locked through the write. New actions start unfinished, so creation cannot bypass the completion/activity workflow. Duplicate UUIDs fail rather than pretending to be persistent idempotency. Missing responses are not retried; callers must reconcile saved records.

Goal-status updates require the exact loaded student, row and microsecond version. The goal row stays locked; unchanged status is a no-op. A private revision trigger strictly advances updated_at even inside one transaction. Returned rows must preserve all fields other than status/revision. Existing raw writers receive increasing goal revisions but are not retired or claimed to have loaded-version enforcement.

Installation adds two authenticated-only RPCs, one private invoker revision helper and one goal trigger. Existing routines, policies, table grants, columns, constraints and data remain unchanged. It depends on the exact prior canonical authority helpers and separate drafts. No canonical migration, ledger entry, hosted operation, provider call or production authority is included.

Verification is in progress: targeted SQL, native observed-lock races, full thirteen-draft schema integration, receipt/API tests, existing consumer regressions and isolated build. Do not treat this draft as hosted acceptance or whole-P1 completion. Final package ordering, rollback/recovery, raw/trusted writers and remaining profile/caseload/BridgeForward review remain open.
