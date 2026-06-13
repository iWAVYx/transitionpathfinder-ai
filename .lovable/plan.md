# BridgeForward + PartnerForward — Additive Expansion Plan

This is a large, multi-week scope. Nothing in the existing TransitionForward platform (visual identity, role model, RLS, dashboards, high school flow) will be restructured. Both expansions plug in as new product pathways with their own schema, server fns, routes, and dashboard cards.

Because the scope is large, I'll ship it in **5 reviewable phases**. You approve this top-level plan, then I'll execute phase 1 and pause for review before phase 2, etc.

---

## Phase 1 — Schema foundation (one migration)

New enums:
- `program_track`: `bridgeforward`, `transitionforward`
- `student_grade_band`: `middle_school`, `high_school`, `postsecondary`
- `high_school_option_type`: neighborhood, magnet, technical, charter, specialized, alternative, private_ood, district_program
- `partner_opportunity_status`: draft, submitted, needs_review, approved, published, archived
- `partner_badge_kind`: verified, inclusive, youth_pathway, career_exploration, community_resource, accessibility_minded, outreach_needed, needs_review

New tables (all with RLS + GRANTs + updated_at triggers, scoped via existing `can_access_student` / `has_role`):
- `bridgeforward_profiles` (1:1 with students, all 18 intake fields)
- `high_school_options` (per-student rows of candidate schools, with comparison criteria JSON)
- `high_school_fit_reviews` (per-student summary: priorities, student voice, questions for team)
- `bridgeforward_readiness_snapshots` (versioned, like pathway_report_versions)
- `student_voice_responses` — extend existing table with `grade_band` to support 6-8 prompts (no breaking change)
- `partner_profiles` (extends current `partner_organizations`/`partner_submissions` — see Technical notes)
- `partner_opportunities` already exists; add `support_needs_accepted`, `required_documents`, `capacity` columns
- `partner_impact_events` (workshops, tours, referrals, engagement counters)
- `partner_incentive_resources` (admin-managed content with cautious copy fields)
- `partner_badges` (junction: partner_id × badge_kind, awarded_by, awarded_at)
- Add `program_track` + `grade_band` columns to `students` (default `transitionforward`/`high_school` for existing rows)

Access rules:
- BridgeForward tables: same `can_access_student` / `can_edit_student` model as TransitionForward
- Partner tables: partner-scoped via `created_by` + admin override; PII columns kept off `anon`/`authenticated` (continues existing pattern)
- Explicit DENY: partners never get any policy reading students, IEPs, pathway_reports, or bridgeforward_* tables

## Phase 2 — BridgeForward intake, voice, fit finder, snapshot

Server fns under `src/lib/bridgeforward/`:
- `getBridgeforwardProfile`, `upsertBridgeforwardProfile`
- `listHighSchoolOptions`, `upsertHighSchoolOption`, `deleteHighSchoolOption`
- `getFitReview`, `upsertFitReview`
- `generateReadinessSnapshot`, `listReadinessSnapshots`, `getReadinessSnapshot`
- `getMiddleSchoolVoicePrompts`, `saveVoiceResponse`

Routes (under `_authenticated/`):
- `/bridgeforward` — student-scoped landing
- `/bridgeforward/intake` — 18-field form
- `/bridgeforward/voice` — age-appropriate prompts (7 questions)
- `/bridgeforward/fit-finder` — multi-school comparison grid
- `/bridgeforward/snapshot` — generated readiness summary, versioned

Components reuse existing form, card, page-shell patterns. No new visual system.

## Phase 3 — PartnerForward: onboarding, opportunity builder, impact dashboard

Server fns under `src/lib/partnerforward/`:
- `submitPartnerInterest`, `getMyPartnerProfile`, `updateMyPartnerProfile`
- `createOpportunity`, `updateOpportunity`, `listMyOpportunities`, `submitOpportunityForReview`
- `getPartnerImpact` (aggregates from `partner_impact_events`, opportunity views, saves)
- Admin: `adminListPartnerSubmissions`, `adminReviewOpportunity`, `adminAwardBadge`, `adminRevokeBadge`

Routes:
- `/partner-interest` (public) — interest form, writes to `partner_submissions`
- `/_authenticated/partners-manage/profile`
- `/_authenticated/partners-manage/opportunities` (list + builder)
- `/_authenticated/partners-manage/impact`
- `/_authenticated/owner/partners/review` — admin queue

## Phase 4 — Public site sections + dashboard entry points

Public routes:
- `/bridgeforward` (public marketing — uses the requested copy)
- `/partnerforward` (public marketing — value props, “Expand your reach”)
- `/partnerforward/incentives` — Incentive Resource Hub with cautious copy:
  > "Some employers may qualify for federal, state, or local incentives… TransitionForward does not provide tax or legal advice. Partners should review official guidance and consult a qualified professional."
  Lists placeholders for: Disabled Access Credit, Barrier Removal Deduction, WOTC, state workforce, VR, inclusive hiring, accessibility improvements, grants

Dashboard cards (additive, no restructure):
- Parent dashboard: "BridgeForward" card appears when any connected student has `grade_band='middle_school'`
- Student dashboard: same trigger
- Educator/case manager dashboard: BridgeForward filter chip on caseload
- Onboarding: grade-band question routes 6-8 to BridgeForward
- Student profile page: BridgeForward tab next to existing tabs
- Resource library: new categories (middle-school-to-high-school, high-school-options, self-advocacy-younger, executive-functioning, family-questions-before-hs, choosing-school-environment, preparing-for-grade-9, confidence-independence)
- Admin hub: BridgeForward content + PartnerForward review screens
- Site header audience pathways: add BridgeForward + PartnerForward

## Phase 5 — Tests + QA

Add `.test.mjs` coverage for the 9 QA criteria you listed. Existing TransitionForward tests remain untouched.

---

## Technical notes (for engineers reviewing)

- `partner_organizations` + `partner_submissions` already exist. PartnerForward will treat `partner_organizations` as the canonical profile (renaming "partner_profiles" mentally to that), add the missing columns, and treat `partner_submissions` as the interest-form intake. This avoids a parallel duplicate schema.
- `student_voice_responses` already exists; adding `grade_band` keeps grade 6-8 prompts isolated from high school prompts without forking the table.
- All new SECURITY DEFINER helpers will follow the existing pattern (revoke from anon/authenticated unless required for RLS evaluation).
- All new public-schema tables include explicit `GRANT … TO authenticated; GRANT ALL … TO service_role;` blocks (matching project memory rules).
- No changes to existing routes, role-policy.ts audiences, or the `_authenticated` gate. New routes will be added to `ROUTE_AUDIENCES` and the role-guard snapshot regenerated.
- No `dangerouslySetInnerHTML`, all forms validated with Zod (client + server fn `inputValidator`), per project standards.

---

## Questions before I start phase 1

1. **Partner-role users today**: should PartnerForward profile/opportunity management replace or sit beside the current `/partners-manage` flow? (My plan: extend, not replace.)
2. **BridgeForward → TransitionForward graduation**: when a BridgeForward student hits grade 9, do you want auto-promotion to TransitionForward, or a manual "graduate to high school plan" button? (My plan: manual button, preserves data.)
3. **Incentive Hub content**: do you want the 8 placeholder cards to link to real `.gov` URLs (IRS Disabled Access Credit, DOL WOTC, ADA.gov, etc.), or stay as inert placeholders until you provide copy?
4. **Phase pacing**: ship phase-by-phase with review between each (safer), or run phases 1-3 back-to-back then pause for visual review at phase 4 (faster)?

Reply with answers + "approve" and I'll start phase 1.
