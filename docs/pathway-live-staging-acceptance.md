# Protected Pathway live-staging acceptance

## What this package proves

This package is the repeatable, protected acceptance test for the real signed-in Pathway workflow. Cloudflare remains the ordinary staging control plane and must serve the exact tested SHA. The live AI browser flow runs only on the separate Lovable-hosted staging application connected to isolated Supabase project `qgrertkqbwanerqqemph`. It creates one AI-generated report from synthetic data, proves the intended cross-role access, and removes the generated records afterward.

| Role     | Acceptance proof                                                                                                                                                                 |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Family   | Opens the real eight-step intake, uses the authorized Robin Staging profile, submits detailed synthetic inputs, receives a saved report, and sees it in the Family Pathway view. |
| Student  | Sees the linked report in My Pathway and can open the report because the synthetic student account is linked to Robin Staging.                                                   |
| Educator | Receives a temporary synthetic editor relationship, sees Robin in the real intake, and can open the linked report.                                                               |
| Partner  | Is redirected to the Partner Workspace when attempting either the Pathway builder or the private report. No student report is rendered.                                          |

The database verification also confirms that the report and intake share the same authorized student, the Family user owns the created rows, the structured assistive-technology/accommodation/evidence fields reached persisted intake data, and the report contains a non-empty AI result.

## Safety boundaries

- Manual `workflow_dispatch` only; pull-request code cannot run the live test.
- Protected GitHub `staging` environment only.
- Main branch only, after the exact commit has been deployed to staging.
- Cloudflare remains the ordinary staging control plane at `transitionforward-staging.caysi101.workers.dev`; its exact SHA, isolation verdict, and sandbox identity must pass first.
- The AI browser flow fails closed unless `STAGING_LOVABLE_AI_BASE_URL` names exactly `gentle-forward-reach.lovable.app`.
- The Lovable-hosted target must report the exact runtime-source fingerprint calculated from the reviewed GitHub checkout, staging labels, sandbox Stripe identity, isolated staging Supabase project, `ai_gateway_configured=true`, and `ai_runtime=lovable-managed` before authentication or intake entry begins.
- The runtime-source fingerprint is SHA-256 over the shipped application code, public assets, build scripts, dependency lockfile, and build configuration. It is calculated from the files at build time and cannot be supplied as a manual environment label. Database migrations, CI workflows, tests, documentation, and environment files remain under their separate controls and are intentionally outside this runtime digest.
- Fail closed unless Supabase is exactly project `qgrertkqbwanerqqemph`.
- Exact Cloudflare Git SHA, matching runtime-source fingerprints on both hosts, staging application identity, sandbox Stripe identity, and staging isolation are checked before sign-in.
- `LOVABLE_API_KEY` remains owned by Lovable Cloud. It is never copied to GitHub, Cloudflare, workflow inputs, browser code, or artifacts.
- Only the four synthetic `@staging.transitionforwardct.test` identities are used.
- One report generation per authorized run. The Student and Educator checks reuse that one report.
- The Partner test never receives database credentials and never receives report content.
- No real IEP, student, family, school, or partner information is entered.
- No migration, deployment, Lovable publish, DNS change, payment, or production action is part of this workflow.
- Playwright sessions are deleted and failure artifacts are sanitized before upload.

## Repeatability and cleanup

Each run uses the GitHub run ID in its synthetic intake marker. Before the run, old `QA Pathway` rows belonging to the synthetic staging parent are removed. The suite creates a uniquely named, staging-only educator collaborator row and deletes it after the four role checks. Generated Pathway reports are deleted before their matching intakes.

Cleanup runs in `afterAll`, including when a role assertion fails. GitHub concurrency prevents two protected Pathway acceptance runs from changing the same synthetic fixture at the same time.

## How to run after review, merge, and exact-SHA staging deployment

1. Set the non-secret protected environment variable `STAGING_LOVABLE_AI_BASE_URL` to the exact approved isolated Lovable staging origin. This is configuration, not an AI credential.
2. Confirm the Cloudflare staging Worker serves the exact reviewed `main` SHA and both Cloudflare and the isolated Lovable staging application report the runtime-source fingerprint calculated by the protected workflow.
3. Open **Actions → Pathway Live Staging QA** on the repository's `main` branch.
4. Choose **Run workflow**.
5. Enter `pathway-staging` as the confirmation value.
6. Approve the protected `staging` environment.
7. Record the workflow run ID, exact deployed SHA, and the four role results as release evidence.

## Production-safe reuse

The public health response exposes non-sensitive AI readiness plus a one-way SHA-256 runtime-source fingerprint, its fixed schema, algorithm, and file count. It never exposes a key, credential identifier, source path, source content, environment value, or gateway response. The isolated Lovable staging copy now has its own separate Git-connected repository. Its authentic sync commit differs from the source repository commit; the runtime fingerprint is the cross-repository code-parity proof. Never replace either identity with a manually entered claim.

A future, separately authorized read-only production preflight can use the same fingerprint verifier on the approved production Lovable origin while also requiring the production Supabase identity, live Stripe identity, exact release SHA when the production host is Git-connected, production hostname, and passing production isolation verdict. A mismatch, absent digest, unknown schema, wrong algorithm, or invalid file count fails before authentication or any AI request.

That production preflight must not reuse staging accounts, staging database credentials, or the staging workflow. It does not authorize an AI request, payment, publish, migration, or production change. Any later production AI smoke request remains a separate Owner-only authorization.

This document does not authorize those later steps. The package must be reviewed first, and the current task must not merge, deploy, publish, migrate, or touch production.

## Next acceptance: PPT Family and Educator packets

This is a prepared acceptance plan, not evidence that it has run. Release PR210 to both isolated staging hosts and confirm exact source parity before execution. Use only the named synthetic staging Family/Educator accounts and synthetic student/report fixtures; do not use real IEPs or real student details. Keep credentials in protected staging configuration. No production requests.

- Generate at most one packet per Family and Educator account (two total); no automatic retry or duplicate click. Reuse the same authorized synthetic report context with role-appropriate concerns/outcomes. A failure stops that case for diagnosis.
- Confirm the form exposes labeled report/date/concerns/outcomes controls; each account can select only an accessible report.
- Assess the returned packet against its actual schema: 4–7 agenda topics, 4–8 questions, 3–6 evidence requests, 3–6 scripts, opening and stalled-meeting script. Verify student/report specifics, both Family/Educator perspectives, measurable progress questions, realistic next steps and explicit missing evidence. Do not equate word count or valid JSON with sophisticated content.
- Confirm persisted packet ID and caller ownership, reload the canonical saved URL, and compare saved/rendered content without another generation. Verify another unauthorized synthetic identity cannot load it.
- Inspect print/PDF layout for complete agenda/questions/evidence/scripts, readable page breaks and absence of interactive buttons. Cancel the print dialog if needed; do not assume the existence of a print button proves export quality.
- Verify role-aware return navigation and scroll/state where applicable. Other roles must retain their existing access rules; this plan does not add private planning tools to Student/Partner/School/District/Owner workspaces.
- Remove only explicitly disposable run-scoped synthetic packets/fixtures, audit remaining row counts and sanitize credential-bearing diagnostic artifacts. Record each role result, quality findings, source identity, AI call count and cleanup result separately. Unrun checks remain open.

## PPT execution evidence — October 5, 2026

PR210 release 0ff2f1020a394301695295d9e93a2d0ad9eec41c reached both staging hosts with fingerprint a4ceab280b4686b913a96ff6ef63a470ca7ad603484ca42317b73aeac771efd1 / 1,066 files and passing external isolation. Protected run 37344887842 passed Family and Educator generation, owner/report linkage, saved reload, opposite-account denial and PDF creation. Exactly two generation calls were used without retries. Cleanup completed, including an independent zero-row check for generated PPT packets; report/intake deletion succeeded but no independent zero-count audit is claimed.

Visual review of both four-page PDFs found site chrome/floating controls, marketing footer, an orphaned heading and empty partner setup content. Content review found mislabeled speaker perspective and an unsupported additional-services premise. Technical acceptance passed; content and polished export acceptance remain open. The follow-up is shared for both authorized PPT roles, with no access expansion to other roles. No additional AI call is authorized by this result.

Local follow-up validation: isolated headless browser checks using synthetic Family/Educator content and the actual shared print components passed after detecting and fixing a CSS specificity bug that initially hid document text. Approved logo loaded; navigation, breadcrumbs, footer, floating badge, buttons and setup-only content were hidden. Screenshot review confirmed readable document content. This verifies shared print-media behavior, not complete pagination of each generated export. No AI calls or database writes were made.

Full PPT renderer follow-up: two entirely synthetic four-page PDFs were produced locally from the actual document component and reviewed page by page. All sections were present, each page had its number, text stayed inside safe horizontal margins, and the site footer/navigation/floating badge were absent. A background artifact was corrected and the closing guidance is kept together. Pure presentation extraction preserves guarded route action behavior; content/print/action-delegation regression tests passed. No additional AI, student data or database access. This evidence does not close meeting-summary or Pathway Report pagination.

## Next Bounded Acceptance: Saved Report Restore/Reopen/Export Without AI — Prepared October 19, 2026

The single run described below was subsequently authorized and completed. This original scope is its budget, not standing authorization for another run. Existing Pathway/PPT generation workflows retain their protected-main restrictions and are not used or weakened for this draft candidate.

### Completed Run and Remaining PDF Issue

Human `iWAVYx` approved [protected run 39342506871](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39342506871), test commit `7d01f52fabcabd87c569d1642b62ac64194c27f4`. Identity preflight verified accepted application `58cb564a`, fingerprint `8e13f4ac…8152c30` /1,179 files, isolated backend and sandbox payments. Seven existing synthetic sign-ins and both no-retry owner cases passed (Family 12.0s, Educator 10.7s). Each performed one actual UI Restore/save, reopened earlier content after reload and compared exact version content/actor with versions `[1,2]`. Five ordinary unlinked identities per case received no report rows. Owner could see the queried synthetic ID under the existing admin SELECT exception; this is not an Owner denial pass or private-content read.

Both exact-ID cleanup result files have empty error arrays: report/intake deletion and caller-RLS report/intake/version zero-count readbacks passed. No privileged global absence claim is made. Two PDFs/print screenshots were retained and artifact sanitization passed. Zero AI/provider calls, retries, account/role/relationship/grant changes, migrations, releases, payments or production actions occurred. Evidence is under `/private/tmp/tf211-report-history-acceptance/run-39342506871`, with the run log and human approval beside it.

**PDF layout did not pass visual acceptance despite the green workflow.** Both hosted exports have 35 pages with blank opening/trailing pages. Visibility hides route content but leaves layout space. A new offline regression using actual ReportView with a nested saved-route shell reproduces the breadcrumb/version-panel gap before the correction and passes afterward. Shared print-only isolation removes branches outside the report, flattens ancestor screen wrappers and clears the report root's forced after-break; screen controls/layout remain unchanged.

Local Family/Educator fixtures each produce 29 content pages with no blank pages, top-right logo and complete opening/closing. All pages were rendered and visually inspected, with no text beyond safe page edges. These differ from the hosted fixture records, so the count is not an exact six-page reduction claim. This closes only the reproduced shell gap locally. Long-section continuation context, short orphaned fragments and dense closing typography remain in final document-quality review. The completed one-run budget does not authorize another fixture run.

### Print Correction Released to Both Staging Hosts

User explicitly authorized source `1caf939f3291d9b23b4d529db1cb8e63b61e6bc2` for Cloudflare staging and the existing isolated Lovable staging publication. Automatic exact-head checks passed. Human `iWAVYx` approved [Deploy Staging run 39348405841](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/39348405841); deploy, exact identity and PWA verification passed. Only `ReportBrochurePrintStyles.tsx` was synced to the separate `iWAVYx/gentle-forward-reach` repository from verified `d8e0cf0a` base, producing authentic sync commit `d7d3b03134de7cfa31226661a1b3d1ebaa784c7c`. Environment file hashes, backend bindings, access and builder edits were preserved.

The builder-selected preview matched fingerprint `554c06e8f13e75a8b81e51e994827ec24b76d08a29c585b3cb8c30a7429c4be4` /1,179 files before publication. The existing staging publication was updated through its visible Publish Changes control and confirmed complete. External Cloudflare and stable `gentle-forward-reach.lovable.app` health both match that fingerprint/count, isolated backend and sandbox payments, with isolation true. Private preview aliases intentionally still fail hostname/dev-commit isolation; no protection was loosened. Evidence: `/private/tmp/tf211-release-candidate-1caf939f` (health JSONs, human approval, workflow result, preserved hashes and publication screenshot).

No additional fixture, AI/provider request, migration/grant, account/role/relationship change, payment or production action occurred. Production main remains `0ff2f1020a394301695295d9e93a2d0ad9eec41c`. Actual hosted saved-report PDF recheck remains open; deployment parity is not that acceptance.

Use the existing protected Staging Role Verification workflow's separate `report-history-no-ai` choice only after owner authorization below and its required human GitHub staging review. Default full audits remain read-only. This new choice requires an additional exact `disposable-report-history` confirmation, verified source fingerprint/authentic deployed SHA, isolated Cloudflare host/backend, public-key-only caller RLS, seven existing synthetic identities and one worker/no retries. No service-role/admin key, AI credential or raw database connection is supplied. The application source stays on accepted `58cb564a` /fingerprint `8e13f4ac…8152c30` /1,179 files; test/workflow/docs changes require no application deployment.

### Exact Proposed Write Budget

- Two synthetic intakes and two synthetic reports total: one owned by existing staging Family/Guardian, one by existing staging Educator/Case Manager. Both are unlinked (`student_id=null`), labeled synthetic/demo, and use the existing fictional report sample validated against the real report schema.
- Seed one earlier snapshot per report (two total). Click the actual Restore control once per owner (two total), invoking the real application save handler/atomic history RPC and adding one current-content snapshot per report (at most two more). No extra edit, regenerate, provider, translation or share-generation request is included.
- Five other ordinary identities per case perform ID-scoped RLS read-denial checks against only that synthetic unlinked report. The existing Owner identity records only whether this synthetic ID is visible under the canonical admin SELECT exception; this is not a claimed Owner denial or private-content read. No role, relationship, student, organization, invitation, access code or shared token is created or changed. This is not linked-student access acceptance and does not introduce report tools into management/Partner roles.
- Produce two PDF files plus print screenshots from the actual saved report pages. Verify watermark loads; human/visual page review is still required for symmetry, headings, readability, page breaks, top-right mark and absence of controls. Merely creating a PDF is not polished-export acceptance.
- Delete only the exact UUIDs created or attempted by this run, filtered by the authenticated owner plus synthetic model/intake/marker: report first (versions cascade), then intake. Unknown insert-response outcomes still receive scoped cleanup. Never delete old QA markers or arbitrary fixtures. Check successful deletion responses and caller-RLS zero-count readbacks for those IDs. **These readbacks cannot prove global absence of rows hidden by RLS**; no privileged cleanup audit is claimed. Failed cleanup blocks acceptance and retains exact run IDs for an authorized follow-up. Ordinary security/auth logs remain under normal retention.

### What It Proves and What Remains Open

The fixture setup is direct caller-RLS insertion, not initial product generation. The UI Restore journey proves the shared content-save handler, prior-content snapshot, persisted reload and saved document renderer for the two report owners. Check exact before/after content, version count/ordering and recorded actor; use no direct RPC call as a substitute for the UI. Existing account setup must stop rather than onboarding, reseeding or creating a workspace. Authentication uses existing protected credentials; passwords and tokens never enter artifacts. Only local sign-out for diagnostic sessions is allowed.

No-AI means zero provider requests: no Generate, Regenerate, Translate, PPT or sharing generator controls are selected. This phase does not certify output quality, a new initial report, generation saves, manual editing UI, large-request limits, concurrency, linked-Student permissions, School/District aggregate exports, Partner exports or shared-link revocation/expiry. Those remain separately bounded follow-ups. The pending sharing grant migration is not included.

Execution request must state these exact two-fixture/two-restore/two-PDF limits, exact target identity and cleanup scope. Only after explicit owner approval may the agent queue the protected workflow with `confirm=staging`, `scope=report-history-no-ai`, `fixture_confirmation=disposable-report-history`. GitHub still requires the human review. No migration, grant, deployment/publication, payment or production action is included.

Source-review finding: canonical migration `20260529000630_71025c8e-e746-4a03-8685-c152eedcf177.sql` explicitly permits `has_role(auth.uid(), 'admin')` for report and intake SELECT. This is repository evidence, not a fresh hosted-policy inventory. Owner Hub remains management-only; this acceptance scope does not remove or extend backend admin access. Review the existing exception separately before production if stricter website-only data access is required. Do not silently count admin visibility as a privacy-denial pass.
