
## Goal

Make Signup and Waitlist mean different things on TransitionForward. Signup is for users who already have a valid access path (invite, active org, approved pilot, partner approval, internal admin, approved early access). Waitlist is an **access-routing and demand-qualification layer** for everyone else, with role-aware routing, structured fields, and an admin workflow that can convert qualified entries into invitations.

Nothing in auth, role guards, dashboard routes, dashboard test IDs, or E2E suites changes.

## 1. Decision gate (new)

New route `/get-started` (and a CTA replacement in the marketing nav):

```text
        Get Started
        /        \
   "I have an    "I want to
    invite or     request
    approved      access"
    access"          |
       |             v
       v          /waitlist?audience=…
   /login
```

- Copy makes the distinction explicit:
  - **Create Account** — "For invited users, approved pilots, active schools/districts, approved partners, and approved early-access families."
  - **Join the Waitlist** — "For requesting access, demo interest, school/district pilot interest, partner review, or future availability."
- Existing `/login` and `/waitlist` keep working. Old `Sign up` CTAs that pointed straight at login get pointed at `/get-started` so the choice is surfaced.

## 2. Waitlist form — role-aware routing

Rewrite `src/routes/waitlist.tsx` around a role picker that drives the subsequent fields and the routing category we save:

| Role chosen | Extra fields collected | Routing category saved |
|---|---|---|
| Student | grade band, school, district, has invite? | `family_early_access` if no school/district match, else nudged to signup |
| Parent/Guardian | student grade band, school, district, connected to student now? | same as student |
| Educator / Case Manager | school, district, caseload size, wants demo? | `educator_demo` |
| School Admin | school, district, est. student count, implementation timeline | `school_pilot` |
| District Admin | district, # schools, est. students, timeline | `district_pilot` |
| Partner | org name, services offered, service area, populations supported, incentive interest | `partner_review` + explicit notice that partners never get student-data access |
| Just want updates | (minimal) | `future_updates` |

Shared fields on every submission: full name, email, city/state, reason, desired access type, urgency, referred by, wants demo, optional note, **consent to be contacted** (required checkbox).

Role-specific outcome messages match the spec ("Families can join through an active school/district connection or approved early access.", etc.).

If a role+org combination indicates the user *should* be signing up (e.g. educator who says "I have an invite"), inline-redirect them to `/login` with a short explainer instead of writing a waitlist row.

## 3. Backend — fields, statuses, conversion

Most fields already exist on `public.waitlist`. One migration adds what's missing and tightens the status vocabulary:

- Add columns: `routing_category text`, `urgency text`, `wants_demo boolean default false`, `connected_to_student boolean`, `assigned_admin_id uuid references auth.users`, `converted_to_user_id uuid references auth.users`, `converted_invitation_id uuid references public.invitations`, `caseload_size int`, `estimated_student_count int`, `estimated_school_count int`, `timeline text`, `service_area text`, `populations_supported text`, `services_offered text`.
- New CHECK on `status` covering: `new`, `needs_review`, `routed_family_early_access`, `routed_educator_demo`, `routed_school_pilot`, `routed_district_pilot`, `routed_partner_review`, `invited`, `converted`, `not_eligible_yet`, `archived`.
- Tighten the public `INSERT` policy length checks for the new text columns; keep `anon` insert (this is a public form) gated by the consent boolean (`consent_to_contact = true`).
- Keep all `SELECT`/`UPDATE`/`DELETE` admin-only via `is_platform_admin`. No new `anon` SELECT.

Server-side:
- Extend `src/lib/waitlist.functions.ts` Zod schema with the new fields, default `status='new'`, and **derive** `routing_category` server-side from `role` + flags — never trust a client-supplied routing category.
- Reject `role = 'admin'` / `platform_admin` / anything that maps to the platform-admin audience. Platform admins cannot self-register *or* self-waitlist publicly.
- Keep using the anon publishable client (RLS-gated insert), no service role.

Conversion (already partially implemented in `src/lib/owner/waitlist-conversion.functions.ts`):
- Update `convertWaitlistToInvitation` to also stamp `converted_invitation_id` and set waitlist `status = 'invited'`.
- Add a sibling `linkConvertedAccount` server fn that platform admins can call (or wire into the invitation-accept path) to stamp `converted_to_user_id` and flip `status = 'converted'`.

## 4. Admin handling

`src/routes/_authenticated/owner.waitlist.tsx` gains:
- Status filter chips reflecting the new vocabulary.
- Role + routing-category filter.
- Per-row badge for routing category.
- "Convert to invitation" button (uses existing `convertWaitlistToInvitation`) with role/org pre-filled from the row.
- "Assign to me" / status dropdown wired to a small `updateWaitlistTriage` server fn (platform-admin only, RLS already enforces).

## 5. Frontend copy & nav

- Marketing nav: replace ambiguous "Sign up" with **Get Started** → `/get-started`. Keep "Sign in" pointing at `/login`.
- `/login` page gets a small helper line: "Don't have an invite yet? **Join the waitlist** →".
- `/waitlist` hero copy is rewritten to lead with the access-routing framing.
- Partner waitlist branch shows the explicit notice: "Partner accounts manage opportunities and PartnerForward resources. Partners never see private student data."

## 6. Tests

- Unit (vitest): waitlist Zod validator — each role builds the right routing category; admin roles are rejected; consent required.
- Unit: conversion fn stamps `converted_invitation_id` + flips status.
- Existing E2E suites untouched. Add one light Playwright smoke against `/get-started` and `/waitlist?audience=partner` that the form renders the partner branch (skipped if no base URL).

## Files touched (planned)

- `supabase/migrations/<new>.sql` — columns, CHECK, INSERT policy tightening.
- `src/lib/waitlist.functions.ts` — schema + server-side routing derivation + admin-role rejection.
- `src/lib/owner/waitlist-conversion.functions.ts` — stamp `converted_invitation_id`.
- `src/lib/owner/waitlist-triage.functions.ts` *(new)* — assign / set status.
- `src/routes/waitlist.tsx` — role-aware form, routing messages, partner notice.
- `src/routes/get-started.tsx` *(new)* — decision gate.
- `src/routes/_authenticated/owner.waitlist.tsx` — new filters, convert/assign actions.
- `src/routes/login.index.tsx` — small helper line.
- `src/components/site/SiteHeader.tsx` — nav CTA → Get Started.
- `tests/unit/waitlist-routing.test.ts` *(new)*.

## Out of scope (explicit)

- No changes to auth providers, role guards, `_authenticated` layout, dashboards, or any `data-testid` used by E2E.
- No changes to `user_roles` or `admin_roles` schema.
- No new billing/entitlement logic — the entitlement guard added earlier already covers active-org gating; signup eligibility check just consults it.

Approve and I'll start with the migration, then ship the form + decision gate + admin updates in order.
