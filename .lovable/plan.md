
# Partner Network Expansion — Implementation Plan

This is a large, multi-layer build. I want to confirm scope and sequencing before touching code, because doing it all in one pass risks destabilizing the existing structure you explicitly asked me to preserve (role system, dashboards, Admin Hub, website layout).

## Current state (what I'll build on, not replace)

- `src/routes/partners.tsx` — public marketing page (kept as-is, will link to new public directory)
- `src/routes/_authenticated/partners-manage.tsx` — existing partner mgmt (will extend)
- `src/lib/partner-workspace.functions.ts` — existing partner serverFns (will extend)
- `src/lib/resource-recommender.functions.ts` + `resources-db.functions.ts` — existing recommender (will hook opportunities in)
- Owner Hub routes under `src/routes/_authenticated/owner.*` — will add `owner.partner-network.tsx` and `owner.opportunities.tsx` (latter already exists; will extend)

## Proposed phasing

I recommend shipping this in 4 phases rather than one mega-commit. Each phase is independently testable and won't break the live app.

### Phase 1 — Data model + seed (foundation)
Migration adds/extends two tables:

- `partner_organizations`
  - All fields you listed: org_name, partner_type (enum), description, website_url, contact_email, phone, address, city, county, state, service_area, audience_served[], age_range, disability_focus[], pathway_categories[], services_offered[], opportunity_types[], virtual_or_in_person, transportation_notes, eligibility_notes, referral_process, source_url, verification_status (enum), partnership_status (enum), outreach_status (enum), admin_notes, last_reviewed_at, next_review_due_at, is_public, is_featured, collection_tags[], timestamps
- `partner_opportunities`
  - opportunity_title, partner_id (FK), opportunity_type (enum), description, location, county, pathway_category, age_range, eligibility, support_level, schedule, cost_or_funding_notes, application_url, contact_email, next_step, status, timestamps
- Enums: `partner_type`, `verification_status` (verified/potential/needs_review/pending_approval/featured/archived), `outreach_status` (not_contacted/researching/outreach_needed/contacted/in_conversation/approved/declined/follow_up/archived), `opportunity_type`
- Junction table `student_saved_partners` (student_id, partner_id or opportunity_id, saved_by, notes) — for signed-in saves and pathway attachment
- RLS:
  - Public SELECT on `partner_organizations` WHERE `is_public = true AND verification_status IN ('verified','featured','potential')` via a server fn (no `TO anon` policy — use `supabaseAdmin` in a public serverFn with column projection)
  - Authenticated SELECT on full directory
  - Platform admin (`is_platform_admin`) full CRUD
  - `student_saved_partners` scoped via `can_access_student`
- Seed migration inserts ~80+ CT organizations across the collections you listed, each tagged with appropriate status (Verified for state agencies; Potential Partner / Needs Review / Outreach Needed for everything else), collection tags, and pathway categories. Inclusive employer leads get a "Potential Opportunity Lead" framing flag.

### Phase 2 — Public Partner Directory
- New route `src/routes/partner-directory.tsx` (public, SSR, own SEO head)
- Search + filters: category, county, pathway, audience, opportunity type
- Featured section, separate "Community Resources & Leads" section for unverified
- Status badges with careful public labels: "Verified Partner", "Community Resource", "Potential Opportunity Lead", "Needs Verification"
- "Suggest a partner" + "Become a partner" CTAs (reuse existing `PartnerApplyForm`)
- Disclaimer footer: "Listings are provided to support transition planning…"

### Phase 3 — Signed-in matching + saves
- Extend `resource-recommender.functions.ts` to also surface partner opportunities scored against student interests, pathway goals, grade, county, support needs
- Surface matches in: `RecommendedResourcesPanel`, `ReportView` (Pathway Report), `ActionItemsPanel` (create action item from opportunity), `meetings.$meetingId` prep
- Match card shows: why it fits, which goal it supports, next step, verification badge, Save / Add to Pathway / Add to Meeting Prep / Create Action Item

### Phase 4 — Platform Admin Partner Manager
- New owner route `src/routes/_authenticated/owner.partner-network.tsx` (under existing OwnerShell — no nav restructure)
- Table view with admin filters (status, type, county, pathway, audience, opp type, last reviewed, outreach needed)
- Drawer for: add/edit/archive partner, verify/feature, approve submissions, outreach notes + next follow-up date, add/edit opportunities, publish toggle
- All CRUD via `partner-network.functions.ts` serverFns gated by `is_platform_admin`

## Technical notes (for the record)

- All server logic via `createServerFn`, never edge functions
- Public reads through a serverFn that uses `supabaseAdmin` with explicit column projection (never broad `TO anon` policies — per project security memory)
- Student-scoped saves use `can_access_student` (per project security memory)
- No changes to existing role system, dashboards, OwnerShell nav structure, or website layout
- Existing `partners-manage.tsx` left intact; the new owner page is the admin power tool

## What I need from you before I start

This is roughly 2–3 days of focused work compressed into one session. Two questions:

1. **Phasing**: ship Phase 1+2 first (data + public directory) and follow up with 3+4, or commit to all four in one go? I strongly recommend phased.
2. **Seed data canonical**: I will seed every org you named with plausible defaults (website URLs from public sources where I'm confident, status defaults as you specified, county/tags inferred). Anything I'm not confident about (specific contact emails, phone numbers) I'll leave null rather than guess. OK?

Once you confirm, I'll start with the Phase 1 migration.
