# PR211 Release Review and Open Gates

Updated October 13, 2026. This is a release-review record, not deployment authorization or a complete PR approval.

## Candidate Identity and Scope

Reviewed source baseline: `9eab37b584c913841076c8921f179cc0cf3bd54e`, against PR210 base `0ff2f1020a394301695295d9e93a2d0ad9eec41c`. The full draft has 215 changed files at that baseline. Inventory below records every path, not a claim each path has received complete review. This turn's migration-inventory correction and documentation add no runtime source changes.

Runtime source fingerprint: `9e57117cbb7ef97a268d18490893502c7e0933d5ac2073dd7a64318fa3e01ed5`, schema `transitionforward-runtime-source-v1`, SHA256, 1,128 runtime files. It excludes environment files, migrations, tests, workflows and docs by design. This is local source identity, not proof either hosted site serves it. Record the final commit and independently verified host identity only after the remaining changes/review are complete.

The user's Lovable edit, “Your Dashboard Widgets,” remains in the shared board. Any additional builder edits must still be inspected and reconciled before source synchronization; current preservation of this heading does not prove no other remote edits exist.

## Readiness Gate Finding and Repair

The candidate audit at [run 38347682610](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38347682610) failed because the new atomic history migration raised the canonical count from 202 to 203 without updating the machine-readable inventory and pinned comparison expectations. Updated count/latest-file and explicit expected pending migration lists now include `20261012190000_atomic_pathway_report_content.sql`.

Against the recorded September 17 production CSV, comparison remains BLOCKED with exactly nine pending production migrations, including this new function. Historical evidence dates, production applied count, alignment rules, reviewed variants/supersessions and staging-only exclusions are unchanged. No fresh production query or authorization is implied. The count correction does not waive, apply or approve any pending migration.

All 68 credential-free readiness/security contract cases and 27 focused environment/testing-initialization unit cases pass locally after the correction. Previous source baseline passes all 200 unit files / 1,916 tests and TypeScript. Its hosted clean builds, unit, accessibility, role guards and disposable migration replay passed; signed-in/credentialed checks were skipped. The repaired [hosted readiness audit 38348269909](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38348269909) passed at `6a5b69154779177dba1e56020def9762427f1150`. This confirms the static gate, not a production GO decision.

## Review Boundaries

- Atomic save/regenerate: both caller replacements, authenticated typed RPC boundary, observed-content comparison, server section metadata, response validation, error mapping and no fallback/retry are reviewed with 38 focused handler/boundary cases. Actual SDK serialization uses a mocked endpoint. The function is specifically authorized/applied to staging only; nine hosted SQL checks and zero cleanup counts are recorded in [the history plan](pathway-transactional-history-plan.md). API/browser/committed reload remains unrun.
- Generation and translation: prior bounded schema/prompt/translation reconstruction checks are recorded in [the document contract](report-demo-product-contract.md). Current diff inspection confirms text-only translation, report/PPT counted libraries and preserved ownership paths. It is not a provider-quality, multilingual-semantic or exhaustive generation-path approval.
- Data scopes: reviewed pagination helper and goal-status diff retain exact counts, user/report filters, validation and honest failure behavior. School report metrics reject failed/missing active organization membership before scoped admin queries; District metrics retain district-admin authorization and child-school/student filtering. Stable counts do not establish a transactionally consistent read; broader dashboard/roster volume and hosted permissions remain open.
- Sharing: server-only token RPC plus audience projection preserves fixed Family/Educator views; its grant migration is still a separate pending authorization after caller release. Direct RPC denial/revocation/expiry must be verified against the exact hosted candidate; the installed atomic-history function does not close this sharing gate.
- Routes/presentation: prior bounded source, 39 browser cases and 19 native fixtures are evidence for named checks, not exhaustive review of every changed component/route. Main age-aware demo/product goals, recommendations and optional sections still need final reconciliation. Prepared builder reports explicitly do not reflect edited inputs, so dynamic demo/live parity is not declared complete.

## Migration Ledger Representation — Reconciled for Atomic History

The authorized staging execution stored the history migration's source as one ledger entry without its outer BEGIN/COMMIT wrappers. The earlier verification compared this expected stored representation and the exact installed function body; it did not prove full-file canonical hash equality. The canonical comparator and baseline SQL hash complete file/statement text and executable tokens, including those wrappers, so this representation will not match the canonical file hash as-is.

This single ledger entry was reconciled as recorded below; do not infer complete staging migration-history alignment from it. Preserve the reviewed file and installed function; do not rewrite canonical migration history, waive the production comparator or invent a reviewed production variant. No additional ledger/database change occurred during this review. The function's previously verified body/grants and nine hosted SQL assertions remain scoped evidence, not proof of canonical-ledger alignment. The initial automatic-review rejection around embedded bookkeeping wrappers remains part of the execution record; a correction must be submitted as a concrete, safely validated bookkeeping action rather than hiding transaction text or re-executing the function.

## Applicable Role Acceptance

| Role/view | Required release checks |
| --- | --- |
| Student | Authorized report ownership/visibility, applicable tools and back/forward/refresh, Student-specific source/voice fields, permitted save/reload/exports; no Family/Educator submitter toggle added. |
| Family/Guardian | Owned report save/restore/reload/conflict, applicable tools/navigation, complete Family document/export and authorized fixed sharing. |
| Educator/Case Manager | Owned report save/restore/reload/conflict, applicable tools/navigation, Educator document/export; linked-student permissions and available PPT flow remain separately checked. |
| School administrator | Active school membership, school/period selection, accurate report-versus-student counts, complete authorized PDF/CSV and denied cross-school requests. |
| District administrator | District membership, child-school filters/periods, accurate counts, complete authorized PDF/CSV and denied cross-district requests. |
| Partner | Directory/profile/opportunity destinations and permissions; no private student planning access is created by this release. |
| Owner | Management-only hub, `/dashboard` redirects to `/owner`, refresh/back/forward do not fall into Family planning; no planning dashboard or private tool entitlement added. |
| Fixed shared views | Owner-designated Family/Educator audience, projected data only, no mutations/provider controls, valid/revoked/expired token behavior and complete permitted print/export. |

## Release Order — Still Open

1. Finish grouped source review and demo/product source/presentation reconciliation; keep a list of material findings and fix milestone blockers. The inventory is not an approval.
2. Inspect/reconcile remote Lovable edits. Pin final commit/fingerprint, exact migration dependencies and host-isolation checks. Prepare one concrete staging-only release proposal.
3. Obtain specific merge/deployment authorization. Deploy only that reviewed candidate to isolated staging and verify both Cloudflare/Lovable runtime identities and environment isolation. No production action is included.
4. Run applicable role/navigation/read/save/restore/export and cross-role denial acceptance using existing synthetic identities. No test account/role mutation is authorized by this plan. Do not count skipped tests as passed. Any disposable fixture writes require bounded approval and audited cleanup.
5. New AI/provider calls remain zero until a separate plan sets per-role/tool call limits and receives authorization. Do not automatically regenerate/retry while diagnosing a conflict or deployment problem.
6. Deploy the server-only sharing caller before separately authorizing its grant migration and denial checks. Production needs its own reviewed migration baseline, provider/privacy/billing/operations approvals and release authorization, including the atomic-history migration before these callers.

The full TF01–TF26 roadmap and six milestones remain the scope of record. Partners/resources, planning evidence, management/access/channel and production readiness are not closed by these document fixes. Parent pilot/report snapshot implementation remains deferred as requested.

## Baseline Changed-File Inventory

### Build, workflows and database migrations — 6 Files

- `.github/workflows/migration-replay.yml`
- `bun.lock`
- `package.json`
- `src/styles.css`
- `supabase/migrations/20261006180000_server_only_report_share_rpcs.sql`
- `supabase/migrations/20261012190000_atomic_pathway_report_content.sql`

### Roadmap and release evidence — 9 Files

- `docs/READINESS_ROADMAP.md`
- `docs/pathway-live-staging-acceptance.md`
- `docs/pathway-transactional-history-plan.md`
- `docs/production-readiness/atomic-history-staging-acceptance-2026-10-13.sql`
- `docs/production-readiness/audit-state.json`
- `docs/production-readiness/hosting-portability-policy.json`
- `docs/production-readiness/release-checklist.md`
- `docs/production-readiness/security-definer-execute-allowlist.json`
- `docs/report-demo-product-contract.md`

### Components and document presentation — 59 Files

- `src/components/dashboard/DashboardWidgetBoard.tsx`
- `src/components/dashboard/DashboardWidgetBoardView.tsx`
- `src/components/dashboard/LiveFamilyWorkspaceOverview.tsx`
- `src/components/dashboard/ToolPreviewCard.tsx`
- `src/components/demo/BuilderSampleReport.tsx`
- `src/components/demo/DemoMeetingGuide.tsx`
- `src/components/demo/DemoOptionalReportDocument.tsx`
- `src/components/demo/DemoOptionalReportSections.tsx`
- `src/components/demo/DemoPathwayBuilder.tsx`
- `src/components/demo/OpportunityMatches.tsx`
- `src/components/demo/PathwayReport.tsx`
- `src/components/documents/DocumentLayoutStyles.tsx`
- `src/components/documents/DocumentPrintHeader.tsx`
- `src/components/documents/DocumentPrintStyles.tsx`
- `src/components/documents/DocumentSectionTitle.tsx`
- `src/components/documents/DocumentViewStyles.tsx`
- `src/components/documents/DocumentWatermark.tsx`
- `src/components/documents/MeetingDocumentStyles.tsx`
- `src/components/documents/PathwayDocumentPresentation.tsx`
- `src/components/documents/PptAgendaDocument.tsx`
- `src/components/documents/PptBrochureStyles.tsx`
- `src/components/documents/PrintedFieldValue.tsx`
- `src/components/documents/ReportBrochurePrintStyles.tsx`
- `src/components/documents/ReportCategoryContinuation.tsx`
- `src/components/documents/ReportContents.tsx`
- `src/components/documents/ReportExpandableDetails.tsx`
- `src/components/documents/ReportGoalDetails.tsx`
- `src/components/documents/ReportGoalFact.tsx`
- `src/components/documents/ReportGoalHeading.tsx`
- `src/components/documents/ReportIepSummary.tsx`
- `src/components/documents/ReportOverview.tsx`
- `src/components/documents/ReportPathwayIntro.tsx`
- `src/components/documents/ReportPdfButton.tsx`
- `src/components/documents/ReportPlanningGap.tsx`
- `src/components/documents/ReportProfileDetails.tsx`
- `src/components/documents/ReportReadinessRow.tsx`
- `src/components/documents/ReportSectionUpdates.tsx`
- `src/components/documents/ReportSourceEntry.tsx`
- `src/components/documents/SampleDocumentNotice.tsx`
- `src/components/documents/StudentVoiceQuotes.tsx`
- `src/components/pathway/AiAssistPanel.tsx`
- `src/components/pathway/EarlierProgressReview.tsx`
- `src/components/pathway/MeetingPrepPartners.tsx`
- `src/components/pathway/PathwayBuilderSteps.tsx`
- `src/components/pathway/PathwayConnectionsCard.tsx`
- `src/components/pathway/PlanHorizon.tsx`
- `src/components/pathway/RecommendationCard.tsx`
- `src/components/pathway/ReportPartnerSuggestions.tsx`
- `src/components/pathway/ReportPhase4Sections.tsx`
- `src/components/pathway/ReportSessionBoundary.tsx`
- `src/components/pathway/ReportV2Extras.tsx`
- `src/components/pathway/ReportV2Sections.tsx`
- `src/components/pathway/ReportVersionsPanel.tsx`
- `src/components/pathway/ReportView.tsx`
- `src/components/pathway/SourceChips.tsx`
- `src/components/pathway/report/PathwayReportBody.tsx`
- `src/components/pathway/useLinkedPathway.ts`
- `src/components/publication/PublicationPage.tsx`
- `src/components/value/ValueCallout.tsx`

### Server and shared logic — 43 Files

- `src/hooks/use-report-student-voice.ts`
- `src/lib/ai-assist.functions.ts`
- `src/lib/dashboard/dashboard-widget-navigation.ts`
- `src/lib/dashboard/related-tools.ts`
- `src/lib/demo-extended-plans.ts`
- `src/lib/demo/demo-profiles.ts`
- `src/lib/demo/meeting-guide.ts`
- `src/lib/demo/optional-report-example.ts`
- `src/lib/demo/pathway-engine.ts`
- `src/lib/demo/planning-widget-content.ts`
- `src/lib/demo/report-overview.ts`
- `src/lib/district-admin.functions.ts`
- `src/lib/earlier-goal-progress.ts`
- `src/lib/goal-statuses.functions.ts`
- `src/lib/goal-tracker-items.ts`
- `src/lib/organization-report-export.ts`
- `src/lib/organization-report-pdf.ts`
- `src/lib/pathway.functions.ts`
- `src/lib/ppt.functions.ts`
- `src/lib/report-confidence-label.ts`
- `src/lib/report-content-write.server.ts`
- `src/lib/report-contents.ts`
- `src/lib/report-match-details.ts`
- `src/lib/report-next-step-preview.ts`
- `src/lib/report-overview-content.ts`
- `src/lib/report-print-plans.ts`
- `src/lib/report-print.ts`
- `src/lib/report-query-pages.ts`
- `src/lib/report-record-counts.ts`
- `src/lib/report-recorded-plans.ts`
- `src/lib/report-section-history.ts`
- `src/lib/report-section-updates.ts`
- `src/lib/report-snapshot-contract.ts`
- `src/lib/report-source-summary.ts`
- `src/lib/report-team-questions.ts`
- `src/lib/report-translation-contract.ts`
- `src/lib/report-v2-contents.ts`
- `src/lib/school-admin.functions.ts`
- `src/lib/share.functions.ts`
- `src/lib/shared-report-projection.ts`
- `src/lib/structured-output-system.ts`
- `src/lib/students.functions.ts`
- `src/lib/title-case.ts`

### Routes and role navigation — 14 Files

- `src/routes/_authenticated/district.implementation.tsx`
- `src/routes/_authenticated/district.progress.tsx`
- `src/routes/_authenticated/district.reports.tsx`
- `src/routes/_authenticated/goals.tsx`
- `src/routes/_authenticated/meetings.$meetingId.tsx`
- `src/routes/_authenticated/pathway.family.tsx`
- `src/routes/_authenticated/pathway.student.tsx`
- `src/routes/_authenticated/ppt-prep.tsx`
- `src/routes/_authenticated/reports.$reportId.tsx`
- `src/routes/_authenticated/reports.tsx`
- `src/routes/_authenticated/school.reports.tsx`
- `src/routes/demo_.feature.$role.$slug.tsx`
- `src/routes/demo_.report.tsx`
- `src/routes/share.$token.tsx`

### Regression and acceptance tests — 84 Files

- `tests/atomic-pathway-history-source.test.mjs`
- `tests/database/atomic-pathway-history.test.mjs`
- `tests/e2e/document-presentation.config.ts`
- `tests/e2e/document-presentation.spec.ts`
- `tests/fixtures/shared-report.ts`
- `tests/production-readiness-contract.test.mjs`
- `tests/security-definer-routine-grants.test.mjs`
- `tests/server-only-share-rpcs.test.mjs`
- `tests/unit/age-aware-report-document.test.tsx`
- `tests/unit/ai-assist-context.test.tsx`
- `tests/unit/builder-report-route.test.tsx`
- `tests/unit/builder-sample-report.test.tsx`
- `tests/unit/dashboard-builder-handoff.test.tsx`
- `tests/unit/dashboard-card-destinations.test.ts`
- `tests/unit/dashboard-widget-navigation.test.ts`
- `tests/unit/demo-meeting-guide.test.tsx`
- `tests/unit/demo-optional-report.test.tsx`
- `tests/unit/demo-pathway-builder.test.tsx`
- `tests/unit/demo-planning-widgets.test.ts`
- `tests/unit/document-print-visibility.test.tsx`
- `tests/unit/document-section-heading.test.tsx`
- `tests/unit/earlier-goal-progress.test.ts`
- `tests/unit/goal-status-load-result.test.ts`
- `tests/unit/goal-tracker-items.test.ts`
- `tests/unit/goal-tracker-recovery.test.tsx`
- `tests/unit/linked-pathway.test.tsx`
- `tests/unit/live-school-district-dashboard-alignment.test.ts`
- `tests/unit/meeting-document-context.test.tsx`
- `tests/unit/meeting-prep-partner-context.test.tsx`
- `tests/unit/organization-report-export.test.ts`
- `tests/unit/organization-report-pdf.test.ts`
- `tests/unit/organization-report-query-access.test.ts`
- `tests/unit/organization-report-recovery.test.tsx`
- `tests/unit/pathway-creator-persistence.test.ts`
- `tests/unit/pathway-engine.test.ts`
- `tests/unit/pathway-report-body.test.tsx`
- `tests/unit/ppt-agenda-document.test.tsx`
- `tests/unit/ppt-history-load-result.test.ts`
- `tests/unit/ppt-prep-context.test.tsx`
- `tests/unit/printed-field-value.test.tsx`
- `tests/unit/report-action-plan-export.test.tsx`
- `tests/unit/report-confidence-label.test.ts`
- `tests/unit/report-content-write.test.ts`
- `tests/unit/report-expandable-details.test.tsx`
- `tests/unit/report-goal-fact.test.tsx`
- `tests/unit/report-library-recovery.test.tsx`
- `tests/unit/report-match-details.test.tsx`
- `tests/unit/report-next-step-preview.test.ts`
- `tests/unit/report-overview-content.test.ts`
- `tests/unit/report-partner-completeness.test.tsx`
- `tests/unit/report-pathway-intro.test.tsx`
- `tests/unit/report-phase4-completeness.test.tsx`
- `tests/unit/report-print-plans.test.ts`
- `tests/unit/report-profile-details.test.tsx`
- `tests/unit/report-qualitative-readiness.test.tsx`
- `tests/unit/report-query-pages.test.ts`
- `tests/unit/report-reader-controls.test.tsx`
- `tests/unit/report-readiness-row.test.tsx`
- `tests/unit/report-record-counts.test.ts`
- `tests/unit/report-recorded-plans.test.ts`
- `tests/unit/report-section-history-view.test.tsx`
- `tests/unit/report-section-history.test.ts`
- `tests/unit/report-section-update-handlers.test.ts`
- `tests/unit/report-section-updates.test.ts`
- `tests/unit/report-session-boundary.test.tsx`
- `tests/unit/report-snapshot-contract.test.ts`
- `tests/unit/report-source-chips.test.tsx`
- `tests/unit/report-source-labels.test.ts`
- `tests/unit/report-student-voice-context.test.tsx`
- `tests/unit/report-team-questions.test.tsx`
- `tests/unit/report-translated-reader.test.tsx`
- `tests/unit/report-translation-contract.test.ts`
- `tests/unit/report-translation-handler.test.ts`
- `tests/unit/report-v2-contents.test.ts`
- `tests/unit/report-v2-source-panel.test.tsx`
- `tests/unit/report-version-context.test.tsx`
- `tests/unit/saved-report-route-context.test.tsx`
- `tests/unit/share-resolver-contract.test.ts`
- `tests/unit/share-resolver.test.ts`
- `tests/unit/shared-report-context.test.tsx`
- `tests/unit/shared-report-projection.test.ts`
- `tests/unit/structured-generation-inventory.test.ts`
- `tests/unit/student-voice-quotes.test.tsx`
- `tests/unit/title-case-acronyms.test.ts`


## Ledger Reconciliation Execution — October 13, 2026

Within the prior specific staging migration authorization, corrected only `supabase_migrations.schema_migrations.statements` for version `20261012190000`, after confirming project `qgrertkqbwanerqqemph` and reading the existing hashes. The guarded, atomic DO statement treats embedded canonical migration text as data and never executes it. It checks the exact prior/canonical representation, name, installed body/configuration and effective grants before updating one version. No function/grant/RLS DDL, other migration or application record was changed.

Disposable proof: 15 local PGlite cases passed, with concurrency explicitly skipped; all 16 cases passed with zero skips in both [real PostgreSQL replay 38348726102](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38348726102) and [38348720997](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/38348720997) at `e1dfca66556f272419c20208501bdf4305deb200`. Four additional ledger cases prove unchanged function/other metadata, idempotence, unexpected-source rejection, update-failure rollback and changed-grant rejection. Full canonical replay passes in both runs. All 68 static readiness/security checks pass again locally.

Hosted preflight hashes: wrapper-free statements `3221392fac28eaae91cf153287d34b25`, executable code `b0a9c57641077ba578879bbbffd92c14`. After correction, independent read-only verification reports canonical statements `06379cb286297b929e168adfe25a4d0e` and executable code `6510f051ae55e8eb94aef996c75aaec0` match. Installed function-definition MD5 stayed `608213f8eb968032b2c78016069ef196`; SECURITY INVOKER and expected execution grants pass. Canonical file SHA256 remains `20fd2d2c2c7efc8bd9d3695fef4f7cf86c3a92cd10f76aaf026b5be54400aea0`.

Browser recovery required the native Chrome path after extension/inventory timeouts; no SQL ran during those failed attempts. The final staging SQL editor visibly returned success and all verification booleans true. Screenshot: `/private/tmp/tf-history-ledger-reconciled.png`. The tested statement is generated by `tests/database/atomic-history-ledger-sql.mjs`; its data-only behavior is exercised by `tests/database/atomic-pathway-history.test.mjs`. No rejection was bypassed, no transaction text was hidden/encoded and no source/history-comparison rule was weakened.

This closes only the atomic-history ledger mismatch. Production remains unchanged and its historical comparison still lists nine pending migrations. The remaining full draft/demo review, separate share-grant migration authorization, exact-build signed-in role/API acceptance and release approval remain open. No deployment, merge, AI/provider request, account/role or application-data mutation occurred.

## Shared IEP Presentation Delta — October 13, 2026

Reviewed the actual ReportIepSummary goal/support typography against common goal primitives. It now uses shared h4 goal headings, complete recorded text, permitted plain-language facts and Title Case support labels. Scoped print continuity fixes the native Present Levels orphan found during QA. No data/permission/source fields changed. Full 201-file / 1,920-test unit suite and TypeScript pass; all 40 browser cases pass, with final three affected cases rerun successfully. Eight matched native IEP examples / 180 pages preserve complete text, counts and margins; 166 unchanged body pages and all 14 changed pages were reviewed. See the detailed [demo/product contract](report-demo-product-contract.md).

Local runtime source is now `a1903c29d4fbf5b4c518efffe8b3c0b3dee566c9bdf088a42b0407321ff59015`, 1,128 files. The earlier baseline fingerprint/file inventory remains historical. Neither host is declared synchronized to this delta, and no complete PR/demo parity or release approval is implied. The next candidate must incorporate this source and reconcile remote builder edits before a specifically authorized staging release.


## Prepared Report View Handoff — October 13, 2026

The prepared report now retains its selected Student, Family or Educator view when opening the fictional Plan Details and Review Notes excerpt and returning. Student view retains its eligible Family/Educator Pathway Builder return; it does not become a builder submitter. Direct links and role changes are covered by 22 offline router/component tests. This is navigation parity only: the prepared report remains a static fictional baseline, and full demo/product reconciliation and signed-in staging acceptance remain open.

Runtime source: `5113ba283c6bc9a65d8afcae21a0bfc317c27fc21f0bd0dd9ce399e4a68e7a80`, 1,128 files. No hosted parity claim.


## Shared Demo Student Navigation — October 13, 2026

Changing a fictional student now explicitly disables scroll reset in the shared useDemoStudent navigation. Student, Family and Educator regressions verify preserved role, other search parameters and section hash, an added history entry, and backward/forward restoration of the selected sample. The same selector is used by demo dashboards, workspace, reports and feature previews; no new roles or report access are introduced. These are offline router checks, not an exact pixel-position browser acceptance claim. That remains part of the signed-in/demo navigation release matrix.

Runtime fingerprint: `1eaa3b9dac85b59439c11bb7a41f8bcf60a19353f912196cdcd601e9fb0ae736`, 1,128 files; hosted parity remains unverified.


## Explicit Demo Role-Switch Context — October 13, 2026

The centralized demo role-switch resolver now includes the selected fictional student when opening a shared feature supported by the target role. Planning workspace/report destinations also carry the selected Student/Family/Educator role explicitly rather than relying on browser storage during hydration. Partner/School/District switches still leave planning routes for their own canonical dashboards; Owner is not a selectable public role-switcher entry and remains separate management-only navigation. Nine additional routing matrix cases cover the three planning perspectives, supported tool handoffs and nonplanning exits. Exact browser scroll restoration and full role-based hosted acceptance remain open.

Local runtime fingerprint: `dae23ecef213cd68752c1b229e4ec73054516d85e36bbcfe564e5245de81bbae`, 1,128 files; not deployed.


## Workspace Sample Expansion Navigation — October 13, 2026

The controlled demo workspace sample now retains the existing section hash and explicitly disables scroll reset when expanding or collapsing. The actual route handler is exercised with a memory router for Student, Family and Educator; each case verifies URL role/student preservation, expansion state, an added history entry and back/forward restoration. Shell/body components are stubbed to isolate navigation. This does not establish exact pixel scroll restoration or unchanged height on collapse; those browser acceptance checks remain open. No document content, role access or layout was changed.

Local runtime fingerprint: `9f128d92b5393066df60cc6a388fd8ee0f7c6fc3d2c45ca13e3f3ba5b76f8bde`, 1,128 files. Not deployed.


## Departing Planning Page and Browser Scroll Review — October 13, 2026

A credential-free Chrome fixture exposed a departing-page race: useDemoPlanningRole could observe an incoming dashboard location before unmounting and canonicalize it with stored planning state. Adding a role query changed the router's href-based restoration key, so a return link failed to restore the dashboard position. Canonicalization is now limited to actual planning pages and resolved pathnames. Dashboard, Builder and prepared excerpt destinations retain their own context rules. Three permanent memory-router regressions cover dashboard departure and backward/forward navigation.

The reproducible `tests/e2e/demo-navigation-browser-check.cjs` loads the actual getRouter configuration, SmartLink and shared student/role hooks against synthetic long dashboard/report pages. It stubs routeTree, persistence and error UI, intercepts every browser request, and aborts other hosts. All six combinations of Student/Family/Educator and 375/1,280-pixel viewport width pass: new tool starts at the top, sample/role switching retains the 1,200-pixel report position, dashboard return restores its 900-pixel position, and back/forward restores both positions. No credentials, account changes, providers or record writes. This proves the named shared-navigation behavior, not actual dashboard layout, full tool/drawer interactions, all scroll containers or signed-in hosted acceptance. Those gates remain open.

Local source fingerprint: `b4318e9d02d16b731931e712ff00b33ee310e638578e283d0e3bb9ec08af4815`, 1,128 files. Not deployed.


## All-Role Navigation Matrix — October 13, 2026

The credential-free browser fixture now covers all seven roles at 375- and 1,280-pixel viewport widths: 14 cases pass. Student/Family/Educator retain the existing report/sample/role checks. School, District and Partner use the actual use-role-context hooks and DemoFeatureShell return link, with real registry entries (School Overview, District Reports and Partner Profile). Their synthetic dashboard and long tool pages verify selected school/district/listing plan, no scroll reset on context change, exact return URL, 900-pixel dashboard restoration and 1,200-pixel tool restoration through back/forward navigation. Owner exercises the actual diagnostics preview return link to `/demo/owner`, has no organization/student selector or context query, and restores Owner Hub/tool positions. Owner remains management-only. SiteShell, persistence/error UI and the route tree are stubbed; these are not authenticated app pages, permission/RLS checks or complete tool workflows. No provider calls, account changes or records.

Seven focused role/tool/organization/owner audit files pass (76 tests): published primary and secondary destinations resolve to registered role-allowed routes; dashboard tool applicability, category navigation, unknown-role handling, shared header return policy, owner dashboard guarding and organization history retain their existing constraints. This does not claim every generation, upload, saved-data or conferencing feature is ready. Full role-specific hosted acceptance and the broader roadmap remain open. No runtime-source change in this follow-up: fingerprint remains `b4318e9d02d16b731931e712ff00b33ee310e638578e283d0e3bb9ec08af4815`, 1,128 files.


## Calendar Preview Context and Shared Events — October 13, 2026

Calendar demo event links now include only the applicable validated School, District or Partner context when supplied. Owner receives no student/organization/listing-plan query; planning roles retain their existing selected-student/role links. Unsupported event destinations remain non-clickable, and no new calendar pages or role access were added. The currently published School calendar route takes its selected organization context from the real hook and builds one event list for the calendar, rows and count. An actual-route regression with real school-context hooks verifies comprehensive → specialized selection, pinned event destinations, matching counts and backward restoration; renderer/shell are stubbed, with no provider/record actions. Five helper regressions cover School/District/Partner routing, invalid context and Owner isolation. District/Partner helper coverage does not imply a newly published calendar feature.

The first broad unit run had worker-start/timing failures and was not counted as passing. All affected files plus the actual calendar route regression passed a fresh six-file rerun (57 tests). The fresh complete retry passes all 203 files / 1,946 tests, and final TypeScript passes. Exact hosted calendar interactions and full role-based tool acceptance remain open. Runtime source: `78b28b36a65efdfad30cd2f9eeb00fe6d84f166efc34a6abc654691b76ab3715`, 1,128 files; not deployed.


## Calendar Export Date and Recorded-Time Parity — October 13, 2026

Both the shared TransitionCalendar ICS serializer and the signed-in dashboard export path now retain all-day events as iCalendar DATE values. Dashboard all-day exports use an exclusive next-day end, including a year-boundary regression; shared multi-day examples preserve a supplied exclusive end, and omitted ends remain one-day events. The actual saved-record adapter now carries all_day, start_time and end_time into export values. Timed saved records retain recorded start/end clock values in both timezone-labelled ICS and Google Calendar URLs rather than being exported as generic 9 AM reminder slots. Legacy date-only derived reminders retain their existing behavior. No role permissions, event writes, timezones, calendar layouts or document styling were changed.

RFC 5545 DATE/DTSTART/DTEND semantics were checked against the primary iCalendar specification: https://www.rfc-editor.org/rfc/rfc5545. Timed records without a supplied end retain the existing 30-minute export fallback; this is not a recorded duration. New tests cover all-day/date boundaries, multi-day exclusive ends, saved-record adaptation, recorded meeting times, Google URLs and legacy behavior. The retired School sample report route was also corrected to `/school/reports`, enabling the existing report-completion preview link while preserving selected school context.

Complete offline suite: 204 files / 1,953 tests pass; TypeScript passes. Export checks use synthetic source values without opening Google, importing into calendar providers, creating events or contacting anyone. External provider import and signed-in live acceptance remain open. Runtime source: `c11654486b1c396fcb3f4e2a6cf021bff8690ab94440c21cfef81eedf80d3055`, 1,128 files; not deployed.


## Calendar Download Recorded Details — October 13, 2026

The shared saved-calendar export adapter now carries optional recorded location and meeting_link fields into downloaded artifacts. ICS includes escaped LOCATION and a meeting URL; Google Calendar links include the location and the recorded meeting link in details. Missing fields remain absent, without placeholder meeting access or invented locations. This applies wherever the existing signed-in calendar export is offered; it does not publish new role tools, change source visibility, create calendar events or expand database access.

Two helper cases verify complete supplied details and missing-field behavior. A new regression exercises the actual DashboardCalendar export button using two mocked returned records, captures and reads the downloaded Blob, and verifies all-day date boundaries, saved timed start/end, location, meeting URL, both event records and the existing deferred Blob URL cleanup. Create/update/delete functions are mocked and confirmed unused. API results are mocked: this proves the download-control/data-adapter path, not live RLS or calendar-provider import. The first focused assertion checked cleanup too early; the final regression awaits the existing two-second cleanup rather than changing production timing. Full role-based hosted acceptance remains open. Runtime source: `c5a9b1233116550f1bef04481671dedf63d942e15e2e9f02269bb5285dc7388c`, 1,128 files; not deployed.


## Calendar Student Session and Async Completion — October 13, 2026

DashboardCalendar now creates a separate reader lifetime for each selected student, or the all-permitted-students view when no student filter is supplied. A student change immediately clears old rows, export selection, event controls, form state and local calendar filters instead of waiting for the next API response. Mount/request guards allow only the latest active load to update records, cursor or loading state, and suppress errors from superseded/departed loads. Create/update/delete completions after departure cannot notify, edit local rows or trigger an obsolete reload. This does not cancel writes already submitted to the server, change their original target, revoke backend permissions or imply transaction-level cancellation.

Thirteen actual-handler regressions with mocked APIs cover old-success/old-error after selection change, immediately hidden old controls, unmounted loads, effect replay/latest request, and late create/delete/complete successes/failures. Popover chrome is stubbed for creation tests. The existing actual download-control regression also passes. No provider calls, real record writes or account changes.

Organization scope remains open: the current School calendar renders DashboardCalendar without an organization filter, and listCalendarEvents accepts student/date filters but no selected-organization parameter. Therefore it aggregates permitted events rather than proving selected-school isolation. Organization-specific filtering needs a separate source/membership review and role-aware acceptance; it must not be represented as already fixed by student/session guards. Full signed-in live acceptance remains open. Runtime source: `30ebb8fb738d4c6d9b1058460376fcd4cf980a37bd7879da0ce9353c7510f6d7`, 1,128 files; not deployed.


## Selected Organization Calendar Scope — October 13, 2026

This local source update addresses the prior selected-school aggregation gap; hosted acceptance remains open. listCalendarEvents accepts an optional validated organization_id, checks the caller's active membership before reading calendar data, and intersects it with any student filter. Students are narrowed by their existing organization_id through the same authenticated client/RLS; derived student actions, meetings and deadlines follow that narrowed set. Custom calendar rows are filtered by related_organization_id and, when supplied, student_id. Calendar query errors fail with a user-facing error rather than an empty success. Personal resource follow-ups without organization identity are omitted from the organization-scoped view; the unscoped permitted aggregate is unchanged. No service-role client, new grants, schema changes or migrations.

The School calendar passes its actual selected organization into DashboardCalendar. Student and organization together define the reader lifetime, preventing previous-school rows and late responses from surviving a switch. Creation choices are private or school_team, with the selected school as the sole supplied organization option. New events retain that organization association even when private; their visibility remains private unless the user chooses the existing school-team option. This does not add sharing permissions or convert private events into shared records. District/Partner/Owner gain no new calendar routes or tools from this work.

Eight actual-server-handler regressions with a mocked caller client cover active membership, absent/error membership failure before reads, organization/student intersection, invalid UUID rejection, custom student filtering, unscoped compatibility and query errors. Two actual UI-handler regressions cover organization requests/lifetime changes and private creation context. The initial validator test used a synchronous transport stub; it was corrected to match the async API and all eight cases pass. These are offline contract tests, not real Supabase RLS/membership acceptance. The pre-existing 500-student discovery cap and broader large-calendar query completeness remain review gates; no claim of complete large-school coverage is made. Live school switching, revoked membership and export acceptance remain open. Runtime source: `9fc54b8be7d56fce0807e0e4693b2bc2d0bf6d0f81e3853e3a01f9cf97442611`, 1,128 files; not deployed.

Calendar cleanup-test follow-up: a broad run encountered long timing stalls in download cleanup and builder history tests. The download test now captures the scheduled two-second cleanup callback, verifies deferred scheduling and invokes the callback deterministically, without changing production code or timeout values. The affected files and organization cases pass a fresh focused rerun (21 tests). Automatic permission review timed out once on the test edit; the permitted retry completed successfully. No approval bypass or production action.


## Complete Calendar Source Reads — October 13, 2026

The former 500-student discovery cap is removed locally. All calendar source reads now request exact counts, order by unique IDs and fetch successive pages through shared readCalendarPages/readCalendarBatches wrappers. This covers caller-visible students, actions, scheduled/next meetings, student date fields, personal resource follow-ups, custom events, teammate profiles and active organization choices. Student/owner filters are deduplicated and batched at 100 IDs, with 500-row page requests. Existing selected-organization membership checks and every caller RLS/filter remain in place; there is no service-role access, new role entitlement, schema change or migration. Query errors, missing counts, exhausted incomplete reads or changed counts reject with calendar-specific messages rather than returning a misleading partial timeline. Organization-choice failure now throws instead of returning a fabricated successful empty result; the existing UI still needs its error/empty-state distinction reviewed.

Actual-handler fixtures cover 1,201 students, 1,205 custom events, an IEP date beyond the old cap, 1,203 meetings/next meetings, 1,203 resource follow-ups/teammate profiles and 1,201 organization choices. The main school fixture includes all 2,407 projected records with unique IDs. Page tests cover short server pages, later-page failure, changed/missing counts, exhausted reads and batch failure. All fixtures use mocked caller clients, not real database/provider data. Counted paging does not prove an atomic snapshot or detect same-count replacements; live scale, membership/RLS and full export acceptance remain open. The selected-school completeness gap is now implemented locally, superseding the prior 500-cap source limitation; hosted acceptance is still required. Runtime source: `9769f924f877c3a4f1c8e73ca7ece3a6aa46cca1df1658db8d35b4473165f7fa`, 1,129 files; not deployed.

Next source review: scheduled meeting records from the meetings table still project as date-only/all-day calendar entries, unlike custom calendar rows which preserve saved clock times. Reconcile that display/export source mapping without confusing document deadlines with timed meetings. This remains open and is not hidden by pagination checks.


## Scheduled Meeting Instants and Organization Retry — October 13, 2026

Scheduled meetings now carry their original scheduled_at value as optional start_at in the calendar response and are no longer labelled all-day. The shared reader projects their display date/time onto the viewer's local day while retaining the original timestamp. ICS and Google exports preserve that absolute instant as UTC rather than reinterpreting it under the export timezone. Custom calendar rows retain their existing date/clock/timezone behavior, and genuine date-only deadlines remain all-day. The existing 30-minute fallback for a missing end remains an export default, not a recorded meeting duration. No stored rows, datetime fields, timezones, role access or provider settings were changed.

Organization choices now show an explicit loading state and a plain-language error with Retry Organization Choices. Failed lookup differs from a successful empty membership result. Supplied choices bypass lookup, and late errors from an obsolete lookup cannot overwrite them. Forty focused source/reader/export/context cases pass, including offset timestamps crossing UTC midnight and viewer-local display, query-source preservation, retry/empty/stale outcomes.

This is local mocked acceptance, not a real timezone/provider import or signed-in membership test. Display uses browser-local timezone; the existing calendar timezone selector governs export interpretation for local-clock custom rows and does not implement a new multi-timezone display. Derived preparation date policy remains its existing server-side calculation and still needs a midnight/timezone-boundary review. Native/provider and final role-based hosted acceptance remain open. Runtime source: `dcac372837d03bd7302cc2ad59fcad31077ccf9ada0055f5d84036a4dd7554c0`, 1,129 files; not deployed.

Final verification: all 208 unit files / 1,994 tests and TypeScript pass. The ten date/time/export cases also pass in isolated America/New_York, America/Los_Angeles and UTC processes. The new organization notice uses the established readable calendar contrast; the initial low-contrast class was corrected without weakening the accessibility contract. These timezone processes do not change system settings and are not browser/provider import acceptance.


## Viewer-Day Preparation Boundaries — October 13, 2026

The full calendar and applicable live dashboard widgets now request calendar data with the viewer's browser timezone. The API validates date strings, date order and timezone before reads; legacy callers default to UTC. Scheduled meeting day and preparation dates are derived from that timezone, using calendar-day subtraction independent of elapsed 24-hour/DST intervals. The scheduled-meeting read includes timezone boundary allowance plus the 14-day preparation horizon beyond the requested end. Only meeting/preparation records whose viewer date lies inside the requested window are returned; a future meeting can supply an in-window preparation reminder without its outside-window event appearing. Membership, organization/student intersections and counted RLS paging are unchanged. Widgets also use the viewer's day for Today and include timezone in their query-cache key.

Boundary fixtures verify spring/fall DST, UTC midnight, leap/year arithmetic, invalid inputs, a late-night meeting at the range boundary, and a January meeting's December preparation reminder. Actual widget query configuration is exercised for all six dashboard roles: Student/Family/Educator/School send timezone when applicable; District/Partner calendar queries stay disabled under their existing widget catalogs. Owner still has no planning widget board. The shared calendar's request-context regressions retain timezone alongside the selected student/organization. These use mocked source data, not live calendar/provider changes.

This locally closes the previously recorded server-day/preparation-boundary gap. Live viewer/provider and role-based source acceptance remain open. Defaults retain the existing monthly-window policy; counted reads remain non-atomic. A separate source audit found the School hub widget still uses the permitted aggregate rather than its selected-school filter, even though the full School calendar is scoped; reconcile its organization context next without introducing District/Partner/Owner calendars. Runtime source: `f45445180885bec6e93d1be9b9c5b8be82894630ffd6d6259e74da1db5262948`, 1,130 files; not deployed.


## School Calendar Widget Context — October 13, 2026

The School overview and School implementation hub now pass the resolved selected organization into DashboardWidgetBoard. Calendar requests include organization_id, and the query-cache key includes organization together with role, student and viewer timezone. School calendar reads are disabled until an organization is resolved. The widget suppresses aggregate cached rows while unscoped and hides previous-school entries during a new school load. Missing selection renders a readable, neutral selected-school notice rather than an indefinite spinner or a claim that there are no events. The actual shared reader supports the notice without changing layout or other role guidance. District/Partner calendar queries remain disabled under their existing catalogs; Owner has no planning widget board.

Real React Query fixtures with deferred mocked APIs cover late old-school success/error, immediate hiding on loaded-school switch, absent-school query suppression even with aggregate cached data, and the actual reader's notice. The six-role query configuration checks preserve existing role applicability while including School organization and viewer timezone. Queries still rely on the existing server active-membership/RLS filter; mocked cache tests do not establish real database permissions. No provider calls, event writes, preferences writes, account changes or new tool access.

This locally addresses the previously recorded School-widget aggregation gap. Calendar and widget derive their school from the same resolved page context; cross-page school-selection/navigation persistence remains a distinct review gate. useSchoolDashboard still holds its selection in local component state, so a tool entry/return can independently load a default organization; review explicit URL/history context next, then assess the corresponding District selection behavior where applicable. Full hosted role/scope acceptance remains open. Runtime source: `31237a78ff1c8873f832e0c33fcf6c0f848890ea609d7aa5ec4a78528148ea0b`, 1,130 files; not deployed.


### School/District Dashboard Load Safeguards — October 13, 2026

Both actual organizational dashboard hooks now use a shared latest-request reader. Switching or refreshing removes previous rows and dependent mutation/export controls while loading; obsolete successes/errors and completions after departure cannot replace the current data, stop its loading state or issue stale notifications. Refresh without a new ID retains the server-resolved selection. School and District page shells distinguish failed loads (generic retry guidance) from a successfully loaded account with no organizations (setup). Server selection, active-membership checks and access rules are unchanged; no stored selection is treated as authorization.

Evidence: 16 synthetic tests exercise the actual School/District hooks and page-shell failure/setup branches, including overlapping requests, current failure/retry, departure and Strict Mode replay. Fresh full run: 212 unit files / 2,029 tests; TypeScript and diff checks pass. The first full run timed out in an unchanged document test; the fresh full run passed without test or timeout changes. These checks use mocked transports and do not establish signed-in browser or live database acceptance.

Remaining gates: selections are still local state, so School/District context across tool entry/return, explicit URL/history, refresh/back/forward and browser scroll restoration require the next navigation pass. Pending mutation callbacks can independently request a reload and need a separate departure/context review; this fix guards dashboard reads, not writes. Hub error presentation also remains to be reviewed. Partner and Owner do not acquire organizational/planning tools from this shared implementation. Full PR review and hosted acceptance remain open. Nothing merged, deployed, migrated, published or sent to AI; production untouched.

Local runtime fingerprint: `381052f9a6ce5aa2ad28a4e7c2cc4bbe852524baa4e4f634b321b3ebe03399ae`, 1,131 files; not deployed.


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


### Bounded Older Recorded Activity — October 13, 2026

The six existing Student/Family/Educator/School/District/Partner history pages now share Load Older Activity and Retry Older Activity. Initial and subsequent requests use a dedicated listStudentAuditPage reader, returning at most 200 entries plus a continuation cursor. The previous listStudentAuditTrail API retains its original bounded contract for compatibility. The new handler uses the authenticated caller client and existing audit RLS/student filter. Scoped pages independently reverify organizational membership and the requested caller-visible student before every audit read. Owner gets no student-history surface or new entitlement.

Pagination is a descending (created_at, id) keyset, using strict older timestamps or a smaller ID at the same timestamp. The cursor retains database timestamp precision and is validated as ISO timestamp/UUID plus student/optional organization context; mismatched context fails before database reads. Cursors are navigation state, not signed authorization or a new access grant. A 201st lookahead row establishes continuation; exact-count checks reject missing counts, failed reads or transport-capped partial pages rather than falsely claiming the end. The page response stays bounded even when the underlying history has thousands of rows.

The shared UI appends distinct IDs, retains its active category, prevents overlapping page requests, and keeps the current records/cursor on older-read failure for retry. Student/organization keyed lifetimes and route-departure guards prevent old completions reaching a new view. Wording says the view loads up to 200 records at a time; counts/filters apply only to the number actually loaded. End wording is “No older recorded activity is available in this view,” not a claim that every real-world access event was recorded. The Family demo's fictional three-event example now explains this product behavior; its inventory snapshot changes only purpose text, retaining roles, permissions and destinations.

Evidence: 25 additional synthetic cases: 14 handler/query-model cases and 11 shared/actual-role UI cases. Checks traverse 603 same-timestamp entries exactly once, preserve timestamp precision, handle newer inserts between pages and exact 0/1/200/201 boundaries, reject malformed/mismatched cursors and missing/failed/capped reads, recheck removed membership, preserve/retry loaded rows, discard old-student/departure completions and retain the original student/organization on older reads for each of six actual role routes. Full suite: 219 files / 2,207 tests; TypeScript and diff checks pass. Actual handlers/shared routes execute with mocked auth/transport; hosted RLS, live volume/performance and production permissions are not established by these checks.

Keyset reads are not a transactional snapshot. Newer activity appears after refreshing the view; deletions, backdated inserts or changes to recorded timestamps between requests can alter what is available. No full audit export, guaranteed lifetime/compliance archive or change to the underlying event recorder is claimed. Review history export data/privacy/presentation, malformed-ID error-route recovery, remaining dashboard/report query bounds, main-demo/product parity and the full grouped PR/current-build acceptance next. All TF-01–TF-26/six milestones and deferred parent-pilot/snapshot work remain retained.

Runtime fingerprint: `693adf6225eadc4e7e5df09f1de59d63b742e55994c45b9c2b02f1e55f9ce475`, schema transitionforward-runtime-source-v1, SHA256, 1,141 files; not deployed. No merge, deploy, migration, publish, AI/provider call, account/role change or production action.


### Explicit Malformed History Link Recovery — October 13, 2026

The six existing Student/Family/Educator/School/District/Partner history routes now install a shared route error component. Optional student UUID validation and School/District organization UUID validators remain strict. When TanStack reports a search-validation error and the current history route contains malformed selection fields, the user sees “This Saved Link Needs Updating” with Clear Invalid Selections. No roster or audit read is started until the user explicitly recovers the URL. The screen does not echo malformed values.

Recovery clears only malformed student_id and, on School/District history respectively, org_id/district_id. Valid student/workspace selections and unrelated search/hash survive; explicit undefined prevents organization-retention middleware from reintroducing invalid keys. The invalid browser entry is replaced and scroll reset is disabled. The existing authenticated reader chooses an authorized default when a malformed organization field is explicitly cleared and canonicalizes it as before. A valid-but-unavailable student/organization continues to use its existing explicit unavailable-selection panel, not this malformed-field mechanism. There is no silent parse/fallback, account change, broadened cohort or access grant. Departed callbacks cannot navigate another route; duplicate recovery clicks are guarded. Unexpected render/loader/auth errors retain the standard RouteErrorComponent retry/home behavior.

Evidence: 17 added synthetic cases: six actual history route recoveries for malformed student links; four School/District cases for malformed organization alone or together with a student; one unrelated render-failure boundary; and six actual RoleGuard policy-denial cases after recovery. Assertions verify no pre-recovery data reads, no raw invalid text in the UI, valid-context/search/hash preservation, one browser entry, authorized default roster input, original/student recovery target and no data reads for incompatible roles. All prior strict-validator, role-wrapper, organization-scope and pagination checks remain. Current full suite: 219 files / 2,224 tests; TypeScript and diff checks pass. Auth/transport are mocked, the RoleGuard denial cases use synthetic role responses and a permitted destination fixture; these checks do not establish hosted JWT/RLS or signed-in acceptance.

The fix is bounded to the six history routes. Malformed organization-ID error-route recovery for other School/District tools remains open, alongside history export data/privacy/presentation, dashboard query bounds/legacy fallbacks, main-demo/product parity, real async height/scroll and full grouped draft/current-build acceptance. Fictional demo history does not issue authenticated selection calls or simulate membership errors. All TF-01–TF-26/six milestones and deferred parent-pilot/snapshot notes remain retained.

Runtime fingerprint: `75f0d3490c75d3f9b8c621454c9060c75b19450c7eff414d5d5ecbbef925b0e6`, schema transitionforward-runtime-source-v1, SHA256, 1,142 files; not deployed. No merge, deploy, migration, publication, AI/provider call, account/role change or production action.


### Organizational Tool Malformed-Link Recovery — October 13, 2026

The other 19 existing School/District reader and hub routes now install explicit malformed organization-link recovery. Coverage: School calendar, implementation, overview, planning status, readiness trends, reports, resource usage, support needs, team and School hub; District implementation, overview, progress, readiness trends, reports, schools, service gaps, team and District hub. Together with the existing six history routes, these share one SelectionRouteError renderer. The history adapter retains its own student/organization fields and wording; the organization adapter considers only its own org_id or district_id.

Strict route UUID validators, retention middleware, beforeLoad/component role guards, server membership checks and caller RLS are unchanged. A malformed search error offers Clear Invalid Selections explicitly; it never silently parses another workspace. Recovery clears only the owned malformed selection key with explicit undefined, preserves unrelated search/student selection/hash, replaces the broken entry and disables scroll reset. The existing server reader chooses its authorized default after explicit clearing and canonicalizes that default. Valid-but-unavailable selections still use the existing separate available-workspace recovery. Failed defaults remain retryable failures without loops or old records. Unexpected route errors retain the previous School overview/calendar or District overview dashboard fallback; routes without a custom fallback use the ordinary RouteErrorComponent retry/home screen. No Owner or other role receives a new tool or access right.

Evidence: 31 added synthetic cases in a new test file. Nineteen cases check source wiring to the correct role/path and exercise the actual recovery factory, UUID validators, selection hook and router with synthetic reader pages. Twelve other cases cover failed defaults, unrelated malformed fields, valid-but-unavailable selection, prior fallback behavior, actual ensureRoleAccess rechecks on explicit recovery and initial incompatible-role denial (two roles each). Existing 74 actual history-route/shared-reader cases remain passing after extraction, including all-role recovery and RoleGuard checks. Current full suite: 220 files / 2,255 tests; TypeScript and diff checks pass. Mocked transport/role responses and synthetic reader/fallback/destination fixtures are explicit. These tests do not execute every actual tool's rendered layout, prove hosted JWT/RLS or constitute native signed-in async-height/scroll acceptance.

History export data/privacy/presentation is the next bounded review. Remaining dashboard/report bounds and member-owned fallback, main-demo/product parity, actual async height/scroll and the full grouped draft/current-build acceptance remain open. Fictional demos do not issue authenticated organization-selection calls or simulate membership failures. Full TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot work remain retained.

Runtime fingerprint: `f9bae50647ab557559374fe264900342b36381a853f905219ceee8f0c9301746`, schema transitionforward-runtime-source-v1, SHA256, 1,144 files; not deployed. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### Freshly Verified Loaded-Record History CSV — October 13, 2026

All six existing Student/Family/Educator/School/District/Partner history readers now offer Export Loaded Activity (CSV). The selection is the active category within the currently loaded records, not an automatic full-history fetch. A dedicated authenticated server reader rechecks organizational membership/cohort where applicable, caller-visible student and every selected event ID against the same student and existing audit RLS. It reads bounded ID batches with exact counts, rejects missing/inaccessible entries, wrong-student IDs and records that no longer match the selected category, and returns no successful partial export. Input permits 1–10,000 distinct valid UUIDs; larger filtered views require a smaller category rather than silent truncation. No mutation, entitlement/role expansion or Owner surface is introduced.

The export response is explicitly projected: student first/last name, School/District or individual record scope, and recorded timestamp/action/type/recorded actor label per selected event. The recorded actor email remains when it is already part of the caller-visible event; otherwise Team member/System mirrors the existing reader. It excludes audit/student/actor/entity identifiers, raw metadata, embedded document text and signed-link fields. This is a personal-data file containing the permitted student name and recorded actors, not an anonymized dataset. The caller client and RLS remain authoritative; separate reads are not a transactional snapshot and do not promise instantaneous revocation enforcement across a concurrent request.

CSV headers use Title Case and describe selected category, loaded/exported counts, UTC export time and whether older activity was available when loaded. A plain note says this is selected permitted loaded-view data, not a complete lifetime record. Unknown-category events are labelled Other Activity rather than invented classification. Category/actor rules share an extracted helper, and common document event codes use precise plain-language labels on screen and in CSV. Access-link creation or denial is not described as a confirmed document view. All cells share the existing CSV quoting/formula defense, with UTF-8 BOM and CRLF. The browser creates the file locally after the fresh response; no export data is sent to an external provider or saved on the server. Blob URLs are revoked after a short download-consumption delay and anchors are removed.

The export is disabled for initial load/failure, older-page loading, empty filtered records, concurrent export or a selection beyond 10,000 entries. Student/category/departure changes suppress obsolete file creation; generic export failures preserve the current records and allow retry. Category changes clear stale failure messages. The Family demo purpose text now explains this product behavior; its fictional example and role/permission/destination inventory remain unchanged. A dedicated fictional demo download and branded printable history remain open. CSV is a data extract and has no PDF/logo watermark; no document print-layout completion is claimed.

Evidence: 36 added synthetic cases: 11 actual handler/query-model checks (1,203 records, complete IDs/minimal projection, wrong student/scope, removed membership, missing counts/batch errors, changed category, validation bounds and actor fallbacks), 11 CSV content/escaping/projection/plain-language cases, and 14 shared/actual-six-role UI download cases. Existing scoped-history, keyset, navigation, recovery and role-gate assertions remain. Current full suite: 221 files / 2,291 tests; TypeScript and diff checks pass. Transport/auth are mocked and downloads use intercepted Blob/anchor fixtures; these checks do not prove hosted RLS, live performance or native browser download acceptance.

Next: branded print/PDF history and explicit fictional demo export from this projection, followed by the existing dashboard/report bounds, main-demo field parity and grouped PR/current-build acceptance work. Full TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot notes remain retained.

Runtime fingerprint: `5307452b2562333ed6eef656fea997829fc923a43283b200911c5b3d06429a76`, schema transitionforward-runtime-source-v1, SHA256, 1,146 files; not deployed. No merge, deploy, migration, publication, live AI/provider call, account/role change or production action. The automatic local-edit permission review timed out once; the authorized retry completed, with no action-policy rejection or unresolved approval.


### Shared Printable History and Fictional Demo Exports — October 13, 2026

The six existing history roles now prepare an Activity History preview using the same verified export projection as CSV. Preparation rechecks caller-visible student/events and applicable School/District cohort; Print or Save as PDF rechecks that selection again before updating the same visible document and calling native print. The records are still the selected category from loaded history, with the existing 10,000-record bound, not an automatic archive. Raw identifiers/private event metadata remain excluded; permitted student names and recorded actors remain. Closing the dialog increments the request generation, prevents late responses reopening it and cancels pending font/image work. Student/category/route changes discard departed work. Overlapping print preparation is disabled, missing assets produce a generic error instead of an incomplete print, and native print cancellation permits another explicit attempt.

HistoryDocument supplies the actual preview and print content: approved branding, distinct Title Case section bands, aligned two-column scope facts, a readable activity/detail table, UTC dates preserving source fractional precision, and repeating student/activity context on continuation pages. It uses the shared DocumentPrintHeader, DocumentWatermark and page-counter rules with scoped history isolation. Body text is 12 points in print, the small faint approved logo repeats at the top right, and the table heading reserves watermark clear space. Individual dialog CSS translate/scale/rotate values are reset as well as transform; native review caught and corrected the initial print-only clipping. Print removes site navigation, history background and dialog controls rather than leaving hidden layout gaps. No unrelated document or dashboard layout is changed.

The existing Family demo history page now offers local fictional CSV and print previews using the same renderer. Its three events are tied to the selected Sam/Riley/Jordan profile and contain only labelled fictional actors. Both the document and CSV carry a fictional-sample notice; no authenticated reader, provider call, account change or stored record is involved. Profile-key changes unmount the prior preview. The demo purpose snapshot changes only guidance, preserving roles, permissions and destinations; no new Owner or unsupported role demo history surface is added.

Evidence: 16 additional synthetic cases (nine actual shared/six-role preview/print access, cancellation and missing-asset cases; five complete/escaped/identity/timestamp renderer cases; two local demo preview/download cases). Current full suite: 223 files / 2,307 tests; TypeScript and diff checks pass, and final purpose-only inventory checks pass. Native Chrome fixtures use the actual HistoryDocument/print styles, a synthetic dialog wrapper and intercepted approved local assets. At 375/1280 screen widths the document has no horizontal overflow. The one-page fictional sample and 60-record/11-page long-name/contact fixture retain every supplied row/contact, fractional times and page counter, meet half-inch margins/12-point body, and have a top-right vector watermark on all twelve pages. All pages were rendered and visually inspected; the final contact sheet and PDF geometry/text checks show no clipping, overlaps, blank pages or leaked navigation. This is not hosted auth/RLS or a real signed-in print-dialog acceptance run.

Reproducible native entry: tests/e2e/history-document-native-check.cjs. Current synthetic evidence: /private/tmp/tf-history-native/evidence.json and pdf-checks.json. Shareable fictional preview: /Users/caysi/.codex/visualizations/2026/09/29/01a0eaa6-3c68-7720-9bc5-0c9c82e24bbd/output/pdf/transitionforward-fictional-activity-history.pdf and its PNG. The source runtime fingerprint excludes tests/docs/artifacts; no hosted parity is inferred from these files.

Related finding retained for the next bounded fix: the separate student-profile AuditTrailPanel still skips loading when entries already exist, does not reset them on studentId changes, turns failed reads into an empty-looking state, and has no recent-50 guidance/late-response guards. Apply the existing history reader safeguards there without adding new role permissions. Dashboard 200-row/member-owned fallback and other reporting boundaries, main-demo field parity, filtered/hash returns, actual async height/scroll and full grouped PR/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot notes remain retained.

Runtime fingerprint: `141e946f5b02c5278a5046f507d6c2f5d933b973af3ce8843e890229afb77e28`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files; not deployed. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### Student-Profile Activity Reader Safeguards — October 14, 2026

The existing StudentPlanningTools team section now uses a student-keyed AuditTrailPanel. Changing students immediately removes loaded rows, errors and expansion state; the newly selected panel starts closed and reads only when expanded. Collapse/reopen rereads even a previously empty result. Cancelled effects ignore late successes/errors after student changes, collapse or unmount. Current failures show a generic Retry action and are distinct from a successful empty recent view. The toggle exposes its expanded state and controlled content to assistive technology.

The panel keeps the existing authenticated caller/RLS endpoint and limit of 50 recent records. Guidance explicitly describes that limited view rather than a complete activity archive. Known event labels share the history reader's plain-language mapping, including the distinction between an access link being created and a document being viewed. Permitted recorded email remains visible; unknown actors use Team member/System rather than a raw identifier snippet. Private metadata and raw identifiers are not displayed, and invalid timestamps show an unavailable-time message. This change applies wherever the existing shared student-profile panel is allowed; it adds no dashboard, role entitlement, export or database permission. Owner remains management-only.

Evidence: twelve focused synthetic component cases cover lazy reads, current-student request shape, accessible toggle, loaded/pending student changes, collapse/reopen races, failed-read retry versus empty, unmount, StrictMode, missing selection, actor labels and unavailable timestamps. Full suite: 224 files / 2,319 tests; TypeScript and diff checks pass. These are mocked transport/component checks, not signed-in browser or hosted RLS acceptance.

Current local runtime fingerprint: `13cb66b9a3ee4c4354a3e6aa8fd1d40b755f862c17e743feb99cb466ee57d72a`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files. Not deployed. Next bounded review: School dashboard 200-row caps and member-owned fallback, followed by other dashboard/report boundaries. Main-demo parity, filtered/hash returns, actual async page-height/scroll and full grouped draft/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot scope remain retained. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### School Dashboard Cohort and Complete Counts — October 14, 2026

The shared getSchoolDashboard response now loads the complete counted caller-visible admin memberships, organization choices, selected-school team/profiles, assigned-school students, Pathway Report rows and document rows. Reads use stable ID ordering and the existing counted page helper; ID filters are batched at 100. Short server pages are continued, failed/missing-count/premature-empty/changed-count reads fail generically rather than appearing as empty setup or zero metrics. Explicit unavailable organization selections are rejected before student reads instead of silently selecting another organization. Successfully empty admin membership still returns the existing setup state.

The roster is limited to students whose organization_id matches the selected authorized organization. The previous staff-owner fallback and 200-student cap are removed, so personally owned students in another school or with no assigned organization cannot inflate this school snapshot. Every read still uses the authenticated caller client/RLS; no service-role read, membership/role change or access grant is introduced. Existing School overview, hub and tools that consume this shared dashboard response inherit the correction. Existing eligible organization types and role checks are preserved. Other roles do not receive School entitlements; Owner remains management-only.

Report records remain a version-inclusive count. A separate students_with_report field supplies the student coverage percentage, so five report versions for one of two students show five report records and 50% student coverage. The live preview labels the percentage Students With Reports and omits it if the separate metric is unavailable; it never substitutes version count as coverage. Existing student report fields and source data are preserved.

Evidence: 24 standalone synthetic handler/preview cases, including 1,103 selected-school students, 1,407 reports, 1,807 documents, 504 eligible organization choices, 1,104 selected-team memberships, bounded profile/event filters, short pages, cross-school/unassigned staff-owned exclusions, unavailable/inactive/member-only scopes, empty states, query failures/missing counts, changing counts and report-version coverage. Existing insight/scope assertions remain untouched. Full suite: 225 files / 2,343 tests; TypeScript and diff checks pass. Query transport/auth middleware are mocked; these checks do not establish hosted RLS, signed-in acceptance or source parity. Counted reads remain separate queries, not an atomic snapshot; same-count replacements and changes between filter batches can escape detection.

Current local runtime fingerprint: `9f338e1a0ff7c02bbcc6abfa1264c3fbdaa9c71707ece1df8e392850bc0cd04a`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files. Not deployed. Next review: District dashboard aggregate/membership/profile read bounds and explicit unavailable selection; legacy School readiness/list-report boundaries and personal next-action widget scope/limits remain open. The School demo Report Completion preview still presents fictional completion-stage/blocker statistics that are not backed by this live dashboard payload; reconcile its source contract before claiming demo/live parity. Other-role reporting boundaries, main-demo parity, filtered/hash returns, actual async height/scroll and full grouped draft/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/snapshot scope are retained. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### District Dashboard Complete Aggregates and Saved Scope — October 14, 2026

The shared getDistrictDashboard now uses complete counted pages for the authenticated caller's active administrator memberships, eligible district choices, child organizations, selected district team, associated profiles, child-school memberships, assigned-school students and their minimal report/action/goal projections. ID filters use the existing 100-ID batching helper; all pages request exact counts and stable ID ordering. Short server pages continue. Failed/missing-count/premature-empty/changed-count reads fail generically instead of producing empty setup or partial totals. An explicitly requested district that is unavailable, missing or not a district is rejected rather than replaced with a different district. Successfully empty unselected setup remains supported.

The existing District access model is preserved: caller-authenticated membership authorization precedes the existing privileged aggregate reader. This is not a claim that all District reads use caller RLS. The cohort remains students assigned to child organizations; direct-district, unassigned, other-district or merely staff-owned students are excluded. Student names, private report content and individual goal/action details are neither selected for these aggregates nor returned. Existing permitted district team names/emails and role metadata remain. Existing aggregate School/District/Partner and personal planning roles retain their permissions; no entitlement or route is added, and Owner remains management-only. District overview, hub and reader tools that consume this shared response inherit the fix.

School staff-role totals now count only active memberships; invited/suspended/removed memberships no longer inflate administrator or educator totals. Existing inactive/pending response buckets remain unchanged in this bounded fix. Report-version totals and distinct-student coverage remain separate through the established count helper, and completed action/met-goal handling is preserved.

Evidence: 36 new standalone synthetic handler cases, including 151 child schools, 1,421 students, 1,907 report versions, 1,807 open actions, 1,707 active goals, 504 eligible district choices and 1,104 district team memberships. Checks cover short pages and bounded filters, caller authorization before aggregate access, unavailable/inactive/member-only/wrong-type selections, successful empty states, failures/missing counts at all ten read stages, changed counts, premature empty pages, cross-cohort exclusions, active staff totals and minimal response fields. Existing School/history scope tests remain intact. Full suite: 226 files / 2,379 tests; TypeScript and diff checks pass. Auth/query transport are mocked; hosted permissions, live data, current-build acceptance and source parity are not established. Counted reads are separate queries, not an atomic snapshot; same-count replacements or changes between batches may not be detected. Concurrent role revocation still needs hosted/transactional acceptance review.

Current local runtime fingerprint: `6c96eca6339d6086b2c681593b3ebc545330a4dad3e3a3e2de895206095be89e`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files. Not deployed. Next: legacy School readiness/list-report reader bounds and failure/access semantics, then personal action-widget scope/limits and other reporting boundaries. The inherited School/District pending buckets include all non-active statuses; review labels/status presentation before treating them as actual pending invitations. School demo report-status fields, broader demo/live parity, filtered/hash returns, actual async page-height/scroll and full grouped draft/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/Pathway Report snapshot work are retained. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### School Report and Readiness Reader Safeguards — October 14, 2026

listSchoolReports and getSchoolReadiness now check the caller's selected-organization active admin/owner/school_admin membership before the existing privileged index/aggregate reads. Failed membership checks and unavailable membership are errors, not successful empty lists or zero readiness. Assigned-school rosters and related report/action/goal rows use complete exact-count pages with stable ID order and 100-ID batches; short pages continue and failures/missing counts/changing counts/premature empty pages reject incomplete results. Staff-owned other-school/unassigned students are excluded by the assigned-organization cohort. Successfully empty authorized schools and genuinely empty record sets retain their true zero results. This preserves the existing aggregate/index access model; it is not a claim that every read uses caller RLS or grants private document access.

The report index removes its 100-record limit, retains the existing permitted student-name/record-ID/time metadata projection and never selects report content. Recombined batches sort globally newest first with full fractional timestamp precision, equivalent timezone offsets and an ID tie-breaker; invalid recorded dates fail instead of implying a valid order. Original timestamps remain unchanged. The actual School Reports page labels its displayed count separately from the full returned count and shows more records in 25-row increments. A new load resets the preview count. Individual report links still use their existing student/document access rules. Existing combined-report loading/retry/scope/export guards are preserved.

The actual School Implementation scorecard is keyed to the selected school, clears accepted metrics on scope changes, ignores late/cancelled/unmounted responses, catches failures and offers a current-school retry instead of an endless spinner or old-school result. Its effect includes the current server function and retry attempt and handles StrictMode replay. Zero coverage draws a zero-width bar. The majority-report milestone uses distinct students_with_report rather than report versions and does not infer an active/approved report status. CompletionRingsBoard no longer supplies fictional grade percentages/blockers by default to its sole live School caller; without actual cluster data it gives an unavailable-data message. Supplied recorded clusters retain their existing rendering. No role entitlement or route is added; Owner remains management-only. Current source usage is School Reports and Implementation, while the remaining shared implementation follow-up also needs District review.

Evidence: 35 new standalone synthetic server cases cover 1,107 students, 1,409 authorized report-index rows, complete aggregate coverage and open-action averages, short pages, cross-school exclusions, all read-stage failures/missing counts, denied/failed authorization before aggregate access, genuine empties, changed/premature-empty rosters, global/fractional report order and minimal output. Nine actual Implementation component cases cover failed-read retry, immediate and pending school changes, superseded errors/successes, unmount, StrictMode, genuine zero display, version-safe milestones and absence of default fictional grades. Two added actual School Reports cases cover 25/50-of-125 browsing and report-index failure recovery/export disabling. Existing scope assertions and role/report recovery cases are preserved. Full suite: 228 files / 2,425 tests; TypeScript and diff checks pass. Auth/query transport and outer page shells are mocked; these checks are not hosted role/RLS acceptance, native layout or source parity. Index metadata includes permitted names and identifiers and is not anonymous. Counted reads remain non-atomic; same-count replacements, changes between batches and concurrent revocation need the existing hosted/transactional acceptance review.

Current local runtime fingerprint: `1a66cc0aeda319d616843ec67d0f2ea41557124b4a3fbcdd4ed8728f2b8c82b7`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files. Not deployed. Next: audit the shared School/District Implementation defaults and claims. TrainingScheduleCard seeds dated sample sessions into browser-local storage; ReportingDeadlinesCard uses hardcoded reporting dates without verified source authority in this review; staff progress uses fixed 100/25 values and some milestone wording implies usage/onboarding without measured usage. Preserve entered schedules and verify authoritative reporting requirements before replacing those defaults or making compliance claims. Then continue personal action-widget scope/limits, non-active membership labels, School demo report-status fields and other reporting boundaries. Full main-demo/live parity, filtered/hash returns, actual async height/scroll and full grouped draft/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/snapshot scope remain retained. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### Shared Implementation Schedules, Access and Reporting Guidance — October 14, 2026

School and District now share a scope-keyed TrainingScheduleCard editor that starts empty when no browser-local schedule exists. Loading or switching scope never writes storage; accepted saved rows, extra fields and the original storage keys are retained. New scope selection discards old displayed rows and unsaved form state without copying records across organizations. Only an explicit add/remove writes the current scope. Malformed JSON/rows, duplicate IDs, invalid dates and blocked reads are errors, not empty success or a replacement schedule. Mutations are disabled until a successful reload. Failed writes retain recorded rows and form input for retry. A comparison with the last accepted raw record detects intervening browser-storage changes before writing; explicit reload is required instead of overwriting newer data. This reduces lost updates but is not an atomic cross-tab lock or cloud synchronization.

Existing rows matching the earlier seeded-example shape remain intact and are labelled Earlier Example — Confirm Details, rather than silently removed or promoted to real training. Date badges say Past Date/Upcoming Date, never Delivered based solely on the calendar. New unentered audience/location values are shown as not recorded, not invented. Inputs have instance-specific accessible IDs. The UI explicitly says schedules are saved only in this browser and are not shared with the team. Personal-browser/account isolation, collaborative persistence and richer recovery for malformed stored data remain separate product decisions; no database or account operation is introduced.

Both actual Implementation pages map recorded membership statuses, preserving Active/Invited/Pending/Suspended/Removed/Inactive and labelling unexpected values unavailable. Existing active/pending colors are retained. Fixed 100/25 onboarding percentages are removed; training progress is Not recorded unless a valid value is explicitly supplied, and supplied zero progress/milestones draw zero width. Added dates describe membership records, not acceptance/training completion. School and District milestone wording states only evidenced workspace/member/student/document/report counts. District stages describe their actual active-staff and distinct-student report-coverage thresholds instead of claiming regular use, a full staff team, or an administrator in every school from one active school. Owner remains management-only and no role gate/route/access entitlement changes.

ReportingDeadlinesCard removes the fabricated recurring dates and due/overdue claims. Both roles show that confirmed workspace reporting dates are not connected and provide verified official Connecticut links: [CSDE Data Collections Guide and Calendar](https://portal.ct.gov/sde/performance/data-collections-guide) and [Connecticut SPP/APR](https://portal.ct.gov/sde/special-education/state-performance-plan-spp-and-annual-performance-report-apr). The related-resources page links to the data-collections guide, which currently lists reporting-year calendars; no state reporting date is converted into an assumed district-specific deadline. Organization-confirmed due dates, responsibilities, collection applicability and policy workflows remain open. Sources were read on October 14; this is a linked reference, not a legal/compliance certification.

All four School/District Implementation demo descriptions now explicitly separate their fictional rollout examples from the signed-in recorded access/coverage tool, and state that training progress/compliance dates are not inferred. Fictional numbers, owners, role gates, destinations and the Lovable Your Dashboard Widgets heading are preserved. The inventory snapshot changes only two primary purpose strings; all role/scope assertions remain. Full demo Implementation renderer/source parity and the other demo report-status models remain open.

Evidence: 28 synthetic shared-card/storage cases plus six actual School/District role-page/wiring cases. These cover untouched fresh/legacy storage, scoped switching, explicit add/remove, malformed/blocked reads, failed saves, external changes/reload, legacy examples, accessible inputs, membership labels, missing/invalid/zero progress, source links and both role pages' factual milestones/stages. Existing School scorecard tests retain their assertions and import the real membership-status helper while continuing to stub the unrelated table. Full suite: 230 files / 2,459 tests; TypeScript/diff checks pass. Two initial runs suffered unrelated clock/timing stalls; the unchanged full suite passed in 30 seconds with a temporary process-only idle-sleep guard, without changed timeouts/assertions. The final color-preservation-only adjustment passes all 34 focused cases. Auth/outer shells and browser storage are synthetic; hosted permissions, real schedules, native layout, current-build acceptance and hosted source parity are not established.

Current local runtime fingerprint: `a83d9765d344f9633fe5749d7ce054452ad9d1b07a30e916cc6651c1a0e85d00`, schema transitionforward-runtime-source-v1, SHA256, 1,150 files. Not deployed. Next: personal action-widget scope/limits, then remaining non-active membership/invitation labels in School/District dashboard/team/hub previews, School demo report-status fields and other reporting boundaries. Shared schedule persistence/confirmed-deadline features, full main-demo/live parity, filtered/hash returns, actual async page-height/scroll and full grouped draft/current-build acceptance remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/snapshot scope are retained. No merge, deployment, migration, publication, live AI/provider call, account/role change or production action.


### Organization Action Widgets, Viewer Boundaries and Membership Labels — October 14, 2026

School and District action widgets no longer consume the generic personal-action/derivation feed. The new getOrganizationWidgetActions POST reader validates the requested role/organization, verifies active caller admin/owner membership, checks the caller-visible organization and requires district type for District requests. It then reads only caller-owned, caller-readable stored active actions for that organization and role (or unassigned owner-role), with complete counted pages and stable priority/update/ID order. No privileged client, personal report/meeting/evidence derivation, mutation or new entitlement is used. Failed/denied/unavailable/incomplete scopes are errors rather than empty success. The preview returns at most five supported-tool entries plus their full matching count; it is not an archive or an organization-wide staff action feed. A workspace without recorded caller-owned actions can genuinely have no preview entries.

Destinations must be registered tools for the requested organization role. Unsupported/external/mismatched-scope paths are omitted rather than sent to a generic dashboard fallback. Links carry the selected org_id/district_id, a valid requested history student selection and page anchor; arbitrary redirect fields are not carried. Actual router cases verify that the target gets the supplied selected scope even when the current page had another scope. Individual history/tool readers still enforce their own student/organization permissions. The calendar's existing preview-first navigation rule is preserved. School calendar is now explicitly included in the central audience map to match its existing School/Admin route gates; this adds no access. District overview and hub now supply their resolved district ID and suppress unselected/loading organization previews. Organization widgets omit the unrelated generic personal Open Tool link, while each supported action still connects to its actual tool.

All live widget preference/calendar/action caches now include the signed-in viewer; action caches also separate roles and available student/organization context. Reads wait for resolved sign-in. Personal previews suppress rows for a different explicitly selected student and label their recent five-item window. Current personal/organization action responses carry the authenticated viewer ID, and a response for another viewer is rejected before presentation. The shared useAuth hook ignores initial session reads after newer auth events or unmount, handles read errors without leaking details and prevents a late snapshot restoring a signed-out account. Existing server authorization/role rules remain authoritative; cache identity is not a permission grant. Signed-out/changed-viewer widgets cannot show the prior actor's query rows. Broader response-identity/concurrent-token acceptance for other readers remains open.

The shared widget view offers Try Again on failed reads instead of an empty-action claim, preserving existing contrast/readability requirements. School/District demo widgets use the same view, remove the unrelated generic action-tool link and explicitly label fictional organization actions. Their fictional profile-based examples are preserved; actual previews depend on recorded caller-owned actions and complete demo source/creation-workflow parity is not claimed. The owner-edited Your Dashboard Widgets heading is retained, and Owner has no widget role.

School/District dashboard/hub summaries now describe non-active membership totals as Other Memberships rather than claiming they are pending invitations. Actual team lists retain Invited/Pending/Removed/Suspended/Inactive/Unavailable status through a shared pure helper. School exposes its existing Approve action only for invited/pending rows; removed or suspended records cannot be mistaken for invitations. No membership mutation handler, role grant, account record or automatic restoration changes. The original save-departure fixture now supplies its missing invited status and retains every original target/completion assertion. Fresh status/concurrent approval validation and a deliberate restoration workflow remain separate management review items.

Evidence: 26 synthetic organization reader/destination cases, 15 widget cache/selection/actual-router/error/viewer cases, nine actual team/status eligibility cases and five auth ordering cases. The reader fixture includes 603 in-scope records, short pages, invalid destinations before valid rows, cross-user/role/organization/completed exclusions, all-stage failures, missing/changed counts and premature empties. Existing all-role calendar/timezone assertions now retain every role/student/organization/timezone field plus the viewer key; calendar-only mocks use a synthetic action reader. The contrast assertion is preserved. Full suite: 234 files / 2,514 tests; TypeScript/diff checks pass. Auth/transport/outer-shell fixtures are explicit and synthetic; they do not prove hosted JWT/RLS, native page layout, current-build acceptance or either site's source parity. Counted reads are non-atomic; same-count changes/concurrent authorization changes require the existing hosted/transactional acceptance review.

Current local runtime fingerprint: `4be3140694d1d2fe7c789ef82030e719b2fbd18b2053aefb300ec2de25d23540`, schema transitionforward-runtime-source-v1, SHA256, 1,152 files. Not deployed. Next: audit the retained getNextActionsForMe personal feed across Student/Family/Educator/Partner: its 50 stored-action and smaller derived-source caps, ignored query failures, per-role eligibility, selected-student data completeness, report/meeting/evidence destination validity and truthful derivation wording. Its record/derivation semantics are unchanged here; only the viewer identity tag is added. Organization action-record creation/management, concurrent approval/restoration, other reporting boundaries, full demo/live source parity, shared schedule persistence, confirmed organization reporting dates, filtered/hash returns, actual async height/scroll and full grouped draft/current-build review remain open. Full TF-01–TF-26/six milestones and deferred parent-pilot/snapshot work are retained. No merge, deployment, migration, publication, live AI/provider call, real account/membership/role change or production action.


### Personal Action Read Reliability — October 14, 2026

The retained Student/Family/Educator/Partner personal feed now requests complete counted, uniquely ordered caller-visible stored actions, draft reports, pending invitations, upcoming meetings and students. Evidence links use bounded student-ID batches and complete counted pages. Stored actions remain explicitly caller-owned; all derived reads retain the existing caller Supabase/RLS and status/time filters. No privileged read or access expansion is added. Missing/changed counts, premature empty pages and query failures reject the feed rather than becoming false zero totals or missing-evidence suggestions. The existing widget error/retry state receives these failures. The standalone Next Actions card also waits for resolved sign-in, keys its cache by viewer, rejects mismatched viewer responses and offers Try Again instead of displaying an empty claim after a failed read.

Dedupe now requires an active stored action with the same kind/student/organization and related record; separate reports or meetings for one student remain visible, and a completed action cannot suppress a new pending suggestion. Invitations without a related-record identity stay distinct. Report suggestions link to the registered /reports/$reportId reader. Drafts, invitations and evidence gaps no longer imply a due date that was never recorded; meeting urgency uses the existing recorded scheduled date. Invalid stored due dates do not produce NaN labels. Evidence wording describes links visible to the caller, not an absolute absence of evidence. The five-item dashboard preview and three-item recently completed strip remain presentation windows rather than database limits.

Evidence: 12 synthetic server cases cover 603 caller-owned records with short pages, another owner's exclusion, distinct/completed report identities, invitations/student evidence beyond old caps, failures at every source including profile/evidence, missing counts and invalid dates. Four synthetic consumer cases cover failed-read retry, mismatched viewers, unresolved sign-in and sign-out cache suppression. Existing tests are retained. Full suite: 236 files / 2,530 tests; TypeScript and diff checks pass. Local fingerprint: `334ad29baca75e954069d8188a3461b085ab656ee9905f3a4864c08cb1559423`, SHA256, transitionforward-runtime-source-v1, 1,152 files. Not deployed. Mocked transport/auth/card presentation do not prove hosted JWT/RLS, real role eligibility or current-build acceptance. Reads are non-atomic; same-count replacements and concurrent access changes still require acceptance review.

Next: validate derivation eligibility and stored/derived destinations for each personal role, invitation-type acceptance destinations, selected-student derivation scope and Student hub context, evidence/report handoffs, and standalone mutation freshness. Partner must not inherit planning tools it cannot use; Owner remains management-only. Full demo/live parity, organization action creation/fresh approval/restoration, School demo report statuses, full grouped review and all existing TF-01–TF-26/six-milestone release gates remain open. No merge, deployment, migration, publication, live AI/provider call, real account/role/membership change or production action.


### Personal Action Role Eligibility and Destinations — October 14, 2026

The personal action reader now loads complete counted, caller-filtered recorded user roles through the existing caller Supabase/RLS. It validates an optional Student/Family/Educator/Partner role request against those records. Widgets pass their exact personal role instead of inheriting an arbitrary multi-role default. Standalone reads use an explicit personal role priority (Educator, Family, Student, Partner); unknown and organization-only roles do not derive personal actions. A platform-admin role always returns an empty personal feed, including accounts with secondary personal roles: Owner remains management-only. No new entitlement, privileged role lookup or mutation policy is introduced. Failed role reads fail closed. Legacy authenticated role aliases retain the shared role-policy mapping.

Student derives only visible draft-report suggestions, without querying meetings, invitation/profile or evidence/student sources for Family/Educator tasks. Partner derives no personal planning suggestions and retains only caller-owned, role-matching stored actions with a registered permitted tool destination. Family invitations remain Family-only; Educator retains report/meeting/evidence sources. Stored owner-role aliases are normalized before presentation. A shared helper accepts only same-origin relative destinations in the existing registered role policy, plus the actual single-record report/meeting readers mapped to their existing parent policy. Unlisted destinations are rejected rather than inheriting the central policy's default-open behavior; external, protocol-relative, backslash, missing and cross-role routes are excluded. Unsafe secondary links lose their label/link, and missing primary tools never gain an invented dashboard fallback. Hash anchors remain; arbitrary query payloads are stripped. Validation occurs before dedupe so an unusable stored action cannot hide a valid report suggestion.

Evidence: 13 additional synthetic server cases cover failed/invalid/unauthorized roles, Student/Partner/School/District/Owner/unknown source exclusions, multi-role Owner and requested-Partner behavior, unusable stored-action dedupe and cross-role/secondary link rejection. Twenty helper cases cover real report and meeting destinations, per-role exclusions, malformed/unsafe paths and query payloads. Four widget cases verify explicit role transport and selected-student/global preview filtering for Student/Family/Educator/Partner. All previous 12 reliability assertions and other scope coverage are retained; their fixture now supplies an authenticated parent role and executes the actual validator. Full suite: 237 files / 2,567 tests; TypeScript and diff checks pass. Local fingerprint: `2a63eab1b61f6a62f2dc9a6c5635ccbe47a8134526741d848d06a0968d80956c`, SHA256, transitionforward-runtime-source-v1, 1,153 files. Not deployed. Mocked role/transport/view fixtures are not hosted JWT/RLS or current-build acceptance.

Open handoffs are explicit: general invitations use the invitations table and token-based /invite/$token route, while the existing Family inbox uses student_collaborators and a separate acceptance flow. Its general invitation suggestions cannot yet be claimed as working inbox handoffs. Tokens are not readable by the authenticated role; do not invent tokens, add privileged access or claim invitation review is complete. The evidence attachment panel exists but is not mounted in a live tool; the current /reports suggestion does not yet provide an attachment workflow. These two legacy handoffs must be resolved or removed from actionable suggestions in the next pass. Selected-student filtering is verified at the widget presentation layer; server-side selected-student derivation scope and Student hub's unresolved student context remain open. Record-level access remains enforced by tool readers/RLS, not by URL eligibility. Other registered tool category checks, standalone mutation freshness, query/filter restoration, full main-demo parity and grouped current-build review remain open. All TF-01–TF-26/six-milestone and deferred parent-pilot/snapshot work remains retained. No merge, deployment, migration, publication, live AI/provider call, real account/role/membership change or production action.


### Supported Action Handoffs and Server Student Scope — October 14, 2026

Removed only the unsupported automatic general-invitation and evidence-gap suggestions from the personal feed. A general invitations-table record requires its secure emailed token and cannot be reviewed through the student_collaborators Family inbox. The evidence panel is not mounted in a live tool, so the reports list cannot provide the promised attachment controls. The reader no longer queries profiles, general invitations or report_evidence_links to manufacture these tasks. No invitation, collaborator, student, report, evidence-link or stored-action record was deleted or modified; existing emailed invitation acceptance, Family collaborator inbox and evidence server functions remain intact. A real general-invitation inbox/handoff and a mounted authorized evidence workflow remain product work, not completed features. Draft-report and recorded upcoming-meeting suggestions remain supported. Stored action semantics/category review is still separate from registered route eligibility.

Personal widgets pass their optional selected student alongside their explicit role. The server validates a UUID and requests a complete counted minimal caller-visible student lookup before reading actions or planning sources. Unavailable students and failed/incomplete reads produce an error, not a silent fallback or an empty-action claim. For a valid selection, the stored query remains caller-owned and adds selected student OR null-student global scope; derived report/meeting queries add the same student filter. Completed actions use that same narrowed source. Without a selection, the existing role-scoped caller-visible feed remains. Student/Partner/Owner source exclusions and role checks from the previous checkpoint are retained; there are no new privileged reads or entitlements. RLS/tool authorization remains authoritative and the reads are non-atomic.

Evidence: eight added synthetic server cases cover all four personal roles, minimal student checks, pre-return database filters, global-action preservation, other-student and other-owner exclusions, unavailable/malformed selection, legitimate empty scope and scoped completed actions. Existing four role-widget tests now retain role and selected/global/other-student assertions and additionally assert selected-student transport. The previous unsupported invitation/evidence fixture now checks their omission and absence of unnecessary source reads, while adding complete supported derivation coverage with 12 reports and seven meetings through two-row pages. Supported read failures retain rejection assertions; obsolete-source failure cases assert the source is never queried, and student failure exercises the new selected-student authorization lookup. Other ownership/role/paging/dedupe assertions are retained. The two evidence-priority assertions are unchanged; their comment now identifies reserved future workflow priorities rather than claiming a removed implementation mirror. Full suite: 237 files / 2,575 tests; TypeScript and diff checks pass. Final no-behavior import/comment cleanup was rechecked with 35 focused tests. Local fingerprint: `04648ac661cd4ff0aabb01fb40f164e29aa22e96173fe282c395a088c0bf7b88`, SHA256, transitionforward-runtime-source-v1, 1,153 files. Not deployed. These synthetic transport/RLS fixtures do not prove hosted acceptance or source parity.

Next: resolve Student hub's current-student context, audit stored action meaning against actual tool workflows and review standalone mutation freshness. Build the real invitation/evidence handoffs with appropriate consent, role and freshness checks before restoring automatic tasks or demo claims. Current widget error/retry retains the selected scope; broader selection recovery and exact query/filter/hash restoration remain open. Full grouped draft review, main-demo/live parity, organization action creation/fresh approval/restoration and all TF-01–TF-26/six-milestone requirements, including deferred parent-pilot/snapshot work, remain retained. No merge, deployment, migration, publication, live AI/provider call, real account/role/membership change or production action.
