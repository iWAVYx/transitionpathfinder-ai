# Lovable hosted-build peak reduction evidence

Date: 2026-09-11

## Scope and safety boundary

- Base commit: `bb54d29088613c32a3eea65a652ab9680b567a83`
- Isolated candidate branch: `codex/reduce-lovable-build-peak-v3`
- This change does not alter the staging or production build memory allowance.
- No Lovable build, retry, or publish was triggered while preparing this change.
- No staging or production deployment, secret change, DNS change, or database action was performed.
- Production remains **NO-GO** until the remaining release gates are completed.

## Failure evidence being addressed

The file-identical Lovable trigger commit
`d812575b4cd9e4632bd8e00cffb0a2186349443f` reported `Build unsuccessful`
and `Preview is out of date` in Lovable. The same commit passed GitHub's truthful
Build & SSR Verification in run
[`34651837845`](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34651837845).
Lovable did not expose a compiler error for that run, so this change further
reduces peak client-build work without treating resource pressure as the proven
root cause.

## Candidate changes

- Reduce only the default and development hosted-build heap cap from 1280 MB to
  1216 MB. Staging and production remain at 4096 MB.
- Update the official Lovable TanStack adapter from `2.19.5` to `2.21.0` so the
  hosted build uses the current platform integration and build-reporting markers.
- Rewrite date-fns barrel imports to supported direct function entries during the
  constrained Lovable client build.
- Exclude jsPDF's optional HTML/SVG renderers from only the constrained Lovable
  client build. Source-contract tests fail if product code begins calling either
  excluded renderer.
- Keep all optimizations scoped to the Lovable client build; ordinary staging and
  production builds retain their complete dependency graph.

## Local verification

- Focused Node contract tests: 38 passed, 0 failed.
- TypeScript (`tsc --noEmit`): passed.
- Lovable-shaped local build at a 1152 MB heap cap: passed, including client,
  SSR, Nitro output, and service-worker generation. Truthful GitHub runs
  `34657491384` and `34657517120` then established that 1152 MB is below the
  Linux runner boundary, so the candidate cap was corrected to 1216 MB without
  weakening or bypassing the check.
- Lovable-shaped candidate build at the corrected 1216 MB heap cap: passed
  locally, including client, SSR, Nitro output, and service-worker generation.
- Client graph transformed modules: 3,357, down from the 3,817-module baseline
  (460 fewer modules, approximately 12.1%).
- Full production-path build at the unchanged 4096 MB heap cap: passed.

## Acceptance gate

The draft PR must pass GitHub checks and receive review before any merge. A later
Lovable preview attempt, merge, staging deployment, or production publish requires
separate explicit authorization. No test threshold or exact-SHA requirement may
be weakened to accept this change.
