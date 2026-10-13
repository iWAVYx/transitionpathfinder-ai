# Deep Tool Functionality Audit

Updated: 2026-09-26

Implementation branch: `codex/link-pathway-intake-live-student`

## Product promise

Every signed-in dashboard card must lead through the same complete loop:

1. **At-a-glance card** built from authorized live data.
2. **Preview** on the dashboard using the same live data, with sensitive record content hidden.
3. **Open Full Tool** to a real, role-authorized workflow.
4. **Save a meaningful change** through a protected server function.
5. **Refresh the Preview** and see the saved change reflected honestly.

A route existing is not enough. A page with sample rows, an inert button, or a future feature presented as
complete fails this contract. Demo routes may use clearly labeled fictional data; signed-in routes may not.

## Current plain-language status

| Area from the product notes                    | Current status                                                                            | What completion means                                                                                                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student, Family, Educator dashboards           | Live preview-first alignment implemented; Family Hub demo cleanup is on this branch       | Reconfirm the complete save-and-refresh loop in isolated staging.                                                                                                                              |
| School and District dashboards                 | Live aggregate alignment merged and accepted in isolated staging                          | Preserve school/district scoping while deeper tools are completed.                                                                                                                             |
| Partner dashboard                              | Live organization and opportunity previews implemented                                    | Verify each profile, opportunity, deadline, resource, and impact save-and-refresh loop.                                                                                                        |
| Owner Hub                                      | Preview-first private Owner Hub implemented                                               | `/owner` remains the one private owner dashboard; verify each protected operational full tool without exposing tenant records.                                                                 |
| Public promises and links                      | Route alignment implemented                                                               | Re-audit each advertised promise whenever a full tool changes; partial tools must be labeled honestly.                                                                                         |
| Pathway intake and Pathway Report              | Live-student linkage and evidence-depth package implemented on the current branch         | Review and stage-test automatic student linkage, assistive-technology/accommodation inputs, dated readiness evidence, uncertainty handling, and dashboard visibility.                          |
| IEP/PPT support                                | Existing pieces; full grounded workflow not yet accepted                                  | Upload/decode, plain-language explanation, student/family voice, educator goal/accommodation support, evidence citations, meeting preparation, and tough-conversation scripts work end to end. |
| Sensitive document upload                      | Security controls implemented; new uploads remain intentionally paused                    | Browser privacy review creates a generic redacted artifact, user confirms it, malware scanning passes, quarantine/purge rules work, and authorized roles can use the safe result.              |
| Redaction                                      | Implemented as defense in depth; staged acceptance still required before enabling uploads | Original file/name/metadata stay out of storage; only reviewed derived text proceeds; unsupported OCR/image formats fail closed.                                                               |
| All-role document access                       | Partial                                                                                   | Student/family/educator upload and review paths are real; every role sees only the actions its policy permits; partners never receive student records.                                         |
| Progress monitoring / CT SEDS support          | Not production-complete                                                                   | Goals, measurements, dates, responsible team member, evidence, charts, notes, export/print, and a clear “does not replace CT SEDS” boundary work together.                                     |
| Partner directory depth                        | Foundation exists; catalog growth is an operating workstream                              | Searchable partner pages and opportunities include after-school, enrichment, extracurricular, employment, education, agency, and independent-living supports.                                  |
| Verified partner pipeline                      | Not a code-only task                                                                      | Outreach pipeline records contact, verification, relationship status, opportunity quality, and the first 25 verified partners without overstating endorsement.                                 |
| Resource library / assistive technology        | Functional library; content-depth pass pending                                            | Every resource has a working source link, readable summary, applicability, accessibility/assistive-tech tags, and an owner review workflow.                                                    |
| Transition Channel                             | Messaging exists; conferencing remains future work                                        | Private/group threads remain protected; video calls require a separately reviewed provider, consent, retention, safety, and accessibility design.                                              |
| Licensing, codes, invitations, district access | Implemented in parts; complete scenario audit pending                                     | District access requests, district invitations/codes, family/educator waitlist eligibility, entitlement inheritance, and denial states are distinct and tested.                                |
| Pricing                                        | Business validation required                                                              | Family, educator, school, district, and partner pricing reflects the real feature set, district procurement/budgets, support costs, and competitive research.                                  |
| Branding                                       | Phase 1 implemented                                                                       | Continue enforcing the TransitionForward purple/teal/gold/charcoal system in new views without reducing contrast or accessibility.                                                             |
| Workspace Tour and sample Pathway Report       | Existing demo; product-truth pass pending                                                 | The tour shows how real intake evidence changes the real report, dashboard preview, and full tools without clutter or unsupported claims.                                                      |

## Ordered implementation packages

### Package A — tool truth and save/refresh verification (started)

- Replace the final demo-backed signed-in Family Hub with authorized live
  preview cards, protected next actions, truthful operation status, and live
  Stage Journey progress. **Implemented on this branch; staging acceptance is
  still required after review and merge.**
- Inventory every dashboard card and public promise against its signed-in full route.
- Record whether the full route reads live data, supports a meaningful write, handles loading/empty/error/permission states, and refreshes the originating preview.
- Fix one role at a time without weakening role guards, RLS, MFA, consent, redaction, malware quarantine, or exact-SHA checks.
- Treat “partial” and “coming soon” as honest product states, not defects to hide.

### Package B — Pathway intake and report depth

- Connect each new intake and report to an explicitly selected, authorized
  student; prefill a fresh draft from the live profile and clear it whenever
  the student changes. **Implemented on the current branch.**
- Add grades 6–8 plus explicit learning preferences, assistive technology,
  accommodations, readiness evidence, evidence/source dates, and information
  to verify without requiring a database migration. **Implemented on the
  current branch.**
- Map each intake question to a named Pathway Engine input and visible report section.
- Cover strengths, preferences, interests, needs, communication, transportation, assistive technology, current services, family priorities, educator observations, readiness evidence, goals, deadlines, and uncertainty.
- Show “information used,” missing/uncertain evidence, source dates, and review horizons in outputs.
- Prove that meaningfully different inputs produce meaningfully different recommendations.

### Package C — protected documents and all-role evidence workflow

- Keep new sensitive uploads paused until the complete redaction → user review → generic derived artifact → private storage → antivirus → quarantine/release chain passes in isolated staging.
- Test Student, Family, Educator, School Admin, District Admin, Owner, and Partner access separately.
- Keep School/District previews aggregate-first and keep Partner completely outside student document access.
- Add metadata privacy review and a reviewed OCR approach before supporting image-only or low-text documents.

### Package D — grounded IEP/PPT and progress monitoring

- Ground explanations and suggestions in the uploaded document, tracked evidence, current policy/law references, and standardized practice rather than generic chatbot prose.
- Provide separate family and educator perspectives, preparation checklists, questions, scripts for difficult asks, and uncertainty/citation indicators.
- Build progress measures, data-entry cadence, charts, journals, sharing/export, printing, and CT SEDS-compatible handoff boundaries.

### Package E — PartnerForward, BridgeForward, resources, and outreach

- Expand the searchable directory across after-school, enrichment, extracurricular, education, employment, agency, assistive technology, and independent-living options.
- Give every partner a real public profile plus partner-side profile/opportunity management.
- Build the 25-partner verification and relationship pipeline as an owner workflow, with no claim of endorsement before verification.
- Strengthen resource readability, working links, assistive-technology coverage, owner editing, and content-health review.

### Package F — licensing, communication, pricing, and final product truth

- Test invitation, access-code, district-request, entitlement, waitlist, and denial scenarios for every role.
- Evaluate ParentSquare-inspired communication patterns without copying proprietary design or weakening privacy.
- Design conferencing separately with consent, safeguarding, accessibility, moderation, and retention requirements.
- Validate pricing with district procurement research and actual operating costs.
- Rewalk every demo, tour, audience page, dashboard, preview, and full tool so marketing and the signed-in product describe the same real capabilities.

## Safety gates

- Production remains **NO-GO** while release blockers remain open.
- Do not enable sensitive uploads merely to make a UI test pass.
- Do not store an original sensitive source file when the product promises a derived redacted artifact.
- Do not expose student names, documents, messages, voice, goals, meetings, or Pathway Reports to Partner accounts.
- Do not present generic AI output as legal advice, a validated IEP, or a substitute for the PPT/team process.
- Do not publish fictional counts or sample rows on signed-in pages.
- Do not merge, migrate, deploy, or publish production without the separately required authorization and evidence.


### Organizational Tool Navigation and Save Completion — October 13, 2026

School and District reader routes now validate and retain their applicable `org_id`/`district_id` URL key, including their hubs and history return routes. The actual dashboard hooks load that requested selection, pin a server-resolved default by replacement (preserving other search fields/hash and without an extra history entry), and change selection with scroll reset disabled. Departing hooks cannot canonicalize a different destination. No account-independent selection storage or new role/tool access is introduced. Existing server active-membership/access rules remain authoritative. Explicit requested scopes that return a different server selection are withheld with generic retry guidance rather than silently displaying another organization's data; invalid UUIDs fail route validation.

Four School insight pages (planning status, support needs, resource usage and readiness) now send the selected URL organization to their existing server functions and use the same guarded reader. District readiness waits for its dashboard's resolved district and rejects mismatched/obsolete trend reads. Its live School Comparison no longer displays fabricated sample schools/scores; the existing live API has no school-by-school readiness values, so it shows honest unavailable-data guidance. Sample fixtures remain separate from real results. Hubs now distinguish failed loads from successfully loaded empty workspaces. Role navs no longer add an unrelated `#nav` fragment; School insight breadcrumbs return directly to the School dashboard.

School invite/approval/removal/role changes and District invite/add-school/unlink handlers retain their original submitted payloads but suppress UI/toast/reload effects after departure or organization change. Scope-keyed readers/forms reset across organizations; a completion callback only refreshes its original organization if it remains current. Submitted writes are not cancelled or retargeted; this is a reader-completion safeguard, not a new write/access policy.

Evidence: 50 added synthetic cases this pass (15 real-router dashboard selection/history cases, 13 actual insight-page cases, 21 actual save-handler cases and one dependent-reader reactivation case); the previous isolated hook/shell tests remain and now isolate navigation separately. Fresh full suite: 215 unit files / 2,079 tests; TypeScript and diff checks pass. An initial full run found an existing report-recovery fixture had mocked away the new router middleware export; its mock now preserves that real export and every original assertion remains unchanged. Four final credential-free native-browser fixture cases (375/1280 widths × School/District) use the actual getRouter, selection hooks, search options and role navs: tool selection, dashboard return, back/forward, refresh and 900/1,200px saved positions pass. All requests are intercepted; synthetic long pages and mocked readers replace authenticated pages. This is not live membership/RLS, actual page geometry, provider or save acceptance.

Next/open gates: broader organizational reporting/history data boundaries and capped/incomplete reads remain to be reviewed; School dashboard student/action reads still have 200-row limits, and School insights include 500/2,000/5,000-record bounds. History preserves the navigation key but continues its existing accessible-student history scope; no selected-organization history filtering is claimed. Recovery from an unavailable saved organization, exact returns carrying dashboard-specific filters/hash, and scroll behavior while real async page content changes height also need review/hosted acceptance. Full PR211 review, main-demo/product parity and release acceptance remain open. The full TF-01–TF-26 roadmap, all six milestones and deferred parent-pilot/snapshot notes remain in scope. No merge, deployment, migration, publishing, AI/provider call, real membership change or production action occurred.

Local runtime source fingerprint: `e3b6468f6c71c83725c7b2c0ce5a59a0c83ff035fb8d35fbe8e5be919782c12c`, 1,135 files; not deployed.


### Complete Organizational Insight Reads — October 13, 2026

The four School insight handlers and District readiness handler now use counted, unique-ID-ordered pages and deduplicated bounded ID batches through the existing caller Supabase client. Authorization memberships, eligible districts/child schools, students, readiness scores, report membership, owner names, active team members, saved resources and resource names either load completely or fail explicitly. Fixed 500/2,000/5,000-row source caps are removed from these handlers; existing role, active-membership, organization-type and RLS filters remain. Metadata query errors no longer masquerade as unnamed successful workspaces/resources. Explicit unavailable requested organizations fail before source reads instead of falling back to another organization. Unscoped legacy requests retain the authorized-default behavior.

Support Needs keeps its intentional worst-first 50-student display, but now returns the full flagged total separately and explains how many rows are shown. Older payloads without a known total use “Student(s) Shown” rather than claiming that preview length is the full flagged population. Existing report/readiness thresholds are unchanged. Resource Usage retains its top-25 presentation while total saves and ranking inputs now cover every caller-visible source row.

Evidence: 27 added synthetic query-model/UI cases cover 2,103 School planning students/report membership, 1,203 support candidates/owner names, 5,103 District students, 1,203 child schools with cross-district exclusion, 1,204 active resource members/2,503 saves, server short pages, bounded filters, preview/full-total distinction, failed authorization/metadata/source/later-batch reads, missing/changing counts and unavailable requested scopes. Current full run: 216 unit files / 2,106 tests; TypeScript and diff checks pass. Existing organization-filter assertions remain intact: automatic review rejected a proposed assertion removal, that action was not executed, and the safer edit preserved all assertions while correcting the nullable report-student type and adding UI coverage. No approval remains pending for that edit.

Counted pagination is not an atomic snapshot: same-count replacements or changes between separate filter batches are not detected. These tests model query transport and preserve caller filters; they do not prove actual hosted RLS, provider performance, privileges or production data completeness. School dashboard student/action 200-row caps and its member-owned-student fallback, other organizational dashboard/report boundaries and hosted acceptance remain open. Shared StudentActivityHistory still loads caller-visible students without an organization context, requests at most 200 recent audit entries, treats student-load failure as empty and lacks old-student/departure guards for audit loads. Address those shared-reader gaps across applicable roles next, then selected-organization history narrowing and explicit unavailable-selection recovery. No history scope or record completeness is claimed by this insight fix.

Runtime fingerprint: `78f0d2dd1cd2d8700e4800a5d5bf483c9c713d2d05f18149325e132820b466f8`, 1,136 files; not deployed. Full PR review, main-demo/product parity, the TF-01–TF-26/six-milestone roadmap and deferred parent-pilot/snapshot work remain open. No merge/deploy/migration/publication, AI/provider call, membership change or production action.


### Shared Student History Reader — October 13, 2026

StudentActivityHistory now separates roster loading from a student-keyed audit reader. Changing the selected student immediately removes the previous rows/counts and resets the category filter; old student, superseded effect and departed-reader completions cannot replace data or produce error state. The roster handles listStudents.loadFailed and rejected requests as generic retryable failures instead of falsely claiming no student exists. Audit failures have independent inline retry, clear prior entries, and never appear as a successful empty history. Successful empty results retain the caller page's existing empty-state destination. The student selector has an explicit accessible label association.

The reader explicitly describes its up-to-200 recent-record window and ties counts/filters to that window. “Recent Activity” and successful empty-window language no longer imply a complete lifetime archive. Equal audit timestamps now use descending unique ID as a deterministic tie-breaker; caller Supabase/RLS, student-ID filter, 200 maximum/default request behavior and role routes are unchanged. No full audit export, pagination, new student access or organization narrowing is implemented here. The Family demo's existing fictional activity example now explains the same signed-in recent-window contract. Its inventory snapshot changes only that purpose text; role, permission and destination fields remain unchanged.

Evidence: 18 new synthetic cases cover overlapping old-student successes/failures, immediate data/count/filter reset, roster failure flags/rejection and retry, current audit failure/retry, successful empty roster, departure, Strict Mode replay, all six existing Student/Family/Educator/School/District/Partner history route wrappers and the actual audit handler's student filter/order/window validation. Navigation chrome/select controls, role gates and transport are mocked; the actual shared reader and route wrappers execute. This is not signed-in or database permission acceptance. Current full run: 218 unit files / 2,124 tests; TypeScript and diff checks pass. The final snapshot check confirms the intentional demo text update with other inventory fields unchanged.

Open/next: selected-organization history remains caller-visible student history, not a school/district cohort filter. Roster reads still use the existing unpaged listStudents endpoint; audit entries remain a recent 200-row window. Unavailable organization recovery, history selection restoration across navigation, full reporting/dashboard completeness/member-owned fallback, native signed-in layout/async scroll and current-build RLS acceptance remain open. Preserve all TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot work. Owner remains management-only and gets no student-history route from this change.

Runtime source: `b61da847986442f5198fdfad9276242c1a999a8796ade1f32876927d7d251a38`, 1,136 files; not deployed. No merge, deployment, migration, publishing, provider/AI request, role/account change or production action.

PR211 description maintenance: condensed the accumulated near-limit description into the final implementation groups, current validation and explicit release gates. The prior full text is preserved at `/private/tmp/tf-pr211-pre-history-consolidation-body.md`; repository review/contract/audit evidence and the full roadmap remain intact. This condensation does not mark the full diff reviewed or close any outstanding gate.


### Explicit Organizational Selection Recovery — October 13, 2026

Existing School/District dashboard shells, hubs and insight error panels now offer an opt-in “Load an Available Workspace” action when their URL contains a saved selection. Retry remains a separate action. Recovery explicitly clears only the current role's org_id/district_id key, preserves other search/hash state and disables scroll reset. The existing authenticated server reader chooses its authorized default; that resolved default is canonicalized by replacement. There is no automatic switch on a failed explicit scope, client-selected substitute, new membership/access grant or account-independent cache. Failed default loads stay error states without recovery loops or old data. Departed recovery callbacks cannot navigate or start a read. Other roles without this organization selection do not receive the control.

Evidence: seven added synthetic cases (real-router School/District recovery, history/other-search/hash preservation, failed default behavior, departed callbacks and opt-in error-control behavior) retain all prior assertions. Current full suite: 218 files / 2,131 tests; TypeScript and diff checks pass. Actual School/District hooks, router middleware and shared error renderer execute with mocked transport; the route wiring is type-checked. This is not signed-in membership acceptance or real-page async height/scroll QA. Recovery addresses valid UUID selections that become unavailable; malformed-ID route-validation recovery remains a separate error-route review. Fixed fictional demo organization choices do not have live membership failures, so no artificial membership-error state is added to the demo.

History scope trace / next implementation contract:

1. School/District history routes currently pass only empty-state destinations into StudentActivityHistory. Neither the caller-visible listStudents roster nor listStudentAuditTrail's student-only query reads the org_id/district_id URL context. Preserving that query key alone does not scope the records.
2. Add a dedicated, authenticated minimal organization-history roster (IDs/names only), using the caller Supabase client, complete counted pages and existing active organizational-admin membership filters. District scope must validate a district organization and its eligible child-school cohort. Do not use a service-role client, member-owned/unassigned-student fallback or manufacture student access from organizational oversight. Retain ordinary RLS intersection.
3. Bind both the roster and subsequent scoped audit request to that resolved organization. The audit endpoint must independently verify active membership and that the requested caller-readable student belongs to the selected School/District cohort before querying audit rows. A dropdown-only/client-filter implementation would leave forged or stale scope requests unchecked. Legacy unscoped histories remain on their current permissions; Partner scope/consent must be assessed separately, and Owner gets no student-history surface.
4. Key the scoped UI lifetime by role/organization, retain explicit recovery, and test wrong/inactive membership, cross-school/district students, stale organization/student responses, limited projection and generic failures. This is server source work with existing RLS; any discovered need for grant/policy changes requires a separate concrete review and authorization. Confirm the cohort treatment of legacy/unassigned or directly district-assigned students rather than borrowing the School dashboard's broad fallback.

That contract is review/planning evidence, not an implemented or hosted history scope. Full audit/roster completeness, selected-student history navigation restoration, dashboard 200-row bounds/member-owned fallback, filtered/hash dashboard returns, main-demo parity and full PR/current-build acceptance remain open. All TF-01–TF-26/six milestones and deferred parent-pilot/snapshot work are retained. Runtime fingerprint: `d0b7a94578a294b2e1deefe0ee4d2713cf7f63e897b33d4efdc2d179f0dade8c`, 1,136 files; not deployed. No merge, deployment, migration, publishing, AI/provider call, account/role change or production action.


### Server-Enforced Organizational History — October 13, 2026

This implements the preceding history-scope contract in the draft. School/District history routes now use a dedicated authenticated roster reader and the actual URL-selection/recovery hook. Counted caller-client membership reads retain the existing active admin/owner/school_admin or admin/owner/district_admin filters. District membership must refer to a district organization; its student cohort matches existing reporting: eligible caller-visible child-organization students. Direct district-assigned, unassigned and member-owned fallback students are not silently included. School retains the existing authorized-organization definition rather than introducing a new organization-type restriction. No service-role client, access grant or policy change is added.

The roster uses complete counted pages/bounded organization-ID batches and returns only id/first_name/last_name. Scoped audit requests independently recheck active membership, District type/child cohort and the requested caller-readable student's organization before reading audit_log. Original student filter, caller RLS, deterministic timestamp/ID order and 200-record maximum remain. Legacy Student/Family/Educator/Partner unscoped requests retain existing permissions; optional scope is a narrowing context, not a replacement for RLS or a new role gate. Owner gets no student-history surface. Audit records are still a recent window, not a complete disclosure archive.

The actual scoped UI never calls the generic listStudents reader. Resolved organization keys the roster/student reader lifetime; navigation removes previous rows/filters and obsolete roster/audit completions are discarded. Failed explicit selections never fall back automatically. Retry and explicit available-workspace recovery remain separate; canonical defaults preserve unrelated URL search/hash state. Successful empty rosters remain distinguishable from failures.

Evidence: 22 added synthetic cases (16 handler/query-model cases and six actual-router scoped-reader cases), alongside the retained 18 shared history cases and six-role wrapper assertions. New coverage includes large 2,103-student/1,203-child populations, exact minimal projection, wrong/inactive/unavailable membership, district type, cross-scope/unassigned/missing caller-visible students, count/page failures, UUID validation, scoped audit transport, default canonicalization, organization switching/late failures and explicit recovery. Full suite: 219 files / 2,153 tests; TypeScript and diff checks pass. Transport/auth middleware are mocked; these tests do not establish actual hosted RLS or membership acceptance. Counted paging and separate scope/audit queries are not a transactional snapshot; concurrent changes still depend on database RLS. Main-demo parity, legacy generic-roster bounds, full-history pagination/export, student-selection restoration, real async height/scroll and the full grouped PR review remain open.

Runtime fingerprint: `0763068e89c68b097101af54c577780387a5539feaf89ca5688b74f182fd4b1f`, schema transitionforward-runtime-source-v1, SHA256, 1,140 files; not deployed. All TF-01–TF-26/six milestones and deferred parent-pilot/snapshot notes remain retained. No merge, deploy, migration, publication, AI/provider call, account/membership change or production action.


### Complete History Rosters and Saved Student Selection — October 13, 2026

All existing history pages now use complete minimal rosters. Student/Family/Educator/Partner call a dedicated authenticated listHistoryStudents reader: caller Supabase/RLS, exact counted pages, created_at descending with unique ID descending tie-breaker, and only id/first_name/last_name returned. Failed/missing/changed counts never become successful partial or empty lists. Generic listStudents and its other consumers are unchanged. School/District retain their dedicated server-enforced organizational roster and independently scoped audit checks. This adds no Student/Partner consent entitlement, role expansion or Owner history surface.

The six actual history routes validate optional UUID student_id. The routed reader uses the URL to select only a student in the successfully loaded caller-visible roster. Explicit selections missing from that roster show a generic unavailable notice, start no audit request and offer explicit “Choose an Available Student” recovery. Clearing only student_id allows the first available student; unrelated search/hash and School/District scope remain intact. Student changes create browser entries with scroll reset disabled; initial saved URLs, refresh through a fresh route load and back/forward restore the selected student. Departed route readers stop observing a later page's selection and old completions cannot populate that page. This does not add persistent account-independent storage, automatic fallback or carry a history selection into unrelated tools.

Family metadata/body now describe recorded recent activity, removing the misleading “every time” and “full record” claim. The actual reader and existing fictional Family demo retain the up-to-200 recent-window contract. Full audit pagination/export and completeness of the underlying recording system remain open; no lifetime/compliance archive is claimed. Demo examples do not issue authenticated roster calls or simulate access grants.

Evidence: 29 added synthetic cases: five complete/minimal roster and failure cases plus four route cases for each of six roles (saved student/back/forward, unavailable selection/explicit recovery, malformed UUID validation, departure). Retained all previous six-role wrapper/history/scope assertions. Full offline suite: 219 files / 2,182 tests; TypeScript and diff checks pass. Actual route options/shared reader/router run with mocked auth/transport and a synthetic management destination. This is not hosted RLS, live consent acceptance or native real-page async-height/scroll verification. Counted paging remains non-transactional. Malformed-ID error-route recovery, full grouped draft review, main-demo/product parity, dashboard bounds/legacy fallbacks and exact-build staging acceptance remain open.

Runtime fingerprint: `cf5309758061d08be12cc024b162eedcd74c2417ea228fd00b785bcbf51b0203`, schema transitionforward-runtime-source-v1, SHA256, 1,141 files; not deployed. Full TF-01–TF-26/six-milestone roadmap and deferred parent-pilot/Pathway Report snapshot notes remain retained. No merge, deploy, migrate, publish, live AI/provider call, account/role change or production action.
