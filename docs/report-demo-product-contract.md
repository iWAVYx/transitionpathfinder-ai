# Pathway Report Demo and Product Contract Review

Reviewed October 10, 2026 against draft PR #211, starting at 64e15f0a. This is a source/fixture review, not staging or production acceptance. Full reconciliation remains open.

The age-aware demo must demonstrate the product clearly while retaining fictional profile context. Sharing presentation never means inventing live document analysis, assessment scores, verified partner availability, permissions or saved records. Differences in source data below are required to remain honest; differences in equivalent presentation still require reconciliation.

| Area | Main age-aware demo | Saved product / permitted shared reader | Current status and remaining work |
| --- | --- | --- | --- |
| Document frame | Shared branded presentation, contents, section styling, PDF control and top-right watermark. | Same shared frame and native print mode. School/District exports use their own metric tables and branding. | Shared primitives and newer chapter hierarchy verified locally: one accessible screen title, h2 chapters and nested IEP h3 details. Exact-release signed-in acceptance remains open. |
| Overview | Fictional focus, first age-filtered direction and fit; selected role actions or explicitly shared fallback. | Recorded summary/best-fit explanation and selected role's recorded timeframe. | Shared ReportOverview; brief preview does not replace complete details. |
| Voice | Every recorded sample prompt/answer in the selected profile. | Report voice plus saved linked-student answers only in Student view. | Shared quote presentation; saved answers are not fabricated in demos or fetched by shared links. |
| Strengths and context | Complete sample learning, environment, transport and family fields. | Recorded legacy strengths/context or newer SPIN fields. | Source models differ; preserve all supplied fields and reconcile equivalent section presentation. |
| Goals | Recorded area/title/status/horizon, with age-appropriate labels. | Recorded legacy goal wording/current status/direction/rationale/steps/supporters/evidence; newer IEP transition goals when supplied. | Shared headings/details; do not invent missing demo baselines, measures, supporters or IEP approvals. Field mapping is recorded below; equivalent presentation reconciliation remains open. |
| Readiness | Qualitative overall/area bands and notes; explicitly not scored evidence. | Recorded qualitative legacy/newer levels and explanations. | Shared labelled badges; no synthetic percentage scores. Evidence-linked live acceptance remains open. |
| Evidence and gaps | Verbatim fictional source/date/summary; unknown questions and missing-evidence collection guidance. | Recorded source metadata or permitted counts, planning gaps/helpers/questions/owners. | Shared source/gap primitives; exact empty versus absent semantics retained. Uploaded document decoding is not demonstrated by a fictional title. |
| Pathways | Complete age-filtered choices, Ahead/Beside/Behind guidance, alternatives and cautions. | Recorded recommendation fields, action horizons and permitted provenance. | Source mapping is recorded below; equivalent renderer reconciliation remains open. Never drop alternatives/cautions to force equality. |
| Actions | Complete source-owned steps, original month/semester/year timing and review months. | Recorded week/action pairs or newer role/shared 30/90-day, six-month/year horizons. | Preserve each source's horizons; no invented twelve-week or fixed-day fallback. Newer reports cannot substitute legacy Teacher Next Steps, including when the newer Educator plan is absent. Genuine legacy reports retain their recorded fallback. Shared viewers cannot mutate records. |
| Opportunities | Complete eligible fictional matches, fit/caution details and provider-check notice. | Returned resource/partner matches and permitted source metadata; linked live suggestions only in authorized product contexts. | Age safeguards and complete exports verified; directory/provider availability and generation acceptance remain separate. |
| IEP, confidence and change history | No decoded IEP, scored assessment, historical comparison or generation confidence supplied by these profiles. | Show only supplied validated IEP summary, confidence explanation, needs-review and change fields. | Main demo coverage remains open: any demonstration must use explicitly fictional source-backed fixtures and the actual renderer. Absence must not be filled by inferred facts. |
| Controls | Print/PDF and sample navigation; no save, generation or record mutation. | Editable authorized readers may save/refresh/connect actions; fixed shared readers retain reading and print controls only. | Read-only guard finding fixed this review; server authorization and live grant acceptance remain separate. |

## Recorded Field Mappings — October 11, 2026

This mapping follows the current source types and renderer branches; it is not evidence of live generation quality or a claim that all demo routes use the product renderer.

| Source | Fields and destination | Preservation and visibility |
| --- | --- | --- |
| Main demo goals | `area` → shared goal heading; `title` → complete recorded goal; `status` → Where Things Stand; `horizon` → Planning Timeframe. | Education/living/advocacy labels remain source-appropriate; employment is Career Exploration before grade 11 and Work Preparation afterward. Do not infer measurable wording, baselines, evidence or services. |
| Legacy product goals | `area` → heading; `current_status`, `suggested_direction`, `why_it_matters`, `measurable_goal_language` → recorded details; `next_steps`, `who_supports`, `evidence_needed` → complete follow-up lists. | Shared heading/detail primitives support distinct source fields. A draft goal is not an agreed IEP goal. |
| Main demo pathways | `title`, `category`, `fitSummary`, `ahead`, `beside`, `behind` → every selected option card; alternatives retain `title` and `whenToConsider`; conflicts retain `summary` and `resolutionOwner`. | Selection requires matching grade band, an emphasized theme and no disallowed theme. IDs, age bands and theme tags control selection rather than adding report claims. Alternatives and cautions are not dropped to imitate product fields. |
| Legacy product pathways | `type`, `title`, `why_it_fits`; all recorded strengths, barriers, supports, school/community experiences, courses/programs, clusters, credentials and partner resources; all four `action_steps` horizons. | Complete recorded arrays remain under their own labels, with existing confidence/readiness when supplied. Demo Ahead/Beside/Behind is not silently treated as these richer fields. |
| Newer product recommendations | Education/training, employment, independent living and community arrays each use RecommendationCard: `title`, `summary`, `why`, `next_action`, `owner_role`, optional `timeframe` and meeting-discussion flag. | Meeting-discussion cards sort first without removing records. Details can collapse on screen but are complete in print. Student omits source labels; Family shows permitted counts; Educator shows permitted metadata. Shared projections remove internal source IDs and related-goal IDs. Titles now use h3 beneath their h2 chapters, matching the demo option hierarchy. |
| Optional newer IEP | Supplied plan dates, caveats, present levels, transition goal area/text, related services, accommodations and services → IEP summary. | Plain-language goal explanations appear for Student/Family; Educator retains the recorded goal and related services. Main age-aware profiles have none of these fields; do not fabricate document decoding. |
| Optional newer confidence/review/history | Recorded confidence level, rationale and caveats; review section/reason/owner; snapshot last-updated and `change_summary` → their existing report sections. | Absent fields do not create sections. A supplied confidence level without explanation gets an honest missing-explanation notice. A change summary is a recorded summary, not a reconstructed full history. Main age-aware demo coverage remains open. |

## Role Applicability

- Student, Family/Guardian and Educator: review shared planning document presentation with source-appropriate fields and existing role visibility. Sample role changes adapt framing and action priority, never student identity.
- Family/Educator shared links: fixed owner-designated audience, validated projection and no mutation/generation controls. These are not unrestricted planning accounts.
- School/District: retain authorized organization/period metrics and complete PDF/CSV exports; do not substitute a student report or claim all students have reports from report counts.
- Partner: no new access to student reports is created by this work. Existing directory/profile/opportunity workflows remain separate.
- Owner: management only; this review does not create a planning dashboard or student-report entitlement.

## Other Demo Routes

BuilderSampleReport uses the actual ReportView with a prepared fictional Maya baseline and explicitly says edits are not reflected. DemoMeetingGuide uses the actual PPT document renderer. Neither establishes that every main age-aware section already uses the saved-report renderer.

## Review Evidence and Remaining Gates

The reviewed risk areas include token resolution/projection, fixed audience, stale report/voice/assist context, text-only translation reconstruction, organization membership checks, complete query pagination, export selection/period guards, CSV quoting and card/category destinations. Newer question exports repeat section context with compact print spacing and complete role-permitted content. The source review found inconsistent read-only mutation controls; the regression supplies callbacks and a linked student, and checks both shared audiences plus editable Student/Family/Educator readers.

Database grant migration 20261006180000_server_only_report_share_rpcs.sql is prepared but unapplied. Server caller release must precede a separately authorized staging grant change and direct-RPC-denial acceptance. Query pagination detects changed counts but does not prove an atomic snapshot during concurrent edits. Translation structure/completeness tests do not prove multilingual semantic quality.

Remaining work: reconcile equivalent presentation using the recorded goal/recommendation/optional-field mappings, including honest main-demo coverage; review the remaining presentation/route changes in the full draft diff; assess sparse-page grouping; then obtain specific staging release authorization and verify the exact build with signed-in roles. Production remains a separate readiness and authorization decision.
