# Lovable hosted-container boundary — 2026-08-30

Production decision: **NO-GO**. This change does not publish Lovable, trigger
or retry a hosted build, deploy staging or production, migrate a database, or
change a secret, route, authentication rule, payment control, role guard, RLS
policy, MFA rule, or Cloudflare protection.

## Exact PR #79 connected-build result

Lovable automatically received merged main SHA
`840dac0b4655b2374055083725b06a1f081b1016`. Its connected preview card ended
as **Build unsuccessful** with **Preview is out of date**. The existing Details
surface exposed no actionable compiler error, exit code, termination reason,
build phase, or memory measurement. No hosted build, retry, or publish was
triggered during the investigation.

## Local failure boundary

The exact Lovable sandbox path was reproduced with `LOVABLE_SANDBOX=1`, the
`lovable-fetch-bundle` Nitro preset, production environment labels, and the
full PR #79 merge SHA.

- **1,152 MiB old space:** the client transformed all 5,296 modules, then
  failed while rendering chunks with `JavaScript heap out of memory`; the
  client child exited with code 134.
- **1,216 MiB old space:** the complete client, SSR, Nitro fetch-bundle, and
  service-worker build passed. The final server bundle remained approximately
  7.68 MB and was emitted at `dist/server/index.mjs`.

The passing 1,216 MiB build was sampled across its complete process tree. Two
runs ranged from approximately 1,762–1,818 MiB peak working set and
1,925–1,984 MiB peak private bytes. At the working-set peak, the client Node
process used approximately 1,397 MiB, its esbuild child approximately 192 MiB,
and the waiting parent Node process approximately 149 MiB. This confirms that
the client compiler—not the parent orchestrator—is the memory boundary.

For comparison, the current 1,280 MiB build passed at approximately 1,868 MiB
peak working set and 2,035 MiB peak private bytes. The 1,216 MiB cap is the
lowest tested passing boundary and provides measurable container headroom; the
next tested step, 1,152 MiB, is not viable.

## Change and acceptance

Only the default Lovable/development old-space cap changes from 1,280 MiB to
1,216 MiB. Protected staging and production Cloudflare builds retain their
existing 4,096 MiB limits. No application feature or security boundary changes.

1. Merge only after green repository checks and explicit owner authorization.
2. Permit exactly one connected Lovable preview build for the resulting exact
   40-character merge SHA. Do not publish or retry.
3. Require **Build successful** and a current preview for that exact SHA.
4. Verify preview health and exact-SHA identity read-only.
5. Obtain separate owner authorization before any production publish.
