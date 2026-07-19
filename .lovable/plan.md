# TransitionForward Backend & Pathway Intelligence Hardening

This is a multi-month program, not a single build. I'll ship it in sequenced, testable slices behind the UI freeze. Each slice is independently reviewable, backward-compatible, and gated by tests before the next one starts.

## Ground Rules (apply to every slice)

- **UI freeze**: no changes to public/demo/dashboard/workspace/report layouts, tile counts, selectors, semantic landmarks, or test IDs. Only loading/empty/error/status regions may reflect improved backend state.
- **Migrations**: backward-compatible + idempotent. Additive columns, new tables, new policies. No destructive drops on production data.
- **Feature flags**: every engine/pipeline change ships behind a flag, shadow-mode first, rollback preserved.
- **Evidence ledger**: each slice ends with a requirement → code/migration/test mapping appended to `docs/hardening-ledger.md`.
- **No presentation-layer "wins"**: if a slice would add a card/section/nav, stop and re-scope.

---

## Workstream A — Identity, Org, Entitlement Normalization

**Current**: `profiles`, `user_roles`, `organizations`, `organization_memberships`, `student_relationships`, `student_collaborators`, `access_entitlements`, `has_role`, `is_org_admin`, `effective_entitlement_for_user` already exist. Authorization is scattered across route guards, RLS, and ad-hoc checks.

**Gap/Risk**: role labels sometimes act as sole gate; district→school coverage inconsistent; partner team access unverified; waitlist vs. entitled user boundary fuzzy; suspension/offboarding not uniform.

**Backend**:
- Central `authorize(user, action, resource)` SQL functions (`can_view_student`, `can_edit_student`, `can_manage_org`, `can_act_as_partner_admin`) — extend existing security-definer functions, do not duplicate.
- `access_entitlements` enforcement helper for Partner Free vs Premium (`partner_tier_allows(user_id, capability)`).
- District→school cascade via `organizations.parent_organization_id` already present — add `effective_org_access(user_id)` view.
- Uniform `membership_status` transitions (invited/active/suspended/offboarded) with audit rows.

**UI consumers**: existing dashboards, workspace, feature pages — no visual change, only stricter server-side checks.

**Migrations**: additive functions + one `org_access_audit` table.

**Permissions**: RLS uses new helpers; existing policies stay until replacements verified in shadow.

**Tests**: extend `role-guard-matrix`, `cross-district-rls`, `parent-onboarding-rls`, `partner-role-probe` suites. Add waitlist-vs-entitled boundary test.

**Acceptance**: every protected server fn calls `authorize()`; role-only checks removed; cross-tenant probes pass.

**Rollback**: helpers are additive; old policies retained until removal PR.

---

## Workstream B — Transition Evidence Graph

**Current**: `documents`, `document_extractions`, `student_intakes`, `student_voice_responses`, `student_strengths_needs`, `goals`, `pathway_reports`, `report_evidence_links`, `next_actions` exist but aren't unified as a graph.

**Gap**: evidence provenance is inconsistent; recommendations don't always link back to source; outcomes don't feed back.

**Backend**:
- New `evidence_items` table (student_id, kind, subject_type, subject_id, source_kind, source_id, contributor_id, occurred_at, confidence, verification_state, permission_scope, payload jsonb, extraction_id).
- New `evidence_edges` table (from_type, from_id, to_type, to_id, relation) linking evidence↔recommendation↔action↔opportunity↔outcome↔report_version.
- Backfill from existing tables via idempotent inserts.
- Views: `student_evidence_v1`, `recommendation_provenance_v1`.

**UI consumers**: pathway report, next actions, opportunities — read new views but render unchanged.

**Migrations**: additive; backfill in a separate idempotent migration.

**Permissions**: RLS via `can_view_student`; contributor writes via authenticated server fns only.

**Tests**: evidence-graph unit tests, RLS matrix, backfill idempotency test.

**Acceptance**: every recommendation resolves ≥1 evidence item; provenance query returns for every published report.

**Rollback**: new tables unused if flag off; readers fall back to legacy `report_evidence_links`.

---

## Workstream C — Document Intelligence Pipeline

**Current**: `documents` + `document_extractions` + `ai-job-processor` edge function.

**Gap**: no malware/file-type verification, weak duplicate detection, injection defenses unverified, failed extractions can leak into evidence.

**Backend**:
- `document_pipeline_runs` table (status, stage, correlation_id, model_version, prompt_version, error).
- File magic-byte check + size/type allowlist inside upload server fn (already server-side; add MIME sniff).
- Duplicate detection via content hash column on `documents`.
- Sanitize extracted text before prompt: strip active content, tag `UNTRUSTED_DOCUMENT_TEXT` blocks in prompts, refuse-to-follow instructions middleware.
- Gate: extractions only become evidence when `verification_state IN ('auto_high','human_confirmed')`.

**Tests**: prompt-injection corpus, duplicate detection, retry idempotency, failed-extraction quarantine.

**Acceptance**: injection corpus 100% blocked; retries never double-insert evidence.

**Rollback**: pipeline flag returns to legacy path.

---

## Workstream D — Age & Stage Rules Engine + Structured Generation

**Current**: `src/lib/demo/pathway-engine.ts` runs deterministic demo logic; real engine partially wired via `ai_jobs`.

**Gap**: rules not versioned; structured output not enforced before prose; CSDE/IDEA sources not tracked.

**Backend**:
- `pathway_rules_versions` + `pathway_knowledge_sources` tables (version, effective_at, source_url, checksum).
- Engine emits validated Zod-typed `RecommendationV1` (all required fields per spec) before narrative.
- Refusal path when evidence insufficient → generates "next best question" recommendation.
- Model/prompt/rules/knowledge version stamped on every `pathway_reports` row (add columns).

**Tests**: unit tests per age band (Sam/Riley/Jordan already covered — extend); structured-schema validation; refusal path test.

**Acceptance**: every recommendation passes schema; sparse-evidence cases produce assessment recs, not fabrications.

**Rollback**: engine version flag.

---

## Workstream E — Canonical Report + Versioning + Human Review

**Current**: `pathway_reports`, `pathway_report_versions` exist.

**Gap**: publish semantics not enforced; role projections not derived from single canonical; reviewer actions not fully audited.

**Backend**:
- `report_versions_immutable` constraint (no update after `published_at`).
- Role projections computed server-side from canonical report (family/student/educator lenses).
- `report_reviews` table (reviewer_id, decision accept/revise/reject/flag/request_evidence, note, original_ref, created_at).
- Distinguish content origin: `content_source` on evidence + rendered as data attribute (no visual change).

**Tests**: immutability, projection consistency across roles, audit trail preservation.

**Acceptance**: cannot silently overwrite published; three role views hash to same underlying version id.

---

## Workstream F — Opportunity Intelligence & Partner Graph

**Current**: `partner_opportunities`, `partner_network_opportunities`, `student_opportunity_matches`, `partner_organizations` exist.

**Gap**: matching not deterministic-first; eligibility not enforced pre-rank; contact protection uneven; partner tier not enforced server-side.

**Backend**:
- Deterministic eligibility filter fn `opportunity_eligible_for_student(opportunity_id, student_id) → (eligible, reasons[])` before ranking.
- Ranking fn returns `why_matches`, `what_to_consider`, `eligibility_to_confirm`, `next_step`, `source`, `last_verified_at`.
- Server-side partner tier enforcement on opportunity create/publish/analytics reads.
- Never expose partner contact emails except through `get_partner_network_opportunity_contact_email` (already admin-only) — extend for consented student connections.

**Tests**: eligibility matrix, disability-never-negative test, tier enforcement, contact-leak probe.

**Acceptance**: all matches show 5 required fields; no path exposes contact without authorization.

---

## Workstream G — Action & Outcome Loop

**Current**: `next_actions`, `action_items`, `goal_statuses`, `pathway_progress` exist.

**Gap**: completion doesn't systematically trigger report revision candidates; outcomes don't feed evidence graph.

**Backend**:
- Trigger on `next_actions.completed_at` → insert `evidence_items` (kind='outcome') + evaluate revision candidacy.
- `report_revision_candidates` table surfaced through existing report UI's status region.
- Calendar/deadline linkage via existing `calendar_events`.

**Tests**: end-to-end action→outcome→revision candidate.

---

## Workstream H — Reliability, Jobs, Observability

**Current**: `ai_jobs`, pg_cron email pipeline.

**Gap**: pathway generation lacks correlation IDs, cost/rate limits, shadow-mode.

**Backend**:
- Add `correlation_id`, `model_version`, `prompt_version`, `cost_cents`, `attempt` to `ai_jobs`.
- Idempotency key on job enqueue keyed by (student_id, engine_version, input_hash).
- Shadow-mode runner: new engine writes to `pathway_reports_shadow` + diff table, no user impact.
- Structured logs via existing edge function; add per-job alerts on failure rate.

**Tests**: retry-no-duplicate, shadow comparator, cost-limit trip.

---

## Workstream I — Security, Privacy, Consent

**Current**: broad RLS + security-definer helpers; recent scanner fixes on self-escalation triggers.

**Gap**: signed URL expiry policies inconsistent, consent enforcement not uniform across evidence writes, AI provider retention not documented.

**Backend**:
- Consent gate `consent_allows(student_id, contributor_id, evidence_kind)` called by every evidence write server fn.
- Signed-storage TTL standardized (existing revocation tests extended).
- AI-provider retention: document Lovable AI Gateway retention posture in `docs/security/ai-provider.md`; ensure no PII in prompts beyond authorized scope.
- Remove any lingering "FERPA compliant" claims from copy files (docs only, no UI text changes without approval).

**Tests**: consent enforcement matrix, signed URL revocation, cross-org leak probe (existing suites extended).

---

## Workstream J — Engine Evaluation Corpus

**Backend**:
- `tests/eval/pathway-corpus/` fictional cases per matrix (grade 7/9/adv, sparse, conflicting, ineligible, injection, cross-student leak attempt, etc.).
- Evaluator scores: grounding, source traceability, age-appropriateness, actionability, bias flags, privacy flags.
- CI gate: block release when scores < threshold.

---

## Workstream K — Test Matrix Completion

Extend existing suites; add missing: subscription entitlement gates, waitlist boundary, empty/loading/error rendering per feature page (server-state fixtures only), concurrency on report publish, performance smoke.

---

## Sequencing

```text
A (identity)  ──► B (evidence graph)  ──► D (rules/structured gen)  ──► E (canonical report)
                          │
                          ├──► C (doc pipeline)  ──► J (eval corpus, gates D/E/F)
                          │
                          └──► F (opportunity)    ──► G (action/outcome loop)

H (reliability) + I (security) run in parallel from slice 1; K (tests) extends every slice.
```

Slice size target: one workstream section, one migration, one test suite, one PR.

## Completion Report Template

Filled and updated per slice in `docs/hardening-ledger.md`:
role×workflow matrix • feature value ledger • migration inventory • RLS matrix • engine architecture • evidence schema • doc pipeline results • eval scores • security fixes • shadow-mode diffs • perf/reliability • remaining risks • regression totals.

---

## Immediate Next Step (Slice A1)

If you approve this plan, I start with **Workstream A, slice 1**: add `authorize()` helpers + `effective_org_access` view + audit table, wire into 2–3 highest-risk server fns (report publish, document read, partner opportunity write), extend the role-guard-matrix test. No UI changes. One migration. One test run. Then I stop and report before Slice A2.
