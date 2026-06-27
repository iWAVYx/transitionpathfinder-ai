
# TransitionForward Content Hub Architecture

This is a large, cross-cutting reorganization. I'll do it in **phases** with your approval between each so we don't destabilize auth, routes, demo, or the Pathway Report. Each phase ships value on its own.

## Guiding principles

- **Reorganize, don't rewrite.** Keep current routes, RLS, role guards, demo flow, and the Pathway Report intact. Add a hub layer *on top* and rewire navigation/linking.
- **One shared hub primitive.** Every hub answers the same six questions (Who / Problem / Tools / Related / Next step / How it feeds the Pathway Report) using one component, so hubs feel like a system, not 15 bespoke pages.
- **Pathway Report = center of gravity.** Every hub shows its contribution to the report; the report links back to its sources.
- **No private data leaks.** Public hubs use demo/sample data only. Signed-in hubs stay behind existing role guards. Partner hub never references private student data.

## Phase 1 — Hub foundation (ship first)

Goal: introduce the hub model and the shared chrome, with **two reference hubs** wired end-to-end so we can validate the pattern before scaling.

1. **Shared primitives** in `src/components/hub/`:
   - `HubShell` — pillar header (who/problem), section bands, related-links rail.
   - `HubSpokeGrid` — uniform spoke cards (title, 1-line value, "feeds the report" tag, CTA).
   - `RelatedLinksRail` — "Related Planning Tools / For Families / For Educators / Next Step / Use This In The Pathway Report".
   - `FeedsReportBadge` — small label + tooltip explaining which Pathway Report section this informs.
2. **Hub registry** `src/lib/hubs/registry.ts` — single source of truth: id, audience, pillar copy, spokes (each with `feedsReport: ReportSectionId | null`), related hub ids, signed-in vs public. Drives nav, footers, and the resource filter facets.
3. **Two reference hubs built on the primitives**:
   - Public: **Transition Planning Hub** at `/hubs/transition-planning` (pillar + spokes: Student Voice, Family Priorities, Educator Input, Documents, Readiness, Pathway Report, 30/60/90, Questions For The Team).
   - Signed-in: **Student Planning Hub** at `/_authenticated/hubs/student` (pillar + spokes pointing to real product surfaces).
4. **Site nav + footer**: add a "Hubs" menu grouped by audience, sourced from the registry. Existing top-nav links stay.

Exit criteria: both hubs render, link to each other and to the Pathway Report, and the registry test confirms every spoke has audience + report mapping.

## Phase 2 — Public hub buildout

Build the remaining public hubs against the registry, reusing existing route content where it already exists (BridgeForward, PartnerForward, Families, Educators, Pricing, Demo). Each becomes a true pillar page with spokes pulled from existing routes — no duplicate pages, mostly redirects + improved pillar/intro and "Related" rails.

Hubs: BridgeForward Middle School, Family Resource, Student Readiness, School & District, PartnerForward, Demo / Sample Pathway, Pricing / Pilot / Waitlist.

## Phase 3 — Signed-in hub buildout

Layer hub pages over the existing role dashboards (don't replace them — link into them). Routes under `/_authenticated/hubs/{role}` for Family, Educator/Case Manager, School Admin, District Admin, Partner, Owner. Each role's hub respects existing `RoleGuard` / `beforeLoad` checks. Partner hub explicitly excludes private student data; we'll add a unit test asserting the partner hub registry entry contains no student-PII spoke ids.

## Phase 4 — Resource library upgrade

Promote `/resources` into a true filterable library: facets for role, grade band, topic, planning stage, resource type, document type, readiness area, BridgeForward vs TransitionForward, public vs signed-in. Facets are derived from the hub registry + existing resource metadata, so adding a resource auto-populates filters. URL-synced filters via TanStack search params.

## Phase 5 — Pathway Report ↔ hub wiring

- Each report chapter gets a "Sources" footer listing the hubs/inputs that fed it (Intake, Voice, Documents, Readiness, Partners, BridgeForward/TF roadmap).
- Each hub spoke that feeds the report gets a "Use This In The Pathway Report" CTA deep-linking to the right chapter.
- Demo workspace gets a "Sample Hub Map" overlay on `/demo` showing the same connections, so the demo mirrors the real ecosystem.

## Phase 6 — Internal linking + dead-end audit

Sweep every public and signed-in page; add the standard `RelatedLinksRail` so no page is a dead end. Add a vitest that walks the registry and asserts every hub has ≥3 related links and ≥1 next-step CTA.

## Out of scope (explicitly)

- No changes to auth, RLS, migrations, or role guards beyond using existing ones.
- No content rewrite of the Pathway Report chapters; only adds the Sources footer and back-links.
- No SEO filler. Public pillar copy stays human and useful.
- No new backend tables. The hub registry is static TS.

## Technical notes

- New files only under `src/components/hub/`, `src/lib/hubs/`, `src/routes/hubs.*.tsx`, `src/routes/_authenticated/hubs.*.tsx`. Existing routes get small edits to add the `RelatedLinksRail` and `FeedsReportBadge`.
- Hub routes are normal TanStack file routes; signed-in hubs live under `_authenticated/` and inherit the managed gate.
- Registry-driven nav means future hubs are a data change, not a code change.
- Tests: `tests/unit/hub-registry.test.ts` (shape, audience, report mapping, partner safety), `tests/e2e/hubs-signed-out.spec.ts` (public hubs render + cross-link), extend `demo-roles.signedin.spec.ts` for signed-in hubs.

## What I need from you

1. **Approve the phased approach** (or tell me to compress / reorder).
2. **Phase 1 scope check**: OK to start with Transition Planning Hub (public) + Student Planning Hub (signed-in) as the two reference hubs? If you'd rather the first signed-in reference be Educator or Family, say which.
3. **Nav placement**: add a "Hubs" top-nav menu, or surface hubs only from the homepage + footer + contextual rails? I recommend the top-nav menu so the architecture is visible.
