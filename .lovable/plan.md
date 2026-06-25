# Strengthening Product Value Across TransitionForward

Goal: make every section answer "what problem does this solve, what decision does it support, what's the next step?" — not just look polished.

## Foundations (shared)

1. **`src/lib/value-lens.ts`** — single source of truth for the 7-question value test, plus a small `ValueCallout` type:
   ```ts
   { whatThisMeans, whyItMatters, recommendedNextStep, questionsForTeam, informationUsed[] }
   ```
   Every report section and dashboard card consumes this shape so the language stays consistent.

2. **`src/components/value/ValueCallout.tsx`** — compact, editorial callout block with 5 labeled rows (What This Means / Why It Matters / Recommended Next Step / Questions To Bring / Information Used). Used in both the Pathway Report and dashboards. Keeps tone warm + plain, ≤ 2 sentences per row.

3. **`src/components/value/RoleValueStrip.tsx`** — per-role one-line "why this page matters to you" strip used at the top of each dashboard and demo step. Driven by a `ROLE_VALUE` map keyed by role.

## Pathway Report — decision-supportive layer

Edit `src/components/pathway/ReportView.tsx` and `ReportV2Sections.tsx`:

- Add a **"Where Things Stand"** opener directly under the cover: 4 short cards — Where the student is now / What the student wants / Supports in place / Gaps still open. Pulled from existing intake, voice, goals, readiness, and document_extractions data — no new data.
- After each existing chapter (Self-Determination, Education/Training, Employment, Independent Living, Community), append a `<ValueCallout>` populated from the chapter's own content + `informationUsed` source chips already wired via `SourceChips`.
- Add a closing **"Bring To The Team"** chapter that aggregates `questionsForTeam` across chapters into a single printable checklist with owner suggestions (student / family / case manager / partner) and a "revisit by" date hint derived from `review_date`.
- Replace generic "Next Steps" prose with `RecommendedNextStep` rows that include an explicit owner and timeframe.

No schema changes. All new content derives from data already loaded.

## Demo Workspace — sample planning story

Edit demo routes (`demo.tsx`, `demo_.intake.tsx`, `demo_.documents.tsx`, `demo_.voice.tsx`, `demo_.report.tsx`, `demo_.opportunities.tsx`, `demo_.plan.tsx`, `demo_.meeting.tsx`) and `src/components/site/DemoStepBar.tsx`:

- Each step gets a short **"In this step"** header: the question it answers, the role(s) it helps, the inputs, and the output. Rendered via `RoleValueStrip` + a one-line story beat (e.g. "Maya's family uploads her IEP — TransitionForward extracts goals and surfaces gaps before the next PPT.").
- Add a slim **story progress trail** in `DemoStepBar` showing how each step's output feeds the next (Intake → Documents → Voice → Report → Opportunities → Plan → Meeting).
- The Demo Hub (`demo.tsx`) opens with a "The Planning Problem" → "What Changes With TransitionForward" framing instead of feature tiles.
- Reuse existing fixtures; no new sample data files.

## Role dashboards — command centers

Each dashboard gets a `RoleValueStrip` at top + a reorganized **"What To Do Next"** block built from existing signals (intakes, readiness_scores, goals, meetings, action_items). No new tables.

- `src/routes/_authenticated/dashboard.tsx` (family) — surface: organized concerns, documents to upload, priorities, meeting prep, follow-through items.
- `src/components/dashboard/StudentDashboard.tsx` — strengths / interests / goals / supports / next steps in motivating language.
- `src/routes/_authenticated/caseload.tsx` (educator) — readiness gaps, doc insights, upcoming meetings, action items not yet owned.
- `src/routes/_authenticated/school.overview.tsx` — caseload load, service gaps, planning consistency rollups (counts only, no PII beyond existing surface).
- District overview (existing district route) — program-level readiness + partner gap signals.
- `src/routes/_authenticated/partner/*` (existing partner surfaces) — opportunity posting health, PartnerForward incentives, "how to support pathways" without student PII.
- Owner hub (`src/routes/_authenticated/owner.tsx` children) — waitlist, users, contacts, partner readiness, demos, ops — grouped into 4 plain-language sections.

## Tests

- `tests/unit/value-lens.test.ts` — every role and every report chapter has a non-empty `ValueCallout`.
- Extend `tests/e2e/demo-signed-out.spec.ts` to assert each demo step renders its "In this step" strip and a `ValueCallout` in the report.

## Out of scope

- No DB schema changes, no new AI server functions, no new fixtures.
- Visual system stays as-is (`.demo-shell`, `.report-shell`, editorial tokens). This pass is about meaning and structure, not new styling.
- Auth, RLS, and role-guard behavior unchanged.

## Acceptance

- Every report chapter and every dashboard card answers the 7 value questions in plain language.
- Demo tells a connected Intake→Report→Action story end-to-end.
- Each role's landing surface opens with a one-line "why this page matters to you" and a concrete next action.
