# Dashboard, Preview, and Full-Tool Parity Audit

Updated: 2026-09-24

Baseline: `d293ce2fc02e67765891c4a2e371e00a96fbbbd8`

Audit branch: `codex/audit-all-role-dashboard-tool-parity`

## Product contract

Every role must receive the same three-layer experience demonstrated by the
public role previews:

1. **Dashboard card** — a short, useful at-a-glance status.
2. **Preview** — opens on the current page and uses authorized, signed-in data.
3. **Open full tool** — opens the complete workflow with the same visual and
   interaction structure, plus the deeper controls needed for real work.

The public `/demo/*` routes may use clearly labeled fictional sample data. A
signed-in route must never silently reuse those fixtures. If real data does not
exist, it must show a truthful empty state and explain how to add it.

## Executive result

- The demo interaction pattern is already strong for Student, Family,
  Educator, School Admin, District Admin, and Partner: cards have separate
  Preview and full-tool actions.
- The 20 signed-in pages listed as missing in the prior version of this audit
  now exist. Most are connected to server functions and authorized data.
- The primary family `/dashboard` is now the first complete implementation of
  the intended pattern: demo-shaped layout, authorized snapshot data, a
  privacy-conscious Preview action, and a separate full-tool action.
- The largest remaining issue is not missing routes. It is that the signed-in
  `/hubs/*` overview grids still import demo hooks and demo feature details.
  Five hubs also render demo next actions. Those surfaces look complete, but
  their numbers are not yet trustworthy as signed-in data.
- The Student primary dashboard is mostly live but still renders demo next
  actions and marks one Pathway section as sample.
- The Owner tools are the most operationally complete, but the Owner overview
  does not yet follow the same card → Preview → full-tool interaction contract.

## Role-by-role status

| Role | Public demo | Primary real workspace | Card data | Preview data | Full tools | Current status |
| --- | --- | --- | --- | --- | --- | --- |
| Student | `/demo/student` | `/dashboard`, `/hubs/student` | Mixed | Demo-backed in hub | Routes exist; many are live | **Needs live-data alignment** |
| Parent / Guardian | `/demo/family` | `/dashboard`, `/hubs/family` | Live on `/dashboard`; demo-backed in hub | Live on `/dashboard`; demo-backed in hub | Routes exist and are substantially live | **Primary dashboard aligned; duplicate hub remains** |
| Educator / Case Manager | `/demo/educator` | `/caseload`, `/hubs/caseload` | Live in caseload; demo-backed in hub | Demo-backed in hub | Routes exist and are substantially live | **Needs live caseload adapter** |
| School Admin | `/demo/school-admin` | `/school/overview`, `/hubs/school` | Live in school pages; demo-backed in hub | Demo-backed in hub | Routes exist and use school data functions | **Needs live school adapter** |
| District Admin | `/demo/district-admin` | `/district/overview`, `/hubs/district` | Live in district pages; demo-backed in hub | Demo-backed in hub | Routes exist and use district data functions | **Needs live district adapter** |
| Partner | `/demo/partner` | `/partners-manage`, `/hubs/partner` | Live in partner workspace; demo-backed in hub | Demo-backed in hub | Profile, opportunities, deadlines, resources, and impact exist | **Needs live partner adapter** |
| Owner Admin | `/demo/owner` | `/owner`, `/hubs/admin` | Live in Owner Hub; mixed in platform hub | No consistent inline preview | Broad operational route set exists | **Needs overview interaction parity** |

## Signed-in demo-data findings

### P0 — replace before calling all-role dashboards production-complete

- `StudentOverviewGrid`, `ParentOverviewGrid`, and `EducatorOverviewGrid` call
  `useDemoStudent` even when rendered from an authenticated hub.
- `SchoolAdminOverviewGrid`, `DistrictAdminOverviewGrid`, and
  `PartnerOverviewGrid` call demo role-context hooks even when `isSample` is
  false.
- Their corresponding feature drawers read from `src/lib/demo/**/feature-details`.
- `/hubs/family`, `/hubs/school`, `/hubs/district`, `/hubs/partner`, and
  `/hubs/admin` render `DEMO_NEXT_ACTIONS`; signed-in activity therefore can
  look real while being fictional.
- `StudentDashboard` renders `DEMO_NEXT_ACTIONS.student` and passes `isSample`
  to its Pathway section despite otherwise receiving a live
  `DashboardSnapshot`.

The correct fix is to preserve the card and drawer presentation while
replacing their data inputs with role-specific live adapters. The demo paths
must keep their fictional fixtures and explicit sample labeling.

## Full-tool route status

The routes previously identified as missing are now present:

- Student: `/action-items`, `/pathway/student`.
- Family: `/family/priorities`, `/family/action-items`, `/family/consent`,
  `/family/invites`, `/family/resources/recommended`, `/pathway/family`.
- Educator: `/educator/readiness-gaps`, `/educator/pending-input`,
  `/educator/notes`, `/educator/action-items`, `/educator/document-review`.
- School Admin: `/school/planning-status`, `/school/readiness-trends`,
  `/school/resource-usage`, `/school/support-needs`, `/school/calendar`.
- District Admin: `/district/progress`, `/district/readiness-trends`,
  `/district/implementation`, `/district/service-gaps`.
- Partner: `/partners-manage/profile`, `/partners-manage/opportunities`,
  `/partners-manage/deadlines`, `/partners-manage/resources`,
  `/partners-manage/impact`.
- Owner: dedicated `/owner/*` routes cover health, testing, users, roles,
  content, partner operations, outreach, pilots, analytics, issues, feedback,
  launch, and other operational work.

Presence is no longer the acceptance test. Each route must now be evaluated
for real data, role enforcement, meaningful empty/loading/error states,
complete interactions, and visual parity with its demo preview.

## Implementation sequence

### Package 1 — shared live-preview contract and Family proof

- Add the shared optional Preview action to `ToolPreviewCard`.
- Add a reusable signed-in preview drawer that displays only authorized,
  non-sensitive summary values.
- Connect all Family dashboard cards to live snapshot previews and retain the
  separate full-tool destination.
- Pin privacy boundaries for documents, messages, partners, invitations, and
  consent.

### Package 2 — Student and Educator

- Replace Student demo next actions and sample Pathway state with live values.
- Build Student live previews from the authorized dashboard snapshot.
- Adapt `getCaseload` and educator action/note/readiness functions into the
  Educator cards and drawers.
- Verify that selecting one student cannot expose another student's private
  data outside the educator's permitted caseload.

### Package 3 — School and District Admin

- Feed the existing school and district dashboard functions into the demo-
  shaped cards and preview drawers.
- Keep school data scoped to the selected school.
- Keep district previews aggregate-first and free of student PII.
- Replace fictional next actions with authorized operational states or
  truthful empty states.

### Package 4 — Partner and Owner

- Feed Partner cards and previews from `getPartnerWorkspace`, opportunity,
  deadline, resource, and impact functions.
- Keep Partner previews free of student documents and direct student PII.
- Give Owner operational surfaces the same Preview and Open Full Tool pattern,
  using health/queue counts rather than tenant-sensitive record content.
- Remove remaining demo next actions from the signed-in platform hub.

### Package 5 — deep-tool parity and staged acceptance

- Compare every preview CTA with its full route and verify that the promised
  action is actually usable.
- Confirm all-role document upload, local redaction/privacy review, malware
  quarantine, and role access.
- Test dashboard → Preview → full tool → saved change → refreshed Preview for
  every role in isolated staging.
- Add screenshots and acceptance evidence only after exact-SHA staging checks
  pass.

## Acceptance checklist

- [x] Demo cards provide separate Preview and full-tool actions for six roles.
- [x] Previously missing full-tool routes exist.
- [x] Primary Family dashboard uses authorized live snapshot data.
- [x] Primary Family cards support real-data Preview without navigation.
- [x] Family previews hide document and message contents.
- [ ] Student signed-in dashboard contains no demo fixture data.
- [ ] Educator signed-in dashboard and previews use permitted caseload data.
- [ ] School Admin signed-in dashboard and previews use selected-school data.
- [ ] District Admin previews remain aggregate-first and PII-free.
- [ ] Partner previews use the partner's real managed organization data.
- [ ] Owner overview supports Preview and full-tool navigation consistently.
- [ ] Every signed-in `/hubs/*` route contains no `useDemo*` or `DEMO_*` data.
- [ ] Every advertised card reaches a usable full tool with honest states.
- [ ] All seven roles pass dashboard, preview, navigation, role-guard,
  accessibility, and privacy tests in isolated staging.

## Safety boundaries

- Do not copy demo fixtures into signed-in adapters.
- Do not expose document text, IEP content, messages, invite addresses, or
  student PII merely to make a preview feel populated.
- Do not broaden RLS, role guards, consent, MFA, or redaction rules for UI
  parity.
- Do not present future or partial functionality as complete.
- Do not alter production while building or validating these packages.
