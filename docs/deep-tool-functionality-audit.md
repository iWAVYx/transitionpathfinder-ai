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
