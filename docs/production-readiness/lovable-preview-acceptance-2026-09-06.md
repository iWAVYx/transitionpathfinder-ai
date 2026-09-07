# Lovable preview acceptance — 2026-09-06

Decision: **THE CONTROLLED PREVIEW RENDERED; production remains NO-GO.** This
evidence records one Lovable preview attempt for a file-identical child of the
accepted release candidate. It did not merge or publish Lovable, deploy
production, change a database, alter DNS, change secrets, or modify application
files.

## Accepted release candidate

Protected `main` remained at
`ee444f1ae02fd15e487c5c9a21da86d94ca32183` throughout this exercise. That exact
SHA had already passed:

- isolated staging deployment
  [34065047646](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34065047646);
- Production Readiness Audit
  [34064638896](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638896);
- Build & SSR Verification
  [34064638917](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638917);
- Report accessibility
  [34064638924](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638924);
- CT Seed v2 Audit
  [34064638864](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638864);
- Cross-district RLS QA
  [34064638908](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638908);
- RLS regression QA
  [34064638912](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638912);
- Permission regression QA
  [34064638888](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638888);
- Role-guard QA
  [34064638884](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638884);
- Dashboard regression
  [34064638887](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34064638887); and
- the protected consolidated Release Readiness suite
  [34065553181](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34065553181).

The staging health contract identified the isolated staging hostname, Supabase
project `qgrertkqbwanerqqemph`, sandbox Stripe mode, exact candidate SHA, and a
passing isolation verdict.

## File-identical preview trigger

The dedicated branch `lovable/preview-ee444f1a` was created from the accepted
candidate. Its only additional commit is
`cb0076390d133965c07c808cf6f5d7b7dcd3fc8d`, with parent
`ee444f1ae02fd15e487c5c9a21da86d94ca32183`.

Both commits use tree `2a2e91f615619c9ea5c7503b1682a33aebee3eb5`, and `git diff
--exit-code ee444f1a cb007639` returned success. The trigger therefore changed
Git history only; it changed zero files. GitHub's
[Clean Production Build run 34069599141](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34069599141)
passed for the trigger commit.

Lovable then reported that its connected repository switched from `main` to
`lovable/preview-ee444f1a`. The preview initially showed its not-built/building
placeholder. Exactly one Preview **Refresh** action was used. The placeholder
was replaced by Lovable's live-preview frame, and the TransitionForward
interface and current branded surfaces rendered. No retry was used, and the
current preview showed neither `Build unsuccessful` nor `Preview is out of
date`.

## Remaining limitation and production state

Lovable did not expose a runtime Git SHA for the private preview, and its public
preview health route was not independently accessible through the preview
proxy. The file tree has an auditable one-to-one mapping to the accepted
candidate, but this does not claim that Lovable reported the protected `main`
SHA as its hosted runtime identifier. The exact-SHA Lovable checklist item
therefore remains unchecked.

A separate read-only production health check still identified the older
published SHA `1c5b5a514faf28403dfbb451ecf525e2b9e9cdfc`, the production hostname,
and production Supabase project `lrqcntqyekucamifpffs`. It returned a failing
isolation verdict because `VITE_APP_ENV` was blank and Stripe mode was unknown.
The repository already contains the required production labels, so no
production configuration or publish action was inferred or performed from this
preview result.

Before production can move to GO, the remaining independent checklist items
still require evidence, including production configuration and secret
isolation, live Stripe and email/observability controls, Cloudflare edge and
rollback settings, an explicitly authorized exact production publish, and the
complete post-publish smoke and observation window.
