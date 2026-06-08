
# TransitionForward — Operational & Demo Readiness Pass

A non-disruptive polish pass. No redesign, no new product surfaces, no changes to navigation, role system, dashboards, Admin Hub, Resource Library, Partner Network, Calendar, Pathway Report, or signed-in flows. Everything below either (a) lives inside the existing Admin Hub, (b) is additive guidance overlaid on existing screens, or (c) is QA scripting and seed data.

Because the scope is very large, I'm proposing **8 phases delivered sequentially**, each shippable on its own. You can approve all 8 or pick the order.

---

## Phase 1 — Demo Readiness System

**Goal:** every major role can be demoed reliably from a clean state.

- Add a `demo` flag/label on profiles + students; demo data never mixes with real records (filtered out of analytics, waitlist, partner submissions, admin follow-ups).
- Seed script (`scripts/seed-demo.ts`, idempotent) that creates one demo account per role with realistic, connected data:
  - Demo Parent/Guardian, Student, Educator/Case Manager, School Admin, District Admin, Partner Org, Platform Admin.
  - One shared "Demo Student" wired across Pathway Report, Student Voice, readiness scores, saved resources, opportunity matches, action items, meeting prep, calendar, sharing/consent.
- Admin Hub → new "Demo Mode" panel: list of demo accounts, copy-login links, "Reset demo data" button (re-runs seed), and a visible "DEMO DATA" banner on any session signed in as a demo user.
- Public-facing "Explore Demo" entry on the home page CTA area (non-destructive, reuses existing styling).

## Phase 2 — System Health Dashboard (Admin Hub)

**Goal:** one screen to confirm the platform is safe to demo.

- New route under existing Admin Hub: `/admin/system-health` (no nav restructure — added to existing Admin sidebar).
- Tracks every item you listed (auth, role onboarding, each role dashboard, Pathway Report, Student Voice, Resource Library, Partner Directory, opportunity matches, action items, meeting prep, calendar, waitlist, contact forms, partner submissions, admin content editing, site settings, Supabase connection, persistence, RLS, mobile, demo mode).
- Per-row columns: **Status** (Working / Needs Attention / Not Connected / Coming Soon), Last checked, Notes, Route, Backend table, Priority, Action needed.
- Automated probes where cheap (server-fn pings: auth session, DB select, RLS canary read, storage head). Manual override for everything else (admin-editable status + note).
- Backed by new table `system_health_checks` (admin-only RLS, GRANTs included).

## Phase 3 — First-10-Minutes Guidance

**Goal:** every new signup knows what to do without a founder explanation.

- Reusable `<NextBestAction />` card component (no new design system — uses existing tokens) rendered on each role dashboard.
- Role-specific "next step" engine driven by existing data: if no student → "Add your first student"; if student but no Voice → "Complete Student Voice"; etc.
- Empty-state copy upgrades on each dashboard answering: *What do I do first? What's required vs optional? What's my next best action?*
- Per-role checklists exactly matching your spec (Parent, Student, Educator/CM, School Admin, District Admin, Partner, Platform Admin). Dismissible, persisted in `user_ui_prefs`.

## Phase 4 — Tighten Feature Connections

**Goal:** make the platform feel integrated. Pure wiring + cross-links, no new pages.

For each hub (Pathway Report, Resource Library, Partner Network, Calendar, Action Items, Meeting Prep, Admin Hub), audit the screen and add the missing inbound/outbound links exactly as you listed. Examples:
- Pathway Report → "Add to Calendar", "Create Action Item", "Open Meeting Prep", "Matching Opportunities", "Recommended Resources", "Share / Download".
- Calendar event detail → links back to the source (action item, meeting prep, opportunity deadline, admin follow-up).
- Action item detail → source Pathway Report section + linked resource/opportunity/meeting prep + calendar due date.
- Admin Hub left rail confirms presence of: waitlist, contact, users, resources, source libraries, partner directory, partner submissions, outreach tracker, site content, system health, support requests, analytics.

Delivered as small PRs per hub so we can verify each without breaking the others.

## Phase 5 — Role-by-Role Testing Scripts (in Admin Hub)

- New Admin Hub sub-page `/admin/testing-scripts`.
- Ships the exact scripts you wrote (Parent, Educator/CM, School Admin, District Admin, Partner, Platform Admin) as structured steps.
- Per-step checkboxes: completed, passed, issue found, notes, priority, assigned follow-up. Persisted in new `testing_script_runs` table (admin-only RLS).
- "Export run as markdown" for sharing with testers.

## Phase 6 — Trust, Privacy & Sharing Language

- Audit pass on student profile, Pathway Report, Resource Library, Partner Network, sharing dialogs, consent screens, AI-generated sections.
- Add plain-language explainers: who sees what, what's private vs shared, what AI processes, revoking access, document protection, Platform Admin vs school/district scope.
- Standard AI disclaimer rendered next to every AI-generated output:
  *"AI recommendations are supportive planning tools and do not replace professional judgment, school team decisions, legal advice, or official IEP/PPT determinations."*
- Centralized as a `<TrustNote variant="..." />` component so copy stays consistent.

## Phase 7 — Pitch & Demo Page (Admin Hub)

- New Admin Hub sub-page `/admin/pitch` (admin-only).
- Renders the one-sentence pitch, problem, solution, audiences, core features, demo flow walkthrough, feature explainers (Pathway Report, Resource Library, Partner Network, Calendar/Action Items, Admin Hub), talking points per audience, and screenshot placeholders.
- Includes the core message verbatim.
- Static content first; editable later if you want it CMS-backed.

## Phase 8 — Backend Persistence + Mobile/Responsive QA

- Automated persistence smoke suite (`tests/persistence.spec.ts`) covering every action you listed: signup, onboarding, role save, add student, connections, Student Voice, Pathway Report, saved resources, saved partners/opportunities, action items, meeting prep, calendar events, waitlist, contact, partner submissions, admin edits, system-health notes, testing-script notes. Each test: save → refresh → assert → logout/login → re-assert.
- Mobile QA pass at 375/414/768/1024 across: demo mode, dashboards, System Health, testing scripts, Pathway Report, calendar, resource library, partner network, admin hub, forms, modals, tables. Fix only responsive regressions found — no visual redesign. Tables collapse to cards, sidebars collapse, calendar falls back to agenda/list on small screens.
- Final acceptance checklist (your list) run end-to-end and reported back.

---

## Technical Notes

- All new tables (`system_health_checks`, `testing_script_runs`, demo flags) ship with RLS enabled, `has_role('admin')` policies, and explicit `GRANT`s.
- Demo accounts get a `is_demo BOOLEAN` flag on `profiles`; all list queries (waitlist, contact, partner submissions, admin analytics) filter `is_demo = false` by default with a "show demo" toggle for the admin.
- "Reset demo data" runs server-side via `createServerFn` + `supabaseAdmin`, scoped to rows where `is_demo = true`.
- No changes to: routing structure, color tokens, typography, root layout, auth gate, role system, existing dashboards' information architecture.

---

## How I'd like to proceed

Phases are independent. I suggest shipping **Phase 1 (Demo) + Phase 2 (System Health) first** — they unlock everything else and give you something you can show this week. Reply with which phases to start, or "all, in order" and I'll begin with Phase 1.
