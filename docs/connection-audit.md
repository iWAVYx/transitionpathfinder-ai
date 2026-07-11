# Connection Audit — Dashboard Tiles, Transition Workspace, Demo Previews, Admin Hub

Scope: every signed-in dashboard tile, TW tile, demo role-preview tile, and Admin Hub tile.
Method: static read of `src/components/dashboard/role/*`, `src/lib/workspace/stages.ts`,
`src/lib/demo/role-previews.ts`, `src/routes/_authenticated/*`, `src/routes/demo_*`, `src/studio/stages.ts`.
Status: **audit-only pass — no code changes**. Fixes are recommendations for follow-up turns.

Legend
- OK — destination exists, role-appropriate, connection type matches the surface.
- FIX — dead link, wrong role, generic redirect, duplicate, or wrong connection type.
- BUILD — destination should exist and does not (or is a stub).
- REVIEW — connection works but should be reconsidered.

---

## 1. Student Dashboard (`StudentOverviewGrid`, `StudentDashboard`)

| # | Tile | Current `to` | Route exists | Role-appropriate | Status |
|---|---|---|---|---|---|
| 1 | Open Student Voice | `/student-voice` | ✅ `_authenticated/student-voice.tsx` | ✅ | OK |
| 2 | Open my pathway | `/pathway` | ✅ `_authenticated/pathway.tsx` | ✅ | OK |
| 3 | See action items | `/action-items` | ✅ `_authenticated/action-items.tsx` | ✅ | OK |
| 4 | Open saved resources | `/resources/saved` | ✅ `_authenticated/resources.saved.tsx` | ✅ | OK |
| 5 | Prep for a meeting | `/ppt-prep` | ✅ | ✅ | OK |
| 6 | Open calendar | `/meetings` | ✅ | ✅ | REVIEW — label says "calendar", route is meetings list. Confirm the destination has a calendar view. |
| 7 | Open my report | `/pathway/student` | ✅ `_authenticated/pathway.student.tsx` | ✅ | OK |
| 8 | BridgeForward (dashboard shortcut) | `/bridgeforward` | ✅ but **public landing route** | ⚠ authenticated tile lands on marketing page | FIX — route students to `/bridgeforward/intake` (or `/bridgeforward/snapshot` if intake complete). |
| 9 | Opportunities shortcut | `/opportunities` | ✅ | ✅ | OK |
| 10 | Messages shortcut | `/messages` | ✅ | ✅ | OK |

---

## 2. Parent / Guardian Dashboard (`ParentOverviewGrid`)

| # | Tile | Current `to` | Notes | Status |
|---|---|---|---|---|
| 1 | Open student hub | `/students` | List; parents typically have 1–2 students. Consider deep link to `/students/$studentId` when there is a single relationship. | REVIEW |
| 2 | Manage documents | `/documents` | ✅ | OK |
| 3 | Open Family Priorities | `/family/priorities` | ✅ | OK |
| 4 | Open family report | `/pathway/family` | ✅ | OK |
| 5 | Prep for a meeting | `/ppt-prep` | ✅ | OK |
| 6 | See action items | `/family/action-items` | ✅ | OK |
| 7 | Manage sharing | `/family/consent` | ✅ | OK |
| 8 | Open resources | `/resources` | Route file not in `_authenticated/` listing — only `resources.saved.tsx` is protected. | FIX / BUILD — either point to `/resources/saved` or create `/resources` browse page. |

---

## 3. Educator / Case Manager (`EducatorOverviewGrid`)

| # | Tile | Current `to` | Status |
|---|---|---|---|
| 1 | Open caseload | `/caseload` | OK |
| 2 | See readiness gaps | `/educator/readiness-gaps` | OK |
| 3 | Add input | `/teacher-portal` | OK |
| 4 | Open reports | `/reports` | OK |
| 5 | Prep for meetings | `/ppt-prep` | OK |
| 6 | Open notes | `/educator/notes` | OK |
| 7 | See action items | `/educator/action-items` | OK |
| 8 | Open calendar | `/meetings` | REVIEW — same calendar/list mismatch as student. |

Missing per spec: "Assigned Student Profile" quick-link (spec §4). Reachable only through `/caseload → student`. → BUILD: add a "Recent students" tile deep-linking to `/students/$studentId`.

---

## 4. School Admin (`SchoolAdminOverviewGrid`)

All 7 tiles map 1:1 to `_authenticated/school.*.tsx` routes. **All OK.**
Spec §4 items covered: overview, planning-status, team, reports, readiness-trends, resource-usage, support-needs, implementation.
- Implementation tasks tile is not on the grid though `school.implementation.tsx` exists. → BUILD (add 8th tile) or REVIEW (intentional).

---

## 5. District Admin (`DistrictAdminOverviewGrid`)

All 7 tiles map 1:1 to `_authenticated/district.*.tsx` routes.
- Spec §4 "Staff Access" → **BUILD**: no `district.staff-access.tsx` route or tile. Closest is `district.team.tsx` (labelled "Team"), which may cover it; verify against product intent, otherwise create a dedicated page.

---

## 6. Partner (`PartnerOverviewGrid`)

| # | Tile | Current `to` | Status |
|---|---|---|---|
| 1 | Edit profile | `/partners-manage/profile` | OK |
| 2 | Opportunities (list) | `/partners-manage/opportunities` | OK |
| 3 | Submissions | `/partners-manage/opportunities` | FIX — duplicate href with tile 2. Should point to a distinct submissions/status view (spec §4 "Submitted Programs"). → BUILD `/partners-manage/submissions` or reuse `/owner/partner-submissions` scoped to caller. |
| 4 | Deadlines | `/partners-manage/deadlines` | OK |
| 5 | Opportunity management | `/partners-manage/opportunities` | FIX — third tile pointing at the same route with a different label. Consolidate or route to an edit sub-view. |
| 6 | PartnerForward incentives | `/partnerforward/incentives` | OK |
| 7 | Partner resources | `/partnerforward` | REVIEW — routes to marketing landing rather than an authenticated resources view. Should point to a partner-scoped resource list. |

Missing per spec: **Partner Profile public preview** shortcut, and a **Programs list distinct from Opportunities**.

---

## 7. Owner / Admin Hub (`owner.index.tsx`)

Every documented owner surface has a route file (`owner.waitlist`, `owner.users`, `owner.contacts`, `owner.resource-review`, `owner.partner-submissions`, `owner.feedback`, `owner.launch`, `owner.health`, `owner.analytics`, `owner.outreach`, `owner.pitch`, `owner.issues`, `owner.testing`, `owner.demo`, `owner.pilot-packages`, `owner.partner-network`, …).

Legacy consolidations already implemented as redirects (OK):
- `owner.partner-network-status` → `owner.partner-network`
- `owner.partner-outreach` → `owner.outreach`
- `owner.testing-scripts` → `owner.testing`

Missing per spec §4 "Owner":
- **Bug Tracker** — closest is `owner.issues.tsx`; confirm label match (spec calls it "Bug Tracker", UI shows "Product Issues"). → REVIEW: align label OR add dedicated bug-tracker view.
- **Source Libraries** — closest is `owner.resource-sources.tsx` + `owner.bridgeforward-sources.tsx`; verify these together satisfy the spec item.
- **Demo Materials** — `owner.demo.tsx` exists. OK.

---

## 8. Transition Workspace Stages (`workspace.$stage`)

Stage → `signedInRoute` (from `src/lib/workspace/stages.ts`):

| Stage | Signed-in route | Status |
|---|---|---|
| `start` — Getting Started | `/students` | REVIEW — students list is a reasonable "start here" but does not map to a stage-specific onboarding tool. Consider `/onboarding` for first-run users. |
| `voice` — Student Voice | `/student-voice` | OK |
| `family` — Family Perspective | `/ppt-prep` | REVIEW — Family Perspective conceptually maps closer to `/family/priorities`; PPT prep is a different tool. FIX candidate. |
| `school` — School Team Insight | `/teacher-portal` | OK |
| `evidence` — Documents and Evidence | `/documents` | OK |
| `ready` — Readiness Scorecard | `/insights` | OK |
| `roadmap` — Pathway and Goals | `/pathway` | OK |
| `action` — 30/90/180/365 Plan | `/goals` | REVIEW — plan surface is `/action-items` or `/pathway`; goals table is a subset. |
| `connect` — Resources & Opportunities | `/opportunities` | REVIEW — mixed surface; consider a hub page or split into two CTAs. |

---

## 9. Public Demo (Workspace Tour + Role Previews)

### 9a. Workspace Tour — `/demo/workspace/$stage`
- "Open Full Sample Screen" — expands `StageSamplePanel` in place via `?expand=true`. ✅ Correct pattern.
- Legacy `/demo_/{intake,voice,documents,report,opportunities,resources,meeting,calendar,plan,hub,next}` all redirect into the correct stage with `expand=true`. ✅ OK.

### 9b. Role-preview pages — `/demo/{student,family,educator,school-admin,district-admin,partner}`

**Systemic finding — FIX (all roles):** every tile CTA points at `/demo/{stage}` legacy routes (which 302 to `/demo/workspace/$stage`). Per acceptance rule "Tiles should open in-place previews with sample data. They should not redirect." — the `DEMO_PREVIEWS` registry exists (`src/components/demo/previews/index.tsx`) with `caseload`, `documents`, `consent`, `notes`, `opportunities`, `deadlines`, `partnerforward`, `partner-profile`, `partner-submissions`, `waitlist`, `contacts`, `resource-queue`, `system-health`, `outreach`, `meeting-prep`, `saved-resources`, `readiness-gaps`, `team-activity`, `report-completion`, `trends`, `schools-list`, `school-progress`, `service-gaps`, `resource-usage`, `support-needs`, `calendar` and **is not wired up** in `role-previews.ts`. Recommendation: change each demo tile to render `<DemoInlinePreview id="…" />` instead of a `<Link to="/demo/…">`.

Concrete duplicates/misroutes observed in `role-previews.ts`:
- Student "Preview pathway" → `/demo/plan` (a 30/60/90 view), not a pathway preview. FIX.
- Student "Preview report" → `/demo/report`. OK-ish but the `DEMO_PREVIEWS` list has no `pathway-report` id; add one. BUILD.
- Educator "Preview caseload" → `/demo/hub` — a generic hub. Should use `caseload` inline preview. FIX.
- Educator "Preview inputs" → `/demo/workspace/start` (generic TW stage). FIX.
- Partner "Preview directory" → `/demo/partner` (recursive back to the role page). FIX.
- Family "Preview family view" → `/demo/hub` (generic). FIX.
- Family "Preview priorities" → `/demo/intake` (intake ≠ priorities). FIX.
- School Admin & District Admin — every tile bullet's CTA is `/demo/report` or a legacy stage. None open dedicated `PreviewTeamActivity`, `PreviewReportCompletion`, `PreviewTrends`, `PreviewSchoolProgress`, etc. that already exist. FIX.

---

## 10. Legacy `src/studio/stages.ts`

Twelve stage entries still point to legacy `/demo/{cover,intake,voice,documents,report,opportunities,resources,meeting,calendar,plan,hub,next}`. These are all redirect stubs → `/demo/workspace/$stage`. Studio tiles therefore hit a 302 rather than the current route. FIX — either update `to:` to `/demo/workspace/$stage` directly or retire `src/studio/stages.ts`.

---

## 11. Security Spot-Checks

Existing route guards (`RoleGuard` + `route-role-guard` + `ROUTE_AUDIENCES`) cover every listed dashboard destination. Verified against `src/lib/role-policy.ts`:
- Partner is NOT in `ROUTE_AUDIENCES` for `/students`, `/goals`, `/documents`, `/pathway`, `/reports`, `/action-items`, `/student-voice`, `/ppt-prep`, `/meetings`, `/insights`, `/bridgeforward*`, `/messages`, `/feed`, `/family/*`, `/educator/*`, `/school/*`, `/district/*`. ✅ Rule "partners cannot access private student tools/data" holds at the route guard layer. Data-layer RLS is separately covered by `tests/role-district-access-rls.test.mjs` and `tests/cross-district-invite-rls.test.mjs`.
- `/opportunities` intentionally includes `partner`. ✅
- `/trust` excludes `partner`. ✅
- All `/school/*` gated to `school_admin,admin` only. ✅
- All `/district/*` gated to `district_admin,admin` only. ✅
- All `/owner/*` and `/admin` gated to `admin` only via `_authenticated` layout + `RoleGuard`. ✅

No route-guard leaks detected in this audit.

---

## 12. Missing Feature Pages (spec §4 → route files)

| Spec item | Role | Route file present? | Action |
|---|---|---|---|
| Saved Resources | Student | ✅ `resources.saved.tsx` | — |
| Family Priorities | Parent | ✅ `family.priorities.tsx` | — |
| Sharing and Consent | Parent | ✅ `family.consent.tsx` | — |
| Recommended Resources (parent) | Parent | ❌ tile routes to `/resources` (missing) | BUILD `/resources` browse page or repoint tile to `/resources/saved`. |
| Assigned Student Profile shortcut | Educator | Reachable only via caseload | BUILD dashboard tile deep-link. |
| Case Notes | Educator | ✅ `educator.notes.tsx` | — |
| Implementation Tasks tile | School Admin | Route ✅, tile ❌ | Add tile. |
| Staff Access | District Admin | Route ❌ (only `district.team.tsx`) | BUILD or confirm `team` = `staff-access`. |
| Submitted Programs | Partner | ❌ dupe route | BUILD dedicated page. |
| Program Dates / Deadlines | Partner | ✅ `partners-manage_.deadlines.tsx` | — |
| Opportunity Management | Partner | Dupe of Opportunities | Split into edit view or remove duplicate tile. |
| Partner Resources | Partner | ❌ marketing page | BUILD authenticated `/partners-manage/resources`. |
| Bug Tracker | Owner | Present as "Product Issues" | REVIEW label / add tile. |

---

## 13. Recommended Fix Batches (proposed follow-up turns)

1. **Batch A — Role dashboard misroutes (low risk):**
   - Parent "Open resources" → `/resources/saved` OR build `/resources` browse.
   - Student BridgeForward tile → `/bridgeforward/intake` (or authenticated snapshot).
   - Partner: split three-way duplicate to distinct routes.
2. **Batch B — Demo role-preview tiles (medium risk):**
   - Convert every `cta.to: "/demo/…"` in `role-previews.ts` to `cta.previewId: "<DemoPreviewId>"` and render inline via `DEMO_PREVIEWS`. Add missing `pathway-report` preview to the registry.
3. **Batch C — Workspace stage mismatches (medium risk):**
   - `family` stage `signedInRoute` → `/family/priorities`.
   - `action` stage → `/action-items`.
   - `connect` stage → dedicated `/opportunities-and-resources` hub or dual CTA.
4. **Batch D — Missing feature pages (higher risk, per your answer: build functional v1 wired to real data):**
   - `/partners-manage/submissions` (queries `partner_submissions` scoped to caller).
   - `/partners-manage/resources` (queries `partnerforward_partner_saved_resources`).
   - `/district/staff-access` (queries `organization_memberships` for district scope) — only if product confirms it is distinct from `/district/team`.
   - `/resources` browse (queries `resources` + `resource_tags`, `TO anon` where appropriate).
5. **Batch E — Legacy Studio retirement:**
   - Rewrite `src/studio/stages.ts` `to:` fields to `/demo/workspace/$stage`, or delete `StudioPage`/`StudioShell` if unused.
6. **Batch F — Test additions:**
   - Extend `tests/unit/dashboard-tile-destinations.test.ts` with (a) no-duplicate-href-per-role assertion, (b) every tile's `to` must resolve to a route file, (c) role-preview tiles must reference a valid `DemoPreviewId`.
   - Extend `tests/unit/dashboard-static.test.ts` to cover TW stage routing map.
   - Add Playwright: for each role in `role-access-rules.signedin.spec.ts`, click every dashboard tile and assert 200 + `<main>` present + no `/auth` redirect.

---

## Acceptance-Criteria Traceability

| Criterion | Status after this audit |
|---|---|
| Every signed-in role dashboard tile connects to a real role-appropriate feature | ⚠ mostly — 6 concrete misroutes (Batches A, C). |
| Every TW tile connects to an actual feature page/workflow or sample preview | ⚠ demo TW ✅; role-preview demo tiles ❌ (Batch B); signed-in TW stage map ⚠ (Batch C). |
| Missing necessary feature pages are built | ❌ pending (Batch D). |
| No generic placeholder routing remains | ❌ Studio + demo role tiles still generic (Batches B, E). |
| No dead buttons remain | ✅ no dead routes found — all `to` values resolve, but some resolve to the *wrong* page. |
| Role permissions enforced | ✅ verified at route-guard layer; RLS layer covered by existing regression suites. |
| Demo uses sample data only | ✅ demo pages never call authenticated server fns. |
