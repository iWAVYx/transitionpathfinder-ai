# Lovable preview and isolated-staging acceptance — 2026-09-11

## Decision

The Lovable hosted-preview build bottleneck is resolved for protected `main`
commit `a0396a3af276e978d10920f29dc429f2820e47b9`.

This evidence does not authorize or record a production publish. Production
remains **NO-GO** until the remaining release checklist gates are closed.

## Source identity

- PR [#115](https://github.com/iWAVYx/transitionpathfinder-ai/pull/115)
  merged through protected `main`.
- Exact merge SHA:
  `a0396a3af276e978d10920f29dc429f2820e47b9`.
- Lovable repository connection: `iWAVYx/transitionpathfinder-ai`.
- Lovable connected branch was changed from the isolated historical preview
  branch to `main` only after GitHub confirmed `main` at the exact SHA above.
- Lovable reported the repository and branch in sync before the preview attempt.

## GitHub and isolated-staging evidence

- Build & SSR Verification:
  [run 34658998992](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998992)
  — passed.
- Isolated staging deployment:
  [run 34659215406](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34659215406)
  — passed.
- The deployment verified the staging-only environment, sandbox Stripe guard,
  Worker deployment, exact SHA, environment isolation, and deployed PWA assets.
- CT Seed v2 Audit:
  [run 34658998840](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998840)
  — passed.
- RLS regression QA:
  [run 34658998866](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998866)
  — passed.
- Cross-district RLS QA:
  [run 34658998805](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998805)
  — passed.
- Permission regression QA:
  [run 34658998827](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998827)
  — passed.
- Role-guard QA:
  [run 34658998837](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998837)
  — passed.
- Dashboard regression and all seven role storage states:
  [run 34658998804](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998804)
  — passed.
- Report accessibility:
  [run 34658998718](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998718)
  — passed.
- Credential-free Production Readiness Audit:
  [run 34658998795](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34658998795)
  — passed.

PR #115 did not contain a database migration. No migration was applied during
this acceptance cycle.

## Lovable hosted-preview evidence

- Exactly one `Update preview` action was performed after the `main` connection
  was in sync.
- No retry was performed.
- No publish was performed.
- After the build and a normal page refresh, Lovable rendered the
  TransitionForward homepage in its hosted preview.
- The rendered preview URL identified short SHA `a0396a3a`, matching the prefix
  of the exact protected `main` SHA recorded above.
- The preview exposed the expected homepage title and primary content rather
  than `Build unsuccessful`, `Preview is out of date`, or the unbuilt-preview
  placeholder.
- Successful rendering was observed by `2026-09-12T00:09:14Z`.

Lovable history continues to display historical failure cards for older commits,
including the old `bb54d290` trigger. Those cards are not evidence about the
current exact-SHA preview and were not retried.

## Remaining boundary

- Do not publish production from this evidence.
- Do not change DNS, production secrets, or production database state from this
  evidence.
- A later production publish still requires separate explicit owner approval,
  exact-SHA confirmation, production health validation, smoke tests, and the
  remaining checklist controls.
