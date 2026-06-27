## Navigation Architecture Rebuild — Publication & Workbook Experience

### Problem

Today the demo workspace and Pathway Report each carry **five disconnected navigation models**:

1. `src/lib/publication/chapters.ts` — 8 pathway milestones (used by `PathwaySpine`)
2. `src/lib/demo-chapters.ts` — 11 chapter meta records (numerals, dek, covers)
3. `src/components/site/DemoStepBar.tsx` — `DEMO_STEPS` (11 routes for tests/footnote)
4. `src/components/site/MagazineReader.tsx` — `MAGAZINE_PAGES` (12 entries incl. cover, drives chrome + TOC + prev/next)
5. `src/components/pathway/ReportChapterPager.tsx` — `CHAPTERS` (12 in-report anchors)

Page counts, labels, kickers, prev/next order, and the pathway timeline drift between these lists. The timeline (`PathwaySpine`) is purely decorative — its dots don't navigate.

### Goal

One canonical publication-nav module that drives TOC, top menu, timeline, prev/next, folio numbers, progress, route mapping, and active state — for **both** the demo workspace, the demo Pathway Report, and the signed-in Pathway Report.

---

### 1. New source of truth — `src/lib/publication/nav.ts`

Exports a single ordered `PUBLICATION_PAGES` array. Each entry:

```ts
{
  id: PageId,             // stable key
  kind: "page" | "section", // page = own route; section = anchor inside /demo/report
  route: string,          // "/demo/intake" or "/demo/report#sec-readiness"
  anchor?: string,        // for kind="section"
  folio: number,          // 1-based page number (drives "p. 14")
  numeral: string,        // Roman numeral
  kicker: string,         // "Chapter Two · Listen"
  label: string,          // short, used in top menu & timeline
  title: string,          // full title for TOC
  dek: string,            // one-sentence description
  milestone: PathwayMilestoneId,
  icon: LucideIcon,
  part: "Listen" | "Synthesize" | "Plan" | "Stay Together",
}
```

Canonical sequence (matches existing content, no new routes):

```text
01  Cover                  /demo                   intake
02  Starting Point         /demo/intake            intake
03  Student Voice          /demo/voice             voice
04  Family Priorities      /demo/intake#family*    family       (anchor in intake)
05  Educator Insights      /demo/intake#educator*  educator     (anchor in intake)
06  Documents & Evidence   /demo/documents         documents
07  Readiness Profile      /demo/report#sec-readiness  readiness
08  Pathway Roadmap        /demo/report#sec-pathways   pathway
09  Pathway Report (full)  /demo/report                readiness
10  Opportunity Matches    /demo/opportunities         pathway
11  Resource Matches       /demo/resources             pathway
12  Questions For The Team /demo/meeting               plan
13  Shared Calendar        /demo/calendar              plan
14  30/60/90 Plan          /demo/plan                  plan
15  Student Hub            /demo/hub                   plan
16  What Comes Next        /demo/next                  plan
```

Helpers:

- `getPageById(id)`, `getPageByRoute(path)`, `prevPage(id)`, `nextPage(id)`
- `pagesForMilestone(m)` — list pages tagged to a stage (drives clickable timeline)
- `firstPageForMilestone(m)` — drives "click a timeline dot, jump to that stage"

The existing constants (`DEMO_STEPS`, `MAGAZINE_PAGES`, `CHAPTER_META`, `REPORT_SECTION_TO_MILESTONE`, `DEMO_CHAPTER_TO_MILESTONE`) are **re-exported as thin views** of `PUBLICATION_PAGES` so existing imports, tests, and routes keep working unchanged.

### 2. Top menu — `MagazineReader`

Drives everything off `PUBLICATION_PAGES`. Behaviour kept; labels/kickers/folio all read through the canonical record. No more parallel array.

### 3. TOC redesign

Drawer in `MagazineReader` is restructured by `part` (Listen / Synthesize / Plan / Stay Together) — magazine contents layout: roman numeral, kicker, title, dek, folio at right. Active and completed states. Mobile collapses cleanly. Replaces the existing tile grid.

### 4. Pathway timeline — `PathwaySpine` becomes clickable + content-aware

- Each milestone dot becomes a `<Link>` to `firstPageForMilestone(m)`.
- Active state = milestone for current page. Completed = milestones earlier in the sequence.
- Keeps existing visual (rail, icon dots, tooltips).
- Used in both `MagazineReader` and `ReportChapterPager` so the timeline reads identically across demo and report.

### 5. Prev / Next — `MagazinePageTurn` & report pager

Both reuse `prevPage` / `nextPage`. Labels in the buttons are guaranteed to match the actual destination page title. No more separate ordering.

### 6. Signed-in Pathway Report

`ReportChapterPager` switches its internal `CHAPTERS` constant to a derivation from `PUBLICATION_PAGES` filtered to `kind="section"` (the in-report anchors). Same `Part` grouping, same labels, same timeline component. Signed-in and demo report now share one nav model — required so Student / Family / Educator views look identical.

### 7. Safety — what does NOT change

- Route file paths are unchanged. No new routes added or removed.
- `validateStudentSearch`, `?s=` behaviour unchanged.
- Auth, 2FA, role guards, dashboards untouched.
- Existing test IDs in `tests/e2e/demo-*.spec.ts` and `tests/unit/pathway-spine.test.ts` continue to pass because the re-exported `MAGAZINE_PAGES`, `DEMO_STEPS`, and `DEMO_CHAPTER_TO_MILESTONE` keep the same shapes.
- Partner-privacy: timeline links use the existing demo routes only — no PII routes exposed.

### 8. Verification

1. `bun run typecheck`
2. Existing unit tests: `pathway-spine.test.ts`, `demo-feature-map.test.ts`, `hub-registry.test.ts`
3. Add `tests/unit/publication-nav.test.ts` asserting:
   - one source drives `DEMO_STEPS`, `MAGAZINE_PAGES`, `CHAPTER_META`
   - every `PUBLICATION_PAGES.route` resolves to an existing route file
   - prev/next is symmetric and covers all pages
4. Headless walk of all demo URLs + `/demo/report` confirming TOC → top menu → timeline → prev/next destinations all agree.

### Files touched

- **New**: `src/lib/publication/nav.ts`, `tests/unit/publication-nav.test.ts`
- **Refactored**: `MagazineReader.tsx`, `DemoStepBar.tsx`, `ReportChapterPager.tsx`, `PathwaySpine.tsx` (clickable), `demo-chapters.ts` (re-export), `publication/chapters.ts` (re-export)
- **No content changes** to individual demo route files or `ReportView.tsx` (they keep their existing anchors/imports)

### Out of scope

- Rewriting individual chapter page bodies
- Changing route URLs or the underlying content
- Visual redesign beyond the nav components themselves
