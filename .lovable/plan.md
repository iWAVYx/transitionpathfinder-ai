# Dashboard Functionality, Polish & Interaction Pass

Scope: Student, Parent/Guardian, Educator/Case Manager, School Admin, District Admin, Partner, Platform Admin — plus the matching `/demo/*` and Transition Workspace previews. Build on the current dashboard system; nothing structural gets ripped out.

## Working Principles

- Reuse existing components (`SiteShell`, `HubShell`, `StageJourneyCard`, dashboard tiles, `ReportView`, existing readiness/opportunity cards). Add new components alongside; don't replace.
- Title Case for headings/tiles/tabs (via `src/lib/title-case.ts`); sentence case for descriptions.
- Every new effect: `prefers-reduced-motion` respected, non-animated fallback, no layout shift, keyboard-reachable, works down to ~360px.
- Semantic tokens only (no raw hex / `text-white` / `bg-black`). Reuse `animate-fade-in`, `animate-scale-in`, `hover-scale`, plus 1–2 new keyframes added to `src/styles.css` (`milestone-glow`, `status-pulse`).
- Demo previews import the same real components with sample props — no parallel demo-only UIs.

## Phase A — Shared Foundation

1. `src/styles.css`: add `@keyframes milestone-glow`, `status-pulse`, `pipeline-slide`; wrap all new keyframes in `@media (prefers-reduced-motion: no-preference)`.
2. `src/components/effects/` (new): `MotionSafe.tsx` helper (renders animated child only when motion allowed, falls back to static), `AnimatedCounter.tsx` (count-up with intersection observer + reduced-motion static value), `ProgressRing.tsx` (SVG ring with animated stroke-dashoffset).
3. `src/lib/back-to-dashboard.ts`: tiny helper returning the correct dashboard path per role (used by feature-page "Back To Dashboard" buttons).

## Phase B — Per-Role Interactive Feature

Each role gets ONE signature effect tied to a real feature, plus a functionality/polish sweep on the surrounding dashboard tiles.

### Student — Animated Pathway Timeline
- New: `src/components/pathway/PathwayTimeline.tsx` — vertical/horizontal timeline of pathway steps (`explore → prepare → apply → transition → thrive`). Completed step = check with `milestone-glow`; current step = `status-pulse`; hover/focus opens a popover with the step's next action and links into the Pathway Report section.
- Wire into: `pathway.student.tsx`, `hubs.student.tsx`, `demo-mode.tsx`, `demo_.student.tsx`.

### Parent / Guardian — Document Readiness Meter + Meeting-Prep Progress
- New: `src/components/documents/DocumentReadinessMeter.tsx` — `ProgressRing` fed by existing `MissingDocumentsChecklist` state; animated fill; drag-over highlight if upload dropzone present.
- Extend `PreMeetingChecklist` with animated stroke-through + progress bar as items toggle.
- Wire into: `documents.tsx`, `ppt-prep.tsx`, `pathway.family.tsx`, `demo_.family.tsx`, `demo_.documents.tsx`, `demo_.meeting.tsx`.

### Educator / Case Manager — Readiness Heatmap
- New: `src/components/dashboard/ReadinessHeatmap.tsx` — grid of caseload × readiness domains, cells colored by severity (`bg-destructive/20 → bg-primary/20`), urgent gaps pulse. Click cell → expands severity + intervention + owner + status (reuses `ReadinessInterventionCell`).
- Wire into: `caseload.tsx`, `educator.readiness-gaps.tsx`, `demo_.educator.tsx`.

### School Admin — Implementation Completion Rings
- New: `src/components/implementation/CompletionRingsBoard.tsx` — one `ProgressRing` per grade/caseload cluster from existing rollout data; hover reveals blocker list.
- Wire into: `school.implementation.tsx`, `school.overview.tsx`, `demo_.school-admin.tsx`.

### District Admin — School Comparison Chart
- New: `src/components/district/SchoolComparisonChart.tsx` — animated horizontal bar chart of readiness % by school with hover tooltip (student count, top gap, trend arrow). Sort by name / readiness / trend.
- Wire into: `district.readiness-trends.tsx`, `district.overview.tsx`, `demo_.district-admin.tsx`.

### Partner — Pipeline Kanban
- Promote existing `OpportunityLifecycleTracker` data into `src/components/partner/OpportunityPipelineBoard.tsx` — columns Saved / Contacted / Applied / Enrolled / Not A Fit. Cards animate between columns using FLIP (measure → animate transform). Impact counters use `AnimatedCounter`.
- Wire into: `partners-manage.impact.tsx`, `partners-manage.opportunities.tsx`, `demo_.partner.tsx`.

### Platform Admin — Launch Readiness Command Center
- New: `src/components/platform/LaunchReadinessBoard.tsx` — checklist grouped by (Data, Access, Comms, Compliance) with `status-pulse` on Attention items, `ProgressRing` for overall readiness, hover reveals risk description + owner.
- Wire into: `hubs.admin.tsx`, existing `/admin` overview, `demo_.owner.tsx`.

## Phase C — Functionality Sweep (per dashboard)

For each role dashboard:
- Verify every tile links to a live feature route (audit against `ROUTE_AUDIENCES`); fix any dead/duplicate links.
- Ensure each feature page has: Current Status pill, Next Best Step callout, Primary Action button, empty / loading / error states, Back To Dashboard link (via new helper), and (where relevant) a link to the Pathway Report.
- Strengthen shallow features where quick wins land in this pass:
  - Calendar: month / week / agenda view switcher (tabs).
  - Action Items: status + owner + due + source + related goal columns; sortable.
  - Readiness Gaps: severity / intervention / owner / status columns; filter tabs.
  - Opportunities: fit criteria, dates, accessibility supports, review status chips.

## Phase D — Polish Pass

- Normalize section spacing (`space-y-6` on dashboard grids, `gap-4` on tile grids).
- Enforce Title Case on headings via `titleCase()`; audit tile titles, tabs, section labels.
- Consistent status badges (reuse `Badge variant="outline"` with semantic color classes).
- Responsive: apply the `grid-cols-[minmax(0,1fr)_auto] sm:flex` header pattern from the responsive-layout rules to any header row that currently wraps oddly.
- Remove duplicate links inside `<main>` (audit each role dashboard).

## Phase E — Demo Preview Parity

- Each new component accepts a `sample` prop / demo dataset so `demo_.*` routes render the identical effect with safe sample data.
- No new demo-only widgets — demo routes import the same components used in signed-in dashboards.

## Phase F — Verification

Run in order:
```
bun run test:unit
bunx playwright test --project=dashboard-setup
bunx playwright test --project=dashboard-regression
bunx playwright test --project=role-access
```
Fix regressions surfaced by unit tests (dashboard render contract, tile destinations, hub registry, demo feature map). Playwright regressions get triaged — visual diffs updated only if intentional.

## Out Of Scope

- No RLS, migration, or auth changes.
- No new backend tables or server functions.
- No new top-level routes beyond what already exists.
- No changes to `src/integrations/supabase/*` or `.env`.

## Deliverables

- ~12 new components under `src/components/{effects,pathway,documents,dashboard,implementation,district,partner,platform}/`.
- Edits to ~20 existing route files to wire in the effects, tighten CTAs, and add Back To Dashboard.
- CSS additions in `src/styles.css` for the three new keyframes.
- Green unit tests; triaged Playwright results.
