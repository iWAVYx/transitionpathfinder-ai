# Signed-In Polish Pass — Slice 1 of N

You picked: **Role separation + navigation first**, **"You figure it out" on backend**, **polished locked/coming-soon states**, **~2 on the pacing slider**.

The audit found the foundation has more issues than I expected. Fixing those is a prerequisite for every later slice (dashboards, forms, RLS, etc.), so Slice 1 is scoped tightly to that foundation. I'll come back for Slice 2 after you've reviewed.

---

## What's wrong today (from audit)

1. `app_role` enum has 9 values (`parent, educator, admin, case_manager, student, guardian, teacher, school_admin, partner`) but onboarding writes only 5, collapsing `educator`/`teacher`/`case_manager` into one option and never producing `school_admin` or `case_manager` at all.
2. Role policy maps `teacher`/`educator`/`case_manager` to one audience and `admin`/`school_admin` to another — School Admin gets the same nav as Platform Admin.
3. New signups land on `/dashboard` with no data and no push to `/onboarding`.
4. "Settings" sits inside the Admin nav group but is actually for everyone.
5. The `"other"` onboarding option silently grants the parent/family view.
6. No standardized empty-state / locked-state component for unfinished features.

## What this slice ships

### A. Database — role model cleanup (1 migration)

- Add `case_manager` and `school_admin` as first-class onboarding outputs (enum already has them).
- Backfill: any `educator` user who self-identifies as a case manager keeps `educator` plus gets `case_manager` on next onboarding edit (no destructive backfill — additive only).
- Tighten `audiencesForRoles`:
  - `student` → new `student` audience (was silently `parent`)
  - `parent | guardian` → `family`
  - `educator | teacher | case_manager` → `educator` (renamed from `teacher`)
  - `school_admin` → new `school_admin` audience (separate from platform `admin`)
  - `admin` (= platform) → `admin`
  - `partner` → `partner`
  - unknown / `other` → no audience (forces onboarding)
- Add SQL `has_audience(uid, text)` helper for future RLS use (not yet wired into policies — that's a later slice).
- No table drops, no column removals, no destructive RLS changes in this slice.

### B. Onboarding — accurate role capture

Rewrite the role step in `src/routes/_authenticated/onboarding.tsx`:

```
Who are you?
  ○ Student
  ○ Parent or Guardian
  ○ Educator or Case Manager           (writes: educator + case_manager)
  ○ School Administrator               (writes: school_admin)
  ○ Partner Organization               (writes: partner)
```

Removes the misleading `"other"` option. `administrator` UI id no longer writes `admin` (which is platform admin).

Add a `_authenticated/route.tsx` `beforeLoad` check: if signed in and `profiles.onboarding_completed === false` and not already on `/onboarding`, redirect to `/onboarding`. Owner/admin paths skip the check.

### C. Role-aware navigation (`SiteHeader.tsx`)

Replace the current single nav-group set with **per-audience nav definitions** matching the categories you listed:

| Audience | Visible groups |
|---|---|
| Student | Overview, Planning Tools, Resources, Account |
| Family | Overview, Planning Tools, Resources, Collaboration, Account |
| Educator / Case Manager | Caseload, Planning Tools, Resources, Collaboration, Insights, Account |
| School Administrator | School Overview, Staff & Team, School Reports, Implementation, Account |
| Partner | Partner Profile, Opportunities, Submissions, Partner Resources, Account |
| Platform Admin | Owner Hub link + own nav (unchanged) |

- Move "Settings" out of "Admin" into a new "Account" group available to everyone.
- "School Admin" stops appearing under a group called "Admin" — it gets its own School Administrator nav set.
- Educator language standardized to **"Educator / Case Manager"** in nav labels, audience picker copy, the dashboard collaborator invite text, and the report section header (`Teacher/Case Manager Plan` → `Educator / Case Manager Plan`).
- Audience-aware nav uses a new `useUserAudiences()` hook (wraps existing `getMyRoles` server fn) so we don't duplicate that fetch in every component.

### D. Locked / Coming-Soon component

New `src/components/LockedFeature.tsx` — a polished card with icon, title, description, and optional "Notify me" CTA. Used in this slice only where nav items point to features that aren't built for that role yet (e.g. School Admin "School Reports", Student "Student Voice Activities"). Existing working pages are untouched.

A small `src/lib/feature-flags.ts` map declares which (audience, feature) pairs are locked, so Slice 2+ can flip them on one at a time.

### E. Route guard cleanup

- `ROUTE_AUDIENCES` updated to match the new audience names.
- New `_authenticated/school/` routes scaffolded as empty shells with `LockedFeature` so the School Administrator nav doesn't 404. (Real School Admin dashboard is Slice 2 or 3.)
- `RoleGuard` redirects School Administrator away from `/admin` (Platform Admin) and surfaces a clear toast instead of a generic one.

### F. Out of scope for this slice (explicitly)

- New dashboards per role (Slice 2)
- Caseload / assigned students UI (Slice 2)
- Pathway report rework, action items, meeting prep functional polish (Slice 3+)
- Partner opportunity submission backend (later)
- RLS rewrites — only additive helper added; no policy changes
- Mobile QA pass on every screen (Slice final)
- Responsive table-to-card transformations (Slice final)

## Technical notes

- One Supabase migration: enum already has the needed values, so this is helper functions + an additive trigger update for onboarding (no enum changes, no column drops).
- Audience type centralized in `src/lib/role-policy.ts` as a string-literal union; `RoleGuard`, `SiteHeader`, and `LockedFeature` import from one source.
- `getMyRoles` server fn is unchanged; a new `getMyAudiences` server fn returns the derived audience set so the client never has to re-derive.
- No edits to auto-generated files (`routeTree.gen.ts`, `types.ts`, `client.ts`).

## Verification before I report done

- Hard-refresh on `/dashboard` as a brand-new account → lands on `/onboarding`.
- Pick each of the 5 role options → correct rows in `user_roles` and `profiles.primary_role`.
- After onboarding, nav shows only that audience's groups; Settings appears for all.
- School Administrator account does **not** see Platform Admin links.
- Existing parent/educator accounts keep working — no regressions on student list, pathway, documents, dashboard.
- Locked routes render `LockedFeature`, not a blank page or error.

## Slice 2 preview (for your awareness, not part of this approval)

Once Slice 1 lands, the next highest-leverage slice is **Educator / Case Manager experience**: real caseload dashboard, assigned-students list backed by `student_collaborators`, case-manager notes wired to Supabase, assign-action-item flow, polished empty states. Estimated similar size to Slice 1.

---

Approve this plan and I'll implement Slice 1. If you want anything moved between slices (e.g. pull the Student dashboard into Slice 1, push onboarding to Slice 2), say so and I'll revise.
