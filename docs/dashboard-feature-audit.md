# Dashboard, Preview, and Full-Tool Parity Audit

Updated: 2026-09-26

Baseline: `aedbdf6d8161955fcffabd4c3c0df8fbad1102f0`

Implementation branch: `codex/align-family-hub-live-data`

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

The Owner Admin exception is structural, not a lower standard: `/owner` is the
Owner Hub **and the owner dashboard**. It is a private operating console for the
founder and, later, specifically authorized TransitionForward IT/company staff.
Do not add a separate owner dashboard route or a redundant Dashboard navigation
item. Preview-first improvements belong inside the Owner Hub itself.

## Executive result

- The demo interaction pattern is already strong for Student, Family,
  Educator, School Admin, District Admin, and Partner: cards have separate
  Preview and full-tool actions.
- The 20 signed-in pages listed as missing in the prior version of this audit
  now exist. Most are connected to server functions and authorized data.
- The primary Family, Student, and Educator workspaces now implement the
  intended pattern: demo-shaped layout, authorized data, a privacy-conscious
  Preview action, and a separate full-tool action.
- The last signed-in Hub using a demo-backed overview and next actions was
  `/hubs/family`. This branch replaces both with the authorized student
  snapshot, real next actions, honest loading/empty/error states, and a live
  Stage Journey. Explicit `/demo/*` routes keep their labeled sample data.
- Student sample next actions and sample Pathway content have been removed from
  the signed-in dashboard. The Student dashboard and Student Hub now use the
  authorized dashboard snapshot and honest empty states.
- The Educator dashboard and Caseload Hub now use authorized caseload totals.
  Their at-a-glance previews remain aggregate-first and hide student PII.
- The Owner Hub now follows the same card → Preview → full-tool interaction
  contract without creating a separate owner dashboard.

## Role-by-role status

| Role                    | Public demo            | Primary real workspace                                                         | Card data                       | Preview data                    | Full tools                                                     | Current status                                         |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------ | ------------------------------- | ------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| Student                 | `/demo/student`        | `/dashboard`, `/hubs/student`                                                  | Live                            | Live snapshot                   | Routes exist; many are live                                    | **Preview-first dashboard aligned**                    |
| Parent / Guardian       | `/demo/family`         | `/dashboard`, `/hubs/family`                                                   | Live                            | Live snapshot                   | Routes exist and are substantially live                        | **Family Hub alignment implemented on current branch** |
| Educator / Case Manager | `/demo/educator`       | `/caseload`, `/hubs/caseload`                                                  | Live caseload aggregates        | Live, aggregate-first           | Routes exist and are substantially live                        | **Preview-first dashboard aligned**                    |
| School Admin            | `/demo/school-admin`   | `/school/overview`, `/hubs/school`                                             | Live selected-school aggregates | Live selected-school aggregates | Routes exist and use school data functions                     | **Preview-first dashboard aligned**                    |
| District Admin          | `/demo/district-admin` | `/district/overview`, `/hubs/district`                                         | Live district aggregates        | Live, aggregate-first           | Routes exist and use district data functions                   | **Preview-first dashboard aligned**                    |
| Partner                 | `/demo/partner`        | `/partners-manage`, `/hubs/partner`                                            | Live organization/catalog data  | Live, partner-scoped            | Profile, opportunities, deadlines, resources, and impact exist | **Preview-first dashboard aligned**                    |
| Owner Admin             | `/demo/owner`          | `/owner` (the Owner Hub is the dashboard); `/hubs/admin` redirects to `/owner` | Live aggregate operations       | Live aggregate operations       | Broad operational route set exists                             | **Preview-first Owner Hub aligned**                    |

## Signed-in demo-data findings

### P0 demo-data cleanup result

- `ParentOverviewGrid` remains available to the explicit demo surface, but the
  authenticated Family Hub no longer renders it or calls `useDemoStudent`.
- `PartnerOverviewGrid` now isolates demo role-context hooks to the explicit
  sample branch; the signed-in branch uses `getPartnerWorkspace` data.
- Explicit demo drawers retain `src/lib/demo/**/feature-details`; signed-in
  School, District, and Partner drawers receive live detail overrides.
- `/hubs/family` now loads the first role-authorized student, renders the same
  preview-first layout from `DashboardSnapshot`, uses protected live next
  actions, and derives operation and journey status without exposing private
  document names or contents.
- The signed-in Student dashboard no longer renders `DEMO_NEXT_ACTIONS` or the
  sample Pathway component. Those fixtures remain confined to explicit demo
  routes.

The remaining work is deeper tool acceptance: each dashboard action must open
a usable role-authorized workflow, save a meaningful change, and reflect that
change after the preview refreshes. Demo paths must continue to keep their
fictional fixtures and explicit sample labeling.

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

- [x] Replace Student demo next actions and sample Pathway state with live
      values or truthful empty states.
- [x] Build Student live previews from the authorized dashboard snapshot.
- [x] Adapt `getCaseload` into Educator cards and aggregate-first drawers.
- [x] Keep educator dashboard previews free of student names, documents,
      message text, and other student PII.
- [ ] Complete isolated-staging role, accessibility, and privacy acceptance for
      the merged implementation SHA.

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
- [x] Student signed-in dashboard contains no demo fixture data.
- [x] Educator signed-in dashboard and previews use permitted caseload data.
- [x] School Admin signed-in dashboard and previews use selected-school data.
- [x] District Admin previews remain aggregate-first and PII-free.
- [x] Partner previews use the partner's real managed organization data.
- [x] Owner Hub supports Preview and full-tool navigation consistently without
      introducing a separate owner dashboard.
- [x] Every signed-in `/hubs/*` route contains no `useDemo*` or `DEMO_*` data.
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
