# Caseload and Student Reader Batch

Scope: Workstream5.2/5.3 source/local application checks. No schema, hosted records, provider calls or permission grants change. The existing thirteen-draft planning package remains a deployment prerequisite for atomic quick actions.

## Completed Implementation; Final Verification Pending

- Caseload GET no longer accepts pending collaborator invitations. It reads caller-visible students and checks current canonical reading/editing capability and Partner-only exclusion. Approved relationships/self access are included when the database exposes them; broad Owner/admin membership is never treated as student access.
- Overview counts, action lists, notes and readiness read all exact-count pages with bounded100-student filters and stable ordering. Unknown/duplicate/foreign rows, failed pages or capability changes fail explicitly. No partial result is presented as zero/empty success. Current access is rechecked before returning; these are request-level checks, not an atomic cross-table snapshot or proof of cancellation after return.
- Newest readiness scores use actual timestamps with a deterministic ID tie-break. Both completion spellings remain recognized. The signed-in readiness page no longer mounts the fictional default heatmap; its live table remains. Demo sample layouts are unchanged.
- Shared reader state hides old data during refresh/account changes and ignores older/departed replies. Explicit errors have refresh controls. Viewers cannot use quick writes; action toggles require current editor-or-assignee capability. Database normal-action RPCs remain the final write authority.
- Quick action creation now delegates to the previously verified held-authority RPC. Existing UI teacher intent is normalized to Educator. The quick-create API accepts the normal creation categories plus this compatibility alias; unsupported Partner-category quick creation is rejected rather than bypassing that interface. Existing Partner-category rows and all stored actions are preserved.
- Student detail and edit-capability handlers check the requested student, current account and literal access results. Owner/admin is no longer described as implicit editing authority.
- The quick-note form now carries actor/student/request intent and checks saved receipts; server checks editing capability and exact creator/content/visibility identity. This is a precheck plus caller-RLS insert, not transaction-held note authority. Private-note semantics, broader author/admin policies and note/history atomicity remain P2 work.

## Remaining Checklist Scope

Student creation/deletion/self-profile repair and list contract review, raw/trusted goal/action writers outside quick creation, BridgeForward, deeper note/history permissions (P2), membership/sharing (P3) and personal drafts (P4) remain open. The52-endpoint inventory retains its bounded scope and classifications; caseload/educator companion handlers are additional named component coverage, not a claim that the whole inventory or Workstream5 is complete. Hosted all-role acceptance remains separate.
