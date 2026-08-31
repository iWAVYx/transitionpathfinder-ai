# Lovable hosted client-graph reduction — 2026-08-31

Production decision: **NO-GO**. This work does not trigger or retry a Lovable
hosted build, publish Lovable, deploy staging or production, migrate a database,
change a secret, or weaken an authentication, authorization, payment, RLS, MFA,
deployment-identity, or Cloudflare control.

## Baseline

The branch starts from exact merged `main` SHA
`111f15421724bae7d0fdb85c6ae1b17763066696`.

On that baseline, the Lovable-equivalent client build transformed 5,298
modules and failed at 1,152 MiB old space while rendering chunks. The lowest
tested passing full-build cap was 1,216 MiB. Its clean client output contained
429 JavaScript chunks totaling approximately 7.72 MiB.

## Change

The constrained Lovable client build now rewrites named `lucide-react` icon
imports to the pinned package's direct ESM icon modules during compilation.
Application source imports do not change. The transform is restricted to the
Lovable client environment; SSR, protected staging, production Cloudflare, and
normal local builds retain their existing behavior.

The transform reads Lucide's installed ESM export map instead of guessing file
names. It fails closed when the export inventory is incomplete, ambiguous, or
contains a runtime export that is not a direct icon. Focused tests protect the
multiline parser from crossing an earlier non-Lucide import.

The shared Owner dashboard component also moved out of its route module. Both
`/admin` and `/owner` now import the shared component directly, removing the
TanStack warning that the cross-route component export prevented route
splitting.

No manual chunks, disabled minification, dependency change, or reduced security
check is included.

## Constrained verification

- **1,152 MiB client build:** passed, with 3,809 transformed modules and no
  circular-chunk or cross-route splitting warnings.
- **1,024 MiB client build:** failed at the heap ceiling after transforming the
  reduced graph. This remains below the supported cap and records the new lower
  failure boundary rather than hiding it.
- **1,216 MiB full build:** client, SSR, final Nitro server bundle, and service
  worker generation passed.
- **Module graph:** 5,298 to 3,809 modules, a reduction of 1,489 (28.1%).
- **Clean JavaScript output:** 452 chunks totaling approximately 5.50 MiB. This
  is 23 more small chunks but approximately 2.22 MiB (28.8%) fewer JavaScript
  bytes than the baseline; it does not create a new manually grouped app chunk.
- **Focused tests:** direct-icon rewrite tests and production-readiness contract
  tests passed (34 total).
- **TypeScript:** `tsc --noEmit` passed.

These local results demonstrate additional compiler headroom, but do not prove
that Lovable's connected hosted build will succeed. No Lovable attempt was
consumed for this branch.

## Review gate

1. Keep the pull request in draft until the change and GitHub checks are
   reviewed.
2. Do not trigger Lovable while the pull request is under review.
3. Merge only with explicit owner authorization.
4. After an authorized merge, permit at most one Lovable preview build for the
   exact merge SHA. Do not publish or retry without separate authorization.
5. Production remains **NO-GO** until the connected build and the remaining
   production-readiness controls pass.
