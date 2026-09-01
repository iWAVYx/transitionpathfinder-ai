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

## Connected result and next graph reduction

The first isolated candidate, `d282d4b28e8fb3e2b3268bafc1f0d213b85a1840`,
passed GitHub Build & SSR Verification in 1m21s but again ended as **Build
unsuccessful** with **Preview is out of date** in Lovable. Its Details surface
showed the expected file changes but no compiler diagnostic, exit code, failing
phase, or memory measurement. No retry or publish was performed.

A local client module inventory then identified 826 `date-fns` modules in the
3,809-module graph. Only the district and school report screens use that
dependency, and both use only `format`. They now import the package's supported
`date-fns/format` entry instead of the full barrel. The formatting API and
screen behavior are unchanged; the candidate removes unnecessary build-graph
work rather than removing a product feature.

`react-day-picker` also imports its date helpers through the package root. A
Lovable-client-only Vite transform now maps those named imports to the
corresponding supported `date-fns/<function>` entries. The transform reads the
installed package's own export index and fails the build if that export map is
not present, so a dependency change cannot silently produce an incomplete
rewrite.

The inventory also found that jsPDF was bundling its optional HTML and SVG
rendering stack (`html2canvas`, `dompurify`, and `canvg`) even though
TransitionForward's report exports use only text and AutoTable. For the
constrained Lovable client build only, imports of those three optional
renderers made by jsPDF itself are replaced with fail-closed stubs. Contract
tests prohibit the district and school report exports from calling the omitted
`html()` or `addSvgAsImage()` APIs. Normal protected staging and production
builds continue to use the full jsPDF package.

Together these changes reduced the Lovable client graph from 3,809 to 3,349
transformed modules, a reduction of 460 modules (12.1%). The new boundary was
verified locally with the exact Lovable sandbox path:

- **1,024 MiB old space:** the client still failed while rendering chunks with
  `JavaScript heap out of memory`.
- **1,088 MiB old space:** the client, server-rendered application, final Nitro
  server bundle, and service-worker generation all completed successfully.

The next isolated candidate therefore uses 1,088 MiB for default
Lovable/development builds. Protected staging and production Cloudflare builds
remain unchanged at 4,096 MiB. Acceptance still requires one successful hosted
Lovable preview for the exact candidate SHA; no publish, retry, merge, deploy,
migration, or secret change is authorized by this experiment.

## Second hosted result and exact-icon bundle

The second isolated candidate, `fc61181b212a006e8271bd99343b6899a4745255`,
passed GitHub Build & SSR Verification but again ended as **Build unsuccessful**
with **Preview is out of date** in Lovable. Lovable exposed no compiler
diagnostic, exit code, failing phase, timestamp, or memory measurement. No retry
or publish was performed.

The next conservative reduction keeps Sentry monitoring and all existing Motion
animations unchanged. For Lovable's client build only, it scans the application
source for Lucide icon imports, reads the installed Lucide package's exact SVG
node definitions, and generates one virtual module containing only the 209 icon
exports the product actually uses. Alias exports share the same component, and
the build fails closed on unknown imports, unsafe names, unreadable icon data, or
an unexpectedly small icon inventory. Normal protected staging and production
builds continue to use Lucide normally.

This reduces the constrained Lovable client graph from 3,349 to 3,149
transformed modules, a reduction of 200 modules (6.0%), without removing icons
or changing their SVG data. The exact Lovable client boundary was measured
locally:

- **1,056 MiB old space:** all 3,149 client modules transformed, then the build
  failed while rendering chunks with `JavaScript heap out of memory`.
- **1,072 MiB old space:** the client, server-rendered application, final Nitro
  server bundle, and service-worker generation completed successfully.

The candidate therefore uses 1,072 MiB for default Lovable/development builds.
Protected staging and production Cloudflare builds remain unchanged at 4,096
MiB. Acceptance still requires one successful hosted Lovable preview for the
exact candidate SHA; no same-SHA retry, publish, merge, deploy, migration, or
secret change is authorized.

The normal 4,096 MiB production-style build also completed after this change,
confirming that the optimization remains confined to the Lovable client path.

## Third hosted result and Motion feature loading

The exact-icon candidate, `d897ae29e62a957fc539be7b653338b3d0107111`,
passed GitHub Build & SSR Verification but again ended as **Build unsuccessful**
with **Preview is out of date** in Lovable. Its Details surface showed the seven
expected file changes but no compiler diagnostic, exit code, failing phase,
timestamp, or memory measurement. No retry or publish was performed.

The next isolated candidate keeps every existing animation declaration and all
Sentry monitoring unchanged. The app root now supplies Motion's complete
`domMax` browser feature set once through `LazyMotion`. During the constrained
Lovable client build only, the seven source files that import `motion/react` are
rewritten to Motion's minimal component proxy and the exact eight reviewed hook,
presence, and feature modules they use. Any new unreviewed runtime export fails
the build closed. Normal protected staging and production builds continue to
resolve the public `motion/react` API normally.

This reduces the constrained client graph from 3,149 to 3,086 transformed
modules, a further reduction of 63 modules (2.0%). The exact Lovable sandbox
path completed at **1,056 MiB old space**, including the client,
server-rendered application, final Nitro server bundle, and service-worker
generation. The default Lovable/development limit therefore moves from 1,072
MiB to 1,056 MiB; protected staging and production remain at 4,096 MiB.

The normal 4,096 MiB production-style path also completed. A local Worker
browser smoke test returned 200 responses for Home, About, and Research,
rendered their actual page headings, loaded 61, 34, and 23 Lucide icons,
respectively, retained Motion-driven style elements, and never rendered the root
error boundary.

Acceptance still requires one successful hosted Lovable preview for the exact
candidate SHA. No same-SHA retry, publish, merge, deploy, migration, or secret
change is authorized.
