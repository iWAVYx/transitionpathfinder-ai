# Lovable hosted-build headroom after client-graph reduction — 2026-09-01

Production decision: **NO-GO**. This isolated candidate does not publish
Lovable, deploy staging or production, migrate a database, change a secret, or
weaken an authentication, authorization, payment, RLS, MFA,
deployment-identity, or Cloudflare control.

## Connected-build result at the prior ceiling

The dedicated Lovable preview branch built the file-changing marker commit
`9e9210d1c869ec516dbf9e0c5f5f58c2c061ed38` exactly once. Lovable received the
commit, but the card ended as **Build unsuccessful** with **Preview is out of
date**. The same exact SHA passed GitHub's Build & SSR Verification. No retry or
publish was performed.

This isolates the remaining failure to Lovable's hosted build path rather than
the normal repository build.

## New constrained boundary

PR #82 reduced the Lovable client graph from 5,298 to 3,809 transformed modules
while preserving application behavior. On that reduced graph, the complete
Lovable sandbox path was retested locally:

- **1,024 MiB old space:** the client transformed all 3,809 modules, then failed
  while rendering chunks with `JavaScript heap out of memory`.
- **1,152 MiB old space:** the client, SSR, final Nitro server bundle, and
  service-worker inputs completed successfully.

Before PR #82, 1,152 MiB failed at the same client chunk-rendering boundary.
The graph reduction therefore created a newly verified 64 MiB of additional
container headroom below the prior 1,216 MiB default.

## Candidate change and acceptance

Only the default Lovable/development old-space cap changes from 1,216 MiB to
1,152 MiB. Protected staging and production Cloudflare builds retain their
existing 4,096 MiB limits. The inert trigger marker is removed.

1. Run the focused readiness contract, typecheck, normal build, and exact
   Lovable sandbox build before pushing the candidate.
2. Permit one connected Lovable preview build for the exact candidate SHA.
3. Require **Build successful** and a current preview for that exact SHA.
4. Do not publish, retry the same SHA, merge to `main`, deploy, migrate, or
   change secrets without the corresponding separate authorization.
