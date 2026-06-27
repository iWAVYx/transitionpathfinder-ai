# The Pathway Issue — Editorial Rebuild

A focused rebuild of the Demo Workspace, demo Pathway Report, and signed-in Pathway Report views as one publication system. Lessons drawn from Pitch (prove the product), Stripe Press (tactile editorial), SEBTO/Ellipsus/MORAL/Gemnote (typography carries the design), Ventriloc (data woven into story), Fluent (humane complexity).

The non-negotiable new layer: a **visible Pathway Spine** that threads every page so the user sees scattered inputs becoming a direction.

---

## 1. New publication shell (`src/components/publication/`)

One shell, used by demo + signed-in reports.

- `IssueShell` — paper canvas, masthead ("The Pathway Issue · Vol. {student initial}"), generous gutters via `clamp()`, hairline rules instead of borders, no card shadows.
- `IssueCover` — full-bleed cover spread (title, dek, student initial monogram, issue number, contributors line). Replaces current `/demo` hero and report cover.
- `IssueContents` — typographic TOC: roman-numeral Parts → chapter rows with folio numbers and one-line deks. Replaces tile TOC.
- `ChapterOpener` — kicker · part · chapter title · dek · opening rule. Used at the top of every page.
- `ChapterNav` — sticky thin nav: « Previous Chapter | Part II · Synthesize | Next Chapter ». Replaces existing pager.
- `PathwayProgress` — a single horizontal rule with 8 milestone ticks (Intake → Voice → Family → Educator → Documents → Readiness → Pathway → Plan). Filled to current chapter. Sits under ChapterNav.
- Editorial primitives kept/refined: `Spread`, `PullQuote`, `Sidebar`, `Callout`, `Checklist`, `SourceNote`, plus new `EvidenceMargin` (margin annotation rail), `Timeline`, `ReadinessMap`, `RecommendationRow`.

All Tailwind via the existing `.eh-issue` scope in `src/styles.css`; we replace the current `pub-*` layer with a tighter `issue-*` layer (paper #f7f5f0, ink #0c2340, accent teal #2d8a9e — Ocean Deep is kept, it tested well).

## 2. The Pathway Spine (the new big idea)

A continuous left-rail SVG line on desktop, top progress bar on mobile. It threads every chapter and shows:

- where the student starts (intake node)
- which inputs have contributed (voice, family, educator, documents) — each node lights as the reader passes its chapter
- where the line currently is
- where it's going (readiness → pathway → plan)

Implemented once in `IssueShell`, driven by `currentChapter` prop. Functional, not decorative: clicking a node jumps to that chapter; hovering shows the one-line contribution ("Family priorities — 3 hopes, 2 concerns").

Each chapter also ends with a small "Spine update" line: *"Adds to the pathway: Maya's preference for hands-on learning →"* — making the threading legible in prose.

## 3. Each chapter gets its own layout (no shared template)

| Chapter | Layout |
|---|---|
| Cover | Full-bleed monogram + issue meta |
| Contents | Typographic TOC, two columns desktop |
| Intake | Profile spread — portrait column + facts column |
| Student Voice | Interview spread — large pull quotes, plain-language reflection, audio-note marks |
| Family Priorities | Letter-style page — hopes / concerns / questions as running prose with margin tags |
| Educator Insights | Planning memo — observations, services table (hairline rows, not card), readiness notes |
| Documents & Evidence | Evidence review — document strip with extracted insights pulled into margin annotations |
| Readiness Profile | Readiness map — horizontal bars on a single axis, not tiles; strengths above the line, growth areas below |
| Recommended Pathway | Roadmap spread — the Spine becomes the hero, branches show options, recommended branch emphasized |
| 30 / 60 / 90 Plan | Workbook spread — three columns of action rows (owner · date · follow-up), hairline ruled |
| Questions for the Team | Meeting-prep checklist, printable |
| Closing | Contributors + source notes |

Role lenses (Student / Family / Educator) become **inline tabs inside the chapter body** — labeled "Read as…" — not floating chrome.

## 4. Signed-in parity

The same `IssueShell` wraps:

- `src/components/pathway/ReportView.tsx` (already shared by demo + signed-in)
- `/reports/$reportId`
- Dashboard report previews use a compact `IssuePreview` (cover + first spread + open-in-issue link), replacing current tile previews.

`PathwayReportCard.tsx` keeps its function but loses the card-y styling — becomes an editorial "Latest Issue" block.

## 5. Motion (sparing)

- Chapter change: 180ms cross-fade + 8px upward shift on the chapter opener only.
- Spine node fill: 240ms ease when its chapter becomes current.
- Evidence margin notes: fade in on scroll into view (IntersectionObserver, once).
- Nothing else. No page curls, no parallax, no decorative loops.

## 6. Routes / files touched

**New**
- `src/components/publication/IssueShell.tsx`, `IssueCover.tsx`, `IssueContents.tsx`, `ChapterOpener.tsx`, `ChapterNav.tsx`, `PathwayProgress.tsx`, `PathwaySpine.tsx`, `EvidenceMargin.tsx`, `ReadinessMap.tsx`, `RoadmapSpread.tsx`, `ActionWorkbook.tsx`
- `src/lib/publication/chapters.ts` — single source of truth for chapter order, folios, part grouping, spine nodes. Used by demo + signed-in.

**Rewritten**
- `src/routes/demo.tsx` (cover + contents)
- `src/routes/demo_.{intake,voice,documents,plan,meeting,calendar,opportunities,resources,next,hub}.tsx` — swap PublicationPage for new chapter components
- `src/routes/demo_.report.tsx`
- `src/components/pathway/ReportView.tsx` and `ReportChapterPager.tsx`
- `src/components/site/DemoStepBar.tsx` → becomes `ChapterNav` consumer
- `src/components/students/PathwayReportCard.tsx`
- `src/styles.css` — replace `PUBLICATION SYSTEM` + `EDITORIAL REPORT BODY` layers with a single `ISSUE SYSTEM` layer

**Deleted**
- `src/components/publication/PublicationPage.tsx` (replaced)
- Any remaining `.mag-*`, `.eh-*` legacy utilities not used by ISSUE SYSTEM

**Untouched (per requirements)**
- Auth, 2FA, `_authenticated` guards, role middleware
- RLS migrations, server functions, demo data fixtures
- Test IDs in existing specs, role-access tests
- Hub registry (stays signed-in only)
- BridgeForward / grade-band logic

## 7. Verification

- Playwright walk of all 13 demo URLs + `/reports/$reportId` at 390/834/1280 widths; screenshot every chapter; assert no horizontal overflow and Spine progress matches chapter.
- Re-run existing specs: `tests/e2e/demo-signed-out.spec.ts`, `demo-roles.signedin.spec.ts`, `demo-layout.spec.ts`, `demo-contrast.spec.ts`, `role-access-rules.signedin.spec.ts`, `role-leak-nav.signedin.spec.ts`, `report-a11y.spec.ts`.
- New `tests/unit/publication-chapters.test.ts` — chapter registry order, spine nodes 1:1 with chapters.
- New `tests/e2e/issue-pathway-spine.spec.ts` — spine fills as user navigates chapters; node click navigates; mobile shows top bar.
- Title Case lint (existing `src/lib/title-case.ts`) applied to all new headings.

## 8. Out of scope (explicitly)

- No new public hubs, no public route changes outside `/demo/*`.
- No data model changes, no migrations.
- No new dependencies (uses existing Tailwind v4, Motion already in tree if needed).
- No edits to auto-generated Supabase files.

---

**Estimated scope:** ~25 file rewrites, ~12 new files, 1 styles.css layer swap, 2 new test files. Single pass, no incremental "polish" follow-ups — this replaces the publication layer end-to-end.

Approve and I'll build it straight through.
