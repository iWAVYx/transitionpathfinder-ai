# Role Dashboards → Tool-Preview Overviews

Each signed-in role dashboard becomes an at-a-glance workspace preview: functional tool tiles (with real data + status) that each link into the deeper page. Not a link list, not a Workspace clone, not a Report clone.

## Scope by role

**Student** (`/dashboard` when role=student, currently `StudentDashboard.tsx`)
- Student Voice status tile · My Pathway progress · Next Action Item · Saved Resource preview · Meeting Prep preview · Next Calendar item · Pathway Report (student view) preview

**Parent/Guardian** (`/dashboard` when role=parent)
- Connected Student · Documents (recent + upload CTA) · Family Priorities · Pathway Report (family view) · Meeting Prep questions · Action Items · Sharing/Consent · Recommended Resources

**Educator / CM** (`/hubs/caseload` — primary educator landing)
- Caseload snapshot · Assigned-student readiness · Pending educator input · Latest Pathway Report · Meeting Prep · Recent case notes · Action Items · Calendar

**School Admin** (`/hubs/school` + `/school/overview`)
- School metrics · Planning status by grade · Team activity · Report completion % · Readiness trend · Resource usage · Support-needs

**District Admin** (`/hubs/district` + `/district/overview`)
- District metrics · Connected schools · School-by-school progress · Readiness trend · Implementation progress · District reports · Service gaps

**Partner** (`/hubs/partner`)
- Profile completion · Active opportunities · Submitted programs · Upcoming deadlines · Opportunity mgmt · PartnerForward incentives · Partner resources
- Explicit "Partners never see student data" boundary strip (already in `PartnerBoundaryNotice`)

**Platform Owner** (`/owner` index — Admin Hub, not a dashboard reskin)
- Waitlist count · User count · Contact submissions · Resource review queue · Partner submissions · Feedback/bug queue · Launch readiness · System health · Analytics snapshot
- Preserves existing OwnerShell chrome; tiles link to their existing sub-pages.

## Shared building block

New `src/components/dashboard/ToolPreviewCard.tsx`:
- Props: `icon`, `title`, `status` (badge), `summary` (1–2 lines of live data), `bullets` (up to 3 items), `cta` (label + `to` + `params?`)
- Uses tokens (`bg-card`, `border-border`, `shadow-soft`, `rounded-2xl`); a compact and expanded variant.
- Falls back gracefully when data is missing (skeleton / "Nothing yet — get started" line + CTA).

Grid wrapper `ToolPreviewGrid` (responsive 1/2/3-col).

## Data sources (reuse, don't add)

Pull from existing loaders / server fns:
- Student: existing `StudentDashboard` widgets (`NextBestAction`, `MyIepSummaryCard`, `DashboardCalendar`) + saved resources + latest report summary.
- Parent: connected student(s), documents list, family priorities from profile, latest report, share list.
- Educator: caseload list, readiness aggregate, notes, meetings.
- School / District: existing overview aggregates in `school.overview.tsx` / `district.overview.tsx`.
- Partner: `opportunities`, `partners-manage` data.
- Owner: existing counts in `owner.index.tsx` + `ReviewQueuesPanel` + `SystemHealthChecklist`.

No new tables, no new server fns unless a source is missing; then a thin server fn colocated with the dashboard.

## Files

**New**
- `src/components/dashboard/ToolPreviewCard.tsx`
- `src/components/dashboard/ToolPreviewGrid.tsx`
- `src/components/dashboard/role/{StudentOverview,ParentOverview,EducatorOverview,SchoolOverview,DistrictOverview,PartnerOverview}.tsx`

**Edit**
- `src/routes/_authenticated/dashboard.tsx` — route by role to Student/Parent overview (keep current gating).
- `src/routes/_authenticated/hubs.caseload.tsx` — mount `EducatorOverview` above the existing HubShell spokes.
- `src/routes/_authenticated/hubs.school.tsx` / `hubs.district.tsx` / `hubs.partner.tsx` — mount role overview above spokes.
- `src/routes/_authenticated/owner.index.tsx` — add operations tile grid at top; keep existing panels below.

**Untouched**
- All auth, RLS, server-fn security, role guards, `_authenticated` gate.
- `/workspace/$stage`, `/report`, `/pathways/$pathwayId`.
- Owner shell + admin hub navigation.
- All tests (must still pass).

## Verification
- `bun run build`
- `bunx vitest run tests/unit/student-dashboard-render-contract.test.ts tests/unit/dashboard-static.test.ts tests/unit/no-toplevel-admin-import.test.ts`
- Playwright: `dashboard-regression.signedin.spec.ts`, `role-access-rules.signedin.spec.ts`, `role-leak-nav.signedin.spec.ts` — confirm no partner→student-data leak.
- Visual pass on each dashboard route via preview.

## Acceptance
- Every dashboard shows role-specific tool previews with live status + CTA — no pure link menus.
- Student dashboard still attaches `<main>` (contract test stays green).
- Partner dashboard exposes zero student PII.
- Owner Admin Hub keeps its ops framing (not a planning dashboard).
- Workspace and Report remain the only deep tool surfaces; dashboards link into them.

Confirm and I'll implement.
