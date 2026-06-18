# Signed-In Dashboard Audit & Cleanup

This is a focused cleanup pass across all 7 signed-in roles. No app-wide redesign, no new features — just making sure each dashboard shows the right things, in the right order, with comfortable spacing and clear next steps.

## Approach

I'll work in role-sized slices so you can review each one before I move on, rather than touching all dashboards in one giant change. For each role I will:

1. Read the current dashboard route + components.
2. Compare against your spec (what should/shouldn't appear).
3. Remove irrelevant cards, deduplicate links, fix dead buttons, tighten spacing.
4. Verify empty/loading/error states, mobile layout, refresh persistence.
5. Report a short diff + screenshots for that role.

## Slice order

1. **Student dashboard** — gate BridgeForward (6–8) vs TransitionForward (9–12) by grade band; trim adult-only controls.
2. **Parent / Guardian** — multi-student switcher; gate tools by each connected student's grade band; surface invitations + consent status.
3. **Educator / Case Manager** — caseload-first view; merge with the new Teacher Portal entry if duplicative; missing-info alerts.
4. **School Administrator** — school overview, educator list, school pilot/access; remove platform-admin and partner controls.
5. **District Administrator** — district → schools → admins → educators rollup; entitlements + onboarding status.
6. **Partner Organization** — partner profile, opportunities, PartnerForward resources; hard-block student data surfaces.
7. **Platform Admin / Owner Hub** — regroup into the 10 sections you listed; remove anything that duplicates user dashboards.

## Global standards applied per slice

- Header / welcome strip → quick actions → primary cards → secondary cards.
- One canonical "next step" component per dashboard (NextBestAction).
- Card sizing: consistent heights inside a grid row, single CTA per card.
- Mobile: single column, no horizontal scroll, no clipped buttons.
- Every list has empty + loading + error states wired to the server fn.
- Role + grade-band + org + entitlement gating goes through `role-policy.ts` and existing entitlement hooks — no new gating systems.

## Final QA checklist (run after all slices)

The 10 items from your spec, executed as a manual pass plus the existing `role-guard-matrix` test.

## What I will NOT do

- Redesign the visual system or change the theme.
- Add new features beyond what each role already has.
- Touch landing/marketing pages.
- Rewrite the Owner Hub data layer — only reorganize the surface.

## Question before I start

Do you want me to **start with Slice 1 (Student) and check in after each slice**, or **run all 7 slices straight through and present one consolidated report at the end**? Straight-through is faster but harder to course-correct mid-way.
