# TransitionForward Cohesion & Cleanup Pass

This is a large, cross-cutting pass touching public IA, waitlist, pricing, every role dashboard, the Owner Hub, routing, and copy. To keep each step reviewable (and avoid one giant unverifiable edit), I'll work in 6 sequenced slices. After each slice I'll show what changed and pause for your go-ahead on the next.

No visual redesign. No new features. Cleanup, consolidation, role-correctness, and copy cohesion only.

---

## Slice 1 — Audit & Inventory (read-only, ~1 turn)

Produce a single inventory document I work from for the rest of the pass:

- Every public route → purpose, primary CTA, duplicates/overlaps flagged
- Every `_authenticated` route → allowed roles vs. actual gate vs. RLS
- Every dashboard widget / quick action → role it should belong to
- Every Owner Hub page → keep / move / merge / delete recommendation
- Waitlist form fields today vs. fields you asked for
- Pricing tiers today vs. the 10-tier model you described
- Glossary of approved vs. avoided language, with current offenders

Deliverable: `docs/cohesion-audit.md` + a short summary in chat. No code changes yet. This is the contract for slices 2–6.

## Slice 2 — Public Site IA & Copy Cohesion

- Consolidate duplicate public pages flagged in Slice 1 (redirect, don't delete URLs)
- Normalize every public CTA to one of: Join waitlist / Request demo / Explore program / Become a partner / Sign in / Learn more
- Make sure each public page answers: Who is this for? What can they do here? What happens next? Why does this matter?
- Apply approved-language pass (planning companion, pathway, readiness, next step, from paperwork to possibility) and remove avoided phrases (legal guarantees, "replaces IEP/PPT", overpromises)
- Remove signed-in-only tools from any signed-out surface

## Slice 3 — Waitlist + Pricing Restructure

**Waitlist**
- Extend the waitlist form (and `waitlist` table if needed) with: role, organization type, school/district, student grade band, reason, `interest_type` enum (family_early_access / educator_access / school_pilot / district_pilot / partner_interest / demo_request)
- Single waitlist entrypoint with branching by interest_type (no parallel duplicate forms)
- Post-submit staged state screen: "You're on the waitlist → We'll review → You may be invited based on role/org/pilot → If your school or district joins, connected users may get access"
- Owner Hub waitlist review surfaces the new fields + admin notes/status

**Pricing**
- Restructure `/pricing` around the 10 tiers you listed (Free/Waitlist, Family Early Access, Educator Individual, School Pilot, School Plan, District Pilot, District Plan, Partner Basic, Partner Featured, Platform Internal)
- Show the long-term flow (District → Schools → Educators → Students → Families) plus the alternate early-access paths
- Pilot-ready copy; no payment integration changes

## Slice 4 — Signed-In Role Dashboards

For each role, prune to only role-appropriate widgets/quick actions and fix dashboard→route mismatches:

- Student, Parent/Guardian — BridgeForward visible only for grades 6–8; TransitionForward pathway tools for 9–12
- Educator / Case Manager — caseload-scoped only
- School Admin — school-level only (no platform controls)
- District Admin — district/school oversight only (no owner internals)
- Partner — Partner Dashboard + PartnerForward; never student PII
- Platform Admin — link out to Owner Hub, not duplicated cards

Remove dead links, staged-feature cards without explanation, and duplicate quick actions surfaced by Slice 1.

## Slice 5 — Owner Hub Reorganization

Regroup `/owner/*` into exactly these sections, moving/merging existing pages (redirects for old URLs):

1. Access & Accounts (waitlist, invitations, users)
2. Organizations & Entitlements (orgs, schools/districts, memberships, subscriptions/entitlements)
3. Students & Relationships
4. Content & Resources (resources + BridgeForward source manager)
5. Partners & Opportunities (approvals, opportunities, PartnerForward resource manager)
6. Product Operations (feedback, bug tracker, site content/settings)
7. Launch & Pilot Readiness (launch checklist, pilot outreach)
8. System Health (health checks, analytics)

Delete/move anything in Owner Hub that duplicates a user-role dashboard.

## Slice 6 — Routing, Back-Nav, and Final QA

- Walk every route from Slice 1's inventory: fix broken links, wrong nav categories, public CTAs that point to private routes without an auth-aware fallback
- Back buttons return to logical prior context (dashboard section, admin section, library, directory, program page, waitlist/pricing)
- Run the journey tests you listed (signed-out visitor; family/student/educator/school/district/partner waitlist; Platform Admin waitlist + invite; each role dashboard; BF/TF/PF visibility; Owner Hub; mobile/tablet/desktop)
- TypeScript build clean; security scan clean; RLS unchanged for sensitive tables

---

## Technical notes

- Waitlist field additions are an additive migration (new columns + enum), no destructive changes; existing rows stay valid.
- Owner Hub reorg uses route redirects (not deletes) so any bookmarks keep working.
- Role visibility uses the existing `RoleGuard` + `audiencesForRoles` + `visibleUserGroups` plumbing already in place; no new auth primitives.
- No edits to `src/integrations/supabase/*` generated files, no changes to auth/storage/realtime schemas.

---

**Recommended start:** Slice 1 (audit), so slices 2–6 are driven by a real inventory instead of guesses. Want me to proceed with Slice 1?