# TransitionForward Hardening, Operations, Billing & Responsive Program

Six phases, executed and verified one at a time. Desktop UI, dashboard structure, Transition Workspace, feature routes, and existing capabilities are preserved unless a phase explicitly requires change.

---

## Phase 1 — Owner Admin Hub

Rebuild `/owner/*` into a single professional content & operations console (not developer tooling).

Managed entities: partners, opportunities, resources, blog posts, organizations, schools, districts, waitlist, beta cohorts, users, invitations, licenses, email templates, billing accounts, support requests, data requests, system health.

Shared "management view" pattern for each entity:
- Search, filter, sort, pagination
- Full validated forms + preview
- Draft / publish / schedule / unpublish / archive / restore / soft delete
- Version history, duplicate detection, content owner, last-reviewed date
- Safe bulk actions (publish, archive, tag)
- Audit record on every mutation

Plus a **Content Health** view: expired opportunities, stale resources, broken links, missing accessibility info, incomplete partner profiles, duplicates, publication failures, awaiting review.

Student IEP content stays out of routine owner reach. Exceptional access requires reason + scope + expiry and writes an immutable audit event (extends the existing `admin_doc_access_grants` mechanism).

Deliverable: a table mapping each admin action to the exact public/signed-in surface it changes, verified by round-trip test.

---

## Phase 2 — Legal Identity & Communications

- Product brand stays **TransitionForward**; legal entity **Transition Forward LLC** appears in footer, Terms, Privacy, consent language, invoices, receipts, checkout, contracts, formal emails. Wording: "TransitionForward is a service of Transition Forward LLC." No DBA claim.
- Extend `src/lib/contact.ts` to the full address set: support, sales, admin, billing, privacy, security — and route every existing usage through it.
- Role-specific templates: waitlist confirmation, beta invitation, account invitation, verification, welcome, onboarding reminders, license assignment, report readiness, meeting reminders, opportunity matches, partner submissions, subscription events, payment failures, support requests, security notices.
- Hard rule enforced by test: no student records, disability info, IEP/Pathway content, or sensitive identifiers in any subject or body. Sensitive detail lives behind authentication.
- Transactional sends stay separate from marketing consent/unsubscribe state.

---

## Phase 3 — Mobile & Tablet Quality

Audit at 320, 360, 390, 430, 768, 820, 1024 px (plus landscape) across public, demo, feature, auth, Admin Hub routes and all seven signed-in role experiences.

Fix: horizontal overflow, clipping, crowded controls, uneven spacing, detached labels, dead space, obstructive sticky elements, misalignment.

Centering is selective — page titles, compact intros, empty states, primary CTAs. Body copy, forms, operational data, reports, and dashboard content stay left-aligned.

Standards applied: consistent responsive page padding, section spacing, readable measure, stable grids, 44px targets, sensible button stacking, responsive tables, accessible modals, wrapping role/profile selectors.

Screenshot verification required for demo dashboards, Transition Workspace, Pathway Report, Admin Hub, navigation, signed-in feature pages.

---

## Phase 4 — Billing & Licensing (Stripe test mode)

Billing attaches to organizations, never to user roles.

New canonical tables with constraints + RLS: `billing_accounts`, `plans`, `subscriptions`, `entitlements` (reconciled with existing `access_entitlements`), `license_pools`, `license_allocations`, `invoices`, `processed_webhook_events`.

Supported models: district contracts/invoices/PO/ACH with allocated seats; district-sponsored school access; student/family/educator/counselor access via org entitlements; partner free & premium; owner-approved pilot/manual access; individual plans later without restructuring.

Permissions: district admins manage district billing + allocation; school admins manage allocated access only (no district payment methods unless authorized); partners manage their own org subscription; students/parents/educators get no billing controls.

Stripe Checkout / hosted invoices / Customer Portal. Stripe is the payment authority — webhook-confirmed state controls access. Signature verification, stored processed event IDs, duplicate and out-of-order handling, and trialing / active / past_due / canceled / paused / grace-period behavior. No card data touched. Server-only secrets.

---

## Phase 5 — Pathway Engine Hardening

No identifiable student records in prompts, logs, eval datasets, or training systems.

Versioned pipeline: malware scan → classification → OCR/parsing → structured extraction → confidence scoring → conflict detection → evidence map → recommendation generation → rule validation → human review → canonical Pathway Report.

BridgeForward (6–8) differentiated from TransitionForward (9–12). One canonical report with student, family, educator lenses.

Every important recommendation carries: supporting input, why it matters, confidence / missing information, responsible participant, next action, timeframe, measurable progress evidence. Adds scenario comparison, unresolved-question detection, meeting-ready summaries, progress updates, report change history.

Curated and versioned CT + federal sources. Synthetic eval cases across grade bands, disability profiles, incomplete records, conflicting inputs, bias, unsupported claims, unsafe advice, hallucination. Model / prompt / rule-set / knowledge-base versions recorded without sensitive content.

---

## Phase 6 — Verification

Suites: unit, build, lint, accessibility, mobile screenshots, dashboard setup, dashboard regression, role access, billing, webhook, RLS, email, Admin Hub CRUD, Pathway Engine evaluation. No weakening, hiding, or role skipping.

Final report: completed changes; routes and roles tested; admin action→product mapping; responsive screenshots; billing lifecycle evidence; email delivery evidence; engine evaluation results; external configuration still required; P0/P1 blockers; beta go/no-go.

---

## Technical notes

- Backend work uses migrations with GRANT + RLS per table; Stripe webhooks land on a TanStack server route under `src/routes/api/public/` with signature verification inside the handler.
- Stripe secret key stored as a Cloud secret; only the publishable key reaches the browser.
- Existing `access_entitlements`, `organization_memberships`, `access_codes`, and `org_license_requests` are reconciled into the new billing model rather than duplicated.
- Admin Hub reuses existing `admin_roles` / `is_platform_admin` gating and the current audit tables.

## Sequencing

Phases run in order (1 → 6), each verified before the next begins. Phase 4 requires enabling payments, which needs your confirmation before I start it.
