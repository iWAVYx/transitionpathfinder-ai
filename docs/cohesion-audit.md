# TransitionForward — Cohesion & IA Audit
_Generated from codebase read-only pass. No source files modified._

---

## 1. Public Routes (`src/routes/` — top level only)

| File | URL | Purpose | Primary CTA(s) | Flags |
|---|---|---|---|---|
| `index.tsx` | `/` | Homepage — platform overview for all audiences | `/waitlist`, `/demo`, `/login`, `/resources`, `/pathways/$pathwayId` | `/login` links directly into `/dashboard` (auth-required) with no fallback branch visible on the page itself |
| `about.tsx` | `/about` | Founder story & mission | `/waitlist`, `/contact` | — |
| `blog.tsx` | `/blog` | Blog index | None (browse only) | — |
| `blog.$slug.tsx` | `/blog/:slug` | Blog post detail | None | — |
| `bridgeforward.tsx` | `/bridgeforward` | Public marketing page for BridgeForward (Gr 6–8) | (inferred: `/waitlist`, `/demo`) | Public page exists but the identical slug `_authenticated/bridgeforward.*` is the authenticated workspace — naming collision may confuse users |
| `contact.tsx` | `/contact` | General contact form | Form submission | — |
| `demo.tsx` | `/demo` | Demo landing — choose a fictional student | `/demo/hub`, `/demo/intake`, etc. | — |
| `demo_.calendar.tsx` | `/demo/calendar` | Demo: shared calendar view | `/waitlist`, next demo step | — |
| `demo_.hub.tsx` | `/demo/hub` | Demo: student hub workspace | `/waitlist`, next demo step | — |
| `demo_.intake.tsx` | `/demo/intake` | Demo: family intake form (read-only) | Next demo step | — |
| `demo_.meeting.tsx` | `/demo/meeting` | Demo: PPT meeting prep packet | `/waitlist`, next demo step | — |
| `demo_.plan.tsx` | `/demo/plan` | Demo: 30/60/90-day action plan | `/waitlist`, next demo step | — |
| `demo_.report.tsx` | `/demo/report` | Demo: sample Pathway Report | `/waitlist`, next demo step | — |
| `demo_.resources.tsx` | `/demo/resources` | Demo: curated resource list | `/waitlist`, next demo step | — |
| `educators.tsx` | `/educators` | Educator audience landing | `/demo`, `/waitlist?audience=educator` | — |
| `families.tsx` | `/families` | Family audience landing | `/demo`, `/waitlist?audience=family`, `/bridgeforward` | — |
| `framework.tsx` | `/framework` | — | — | **Redirect only** → `/programs/transitionforward`; dead route, can be pruned after redirect period |
| `help.tsx` | `/help` | FAQ + contact form | Form submission | — |
| `invite.$token.tsx` | `/invite/:token` | Accept team/student invitation | Accept button → `/dashboard` | Requires auth; redirects to `/login?redirect=...` if signed out ✓ |
| `admin-invite.$token.tsx` | `/admin-invite/:token` | Accept admin-role invitation | Accept → `/owner` | Requires auth; redirects to login ✓ |
| `login.tsx` | `/login` | Sign in / sign up | Sign in form → `/dashboard` (or redirect param) | — |
| `login.2fa.tsx` | `/login/2fa` | TOTP second-factor challenge | Verify code | — |
| `partner-directory.tsx` | `/partner-directory` | Browse public partner/opportunity listings | External links only | — |
| `partner-interest.tsx` | `/partner-interest` | Partner application form | Form submit | ⚠️ **Duplicate intent** with `/partnerforward` hero CTA and `/waitlist?audience=partner` — three separate partner-acquisition entry points |
| `partnerforward.tsx` | `/partnerforward` | PartnerForward program marketing | `/partnerforward/incentives`, `/partners` | — |
| `partnerforward.incentives.tsx` | `/partnerforward/incentives` | Incentives/grants detail for partners | External links | — |
| `partners.tsx` | `/partners` | General partner-network overview | `/waitlist`, `/platform`, `/partnerforward` | — |
| `pathways.$pathwayId.tsx` | `/pathways/:id` | Static pathway explorer (college/technical/career/lifeskills) | (browse + checklist) | Signed-out tool; no auth required ✓ |
| `platform.tsx` | `/platform` | Platform feature overview (4 audience tabs) | `/waitlist`, `/demo` | — |
| `pricing.tsx` | `/pricing` | Pricing tiers | `/waitlist`, `/contact` | **Only 3 tiers shown** vs target 10 (see §6) |
| `privacy.tsx` | `/privacy` | Privacy policy | — | — |
| `programs.transitionforward.tsx` | `/programs/transitionforward` | Program detail (TransitionForward 9–12) | `/waitlist`, `/demo` | — |
| `research.tsx` | `/research` | Research & evidence base | — | — |
| `resources.tsx` | `/resources` | Public resource library | Browse/filter | Signed-out page; no auth-gated content visible ✓ |
| `reset-password.tsx` | `/reset-password` | Password reset (after email link) | Submit → `/dashboard` | — |
| `share.$token.tsx` | `/share/:token` | Public share link for a Pathway Report | None (view only) | noindex ✓ |
| `sitemap[.]xml.ts` | `/sitemap.xml` | XML sitemap | — | — |
| `terms.tsx` | `/terms` | Terms of service | — | — |
| `trust-and-safety.tsx` | `/trust-and-safety` | Trust & safety page | — | — |
| `unsubscribe.tsx` | `/unsubscribe` | Email unsubscribe (token param) | Confirm unsubscribe | — |
| `waitlist.tsx` | `/waitlist` | Waitlist / early-access sign-up | Form submit | ⚠️ **Duplicate intent** with `/partner-interest` for partners; also duplicates `/contact` topic=demo-request for district demo requests |

### Duplicate / Overlap Flags
- **Partner acquisition has 3 entry points**: `/partner-interest`, `/waitlist?audience=partner`, and the `/partnerforward` hero CTA — no canonical funnel.
- **Demo requests** can come from `/waitlist` (role=district), `/contact` (topic=district-demo / demo-request), and `/help` (topic=demo-request) — three separate capture points with no obvious routing to a shared record.
- **CTA → private route without auth-aware fallback**: `index.tsx` has a "Sign in" `<Link to="/login">` and links to `/resources` (public, ✓) but no explicit fallback for the Dashboard link when signed out. The `/login` page itself handles the auth check on load.

---

## 2. Authenticated Routes (non-`owner.*`)

Role audiences are drawn from `src/lib/role-policy.ts` `ROUTE_AUDIENCES` table and inline `RoleGuard` / `withRoleGuard` calls.

### Family & Student

| File | URL | Allow | Purpose |
|---|---|---|---|
| `dashboard.tsx` | `/dashboard` | family, student, educator, admin | Primary post-login hub; routes non-family/student roles to their workspace |
| `pathway.tsx` | `/pathway` | family, educator, admin | Pathway Builder (intake → report) |
| `reports.tsx` | `/reports` | family, educator, student, admin | Library of past Pathway Reports |
| `goals.tsx` | `/goals` | family, educator, admin | Goal tracker |
| `documents.tsx` | `/documents` | family, educator, admin | Document library per student |
| `ppt-prep.tsx` | `/ppt-prep` | family, educator, admin | PPT/IEP meeting prep |
| `meetings.tsx` | `/meetings` | family, educator, admin | Meeting log & agenda |
| `feed.tsx` | `/feed` | family, educator, student, admin | Activity/announcement feed |
| `messages.tsx` | `/messages` | family, educator, student, admin | Messaging hub |
| `student-voice.tsx` | `/student-voice` | family, educator, student, admin | Student self-profile & voice |
| `trust.tsx` | `/trust` | family, educator, student, school_admin, district_admin, admin | Consent & privacy controls |
| `onboarding.tsx` | `/onboarding` | ungated (all signed-in) | Role selection & profile setup |
| `settings.tsx` | `/settings` | ungated | Account settings |
| `security.tsx` | `/security` | ungated | 2FA & security settings |

### Educator / Case Manager

| File | URL | Allow | Purpose |
|---|---|---|---|
| `caseload.tsx` | `/caseload` | educator, admin | Caseload dashboard with student list |
| `students.tsx` | `/students` | family, educator, admin | Student roster & profiles |
| `students.$studentId.tsx` | `/students/:id` | family, educator, admin | Individual student workspace |
| `insights.tsx` | `/insights` | educator, school_admin, district_admin, admin | Engagement analytics |
| `analytics.tsx` | `/analytics` | educator, school_admin, district_admin, admin | Platform analytics |
| `forms.tsx` | `/forms` | family, educator, student, admin | Form library |
| `forms.$slug.tsx` | `/forms/:slug` | family, educator, student, admin | Individual form |

### School Admin

| File | URL | Allow | Purpose |
|---|---|---|---|
| `school.overview.tsx` | `/school/overview` | school_admin, admin | School-level dashboard |
| `school.team.tsx` | `/school/team` | school_admin, admin | Staff & team management |
| `school.reports.tsx` | `/school/reports` | school_admin, admin | School-level Pathway Report stats |
| `school.implementation.tsx` | `/school/implementation` | school_admin, admin | Implementation tracker |

### District Admin

| File | URL | Allow | Purpose |
|---|---|---|---|
| `district.overview.tsx` | `/district/overview` | district_admin, admin | District-level dashboard |
| `district.schools.tsx` | `/district/schools` | district_admin, admin | Manage schools in the district |
| `district.team.tsx` | `/district/team` | district_admin, admin | District team/staff |
| `district.reports.tsx` | `/district/reports` | district_admin, admin | District-level reporting |

### Partner

| File | URL | Allow | Purpose |
|---|---|---|---|
| `partners-manage.tsx` | `/partners-manage` | partner, admin | Partner workspace (opportunity management) |
| `partners-manage_.impact.tsx` | `/partners-manage/impact` | partner, admin | Partner impact report |
| `opportunities.tsx` | `/opportunities` | family, educator, student, admin, partner | Browse opportunity catalog |

### BridgeForward (Middle School)

| File | URL | Allow | Purpose |
|---|---|---|---|
| `bridgeforward.intake.tsx` | `/bridgeforward/intake` | family, educator, student, admin | BridgeForward guided intake |
| `bridgeforward.voice.tsx` | `/bridgeforward/voice` | family, educator, student, admin | BridgeForward student voice |
| `bridgeforward.fit-finder.tsx` | `/bridgeforward/fit-finder` | family, educator, student, admin | High-school fit finder |
| `bridgeforward.snapshot.tsx` | `/bridgeforward/snapshot` | family, educator, student, admin | Readiness snapshot |
| `bridgeforward.explore.tsx` | `/bridgeforward/explore` | family, educator, student, admin | School/program explorer |

### Utility / Redirect

| File | URL | Allow | Purpose |
|---|---|---|---|
| `admin.tsx` | `/admin` | redirect → `/owner` | Legacy admin redirect |
| `admin-school.tsx` | `/admin-school` | redirect → `/school/overview` | Legacy school-admin redirect |
| `demo-mode.tsx` | `/demo-mode` | ungated | Internal demo-mode toggle |
| `documents.$documentId.review.tsx` | `/documents/:id/review` | ungated (RLS) | Document review |
| `meetings.$meetingId.tsx` | `/meetings/:id` | ungated (RLS) | Individual meeting detail |
| `reports.$reportId.tsx` | `/reports/:id` | ungated (RLS) | Individual report detail |

---

## 3. Owner Hub (`owner.*` files)

All owner routes are gated at the layout level (`owner.tsx`) via `getMyAdminRoles()` → `isPlatformAdmin` check; no per-page role lists.

### Access & Accounts

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.waitlist.tsx` | `/owner/waitlist` | View, filter, and annotate waitlist submissions | KEEP |
| `owner.users.tsx` | `/owner/users` | List all platform users with role badges | KEEP |
| `owner.admins.tsx` | `/owner/admins` | Invite and manage platform admins | KEEP |
| `owner.beta-testers.tsx` | `/owner/beta-testers` | Manage beta-tester allow list | KEEP |

### Organizations & Entitlements

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.organizations.tsx` | `/owner/organizations` | Approve/reject org registrations, manage entitlements | KEEP |

### Students & Relationships

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.iep-audit.tsx` | `/owner/iep-audit` | Audit IEP document uploads & processing | KEEP |
| `owner.import-audit.tsx` | `/owner/import-audit` | Audit bulk data imports | KEEP |

### Content & Resources

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.resources.tsx` | `/owner/resources` | Manage the public resource library (CRUD) | KEEP — admin manages catalog; `/resources` (public) is read-only view ✓ |
| `owner.resource-sources.tsx` | `/owner/resource-sources` | Manage resource data sources & scrapers | KEEP |
| `owner.resource-review.tsx` | `/owner/resource-review` | Review flagged/broken resource links | KEEP |
| `owner.bridgeforward-sources.tsx` | `/owner/bridgeforward-sources` | Manage BridgeForward data sources | KEEP |
| `owner.blog.tsx` | `/owner/blog` | CMS for blog posts | KEEP |
| `owner.faqs.tsx` | `/owner/faqs` | CMS for FAQ entries | KEEP |
| `owner.testimonials.tsx` | `/owner/testimonials` | Manage testimonials | KEEP |
| `owner.media.tsx` | `/owner/media` | Media asset library | KEEP |
| `owner.content.tsx` | `/owner/content` | Site content / CMS settings | KEEP |

### Partners & Opportunities

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.partner-network.tsx` | `/owner/partner-network` | Full partner directory management (verify, feature, edit) | KEEP |
| `owner.partner-network-status.tsx` | `/owner/partner-network-status` | Health/status dashboard for partner sync | MERGE-WITH:owner.partner-network |
| `owner.partner-submissions.tsx` | `/owner/partner-submissions` | Review partner application forms | KEEP |
| `owner.partner-outreach.tsx` | `/owner/partner-outreach` | Track outreach to potential partners | KEEP |
| `owner.opportunities.tsx` | `/owner/opportunities` | Approve/reject student opportunity listings | KEEP — admin side; `/opportunities` is browsable by users ✓ |
| `owner.partnerforward-resources.tsx` | `/owner/partnerforward-resources` | Manage PartnerForward resource library | KEEP |

### Product Operations

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.feedback.tsx` | `/owner/feedback` | Review in-app feedback submissions | KEEP |
| `owner.issues.tsx` | `/owner/issues` | Track reported issues/bugs | KEEP |
| `owner.settings.tsx` | `/owner/settings` | Platform-wide site settings | KEEP |
| `owner.broadcasts.tsx` | `/owner/broadcasts` | Compose & send broadcast messages | KEEP |
| `owner.emails.tsx` | `/owner/emails` | Email delivery monitor (Resend logs) | KEEP |
| `owner.contacts.tsx` | `/owner/contacts` | Contact form submissions | KEEP |

### Launch & Pilot Readiness

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.launch.tsx` | `/owner/launch` | Launch checklist tracker | KEEP |
| `owner.pilot-packages.tsx` | `/owner/pilot-packages` | Define pilot package tiers | KEEP |
| `owner.outreach.tsx` | `/owner/outreach` | General outreach task tracker | MERGE-WITH:owner.partner-outreach (two outreach trackers with overlapping scope) |
| `owner.pitch.tsx` | `/owner/pitch` | Pitch deck / talking-points reference | KEEP |

### System Health

| File | URL | Purpose | Tag |
|---|---|---|---|
| `owner.health.tsx` | `/owner/health` | Platform health checks | KEEP |
| `owner.analytics.tsx` | `/owner/analytics` | Admin-level analytics dashboard | KEEP |
| `owner.activity.tsx` | `/owner/activity` | Platform activity log | KEEP |
| `owner.testing.tsx` | `/owner/testing` | Manual QA test runner | KEEP |
| `owner.testing-scripts.tsx` | `/owner/testing-scripts` | Saved testing scripts | MERGE-WITH:owner.testing |

### ⚠️ Duplication Flags

| Owner Route | Potential Duplicate User Route | Note |
|---|---|---|
| `owner.demo.tsx` | `/demo` (public) | Owner page manages **demo seed accounts** — distinct purpose, not a duplicate |
| `owner.resources.tsx` | `/resources` (public) | Admin CRUD vs. public read-only view — distinct roles, not a duplicate |
| `owner.opportunities.tsx` | `/opportunities` (authenticated) | Admin approval queue vs. user browse view — distinct, but label collision |

---

## 4. Dashboard Widgets (`src/components/dashboard/DashboardWidgets.tsx`)

The file is used inside `dashboard.tsx` which is gated to `["family", "student", "educator", "admin"]`. The widgets themselves are not individually role-gated except where noted.

| Widget / Card | Roles that see it today | Rule-match issues |
|---|---|---|
| **Students** stat tile → `/students` | family, educator, admin | ⚠️ `student` role can hit `/dashboard` but tile links to `/students` which excludes `student` audience — dead link for self-enrolled students |
| **Pathway Reports** stat tile → `/reports` | family, educator, student, admin | ✓ |
| **Goals tracked** stat tile → `/goals` | family, educator, admin | ⚠️ `student` audience excluded from `/goals` per policy table |
| **Next PPT** tile → `/ppt-prep` | family, educator, admin | ⚠️ `student` excluded from `/ppt-prep` per policy table |
| **BridgeForward (Gr 6–8)** card | Shown only when `elig.hasMiddleSchoolStudent === true` (any signed-in user with a middle-school student) | ⚠️ Gating is by student grade, not by user role — a partner user with a linked middle-school student would see this card. Should also exclude `partner` role. |
| **PartnerForward** card | Shown when `elig.isPartner === true` | ✓ Partner-only, correct |
| **Recent reports** list → `/reports` | family, educator, admin | ⚠️ Student role cannot access `/reports` per policy (feeds via `/dashboard`) — but students are allowed at this dashboard; the list would render for a student but the link is inaccessible |
| **JourneyStrip** (surface="family") | Rendered for family audience only inside educator block | ⚠️ JourneyStrip surface is hardcoded "family" regardless of actual role — educators and admins who land on `/dashboard` see a family-oriented journey |

**Summary of widget/audience mismatches:**
- `student` role lands on `/dashboard` but multiple tile links (`/students`, `/goals`, `/ppt-prep`) are blocked by `ROUTE_AUDIENCES` — clicking will redirect with a toast. These tiles should be conditionally hidden for `student` audience.
- BridgeForward card gated by student grade band (via `getProgramEligibility`) rather than user role — partner users could see it.
- No district-admin or school-admin widgets on the main `/dashboard` (they are redirected away by `fallbackPathFor`), which is correct — but `admin` (platform admin) is allowed and sees the same family-oriented widgets, which is wrong; platform admin should see a link to Owner Hub instead.

---

## 5. Waitlist Form

**File:** `src/routes/waitlist.tsx`

### Fields currently captured

| Field | Type | Notes |
|---|---|---|
| `full_name` | text (required) | ✓ |
| `email` | email (required) | ✓ |
| `role` | enum: family \| student \| educator \| district \| partner | ✓ — maps loosely to `interest_type` |
| `state` | text (optional, defaults "CT") | captures geography |
| `student_grade_band` | enum: 9-10 \| 11-12 \| post-secondary \| not-applicable (optional) | ✓ |
| `reason` | textarea (optional, max 2000 chars) | ✓ |
| `source` | hardcoded "waitlist-tiles" on submit | internal only |

### Missing vs. required fields

| Required field | Status |
|---|---|
| `name` | ✓ (`full_name`) |
| `email` | ✓ |
| `role` | ✓ |
| `organization_type` | ❌ Missing |
| `school / district` | ❌ Missing (state is captured but not school/district name) |
| `student_grade_band` | ✓ (partial — only 9-12 bands; no 6-8 / BridgeForward band) |
| `reason` | ✓ |
| `interest_type` (enum: family_early_access \| educator_access \| school_pilot \| district_pilot \| partner_interest \| demo_request) | ❌ Missing — role maps roughly but the enum is not stored |
| `admin_notes / status` | ❌ Missing from form (owner can add notes post-submission in `owner.waitlist`) |

### Post-submit state
✅ Yes — a staged success card renders when `done === true`, showing:
- Role-specific icon
- "You're in. Thank you for trusting us with this."
- Numbered next-steps list (3 steps, with copy varying by role)
- A "while you wait" section

### Waitlist DB table columns
_(Queried from `information_schema.columns` — see note below)_

> **Note:** A direct Supabase query was not executed in this pass. Based on form schema and `submitWaitlist` server function, the stored fields are likely: `id`, `full_name`, `email`, `role`, `state`, `student_grade_band`, `reason`, `source`, `created_at`, and possibly `status` / `admin_notes` set server-side. Fields `organization_type`, `interest_type`, and `school` are not present in the form schema and are unlikely to be stored.

---

## 6. Pricing Tiers

**File:** `src/routes/pricing.tsx`

### Tiers currently shown (3)

| ID | Name | Audience | Price |
|---|---|---|---|
| `family` | Family Pilot | Parents, caregivers, students 14+ | $0 (2026 pilot) |
| `educator` | Educator Pilot | Special educators, case managers, transition coordinators | $0 (2026 pilot) |
| `district` | School & District | Schools and districts | Contact for pricing |

### Target 10 tiers vs. current

| Target Tier | Present? |
|---|---|
| Free / Waitlist | ❌ Not a named tier (implied by pilot pricing) |
| Family Early Access | ✅ (`family` — named "Family Pilot") |
| Educator Individual | ✅ (`educator` — named "Educator Pilot") |
| School Pilot | ❌ Bundled into single `district` tier |
| School Plan | ❌ Missing |
| District Pilot | ❌ Bundled into single `district` tier |
| District Plan | ❌ Missing |
| Partner Basic | ❌ Missing |
| Partner Featured | ❌ Missing |
| Platform Internal | ❌ Missing |

**Gap:** 7 of 10 target tiers are absent. The single "School & District" catch-all collapses four distinct tiers.

---

## 7. Copy Glossary — Avoided Phrases

### "guarantee" / "guaranteed"

| File | Line | Snippet |
|---|---|---|
| `src/routes/terms.tsx` | 80 | `"We do not guarantee the platform will be available without interruption"` — legal disclaimer, acceptable usage |
| `src/routes/partner-directory.tsx` | 253 | `"TransitionForward does not guarantee availability, cost…"` — disclaimer, acceptable |

✅ No marketing use of "guarantee." Both hits are disclaimers.

### "replace" + "IEP" or "PPT" (same line)

| File | Line | Snippet |
|---|---|---|
| `src/routes/trust-and-safety.tsx` | 54 | `"AI does not replace IEP teams…"` — compliant framing |
| `src/routes/terms.tsx` | 49 | `"does not replace IEP documents, school services, or legal advice"` — compliant |
| `src/routes/privacy.tsx` | 61 | `"not a replacement for CT SEDS or your district's IEP platform"` — compliant |
| `src/components/students/RightsStatusCard.tsx` | 246 | `"does not replace official IEP"` — compliant |
| `src/components/site/TrustNote.tsx` | 48 | `"do not replace professional judgment…IEP/PPT determinations"` — compliant |
| `src/routes/_authenticated/dashboard.tsx` | 737 | Consent copy: `"does not replace the school team…IEP/PPT decisions"` — compliant |

✅ All "replace + IEP/PPT" hits are _correct_ disclaimers, not avoided framing.

### "ensure" + ("success" | "outcome")

**0 hits.** ✅

### "revolutionary" / "game-changer"

**0 hits.** ✅

### "AI-powered"

| File | Line | Snippet |
|---|---|---|
| `src/routes/_authenticated/owner.pitch.tsx` | 33 | `"TransitionForward is an AI-powered transition planning platform…"` — internal pitch deck copy |

⚠️ One hit in the internal pitch deck. Not public-facing, but worth updating if pitch deck is shared externally or copy is reused.

---

## Top 10 Cleanup Priorities

1. **Collapse partner acquisition funnel.** Three parallel entry points (`/partner-interest`, `/waitlist?audience=partner`, `/partnerforward` hero) with no shared record. Pick `/waitlist` as canonical; redirect `/partner-interest` there with `?audience=partner` pre-selected.

2. **Expand pricing page to all 10 tiers.** The current 3-tier page (Family, Educator, School & District) leaves 7 tiers absent. Split the single "School & District" card into at minimum: School Pilot, School Plan, District Pilot, District Plan.

3. **Add missing waitlist fields: `organization_type`, `school/district name`, `interest_type` enum.** The DB and owner review tools need these for routing; current form collects too little to meaningfully segment leads.

4. **Fix dashboard widget visibility for `student` role.** Students land on `/dashboard` but the Students, Goals, and PPT tiles link to routes blocked for them. Either hide those tiles for `student` audience or update `ROUTE_AUDIENCES` to include `student`.

5. **Replace platform-admin experience on `/dashboard`.** When a `platform admin` lands here they see family-oriented widgets and a hardcoded `surface="family"` JourneyStrip. Add an admin detection branch that surfaces Owner Hub links instead.

6. **BridgeForward card gating.** The card uses `hasMiddleSchoolStudent` (grade-band flag) not role — a `partner` user with a linked student could see it. Add role exclusion for `partner`; confirm `student` handling.

7. **Merge `owner.testing.tsx` + `owner.testing-scripts.tsx`** into a single QA hub, and **merge `owner.outreach.tsx` + `owner.partner-outreach.tsx`** to eliminate the dual outreach trackers.

8. **Remove `/framework` dead route.** It is a redirect-only file to `/programs/transitionforward`; after any external links have been updated, prune it.

9. **Remediate `"AI-powered"` in `owner.pitch.tsx`.** Even though it's internal, pitch copy often escapes into presentations and emails. Replace with "AI-assisted" or "specialist-built, AI-supported" to match platform voice.

10. **Add `grade_band` 6–8 option to waitlist `student_grade_band` enum.** BridgeForward is a core product for grades 6–8 but the waitlist cannot capture families in that cohort specifically — they fall into the same bucket as 9-10 families.
