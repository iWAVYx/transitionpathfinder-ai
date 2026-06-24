## Locked taste (applies to every phase)

- **Palette**: Horizon Teal `#0B3B49` (deep) → `#1F8A8A` (primary) with Sunrise `#F4A24C` accent and warm cream `#FFE2C2` for surfaces. Used as semantic tokens in `src/styles.css` — never hardcoded.
- **Typography**: Urbanist (display/headings, Title Case) + Epilogue (body). Loaded via `<link>` in `src/routes/__root.tsx`, named in `@theme`.
- **Motion**: lively (4/5). Section reveals, card lift, stepper progress, tab transitions, expand/collapse. Respect `prefers-reduced-motion`.
- **Motifs**: pathway lines, horizon gradient, soft "step" markers. Logo-safe space reserved in the demo header (placeholder mark that the real logo can drop into).

## Guardrails (do not touch)

Auth, login, owner 2FA, dashboard setup, dashboard test IDs (`student-dashboard-main`, etc.), role guards, PartnerForward access, RLS, server functions, demo route URLs/search params, the existing fixture data shape.

Demo stays public, read-only, fictional. All buttons remain disabled where they already are.

## Phase 1 — Design foundation + demo overview & role switcher (start here)

Tokens and shared primitives first so later phases inherit them automatically.

1. **`src/styles.css`** — add Horizon Teal / Sunrise OKLCH tokens (`--primary`, `--accent`, `--surface-warm`), `--gradient-horizon`, `--gradient-sunrise`, `--shadow-lift`, `--shadow-report`, and `--font-display` / `--font-sans` under `@theme inline`. Add a `pathway-line` background utility and a `step-marker` utility via `@utility`. Add reveal/lift keyframes that no-op under `prefers-reduced-motion`.
2. **`src/routes/__root.tsx`** — add Urbanist + Epilogue `<link>` tags (preconnect + stylesheet). No other changes.
3. **`src/routes/demo.tsx`** (overview) — redesigned hero with logo-safe brand mark, horizon gradient, animated step ribbon, role-aware CTA strip, polished step cards with hover lift + reveal-on-scroll. Removes any "maps to product feature" copy.
4. **`src/components/demo/DemoRoleLens.tsx`** — upgrade role switcher to a segmented control with role-accent color, icon, soft glow on the active chip, smooth transition between role contents (fade + slight slide), keyboard-accessible. Same data contract.
5. **`src/components/demo/FeatureFootnote.tsx`** — hidden from public demo routes. Component remains exported (kept for the internal `/demo_/connection` audit page), but rendered only when an explicit `internal` prop is passed. Public demo pages stop rendering it. (Removes all "Where this lives in the product" / route names / data-source language from the public UI.)
6. **`src/components/site/DemoStepBar.tsx`** + `DemoStepFooter` — polished progress stepper with animated fill, branded next/prev CTAs.

Verification after Phase 1: `bun run test:unit`, then the three Playwright projects.

## Phase 2 — Shared product cards (demo inherits these)

Upgrade the reusable surfaces so both demo and signed-in product improve together. No data/behavior changes.

- `src/components/access/EntitlementBadge.tsx` and a new shared `RoleBadge` — branded chip system, role color accents, icon, accessible contrast.
- `src/components/dashboard/NextBestAction.tsx`, `OnboardingChecklist.tsx`, `JourneyStrip.tsx` — card lift, step-marker motif, Title Case headings.
- `src/components/pathway/RecommendationCard.tsx`, `SourceChips.tsx`, `ReportView.tsx` headers — editorial section headers (Urbanist), readiness pill, "Needs Review" amber treatment unified with demo.
- Empty/loading states across `dashboard/`, `pathway/`, `students/` — soft pathway-line illustration + plain-language copy.

## Phase 3 — Per-demo-page polish (inherits Phase 1 & 2)

`demo_.intake`, `demo_.voice`, `demo_.documents`, `demo_.report`, `demo_.plan`, `demo_.meeting`, `demo_.opportunities`, `demo_.resources`, `demo_.calendar`, `demo_.hub`, `demo_.next`:

- Replace any "Product feature / route / data source / test ID" copy with human-language explanations ("See how student input shapes the plan.").
- Apply reveal-on-scroll sections, role-accent headers, polished sample cards.
- Pathway Report (`demo_.report`) becomes the flagship: editorial cover block, student snapshot, expandable sections, 30/60/90 strip, meeting prep, plain-language family summary + educator summary. Same upgrade applied to the shared `ReportView` so signed-in users see the same artifact.
- Final CTA block per demo page: role-aware (Families/Students → Join Waitlist, Educators → Request Demo, School → School Pilot, District → District Access, Partners → Apply As Partner, Approved → Sign In).

## Phase 4 — Dashboards (visual only)

Tone per role, all share the new tokens and shared cards. No test-id, route, or guard changes.

- Student: encouraging headline, journey strip, friendly next-step card.
- Parent: warm surface, plain-language summaries.
- Educator/Case Manager: dense but polished, scannable rows.
- School/District: aggregate stat grid with branded numerals.
- Partner: opportunity-first, privacy-safe badges.
- Platform/Owner: clean console, untouched 2FA flow.

## Technical notes

- All color/gradient/shadow values come from `src/styles.css` tokens. No `text-white`/`bg-[#...]` in components.
- Reveal/hover use Tailwind + CSS keyframes (no new deps). Motion respects `prefers-reduced-motion` via `@media (prefers-reduced-motion: reduce)` overrides in `src/styles.css`.
- Heading case: continue using `src/lib/title-case.ts` for any dynamic strings, per project memory.
- Image elements that change get the aspect wrapper + `object-cover h-full w-full` + focal `object-position` pattern, per project memory.
- Verification after each phase: `bun run test:unit`, then `bunx playwright test --project=dashboard-setup`, `--project=role-access`, `--project=dashboard-regression`. Playwright projects run in CI if the sandbox Chromium binary is unavailable (same blocker noted in prior phases).

## Approval

Reply "approve phase 1" to start with tokens + root font loading + demo overview + role switcher + removing the public feature-footnote copy. I will not begin file edits until you approve.