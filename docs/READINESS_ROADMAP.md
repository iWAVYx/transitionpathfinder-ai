# TransitionForward — Readiness Roadmap

Living ledger that pairs a role-by-role product audit with the phased work
required to take the platform from "looks polished" to "ready to charge for".

Status legend: ✅ shipped · 🟡 in progress · ⬜ not started.

---

## 1. Role-by-Role Audit (snapshot)

### Student
- Action items, BridgeForward saves, JourneyStrip + OnboardingChecklist
  persistence, and the grade-band split (6–8 → BridgeForward, 9–12 → Pathway)
  all round-trip to the database.
- The no-linked-student state now offers a self-serve "Email an invite
  request" CTA — copies a short message and opens the user's mail app,
  no fake backend call.
- `OnboardingChecklist` already self-collapses once every step is done,
  so the JourneyStrip vs Checklist duplication is bounded.

### Parent / Guardian
- Document upload + parse, Pathway Report generate / regenerate / share /
  link, invite people, family priorities, and accept-proposed-goals all
  persist via typed server functions.
- Three entry points to Pathway Reports (dashboard, `/reports`,
  `/students/$id`) are noisy but consistent; we intentionally keep them
  for now and may consolidate post-launch.

### Educator / Case Manager
- Caseload search/filter, notes, quick-assign action items, teacher portal,
  and calendar all work end-to-end.
- "Missing Pathway Report" KPI is now a real button that filters the list
  to those students and scrolls to the table.
- `listStudentNotes` errors surface a toast instead of failing silently.

### School Admin
- Org switcher, team management, date-windowed reports, KPIs, grade-band
  breakdown, and compliance/milestones anchor all work.
- "Pathway Reports" KPI on `/school/overview` is now a link to the
  Reports list anchor — drill-down hardened.

### District Admin
- District switcher, KPIs, school-by-school table, CSV/PDF export, and
  follow-up list are real.
- Some metric duplication between progress bars and implementation tiles
  (e.g. reports_count, open_actions) is intentional dual-context display.

### Partner
- Org setup, opportunity CRUD with full status lifecycle
  (draft → pending_review → approved → inactive), multi-org switcher,
  PartnerForward incentives entry point — all work.
- Partner surfaces never expose IEPs, Student Voice, Pathway Reports, or
  private documents.

### Platform Admin / Owner
- KPIs, review queues, owner analytics, system health checklist (with
  honest `coming_soon` labels), 2FA, and `/admin` alias to `/owner` work.
- Misleading `{/* mock hub */}` comment on the landing page renamed to
  `feature preview (live composition)` so future agents do not mistake
  the live block for placeholder.

### Pathway Report (flagship)
- Every v2.1 schema field is now surfaced in the UI, including the
  previously unrendered `inputs_used` block — see "Sources Used in This
  Report" on each v2 report.
- Restoring a previous version now triggers a panel re-mount so the
  freshly-restored content appears at the top without a manual reload.

---

## 2. What Changed in This Slice

| Change | File(s) | Effect |
| --- | --- | --- |
| Render "Sources Used in This Report" panel | `src/components/pathway/ReportV2Extras.tsx`, `src/routes/_authenticated/reports.$reportId.tsx` | Users finally see which inputs the AI used (intake, voice, IEP docs, etc.). Hides on legacy reports. |
| Version panel refresh on restore | `src/routes/_authenticated/reports.$reportId.tsx`, existing `onRestored` hook in `ReportVersionsPanel` | Restoring a version now refetches the report and remounts the history panel. |
| Missing Pathway Report KPI → filter | `src/routes/_authenticated/caseload.tsx` | KPI tile is a button that sets the `no-report` filter and scrolls to the list. |
| Caseload notes error visibility | `src/routes/_authenticated/caseload.tsx` | `listStudentNotes` failures show a toast instead of being swallowed. |
| Student self-connect CTA | `src/components/dashboard/StudentDashboard.tsx` | Unlinked students get a "Email an invite request" button (copy + mailto), unblocking them without a fake backend write. |
| Pathway Reports KPI drill-down | `src/routes/_authenticated/school.overview.tsx` | Wraps the KPI in a `<Link>` to the school reports list anchor. |
| Landing-page comment fix | `src/routes/index.tsx` | Renames the misleading `{/* mock hub */}` so the live block is not mistaken for placeholder. |

No schema migrations, no role-guard changes, no test-ID changes, no
modifications to `_authenticated/route.tsx`, auth, or 2FA.

---

## 3. Roadmap

### P0 — Required Before Market Release
- 🟡 **Entitlement enforcement on writes.** Server-side `requireFeatureEntitlement`
  helper (`src/lib/entitlement-guard.ts`) calls `user_has_feature` and is now
  invoked at the top of `createPathwayReport`, `regeneratePathwayReport`,
  `createShareToken`, and `createOpportunity`. Platform admins bypass.
  **Warn-only by default** so current pilot users without entitlement rows
  are not broken. Set `TF_ENFORCE_ENTITLEMENTS=1` in the server environment
  to flip the guard from warn to throw — no code change required at market
  release. Remaining work: extend guard to `updateOpportunity` once partner
  pricing is locked, plus a friendly upsell screen for the
  `EntitlementRequiredError` thrown to clients.
- **Notifications.** Wire the in-app bell to `in_app_notifications` with
  deep links for invitations, share-link views, report regenerations, and
  review-queue actions.
- **Consent & sharing panel.** One "Who can see this?" panel per student
  profile combining `student_collaborators`, `student_relationships`, and
  active `share_tokens`.
- **Document review workflow.** Explicit reviewer states (uploaded →
  AI-extracted → human-reviewed → linked) backed by
  `document_summaries.review_status`.
- **Deterministic PDF export.** Server-rendered PDF for at least the
  educator audience, with audience watermark — replace `window.print()`
  for the share/export path.
- **Launch readiness checklist.** Materialize `/owner/launch` against
  `system_health_checks` outcomes so go/no-go is data-driven.

### P1 — Important Shortly After Release ⬜
- **District-paid access propagation.** UI-side gating on `effective_entitlement_for_user`
  so connected schools/families inherit entitlement from the paying
  district org.
- **Family early-access flow.** Pilot vs post-pilot copy + invite codes.
- **Partner moderation queue.** Owner review with diff view between
  previous and pending opportunity edits.
- **AI content review loop.** Thumbs row per Pathway Report section
  writing to `admin_audit_reviews` for owner QA.
- **Opportunity inquiry inbox.** Partner-safe inbox exposing counts +
  first name only, never IEP / Pathway / voice data.
- **Student rights at 18.** Surface `rights_transfer_status` on student
  profile and Pathway Report header with the recommended action.
- **Email digest.** Daily/weekly summary from `in_app_notifications` +
  `notification_prefs`.

### P2 — Future Expansion ⬜
- Public-facing partner directory.
- District benchmarks across CT districts (anonymized).
- Multi-language Pathway Report (AI assist scaffolding exists).
- Mobile-first parent PWA shell.
- Long-form analytics (cohort + year-over-year).
- Archive / data-deletion lifecycle with audit trail (`audit_log` exists).
- Support / help center beyond `/help` placeholder.

---

## 4. Constraints Honored

- `_authenticated/route.tsx`, role guards (`withRoleGuard`, `has_role`),
  owner 2FA, `/auth`, and dashboard `<main>` test IDs were not touched.
- No new top-level routes, no schema changes, no new dependencies.
- All new persistence happens through existing server functions; the only
  user-facing flow without a DB write is the student self-invite mailto,
  which is intentional — a fake "Send invite" button would violate the
  no-inert-button rule, and a real self-invite is queued under P1.
