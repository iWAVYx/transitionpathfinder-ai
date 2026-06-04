# TransitionForward — UX & Polish Pass

This is a large multi-area pass (18 distinct items). To keep changes safe and reviewable, I'll group them into 4 phases and ship phase-by-phase, verifying after each. You can stop or reorder at any point.

## Phase 1 — Onboarding, navigation & scroll fundamentals
These are the highest-leverage usability fixes.

1. **CT High School autocomplete** — Add reusable `SchoolPicker` component (Command-based combobox) with a bundled list of CT public + magnet + tech high schools + sentinel options (Home Schooled, Other, Not Listed, Prefer Not to Say). When "Other"/"Not Listed" → free-text fallback. Wire into: onboarding, student create/edit, waitlist, intake.
2. **Page navigation & scroll behavior** — Audit `__root.tsx` / router scroll restoration. Ensure: new page → scroll top; hash link → smooth scroll to id with header offset; back nav → restore prior position. Add a `ScrollToTop` effect keyed by `pathname` (skip when hash present).
3. **Back to All Pathways** — Update the link in `pathways/$pathwayId` to return to `/#pathways` (Real-Life Pathways section), not site top.
4. **Guided pathway flow forward/back responsiveness** — Verify state preserved when stepping, fix any mobile layout breaks in `PathwayFlow`, ensure progress indicator stays in view.
5. **Resource Hub sticky filter bar** — Fix z-index + top offset so the filter bar stays under the site header without clipping; smaller cards & tighter grid (more density, better responsive breakpoints).

## Phase 2 — Page-level content & layout
6. **Personalized welcome banner** on `/dashboard` using profile first name with rotating encouraging sub-line.
7. **Contact/Help page expansion** — `/help` gets 7 clearly-titled support categories (General Questions, Family Support, School and Educator Support, Partnership Inquiries, Technical Help, Demo Requests, Feedback or Suggestions) routed through the existing contact form with a category select prefilled.
8. **Platform page Quiet Layers** — Shrink the 3 cards into refined supporting cards (smaller padding, lighter weight, aligned grid).
9. **Partners page hero** — Replace current image with a layered abstract network/partner visual (soft gradient + floating nodes, integrated into background rather than a stock photo block).
10. **Educators page** — Remove "Less Paperwork. More Presence." section, tighten following section spacing.
11. **About page** — Reduce vertical spacing/oversized blocks for tighter pacing.
12. **Waitlist symmetry & door routing** — Center/balance cards; each "door" passes a category param (`?audience=family|student|educator|school|partner`) prefilled into the waitlist form's role/interest field.

## Phase 3 — Motion & interactive polish
13. **Framework page Four-Year Arc** — Redesign as a sticky scroll-driven storytelling section with year-by-year reveal, animated progress line, motion cards (Framer Motion + `useScroll`).
14. **Home interactive map** — Pace out the scroll (increase scroll length), add CT outline sketch as background texture, tie reveals to scroll progress.
15. **Scroll text/word highlight sync** — Recalibrate Research page (and any other pages using the effect) so highlight progress matches scroll position via tuned offsets.

## Phase 4 — Typography & color polish
16. **Title Case + brand color on header descriptions** — Sweep section header descriptions using `toTitleCase` helper where appropriate (titles, eyebrows) and apply subtle `text-primary` accent to 1-2 key phrases per description.
17. **General responsive + spacing polish** — Cleanup pass on mobile breakpoints touched in earlier phases.
18. **Verification** — Walk every changed route in the preview at desktop + mobile widths.

## Technical notes
- New components: `src/components/forms/SchoolPicker.tsx`, `src/components/site/WelcomeBanner.tsx`, `src/components/effects/ScrollToTop.tsx`, `src/components/framework/FourYearArc.tsx`.
- New data: `src/lib/ct-high-schools.ts` (~200 CT high schools, public + magnet + tech + private).
- DB: extend `students.school` already free-text — no migration required. Waitlist already supports `role` + `reason`; will add an `audience` source tag via existing `source` column.
- No schema migrations needed; all changes are frontend/UX.

## Why phased
This is ~20 hours of careful work spread across 25+ files. Shipping all-at-once risks regressions you can't isolate. Phase-by-phase lets you verify each batch before the next.

## Question
Want me to start with **Phase 1** now, or reorder (e.g., do the Four-Year Arc and welcome banner first because they're most visible)?