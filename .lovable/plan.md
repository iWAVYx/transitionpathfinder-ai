# Partner Network — Signed-In, Role-Aware Product Feature

## Scope

Consolidate all Opportunity/Directory/Matches/Referrals surfaces into ONE "Partner Network" tile per applicable role dashboard (Student, Family, Educator/Case Manager, School Admin, District Admin, Partner). Owner gets no tile — moderation lives in the existing Admin Hub. Each tile opens a role-aware protected page that respects the active demo context (student profile / school / district / partner plan).

## Tile Consolidation Audit (per role)

Before adding, remove/merge these existing tiles into the single Partner Network tile:

- **Student**: `opportunities`, `matches`, `partner-directory` → **Partner Network**
- **Family**: `opportunities`, `matches`, `directory` → **Partner Network**
- **Educator**: `opportunity-recommendations`, `referrals`, `partner-directory` → **Partner Network**
- **School Admin**: `partner-relationships`, `community-partners`, `opportunity-engagement` → **Partner Network**
- **District Admin**: `regional-providers`, `district-partnerships`, `opportunity-coverage` → **Partner Network**
- **Partner**: keep `Partner Profile`, `Active Opportunities`, `Submitted Programs`, `Application Windows`, `Opportunity Management`, `Partner Resources`, `PartnerForward Incentives`, and the existing `Premium Partner Toolkit` tile. Add ONE new **Partner Network** tile (external-facing view of listings/matches/connections). Do NOT duplicate management surfaces.
- **Owner**: NO tile. Moderation, verification, source quality, stale listings, disputes, access controls live under existing Admin Hub sub-nav.

Exact final list will be produced by reading each `*OverviewGrid.tsx` first — plan reflects intent; consolidation stays true to what actually exists.

## Architecture

### Route
`src/routes/_authenticated/partner-network.tsx` — single protected route that renders role-aware content via `useAuth()` role + `useDemoRoleContext()`. Deep-link params: `?role=<role>&tab=<matches|saved|referrals|coverage|listings>`.

### Signed-out guard
Existing `_authenticated/route.tsx` already handles the sign-in-required redirect with intended-destination preservation. No new route logic needed.

### Role-aware content components (one per role)
```
src/components/partner-network/
  PartnerNetworkPage.tsx           # role dispatcher
  StudentPartnerNetwork.tsx        # matches, saved, next steps
  FamilyPartnerNetwork.tsx         # per-authorized-child matches
  EducatorPartnerNetwork.tsx       # per-caseload student recs + referrals
  SchoolAdminPartnerNetwork.tsx    # relationships, coverage, gaps
  DistrictAdminPartnerNetwork.tsx  # regional providers, aggregate
  PartnerPartnerNetwork.tsx        # listings, engagement, connections (Free/Premium)
  shared/
    ExplainableMatchCard.tsx       # Why / Consider / Eligibility / Next Step / Source / Verified
    OpportunityCard.tsx
    ContextBanner.tsx              # reads active demo context
```

### Explainable matching engine
`src/lib/partner-network/matching.ts` — pure function `matchOpportunities(profile, opportunities)`:
- Hard-filter: grade/age eligibility, location, cost cap, accessibility requirements.
- Rank by: interest/cluster overlap, stage fit, schedule, transportation, delivery mode.
- Never use disability as negative factor.
- Return `{ tier: 'strong'|'good'|'worth-exploring', reasons, considerations, eligibilityToConfirm, nextStep, source, verifiedAt }`.

### Demo data
`src/lib/demo/partner-network/`
- `organizations.ts` — fictional orgs keyed by district/school where relevant.
- `opportunities.ts` — keyed by grade band + cluster.
- `matches.ts` — derived per active student profile via engine.
- `partner-listings.ts` — Free vs Premium bundles for the partner org.
- `school-relationships.ts`, `district-coverage.ts` — per-context bundles.

Everything reads through `useProfileSession`/`useDemoSchool`/`useDemoDistrict`/`useDemoPartnerPlan` — same stores that drive the rest of the demo (bug fix from previous slice is preserved).

### Dashboard tile
New shared `PartnerNetworkTile` component slotted into each `*OverviewGrid.tsx` Workspace section. Uses same tile primitive (`ToolPreviewCard` / existing card shape) so visuals, spacing, hover, responsive layout are unchanged.

### RLS & live data
No live tables are read by the demo. This slice adds no real Partner Network mutations. If/when live tables come online, existing `partner_opportunities` policies (org-scoped) and `student_relationships` gates cover the reads; server-side authorization goes through `requireSupabaseAuth` server fns.

## PartnerForward vs Partner Network

Keep separate. PartnerForward tile stays (incentives/funding). Partner Network is the new management/discovery tile. Copy on both tiles clarifies the distinction.

## Testing

- `tests/unit/partner-network-tile-consolidation.test.ts` — exactly one Partner Network tile per role dashboard; no duplicate directory/matches/opportunities tiles remain; owner has none.
- `tests/unit/partner-network-context-switch.test.ts` — swapping student/school/district/partner-plan changes tile summary AND page content fingerprint.
- `tests/unit/partner-network-matching.test.ts` — hard filters exclude ineligible; disability never lowers rank; explanations include all required fields.
- `tests/e2e/partner-network.signedin.spec.ts` — role tile → correct page; deep link + refresh + back preserve context; partner never sees IEP/diagnosis fields; tab-aware URL sync.
- `tests/e2e/partner-network-signed-out.spec.ts` — protected route redirects to login with intended destination; returns after auth; public Partners marketing page still reachable.

## Non-goals

- No new public hub.
- No new owner dashboard.
- No PartnerForward changes beyond copy disambiguation if needed.
- No visual redesign of dashboards.
- No live-data mutations from the demo.

## Deliverables

1. Tile audit + consolidation across 6 role dashboards.
2. Single protected route + 7 role components + shared match/opportunity primitives.
3. Explainable matching engine + per-role demo bundles wired to existing context stores.
4. Free/Premium partner variance in tile + page.
5. Owner Admin Hub sub-nav entries for moderation/verification/stale/disputes/access (no dashboard).
6. Unit + e2e tests above, plus regression run.
7. Completion report with the 8 requested sections.
