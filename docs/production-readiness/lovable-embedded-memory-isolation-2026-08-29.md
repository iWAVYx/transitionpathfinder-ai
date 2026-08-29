# Lovable embedded build-memory isolation — 2026-08-29

Production decision: **NO-GO**. This change does not publish Lovable, deploy
production or staging, migrate a database, change a secret, or authorize an
additional hosted-build attempt.

## Confirmed failure boundary

The single authorized Lovable **Update preview** attempt for merged main SHA
`7e71086e1e4afd1149b92e2197db9e498758d389` finished as **Build
unsuccessful** and **Preview is out of date**. Lovable's Details control exposed
the changed files but no compiler error, exit code, or memory measurement. No
retry or publish was performed.

The exact Lovable sandbox build was then reproduced locally with
`LOVABLE_NITRO_PRESET=lovable-fetch-bundle` and the repository's 2,560 MiB V8
old-space limit. The client and SSR environments completed, but the final Nitro
single-file packaging process failed at approximately 2,540 MiB with
`JavaScript heap out of memory`. This is the first direct reproduction of the
same blank hosted-build failure boundary against the exact merged tree.

Disabling final minification and removing only the animation dependency from
the server graph did not avoid the same heap limit. Those diagnostic
experiments were reverted and are not part of this change.

## Change

Lovable still enters through its supported `vite build` command and the
official `@lovable.dev/vite-tanstack-config` wrapper. A `buildApp` pre-hook now
runs the memory-heavy client and SSR environments in short-lived child
processes when, and only when, an official Lovable sandbox marker is present:

- `LOVABLE_SANDBOX=1`; or
- `DEV_SERVER__PROJECT_PATH`.

Each child inherits the exact requested Vite mode, environment, heap cap, and
one shared build timestamp. After a child exits successfully, its environment
is marked built so the parent process proceeds directly to Nitro packaging.
The operating system then releases the child build graph before the next stage.

Outside Lovable's sandbox the hook returns without action. Protected staging
and production Cloudflare builds therefore retain their existing single-process
4,096 MiB path. No route, SSR behavior, server function, RLS policy, MFA rule,
role guard, credential boundary, deployment identity check, or PWA policy is
changed.

## Local acceptance evidence

- TypeScript: passed.
- Exact Lovable sandbox fetch-bundle build at 2,560 MiB: passed.
- Lovable server artifact: `dist/server/index.mjs`, 8,917,630 bytes.
- Lovable PWA output: complete `dist/client/sw.js`, one Workbox runtime,
  privacy-cleanup import present, and a real precache manifest present.
- Normal Cloudflare-module build at 4,096 MiB: passed and emitted the existing
  `.output` deployment shape.

## Required post-merge acceptance

1. Merge only after green repository checks and explicit owner authorization.
2. Permit exactly one Lovable connected preview build for the resulting exact
   40-character merge SHA. Do not publish or retry.
3. Require Lovable to report **Build successful** and a current preview for that
   exact SHA.
4. Verify preview health and exact-SHA identity read-only.
5. Obtain separate owner authorization before any production publish.
