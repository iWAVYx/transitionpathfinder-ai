# Synthetic staging credential containment — 2026-08-23

Decision: **CONTAINED; CODE FIX VERIFIED IN STAGING**. Production credentials,
production users, production data, and the production environment were not
involved or changed.

## Detection

Protected Dashboard regression run
[`32669269018`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32669269018)
authenticated six roles but timed out while authenticating the synthetic
student. The first password form was submitted before client hydration. Because
the form did not declare a safe native method, the browser defaulted to GET and
placed the synthetic staging credential in the URL captured by the Playwright
diagnostic artifact.

## Containment and rotation

- The affected `playwright-report` artifact `9501164856` was verified against
  run `32669269018` and deleted from the public GitHub repository.
- The downloaded local diagnostic copy was deleted from the worktree temporary
  directory after diagnosis.
- GitHub environment secret `STAGING_E2E_PASSWORD` was replaced with a newly
  generated value that was not displayed or written to disk.
- Protected staging reconciliation run
  [`32671363662`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32671363662)
  rotated all seven fixed synthetic staging users and independently verified the
  routine reconciliation path.

No secret value belongs in this document, repository history, workflow output,
test artifact, or issue/PR text.

## Code hardening

Both password-bearing forms on `/login` now:

1. Render their fields and submit controls disabled until React hydration has
   completed and the client handlers are attached.
2. Declare `method="post"` and `action="/login"` as defense-in-depth so a native
   fallback cannot place credentials in a URL.
3. Expose a non-secret hydration marker that browser setup waits for before
   entering credentials.

The production-readiness contract locks these properties. PR #51 merged the fix
as SHA `7803a6486ad67357a523ce252f835ce2d0b53f30`. Isolated staging deployment
run [`32676148661`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32676148661),
protected Dashboard regression run
[`32676016370`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32676016370),
and full release-readiness run
[`32677397120`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/32677397120)
all passed at that exact SHA. This closes the staging incident's code-fix gate;
it does not change the production **NO-GO** decision.
