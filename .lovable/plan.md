## Audit: what's already here

Routes already in the project:
- **Public/marketing:** `/`, `/about`, `/platform`, `/families`, `/educators`, `/partners`, `/pricing`, `/resources`, `/research`, `/framework`, `/privacy`, `/pathways/$pathwayId`, `/waitlist`, `/login`, `/reset-password`, `/share/$token`
- **Authenticated product:** `/dashboard`, `/onboarding`, `/students`, `/students/$studentId`, `/goals`, `/pathway`, `/ppt-prep`, `/reports`, `/reports/$reportId`, `/admin`, `/settings`
- **Components:** `dashboard/`, `pathway/`, `platform/`, `students/`, `site/`, `a11y/`

So most of your 20 priorities have *some* foundation: role-aware onboarding, student profiles, AI pathway reports, PPT meeting prep, admin dashboard, sharing, privacy page, accessibility tooling, and a waitlist all exist as routes.

## What's actually missing (gap-level, not feature-level)

1. **No role-segmented entry from the homepage.** All five audiences land on the same `/` and one generic CTA. There's no "I am a parent / student / educator / school / partner" door.
2. **No document hub.** `/students/$studentId` exists, but there's no central documents view with status labels (Needs Review, Summarized, Action Items Created, Shared).
3. **No transition timeline view.** Goals exist; a milestone timeline from early HS → postsecondary does not.
4. **No opportunities/partners marketplace.** `/partners` is marketing-facing. Families/students have nowhere to *browse* curated CT colleges, technical schools, BRS, employers, mentors.
5. **No collaboration surface.** Notes/tasks/assignments across parent+student+educator aren't a first-class screen.
6. **AI trust disclaimer is not consistently shown** on AI output surfaces (pathway report, PPT prep).
7. **Trust & consent strip is thin.** Privacy page exists, but the product doesn't visibly show role-based access, consent state, or data export/delete controls.
8. **Empty states are inconsistent** — some product pages show blank panels instead of guided "do this next" prompts.
9. **Audience-specific CTAs missing** on home (one generic "Create A Pathway Report" instead of five).
10. **Waitlist is single-form** — no separate paths for family / teacher demo / partner / district.
11. **Impact/metrics section** missing from marketing.
12. **CT SEDS companion positioning** isn't stated anywhere.
13. **Export/print actions** (transition plan summary, meeting checklist, progress report) aren't surfaced as buttons even as stubs.

## Proposed plan — phased, scoped, reviewable

I want to do this in **three reviewable phases** rather than one giant push, because (a) some of these items meaningfully change product IA and you should sign off, and (b) shipping all 20 in one turn produces shallow stubs everywhere instead of a few strong surfaces.

### Phase 1 — Marketing surface that earns trust (this turn, if you approve)

Scoped to the homepage + a few public pages. Pure presentation; no schema changes.

1. **Homepage role router** — replace the single hero CTA with a "Choose your path" band: Family · Student · Educator · School/District · Partner. Each links to the existing audience page (and where one doesn't exist, to `/waitlist?role=...`).
2. **Audience-specific CTAs** on home, each with the language you specified ("Build My Child's Transition Plan", "Explore My Future Path", "Organize My Caseload", "Request a School Demo", "Become a TransitionForward Partner").
3. **CT SEDS companion positioning block** — short, warm statement that we *complement*, not replace, CT SEDS.
4. **Impact / outcomes strip** — five outcome cards (family understanding, student self-advocacy, goal tracking, collaboration, meeting prep, real opportunity connections).
5. **Trust strip upgrade** — add "Human review of AI", "Role-based access", "Consent before sharing", "Export & delete your data" to the existing privacy/FERPA/CT card row.
6. **Waitlist split** — extend `/waitlist` to a 5-tile chooser (Family waitlist · Teacher demo · School/district interest · Partner · Early access) that all post to the same waitlist table with a `role` discriminator (already in schema).
7. **Global AI disclaimer component** — render on any page that shows AI-generated output (`/pathway`, `/reports/$reportId`, `/ppt-prep`, `/share/$token`), saying AI is a planning aid and does not replace IEP team / legal / professional judgment.

### Phase 2 — Product surfaces that make it feel real (separate turn)

Real authenticated screens, wired to existing tables where possible.

8. **Documents hub** — `/_authenticated/documents` (and a tab on the student page) listing uploads with status chips: Needs Review · Summarized · Action Items Created · Shared. Uses the existing `documents` table + `student-documents` bucket. Empty state: "Start by adding an IEP or transition assessment."
9. **Transition Timeline** — visual milestone strip on `/students/$studentId` (Interest inventory → Career pathway selected → IL goal → Resume → Agency connection → College/training → Internship → Postsecondary plan). Reads from `goals` + `pathway_progress`.
10. **Collaboration panel** — notes/tasks/assignees on the student page, scoped via existing `student_collaborators` table. "Who's responsible for what" view.
11. **Meeting Prep upgrade** — extend `/ppt-prep` with downloadable/printable checklist (questions, concerns, strengths, goals, documents to bring, last-meeting action items).
12. **Export actions** — print/download buttons on pathway report, meeting prep, progress (stubbed to browser print + JSON export initially).

### Phase 3 — Discovery + admin polish (separate turn)

13. **Opportunities & Partners marketplace** — `/_authenticated/opportunities` (curated CT colleges, technical schools, BRS, employers, mentorship, transportation, disability supports, events). Filterable by interest/location/grade. Seeded with sample CT data.
14. **Consent & data controls in `/settings`** — view who has access to each student, revoke, export all data, delete account.
15. **Admin polish** — partner approval queue, AI recommendation review queue, contact form submissions, basic analytics tiles.
16. **Empty-state pass** across all product pages with your exact copy ("Your AI pathway will appear here once you complete your student profile.", etc.).
17. **Accessibility sweep** — audit existing `a11y/` tooling, ensure semantic landmarks, keyboard order, contrast, plain-language tooltips on special-ed terms.

## What I'd like you to confirm before I start

- **Approve Phase 1 to ship in this turn?** It's scoped, low-risk, no schema changes, and immediately raises the trust+clarity ceiling of the public site.
- Phases 2 and 3 are larger and I'd want to do each as its own turn so you can review.
- Any of the 20 items you want **moved up, dropped, or reworded** before I begin?

Once you say "go on Phase 1" (or "go on all of it, I'll review"), I'll execute.