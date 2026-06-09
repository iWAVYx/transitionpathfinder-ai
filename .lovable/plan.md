
# TransitionForward — Validation & Pilot Readiness Pass

Goal: add the infrastructure to test with real users, collect feedback, track bugs, prepare for launch, strengthen trust/compliance, and organize pilot outreach. **No visual redesign, no disruption to existing dashboards, roles, demo mode, Pathway Report, Partner Network, Resource Library, Calendar, or Platform Admin Hub structure** — only additive surfaces under Platform Admin Hub, a small signed-in feedback widget, and a few public trust pages.

Because the scope is large, I'll deliver this in **phased migrations + UI batches**, each independently shippable. Each phase ends in a working state you can verify.

---

## Phase 1 — Database foundation (one migration)

Single migration creating all new tables with strict RLS (admin-only writes, scoped reads), GRANTs, and `updated_at` triggers. All tables are net-new — no changes to existing schema.

**New tables:**

| Table | Purpose | Read access | Write access |
|---|---|---|---|
| `beta_testers` | Tester roster + status | platform admins | platform admins |
| `testing_scripts` | Role-based scripts (seeded) | platform admins | platform admins |
| `testing_script_runs_v2` *(if name collides with existing `testing_script_runs`, will namespace)* | Per-tester run results | admins + the assigned tester | admins; tester updates own run |
| `feedback_submissions` | In-app feedback | admins + submitter | authenticated insert; admins update |
| `product_issues` | Bug tracker (P0–P3) | platform admins | platform admins |
| `launch_checklist_items` | Launch readiness (seeded) | platform admins | platform admins |
| `email_notifications` | Outbound notification ledger | admins + recipient | service_role + admins |
| `pilot_outreach_contacts` | Sales/pilot CRM | platform admins | platform admins |
| `pilot_packages` | Internal pricing/pilot drafts | platform admins; public read where `public_visible=true` | platform admins |
| `usage_events` | Lightweight analytics events | platform admins | authenticated insert (own user_id); anon insert allowed for public page events with no PII |

**Existing `testing_script_runs`** already exists — reused; we add testing_scripts catalog table and a `script_id` FK column on it via the same migration if needed (additive only).

**Seed data:** 7 role-based scripts (Parent, Educator, Student, School Admin, District Admin, Partner, Platform Admin) and the launch checklist categories/items listed in the request.

---

## Phase 2 — Platform Admin Hub: 7 new sub-pages

All under `src/routes/_authenticated/owner.*`, gated by existing `getMyAdminRoles` / `isPlatformAdmin` (the `_authenticated/owner.tsx` parent already does this). Uses the existing `OwnerShell`, no new visual system.

1. `owner.beta-testers.tsx` — list, add, invite, assign script, status filters, notes
2. `owner.testing-scripts.tsx` — view 7 scripts, view runs, mark pass/fail/issue/priority/notes
3. `owner.feedback.tsx` — feedback inbox; filter by type/role/status; convert → issue
4. `owner.issues.tsx` — bug tracker; P0–P3; status flow; assignee; filters
5. `owner.launch.tsx` — checklist grouped by category; per-item status/owner/notes
6. `owner.outreach.tsx` — pilot CRM; status, follow-up dates; "Add to calendar" links into existing calendar
7. `owner.pilot-packages.tsx` — draft pilot offer cards; public_visible toggle
8. `owner.pitch.tsx` — **already exists** → extend with the talking-points/demo-flow content from the request (content-only edit)
9. `owner.analytics.tsx` — **already exists** → add a "Usage events (beta)" panel reading from `usage_events`
10. `owner.emails.tsx` — **already exists** → add an "Outbound notifications" panel reading `email_notifications`

The owner index page gets new tiles linking to each, following the existing tile pattern.

---

## Phase 3 — Signed-in Feedback widget

- New component `src/components/feedback/FeedbackButton.tsx` — small floating "Send feedback" button (uses existing button tokens, no new design system).
- Opens a Dialog (existing shadcn `Dialog`) with: type dropdown, title, description, current page (auto), priority suggestion, optional screenshot URL.
- Submits via new server fn `submitFeedback` in `src/lib/feedback.functions.ts` → inserts into `feedback_submissions` with `user_id` from `requireSupabaseAuth` and `related_page` from client.
- Mounted once in `_authenticated.tsx` so it appears on every signed-in route. Hidden on `/onboarding` and demo routes to avoid noise.

---

## Phase 4 — Public trust pages

Plain-language pages, semantic HTML, single H1, head() meta on each. No layout changes to `SiteShell`.

- `src/routes/privacy.tsx` — **exists** → strengthen content with the required student-data, consent, sharing, removal sections.
- `src/routes/terms.tsx` — new (Terms of Use).
- `src/routes/trust.tsx` — already exists at `_authenticated/trust.tsx` (different audience). Add **public** `src/routes/trust-and-safety.tsx` covering AI Disclaimer, Student Data, Consent, Data Access/Removal, Privacy Contact.
- Footer (`SiteFooter`) gets the 1–2 new links appended into the existing list — no restyle.

Standard AI disclaimer text (per request) wired through the existing `AIDisclaimer` component where appropriate on signed-in surfaces that already use TrustNote.

---

## Phase 5 — Email notification ledger (backend-ready)

- Reuse existing Lovable email infrastructure (already set up).
- New helper `src/lib/notifications.server.ts` (`enqueueAppNotification`) that writes a row into `email_notifications` and (where a template exists) calls the existing transactional send path.
- Wire **logging only** (status=`queued`) into existing waitlist, contact, partner-submission, demo-request, feedback insert paths — no behavior change if no template; status stays `queued` and admin can see them in `owner.emails.tsx`.
- No new auth-email scaffolding needed.

---

## Phase 6 — Analytics events (lightweight)

- `src/lib/analytics-events.ts` — `track(event_type, metadata?)` helper that POSTs to a new server fn `recordUsageEvent` (auth-optional).
- Wire into ~10 existing flows already in code: signup completion, onboarding complete, student created, pathway report generated, resource saved, partner saved, calendar event created, action item created, meeting prep created, waitlist/contact/demo/feedback submitted.
- New panel in `owner.analytics.tsx` shows top events, by role, last 14 days — reusing the existing chart-free, count-list pattern of `getAnalyticsSummary`.

---

## Phase 7 — Verification

- `bunx tsc --noEmit`
- Manual: feedback button appears signed-in, submits, shows in admin hub; admin pages all 403 for non-admins (covered by `_authenticated/owner` gate); a checklist item edit persists across refresh.
- Add a regression test `tests/admin-only-routes.test.mjs` confirming non-admins get redirected from each new owner page (extends the existing `role-guard-matrix` pattern).
- Update `mem://index.md` Memories with a one-liner pointing at the new validation/pilot subsystem.

---

## Out of scope (explicit, per your instructions)

- No redesign of any existing page.
- No changes to roles, dashboards, demo mode, Pathway Report, Partner Network, Resource Library, Calendar, or Platform Admin shell.
- No new public pricing page (pilot packages stay internal unless `public_visible=true` is later toggled).
- No new auth providers, no schema changes to existing tables, no edits to auto-generated Supabase files.

---

## Suggested delivery order (smallest verifiable increments)

1. **Phase 1 migration** (single approval) — unblocks everything.
2. **Phase 3 feedback widget + Phase 2 feedback/issues admin pages** — fastest user-visible value, lets you collect input immediately.
3. **Phase 2 beta-testers + testing-scripts + launch-checklist + outreach + pilot-packages + pitch extension**.
4. **Phase 4 trust pages**.
5. **Phase 5 email ledger wiring + Phase 6 analytics events**.
6. **Phase 7 tests + memory update**.

Each phase ends with a verified working state. I'll pause for your go-ahead after Phase 1's migration is approved, since later phases depend on those tables existing.

Reply **"go"** to start with Phase 1 (the migration), or tell me which phase(s) to skip / re-order.
