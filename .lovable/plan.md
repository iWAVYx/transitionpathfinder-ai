# Paid-Product Value Audit & Refinement Pass

This is a large, cross-cutting pass touching 10 value areas. To keep it shippable and reviewable, I'll break it into 4 sequenced waves. Each wave ends with `bun run test:unit` + the three Playwright projects you named. Nothing removes existing routes, auth, tests, or dashboard structure — every change strengthens what's already there.

## Wave 1 — Flagship Deliverables (Pathway Report + Meeting Prep + Action Items)

**Pathway Report (`src/components/pathway/ReportView.tsx` and related)**
- Add a `ReportHeaderBar` with: version chip, "Last Updated," export/share button, and a "What Changed Since Last Version" diff drawer (reads `pathway_report_versions`).
- New `MissingInputsPanel` — flags absent Student Voice, missing IEP upload, unfilled intake fields, no partner matches, no meeting scheduled. Each flag links to the correct feature page.
- New `ReadinessScorecard` (compact 4-domain scorecard: Academic, Independent Living, Employment, Community — pulled from `readiness_scores`).
- New `RoleActionPlan` tabs: Family Next Steps / Educator Next Steps / Student Next Steps — each with 3–5 concrete actions.
- Plain-language translator card: "What This Means" summary above dense IEP/transition sections.
- Cross-links section: Documents fed in · Student Voice responses · Related action items · Meeting prep · Suggested opportunities.

**Meeting Prep (`src/routes/_authenticated/meeting-prep.*` and components)**
- New `AgendaBuilder` (drag-order agenda items, time estimates, owner).
- `QuestionsToAskCard` (pre-seeded per role, user-editable).
- `DocumentsToBringChecklist` (pulls from documents; check off as attached).
- `StudentPrioritiesCard` + `FamilyConcernsCard` (short input, saved to `meeting_prep_items`).
- `ReadinessGapsCallout` (feeds from Pathway Report).
- `DecisionsNeededCard` + `UnresolvedItemsCard`.
- `PostMeetingFollowUpCard` (auto-generates action items with owners/dates).
- `PrintableSummaryView` route/view — print-safe layout.

**Action Items (`src/components/actions/*`, `action_items` table already has 15 cols)**
- Redesign `ActionItemRow` to always show: Owner · Role · Due · Status · Priority · Source · Related Goal/Report Section · Next Step · Update button.
- New `ActionItemDrawer` with edit-in-place + activity log.

## Wave 2 — Documents, Roles, Progress

**Document Intelligence**
- `DocumentCard` shows: Type badge · Processing status pill · "Fed into Pathway Report" chip · "Human review needed" flag · Visibility label · Permission chips.
- New `MissingDocumentsChecklist` (IEP, transition plan, evaluation, consent — with upload CTAs).
- `ExtractedSignalsPanel` on document detail (from `document_extractions`).

**Role Collaboration Indicators**
- New shared `<CollaborationFlags />` primitive used on Pathway Report + shared plan view + dashboards. Renders any of: Parent Input Needed · Student Voice Missing · Educator Review Needed · Document Review Needed · Partner Match Available · School Support Flag · District Support Needed. Each flag is a link to the resolving action.

**Progress Over Time**
- New `ProgressOverTimeCard` (per-student): readiness delta sparkline, completed milestones count, report version count, action-completion rate, "Since Last Meeting" summary.
- Add to student, family, educator dashboards.

## Wave 3 — Trust, School/District ROI, Partner Value

**Trust / Privacy / Compliance**
- New `PermissionLabel` + `VisibilityBadge` primitives; adopt on documents, notes, share views.
- `ConsentControlsPanel` on student settings (view/collaborate/manage — read-only surfacing of `student_relationships`).
- Add AI disclaimer footer to AI-generated sections of Pathway Report + Meeting Prep summaries.
- Permission-safe empty states (never leak "you don't have access" without a next step).

**School / District ROI**
- Extend existing `district.implementation.tsx` and `school.implementation.tsx` with: Implementation Health score, Completion Rates, Readiness Trends chart, Staff Usage table, Support Needs list, Risk Flags, Next Recommended Step callout, "Export Summary" (CSV/PDF-print).

**Partner Value**
- Extend `OpportunityPipelineBoard` + partner workspace with: Opportunity Quality Checklist, Eligibility Builder card, Accessibility Support fields (already partially there), Program Deadlines column, Impact Metrics tile, PartnerForward Incentives resource strip, Review Status column.

## Wave 4 — Onboarding, Copy, Polish

**Role Onboarding**
- New `RoleOnboardingChecklist` component rendered on each role's dashboard until 100% complete. Steps: Complete Profile · Upload Document · Invite Team · Add Student / Connect School · Generate Or Review Pathway Report · Schedule Or Prepare For Meeting · Complete First Action Item. Persist per-user progress in `user_ui_prefs`.

**Copy & Polish Pass**
- Title Case sweep on headings, tile titles, tabs, section labels (use existing `src/lib/title-case.ts`).
- Sentence case for descriptions.
- Remove generic filler ("Welcome to your dashboard", "Manage your data", etc.).
- Guided empty states everywhere with a primary CTA.
- Mobile/tablet check on new components (aspect wrappers, tap targets ≥ 44px).
- Preserve demo ↔ signed-in parity: mirror every new component into matching `demo_.*` route.

## Testing (run after each wave)

```bash
bun run test:unit
bunx playwright test --project=dashboard-setup
bunx playwright test --project=dashboard-regression
bunx playwright test --project=role-access
```

## Guardrails

- No changes to auth, RLS, or role permissions.
- No route removals; only additions and enhancements.
- No dashboard structure removed; components composed into existing shells.
- Demo/signed-in parity preserved for every new component.
- All new interactive elements use existing shadcn primitives + design tokens.

## What I'll ship in this next turn

If approved, I'll start with **Wave 1** (Pathway Report + Meeting Prep + Action Items) since those are the paid-value core. Waves 2–4 follow in subsequent turns so each is reviewable and tests stay green.
