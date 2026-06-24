## Goal

Turn `/demo` into a deep, polished, guided walkthrough that mirrors the real product (intake → Student Voice → document insights → Pathway Report → role dashboards → resources → opportunities → action plan → meeting prep), using fictional sample data and never touching real accounts, storage, or signed-in routes.

## Sample Persona (single canonical fixture)

One shared fixture powers every demo screen so the story stays coherent.

- **Jordan Rivera**, Grade 11, fictional CT public high school
- Focus: career training, community college exploration, supported employment, self-advocacy, transportation, independent living
- Strengths: hands-on learning, visual problem solving, consistent attendance, interest in media/tech
- Support needs: executive functioning, transportation planning, interview prep, complex forms, meeting self-advocacy
- Family priority: clear next steps + confidence navigating options
- Educator priority: connect goals/accommodations/services to real opportunities

All copy stamped “Sample data — fictional student for demonstration only.”

## Routes (additive only — no signed-in routes touched)

```text
/demo                  Start Demo (overview + role picker + step nav)
/demo/intake           Intake depth (categorized sample answers)
/demo/voice            Student Voice prompts + sample responses (NEW)
/demo/documents        IEP/document insights with “planning companion” banner (NEW)
/demo/report           Pathway Report (expanded with all sections)
/demo/plan             30/60/90 day action plan + responsible role
/demo/resources        Sample resource matches with rationale
/demo/opportunities    Partner opportunity matches (NEW)
/demo/meeting          Meeting prep checklist + sample summary
/demo/calendar         Sample milestones + meetings
/demo/hub              Role dashboard previews (student/parent/educator/school/district/partner/platform tabs)
/demo/next             What Happens Next + conversion CTAs (NEW)
```

Existing `/demo/*` routes stay; new routes added; broken/duplicate links removed.

## Shared Demo Shell

A new `DemoShell` adds:
- Persistent **sample-data banner** (“Fictional sample. Not a real student.”)
- **Step rail** with progress (1 Start → 9 Next Steps), keyboard + mobile-friendly
- **Role view switcher** (Student / Parent / Educator / School Admin / District Admin / Partner / Platform Admin) stored in URL `?view=` so views are shareable
- **Prev / Next** controls and breadcrumbs
- Read-only locks: any form/save action shows a tooltip “Sample only — sign in to save.”

## Pathway Report Demo (flagship)

`/demo/report` rebuilt as the centerpiece with collapsible sections in this order:

1. Student Snapshot
2. Plain-Language Summary
3. Key Next Steps (top 3)
4. Student Voice Summary
5. Family Priorities
6. Educator Input
7. IEP / Document Insights (with “needs review” flags)
8. Strengths, Preferences, Interests, Needs
9. Readiness Indicators
10. Recommended Pathways (with “why this was recommended”)
11. Education / Training Options
12. Career / Program Matches
13. Independent Living Supports
14. Self-Advocacy Supports
15. Matched Resources
16. Matched Partner Opportunities
17. Meeting Prep Questions
18. 30 / 60 / 90 Day Action Plan (with responsible role per step)
19. Source / Input Labels
20. What Changed Since Last Report
21. Professional Meeting Summary

Audience toggle (Family / Student / Educator) re-skins tone + visible sections, mirroring real ReportView affordances but read-only.

## Role Dashboard Previews (`/demo/hub`)

Tabs render distinct sample widgets per role, matching real dashboard intent without exposing private internals:

- **Student**: My next step, Voice, plain-language report link, action items, meeting prep, saved opportunities
- **Parent**: Family priorities, document review status, report review, meeting prep, resources
- **Educator/Case Manager**: Sample caseload (3 fictional students), missing-doc status, report review, action items, notes
- **School Admin**: Aggregate snapshot, caseload coverage, reports completed, students needing follow-up (no doc detail)
- **District Admin**: Adoption snapshot, school-by-school progress, implementation support, aggregate reporting
- **Partner**: Partner profile, opportunity listings, statuses, PartnerForward incentives, no private student data
- **Platform Admin**: Waitlist queue, partner approvals, resource moderation, system health, launch readiness

Each tab includes a one-line “Why this matters for this role.”

## Intake, Voice, Documents

- **Intake**: stepped category list (strengths, interests, postsecondary goals, work, education/training, independent living, transportation, self-advocacy, support prefs, meeting confidence, family priorities, educator notes, documents available, urgent next steps). Each answer card shows “→ flows into Pathway Report: [section name].”
- **Student Voice**: 7 sample prompts with example responses, plus “How this affects recommendations” callouts.
- **Documents**: Fictional “IEP detected” summary card with transition goal areas, accommodations, services, missing/needs-review flags, source labels, and the planning-companion language. No upload UI in demo.

## Resources & Opportunities

- `/demo/resources`: enrich existing list with rationale per match (“Recommended because Jordan…”), filters, and a “view sample resource detail” modal.
- `/demo/opportunities` (new): 4 fictional partner programs (community college pathway, supported employment pilot, culinary apprenticeship, media internship) with eligibility, location, next step, and saved status.

## Action Plan, Meeting Prep, Calendar

- `/demo/plan`: 30/60/90 day table — task, owner role, target date, source (Voice/Family/IEP/Educator).
- `/demo/meeting`: agenda, student talking points, family questions, educator notes, sample meeting summary export preview.
- `/demo/calendar`: month view with sample milestones + transition meeting, click → drawer with details (read-only).

## Conversion (`/demo/next`)

Single page with role-targeted CTAs:
- Families/Students → Join Waitlist / Request Family Access
- Educators → Request Demo / Bring To My School
- School Admins → Explore School Pilot
- District Admins → Explore District Access
- Partners → Apply As Partner
- Invited users → Create Account / Sign In

Clear copy: **Create Account = invited/approved; Join Waitlist = request access.**

## Safety & Privacy Guarantees

- All demo data is module-level fixtures in `src/lib/demo/fixtures.ts` — no DB reads, no server fns gated by auth, no real storage paths.
- Every page renders the sample-data banner.
- No upload, no signed URL, no `createServerFn` calls that touch user data.
- Demo never persists; any “Save” shows the read-only tooltip.
- Partner role view shows zero private student fields.

## Design & Polish

- Reuse `SiteShell`, `CardGrid`, `CollapsibleSection`, `Breadcrumbs`, `InfoBox`, `HeroCTAs` for visual consistency with the rest of the site.
- Mobile-first; verify the step rail collapses to a top dropdown < `sm`.
- Title Case headings via `src/lib/title-case.ts`.
- Strong empty/loading/error states aren’t needed (static fixtures) but each section has a non-empty default.

## Verification

- `bun run test:unit`
- `bunx playwright test --project=dashboard-setup`
- `bunx playwright test --project=role-access`
- `bunx playwright test --project=dashboard-regression`
- Manual: signed-out load of every `/demo/*` route on mobile + desktop; role switcher; collapsible Pathway sections; CTA routing; no duplicate `<main>` links.

## Technical Notes

- **No changes** to `src/routes/_authenticated/**`, role guards, dashboard test IDs, owner 2FA, or auth flows.
- New fixture module `src/lib/demo/fixtures.ts` owns Jordan + sample caseload + opportunities + resources.
- New shared components: `src/components/demo/DemoShell.tsx`, `DemoStepRail.tsx`, `RoleViewSwitcher.tsx`, `SampleDataBanner.tsx`, `SourceLabel.tsx`.
- New `src/lib/demo/steps.ts` defines step order so rail + Prev/Next stay in sync.
- All new routes are public (top-level files), SSR on, with their own `head()` meta (title, description, og:title, og:description).
- Role switcher state in URL search params; default `view=family` to preserve existing `/demo/report?view=family` links.
- `DemoBanner` / `DemoStepBar` components already exist — refactor `DemoStepBar` into the new step rail instead of duplicating.
