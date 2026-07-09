
# TransitionForward — Product Architecture Pass

This is a large, multi-week piece of work. I want to confirm scope and sequence before I start writing code, because "do it all in one turn" would either mean shallow work everywhere or breaking things that already pass tests.

## What I'm Proposing

Ship this in **six sequential slices**, each independently reviewable, testable, and reversible. Each slice ends green (build + tests + role dashboards).

### Slice 1 — Shared Stage Model (foundation)
Create ONE source of truth: `src/lib/workspace/stages.ts` defining the nine stages (START, VOICE, FAMILY, SCHOOL, EVIDENCE, READY, ROADMAP, ACTION, CONNECT) with:
- stage id, all-caps label, Title Case title, sentence-case description
- route mapping, icon, order, applicable roles, applicable grade bands (BridgeForward 6–8 vs TransitionForward 9–12)
- Pathway Report section binding

Everything downstream (workspace nav, pathway map, prev/next, progress, report TOC, dashboard entry points) reads from this file. No parallel lists anywhere.

Unit test: every stage resolves to a real route and a real report section; no orphans.

### Slice 2 — Transition Workspace Shell
New product surface at `/workspace` (signed-in) and `/demo/workspace` (public, fictional Jordan Rivera data).

- New components in `src/components/workspace/`: `WorkspaceShell`, `StageSpine` (visual pathway, NOT tiled cards), `StageHeader` (large expressive all-caps label + sentence-case description), `StageBody`, `StagePrevNext`, `StageProgress`.
- Distinct visual language: horizontal/vertical spine with connectors, generous whitespace, warm typography — not the current tile grid.
- Delete `src/studio/` (old Pathway Studio) and any legacy demo hub/report UI it drove. Migrate remaining demo routes (`demo_.plan`, `demo_.report`, etc.) to render inside `WorkspaceShell` via stage ids.

### Slice 3 — Pathway Report Rebuild
Rebuild `/reports/$reportId` (and the demo equivalent) as the flagship deliverable. New components in `src/components/pathway/report/`:
- Sections per spec (Snapshot, SPIN, Voice, Postsecondary Goals, Recommended Pathways, Career/Life Matches, Readiness Scorecard, IEP Translator, Data Gaps, Family Plan, Educator Plan, Meeting Prep, Resources, Partner Matches, 30/90/180/365 Next Steps).
- Every section renders the four-answer pattern (What / Why / Next / Who).
- View switcher: Student view, Family view, Educator view (same data, tuned copy + depth).
- Source notes + AI disclaimer footer on every section.
- Server function extensions in `src/lib/pathway.functions.ts` to shape data per view; migration only if we need new columns on `pathway_reports.content` (JSONB, so likely none).

### Slice 4 — Role Dashboards Rebuild
Replace each role dashboard body with a Workspace-aware layout (spine + focused next-best-step + role-specific rails). Files:
- `src/routes/_authenticated/dashboard.tsx` (student + family branch)
- `src/routes/_authenticated/caseload.tsx` (educator)
- `src/routes/_authenticated/school/overview.tsx`
- `src/routes/_authenticated/district/overview.tsx`
- `src/routes/_authenticated/partners-manage/index.tsx`
- Owner stays in Admin Hub — no changes to `/admin`, verify it doesn't render the normal dashboard shell.

Preserve the existing `data-dashboard-testid` contract so the dashboard-regression suite keeps passing.

### Slice 5 — Waitlist / Pricing / Account Relationships
- `/waitlist` becomes a qualification router (family early access / educator / school pilot / district pilot / partner / grants), writing typed intent into `waitlist` table (already 42 cols — likely no migration).
- `/pricing` reflects the five billing tiers with clear "who pays for whom" copy.
- `/get-started` distinguishes waitlist vs invited signup.
- Audit `organization_memberships` + `access_entitlements` + `has_active_entitlement` — no schema changes expected, but wire `use-entitlement` into dashboards so a student covered by a district license doesn't see a paywall.

### Slice 6 — Resources + Partner Network Polish
- Resource Library filter facets bound to shared stage model (grade band, stage, readiness area, role, BF/TF).
- Partner surfaces audited: partner role has zero read paths to `students`, `documents`, `goals`, `student_voice_responses`, `pathway_reports`, `meetings`, `collaboration_notes`. Add RLS regression test if one doesn't exist.

## Technical Notes

- Shared stage model is the linchpin — Slices 2–6 all import from it.
- Visual direction: **spine + narrative**, not tiles. StageSpine renders a connected path (SVG connectors) with stage markers; the active stage expands into a full-bleed narrative panel. This is the "unique TransitionForward visual experience" the prompt asks for, and it's the same primitive on demo, workspace, report TOC, and dashboards.
- No new tables anticipated; if any slice needs one I'll surface a migration for approval before writing app code against it.
- Every slice ends by running: `bun run build`, `bunx vitest run`, `bunx playwright test tests/e2e/dashboard-regression.signedin.spec.ts tests/e2e/role-access-rules.signedin.spec.ts`. No test weakening.
- Owner Hub explicitly excluded from dashboard rebuild.

## What I Need From You Before I Start

Two decisions:

1. **Sequence** — ship Slice 1 first and pause for your review of the stage model + visual direction (recommended, ~1 turn), or push straight through 1→2 so you can see the workspace shell rendering (larger turn, harder to course-correct)?
2. **Legacy demo routes** — okay to delete `src/studio/` and collapse the `demo_.*` routes into `/demo/workspace/$stage`? This is the cleanest way to avoid "patching old UI" but it will change URLs. I'd add redirects from the old demo URLs.

Once you answer those two, I'll start with Slice 1.
