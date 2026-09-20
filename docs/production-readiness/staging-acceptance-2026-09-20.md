# Exact-SHA isolated-staging and antivirus evidence — 2026-09-20

Decision: **ISOLATED STAGING DEPLOYMENT, PROTECTED CHECKS, CONSOLIDATED RELEASE
READINESS, AND THE SYNTHETIC CHANNEL-ATTACHMENT MALWARE PROOF PASSED. Production
remains NO-GO.**

This record does not authorize a Lovable publish, production DNS or secret
change, production database migration, real student/IEP upload, or live
payment.

## Exact candidate and deployment

Protected `main` SHA
`193bed60f8d3d4233aab7cc043709e52cb388790` (PR #142) was deployed only to the
`transitionforward-staging` Cloudflare Worker by
[Deploy Staging run 35517198872](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517198872).

The workflow passed its staging-intent guard, locked dependency install,
environment and Stripe guard tests, live-credential refusal, staging build,
output contract, Wrangler dry run, staging-only runtime-secret checks, exact-SHA
identity verification, and PWA asset verification. The deployed health contract
identified:

- `app_env=staging` and `vite_app_env=staging`;
- isolated Supabase project `qgrertkqbwanerqqemph`;
- `is_production_project=false`;
- Stripe sandbox mode;
- exact commit `193bed60f8d3d4233aab7cc043709e52cb388790`; and
- `isolation.ok=true`.

## Protected push checks

Every protected push workflow for the candidate completed successfully:

| Check                           |                                                                                       Run | Result |
| ------------------------------- | ----------------------------------------------------------------------------------------: | ------ |
| Production Readiness Audit      | [35517089423](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089423) | PASS   |
| Build & SSR Verification        | [35517089417](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089417) | PASS   |
| Report accessibility (axe-core) | [35517089422](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089422) | PASS   |
| CT Seed v2 Audit                | [35517089483](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089483) | PASS   |
| Dashboard regression            | [35517089453](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089453) | PASS   |
| Permission regression QA        | [35517089421](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089421) | PASS   |
| Cross-district RLS QA           | [35517089435](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089435) | PASS   |
| RLS regression QA               | [35517089470](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089470) | PASS   |
| Role-guard QA                   | [35517089437](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517089437) | PASS   |

The Dashboard and Role-guard workflows ran the authenticated-trace protections
introduced by PR #142. Their evidence uploads were allowed only after the new
credential sanitizer passed.

## Consolidated Release Readiness

[Release Readiness run 35519846560](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35519846560)
passed against the same exact deployment. It verified:

- isolated staging reachability and environment identity;
- all seven synthetic role credentials and storage states;
- public release pages, accessibility, responsive layout, and visual
  regression;
- signed-in role journeys, access control, and core workflows; and
- credential-safe evidence sanitization before artifact upload.

The retained `playwright-report` artifact is `10607899069` with digest
`sha256:2b09246d55cddd7e49a0f0e5f1efd4b63187a26822828453caef37483cc1ec96`.
No failure media remained to upload.

An unapproved scheduled run for older SHA
`b919478d806bd1301f849c6d93f4f0de312ca846` was holding the one-at-a-time
Release Readiness queue. Run `35441098111` was canceled without approving its
staging environment. It did not execute protected checks or change staging or
production.

## Single synthetic Cloudmersive proof

Exactly one protected Channel Attachment Malware QA run was dispatched for the
candidate:
[run 35521640583](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35521640583).
No earlier run existed for this SHA and no retry was performed.

The manual-only workflow verified the exact deployed SHA, the isolated staging
Supabase hostname, protected staging credentials, and only the synthetic
staging student before it created test data. It then proved:

- the privacy-review dialog produced a privacy-safe synthetic copy before
  upload;
- a clean synthetic text file stayed quarantined until Cloudmersive returned a
  clean verdict, then became downloadable through a signed private-bucket URL;
- the downloaded bytes matched the submitted clean bytes;
- the harmless standard EICAR test marker received an infected verdict;
- the EICAR object was purged from private storage and had no download action;
- clean and blocked audit events recorded the provider and verdict without
  retaining the filename or storage path; and
- the temporary QA channel and QA-only storage objects were cleaned up.

No real student, family, educator, IEP, health, or district file was used.

## Remaining production boundary

This proof closes the **synthetic channel-attachment staging** provider test. It
does not set `production.malwareScanningVerified=true` and does not by itself
close external blocker B-01.

Before production can accept real student or IEP files:

1. Cloudmersive's DPA, education-data suitability, exact processing region,
   subprocessors, retention/deletion terms, and incident commitments require
   written approval.
2. The selected production plan, file-size limit, rate limit, support, and
   availability terms must be recorded.
3. The `student-documents` path still needs equivalent protected synthetic
   live proof; the source-contract suite confirms it uses the same fail-closed
   adapter but that is not a second live-path test.
4. Production secrets and the three currently pending production migrations
   require separately authorized, stop-on-error windows.
5. Production application identity, live Stripe, secret isolation, email,
   observability, legal/privacy, Cloudflare, smoke-test, and rollback controls
   remain independent checklist gates.

No unchecked production item is closed by this staging-only record.

Production remains **NO-GO**.
