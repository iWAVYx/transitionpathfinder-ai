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
- The AI browser flow fails closed unless `STAGING_LOVABLE_AI_BASE_URL` names exactly `preview--gentle-forward-reach.lovable.app`.
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

The public health response exposes non-sensitive AI readiness plus a one-way SHA-256 runtime-source fingerprint, its fixed schema, algorithm, and file count. It never exposes a key, credential identifier, source path, source content, environment value, or gateway response. The isolated Lovable staging copy is not Git-connected, so the fingerprint—not a manually entered commit label—is its authoritative code-parity proof.

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
