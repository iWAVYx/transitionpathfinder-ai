# Partner Network Activation — Full Program

Close every gap in the Partner Network by shipping four coordinated workstreams and proving each with a test.

## Workstream A — End-to-End Proof Pass
Prove the full partner journey works and fix whatever breaks along the way.

Flow under test:
```text
Partner signs up → creates partner org → drafts opportunity → submits for review
   → admin approves → student pathway matcher surfaces it → student saves match
   → tracks lifecycle (saved → contacted → applied → completed)
```

Deliverables:
- `tests/e2e/partner-network-journey.signedin.spec.ts` covering the full 8-step flow across partner + student + admin actors.
- Bug list captured inline in `docs/release-readiness-ledger.md` under a new **Partner-Proof-A** entry; each defect fixed in the same slice.
- Contract test `tests/partner-opportunity-lifecycle.test.mjs` for the `student_opportunity_matches.status` transitions.

## Workstream B — Explainable-Match Hardening
Audit `matchPartnersForStudent` and upgrade the "why matched" surface.

Deliverables:
- Extend `PartnerMatch` DTO with `explanation: { reasons: string[]; evidenceIds: string[]; confidence: 'low'|'medium'|'high'; conflicts: string[] }`.
- Zod contract `partnerMatchExplanationSchema` in `src/lib/partner-match-explanation.ts` + unit test `tests/partner-match-explanation.test.mjs`.
- Upgrade `src/components/students/RecommendedPartnersPanel.tsx` and `src/components/pathway/ReportPartnerSuggestions.tsx` to render:
  - Confidence band chip (color + label)
  - Reasons as bulleted list with evidence-item deep links
  - Conflicts section when non-empty (yellow surface)
- Server-side: `matchPartnersForStudent` populates `explanation` from existing evidence graph joins.

## Workstream C — Tier Gating Enforcement UI
Surface free-vs-premium caps on partner opportunity workspace.

Deliverables:
- New server fn `getPartnerTierUsage` returning `{ tier, publishedCount, cap, capabilities: {...} }` from `partner_tier_allows` + count query.
- `src/components/partners/TierUsageMeter.tsx` — usage bar + "X of Y opportunities published" + upgrade CTA.
- Wire into `src/routes/_authenticated/partners-manage_.opportunities.tsx`:
  - Show meter at top.
  - Disable "Publish" button and show upgrade dialog at cap for free tier (cap = 3).
  - Show "Featured placement" toggle only when `capabilities.featured_placement`.
- Server-side enforcement: `submitOpportunityForReview` rejects with `TIER_CAP_REACHED` when free-tier cap exceeded (defense in depth).
- Contract test `tests/partner-tier-gating.test.mjs`.

## Workstream D — Defect Sweep
Address defects discovered during A, plus a proactive audit of the 20+ existing partner routes.

Deliverables:
- Route health check script `tests/partner-routes-crawl.spec.ts` visits every `/partner*` and `/partners*` public + `_authenticated` route, asserts no console errors, no empty `<main>`, and required landmarks.
- Fix any 404s, blank states, broken CTAs discovered.

## Rollup Verification
- Full contract unit sweep: existing 28 tests + 4 new files must all pass.
- Playwright signed-in specs (A + D) documented as CI-gated per prior program pattern.
- Update `docs/release-readiness-ledger.md` with Partner-Proof A–D entries and rollup summary.
- Update `mem://index.md` if any new Core rule emerges (expected: none).

## Technical Details
- All new server fns use `requireSupabaseAuth` + partner/admin role check via existing `partner_tier_allows` / `is_platform_admin`.
- No new tables — reuses `partner_organizations`, `partner_opportunities`, `student_opportunity_matches`, `evidence_items`, `access_entitlements`.
- Cap constants centralized in `src/lib/partner-tier-config.ts` (`FREE_TIER_OPPORTUNITY_CAP = 3`).
- Explanation confidence bands: `low <0.4`, `medium 0.4–0.75`, `high >0.75` on existing match score.
- No UI framework changes; existing shadcn components only.

## Out of Scope (deferred, called out to user)
- Partner Premium billing wiring (pricing decision pending).
- Partner analytics dashboard.
- Public partner directory SEO overhaul.
- Bulk opportunity CSV import.

## Execution Order
1. Workstream C (smallest, unblocks A step 3 cap testing)
2. Workstream B (data contract needed by A step 6 assertions)
3. Workstream A (uses B + C)
4. Workstream D (crawl catches leftovers)
5. Rollup + ledger
