# Responsive, Routing & UI Symmetry Cleanup

Scope: QA + targeted fixes only. No redesign, no new features, no content rewrites. Preserve current visual identity and structure.

## Approach

I'll run this in 4 focused passes, spawning parallel sub-agents for investigation so I can fix in bulk rather than touch every file serially.

### Pass 1 — Shared primitives (foundation)
Create/extend small reusable helpers so individual page fixes are one-liners, not bespoke:

1. `src/components/site/HeroCTAs.tsx` — wrapper enforcing equal-height, equal-min-width, even mobile stacking for paired hero buttons (`h-11`, `min-w-[180px]`, `w-full sm:w-auto`, consistent gap).
2. `src/components/site/SmartBackLink.tsx` — back button that:
   - prefers `router.history.length > 1` → `router.history.back()`
   - falls back to a per-page `fallbackTo` prop
   - accepts an optional `referrerKey` to read a `?from=` search param for explicit context
3. `src/components/layout/CardGrid.tsx` — opinionated responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, `auto-rows-fr` for equal heights) with an `centerOddLast` prop that adds `last:[&:nth-child(odd)]:lg:col-start-2` when count is odd at the lg breakpoint.
4. Extend `src/components/site/SmartLink.tsx` only if needed to pass `?from=` (otherwise leave alone).

### Pass 2 — Routing & nav verification
Verify and fix only what's broken:
- `/framework` → `/programs/transitionforward` redirect still in place.
- Product dropdown contains no Framework entry.
- PartnerForward links point to incentive routes only, not duplicating `/partners-manage` or `/partner-directory`.
- Programs dropdown links resolve (BridgeForward, TransitionForward, PartnerForward).
- Mobile sheet nav mirrors desktop groups.
- Confirm `SiteHeader` already correct (per current code) — no edit unless a gap is found.

### Pass 3 — Hero CTA + card-grid symmetry
Sweep the audited pages and swap ad-hoc button pairs + grid wrappers for the new primitives. Target list (only where mismatch exists):
- `src/routes/index.tsx` (homepage hero + audience cards)
- `src/routes/bridgeforward.tsx`
- `src/routes/programs.transitionforward.tsx`
- `src/routes/partnerforward.tsx`
- `src/routes/partnerforward.incentives.tsx`
- `src/routes/families.tsx`, `educators.tsx`, `partners.tsx`
- `src/routes/platform.tsx`, `pricing.tsx`, `waitlist.tsx`
- `src/components/dashboard/DashboardWidgets.tsx` (pathway grid card heights)

Rule applied uniformly: hero CTAs use `HeroCTAs`; tile grids use `CardGrid` with `auto-rows-fr`. Card inner layout uses `flex flex-col h-full` so footers/CTAs align.

### Pass 4 — Responsive sweep + smart back
- Replace bespoke "← Back" links on detail pages with `SmartBackLink`:
  - `src/routes/pathways.$pathwayId.tsx`
  - `src/routes/blog.$slug.tsx`
  - `src/routes/_authenticated/partners-manage_.impact.tsx` (and similar)
- Audit pages for `overflow-x` issues and `min-w-0` on flex children inside headers.
- Admin tables: confirm existing tables already wrap in `ResponsiveTable`; only fix the ones that don't.

### Pass 5 — Verify in browser
Spot-check at 375px, 820px, 1384px:
- Home, Programs/TransitionForward, BridgeForward, PartnerForward, Partners, Dashboard (anon redirect), header dropdowns.
- Confirm no horizontal scroll, even CTAs, aligned cards.

## What I will NOT do
- No content rewrites.
- No color/typography changes.
- No new routes or features.
- No DB / RLS / server function changes.
- No edits to `routeTree.gen.ts` (regenerated automatically).
- No mass rewrite of pages that already look correct — only targeted fixes.

## Deliverables
- 3 new small components (`HeroCTAs`, `SmartBackLink`, `CardGrid`).
- Targeted edits to the page list above.
- Short summary of what changed + screenshots from the responsive spot-check.

## Technical details
- TanStack Router `useRouter().history.back()` for smart back; fall back to `<Link to={fallbackTo}>` semantics so cmd-click still works when no history.
- `auto-rows-fr` + `h-full` on Card to equalize tile heights without JS.
- `last:[&:nth-child(odd)]:lg:col-start-2` Tailwind arbitrary variant for centering odd final card on 3-col grids.
- All new components typed, no `any`.