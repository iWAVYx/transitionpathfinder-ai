# Pathway Report Demo and Product Contract Review

Reviewed October 10, 2026 against draft PR #211, starting at 64e15f0a. This is a source/fixture review, not staging or production acceptance. Full reconciliation remains open.

The age-aware demo must demonstrate the product clearly while retaining fictional profile context. Sharing presentation never means inventing live document analysis, assessment scores, verified partner availability, permissions or saved records. Differences in source data below are required to remain honest; differences in equivalent presentation still require reconciliation.

| Area | Main age-aware demo | Saved product / permitted shared reader | Current status and remaining work |
| --- | --- | --- | --- |
| Document frame | Shared branded presentation, contents, section styling, PDF control and top-right watermark. | Same shared frame and native print mode. School/District exports use their own metric tables and branding. | Shared primitives and newer chapter hierarchy verified locally: one accessible screen title, h2 chapters and nested IEP h3 details. Exact-release signed-in acceptance remains open. |
| Overview | Fictional focus, first age-filtered direction and fit; selected role actions or explicitly shared fallback. | Recorded summary/best-fit explanation and selected role's recorded timeframe. | Shared ReportOverview; brief preview does not replace complete details. |
| Voice | Every recorded sample prompt/answer in the selected profile. | Report voice plus saved linked-student answers only in Student view. | Shared quote presentation; saved answers are not fabricated in demos or fetched by shared links. |
| Strengths and context | Complete sample learning, environment, transport and family fields. | Recorded legacy strengths/context or newer SPIN fields. | Source models differ; preserve all supplied fields and reconcile equivalent section presentation. Demo, legacy and newer profile print continuations retain section context and repeating category labels. Longer unequal-category layout and family/voice stress cases are now verified locally; exact-release signed-in acceptance remains open. |
| Goals | Recorded area/title/status/horizon, with age-appropriate labels. | Recorded legacy goal wording/current status/direction/rationale/steps/supporters/evidence; newer IEP transition goals when supplied. | Shared headings/details; do not invent missing demo baselines, measures, supporters or IEP approvals. Field mapping is recorded below; equivalent presentation reconciliation remains open. |
| Readiness | Qualitative overall/area bands and notes; explicitly not scored evidence. | Recorded qualitative legacy/newer levels and explanations. | Shared labelled badges; no synthetic percentage scores. Evidence-linked live acceptance remains open. |
| Evidence and gaps | Verbatim fictional source/date/summary; unknown questions and missing-evidence collection guidance. | Recorded source metadata or permitted counts, planning gaps/helpers/questions/owners. | Shared source/gap primitives; exact empty versus absent semantics retained. Uploaded document decoding is not demonstrated by a fictional title. |
| Pathways | Complete age-filtered choices, Ahead/Beside/Behind guidance, alternatives and cautions. | Recorded recommendation fields, action horizons and permitted provenance. | Source mapping is recorded below. Demo options and actual newer recommendations share role-aware Show/Hide Details controls with complete print content; equivalent renderer reconciliation beyond these controls remains open. Never drop alternatives/cautions to force equality. Cross-age/role browser checks now require complete recorded goals, status/timeframe values, option fit and Ahead/Beside/Behind details, alternatives and conflicts on screen and in print. Empty options retain the chapter heading; no-conflict notices explicitly describe the fictional sample, not a live evidence assessment. |
| Actions | Complete source-owned steps, original month/semester/year timing and review months. | Recorded week/action pairs or newer role/shared 30/90-day, six-month/year horizons. | Preserve each source's horizons; no invented twelve-week or fixed-day fallback. Newer reports cannot substitute legacy Teacher Next Steps, including when the newer Educator plan is absent. Genuine legacy reports retain their recorded fallback. Shared viewers cannot mutate records. |
| Opportunities | Complete eligible fictional matches, fit/caution details and provider-check notice. | Returned resource/partner matches and permitted source metadata; linked live suggestions only in authorized product contexts. | Age safeguards and complete exports verified; directory/provider availability and generation acceptance remain separate. |
| IEP, confidence and change history | No decoded IEP, scored assessment, historical comparison or generation confidence supplied by these profiles. | Show only supplied validated IEP summary, confidence explanation, needs-review and change fields. | Age-aware profiles intentionally have no such fields. A linked, schema-validated fictional optional-section excerpt now uses the actual product components. It does not demonstrate upload/extraction or full-report parity; absence in existing profiles is not filled by inferred facts. |
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
| Optional newer confidence/review/history | Recorded confidence level, rationale and caveats; review section/reason/owner; snapshot last-updated and `change_summary` → their existing report sections. | Absent fields do not create sections. A supplied confidence level without explanation gets an honest missing-explanation notice. A change summary is a recorded summary, not a reconstructed full history. A linked optional-section example now demonstrates confidence/review and a static update summary with explicit fictional source. Full history and main full-report parity remain open. |

## Supporting Notes Print Review — October 11, 2026

The main age-aware report retains its full-width recorded review timing, followed by equal-width conflict/sample notices and age-safeguard panels. The print rule removes inherited unequal card margins while preserving screen stacking, source order, every recorded word and current font sizes. It is scoped to the age-aware source model; product closing packages retain their own recorded fields and layout. Nine local exports still require Sam 12 / Riley 11 / Jordan 13 pages because the complete notes do not fit after the preceding content. This improves panel alignment, not page count. Demo Strengths and Supports / Family Context and newer product strengths sections now use repeated print openers. Native tests verify actual demo continuations and a longer validated newer profile across all five permitted product/shared readers. Legacy Block-based continuations now retain one accessible screen heading and one repeating print chapter heading. Category labels repeat in demo/legacy/newer lists. Unequal long categories now use full print rows while balanced neighbors remain paired. Longer family and voice fixtures retain complete records and repeated context. These are local presentation checks; live acceptance and full contract reconciliation remain open.

## Role Applicability

- Student, Family/Guardian and Educator: review shared planning document presentation with source-appropriate fields and existing role visibility. Sample role changes adapt framing and action priority, never student identity.
- Family/Educator shared links: fixed owner-designated audience, validated projection and no mutation/generation controls. These are not unrestricted planning accounts.
- School/District: retain authorized organization/period metrics and complete PDF/CSV exports; do not substitute a student report or claim all students have reports from report counts.
- Partner: no new access to student reports is created by this work. Existing directory/profile/opportunity workflows remain separate.
- Owner: management only; this review does not create a planning dashboard or student-report entitlement.

## Other Demo Routes

BuilderSampleReport uses the actual ReportView with a prepared fictional Maya baseline and explicitly says edits are not reflected. Its notice is a subordinate heading; report-view changes preserve URL perspective and return to the last eligible Family/Educator builder role. Student report view does not become a builder submitter. DemoMeetingGuide uses the actual PPT document renderer. Neither establishes that every main age-aware section already uses the saved-report renderer.

## Review Evidence and Remaining Gates

The reviewed risk areas include token resolution/projection, fixed audience, stale report/voice/assist context, text-only translation reconstruction, organization membership checks, complete query pagination, export selection/period guards, CSV quoting and card/category destinations. Newer question exports repeat section context with compact print spacing and complete role-permitted content. The source review found inconsistent read-only mutation controls; the regression supplies callbacks and a linked student, and checks both shared audiences plus editable Student/Family/Educator readers.

Database grant migration 20261006180000_server_only_report_share_rpcs.sql is prepared but unapplied. Server caller release must precede a separately authorized staging grant change and direct-RPC-denial acceptance. Query pagination detects changed counts but does not prove an atomic snapshot during concurrent edits. Translation structure/completeness tests do not prove multilingual semantic quality.

Remaining work: reconcile equivalent presentation using the recorded goal/recommendation/optional-field mappings, including honest main-demo coverage; review the remaining presentation/route changes in the full draft diff; continue sparse-page assessment after the locally verified Supporting Notes column alignment; then obtain specific staging release authorization and verify the exact build with signed-in roles. Production remains a separate readiness and authorization decision.


## Long Category and Voice Stress Review — October 11, 2026

Shared category width hints use supplied text lengths without changing source order or recorded content. Short neighbors and comparable long neighbors remain paired; unmatched categories span the print row. Demo Student Voice and both applicable product voice chapters repeat their real heading and purpose. Student-only saved-answer visibility remains unchanged.

All 36 offline browser cases and 22 native PDF fixtures pass their named checks. Complete long family notes, recorded prompts/reflections and profile arrays remain present, with continuation context and readable unchanged font sizes. Preloaded fictional saved answers are rendered only for Student, not Family/Educator or either fixed shared reader. This does not exercise live saved-answer fetching, database permissions, uploaded document decoding or AI generation. The native visual review covered 132 changed/relevant pages in 58 distinct groups; 84 unchanged baseline demo pages match pixel-for-pixel. Full draft review, equivalent demo/product reconciliation and exact-release signed-in staging acceptance remain open.


## Draft Review Checklist — October 11, 2026

- [x] Source mapping for goals, recommendations, optional IEP and confidence/history fields is recorded above. This documents required differences; it does not establish complete renderer parity.
- [x] Reviewed builder/sample report handoff: shared real builder questions, Family/Educator eligibility, preserved local answers/step and explicit notice that the prepared report does not reflect edited inputs. No live generation/upload/save is demonstrated.
- [x] Reviewed Family/Educator demo meeting entry points: both use PptAgendaDocument with fictional source content, no linked student or action-write callbacks.
- [x] Reviewed saved PPT load selection: superseded requests cannot replace the current guide, show an obsolete error or end its loading state. Returned IDs must match; stale guide/print controls are hidden while loading. Seven synthetic route tests pass without record writes.
- [x] Reviewed saved-report navigation for Student/Family/Educator: a separate page lifetime per report ID clears old document/sharing state and cancels scheduled print on departure; initial loads ignore late responses and reject mismatched report IDs. Ten synthetic route regressions pass without provider or mutation calls.
- [x] Reviewed version restore context: version/report IDs must match before saving; report departure stops a pending fetch from starting a restore; only one restore runs at a time. Already-started writes remain on the original report and cannot notify/refresh the next one. Eight synthetic regressions pass with mocked writes.
- [x] Reviewed sharing/update completion: creation and revocation report failures, serialize sharing operations and ignore departed results; linking/regeneration cannot notify the next report. Refreshed reports must match the requested ID. Thirteen additional synthetic action cases pass with mocked provider/mutation calls. Already-issued writes are not cancelled.
- [x] Reviewed partner suggestion context and PPT provider destinations: hide old student matches/links during selection changes, ignore late results/errors and retain complete partner details. PPT links use the existing report URL validator; this creates no new shared/demo matching access. Eleven new synthetic regressions pass.
- [x] Bounded generation-diff review: plain-language schema guidance, PPT speaker-direction instruction, translation completeness/reconstruction and report-list failure signaling. Five focused files / 28 tests pass; semantic/provider output quality remains unverified.
- [x] Prepared builder report return-role/hierarchy finding: subordinate notice heading, explicit report-view URL state, eligible Family/Educator return links and actual router Back handoff. Five component and seven memory-router tests pass with report/destination renderers mocked; actual builder restoration retains its separate eight tests.
- [x] Bounded dashboard/widget/related-link diff review: fixed the Educator builder demo shortcut to carry its role. Two actual router/component handoffs verify Educator selection even over a persisted Family draft; six-role destination contracts and five static role/navigation checks pass. Owner permissions are unchanged.
- [x] Shared pathway detail controls: Student/Family collapsed and Educator expanded defaults, plain labels, accessible toggle relationship and complete print content in main demo and actual newer recommendations. Seven interaction tests and 36 browser cases pass; 17 native exports retain complete text and layout after known-date normalization. Source models/optional-section coverage remain separate open gates.
- [x] PPT setup lookup recovery: independent report/history failures and retry paths, preserved meeting notes, honest successful empty results and generation prerequisites. Six new UI and two mocked server cases pass; this does not prove completeness beyond existing 100-report/50-prep windows.
- [x] Complete counted report/prep libraries and bounded linked-name batches; fail honestly rather than expose partial results. Eight synthetic server cases pass without provider calls.
- [x] Actual report library honors load failure, offers retry and distinguishes genuine empty results; five synthetic component cases pass.
- [x] Goal Tracker list/detail recovery and response/selection isolation; nine synthetic checks pass.
- [ ] Close Goal Tracker status read/save and source-shape/stable-item findings. Older DashboardWidgets is unused; current-board role acceptance remains open.
- [ ] Reconcile remaining equivalent age-aware/product goal and pathway presentation while retaining all source-specific fields.
- [x] Demonstrate optional IEP/confidence/review and update-summary sections with schema-validated fictional data and actual product components. Linked from the prepared builder report, this is a section excerpt with no upload/extraction, full-history or live-record claim. Main age-aware profiles remain unchanged; full-report parity is still open.
- [ ] Complete the remaining full draft route/presentation diff review; the bounded reviews above do not cover the entire PR.
- [ ] Perform specifically authorized exact-release signed-in staging checks for applicable planning/organization roles, save/reopen, navigation and exports. Static/local tests cannot close this gate.
- [ ] Release the server-only sharing caller before a separately authorized staging grant migration and direct-RPC-denial acceptance.

The load-state fix passes TypeScript and all 179 unit files / 1,651 tests. Existing document layout is unchanged, so the preceding browser/native review remains the presentation evidence. No new live generation, database writes, publication or production operation was performed.


Saved-report route verification passes TypeScript and all 180 unit files / 1,661 tests. This adds load/navigation isolation, not visual or source-content changes. The role tests use mocked authorized responses; they do not establish real account authorization, generation quality or staging acceptance. Prior a2dbdd52 hosted build/static checks pass; live/signed-in checks remain skipped.


Version restore review (October 12): TypeScript and all 181 unit files / 1,669 tests pass. These mocked regressions verify UI context and complete content forwarded to the existing update function, not live server permission enforcement or actual persistence. They do not cancel a save already sent. No document styling, demo content or role authorization changed.


Sharing/update completion review (October 12): TypeScript and all 181 unit files / 1,682 tests pass. A full-run worker/timeouts interruption was resolved by rerunning the unchanged suite with two workers. These regressions test client completion context and feedback; live authorization, generated content quality and persistence remain separate acceptance gates. Demo data and document layout are unchanged.


Partner context/link review (October 12): TypeScript and all 181 unit files / 1,693 tests pass. Fictional mocked matches demonstrate context isolation and consistent destination validation, not provider availability, partner verification or outreach success. Existing role/server access and complete reasons/cautions remain unchanged. Document layout is unchanged.


Prepared handoff verification (October 12): TypeScript and all 182 unit files / 1,704 tests pass. The sample does not become generated output from edited inputs, and no mutation/provider call is made. This fixes navigation and notice hierarchy while preserving the open dynamic-parity and live acceptance gates.


## Optional Section Example — October 12, 2026

The prepared sample report links to a separate three-lens excerpt. Actual ReportV2SnapshotHeader, ReportIepSummary and ReportV2ExtrasBody render validated fictional plan fields, review notes, confidence explanation/caveats and a sample update summary. Source document IDs are empty. Student/Family receive the supplied plain-language explanation; Educator retains the goal wording and recorded example services. Navigation permits only planning lenses and retains an eligible Family/Educator builder return role. This does not add live role permissions or demonstrate document decoding, actual history or input-based report generation.

TypeScript, 185 unit files / 1,721 tests and 37 browser cases pass, with the final preview print-isolation regression rerun after the native finding. Eight local PDFs retain complete permitted content; all six two-page preview pages were inspected, and all 171 existing product pages match the preceding baseline pixel-for-pixel after extracting IEP markup. The full draft review and signed-in exact-release acceptance remain open.


PPT setup recovery (October 12): TypeScript and all 186 unit files / 1,729 tests pass. Only setup/list states and a load-result flag changed; caller scope, packet generation and document rendering remain unchanged. Existing report/prep row limits remain a separate complete-library/per-student-source review finding.


## Complete Saved Planning Libraries — October 12, 2026

- Replaced the 100-report and 50-meeting-prep windows with the existing counted pagination helper. Report pages retain the authenticated/RLS client; meeting-prep pages retain the explicit caller user filter. Newest-first ordering includes the unique record ID for ties. Applicable report-library, linked Student/Family planning and PPT setup consumers receive the same complete result without new role access.
- Linked student names are read in deduplicated batches of at most 100 IDs with counted pages. A failed later record page, missing count or failed name batch returns the existing load-failed state, never a partial list presented as complete or empty success.
- Synthetic handler checks cover 605 linked reports, 1,205 saved preps, seven name batches, caller scope on every prep page, genuine empty lists and later-page/name failures. TypeScript and all 186 unit files / 1,735 tests pass. Document markup and demo fixtures are unchanged; prior 37 browser cases and eight native PDFs remain the presentation evidence.
- Pagination is not an atomic database snapshot: count changes are rejected, but equal-count concurrent edits are not proven stable. Complete-library loading also needs exact-release signed-in performance/RLS acceptance for large real histories. No provider request, database write, release or production operation was performed. Full draft review and roadmap release gates remain open.


## Report Library Recovery and Next Consumers — October 12, 2026

- The actual report library now treats the server load-failed flag and rejected calls as errors, with Reload Reports. It shows the first-report empty state only after a successful empty response. Retry results ignore a departed page; existing search, sorting, density, report links and deletion workflow are preserved.
- Five synthetic component cases cover shared Family/Educator/Student contexts, successful retry, genuine empty results and a late retry after remount. RoleGuard is mocked: these tests verify the shared library, not actual role permissions. TypeScript and all 187 unit files / 1,740 tests pass. Document/demo renderers are unchanged; prior presentation evidence remains applicable.
- Next immediate consumer review: Goal Tracker and the older DashboardWidgets summary still ignore listMyReports.loadFailed. Goal Tracker also lacks a guarded rejected/stale report-detail result. Record their retry/context handling as open milestone-1 work; do not count these as fixed by server pagination or the library change.
- Draft PR211 remains unreleased. Complete draft/source reconciliation, exact candidate identity and authorized signed-in staging acceptance remain open. No provider call, real record mutation, merge, deployment or production operation was performed.


## Goal Tracker Report Recovery — October 12, 2026

- Goal Tracker now distinguishes failed report-library reads from genuine empty results and offers Reload Reports. The selected report has its own error and Reload Next Steps control; rejected loads no longer remain on Opening report indefinitely.
- Superseded report successes/errors are ignored, response IDs must match the selection, old goals are hidden while a new selection loads, and a keyed GoalList resets report-specific status state. Report list retries retain an eligible selection. Existing goal item IDs, report content, status writes and role permissions are unchanged.
- Nine synthetic component checks cover load-failed/rejected lists, genuine emptiness, rejected/mismatched details, independent retry, old successes/errors, hidden old goals/status and departed list results. TypeScript and all 188 unit files / 1,749 tests pass. RoleGuard/server functions are mocked; this is not real account, persistence or provider acceptance.
- Role policy continues to allow Goal Tracker for Family/Educator/Admin audiences only. Student, Partner and Owner receive no new access. The demo goal preview remains explicitly static, without live loading/save claims; document/demo renderers and presentation evidence are unchanged.
- Repository caller search found no application import/use of the old DashboardWidgets component; the signed-in dashboard uses DashboardWidgetBoard. Treat the older summary as unused legacy code, not an active dashboard regression. Any removal/reuse requires review, and current-board role acceptance remains open.
- Next bounded Goal Tracker review: server-status read failure versus cached/default values; concurrent/departed save completions; legacy/newer source-shape compatibility and stable goal identity. These findings are not resolved by report-load recovery. Whole draft/source reconciliation and exact-release staging gates remain open. No live write, provider call, merge, deployment or production operation was performed.
