# TransitionForward Release-Readiness — Slice 0 Inventory

**Slice**: 0 of the Beta Readiness Verification & Remediation program.
**Status**: Inventory only. No source code changed in this slice.
**Date**: 2026-07-21.
**Scope**: Phase 1 deliverables from the program brief — routes,
roles, server functions, tables, storage, scheduled jobs, external
services, placeholders, and a per-readiness-level go/no-go.

## Readiness levels

| Level | Description                                                                                  | Slice-0 recommendation |
| ----- | -------------------------------------------------------------------------------------------- | ---------------------- |
| A     | Public waitlist collection (marketing site + `/waitlist` form only)                          | See `readiness-ledger.md` |
| B     | Controlled beta with fictional / redacted / specifically-approved information                | See `readiness-ledger.md` |
| C     | Production use with real student and IEP records                                             | See `readiness-ledger.md` |

## Deliverables in this folder

- `inventory-routes.md` — full route/role matrix (public, `_authenticated`, `api`, `demo`, `owner`, feature pages)
- `inventory-server-and-data.md` — server functions, DB tables, storage buckets, DB functions, RLS anchor helpers
- `inventory-subprocessors.md` — every external service reachable from the code
- `inventory-scheduled-jobs.md` — pg_cron and public-API tick endpoints
- `inventory-placeholders.md` — unresolved placeholders, mock/demo behavior, environment dependencies
- `readiness-ledger.md` — per-requirement PASS / FAIL / BLOCKED / MANUAL REVIEW with severity, evidence, owner
- `blockers.md` — items requiring external configuration, legal review, or vendor access (opened per the user's answer for Slice 0)

## Method

- Parsed `src/routes/**`, `src/lib/**/*.functions.ts`, `src/lib/**/*.server.ts`, `supabase/migrations/**`, `tests/**`, and `.github/workflows/**` directly. No page or route was rendered.
- Cross-referenced role gating (`src/lib/role-policy.ts`, `src/routes/_authenticated/route.tsx`, `src/routes/_authenticated/owner.tsx`, `src/components/RoleGuard.tsx`, `src/lib/route-role-guard.ts`).
- Cross-referenced RLS via the SECURITY DEFINER helpers surfaced in the Supabase db-functions listing: `can_access_student`, `can_edit_student`, `can_view_document`, `is_platform_admin`, `is_org_admin`, `is_channel_member`, `is_channel_admin`, `has_role`, `has_audience`, `is_partner_only`, `partner_tier_allows`, `authorize`, `storage_can_read_student_doc`.
- Item counts referenced in this report:
  - Route files: **213** (68 top-level, 134 under `_authenticated/`, 3 under `api/`; excludes `routeTree.gen.ts`)
  - Server functions (`.functions.ts` modules): **110**; files calling `createServerFn`: **109**
  - Server-only modules (`.server.ts`): **19**
  - Files calling `requireSupabaseAuth`: **107**
  - Files importing `client.server` (service-role): **30**
  - DB tables in `public`: **158** (see supabase-tables context)
  - Storage buckets (all private): `student-documents`, `site-media`, `channel-attachments`
  - Tests: **127** (57 `.test.mjs` node, 37 `unit/*.test.ts` vitest, 40 `e2e/*.spec.ts` Playwright)
  - GitHub workflows: **9** (see `inventory-scheduled-jobs.md`)

## Non-goals for Slice 0

- No behavior verification. Nothing is claimed PASS from static reading alone unless the evidence is unambiguous (e.g. RLS policy text). Runtime verification is deferred to later slices.
- No compliance claim (FERPA / COPPA / WCAG). This inventory only enumerates what controls exist in code and what would be needed to substantiate a claim.
- No design or product changes.
