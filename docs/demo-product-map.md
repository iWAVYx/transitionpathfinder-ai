# Demo ↔ Product Map (Phase 0 Audit)

Purpose: a single sheet that connects every Demo step and every Pathway Report
section to the real product surface behind it. Used to plan Phase 1–4 of the
"Deepen Demo + Pathway Report" effort without creating duplicate or orphan
sections. Companion to `src/lib/demo/feature-map.ts` (machine-checked) and
`docs/demo-feature-map.md` (human checklist).

> Legend — **Depth**: how complete the real product surface is today.
> `solid` = production-ready · `thin` = exists but shallow · `gap` = demo
> shows it, product doesn't yet · `n/a` = marketing-only surface.

---

## A. Demo Walkthrough Steps (`/demo/*`)

| # | Demo step | Provided by | Saved to | Consumed by | Visible to | Output to user | If missing | Depth | Phase |
|---|-----------|-------------|----------|-------------|------------|----------------|-----------|-------|-------|
| 1 | **Intake** (`/demo/intake`) | Student, Parent, Educator | `student_intakes`, `students`, `student_strengths_needs` | Report §Snapshot, §SPIN, §Family Priorities, §Recommended Supports; Dashboard NBA | Owner + collaborators; partners blocked | Filled profile + readiness baseline | Report shows placeholders, NBA prompts to finish intake | thin (chronology + comm/transport/services/outcomes/deadlines missing) | **1** |
| 2 | **Hub** (`/demo/hub`) | n/a (role lens preview) | — | — | All roles | Sample of role-specific dashboard | n/a | solid | — |
| 3 | **Documents** (`/demo/documents`) | Educator, Parent | `documents`, `document_extractions`, `document_summaries` | Report §Document-Based Insights, §Present Levels, §Goals | Owner + collaborators with `can_view_document`; **never partners** | Source-labeled chips populating report fields (review-before-accept) | Report § hidden; banner: "Add IEP / transition assessment to enrich" | thin (only IEP extraction wired; need doc-type tagging + multi-doc fan-out) | **2** |
| 4 | **Voice** (`/demo/voice`) | Student | `student_voice_responses` | Report §Student Voice, §Vision, §Self-Advocacy Readiness | Student + collaborators; partners blocked | Quoted answers + "How this shapes recommendations" | Voice § shows prompts only | thin (5 prompts; need 10 covering independence, advocacy, comfort) | **3** |
| 5 | **Report** (`/demo/report`) | All inputs above | `pathway_reports` (JSONB `content`, versioned) | Family / school sharing, meeting prep, plan, calendar | Audience views: Student / Family / Educator; share tokens scoped | The flagship deliverable | Skeleton sections with "needs input" banners | thin (missing Exec Summary, Self-Advocacy Readiness, Independent Living Readiness, Source Notes, Role-specific Next Steps) | **4** |
| 6 | **Plan** (`/demo/plan`) | Educator + family from report | `action_items` (owner, due, status) | Dashboard NBA, Calendar | Owner + collaborators | 30/60/90 timeline with owners & success criteria | "Generate plan from report" CTA | solid | — |
| 7 | **Meeting** (`/demo/meeting`) | Educator, Parent | `meetings`, `meeting_prep_items`, `meeting_agenda_items`, `meeting_questions`, `meeting_action_items` | Calendar, Report §Meeting Prep | Owner + collaborators; partner block | Agenda, questions, partner-suggestion list | Empty agenda | thin (no read-only minutes capture; partner suggestions ok) | 3/4 |
| 8 | **Resources** (`/demo/resources`) | System (matched) | `resources`, `saved_resources`, `student_resource_recommendations` | Report §Recommended Supports | All roles (partner sees only public) | Matched cards with rationale | Generic library | solid | — |
| 9 | **Opportunities** (`/demo/opportunities`) | Partners publish | `partner_opportunities`, `partner_network_opportunities` | Report §Partner Opportunities | All roles; partners see public + matched interest, **never PII** | Match cards + opt-in intro | Generic directory | partial (intro request flow future-phase) | 4 |
| 10 | **Calendar** (`/demo/calendar`) | All; auto from milestones | `calendar_events` | Dashboard, meeting prep | Owner + collaborators | Month/agenda views, ICS export | Empty calendar | solid | — |
| 11 | **Next** (`/demo/next`) | n/a | — | — | All | What to try next | n/a | solid | — |

### Cross-cutting

- **Auth/2FA + Role gates** — untouched in this effort.
- **Partner privacy** — `documents`, `student_intakes`, `student_voice_responses`, `pathway_reports` all have policies that exclude `partner`; verified by `tests/rls-pii-access.test.mjs`. Phase 2/3/4 must not introduce new SELECTs to `anon` or `partner` on these tables.
- **District/School aggregation** — district sees aggregates by default (`docs/qa/phase-5-role-permissions-audit.md`); demo must not show raw IEPs at district scope.
- **Grade band branching** — 6–8 → BridgeForward block; 9–12 → TransitionForward block; logic already in `pathway-v2.ts`.

---

## B. Pathway Report Sections (`ReportView` + `ReportV2Sections`)

| Section | Inputs (table → field) | Audience framing | Status | Phase to deepen |
|---------|------------------------|------------------|--------|------------------|
| Executive Summary | derived from snapshot+voice+docs | All views; framing differs | **missing** | 4 |
| Student Snapshot | `students`, `student_intakes` | All | solid | — |
| Student Voice | `student_voice_responses` | Student leads; family/educator see context | thin → expand to 10 prompts | 3 |
| Family Priorities | `student_intakes.family_*` (new) | Family leads; educator informational | thin → add hopes/concerns/comm/transport/consent | 3 |
| Educator / Case-Manager Insights | `meeting_prep_items`, `goals`, `goal_statuses`, `student_intakes.educator_*` | Educator leads | thin → add WBL/self-advocacy/attendance | 3 |
| Strengths & Interests | `student_strengths_needs` | All | solid | — |
| Current Supports | `student_intakes.services_received` (new) | All | gap | 1 |
| **Document-Based Insights** | `document_extractions`, `document_summaries` (with source label) | All; review-before-accept | thin | 2 |
| Academic Readiness | `readiness_scores`, document extracts | Educator/School lead | partial | 4 |
| **Self-Advocacy Readiness** | voice + readiness | Student/Family lead | **missing** | 4 |
| **Independent Living Readiness** | intake + voice | Student/Family lead | **missing** | 4 |
| Career & Postsecondary Direction | intake + voice + pathways | Student/Family lead | solid | — |
| BridgeForward Pathway (6–8) | `bridgeforward_profiles`, snapshots | Student/Family lead | solid | — |
| TransitionForward Pathway (9–12) | `pathway_recommendations` | All | solid | — |
| Recommended Supports | resources, services | All | solid | — |
| Partner / Community Opportunities | `partner_opportunities` (filtered) | Family/Educator; **partner sees own only** | partial | 4 |
| Questions to Bring to the Team | `meeting_questions` | Family/Student lead | solid | — |
| Meeting Preparation | `meetings`, `meeting_agenda_items` | Educator lead | solid | — |
| 30 / 60 / 90 Day Action Plan | `action_items` | Family/Educator lead | solid | — |
| Longer-Term Roadmap | derived | All | partial | 4 |
| **Role-Specific Next Steps** | derived per audience | Each view shows its own | **missing** | 4 |
| **Source Notes / Information Used** | document refs + intake timestamps | All; transparency block | **missing** | 4 |
| Version History | `pathway_report_versions` | Educator | partial | — |

---

## C. Role Value Summary

| Role | Reason to use | Demo step that proves it |
|------|---------------|--------------------------|
| Student | Self-knowledge, voice in plan, next steps | Voice → Report (Student view) → Plan |
| Parent/Guardian | Family priorities heard, doc questions, action items | Intake (family) → Documents → Report (Family view) → Meeting |
| Educator/Case Manager | Organize PPT, doc review, services, plan | Documents → Educator inputs → Report (Educator view) → Meeting |
| School Admin | Caseload readiness, compliance support | Hub (school) — aggregates only |
| District Admin | Program-level readiness & service gaps | Hub (district) — aggregates only |
| Partner | Manage opportunities; **no PII** | Opportunities, Hub (partner) — own org scope |
| Owner/Admin | Platform ops | (out of demo scope) |

---

## D. Schema Gaps Identified (drives Phase 1 migration)

Additive only — no destructive ALTERs.

1. `student_intakes`: new nullable columns
   - `communication_prefs jsonb`
   - `transportation_needs text`
   - `family_priorities jsonb`
   - `family_concerns text`
   - `student_worries text`
   - `services_received jsonb`
   - `desired_postsecondary_outcomes jsonb`
   - `upcoming_meetings jsonb`
2. `document_extractions`: add `doc_type text` + `source_label text` (helps Phase 2 source chips).
3. New table `report_source_notes` (per-report-version provenance) — only if Phase 4 work needs it; revisit then.

All new columns: nullable, no default that would change existing rows. GRANTs unchanged (the table already grants `authenticated`). RLS unchanged.

---

## E. Test Surface to Re-Run Each Phase

- `bunx vitest run` (must stay green)
  - `tests/unit/demo-feature-map.test.ts`
  - `tests/unit/dashboard-static.test.ts`
  - `tests/rls-pii-access.test.mjs`
  - `tests/documents-rls.test.mjs`
- Playwright (selective by phase):
  - `tests/e2e/demo-contrast.spec.ts`
  - `tests/e2e/report-a11y.spec.ts`
  - `tests/e2e/dashboard-regression.signedin.spec.ts`
  - `tests/e2e/role-access-rules.signedin.spec.ts`
  - `tests/e2e/demo-roles.signedin.spec.ts`

---

_Last updated: Phase 3 of "Deepen Demo + Pathway Report" — Voice prompts expanded from 7 → 10 per student (independence, advocacy, comfort) and intake step now surfaces family priorities + educator inputs as first-class sections._
