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
