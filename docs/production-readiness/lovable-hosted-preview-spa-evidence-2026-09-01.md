# Lovable hosted preview SPA evidence — 2026-09-01

## Scope

This evidence applies only to the isolated `lovable/preview-611789b1` branch and Lovable's
hosted preview build. It does not authorize publishing, production deployment, a database
migration, a secret change, or a merge to `main`.

## Problem isolated

- A clean Bun install from the committed lockfile completed successfully.
- The original full-SSR Lovable-shaped build also completed from that clean install when it
  had enough memory. This ruled out stale dependencies, missing packages, and lockfile drift.
- The full server graph exceeded the hosted preview's apparent memory ceiling: the final
  bundle failed with a 1,024 MiB cap, and earlier client builds failed at 912 MiB.
- Route stubs alone and TanStack Start SPA mode alone each still failed at 896 MiB. The large
  server route graph had to be removed as well as disabling route SSR.

## Candidate design

The generic Lovable build now uses TanStack Start's supported SPA mode only when both of these
conditions are true:

1. the build is running in a Lovable sandbox; and
2. `TRANSITIONFORWARD_LOVABLE_PREVIEW_SPA=1` is present.

For that isolated build only:

- the client still compiles the complete TransitionForward application and all routes;
- the server receives fail-closed route stubs instead of importing page UI modules;
- a small server root emits the same document shell and metadata as the client root;
- `ClientOnly` keeps the first browser render identical to the empty SPA shell, then mounts the
  complete application after hydration;
- server functions remain in the generated server bundle; and
- the preview emits `noindex, nofollow` metadata.

`build:staging` and `build:production` do not set the preview flag and retain full SSR with their
existing 4,096 MiB build allowance.

## Local verification

- Production-readiness contract: 31/31 passed before the final workflow assertion was added.
- TypeScript (`tsc --noEmit`): passed.
- Exact Lovable-shaped command at a 768 MiB parent heap cap: passed.
  - client: 1,339 modules and 185 output chunks;
  - final Nitro bundle: 849 modules and 5,127.77 kB;
  - SPA prerender: one shell page at `/`.
- Browser validation through the generated fetch bundle:
  - `/`: rendered the complete TransitionForward homepage;
  - `/about`: rendered the complete About page;
  - `/login`: rendered the sign-in page;
  - browser console: zero warnings and zero errors after hydration;
  - build identity remained present on the document body.
- HTTP shell checks returned 200 for `/`, `/about`, `/login`, and `/dashboard`.
- An unknown `/_serverFn/does-not-exist` request returned 500, confirming a fail-closed
  server-function route.
- Full `build:production` after the change: passed with the normal Cloudflare module output and
  full SSR graph.

## Cross-runtime correction

The first pushed candidate, `e08cc0906c88465d7d26b758d137df9be1ccef4c`, exposed a useful
runtime difference before acceptance:

- Windows Node 22.23.2 completed the client child with its 944 MiB cap.
- GitHub's Linux Node 22.23.2 runner transformed all 1,339 client modules and then reached about
  921 MiB while rendering chunks, exhausting the same 944 MiB cap.

The corrected candidate gives only the short-lived client and SSR child processes a 1,024 MiB
old-space cap. The final Nitro parent stays at 768 MiB and the phases remain sequential, so the
maximum configured heap is still lower than the previous 1,216 MiB design. A fresh GitHub and
Lovable preview result is required for the corrected commit; the failed SHA must not be retried.

## CI guardrail

`Build & SSR Verification` now runs both:

1. the constrained Lovable-shaped preview build with explicit sandbox variables; and
2. the normal full production SSR build.

The branch is not ready for a remote Lovable attempt until this document, the workflow change,
the final contract test, and the complete diff have been reviewed and committed together. After
that review, exactly one push/build attempt should be used and there should be no publish or retry.
