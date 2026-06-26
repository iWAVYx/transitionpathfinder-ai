# End-to-End UX Correction: Demo Workspace + Pathway Report

This is a focused UX pass, not another visual overhaul. The Ocean Deep direction and the Workbook/Editorial Report Body layers stay. The work is to make the *flow* — orientation, navigation, readability, balance — actually usable from beginning to end, on mobile, tablet, and desktop, without breaking auth, role rules, routing, test IDs, or report data.

## Scope (what changes)

- `src/components/site/MagazineReader.tsx` — the shared reader shell used by demo + report.
- `src/components/site/DemoStepBar.tsx` + `DemoStepFooter` — top progress + prev/next.
- `src/routes/demo.tsx` — Demo Workspace cover + table of contents.
- Each `src/routes/demo_.*.tsx` — page intros, body composition, footer.
- `src/components/pathway/ReportView.tsx` + `ReportChapterPager.tsx` + `ReportPartOpener.tsx` — Pathway Report reading model.
- `src/routes/demo_.report.tsx`, `src/routes/_authenticated/reports.$reportId.tsx`, `src/routes/share.$token.tsx` — report shells stay structurally identical; only the reader chrome and intro band change.
- `src/styles.css` — targeted refinements to the existing `.report-shell` / `.demo-shell` / Workbook layers. No new "system" rewrites.

## Scope (what does NOT change)

- Route paths, file names, `createFileRoute` strings.
- Auth gates, 2FA, role guards, RLS, `_authenticated` layout.
- Test IDs (`student-dashboard-main`, `resources-sticky-search`, `resources-sticky-filters`, etc.) and any selector used by `tests/e2e/*`.
- Report data shape, audience tabs, demo student fixtures.
- BridgeForward vs TransitionForward grade-band logic.
- Partner privacy / document security boundaries.
- The Ocean Deep palette and overall editorial direction.

## The 7 user-clarity questions (applied to every page)

Every demo step and report part must answer, visibly:
1. Where am I? — section number + name in the header chip, current step in the progress bar.
2. Why does this matter? — one-sentence "What this section is for" line under the title.
3. What's shown? — a short "On this page" list when the page has >2 blocks.
4. What do I provide? — explicit input affordances in real product; in demo, a "What you'd do here" note.
5. What does the product do with it? — "How this feeds the Pathway Report" footnote per section.
6. What's next? — single primary next CTA, always visible at bottom.
7. How do I jump around? — compact TOC accessible from the reader chrome.

Pages failing this test get the intro/footnote pattern wired in, not a redesign.

## Navigation model (shared reader chrome)

`MagazineReader` + `DemoStepBar` are reworked into one consistent pattern used by both demo and report:

```text
┌──────────────────────────────────────────────────────────┐
│  ← Prev   ●●●○○○○○○○  Step 3 of 9 · Pathway Report  ☰ TOC│  ← sticky top
├──────────────────────────────────────────────────────────┤
│  Section title                                            │
│  One-sentence purpose                                     │
│  ─── divider ───                                          │
│  ...content...                                            │
├──────────────────────────────────────────────────────────┤
│  Up next: Documents & Evidence            Next →          │  ← sticky bottom on mobile, inline on desktop
└──────────────────────────────────────────────────────────┘
```

Specifics:
- Top bar: horizontal scroll on mobile (keeps existing drag/momentum), single row on desktop, current step highlighted with a filled dot + label, others as numbered chips. Min tap target 44×44.
- TOC: a `Sheet` (shadcn) that slides from the right with the full list, grouped (Demo: Overview / Plan / Report / Next Steps; Report: Snapshot / Pathways / Translate / Team / Next). Closes on selection.
- Prev/Next: always rendered, disabled state on first/last, with the destination's name shown, not just an arrow.
- Mobile: bottom action bar fixed (Prev | TOC | Next) so the user never has to scroll to navigate.
- "Back to Demo Workspace" / "Back to Report Cover" link always present in the top bar's left edge.

## Pathway Report reading model

Keep the Parts (Snapshot → Pathways → Translate → Team → Next) but make them behave as a guided document:

- `ReportChapterPager` becomes a real sticky chapter rail with active state and a numbered "Part II of V" indicator.
- Each Part opens with a one-page `ReportPartOpener` showing: Part number (Roman), name, one-sentence purpose, 3-item "What you'll find here" checklist, and a "Start reading" button that scrolls to the first section.
- Inside a Part, sections use the Editorial Report Body layer already in place (hairline rules, no tiles). We add:
  - A small "In this section" inline TOC at the top of long sections (3+ subblocks).
  - A consistent "Bring to the team" or "Next step" callout at the bottom of each section, single column, left-rule, no decorative box.
- Audience tabs (Student / Family / Educator) move out of the body and into the reader top bar as a segmented control, persistent across sections, with the active audience visible at all times.
- Print/PDF mode unchanged behaviorally; chrome hides via existing `@media print`.

## Readability pass

Apply globally inside `.report-shell` and `.demo-shell`:
- Body copy: 16–17px, line-height 1.65, max-width 68ch.
- Headings: a single, predictable scale (H1 36/40, H2 24/28, H3 18/22 on desktop; one step down on mobile). Title Case (uses existing `src/lib/title-case.ts`).
- Paragraph spacing: 0.9em between paragraphs, 1.5em before headings.
- Pull quotes: capped at 2 per Part, Instrument Serif italic, left-rule only.
- Buttons: verb-first labels ("Open Pathway Report", "Continue to Documents"), never "Click here".
- Source/evidence chips: muted, lowercase-safe, never competing with body copy.
- Remove any user-facing developer language ("lens", "fixture", "audience strip", "section block").

## Visual balance pass

- Replace any remaining 2–4 column tile grids in the report body with the editorial column-list pattern already defined.
- Standardize card padding (24px desktop / 16px mobile), border-radius (8px), and rule weight (1px `--border`) across demo + report.
- Remove decorative duplicates: at most one accent treatment per section (rule OR background tint OR pull quote — never all three).
- Empty states get a single line of copy + one action, not an empty box.
- Icons aligned to text baseline with `shrink-0`, headings use `truncate` + `min-w-0` parents per the responsive header rule.

## Demo Workspace clarity

`src/routes/demo.tsx` (cover) gets a tightened structure:
1. Masthead: product name, issue line ("A guided sample of TransitionForward"), one-paragraph purpose.
2. "How to read this" — 3 bullets: collect → translate → plan.
3. Table of contents: numbered list of the 9 steps with one-line descriptions and a "Start at Step 1" primary CTA. No tile grid.
4. Role note: one line explaining the sample is the same document every role sees, with audience switching available inside the report.

Each `demo_.*.tsx` route gets:
- Step chip (number + name), one-sentence purpose, short "What this shows" list (max 3 items).
- The existing product content unchanged.
- A "How this feeds the Pathway Report" footnote (reuses `FeatureFootnote`).
- A consistent footer with "Up next: <name>" + Next button.

## Signed-in consistency

`/_authenticated/reports/$reportId` and `/share/$token` use the same `MagazineReader` chrome and the same Part opener pattern as the demo report. Dashboards are out of scope for this pass except for verifying the link into the report opens the new chrome.

## Responsive QA

Manual Playwright pass at 390×844, 820×1180, 1440×900 against `/demo`, `/demo/report`, three interior demo steps, and (when `E2E_REPORT_ID` is set) `/reports/$reportId`. Screenshots saved under `/tmp/browser/uxqa/`. Fixes applied for any overflow, cramped controls, hidden content, or unreadable text.

## Tests / safety

- Run `bunx vitest run` for the unit suites already in place (`demo-feature-map`, `value-lens`, `no-toplevel-admin-import`, `waitlist-routing`, `dashboard-static`).
- Run the signed-out Playwright suite (`tests/e2e/demo-signed-out.spec.ts`, `demo-layout.spec.ts`, `demo-contrast.spec.ts`, `public-a11y.spec.ts`).
- Role / 2FA / signed-in suites are gated on env secrets and run in CI; no test IDs or selectors change in this pass.
- A11y: contrast and landmark checks must continue to pass; reader chrome uses `<nav aria-label="Reader navigation">` and the TOC sheet uses shadcn primitives.

## Out of scope

- New palette, new font, new "system".
- Schema or RLS changes.
- Edge functions, AI prompts, new server functions.
- Dashboard redesigns beyond verifying entry into the report.

## Deliverable

After this pass:
- One consistent reader chrome across demo + report + share view.
- Every page answers the 7 clarity questions visibly.
- Prev/Next + TOC always reachable, on all viewports.
- Report reads as a guided document with 5 Parts, not a tile grid.
- Demo cover explains what the product does and how to read the sample, in under one screen on desktop.
- Mobile navigation usable without scrolling to find controls.
- No breakage to auth, roles, routing, data, or existing tests.
