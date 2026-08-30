# Lovable hosted-build memory floor — 2026-08-30

Production decision: **NO-GO**. This change does not publish Lovable, trigger
or retry a hosted build, deploy staging or production, migrate a database, or
change a secret, route, authentication rule, payment control, or protection.

## Exact PR #78 hosted diagnostic

The existing connected preview run for merged main SHA
`c793e4ae1d068490efbc4dd388d12227bc4f6edf` was inspected read-only. Lovable
confirmed that a hosted-build record exists for that exact SHA and returned
empty `diagnostics` and `failed_targets` arrays. It did not expose start/end
timestamps, the failing phase, an exit code or termination reason, peak or
limit memory, or an actionable compiler error. The empty payload is consistent
with an early container termination, but it does not prove OOM, SIGKILL, or any
other cause. No hosted build, retry, publish, file edit, or configuration change
was triggered by the diagnostic.

The PR source commit and merge commit have the same Git tree, so the local
tests below reproduce the exact merged source while the explicit build identity
remains pinned to the full merge SHA.

## Constrained local reproduction

Dependencies were restored from the committed `bun.lock`. The exact Lovable
sandbox path used `LOVABLE_SANDBOX=1`, the
`lovable-fetch-bundle` Nitro preset, and the full PR #78 merge SHA.

- **1,536 MiB old space:** the full client, SSR, Nitro fetch-bundle, and service
  worker build passed.
- **1,024 MiB old space:** the client environment failed near its heap ceiling
  with `JavaScript heap out of memory`; the child exited with code 134 before
  SSR or Nitro packaging.
- **1,280 MiB old space:** the full client, SSR, Nitro fetch-bundle, and service
  worker build passed. The final server artifact was emitted at
  `dist/server/index.mjs`, and the exact 40-character merge SHA was present in
  both server and client output.

The 1,280 MiB result provides 256 MiB more native/container headroom than the
previous 1,536 MiB default without crossing the proven 1,024 MiB failure
boundary. Protected staging and production Cloudflare builds retain their
existing 4,096 MiB limits.

## Required acceptance

1. Merge only after green repository checks and explicit owner authorization.
2. Permit exactly one connected Lovable preview build for the resulting exact
   40-character merge SHA. Do not publish or retry.
3. Require **Build successful** and a current preview for that exact SHA.
4. Verify preview health and exact-SHA identity read-only.
5. Obtain separate owner authorization before any production publish.
