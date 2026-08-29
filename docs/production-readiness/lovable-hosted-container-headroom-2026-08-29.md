# Lovable hosted-container headroom — 2026-08-29

Production decision: **NO-GO**. This change does not publish Lovable, trigger
or retry a hosted build, deploy staging or production, migrate a database, or
change a secret, route, authentication rule, payment control, or protection.

## PR #75 diagnostic

The single connected preview attempt for merged main SHA
`39d7b88eb88cfa4901c5ed48c087f39c110df3eb` was enqueued and ended as
**Build unsuccessful** with **Preview is out of date**. Lovable returned empty
`diagnostics` and `failed_targets` data. It exposed no build timestamps, phase,
exit code, termination reason, peak memory, memory limit, or compiler error.
The platform classified the empty result as consistent with its prior
container-termination pattern, but did not provide a direct memory measurement.

No retry or production publish was performed.

## Exact local reproduction

The merged tree was built through the Lovable sandbox path with
`LOVABLE_SANDBOX=1` and `LOVABLE_NITRO_PRESET=lovable-fetch-bundle`.
The full build passed under Node with a 2,560 MiB V8 old-space limit, including:

- the 5,295-module client environment;
- the 759-module SSR environment;
- the 3,762-module Nitro environment;
- the 8.9 MB `dist/server/index.mjs` fetch bundle; and
- service-worker generation in `dist/client`.

The same full build then passed under Node with a 1,536 MiB old-space limit.
That lower ceiling leaves substantially more of a 4 GiB hosted container for
native compiler allocations, child-process overhead, installed dependencies,
and the operating system. It changes only the default Lovable/dev build heap;
the protected staging and production Cloudflare build commands retain their
existing 4,096 MiB limits.

## Required acceptance

1. Merge only after green repository checks and explicit owner authorization.
2. Permit exactly one connected Lovable preview build for the resulting exact
   40-character merge SHA. Do not publish or retry.
3. Require **Build successful** and a current preview for that exact SHA.
4. Verify preview health and exact-SHA identity read-only.
5. Obtain separate owner authorization before any production publish.
