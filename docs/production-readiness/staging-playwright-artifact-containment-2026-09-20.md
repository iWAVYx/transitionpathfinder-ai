# Staging Playwright artifact containment — 2026-09-20

Decision: **CONTAINED; PREVENTIVE FIX VERIFIED ON ISOLATED STAGING.** Production
credentials and production accounts were not involved. This record contains no
password, token, API key, session value, or raw browser trace.

## Incident boundary

Dashboard regression run
[`35489038585`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35489038585)
failed after one staging JavaScript asset request stalled. The test itself was
correctly targeting isolated staging at the expected SHA, but Playwright's
failure trace serialized the signed-in browser storage state. Artifact
`10598424855` therefore contained reusable session material for one synthetic
staging parent identity.

This was an artifact-handling defect, not evidence of a production breach, a
role-authorization failure, or lost application data.

## Containment completed

- GitHub artifact `10598424855` was deleted and a follow-up API request returned
  `404`.
- All 54 sessions and 54 refresh-token rows belonging to the affected synthetic
  staging identity were revoked in the isolated staging project. A separate
  SELECT-only verification returned zero sessions and zero refresh tokens.
- The downloaded trace archive and expanded local trace were deleted. A
  follow-up token scan found no retained token value.
- No production credential, user, database, deployment, or configuration was
  read or changed during containment.

Only non-sensitive diagnostic evidence was retained: 27 of 28 application
assets returned HTTP 200 and one asset request remained unresolved. That
explains the browser timeout without retaining browser storage or session data.

## Preventive fix

PR [#142](https://github.com/iWAVYx/transitionpathfinder-ai/pull/142), merged as
`193bed60f8d3d4233aab7cc043709e52cb388790`, adds defense in depth:

1. Every Playwright project that can use an authenticated storage state has
   trace recording disabled.
2. Only the credential-free anonymous project may retain a trace.
3. Dashboard regression, Role-guard QA, Release Readiness, and Seven-role
   staging verification sanitize their evidence trees before upload.
4. The sanitizer removes trace archives, symbolic links, and files containing
   recognized serialized Supabase or bearer credentials.
5. Artifact upload fails closed unless sanitization succeeds.
6. Regression tests lock the configuration, workflow gates, and sanitizer
   behavior.

## Post-fix proof

The exact merge SHA was deployed to isolated staging by run
[`35517198872`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35517198872).
Its protected Dashboard regression and Role-guard runs both passed, including
their artifact-sanitization steps.

Consolidated Release Readiness run
[`35519846560`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/35519846560)
also passed its authenticated journeys and sanitizer. Its artifact inventory
contains only the sanitized `playwright-report` artifact (`10607899069`) with
digest
`sha256:2b09246d55cddd7e49a0f0e5f1efd4b63187a26822828453caef37483cc1ec96`.
No trace/media artifact was created because no failure media remained.

This closes the staging session-artifact containment item. It does not approve
production publishing or change the overall production **NO-GO** decision.
