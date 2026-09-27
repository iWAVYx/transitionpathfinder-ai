# Protected Pathway live-staging acceptance

## What this package proves

This package is the repeatable, protected acceptance test for the real signed-in Pathway workflow. It runs only against the isolated staging Worker and isolated staging Supabase project. It creates one AI-generated report from synthetic data, proves the intended cross-role access, and removes the generated records afterward.

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
- Fail closed unless the application host is `transitionforward-staging.caysi101.workers.dev`.
- Fail closed unless Supabase is exactly project `qgrertkqbwanerqqemph`.
- Exact deployed Git SHA, staging application identity, sandbox Stripe identity, and staging isolation are checked before sign-in.
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

1. Open **Actions → Pathway Live Staging QA** on the repository's `main` branch.
2. Choose **Run workflow**.
3. Enter `pathway-staging` as the confirmation value.
4. Approve the protected `staging` environment.
5. Record the workflow run ID, exact deployed SHA, and the four role results as release evidence.

This document does not authorize those later steps. The package must be reviewed first, and the current task must not merge, deploy, publish, migrate, or touch production.
