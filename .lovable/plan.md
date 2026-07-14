
# Next Action System — Plan

Replace the static Activity / Next Steps card on every signed-in role dashboard (and mirrored Workspace demo previews) with a shared, data-driven Next Action engine plus a separate Activity History surface.

## 1. Data Model (one migration)

New tables in `public` with GRANTs + RLS (student-scoped via existing `can_access_student`, org-scoped via `is_org_member`/`is_org_admin`, self-scoped via `auth.uid()`):

- `next_actions`
  - `id`, `owner_user_id`, `owner_role` (text), `audience` (text), `student_id?`, `organization_id?`
  - `kind` (text, e.g. `complete_intake`, `upload_iep`, `review_report`, `publish_opportunity`, …)
  - `title`, `reason`, `cta_label`, `cta_route`, `secondary_route?`
  - `status` (`not_started|in_progress|waiting|needs_review|due_soon|overdue|completed`)
  - `priority` (int), `due_at?`, `blocked_reason?`
  - `related_document_id?`, `related_report_id?`, `related_meeting_id?`, `related_opportunity_id?`
  - `created_at`, `updated_at`, `completed_at?`, `completed_by?`, `completion_note?`
- `activity_history`
  - `id`, `actor_user_id`, `actor_role`, `student_id?`, `organization_id?`
  - `event_type` (upload / step_completed / report_updated / meeting_noted / access_changed / opportunity_status / invitation_sent / invitation_accepted / comment)
  - `subject_title`, `subject_route?`, `related_*_id?`, `metadata jsonb`, `occurred_at`

RLS:
- `next_actions`: user sees rows where `owner_user_id = auth.uid()` OR they can access `student_id` / are org member of `organization_id`. Update/complete only by owner or student editor.
- `activity_history`: read-only for anyone with access to the subject; inserts only via server functions.

Helper trigger: `set_updated_at`. Complete action = server fn that stamps `completed_at/by` and inserts an `activity_history` row.

## 2. Derivation Engine (server function)

`src/lib/next-actions/*.functions.ts`:

- `getNextActions({ role, studentId?, organizationId? })` — pulls stored rows AND synthesizes derived actions from live state each call, then merges/dedupes by `kind + subject`:
  - onboarding incomplete (`profiles`, `student_intakes`)
  - missing student connections (`student_relationships` pending)
  - unreviewed documents (`documents` with no `document_summaries`/tags)
  - draft pathway reports (`pathway_reports.status`)
  - upcoming/overdue meetings (`meetings`, `meeting_action_items`)
  - pending consent (`consent_records`, `sharing_permissions`)
  - pending invitations (`invitations`)
  - partner: draft/pending opportunities (`partner_opportunities`, `partner_submissions`)
  - admin: partner submissions to review, waitlist, `system_health_checks`
  - school/district admins: readiness gaps, staff invite gaps, org membership pending
- `completeNextAction({ id, note? })`
- `dismissNextAction({ id })`
- `listActivityHistory({ scope })` with pagination

All protected by `requireSupabaseAuth` and role checks.

## 3. Prioritization

Sort: overdue → blocked → due_soon → required setup → needs_review → recommended → recently_updated. Cap default view at 5 items. "View All" opens the drawer / `/activity` route.

## 4. Shared UI

`src/components/next-actions/`:
- `NextActionCard.tsx` — the section (title, count, filter, `View All`)
- `NextActionRow.tsx` — title (Title Case), reason, owner chip, status badge, urgency, primary CTA, optional secondary, expand for details/complete/dismiss
- `RecentlyCompletedStrip.tsx` — collapsed list of last 3 completed
- `EmptyState.tsx` — "No Urgent Actions Right Now" + one meaningful suggestion per role
- `ActivityHistoryList.tsx` — used on `/activity` and role history routes

Uses TanStack Query with `queryOptions` + `ensureQueryData` per `tanstack-query-integration`; mutations invalidate `['next-actions', scope]` and `['activity-history', scope]`.

## 5. Dashboard Wiring

Replace the static Next Steps block in each surface, keeping existing dashboard shell, `data-testid`, and semantic `<main>`:

- Student: `src/components/dashboard/student/*` + `hubs.student`
- Parent/Family: `hubs.family` + parent dashboard cards
- Educator/Case Manager: `caseload`, `hubs.caseload`, educator cards (retire `EDUCATOR_NEXT_ACTIONS` static list)
- School Admin: `hubs.school`, `school.overview`
- District Admin: `hubs.district`, `district.overview`
- Partner: `hubs.partner`, `partners-manage`
- Platform Owner / Admin Hub: `hubs.admin`

Each mount passes `role` + relevant `studentId` / `organizationId` scope.

## 6. Activity History Surface

New route `src/routes/_authenticated/activity.tsx` (list + filters) plus role-specific views reusing `educator.history`, `family.history`, `district.history`, `owner.activity` (already exist — swap their content to the shared list). Recordkeeping fields: `completed_by`, `completed_at`, `related_*_id`, `related_role`, `status`, note.

## 7. Demo / Workspace Previews

Add `src/lib/next-actions/demo-fixtures.ts` with realistic sample data per role. Demo pages (`demo_.student`, `demo_.family`, `demo_.educator`, `demo_.school-admin`, `demo_.district-admin`, `demo_.partner`, `demo_.owner`, `demo_.workspace.$stage`) render the same `NextActionCard` fed by fixtures. CTAs route to demo-safe pages (`/demo/...`) or expand inline. Retire `EDUCATOR_NEXT_ACTIONS` / `PARTNER_OUTREACH_ACTIONS` static timelines from the demo shells.

## 8. Contracts To Preserve

- Existing role guards / protected routes untouched.
- Dashboard shell + `data-testid` unchanged; `<main data-auth-state>` preserved.
- No duplicate `<main>` links (rows use single primary CTA + optional secondary in a menu).
- Every button has `type` / `aria-label` / handler so `dashboard-regression` inert-button check passes.
- Old `NextStepsTimeline` component stays for framework/marketing pages that use it; only the dashboard usages are swapped.

## 9. Verification

- `bun run test:unit`
- `bunx playwright test --project=dashboard-regression`
- `bunx playwright test --project=role-access`
- New unit tests: derivation prioritization, per-role fixture rendering, completion moves item out of active list.

## 10. Scope / Rollout

Single PR, staged internally in this order so the build stays green at each step:
1. Migration + server fns + shared UI + demo fixtures.
2. Swap Student + Parent dashboards + their demos.
3. Swap Educator + School + District dashboards + demos.
4. Swap Partner + Owner dashboards + demos.
5. Activity history route + role history views.
6. Retire static `EDUCATOR_NEXT_ACTIONS` / `PARTNER_OUTREACH_ACTIONS` from demo shells.
7. Run all three test suites, fix regressions.

## Technical Notes

- Server fns live in `src/lib/next-actions/*.functions.ts`; admin-only helpers dynamically import `client.server`.
- `next_actions.status` uses a text CHECK, not enum (easier to extend). Overdue is derived from `due_at < now()` at query time, not stored.
- Completion is idempotent — repeat calls no-op after `completed_at` set.
- Activity history writes are best-effort inside the completion transaction; failure logs a warning but does not roll back the completion.
- Demo fixtures are pure TS, no DB access, so demo routes stay SSR-safe and unauthenticated.

Confirm and I'll start with step 1 (migration + engine + shared UI).
