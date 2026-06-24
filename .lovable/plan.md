# Demo-to-Product Connection Audit

Make every public `/demo/*` element answer: what feature, where it lives, which role, what data, next action, available now vs. future-phase. No new private surfaces, no fake buttons, no auth changes.

## 1. Single source of truth for the mapping

Create `src/lib/demo/feature-map.ts` exporting one typed registry:

```text
DEMO_FEATURE_MAP: Record<DemoElementId, {
  element:        string   // human label shown in demo
  product:        string   // real feature name
  livesAt:        string   // signed-in route (or "future-phase")
  roles:          RoleAudience[]
  dataSource:     string   // intake | voice | document | report | ...
  nextAction:     string   // what the user does next
  status:         "live" | "partial" | "future-phase"
  notes?:         string
}>
```

One entry per demo surface: intake step, voice prompt block, doc-insight panel,
each Pathway Report section, each resource/opportunity card type, action plan,
meeting prep, calendar, each role-dashboard panel, partner workspace block,
admin hub block, and every CTA. The map drives:

- a small `<FeatureFootnote elementId="..." />` component rendered at the
  bottom of each demo panel (collapsible "Where this lives in the product"),
- a public-facing checklist at `/demo/connection` (audit-only page),
- a console-time sanity test that fails if a demo route renders an element
  whose id is missing from the map (vitest).

## 2. Per-step audit + fixes

For each route, verify every interactive element + connect to a `DemoElementId`.
Where a button is currently inert or misleading, replace with one of:
- a read-only sample state with a "Sample · sign in to act" pill,
- a clear CTA routed to `/waitlist`, `/get-started`, `/contact`, or `/pricing`,
- removal.

Routes touched:
- `demo.tsx` (overview grid)
- `demo_.intake.tsx`
- `demo_.voice.tsx`
- `demo_.documents.tsx`
- `demo_.report.tsx` + `ReportView` source chips
- `demo_.resources.tsx`
- `demo_.opportunities.tsx`
- `demo_.plan.tsx`
- `demo_.meeting.tsx`
- `demo_.calendar.tsx`
- `demo_.hub.tsx`
- `demo_.next.tsx`

No auth-gated routes added. All CTAs that suggest a signed-in action become
either `/get-started` (with explanation) or `/waitlist`.

## 3. Pathway Report source labels

Audit `ReportView` + `ReportV2Sections` to ensure every section in the user's
list has a visible source label (Student Voice, Family Priorities, Educator
Input, Document Insight, Saved Resource, Partner Opportunity, Action Item,
Meeting Prep). Add the small `<SourceChips />` row to any section missing it
(demo mode only — the signed-in report layout is untouched). Add the
"Needs Review Flags" and "What Changed Since Last Report" panels in demo
mode if absent; both already exist as data on the sample report.

## 4. Read-only safety pass

Sweep every `<Button>` / `<Link>` inside `/demo/*` for:
- `onClick` no-ops → replace with `disabled` + "Sample · sign in to act" tooltip,
- links to protected routes (`/dashboard`, `/caseload`, `/admin`, `/school/*`,
  `/district/*`, `/partners-manage`) → reroute to `/get-started?intent=<role>`
  with a tiny explainer card on `/get-started` matching `intent`.

Add a single `DemoActionPill` component to keep this consistent.

## 5. Sample-data consolidation

Confirm `src/lib/demo-data.ts` + `src/lib/demo-extras.ts` cover the named
fixtures (`sampleStudent`, `sampleStudentVoice`, ...). Add thin re-export
barrels (`src/lib/demo/index.ts`) so future contributors find one entry
point. No data rewrites — just renames + re-exports.

## 6. Internal connection checklist

Two artifacts:
- `docs/demo-feature-map.md` — generated-by-hand markdown table from the
  registry above, with the seven status columns the user listed.
- `/demo/connection` route (public, simple table) — same data, rendered for
  internal verification. No sensitive info.

## 7. Verification

- Add a vitest case `tests/unit/demo-feature-map.test.ts` asserting every
  `DemoElementId` referenced by demo pages exists in the map and has a
  non-empty `product`, `nextAction`, and `status`.
- Run: `bun run test:unit`, `bunx playwright test --project=dashboard-setup`,
  `--project=role-access`, `--project=dashboard-regression`.
- Manual signed-out walk on mobile + desktop: no inert buttons, no protected
  routes hit, role lens persists across all six steps (already shipped).

## What is explicitly NOT changed

- `src/routes/_authenticated/**`, role guards, route audiences.
- Owner / 2FA flows, dashboard test IDs, E2E setup, signed-in `ReportView`
  layout outside demo mode.
- Auth, RLS, server functions, edge functions.

## Technical notes

- Registry is plain TS, tree-shaken into each demo route via direct imports.
- `<FeatureFootnote>` uses an accessible `<details>` so it's keyboard-friendly
  and adds no JS state.
- `DemoActionPill` is a thin wrapper around shadcn `<Button variant="outline" disabled>` + tooltip.
- The vitest case statically imports demo pages — no DOM needed.
