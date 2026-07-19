# Hardening Program — Evidence Ledger

Requirement → code/migration/test evidence per slice.

## Workstream A — Identity, Org, Entitlement Normalization

### Slice A1 — Foundation
- **Central authorization entry point**: SQL `public.authorize(user_id, action, resource_type, resource_id)` → migration `slice_a1_authorize_helpers`.
- **District→school cascade**: SQL `public.effective_org_access(user_id)` → same migration.
- **Partner tier enforcement**: SQL `public.partner_tier_allows(user_id, capability)` → same migration.
- **Durable audit surface**: `public.org_access_audit` table + RLS (actor + platform admin read) → same migration.

### Slice A2 — First wiring + boundary test
- **Client-side helper**: `src/lib/authz.ts` (`isAuthorized`, `assertAuthorized`, `AuthorizationError`) — wraps the RPC and records denial rows.
- **Audit writeability**: migration `slice_a2_audit_writes` — `GRANT INSERT` + `actor can insert own audit rows` policy scoped to `actor_id = auth.uid()`.
- **Wired into server fns** (all additive, RLS still enforced):
  - `linkReportToStudent` — `authorize('edit','student', student_id)` when linking.
  - `createOpportunity` (partner-workspace) — `authorize('publish_opportunity','partner_capability')`.
  - `updateOpportunity` (partner-workspace) — same capability check.
- **Boundary regression test**: `tests/authorize-rpc.test.mjs` — verifies allow/deny for district admins and partner baseline capability via signed-in fixture users.

### Slice A3 — Document mutation sweep + entitlement boundary
- **Document mutations gated by `authorize()`** in `src/lib/documents.functions.ts`:
  - `archiveDocument` — `authorize('edit','student', row.student_id)` before archive/restore.
  - `getDocumentSignedUrl` — `authorize('view','document', row.id)` before minting the signed URL, layered on top of RLS + revoked-access alerting.
- **Entitlement/waitlist-style boundary tests** added to `tests/authorize-rpc.test.mjs`:
  - Parent user is denied `publish_opportunity` on `partner_capability` (no partner entitlement).
  - Parent user is denied `view` on `organization` (no district membership).
- **Rollback**: helper is additive; removing the two `assertAuthorized` calls restores prior behavior. RLS still enforces on its own.

### Slice A4 — Org/district mutation sweep + cross-org denial audit
- **`authorize()` layered on org mutations** (all keep existing gates as belt-and-suspenders):
  - `approveOrgMembership` — replaced ad-hoc `is_org_admin` RPC with `assertAuthorized('manage','organization', orgId)`.
  - `addSchoolToDistrict`, `removeSchoolFromDistrict`, `inviteDistrictTeammate` in `src/lib/district-admin.functions.ts` — `assertAuthorized('manage','organization', district_id)` before the existing `ensureDistrictAdmin` gate.
- **Cross-org denial audit test** added to `tests/authorize-rpc.test.mjs`: district A admin gets `authorize('manage','organization', DISTRICT_B) = false` and can read back the corresponding `org_access_audit` deny row under RLS.
- **Rollback**: remove the added `assertAuthorized` lines; original `ensureDistrictAdmin` / `is_org_admin` checks remain in place.

### Slice A5 — Workstream A wrap-up (waitlist boundary + matrix)
- **Waitlist-vs-entitled boundary test** in `tests/authorize-rpc.test.mjs`: asserts `user_has_feature()` returns `false` for `family_access | student_access | partner_access | any` on a signed-in parent with no `access_entitlements` row. Locks in "signed-in ≠ entitled".
- **Role-guard matrix wrap-up test**: enumerates (actor × action × resource) tuples across district admin, partner, parent and asserts `authorize()` decisions; becomes the regression fence for any future helper/RLS change in Workstream A.
- **No schema change**: Slice A5 is test-only; all helpers (`authorize`, `user_has_feature`, `effective_org_access`, `partner_tier_allows`) already shipped in A1–A4.
- **Workstream A acceptance status**:
  - ✅ Central `authorize()` shipped and wired into high-risk mutations (report link, document view/archive, opportunity create/update, org membership approval, district school+teammate mutations).
  - ✅ `effective_org_access` + `partner_tier_allows` in place; district→school cascade covered.
  - ✅ `org_access_audit` table + RLS + actor-self insert policy; deny writes verified under RLS.
  - ✅ Waitlist boundary + cross-tenant matrix locked in tests.
- **Rollback**: tests only — deleting the new `test(...)` blocks reverts A5.

Workstream A closed. Ready to open Workstream B (Transition Evidence Graph) on approval.

## Workstream B — Transition Evidence Graph

### Slice B1 — Dormant evidence graph schema
- **New tables** (additive, no reads/writes wired yet):
  - `public.evidence_items` — student-scoped evidence rows with `kind`, `subject_type/id`, `source_kind/id`, `contributor_id`, `occurred_at`, `confidence` (0..1), `verification_state`, `permission_scope`, `payload jsonb`, `extraction_id` FK → `document_extractions`.
  - `public.evidence_edges` — polymorphic edges (`from_type/from_id → to_type/to_id`, `relation`) with a uniqueness key preventing duplicate edges. Only `from_type='evidence_item'` is admitted by RLS at this slice; other from-sides will unlock as writers land.
- **RLS**:
  - `evidence_items` visible via `can_access_student`; mutable via `can_edit_student`.
  - `evidence_edges` SELECT / INSERT / DELETE derived from the linked evidence item's student access; no UPDATE (edges are immutable once written — replace via delete+insert).
- **GRANTs**: `authenticated` gets standard CRUD; `service_role` gets ALL. No `anon` access.
- **Indexes**: `student_id`, `kind`, `(subject_type, subject_id)`, `(source_kind, source_id)` on items; `(from_type, from_id)`, `(to_type, to_id)`, `relation` on edges.
- **Trigger**: `set_updated_at()` on `evidence_items`.
- **Linter delta**: 0 new warnings from this migration; all 50 reported warnings pre-date Workstream B (SECURITY DEFINER + extension-in-public on legacy helpers).
- **Rollback**: `DROP TABLE public.evidence_edges; DROP TABLE public.evidence_items;` — safe because no readers reference them.

Next: **Slice B2** — idempotent backfill from `report_evidence_links` + `document_extractions` into `evidence_items` / `evidence_edges` behind a `EVIDENCE_GRAPH_BACKFILL` feature flag, with an idempotency test.

### Slice B2 — Idempotent evidence graph backfill
- **Uniqueness for re-runnability**: partial unique index `evidence_items_source_unique (student_id, source_kind, source_id) WHERE source_id IS NOT NULL`. Every backfill statement uses `ON CONFLICT ... DO NOTHING` against this key.
- **Backfilled from**:
  - `document_extractions` → `evidence_items` with `kind='document_extraction'`, `subject_type='document'`, `subject_id=document_id`, `verification_state` derived from review status (`human_confirmed` / `auto_high` / `unverified`), and `extraction_id` back-linked.
  - `report_evidence_links` → `evidence_items` with `kind='report_reference'`, preserving the link's `source_kind/source_id` and stashing `report_section`, `source_label`, `note`, `snippet_hash`, `link_id` in `payload` (edge to `pathway_report` deferred: `report_evidence_links` has no `report_id` column).
- **Idempotency proof in-migration**: after the initial insert, both statements are re-run inside a `DO $$` block and `RAISE EXCEPTION` fires if the row count changes. The migration succeeded, which is the proof.
- **Current backfill volume**: 0 rows in this environment (`document_extractions` and `report_evidence_links` currently have no student-linked rows). The guard still ran; it protects future re-runs once data lands.
- **Linter delta**: 0 new warnings.
- **Rollback**: `DELETE FROM evidence_items WHERE kind IN ('document_extraction','report_reference') AND source_id IS NOT NULL;` then `DROP INDEX evidence_items_source_unique;`. No source tables were touched.

Next: **Slice B3** — build the read-side views (`student_evidence_v1`, `recommendation_provenance_v1`) with RLS-friendly definitions and cover them with an evidence-graph unit test that seeds a student, inserts an evidence item + edge, and asserts the view returns them under a signed-in student-team member and hides them from an unrelated user.

### Slice B3 — Evidence Graph Read Views
- **New views** (both `WITH (security_invoker = on)`, so RLS on `evidence_items` / `evidence_edges` applies to the caller):
  - `public.student_evidence_v1` — one row per evidence item with a lateral rollup of attached edge count + distinct relations.
  - `public.recommendation_provenance_v1` — one row per evidence edge whose `to_type = 'pathway_recommendation'`, joined back to the source evidence item's student, kind, confidence, verification, and payload.
- **GRANTs**: `SELECT` to `authenticated`; no `anon` grant.
- **Test coverage** — `tests/evidence-graph-views.test.mjs`:
  - Owner (parent) who seeds a student + evidence item + edge sees the row in both views with `edge_count = 1` and `relation = 'supports'`.
  - Unrelated signed-in parent (fresh sign-up) sees zero rows filtered by the same `evidence_id`.
  - Anon (no session) sees zero rows in both views.
- **Linter delta**: 0 new warnings (views inherit invoker-side RLS; no new SECURITY DEFINER surface).
- **Rollback**: `DROP VIEW public.recommendation_provenance_v1; DROP VIEW public.student_evidence_v1;` — safe, no downstream readers wired yet.

Next: **Slice B4** — introduce the first evidence writer (document-extraction ingestion path) behind a feature flag, emitting one `evidence_item` per confirmed extraction and one `evidence_edge` per report reference, with a writer-idempotency test.

### Slice B4 — First evidence writer (document extraction)
- **New helper**: `src/lib/evidence-writers.functions.ts` — `emitEvidenceForConfirmedExtraction()` upserts one `evidence_items` row per confirmed extraction using the partial unique index `(student_id, source_kind, source_id)` with `ignoreDuplicates: true`. Runs under the caller's authenticated supabase client, so RLS on `evidence_items` still applies.
- **Feature flag**: `EVIDENCE_GRAPH_WRITES` (server-only). Off → helper returns `{ ok: true, skipped: true }` and writes nothing; existing code paths unchanged. Shadow-mode by default.
- **Wired into**: `applyAcceptedExtraction` in `src/lib/extractions.functions.ts` — after the extraction is marked `complete` and before the audit_log insert. Emits `kind='document_extraction'`, `verification_state='human_confirmed'`, `payload` = the applied field names. Non-fatal on failure (logged, not thrown), so a writer error can never regress an already-successful extraction apply.
- **Idempotency test**: `tests/evidence-writer-idempotency.test.mjs` — signs in as the QA parent, seeds a student, runs the same upsert three times, asserts exactly one `evidence_items` row survives under RLS. Locks in the partial-unique-index contract that the writer relies on.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` (default). To remove entirely, delete the `emitEvidenceForConfirmedExtraction` call in `applyAcceptedExtraction` and the helper file — no schema change to undo.

### Slice B5 — Second writer (recommendation edge) + first provenance consumer
- **New helper** in `src/lib/evidence-writers.functions.ts`: `emitRecommendationEvidenceEdge()` upserts one `evidence_edges` row from `evidence_item → pathway_recommendation` using the unique index `evidence_edges_from_type_from_id_to_type_to_id_relation_key` on `(from_type, from_id, to_type, to_id, relation)` with `ignoreDuplicates: true`. Runs under the caller's authenticated supabase client; edge RLS derives visibility from the source evidence item.
- **Feature flag**: `EVIDENCE_GRAPH_WRITES` (server-only, shared with B4). Off → helper returns `{ ok: true, skipped: true }` and writes nothing.
- **First consumer read**: `readRecommendationProvenance(supabase, recommendationId)` — reads through the `recommendation_provenance_v1` view (RLS-honoring `security_invoker`), returning `[]` silently when the caller has no access.
- **Idempotency + provenance test**: `tests/evidence-edge-writer.test.mjs` — signs in as the QA parent, seeds a student + evidence item, upserts the same edge three times and asserts exactly one row survives; then reads `recommendation_provenance_v1` and confirms the owner sees exactly one row while an unrelated signed-in parent sees zero.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES`. To remove entirely, delete `emitRecommendationEvidenceEdge` and `readRecommendationProvenance` from `src/lib/evidence-writers.functions.ts` — no schema change to undo.

### Slice B6 — Provenance emission at report-link time + first consumer server fn
- **New helper** in `src/lib/evidence-writers.functions.ts`: `linkReportProvenance()` — on report ↔ student link, upserts one `evidence_edges` row per existing `evidence_items` for that student, targeting the report id as the recommendation surrogate. Idempotent via the (from,to,relation) unique key. Flag-gated by `EVIDENCE_GRAPH_WRITES`; default off = no-op.
- **Wired into**: `linkReportToStudent` in `src/lib/pathway.functions.ts` — runs after the successful `pathway_reports` update, dynamic-imported so writer isn't reached until link time. Non-fatal on failure (existing link is preserved).
- **First provenance consumer server fn**: `getReportProvenance({ report_id })` in `src/lib/pathway.functions.ts` — reads through the `recommendation_provenance_v1` view via `readRecommendationProvenance`. RLS-honoring: returns `[]` silently when the caller can't see the underlying evidence.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` (default). To remove entirely, delete `linkReportProvenance`, revert the `linkReportToStudent` call, and remove `getReportProvenance` — no schema change.

### Slice B7 — Promote writers to preview + live smoke
- **Flag flipped**: `EVIDENCE_GRAPH_WRITES=true` set in the preview environment. `emitEvidenceForConfirmedExtraction`, `emitRecommendationEvidenceEdge`, and `linkReportProvenance` now perform real upserts (still idempotent via the partial unique index on `evidence_items` and the (from,to,relation) unique key on `evidence_edges`).
- **Live smoke**: `tests/evidence-report-link-smoke.test.mjs` — signs in as QA parent, seeds a student + `evidence_items` row + real `pathway_reports` row, mirrors the `linkReportProvenance` upsert (twice, to prove idempotency), and asserts:
  - Owner sees exactly one row in `recommendation_provenance_v1` for that report id, with the right `evidence_id` and `relation='supports'`.
  - Anon sees zero rows.
  - Unrelated signed-in parent (fresh sign-up) sees zero rows.
- **Rollback**: unset `EVIDENCE_GRAPH_WRITES` to return every writer to shadow-mode no-op; no schema change to undo. Existing evidence rows remain readable through the RLS-honoring views.

### Slice B8 — Provenance coverage view + acceptance close-out
- **New view**: `public.report_provenance_coverage_v1` (`security_invoker = on`) — one row per `pathway_reports` row the caller can see, lateral-joined against `evidence_edges` where `to_type = 'pathway_recommendation' AND to_id = pr.id AND from_type = 'evidence_item'`. Exposes `report_id`, `student_id`, `evidence_edge_count`, and `has_coverage`. Edge visibility flows from the source evidence item's student access, so counts silently exclude edges the caller can't see. `SELECT` granted to `authenticated` only.
- **New consumer server fn**: `getReportProvenanceCoverage({ report_id })` in `src/lib/pathway.functions.ts` — reads the view and returns `{ evidence_edge_count, has_coverage }`. Returns `{ 0, false }` silently on RLS-hidden reports or read errors.
- **Coverage smoke test**: `tests/evidence-report-provenance-coverage.test.mjs` — signs in as QA parent, seeds a student + evidence item + `pathway_reports` row, asserts:
  - Pre-edge: owner sees a coverage row with `evidence_edge_count = 0`, `has_coverage = false`.
  - Post-edge (upserted twice for idempotency): owner sees `evidence_edge_count = 1`, `has_coverage = true`.
  - Unrelated signed-in parent sees zero coverage rows for the report id.
  - Anon sees zero coverage rows.
- **Workstream B acceptance status**:
  - ✅ `evidence_items` + `evidence_edges` schema with RLS shipped (B1) and idempotency-keyed for re-runs (B2).
  - ✅ Read views `student_evidence_v1` + `recommendation_provenance_v1` (B3) plus coverage view `report_provenance_coverage_v1` (B8), all `security_invoker` so RLS applies to the caller.
  - ✅ Writers: `emitEvidenceForConfirmedExtraction` (B4), `emitRecommendationEvidenceEdge` (B5), `linkReportProvenance` (B6) — all idempotent, all gated by `EVIDENCE_GRAPH_WRITES`, flipped on in preview (B7).
  - ✅ Consumer server fns: `getReportProvenance` (B6) and `getReportProvenanceCoverage` (B8) reading through the RLS-honoring views.
  - ✅ Coverage query returns for every `pathway_reports` row the caller can see (0 when no edges yet, ≥1 once evidence is linked) — establishes the observable metric for "every recommendation resolves ≥1 evidence item" as writer coverage rolls forward.
- **Rollback**: `DROP VIEW public.report_provenance_coverage_v1;` and remove the `getReportProvenanceCoverage` server fn — no data change to undo. Legacy `report_evidence_links` remains the fallback reader as documented in the Workstream B plan.

Workstream B closed.

## Workstream C — Document Intelligence Pipeline

### Slice C1 — Dormant pipeline run-log schema
- **New table**: `public.document_pipeline_runs` — additive, no readers or writers wired yet. Columns: `document_id` FK → `documents(id) ON DELETE CASCADE`, `student_id` FK → `students(id) ON DELETE SET NULL`, `correlation_id UUID` (retry grouping), `attempt INT DEFAULT 1`, `stage` (`upload|sniff|hash|extract|verify|publish`), `status` (`pending|running|succeeded|failed|quarantined|skipped`), `engine_version`, `model_version`, `prompt_version`, `error_code`, `error_message`, `latency_ms`, `cost_cents`, `payload jsonb DEFAULT '{}'`, `started_at`, `finished_at`, timestamps.
- **Indexes**: `document_id`, `student_id`, `correlation_id`, `(stage,status)`, `created_at DESC` — sized for retry lookup + admin dashboards later.
- **RLS**: platform admins (`has_role(auth.uid(),'admin')`) only for SELECT and ALL. `service_role` writes via `GRANT ALL`. No parent/educator/partner path into pipeline internals — intentionally private.
- **Trigger**: dedicated `set_document_pipeline_runs_updated_at()` (`SET search_path = public`) — didn't reuse a generic project helper because none existed and this stays scoped to the table.
- **Linter delta**: 0 new warnings; all 50 reported warnings pre-date Workstream C (SECURITY DEFINER + extension-in-public on legacy helpers).
- **Rollback**: `DROP TABLE public.document_pipeline_runs; DROP FUNCTION public.set_document_pipeline_runs_updated_at();` — safe, no readers reference the table.

Next: **Slice C2** — content-hash column on `documents` + idempotent backfill so future upload runs can detect duplicates without touching the pipeline path yet.






