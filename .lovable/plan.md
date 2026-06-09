# Demo Parity Plan

Goal: make both demo surfaces show the same widgets and data the real signed-in family/student dashboard now shows, and back the signed-in Demo Mode with seeded `is_demo` rows that exercise the real query paths.

## 1. Schema: `is_demo` flag + seed
One migration adds a nullable `is_demo boolean default false` to the core student-scoped tables we render on the dashboard:

```text
students, goals, action_items, calendar_events,
student_voice_responses, readiness_scores,
pathway_reports, student_resource_recommendations,
student_saved_partners, student_collaborators
```

Plus:
- Index `WHERE is_demo = true` on `students.is_demo` for fast filtering in admin views.
- A view `public.demo_student_owner` exposing the seeded student's owner_id so the seed script is idempotent.
- No RLS changes — existing `can_access_student` already scopes per row. The seed inserts the demo student with `owner_id = <seed_demo_user>` and demo collaborators referencing real auth users only when they enter Demo Mode.

## 2. Seed strategy
- New server fn `enterDemoMode()` (admin client): on first call, ensures the Jordan Rivera demo student exists with `is_demo=true`, then upserts a `student_collaborators` row giving the calling user `viewer` access. Idempotent.
- New server fn `exitDemoMode()`: revokes the calling user's demo collaborator row.
- Seed payload (constants in `src/lib/demo-seed.ts`): student profile, 4 goals across categories, 6 action items (mix of complete/in_progress/todo), 3 upcoming calendar events, 4 student_voice_responses, 1 readiness_scores row, 1 pathway_report, 3 resource recommendations, 2 saved partners.
- Owner views filter out demo rows by default (`is_demo = false`) on admin lists where it matters (`/owner/users`, `/owner/analytics`), with a toggle to include them.

## 3. Signed-in Demo Mode (`/demo-mode`)
Replace the static fixture rendering with a "Tour the dashboard" entry that:
- Calls `enterDemoMode()` on mount (button: "Start demo").
- Redirects to `/dashboard?demo=1` once seeded — user sees the *real* StudentDashboard rendering the seeded student, including NextBestAction, OnboardingChecklist, FactCards, goals, action items, DashboardCalendar, latest pathway report, InvitesInbox.
- Sticky `DemoBanner` (already exists) shows "Demo mode — Exit" at top.

## 4. Public `/demo/*` walkthrough
Update copy + sections in `demo_.hub.tsx` to mirror the real dashboard structure:
- Add "Next best action" card at top.
- Add "Onboarding checklist" preview.
- Rename "Care team" → "Collaborators" and add invite-status pills (Pending/Accepted) matching the real `InvitesInbox` styling.
- Add "Saved resources" and "Recommended partners" panels in the side column.
- Other steps (`intake`, `meeting`, `plan`, `report`, `resources`) get a small footer link to "See this in your own dashboard" pointing to `/demo-mode`.

## 5. Files touched
- New: `supabase/migrations/<ts>_add_is_demo_flag.sql`, `src/lib/demo-seed.ts`, `src/lib/demo-mode.functions.ts`
- Edited: `src/routes/_authenticated/demo-mode.tsx`, `src/routes/demo_.hub.tsx`, `src/routes/demo_.{intake,meeting,plan,report,resources}.tsx` (footer link only), `src/components/site/DemoBanner.tsx` (exit button wires to `exitDemoMode`)
- Owner filters: `src/lib/owner/users.functions.ts`, `src/lib/owner/analytics.functions.ts` (add `is_demo=false` default)

## 6. Validation
- `bunx tsc --noEmit`
- Manual: enter demo, confirm `/dashboard` shows Jordan Rivera with all widgets populated; exit, confirm dashboard returns to user's real student (or empty state).
- Confirm owner `/owner/users` hides demo collaborator unless "Include demo" toggled.

## 7. Out of scope
- No redesign of StudentDashboard, DashboardWidgets, or the public marketing demo's visual identity.
- No is_demo flag on tables not rendered on the dashboard (forms, messages, ai_jobs, etc.).
