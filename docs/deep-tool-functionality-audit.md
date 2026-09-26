# Deep Tool Functionality Audit

Updated: 2026-09-26

Implementation branch: `codex/align-family-hub-live-data`

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
| Pathway intake and Pathway Report              | Existing real workflow; depth audit required                                              | Intake captures enough student, family, educator, document, service, readiness, and preference evidence to produce transparent, individualized output.                                         |
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
