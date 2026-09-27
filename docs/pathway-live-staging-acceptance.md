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
- The AI browser flow fails closed unless `STAGING_LOVABLE_AI_BASE_URL` names exactly `id-preview--95c97302-11c6-4e89-bac3-2c68b970dd3d.lovable.app`.
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
