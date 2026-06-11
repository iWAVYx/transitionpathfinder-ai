# TransitionForward Responsive Polish — Phase 1

You asked for a platform-wide responsive UI polish. That's ~30+ pages and can't safely land in one batch. Here's a phased plan. **This plan covers Phase 1 only.** Phases 2–5 are listed so you can see the runway; I'll re-plan each one before starting.

## Phase 1 (this plan) — Shared tokens + 6 signed-in dashboards

Scope: tokens-first, then re-flow every role's dashboard for mobile and tablet, applying moderate density reduction (accordion-collapse secondary sections, table→card on mobile). No structural feature changes, no nav model changes, no backend.

### 1. Shared layout/spacing primitives

Add small composable building blocks the dashboards (and later, every page) will use. New files only — no edits to existing tokens, no breaking changes.

- `src/components/layout/PageContainer.tsx` — responsive container: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
- `src/components/layout/PageHeader.tsx` — title + optional eyebrow + description + primary action slot. Truncates on mobile; stacks action below title under `sm`.
- `src/components/layout/Section.tsx` — `<section>` with consistent vertical rhythm (`space-y-3 sm:space-y-4`) and optional heading row.
- `src/components/layout/StatGrid.tsx` — KPI/stat card grid (`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4`); each stat capped in height so dashboards don't sprawl on mobile.
- `src/components/layout/ResponsiveTable.tsx` — renders a real `<table>` at `md+` and a stacked card list under `md`. Takes columns + rows config so any admin/caseload table can swap in.
- `src/components/layout/CollapsibleSection.tsx` — wraps shadcn `Collapsible`. On mobile defaults to collapsed for "secondary" sections; on `lg+` always-open.

Spacing rules these encode (your "spacing system"):
- Page padding: `px-4 sm:px-6 lg:px-8`, vertical `py-6 sm:py-8 lg:py-10`.
- Section gap: `space-y-6 sm:space-y-8`.
- Card padding: `p-4 sm:p-5 lg:p-6`.
- Grid gaps: `gap-3 sm:gap-4 lg:gap-6`.
- Min tap target on icon buttons: `min-h-11 min-w-11`.

### 2. Dashboard polish (apply tokens, reduce density)

For each of the 6 role dashboards, same recipe:

1. Wrap in `PageContainer` + `PageHeader` (consistent title/description/CTA).
2. Re-order content into the hierarchy you specified:
   Welcome → **Next Best Action** → primary work area → upcoming dates/action items → resources → secondary tools.
3. Mobile: collapse "secondary tools" + "resources/recommendations" into `CollapsibleSection` (closed by default, open on `lg+`).
4. Stat/KPI rows → `StatGrid` (2-up on mobile, 3-up on sm, 4-up on lg). Cap card heights so they don't stretch.
5. Quick-action button rows: stack to full-width `flex-col gap-2` under `sm`, switch to `flex-wrap` at `sm+`. Max 2 visible primary CTAs on mobile; rest move into an overflow menu.
6. Any data tables → `ResponsiveTable` (table on `md+`, cards under `md`).

Files touched:
- `src/routes/_authenticated/dashboard.tsx` (student/parent — 1061 lines; biggest density problem)
- `src/routes/_authenticated/caseload.tsx` (educator/case manager)
- `src/routes/_authenticated/school.overview.tsx` (school admin)
- `src/routes/_authenticated/district.overview.tsx` (district admin)
- `src/routes/_authenticated/owner.index.tsx` (platform admin hub landing)
- Partner org dashboard — locate file during build (likely `partners-manage.tsx` or similar).
- Shared dashboard components in `src/components/dashboard/*` get padding/sizing normalized to match the new tokens.

### 3. Verification

After each dashboard, view at 375×812 (mobile), 820×1180 (tablet), and 1440×900 (desktop) via the preview tool. Check:
- no horizontal scroll
- tap targets ≥ 44×44 for primary actions
- header doesn't overlap content
- collapse defaults match spec (secondary closed on mobile, open on desktop)
- typography hierarchy reads top-to-bottom

## Phases 2–5 (future passes, not in this PR)

- **Phase 2** — Core app tools: Pathway Report, Calendar, Resource Library, Partner Network, Action Items, Meeting Prep.
- **Phase 3** — Admin Hub deep clean (System Health, Partner Manager, Resource Manager, all `owner.*` tables → `ResponsiveTable`).
- **Phase 4** — Signed-out public site: Home, Platform, Framework, Resources, Partner Directory, About, Help, Waitlist, Auth.
- **Phase 5** — Forms pass: onboarding, add-student, profile, waitlist, contact, partner submission, calendar event, action item, meeting prep, admin forms. Apply consistent label/error/spacing patterns and section splits.

## Out of scope (won't touch)

- Role system, RLS, server functions, schema.
- Navigation model (no new bottom-nav — you chose Moderate, not Aggressive).
- Component logic, data flows, feature behavior.
- Color palette and typefaces (already on-brand: Sky & Peach + Cormorant/Karla).

## Risks

- `dashboard.tsx` is 1061 lines and likely branches on role; I'll read it fully before editing and keep diffs minimal.
- Collapsible-by-default on mobile changes what users see first — secondary sections only, never the Next Best Action or primary work area.
- If a dashboard has a custom shell, I'll keep it and just normalize spacing instead of forcing `PageContainer`.

Approve to proceed with Phase 1, or tell me to adjust (e.g. "skip the table→card refactor for now", "do owner hub first", "smaller scope — just student + educator dashboards").
