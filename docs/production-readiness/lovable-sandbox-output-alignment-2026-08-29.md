# Lovable sandbox output alignment — 2026-08-29

Production decision: **NO-GO**. This change does not authorize a Lovable
publish, production deployment, production database migration, DNS change, or
additional hosted-build attempt.

## Exact hosted-mode reproduction

The automatic connected build for main SHA
`f2644c1a9437d1dd1f09d178a7aeb8e069013f5f` remained unsuccessful after the
2,560 MiB memory cap merged in PR #72. No manual retry was performed.

Local builds had previously exercised Nitro's normal Cloudflare module preset.
Lovable's sandbox can instead set `LOVABLE_NITRO_PRESET=lovable-fetch-bundle`,
which inlines the server graph into one `dist/server/index.mjs` file and writes
public assets to `dist/client`.

Running that exact sandbox mode locally completed the client, SSR, and single
8.9 MB Nitro fetch bundle within the 2,560 MiB cap. This disproved the assumption
that the exact hosted-mode bundle necessarily exceeds the configured V8 heap.

## Output defect and supported-wrapper alignment

After the successful Lovable-mode Vite build, the package script invoked the
service-worker generator without an output argument. That script always
targeted `.output/public`, even though the Lovable sandbox deploys
`dist/client`. On a clean checkout Workbox silently created a new, nearly empty
`.output/public` worker instead of placing the complete worker beside the
deployed Lovable assets.

The generator now:

- selects `dist/client` only when the official Lovable sandbox markers are
  present;
- retains `.output/public` for normal Cloudflare staging and production builds;
- still honors the explicit output-directory argument used by the retired split
  builder; and
- fails closed if the selected deployed asset directory does not exist.

The official Lovable Vite/TanStack wrapper is pinned from 2.13.1 to the current
2.19.5 release. The update preserves the supported `defineConfig` integration
and includes newer hosted-build error diagnostics. No application route,
runtime feature, credential, database policy, authentication rule, role guard,
deployment identity check, or environment boundary changed.

## Acceptance

Before review, both normal Cloudflare-module and exact Lovable sandbox
fetch-bundle builds must pass from clean output directories. Each build must
place `sw.js`, its Workbox runtime, and the privacy-cleanup import in the same
asset directory that its server deployment uses. TypeScript and the
production-readiness contract must pass.

After an explicitly authorized merge, permit one connected Lovable preview
build for the exact merge SHA. Do not publish or automatically retry.
