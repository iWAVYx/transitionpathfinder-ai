# Magazine-Style Redesign: Demo Workspace + Pathway Report

This is a true visual replacement, not a polish pass. New design language, new layout primitives, same features/routes/roles/tests/IDs.

## New Visual Language (scoped to `.demo-shell` and `.tf-report`)

Introduce a magazine system in `src/styles.css`:
- **Type scale**: serif display for chapter titles (existing Epilogue), generous editorial sizes (clamp 2.5–4.5rem), tighter tracking, larger leading on body (1.7), max measure ~62ch for readability.
- **Paper surfaces**: warm off-white `--paper`, soft cream sidebars `--paper-cream`, ink `--ink` text, rule lines via 1px borders + hairline dividers.
- **Layout primitives** (new utility classes):
  - `.mag-cover` — full-bleed cover spread with overlay kicker / oversized headline / byline strip / page number marker
  - `.mag-spread` — two-column editorial spread, asymmetric (7/5 split desktop, stacked mobile)
  - `.mag-chapter-opener` — large numeral, hairline rule, chapter title, dek
  - `.mag-pullquote` — oversized quote with vertical bar accent
  - `.mag-sidebar` — cream box w/ label ("What This Means", "Questions To Bring") and rule top
  - `.mag-callout` — inline tinted block for plain-language summaries
  - `.mag-page-marker` — running header w/ student name + page X / total
  - `.mag-timeline` — horizontal magazine timeline (uniform row, single-row desktop with snap-scroll on mobile)
  - `.mag-toc` — sticky compact table of contents (left rail desktop, top accordion mobile)
  - `.mag-tab-strip` — flat editorial tabs for role views (no boxy card)
  - `.mag-drop-cap` — first-letter drop cap for opening paragraphs
  - `.mag-rule` — hairline section divider with optional centered label
- Soft section backgrounds (alternating paper / cream bands) using `nth-of-type` on `.mag-section`.
- Illustration accents using existing assets (e.g. `framework-hero-graduation`, `mom-daughter-homework`) as full-bleed band imagery, not card thumbnails.

## Demo Workspace Redesign

Files: `src/routes/demo.tsx` (hub) + each `src/routes/demo_.{intake,voice,documents,report,resources,opportunities,plan,meeting,calendar,hub,next}.tsx`.

- **Hub (`demo.tsx`)** → guidebook cover:
  - `.mag-cover` with kicker "A Sample Planning Journey", oversized title "Meet Maya. Walk Through Her Pathway.", byline "TransitionForward Demo Edition · 2026", student photo/illustration band.
  - Followed by a compact `.mag-toc` listing the 11 chapters with page numbers and 1-line deks.
  - Journey timeline rebuilt as `.mag-timeline` (one row desktop, uniform tile widths, snap scroll mobile).
  - Removes the four big italic numeral bands as the *primary* layout — convert them into chapter dividers instead.
- **Chapter pages** all share:
  - `.mag-page-marker` running header (Chapter N · Demo · Maya)
  - `.mag-chapter-opener` with numeral + title + dek
  - `.mag-spread` for main content (body left, `.mag-sidebar` right with "What This Means" / "Questions To Bring")
  - `.mag-pullquote` where student/family voice exists
  - Footer "Continue To Chapter N+1 →" + "Back To Contents" (replaces current DemoStepFooter visual; keep component + nav logic, restyle).
- DemoStepBar restyled as flat `.mag-tab-strip` w/ chapter numerals — same IDs, same nav.

## Pathway Report Redesign

File: `src/components/pathway/ReportView.tsx` (presentational only; do not change data shape, audience tabs API, version logic, or extras components).

- **Cover spread**: kicker "Pathway Report", oversized student name, dek summary, "Prepared for…" byline, edition/date marker. Replaces current top hero.
- **Compact outline / TOC** as left-rail sticky on desktop (`.mag-toc`), accordion on mobile. Replaces current scroll-clip TOC styling.
- **Audience tabs** moved inline into the report header band (flat strip), removing the large floating role block.
- **Sections rebuilt as editorial spreads**:
  - Student Snapshot — magazine bio spread w/ image accent
  - Student Voice — featured pullquote spread, large quote + attribution
  - Family Priorities — warm cream sidebar layout
  - Educator Insights — paper layout w/ source labels
  - Document Insights — keep type chips + source metadata, restyled as editorial callouts
  - Readiness — visual indicators (horizontal progress bars w/ labels, not card grid)
  - BridgeForward / Transition Roadmap — timeline spread
  - 30/60/90 Plan — magazine timeline w/ owners
  - Questions For The Team — checklist sidebar
- Existing sub-components (`ReportV2Sections`, `ReportV2Extras`, `ReportPhase4Sections`, `MeetingPrepPartners`, `ReportPartnerSuggestions`, `ReportVersionsPanel`, `PlanHorizon`, `SourceChips`, `ConnectToPlan`) keep their APIs; wrap or re-skin via new utility classes.

## What Stays Untouched (hard guarantees)

- Routes, search params, navigation order, step IDs (`intake`, `voice`, `documents`, `report`, `resources`, `opportunities`, `plan`, `meeting`, `calendar`, `hub`, `next`).
- `data-testid` attributes, ARIA labels, role names tests assert on.
- Auth, 2FA, RLS, role gates, server functions, migrations, admin/seed code.
- Signed-in product surfaces, dashboards, BridgeForward grade-band logic, partner privacy.
- Pathway Report data structures, share tokens, audience types, version persistence.
- `/demo/connection` audit page (internal-only; restyled lightly to match but not in scope as a chapter).

## Files Touched

Styles:
- `src/styles.css` — add `.mag-*` system inside the existing `.demo-shell` + `.tf-report` scopes; alternating section backgrounds; serif drop caps; pullquote treatment; timeline grid.

Demo chapters (re-skin, keep components/logic):
- `src/routes/demo.tsx`
- `src/routes/demo_.intake.tsx`
- `src/routes/demo_.voice.tsx`
- `src/routes/demo_.documents.tsx`
- `src/routes/demo_.report.tsx`
- `src/routes/demo_.resources.tsx`
- `src/routes/demo_.opportunities.tsx`
- `src/routes/demo_.plan.tsx`
- `src/routes/demo_.meeting.tsx`
- `src/routes/demo_.calendar.tsx`
- `src/routes/demo_.hub.tsx`
- `src/routes/demo_.next.tsx`
- `src/components/site/DemoStepBar.tsx` (restyle only; keep nav, step IDs, click + drag scroll)

Report:
- `src/components/pathway/ReportView.tsx`
- Light wrappers in `src/components/pathway/ReportV2Sections.tsx`, `ReportV2Extras.tsx`, `ReportPhase4Sections.tsx`, `PlanHorizon.tsx` if needed to apply new classes without changing props.

New components (presentational only):
- `src/components/magazine/MagCover.tsx`
- `src/components/magazine/MagChapterOpener.tsx`
- `src/components/magazine/MagSpread.tsx`
- `src/components/magazine/MagSidebar.tsx`
- `src/components/magazine/MagPullquote.tsx`
- `src/components/magazine/MagTimeline.tsx`
- `src/components/magazine/MagToc.tsx`
- `src/components/magazine/MagPageMarker.tsx`

## Verification

1. Auto build + typecheck.
2. `bunx vitest run tests/unit/demo-feature-map.test.ts tests/unit/value-lens.test.ts`
3. Playwright at 390 / 820 / 1440 against `/demo`, `/demo/report`, `/demo/plan`, `/demo/intake` — screenshot each, verify no horizontal overflow, timeline single-row desktop, no clipped numerals/labels.
4. Spot-check existing demo regression specs (`demo-signed-out`, `demo-roles.signedin`, `demo-layout`, `demo-contrast`) — these assert structure/contrast/test IDs, not exact copy, so should pass.

## Out Of Scope

- Signed-in dashboards (family/student/educator/admin) — value strips and readiness cards stay as-is.
- Auth, RLS, server fns, migrations, edge functions.
- `/demo/connection` internal audit page beyond inheriting `.demo-shell`.
- Renaming any step ID, route, or test selector.

## Risk

Re-skinning `ReportView.tsx` is the largest blast radius — it's also rendered at `/share/$token`. Mitigation: keep all props, audience tabs, and section IDs; only swap surrounding markup and classes.
