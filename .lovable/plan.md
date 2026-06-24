## Scope (updated)

**Product surfaces only.** Do not change the look of the public marketing site, the `/demo` landing, or the `demo_.*` step pages. Keep their current design untouched.

In-scope ("the product"):
- Signed-in dashboards: Student, Parent, Educator, School, District, Partner, Platform/Owner.
- Pathway report viewer (`src/components/pathway/ReportView.tsx` + `ReportV2Sections`, `ReportV2Extras`, `SourceChips`, `RecommendationCard`).
- In-app shared cards: `NextBestAction`, `OnboardingChecklist`, `JourneyStrip`, `DashboardCalendar`, `MyIepSummaryCard`, `EntitlementBadge` (when used inside the app), `InvitePeopleCard`, `InvitesInbox`.
- In-app empty/loading states for `dashboard/`, `pathway/`, `students/`.

Out of scope (do NOT restyle):
- `src/routes/index.tsx`, marketing routes (`about`, `families`, `educators`, `partners`, `pricing`, `platform`, `framework`, `programs.*`, `research`, `resources`, `blog.*`, `contact`, `help`, `partner-directory`, `partner-interest`, `waitlist`, `get-started`, `bridgeforward`, `partnerforward*`, etc.).
- `src/routes/demo.tsx` and all `src/routes/demo_.*.tsx` step pages.
- `src/components/demo/*` and `src/components/site/DemoStepBar.tsx`.
- Global font + token swap: revert the Urbanist/Epilogue + Horizon Teal/Sunrise changes from the styles.css and __root.tsx made in Phase 1, since those affect the whole site.

## Locked taste (now scoped to product chrome only)

- **Accent**: Horizon Teal + Sunrise, applied via NEW product-only tokens (`--product-primary`, `--product-accent`, `--product-surface-warm`, `--gradient-horizon`, `--shadow-lift`) in `src/styles.css`. The existing global `--primary`/`--accent` stay as they were before Phase 1.
- **Typography**: Keep the site's existing fonts globally. If we want Urbanist/Epilogue inside the product, scope via a `.product-shell` class on dashboard shells (`SiteShell` when a `dashboardTestId` is set) and apply `font-family: var(--font-product-display/sans)` inside that scope only.
- **Motion**: lively (4/5), applied to product cards and report sections only. Respect `prefers-reduced-motion`.
- **Motifs**: pathway lines, horizon gradient, step markers — used inside the product chrome only.

## Guardrails

Auth, login, owner 2FA, dashboard setup, dashboard test IDs (`student-dashboard-main`, etc.), role guards, PartnerForward access, RLS, server functions, routes, fixture data shape — all unchanged. No behavior changes. Public site visual identity unchanged.

## Phase 1.5 — Revert global changes (do first)

Undo the global parts of the prior Phase 1 so the marketing site + demo look exactly as they did before:

1. `src/routes/__root.tsx` — remove Urbanist + Epilogue `<link>` tags (or keep them but do not name them as the global `--font-display` / `--font-sans`).
2. `src/styles.css` — revert the global palette swap to the previous Horizon Teal/Sunrise values; restore previous `--primary`, `--accent`, `--gradient-hero`, fonts, etc. Move the new horizon/sunrise tokens behind a `.product-shell` selector so they only apply inside the product.
3. `src/routes/demo.tsx`, `src/components/demo/DemoRoleLens.tsx`, `src/components/site/DemoStepBar.tsx` — revert to their pre-Phase-1 designs. (Demo is out of scope now.)

Verification: `bun run test:unit` + three Playwright projects + visual spot-check of `/`, `/demo`, `/families`, `/educators` confirms they match the pre-Phase-1 look.

## Phase 2 — Product shared cards (in-scope only)

Apply the lift/typography/horizon-accent treatment inside `.product-shell` to:
- `src/components/dashboard/NextBestAction.tsx`, `OnboardingChecklist.tsx`, `JourneyStrip.tsx`, `DashboardCalendar.tsx`, `MyIepSummaryCard.tsx`, `InvitePeopleCard.tsx`, `InvitesInbox.tsx`.
- `src/components/access/EntitlementBadge.tsx` (only when rendered in product chrome).
- Empty/loading states in `dashboard/`, `pathway/`, `students/`.

## Phase 3 — Pathway report (flagship artifact, in-product only)

- `src/components/pathway/ReportView.tsx`, `ReportV2Sections.tsx`, `ReportV2Extras.tsx`, `RecommendationCard.tsx`, `SourceChips.tsx`, `ReportVersionsPanel.tsx`, `MeetingPrepPartners.tsx`, `AiAssistPanel.tsx`, `PlanHorizon.tsx`.
- Editorial cover, student snapshot, expandable sections, 30/60/90 strip, meeting prep, plain-language summaries, "Needs Review" amber treatment, Title Case headings via `src/lib/title-case.ts`.

## Phase 4 — Per-role dashboards (visual only)

`src/components/dashboard/StudentDashboard.tsx` and the other role dashboards. Per-role tone via the product token system — no test-id, no route, no permission changes.

## Verification (after each phase)

```bash
bun run test:unit
bunx playwright test --project=dashboard-setup
bunx playwright test --project=role-access
bunx playwright test --project=dashboard-regression
```
