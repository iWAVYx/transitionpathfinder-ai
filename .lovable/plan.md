
# Rebuild: Premium Interactive Pathway Workbook

Replaces the current Demo Workspace + Pathway Report presentation with one shared "Pathway Issue" reader. Same data, same routes, same role rules, same test IDs — new experience model and presentation layer only.

## Direction (locked from your picks)

- Reader model: One page at a time. Prev/Next + table-of-contents drawer + progress indicator. No long stacked pages.
- Palette: Ocean Deep — `#0c2340` (ink), `#1a4a6e` (deep), `#2d8a9e` (accent), `#5cbdb9` (mint), on warm off-white `#f7f5f0` paper. No gradients, no decorative blobs, no fake page curls.
- Type: Instrument Serif (display only, restrained), Urbanist (UI/body). Generous line length, calm hierarchy, Title Case throughout.

## What gets built

### 1. Shared reader shell (new)

`src/components/workbook/` — one reader used by demo, signed-in report, and `/share/$token`:

- `WorkbookReader.tsx` — page-at-a-time controller, keyboard arrows, URL `?page=` deep links, prev/next, progress bar, TOC drawer, print mode hooks.
- `WorkbookCover.tsx`, `WorkbookPage.tsx`, `WorkbookSpread.tsx`, `WorkbookTOC.tsx`, `WorkbookFooter.tsx` — page primitives.
- `WorkbookPrimitives.tsx` — `SectionHeader`, `Kicker`, `PullQuote`, `Callout`, `Sidebar`, `Checklist`, `ReadinessBar`, `TimelineRow`, `EvidenceRow`, `ActionRow`, `QuestionGroup`, `RoleTabs`.

### 2. Page-specific layouts (one per chapter, not repeated)

Cover · Welcome / How To Use · Table Of Contents · Student Snapshot · Intake And Starting Point · Student Voice · Family Priorities · Educator Insights · Documents And Evidence · Readiness Profile · Pathway Roadmap (BridgeForward or TransitionForward by grade band) · Questions For The Team · 30/60/90 Day Plan · Role-Specific Views · Next Steps.

Each layout is purpose-built — profile spread, quote feature page, evidence list, readiness bars, timeline, action grid, etc. No repeated white cards.

### 3. Demo wiring

- `/demo` becomes the workbook cover + TOC for sample student Maya.
- Existing `demo_.*` step routes become thin redirects to `/demo?page=<slug>` so old links keep working and tests pass.
- Sample data continues to come from `getDemoStudent` / `EXTENDED_PLANS`.

### 4. Signed-in + share wiring

- `_authenticated/reports.$reportId.tsx` renders `<WorkbookReader />` with real `PathwayReport` data.
- `/share/$token` uses the same reader with the resolved audience pinned.
- `ReportView.tsx` is kept as a thin adapter (maps existing data shape into workbook pages) so role tests, 2FA flows, and `data-testid`s stay intact.
- Existing `downloadMagazinePdf` print mode is replaced by a workbook print mode: each chapter = a printed page, Ocean Deep ink on paper, color-exact accents.

### 5. Visual system

- New `.workbook-*` CSS layer in `src/styles.css` scoped to `.workbook-shell`. Removes/supersedes the `.eh-*` and `.mag-*` layers used by the old reader.
- Tokens: paper, ink, deep, accent, mint, rule, mute. Single rule weight, single radius, single shadow.
- No animations beyond a 120ms cross-fade on page change.

## Preserved (non-negotiable)

- Auth + 2FA gates, `requireSupabaseAuth`, role policy, `can_access_student`.
- All existing dashboard/report `data-testid`s and routes.
- Demo routing surface (old `demo_.*` URLs still resolve).
- BridgeForward (PK–8) vs TransitionForward (9–21) grade-band logic.
- Document signed-URL + partner privacy restrictions.
- Existing regression / access / a11y specs.

## Out of scope

- No schema changes.
- No new server functions.
- No copy rewrites beyond what the new layouts require.
- Role lens / view-as-role logic stays as today (now embedded inside the Role-Specific Views chapter, not floating on top).

## Risks & verification

- Risk: deep links into old demo step pages. Mitigation: each old route becomes a redirect to the matching workbook page.
- Risk: regression tests asserting old DOM. Mitigation: keep dashboard/report test IDs and key headings; run `tests/e2e/demo-*`, `dashboard-regression`, `role-access-rules`, `report-a11y` after build.
- Verify: build clean, `tsgo` clean, demo pages render on mobile/tablet/desktop, print preview renders chapter-per-page.

## Technical notes

- Reader state: URL `?page=<slug>` is source of truth; `sessionStorage` only for last-visited fallback.
- Pages are React components in `src/components/workbook/pages/` mapped by slug; demo and real-report variants share layout components and differ only in data adapters in `src/lib/workbook/`.
- Print mode: `body.workbook-print` class with `@page` + `break-before: page` per chapter; no special PDF library.
- Removed after migration: `MagazineReader.tsx`, `MagazinePage.tsx`, `ReportChapterPager.tsx`, `ReportPartOpener.tsx`, and the `.eh-*` / `.mag-*` CSS layers.
