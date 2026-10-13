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
