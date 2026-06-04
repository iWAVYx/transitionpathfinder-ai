# Signed-In Polish Pass — Plan

This is a polish + persistence pass. No structural rebuild, no public-site redesign, no changes to the 7-role model, the routing tree, the navigation system, or the Lovable Cloud schema unless a slice explicitly calls for additive changes (new columns/tables, never destructive).

Because the request is huge, I'll ship it in **8 reviewable slices**. After each slice you can say "next" (continue), "stop", or "adjust X". I won't move on until you say so.

---

## Guardrails (apply to every slice)

- Keep the existing role structure, dashboard structure, route tree, design tokens, and visual identity.
- Educator/Case Manager ≠ School Admin ≠ District Admin ≠ Platform Admin. Never collapse them.
- All sensitive reads stay RLS-scoped via `can_access_student` / `auth.uid()`. No new `TO anon` policies on PII.
- Server-side writes go through `createServerFn` with `requireSupabaseAuth`; admin-elevated work uses `supabaseAdmin` inside the handler (never at module scope).
- No fake/dead buttons. If a feature isn't implementable in-pass, ship a polished "coming soon" state with a clear reason.
- No hardcoded demo data leaking into real accounts. Demo Mode is clearly labeled and scoped.
- Responsive: desktop / tablet / mobile checked on every touched surface.

---

## Slice 1 — Pathway Report polish (the core deliverable)

Make the report feel like a real meeting-ready document.

- Refactor `src/components/pathway/ReportView.tsx` into a clearly-sectioned, print-friendly layout with consistent section cards, readiness badges, and "Based on Information Provided" / "Needs Human Review" labels where appropriate.
- Audit which of the requested sections already render (Snapshot, Strengths/Preferences/Interests/Needs, Student Voice, Postsecondary Goals, Recommended Pathways, Career & Life Matches, Readiness Scorecard, IEP Translator, Missing Information, Family Action Plan, Educator Action Plan, Meeting Prep Questions, Recommended Resources, Opportunity Matches, 30/90/180/365-day next steps). Add polished empty/"needs more info" states for any that are missing data.
- Print stylesheet pass: page breaks between major sections, hide nav/chrome on `@media print`.
- Header action bar: Download PDF, Share, Save, Print, "Generate updated version" — all wired to existing functions or showing a clear locked/coming-soon state.
- Standardized AI disclaimer footer block.

## Slice 2 — Next Best Action system

- New `src/components/dashboard/NextBestAction.tsx` — small card with title, why-it-matters line, and a single primary CTA that links into the relevant feature.
- New server fn `getNextBestAction` (per role) in `src/lib/next-best-action.functions.ts` that inspects real data (profile completeness, has-student, has-report, has-action-items, has-opportunity, waitlist count for owner, etc.) and returns a typed `{ headline, body, ctaLabel, ctaHref }`.
- Mount on Student, Family, Educator, School Admin, District Admin, Partner, and Platform Admin dashboards. Existing dashboards (`StudentDashboard`, `dashboard.tsx`, school/district/partner/owner shells) get a top slot — no structural change.

## Slice 3 — Student Voice as a real feature

- New route `_authenticated/student-voice.tsx` (or extend existing if present) with the 9 age-appropriate prompts you listed.
- Persist to a new `student_voice_responses` table (student_id, prompt_key, response_text, updated_at) with RLS via `can_edit_student` / `can_access_student`.
- Surface answers in: Student Profile page, Pathway Report ("Student Voice" section), Meeting Prep, and as inputs to the resource recommender.
- Warm, student-friendly visual treatment using existing tokens (no new palette).

## Slice 4 — Role-based onboarding depth  ✅ shipped

- Added role-specific question sets in `src/lib/onboarding-questions.ts` for parent, student, educator, school_admin, district_admin, partner.
- Onboarding flow now has 4 steps: role → about you → role-specific questions → student (when needed).
- New `profiles.onboarding_answers` JSONB column (additive migration) persists answers.
- `saveOnboardingProgress` server fn persists between steps so refresh resumes where the user left off.
- `completeOnboarding` now accepts `onboarding_answers` and supports `district_admin` (was previously rejected by the enum).

## Slice 5 — Resource recommender + Meeting Prep + Action Items  ✅ shipped

- **Recommender**: `recommendResourcesForStudent` scores verified resources against the student's strengths/interests/needs/grade and returns matches with "why this was recommended" chips. Surfaced via `RecommendedResourcesPanel` on the student detail page; users can save matches into their library (`saveResource`).
- **Meeting Prep**: meeting detail page now has a "Pull from profile" button that prefills `student_voice`, `family_concerns`, and `teacher_notes` from the student record (only fills empty fields). Print/Export and Mark completed were already in place.
- **Action Items**: full per-student CRUD via `action-items.functions.ts` (list/create/update/delete) using the existing `action_items` table. New `ActionItemsPanel` shows priority, category, due date, status (not_started / in_progress / completed / blocked) with a completion progress bar; mounted on the student detail page.

## Slice 6 — Trust & Consent center + Demo Mode  ✅ shipped

- New `_authenticated/trust.tsx` (or extend settings) showing: who has access to each student, what's been shared, share/revoke controls, AI processing policy in plain language. All reads from existing `student_collaborators` / `share_tokens` / `consent_records` tables — no schema change required.
- **Demo Mode**: a single seeded "Demo Student" the user can explore from their dashboard (read-only, clearly badged "DEMO"). Implemented as a client-side fixture rendered in the existing student-profile / pathway-report shells so it cannot mix with real data. CTA from each role dashboard's empty state.

## Slice 7 — Role dashboard completeness + persistence QA

- Walk each role dashboard against your section list and fill the gaps with real (or "coming soon") widgets. No structural changes; widgets slot into existing shells.
- Persistence audit: onboarding, profile, role, student profile, student voice, documents, pathway reports, recommended/saved resources, action items, meeting prep, notes, consent/sharing, partner opportunities, school/district connections, admin content. Anywhere a save silently no-ops, fix or surface an error toast.

## Slice 8 — Responsive + final golden-path QA

- Sweep the touched surfaces at 360 / 768 / 1280 widths: dashboards, sidebar, forms, pathway report, resource cards, meeting prep, action items, student profile, admin hub, school/district dashboards.
- Run the 6 golden-path scripts you listed end-to-end against the preview, fix anything that breaks, and report the result.

---

## What you'll see after each slice

A short summary of what shipped, what files changed, and the next slice queued up. Any new tables/columns are additive migrations you approve before they run.

**Reply "start slice 1" (or "start with slice N") to begin.**
