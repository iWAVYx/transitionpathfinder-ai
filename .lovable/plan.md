# What's missing — think big, think infrastructure

You've built a strong front-of-house experience (landing, pathways, reports, onboarding, accessibility, dashboard widgets). To turn this into a real platform families, educators, and districts can rely on, here's what I'd build next, grouped by layer.

---

## 1. Data model & persistence (the foundation)

Right now most state lives in `localStorage` (onboarding, pathway progress, accessibility prefs). That breaks the moment a user switches devices or a family + educator try to collaborate. Add real tables:

- `students` — one row per student, owned by a family account, with grade band, school, DOB, photo.
- `student_collaborators` — invite educators/case managers to a student with role (viewer/editor) + status.
- `pathway_progress` — per-student per-pathway step completion, notes, evidence links.
- `goals` — IEP-style goals with category, target date, status, measurable criteria, linked supports.
- `documents` — uploaded IEPs, 504s, evaluations (Storage bucket + metadata row, virus-scanned).
- `tasks` / `next_steps` — actionable items generated from reports and pathways, with due dates and assignees.
- `events` / `audit_log` — every view, edit, share, export (FERPA-grade trail).
- `notifications` — in-app + email outbox.

All scoped through `has_role` + a new `can_access_student(uid, student_id)` security-definer function.

## 2. Roles, sharing & permissions

- Extend `app_role` beyond `parent`/`admin`: add `educator`, `case_manager`, `student` (self), `district_admin`.
- Share-token table for the family/educator report views so a teacher can open a read-only report without an account (signed JWT, expiring, revocable).
- Per-student ACL so a teacher only sees the students they're invited to.

## 3. Documents & file storage

- `student-documents` private Storage bucket with RLS keyed to student access.
- Upload pipeline: presigned upload → metadata row → background parse (Lovable AI) → extracted strengths/goals/services suggested back to the user.
- Versioning so re-uploading an IEP keeps history.

## 4. AI infrastructure (Lovable AI Gateway)

You already have `pathway_reports`. Build it out:
- Server function `generatePathwayReport` using `google/gemini-2.5-pro` with structured output (Zod schema) → writes to `pathway_reports`.
- `summarizeIEP` — extracts goals, services, accommodations from uploaded PDFs.
- `suggestNextSteps` — given student + completed pathways, propose 3 actions.
- `translateReport` — Spanish/other languages for family view.
- Token usage + cost log per user for fair-use limits.

## 5. Notifications & email

- Set up Lovable Email infra + a verified domain.
- Transactional templates: welcome, IEP processed, report ready, collaborator invite, weekly progress digest, goal due-date reminders.
- Auth emails (password reset, magic link) on-brand.
- Per-user notification preferences table.

## 6. Auth hardening

- Enable HIBP leaked-password check.
- Add Google sign-in (configure_social_auth) — the default we discussed.
- Optional MFA for educator/admin roles.
- Session timeout + "remember this device" controls (sensitive data).

## 7. Public + scheduled endpoints

- `/api/public/share/$token` — public report view backed by share tokens.
- `/api/public/cron/weekly-digest` — pg_cron hits this; sends progress emails.
- `/api/public/cron/goal-reminders` — daily check for goals nearing due dates.
- All signature- or token-verified.

## 8. Search & discovery

- Full-text search across documents, reports, goals (Postgres `tsvector`).
- A "Resources" content table (programs, scholarships, agencies) filterable by state + disability + pathway, with admin CMS.

## 9. Compliance & privacy (non-negotiable for ed-tech)

- Privacy policy + Terms + FERPA/COPPA statement pages with versioned acceptance log.
- Data export (download everything as JSON/PDF) and account deletion flow.
- Audit log surfaced to family ("who viewed what, when").
- Cookie consent + accessibility statement.

## 10. Admin & district console

- `/admin` area (gated by `admin` role): user lookup, waitlist management, content moderation, AI usage stats, system health.
- District tier: org table, bulk seat management, SSO (SAML) ready.

## 11. Analytics & observability

- Privacy-respecting product analytics (event table you own, not 3rd-party).
- Server function logs surfaced in admin.
- Lovable Cloud status checks already available — add a `/healthz` route.

## 12. SEO & growth surface

- Per-pathway public landing pages (`/pathways/college`, etc.) with unique `head()` meta + og:images.
- A blog/resource route with MDX or DB-backed posts.
- Sitemap.xml + robots.txt generated from routes.
- Structured data (JSON-LD) for the org and articles.

## 13. Payments (if/when you monetize)

- `recommend_payment_provider` → likely Stripe.
- Tiers: Family (free / pro), Educator, District (seat-based).
- Entitlements table gates premium AI features.

## 14. Mobile & PWA

- Manifest + service worker for installable PWA.
- Offline read for reports + goals.
- Push notifications for reminders.

## 15. Quality infrastructure

- Vitest + a few smoke tests on critical server functions.
- Storybook (or simple component gallery) for the design system.
- Error boundary + Sentry-style logging via a server route.

---

## Suggested build order (phases)

```text
Phase 1 — Real data spine
  students, collaborators, goals, pathway_progress, documents
  + RLS + grants, replace localStorage usages

Phase 2 — Sharing & auth polish
  share tokens, public /share/$token route, Google sign-in, HIBP,
  notification prefs, email infra + welcome/report-ready templates

Phase 3 — AI pipeline
  generatePathwayReport, summarizeIEP, suggestNextSteps,
  Storage bucket + IEP parse flow

Phase 4 — Compliance + admin
  audit log, data export/delete, /admin console, privacy/ToS pages

Phase 5 — Growth & monetization
  per-pathway SEO routes, resources directory, Stripe tiers, PWA
```

---

## How I'd like to proceed

Tell me which phase (or which 2–3 items) to start with and I'll come back with a focused implementation plan. If you want the maximum-leverage starting point, my recommendation is **Phase 1 + share tokens from Phase 2** — everything else compounds on top of a real student/goal/document data model.
