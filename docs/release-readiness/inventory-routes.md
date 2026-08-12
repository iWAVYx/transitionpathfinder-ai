# Route & Role-Access Matrix

Generated from `src/routes/**` on 2026-07-21. Route paths derive from
TanStack file naming (dots = slashes, `_authenticated` is a pathless
layout gate).

## Gating layers in effect

1. **Layout gate** — `src/routes/_authenticated/route.tsx` (`ssr: false`)
   calls `supabase.auth.getUser()` and redirects to `/auth`. Every
   `_authenticated/*` URL is signed-in only.
2. **Owner gate** — `src/routes/_authenticated/owner.tsx` `beforeLoad`
   calls `getMyAdminRoles()` and redirects to `/dashboard` unless
   `isPlatformAdmin`. Applies to every `owner.*.tsx` child.
3. **Audience gate** — `src/components/RoleGuard.tsx` +
   `src/lib/role-policy.ts` (`ROUTE_AUDIENCES`). Anything not listed in
   `ROUTE_AUDIENCES` is open to every signed-in user. See
   `docs/qa/phase-5-role-permissions-audit.md` for the June audit that
   confirms `/owner/*` = platform-admin, `/opportunities` = read-only for
   family/educator/student/admin/partner, and `/students/:id` is RLS-scoped
   via `can_access_student`.
4. **RLS** — every user-scoped table gates SELECT/INSERT/UPDATE/DELETE
   through the SECURITY DEFINER helpers listed in `README.md`. UI hiding
   is never the sole control.

## Public routes (top-level, no auth)

Marketing/site: `about`, `blog`, `blog.$slug`, `contact`, `educators`,
`families`, `framework`, `help`, `index`, `partners`,
`partner-directory`, `partner-interest`, `partnerforward`,
`partnerforward.incentives`, `platform`, `pricing`, `privacy`,
`programs.transitionforward`, `research`, `terms`,
`trust-and-safety`.

Hubs (public): `hubs.bridgeforward`, `hubs.family-resource`,
`hubs.partner-network`, `hubs.school-district`,
`hubs.transition-planning`, `bridgeforward`.

Discovery: `partner-directory`, `pathways.$pathwayId`, `resources`.

Auth surfaces: `login`, `login.2fa`, `login.index`, `reset-password`,
`unsubscribe`.

Entry funnels: `waitlist`, `get-started.index`, `get-started.$role`,
`admin-invite.$token`, `invite.$token`, `share.$token`.

Demo (public, signed-out safe): `demo`, plus 25 `demo_.*` deep pages
covering each role, workspace stage, feature, and the Transition
Channel. Demo state is in-memory only (`src/lib/demo/**`) and never
touches Supabase writes.

## `_authenticated/*` routes (134 files)

Grouped by audience per `ROUTE_AUDIENCES` (the source of truth). Where a
route is not listed in `ROUTE_AUDIENCES` it is open to every signed-in
user — RLS still enforces per-row scoping.

### Student / family / educator workspace (RoleGuard + `can_access_student`)

- Workspace: `workspace.$stage`, `workspace.index`, `dashboard`,
  `pathway`, `pathway.family`, `pathway.student`, `ppt-prep`,
  `reports`, `reports.$reportId`, `documents`, `documents.$documentId.review`,
  `action-items`, `calendar`, `feed`, `students`, `students.$studentId`,
  `messages`, `student-voice`, `activity`.
- BridgeForward tools: `bridgeforward.intake`, `bridgeforward.voice`,
  `bridgeforward.fit-finder`, `bridgeforward.snapshot`,
  `bridgeforward.explore`.
- Family surfaces: `family.action-items`, `family.priorities`,
  `family.consent`, `family.history`, `family.invites`,
  `family.resources.recommended`.
- Educator surfaces: `caseload`, `teacher-portal`,
  `educator.action-items`, `educator.pending-input`,
  `educator.readiness-gaps`, `educator.document-review`,
  `educator.notes`, `educator.history`.
- Student surfaces: `student.history`.

### School / district admin

- School: `school.overview`, `school.team`, `school.reports`,
  `school.implementation`, `school.support-needs`,
  `school.planning-status`, `school.readiness-trends`,
  `school.resource-usage`, `school.calendar`, `school.history`,
  `admin-school`.
- District: `district.overview`, `district.schools`, `district.team`,
  `district.reports`, `district.progress`,
  `district.implementation`, `district.service-gaps`,
  `district.readiness-trends`, `district.history`.

### Partner workspace (`RoleGuard` = partner | admin)

`partners-manage`, `partners-manage_.deadlines`,
`partners-manage_.impact`, `partners-manage_.opportunities`,
`partners-manage_.profile`, `partners-manage_.resources`,
`partner-network`, `partner.history`.

### Communications / channel

`transition-channel` — audience: student / family / educator /
school_admin / district_admin / partner (per `ROUTE_AUDIENCES` +
`is_channel_member` RLS). Feature page consolidates every tab; not
mounted on the owner hub.

### Operator console (org admins + platform admins)

`admin.orgs` (Codes, Invitations, Members & Seats, License Requests,
Moderation, Health). `admin`, `analytics`, `settings`, `security`,
`trust`, `demo-mode`.

### Owner Hub (platform admins only, gated in `owner.tsx`)

`owner`, `owner.users`, `owner.organizations`, `owner.opportunities`,
`owner.outreach`, `owner.launch`, `owner.pitch`, `owner.settings`,
`owner.testimonials`, `owner.testing`, `owner.waitlist`,
`owner.role-audit`, `owner.issues`, `owner.media`,
`owner.pilot-packages`, `owner.partner-network`,
`owner.partner-submissions`, `owner.partnerforward-resources`,
`owner.resources`, `owner.resource-review`, `owner.resource-sources`.

Legacy redirects (verified inert): `owner.partner-network-status` →
`/owner/partner-network`, `owner.partner-outreach` →
`/owner/outreach`, `owner.testing-scripts` → `/owner/testing`.

## `api/*` routes

- `api/public/channel-digest-tick` — pg_cron every 15 min; service-role
  data access after dedicated cron bearer + environment identity verification.
- `api/public/hooks/obs-alert-check` — pg_cron; dedicated cron bearer +
  environment identity verification.
- `api/public/hooks/obs-events-purge` — pg_cron; dedicated cron bearer +
  environment identity verification.

Email infra routes under `routes/lovable/email/**`:
`auth/preview`, `auth/webhook`, `queue/process`, `suppression`,
`transactional/preview`, `transactional/send`.

## Route × role snapshot

| Audience         | Signed-in dashboard | Workspace access | Transition Channel | Partner Network | Owner Hub |
| ---------------- | ------------------- | ---------------- | ------------------ | --------------- | --------- |
| student          | `/dashboard`        | Yes              | Yes                | Read-only       | No        |
| family (parent)  | `/dashboard`        | Yes              | Yes                | Read-only       | No        |
| educator         | `/dashboard`        | Yes              | Yes                | Read-only       | No        |
| school_admin     | `/school/overview`  | No (returns to school) | Yes           | Read-only       | No        |
| district_admin   | `/district/overview`| No               | Yes                | Read-only       | No        |
| partner          | `/partners-manage`  | No               | Yes                | Manage own listings | No    |
| admin (platform) | `/owner` / anywhere | Yes              | Yes                | Full            | Yes       |

## Gaps identified in Slice 0 (deferred to later slices, evidence-only)

1. **Feature-page back-destination contract** — asserted in
   `.github/workflows/dashboard-regression.yml` and
   `tests/e2e/dashboard-tile-navigation.signedin.spec.ts`, but Slice 0
   did not re-run it. Ledger item R-08.
2. **`/api/public/*` handler auth review** — three routes exist. Slice
   0 confirmed only the file names; per-handler signature/authz review
   deferred to Slice 2. Ledger item R-11.
3. **Legacy or unlinked routes** — the three `owner.*` redirect files
   are intentional. No other stubs identified in the file walk, but a
   render-time crawl (planned in Slice 2 / Slice 8) is needed to prove
   every dashboard tile lands somewhere.
