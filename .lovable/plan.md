## Scope (IMPORTANT)

These taste changes apply ONLY to:

- Demo routes: `src/routes/demo.tsx` and all `src/routes/demo_.*.tsx`
- Demo-only components under `src/components/demo/**`
- The Pathway Report artifact: `src/components/pathway/ReportView.tsx` and its
  direct sub-pieces (`ReportV2Sections`, `ReportV2Extras`, `ReportPartnerSuggestions`,
  `MeetingPrepPartners`, `SourceChips` as used inside the report)

Everything else on the site (marketing pages, signed-in dashboards, school/district
shells, partner pages, settings, auth) keeps its current Sky & Peach + Cormorant/Karla
look. No site-wide token swap. No changes to `src/routes/__root.tsx` body fonts.
No edits to shared layout shells (`SiteShell`, `SchoolPageShell`, `DistrictPageShell`,
`OwnerShell`) beyond what the report/demo need.

## Locked taste (scoped per above)

- **Palette**: Horizon Teal `#0B3B49` → `#1F8A8A` with Sunrise `#F4A24C` accent and
  warm cream `#FFE2C2` surface. Exposed as **namespaced** tokens in `src/styles.css`
  (`--demo-primary`, `--demo-accent`, `--demo-surface-warm`, `--gradient-horizon`,
  `--gradient-sunrise`, `--shadow-lift`, `--shadow-report`). Global `--primary`,
  `--background`, `--foreground`, etc. are **not** changed.
- **Typography**: Urbanist (display) + Epilogue (body) exposed as `--font-demo-display`
  and `--font-demo-body`. Applied only inside `.demo-shell` and `.report-shell`
  wrapper classes — global `--font-sans` / `--font-display` stay as Karla / Cormorant.
- **Motion**: lively (4/5). Reveal-on-scroll, card lift, stepper progress, tab
  transitions, expand/collapse — scoped via `.demo-shell` / `.report-shell` selectors.
  Respect `prefers-reduced-motion`.
- **Motifs**: pathway lines, horizon gradient, soft "step" markers, logo-safe header
  area in the demo overview.

## Guardrails (do not touch)

Auth, login, owner 2FA, dashboard setup, dashboard test IDs
(`student-dashboard-main`, etc.), role guards, PartnerForward access, RLS, server
functions, demo route URLs/search params, the existing fixture data shape.

Global theme tokens, marketing pages, signed-in dashboards, and shared shells stay
visually unchanged. Demo stays public, read-only, fictional. All currently disabled
buttons stay disabled.

## Phase 1 — Scoped foundation + demo overview & role switcher (start here)

1. **`src/styles.css`** — append a new "Demo & Report scope" section:
   - Namespaced tokens (`--demo-primary`, `--demo-accent`, `--demo-surface-warm`,
     `--gradient-horizon`, `--gradient-sunrise`, `--shadow-lift`, `--shadow-report`,
     `--font-demo-display`, `--font-demo-body`) — defined on `:root` but only
     consumed inside the scope classes below.
   - `.demo-shell` and `.report-shell` wrapper classes that set
     `font-family: var(--font-demo-body)`; their headings get
     `font-family: var(--font-demo-display)`.
   - `@utility pathway-line` and `@utility step-marker` (v4 syntax) used only inside
     the scope.
   - Reveal/lift keyframes scoped under `.demo-shell` / `.report-shell`, no-op under
     `prefers-reduced-motion`.
2. **`src/routes/__root.tsx`** — add Urbanist + Epilogue `<link>` tags (preconnect +
   stylesheet). No other changes; body font stays Karla via the existing global token.
3. **`src/routes/demo.tsx`** — wrap content in `<div className="demo-shell">`.
   Redesigned hero with logo-safe brand mark, horizon gradient, animated step ribbon,
   role-aware CTA strip, polished step cards with hover lift + reveal-on-scroll.
   Removes any "maps to product feature" copy.
4. **`src/components/demo/DemoRoleLens.tsx`** — upgrade to a segmented control with
   role-accent color, icon, soft glow on the active chip, fade + slight slide
   transition. Same data contract.
5. **`src/components/demo/FeatureFootnote.tsx`** — hidden from public demo routes
   (still exported; renders only when an explicit `internal` prop is passed). Removes
   all "Where this lives in the product" / route names / data-source language from
   the public UI.
6. **`src/components/site/DemoStepBar.tsx`** + `DemoStepFooter` — polished progress
   stepper with animated fill, branded next/prev CTAs. Used only on demo pages, so
   safe to restyle in place.

Verification after Phase 1: `bun run test:unit`, then the three Playwright projects.

## Phase 2 — Pathway Report flagship (scoped)

Upgrade `src/components/pathway/ReportView.tsx` and its direct sub-pieces. Wrap the
rendered report in `<div className="report-shell">` so it picks up the demo palette
and typography wherever it appears (demo + signed-in). No changes to data shape,
versioning, share tokens, or permissions.

- Editorial cover block (student snapshot, generated date, readiness pill).
- Expandable sections with smooth height transitions.
- 30/60/90 strip, meeting prep, plain-language family + educator summaries.
- "Needs Review" amber treatment unified with the demo step markers.
- Headers use Urbanist (Title Case via `src/lib/title-case.ts` for dynamic strings).

## Phase 3 — Per-demo-page polish (inherits Phase 1 & 2)

`demo_.intake`, `demo_.voice`, `demo_.documents`, `demo_.report`, `demo_.plan`,
`demo_.meeting`, `demo_.opportunities`, `demo_.resources`, `demo_.calendar`,
`demo_.hub`, `demo_.next`:

- Each route wrapped in `.demo-shell` (or the report wrapper for `demo_.report`).
- Replace any "Product feature / route / data source / test ID" copy with
  human-language explanations ("See how student input shapes the plan.").
- Reveal-on-scroll sections, role-accent headers, polished sample cards.
- Final CTA block per demo page: role-aware (Families/Students → Join Waitlist,
  Educators → Request Demo, School → School Pilot, District → District Access,
  Partners → Apply As Partner, Approved → Sign In).

## What we explicitly do NOT change

- Global `:root` color tokens, marketing pages, signed-in dashboards
  (Student/Parent/Educator/School/District/Partner/Owner), settings, auth flows,
  partner directory, blog, pricing, framework, platform, get-started, waitlist,
  reset-password, login, invite, share — all keep current Sky & Peach + Cormorant
  Garamond / Karla styling.
- `SiteShell` / `SchoolPageShell` / `DistrictPageShell` / `OwnerShell` chrome.
- Shared dashboard components (`NextBestAction`, `OnboardingChecklist`,
  `JourneyStrip`, `RecommendationCard`, `EntitlementBadge`, etc.) unless they
  render *inside* the Pathway Report.
- Dashboard test IDs and any test-targeted selectors.

## Technical notes

- All demo/report color/gradient/shadow values come from the namespaced tokens in
  `src/styles.css`. No `text-white` / `bg-[#...]` in components.
- Reveal/hover use Tailwind + CSS keyframes scoped under `.demo-shell` /
  `.report-shell`. Motion respects `prefers-reduced-motion`.
- Heading case: use `src/lib/title-case.ts` for dynamic strings, per project memory.
- Image elements get the aspect wrapper + `object-cover h-full w-full` + focal
  `object-position` pattern, per project memory.
- Verification after each phase: `bun run test:unit`, then
  `bunx playwright test --project=dashboard-setup`, `--project=role-access`,
  `--project=dashboard-regression`.

## Approval

Reply "approve phase 1" to start with the scoped tokens + font loading + demo
overview + role switcher + removing the public feature-footnote copy. I will not
begin file edits until you approve.
