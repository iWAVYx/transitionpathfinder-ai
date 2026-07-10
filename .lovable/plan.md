# Product-Depth & Role-Value Pass

Goal: bulk up role experiences, Transition Workspace stages, Pathway Report, and Demo previews so each role feels comprehensive and worth paying for — without rebuilding the current visual direction.

## Approach

Work in layered, verifiable passes. Each pass ends with typecheck + targeted tests before moving on. No visual restart; existing routes, permissions, and shells stay intact.

## Pass 1 — Shared Sample & Content Layer

Deepen the sample-data + copy foundation so every downstream surface (demo dashboards, workspace stages, report) gets richer content from one source.

- Expand `src/lib/workspace/stage-samples.ts` with more Input/Insight/Pathway/Action items per stage (START, VOICE, FAMILY, SCHOOL, EVIDENCE, READY, ROADMAP, ACTION, CONNECT).
- Add sample data modules for: readiness categories, 30/60/90/6mo/1yr plans, BridgeForward/TransitionForward pathway matches with rationale, sample documents/evidence, family priorities, educator insights, meeting prep questions.
- Keep Title Case headings; use `src/lib/title-case.ts` for dynamic strings.

## Pass 2 — Transition Workspace Stage Depth

Enrich `StageSamplePanel` sections and `StageBody` role strip content so each stage clearly shows Input → Insight → Pathway → Action with 3–6 concrete items each, source notes, and realistic outputs. No new routes.

## Pass 3 — Pathway Report Depth

Expand the report view components to render deeper sections:
Student Snapshot, Student Voice, Family Priorities, Educator Insights, Documents & Evidence, Readiness Scorecard, IEP/Transition Translator, Data Gaps, Recommended Pathways, Career/Life Matches, Meeting Prep, Recommended Resources, Partner Matches (where permitted), Family/Educator Action Plans, 30/90/6mo/1yr Next Steps, Student/Family/Educator views, Source Notes + AI disclaimer.

Use sample data in demo view; wire real fields where already present in signed-in view.

## Pass 4 — Role Dashboards (Demo Previews + Signed-in)

For each role dashboard, audit and strengthen the same 11 elements listed in the request (overview, tools, next actions, data, outputs, deeper menus, CTAs, empty/loading/error states, TW link, Report link). Roles:

- Student: My Pathway, Voice, strengths, readiness snapshot, actions, saved resources, meeting prep, calendar, Report student view.
- Parent/Guardian: connected student, documents, family priorities, questions, meeting prep, sharing/consent, resources, action items, Report family view.
- Educator/Case Manager: caseload, readiness gaps, notes, meeting prep, actions, calendar, authorized docs, Report educator view.
- School Admin: school overview, planning status, team activity, report completion, readiness trends, support needs, resource usage, implementation, compliance.
- District Admin: district overview, schools, per-school progress, trends, implementation, reports, service gaps, partnerships, staff access.
- Partner: profile, opportunities, submissions, deadlines, PartnerForward incentives, resources, collaboration guidance. Enforce no access to student PII/docs/Voice/Report/goals/meetings/notes.
- Platform Owner: keep Admin Hub separate; polish nav to users/waitlist/contacts/resources/sources/partner network/submissions/outreach/site content/system health/beta/feedback/bugs/launch/analytics/pilot/demo.

## Pass 5 — Demo Workspace Role Previews

Update role-based demo dashboards to mirror the signed-in product depth using sample data — same widgets, same CTAs — so the demo is an honest preview, not a lighter shell.

## Pass 6 — Copy & UI Polish

- Sharpen labels, CTAs, empty states across touched surfaces.
- Title Case headings, action-oriented CTAs, friendly non-technical language.
- Remove generic filler / duplicated copy where found in touched files.

## Pass 7 — Verification

- `tsgo` typecheck.
- `bunx vitest run` for unit tests; update stale expectations only if content shape changed.
- Playwright smoke: `/demo`, `/demo/workspace/$stage` for each stage, one dashboard per role (where a public preview exists), partner restriction check.
- Production build.

## Technical Notes

- No new routes; extend existing components and sample modules.
- Partner restriction enforced via existing `is_partner_only` / RLS; UI simply hides student-scoped widgets for partner role.
- Keep `WorkspaceShell`, `SmartBackLink`, route transitions untouched.
- Any dynamic heading strings go through `titleCase()`.
- All new sample content lives under `src/lib/workspace/` or `src/lib/demo/` — no DB changes.
- No schema migrations; no changes to `src/integrations/supabase/*`.

## Out Of Scope

- New auth flows, new routes, new tables, new edge functions.
- Visual redesign, theme changes, new component library.
- Real analytics wiring for admin hub (sample cards only where already present).

## Scale Warning

This touches many files across dashboards, workspace, and report. I will land it in the 7 passes above and pause between passes if anything gets risky (test failures, ambiguous role scope, or partner-access edge cases) so we can course-correct instead of a giant single edit.
