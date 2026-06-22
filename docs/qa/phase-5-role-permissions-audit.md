# Phase 5 — Role Permissions Audit (Verification)

Date: 2026-06-22
Scope: verification only — no policy redesign. Confirms the three guards
called out in `.lovable/plan.md` Phase 5.

## Findings

### 1. `/owner/*` is admin-only ✅

`src/routes/_authenticated/owner.tsx` is a layout route whose
`beforeLoad` calls `getMyAdminRoles()` and throws a redirect to
`/dashboard` unless `isPlatformAdmin` is true. All `owner.*.tsx`
children render under this layout's `<Outlet />`, so the gate applies
to every `/owner/*` URL — including the operational sub-pages
(`partner-network`, `outreach`, `pilot-packages`,
`partnerforward-resources`, etc.). A `withRoleGuard(["admin"])`
wrapper is therefore unnecessary; the route-level gate is stricter
(platform-admin row in `user_roles`) than the audience-level check
and runs before render.

### 2. `/opportunities` does not expose partner-management UI ✅

`src/routes/_authenticated/opportunities.tsx` is wrapped in
`<RoleGuard path="/opportunities">`, which allows
`family | educator | student | admin | partner` per
`ROUTE_AUDIENCES`. The page is read-only: it lists partners via
`listPartnersForBrowse`, renders `matchPartnersForStudent` cards, and
provides filter inputs only. There are no create/edit/delete controls
and no imports from `partners-manage.functions` or the partner
workspace components. Partner-management UI is isolated to
`/partners-manage` (gated to `partner | admin`).

### 3. `parent` cannot reach unrelated student detail pages ✅

`src/routes/_authenticated/students.$studentId.tsx` wraps its
component with `withRoleGuard(["family", "educator", "admin"])`, so
`student` and `partner` roles are bounced. For a `parent` user the
audience check passes, but the data layer enforces the per-student
scope: `getStudent` (and every read on `students`,
`student_collaborators`, `pathway_reports`, etc.) runs under RLS
policies that resolve through `can_access_student(auth.uid(), id)`,
which only returns true for the student's own profile, an approved
collaborator membership, or an admin role. A parent visiting a
sibling family's `/students/<other-id>` URL hits the RLS denial path
and the route shows the empty/not-found state — no PII leak.

## Conclusion

No code changes required. The Phase 5 checklist is satisfied by the
guards already in place. Memory entry `mem://security-memory.md`
already encodes the underlying invariants (`can_access_student`
scoping, no broad `TO anon` on PII, no `UPDATE` on `user_roles`);
no update needed.
