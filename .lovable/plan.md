
# Visual polish pass — Demo, Dashboards, Report, Intake

This is a presentation-only pass. No changes to auth, RLS, routing, server functions, data models, or tests.

## 1. Shared spacing + section primitives

Add two small presentation primitives so every surface uses the same rhythm:

- `src/components/layout/PageSection.tsx` — wraps a page section with consistent vertical padding (`py-10 sm:py-14`), max width, and gutter (`px-4 sm:px-6 lg:px-8`).
- `src/components/layout/SectionHeading.tsx` — eyebrow + title + optional description with fixed spacing (eyebrow → title 8px, title → desc 8px, block → content 24px). Used everywhere below.

Design tokens already exist in `src/styles.css`; no new colors, just consistent use. Standard rhythm: page gutter 16/24/32, section gap 40/56, card padding 20/24, grid gap 16/20, heading→body 8, block→content 24.

## 2. Demo Workspace (`/demo` + `/demo/<role>`)

Goal: role dashboard preview is unmistakably the centerpiece.

`src/routes/demo.tsx`
- Tighten hero, restack role cards using `PageSection` + `SectionHeading`.
- Equalize card heights, align CTAs to the bottom of each card, remove ad-hoc margins.

`src/components/demo/role-preview/RolePreviewShell.tsx`
- Reorder to: Hero → **Dashboard preview (tool cards)** (promoted, larger heading, `SectionHeading` eyebrow "Dashboard preview" / title "What this role sees at sign-in") → Compact "At a glance" tiles moved *inside* the dashboard block as a top strip → Value strip → Tools/Actions/Outputs → Boundary → CTA → Continue tour.
- Replace inconsistent `mt-12` with `PageSection` spacing.
- Card grid: `sm:grid-cols-2 xl:grid-cols-3`, `items-stretch`, `min-w-0`.
- Fix floating pieces: hero aside becomes a proper right column at `lg:` and stacks cleanly below on mobile; CTA bar becomes a two-column grid at `sm:` (text left, buttons right, wrapping cleanly).

`src/components/demo/role-preview/DemoToolPreviewCard.tsx`
- Uniform min-height, header row uses `grid-cols-[minmax(0,1fr)_auto] shrink-0 min-w-0 truncate` per responsive-layout rules.
- Footer CTA pinned to bottom (`mt-auto`) so cards line up.

## 3. Signed-in dashboards

Apply the same rhythm without changing data or routes. For each of:
`hubs.student.tsx`, `hubs.family.tsx`, `hubs.caseload.tsx`, `hubs.school.tsx`, `hubs.district.tsx`, `hubs.partner.tsx`, and `owner.index.tsx`:

- Wrap the page in `PageSection`, use `SectionHeading` for "Overview", "Your tools", "Deeper menu".
- Ensure the overview grid (`*OverviewGrid`) uses `items-stretch` + `mt-auto` footers so previews line up.
- Add a compact "Status strip" above the tool grid (next action, unread items) using tokens already available in each grid file — no new server calls.

`ToolPreviewCard.tsx`
- Same alignment fixes as demo card (header grid, truncate, footer pinned).
- Status badge tone use unchanged.

## 4. Pathway Report (`/reports/:id` + shared components)

Goal: reads as the flagship deliverable.

`src/components/pathway/report/PathwayReportLayout.tsx` (existing)
- Add consistent section spacing (`space-y-10 sm:space-y-14`), max-width, and gutter.
- Add a slim "Report contents" sticky sub-nav on `lg:` (anchors only, no data changes).

`src/components/pathway/ReportView.tsx`, `ReportV2Sections.tsx`, `ReportV2Extras.tsx`
- Standardize section shells: eyebrow + title + divider using `SectionHeading`.
- Even card padding, uniform border radius (`rounded-3xl`), consistent shadow (`shadow-soft`).
- Fix icon/text baseline alignment (`items-center` + `shrink-0` for icons).
- Ensure the audience switcher and "Regenerate" banner align with the report gutter, not the page edge.

`src/routes/_authenticated/reports.$reportId.tsx`
- Replace hard-coded `mx-auto max-w-4xl` scatter with `PathwayReportLayout` wrapping. Welcome banner, share panel, link-to-student panel, versions panel all live inside the same gutter.

## 5. Intake (Pathway Report intake)

Files: `src/routes/_authenticated/forms.$slug.tsx`, `src/routes/_authenticated/forms.tsx`, `src/components/forms/FormRenderer.tsx`, `src/components/pathway/FormProgress.tsx`.

- Wrap intake in the same `PageSection` + `SectionHeading` primitives.
- Adopt report typography (`font-display` for step titles, `text-muted-foreground` body).
- Progress bar uses primary token; step chips use rounded-full border pattern from demo chips.
- Field groups: card shell `rounded-3xl border bg-card p-6 shadow-soft`, consistent label→input spacing (8px), help text `text-xs text-muted-foreground`.
- Primary/secondary buttons match rest of product (`Button` variants, no bare `<button>` styling).
- Friendly step intros: use existing copy, just re-wrap. No new copy invented.

## 6. Floating / alignment audit

While editing above, apply the responsive-layout pattern (grid header + `min-w-0` + `shrink-0` + `truncate`) to:
- role hero header (icon + title + badge + aside)
- report toolbar (audience switcher + regenerate + print)
- intake step header (step number + title + save state)
- dashboard tile headers

## 7. Responsive QA

For each edited surface, manually verify at 375px, 768px, 1280px via preview. Fix any horizontal overflow with `min-w-0` on flex/grid text containers.

## 8. Verification

- `bunx tsgo --noEmit`
- Unit: `bunx vitest run tests/unit/dashboard-static.test.ts tests/unit/hub-registry.test.ts tests/unit/pathway-report-body.test.tsx tests/unit/pathway-report-spine.test.tsx tests/unit/student-dashboard-render-contract.test.ts`
- Spot-check demo, one signed-in dashboard, report page, intake page via Playwright screenshots at three widths.

## Out of scope

- No new data, server functions, or migrations.
- No routing changes.
- No changes to auth, RLS, tests, partner boundary rules, or generated files (`routeTree.gen.ts`, Supabase client).
- No new hero images generated unless a surface has an obvious empty visual slot; if so, one image max per surface using existing brand palette.

## Technical notes

- Only `src/components/layout/PageSection.tsx` and `SectionHeading.tsx` are new files.
- All other edits are in-place style/structure adjustments.
- Keep every existing `data-testid`, prop name, and export signature.
