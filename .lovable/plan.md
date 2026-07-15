# Implementation 2 — Deeper AI + Evidence-Backed Pathway Report

Guardrail for every slice below:
- **No new dashboard sections, cards, tiles, or blocks.** All UI lands on existing feature pages (Documents, Pathway Report, Intake, Meetings, Student Record).
- Keep current dashboard layouts, Workspace section, feature cards, route structure, role permissions, and route/dashboard-regression tests intact.
- Preserve RLS, student-scoped access, and role-based storage rules on every change.
- Every slice ends with `bun run test:unit` + relevant Playwright projects green.

---

## Slice A — Document Classification & Review Metadata

**Goal:** Uploaded documents can be tagged, classified, and tracked as "reviewed / used in report".

**Backend**
- Migration: add columns to `public.documents` — `doc_type` (enum: iep, evaluation, report_card, assessment, meeting_notes, transition_assessment, service_plan, accommodation_record, other), `reviewed_at`, `reviewed_by`, `used_in_report_at`. Backfill existing rows to `other`.
- RLS policies unchanged — new columns inherit existing student-scoped policies. Add explicit `GRANT` refresh only if needed.
- Server fns in `src/lib/documents/documents.functions.ts`: `classifyDocument({id, doc_type})`, `markDocumentReviewed({id})`, both `.middleware([requireSupabaseAuth])` + `can_edit_student` check.

**Feature page**
- Document Detail / Document Upload page: dropdown to set `doc_type`, "Mark reviewed" button, visible reviewed/used badges.
- Zero dashboard changes.

**Tests**
- Unit: doc_type enum coverage; reviewed timestamp set.
- RLS: non-editor cannot classify/mark reviewed.

---

## Slice B — Evidence Extraction Pipeline (backend-only)

**Goal:** Convert uploads + notes + intake answers into structured `report_evidence_links` rows so the Pathway Report can cite them.

**Backend**
- Server fn `extractEvidenceFromDocument({document_id})`: pulls text (best-effort — text/plain, PDF text layer via existing helper if available; else metadata only), asks Lovable AI (`google/gemini-3-flash-preview`) with a strict Zod schema to emit `{ section, snippet, confidence }[]` where `section` ∈ pathway report sections.
- Persist extractions into existing `report_evidence_links` with `source_kind='document'`, `confidence`, `snippet` (add these columns via migration).
- Same extractor callable for intake answers (`source_kind='intake'`) and meeting notes (`source_kind='meeting_note'`).
- Idempotent: unique on `(student_id, section, source_kind, source_id, snippet_hash)`.
- Prompt-injection hardening reused from `ai-assist.functions.ts` (sanitize + delimit user content, ignore embedded instructions).

**No UI in this slice.** Triggered from Slice A's "Mark reviewed" and from Slice C's report builder.

**Tests**
- Unit: schema validation rejects filler / empty snippets.
- Unit: dedupe on re-run.

---

## Slice C — Evidence-Aware Pathway Report Generation

**Goal:** Report generation consumes evidence links and distinguishes confirmed evidence vs AI recommendation vs user input.

**Backend**
- Update `generatePathwayReport` server fn to:
  1. Load all `report_evidence_links` for the student.
  2. For each report section, pass the linked evidence snippets into the prompt as `<<<EVIDENCE>>>` blocks.
  3. Ask model to emit per-section `{ summary, recommendations[], sources: [{kind, id, snippet}], missing_evidence: string[], follow_up_questions: string[] }`.
  4. Validate with Zod; reject/regenerate if a section's `summary` is empty or generic (min length + banned-phrase list: "consider working on", "it is important to").
- Sections covered: strengths, preferences_interests, academic_snapshot, transition_assessment, postsecondary, education_training, employment_career, independent_living, services_supports, next_steps, meeting_questions, evidence_used, missing_evidence, role_followups.
- Two output tones per section: `family_plain` + `professional`.

**Feature page**
- Pathway Report page: render new sections with source chips ("From IEP.pdf", "From intake"), "Missing evidence" callouts, and follow-up questions inline. Existing review-before-publish flow stays.

**Tests**
- Unit: weak input → produces follow-up questions, not filler.
- Unit: source chips render from `sources[]`.
- Unit: schema rejection path.

---

## Slice D — Signed-in Feature-Page Integration

**Goal:** Wire Slices A–C into the feature pages users actually visit; nothing on dashboards.

- Document Upload: after upload, offer "Classify + extract evidence now".
- Intake Review: "Extract evidence from these answers" button.
- Meeting Follow-up: "Extract evidence from meeting notes" button.
- Pathway Report Builder: "Regenerate with latest evidence" button + a read-only "Evidence used / missing" side panel on the report page itself (not a dashboard tile).

**Tests**
- Playwright role-access: educator can trigger extraction on own caseload student; parent cannot on non-related student.
- No new dashboard test IDs; existing `dashboard-regression` snapshot unchanged.

---

## Slice E — Demo-Safe Sample Data Mirror

**Goal:** Demo reflects the deeper output without exposing protected routes.

- Extend `src/lib/report-evidence/fixtures.ts` with richer sample evidence + sample generated report body.
- Update `/demo/report` and `/demo/documents` pages to render the new sections/badges from fixtures only.
- No changes to `/demo` dashboard grid.

**Tests**
- Unit: demo fixtures conform to Slice C's Zod schema (contract test).
- Playwright demo-signed-out: fixtures render, no protected route link introduced.

---

## Rollout order & sizing

| Slice | Size | Depends on |
|---|---|---|
| A — Document classification | S | — |
| B — Evidence extraction | M | A |
| C — Report generation upgrade | L | B |
| D — Feature-page wiring | M | A, B, C |
| E — Demo mirror | S | C |

Ship one at a time; confirm acceptance before moving on. Say "start Slice A" (or another) to begin.
