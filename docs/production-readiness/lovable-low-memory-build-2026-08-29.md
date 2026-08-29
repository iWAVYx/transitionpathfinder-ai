# Lovable low-memory build alignment — 2026-08-29

Production decision: **NO-GO**. This change does not authorize a Lovable
publish, production deployment, production database migration, or DNS change.

## Problem boundary

Lovable's hosted build for the exact merged application repeatedly ended before
it produced structured diagnostics. The same supported, single-pass Vite build
was reproduced locally with explicit heap limits to locate the failure:

- At a 2,304 MiB V8 old-space limit, the client and SSR environments completed,
  but final Nitro/Cloudflare Worker packaging failed with a JavaScript
  out-of-memory error near the configured heap limit.
- At a 2,560 MiB V8 old-space limit, the client, SSR, and final Nitro/Cloudflare
  Worker environments all completed successfully.

This isolates the pressure to final Worker packaging and establishes a tested
lower bound without removing application routes, server rendering, security
controls, or service-worker generation.

## Change

The default build and build:dev scripts retain Lovable's supported single-pass
Vite build pipeline and cap V8 old space at 2,560 MiB. This leaves the hosted
container additional room for Vite, esbuild, and native process overhead while
preserving the heap required by Nitro packaging.

Dedicated build:staging and build:production commands remain at 4,096 MiB. No
deployment identity, RLS, MFA, role guard, environment isolation, credential, or
Cloudflare protection was changed.

## Acceptance gate

Before review, the repository must pass the production-readiness contract,
typecheck, and a clean default build using the exact revised command. After an
authorized merge, acceptance requires exactly one connected Lovable preview
build for the exact merge SHA. Do not publish or automatically retry. A missing
or mismatched SHA remains a failure rather than a reason to weaken identity
checks.
