# Deepen Demo + Pathway Report — Phased Plan

This is a large, multi-system effort. To keep it safe (no regressions to auth, 2FA, role access, dashboard test IDs, demo/dashboard routing, partner privacy, document RLS), I'll ship it in **5 sequenced phases**, each landing as its own turn with build + targeted tests before moving on.

## Phase 0 — Audit & Product Map (this turn, after approval)

Deliverable: `docs/demo-product-map.md` + extend `src/lib/demo/feature-map.ts`.

For every demo step + every Pathway Report section, capture:
- What the user provides · Which role · Where it's saved (table) · Which report/dashboard section consumes it · Who can view/edit · Output to user · Missing-data behavior · Demo sample shown.

Used to prevent duplicate/orphan sections in later phases. No UI change.

## Phase 1 — Intake Depth (real product + demo)

Real product (`/_authenticated/intake/*`, `student_intakes`, `student_strengths_needs`, `student_voice_responses`):
- Reorganize intake into chronological chapters: Profile → Context & Supports → Strengths/Interests → Academic/Independence/Communication/Transport → Family Priorities → Worries/Barriers → Services → Desired Outcomes → Upcoming Meetings.
- Add missing fields (communication prefs, transport, family priorities, worries, services received, desired postsecondary outcomes, upcoming deadlines) — additive columns, never break existing.
- Add per-question "why this matters → feeds X in your Pathway Report" microcopy.

Demo (`/demo/intake`): mirror new chapters with Jordan/Maya sample data; keep test IDs.

Migration: additive columns + GRANTs; existing RLS unchanged.

## Phase 2 — Documents → Report Insights

Real product:
- In intake, add a "Planning Documents" step listing accepted doc types (IEP, transition assessment, report cards, transcripts, psychoed eval, work samples, attendance, behavior plan, interest inventory, agency docs).
- Reuse existing `IepUpload` extraction pipeline + `documents` / `document_extractions` tables; broaden to doc_type tag.
- Extracted fields routed into report as **review-before-accept** chips with source label ("From: Jordan's IEP, p.3").
- Confirm RLS: `documents` policies + `can_view_document` already block partners — verify with existing snapshot tests, do not loosen.

Demo: `/demo/documents` shows sample uploaded docs + extracted insights with source chips; partner role view hides them.

## Phase 3 — Voice + Family + Educator Inputs

- **Student Voice**: expand `DEMO_VOICE` prompts to the 10 listed; add same prompts to real product voice form.
- **Family input**: new section in intake/family hub for long-term hopes, concerns, home observations, support priorities, comm prefs, school-team questions, transport/independence concerns, consent prefs.
- **Educator input**: meeting-prep form gains present levels, services, accommodations, progress, WBL readiness, self-advocacy readiness, attendance notes, planning concerns, recommended next steps.

Each input visibly feeds a named Report section (chip linking input → report).

## Phase 4 — Pathway Report Expansion + Demo Polish

`ReportView` + `ReportV2Sections`:
- Add/strengthen sections: Executive Summary, Document-Based Insights, Self-Advocacy Readiness, Independent Living Readiness, Source Notes, Role-Specific Next Steps.
- Keep three views (Student/Family/Educator) — same data, different framing.
- Grade-band branching: 6–8 → BridgeForward block; 9–12 → TransitionForward block (existing logic preserved).
- UI: Title Case headings everywhere, smaller TOC, more whitespace, equal-size tiles, images where they aid comprehension, less boxy.

Demo Overview (`/demo`): re-sequence the 11 steps to match the new real flow; each step card shows the **input → output** value.

## Phase 5 — Validation

- `bunx vitest run` (unit incl. `demo-feature-map.test.ts`, `dashboard-static.test.ts`, RLS snapshots).
- Targeted Playwright: `demo-contrast`, `report-a11y`, `dashboard-regression`, `role-access-rules`, `demo-roles.signedin`.
- Fix root causes, never weaken tests. Confirm partner role still blocked from docs/PII.

---

## Technical guardrails (non-negotiable)

- No edits to: `src/integrations/supabase/{client,client.server,auth-middleware,auth-attacher,types}.ts`, `_authenticated/route.tsx`, dashboard test IDs, demo route filenames, `routeTree.gen.ts`.
- All new tables/columns: migration with `GRANT` + RLS + policies in same migration. Partners get **zero** SELECT on student PII/documents.
- All new server fns use `requireSupabaseAuth`; admin client only inside handlers via `await import`.
- Additive schema only — no destructive ALTERs on existing intake/report columns.

## Scope this turn

After you approve, I'll execute **Phase 0 (audit/map)** and **Phase 1 (intake depth)** in the same turn, then pause for review before Phase 2. That keeps each shipped change reviewable and keeps regression risk bounded.

Reply **approve** to proceed, or tell me to reorder/trim phases (e.g. "skip the schema additions, demo-only").
