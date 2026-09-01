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

## Fourth hosted result and prepared vendor slices

The Motion candidate, `40abaef15099b476cfca5b1f924f27f7f39d8a71`,
passed GitHub Build & SSR Verification in 1m19s. Lovable still ended as
**Build unsuccessful** with **Preview is out of date**, again without a
compiler diagnostic, exit code, failing phase, timestamp, or memory
measurement. No retry or publish was performed.

The next client inventory attributed 932 transformed modules to the app, 585
to `date-fns`, 233 to `@sentry/core`, 51 to `@sentry/browser`, 42 to
`@sentry/browser-utils`, and 108 to `react-day-picker`. The constrained build
was therefore still repeatedly asking Vite and Rollup to discover, transform,
and optimize large reviewed dependency graphs even though the product uses a
small, fixed public surface from those packages.

For Lovable's client build only, a sequential preparation step now uses the
pinned `esbuild@0.28.1` to produce two minified, browser-targeted ESM slices:

- `react-day-picker.mjs` is 68,280 bytes and exports exactly `DayButton`,
  `DayPicker`, and `getDefaultClassNames`. React remains external so the app
  continues to use its single reviewed React runtime.
- `sentry-browser.mjs` is 85,501 bytes and exports exactly the browser and core
  functions used by TransitionForward's Sentry initialization.

The slices are generated into the ignored `.transitionforward-build/`
directory before a Lovable/default build. Vite redirects only the exact
`react-day-picker` import in `src/components/ui/calendar.tsx` and the exact
Sentry imports in `src/lib/sentry/init.ts`, and only for Lovable's client
environment. Missing or unexpectedly small prepared output fails the build
closed. Protected staging and production builds continue to resolve the
original packages normally.

The Sentry initialization no longer traverses the `@sentry/react` barrel. It
reproduces that SDK's React initialization using its public browser/core APIs:
SDK metadata remains `react`, the React version context remains attached, and
Synthetic Events retain the same normalized representation. Existing DSN
gating, release identity, sampling, PII prohibition, replay exclusion,
breadcrumb filtering, and event/transaction redaction remain unchanged.

Focused regression coverage verifies the exact generated exports, minimum
bundle sizes, sequential preparation, importer restrictions, fail-closed
checks, and Sentry privacy posture. It also server-renders the prepared
`DayPicker` and verifies the September 2026 grid and selected September 15
accessibility label. All 48 focused Lovable/readiness tests, all 11 Sentry
privacy tests, and the full TypeScript check pass.

Together, the Sentry entry alignment and prepared slices reduce the Lovable
client graph from 3,086 to 2,074
transformed modules, a reduction of 1,012 modules (32.8%). The final boundary
was measured with the full Lovable sandbox path:

- **896 MiB old space:** the 2,074-module client still failed while rendering
  chunks with `JavaScript heap out of memory`.
- **1,024 MiB old space:** the client, server-rendered application, final Nitro
  Worker bundle, and service-worker generation all completed successfully.

The candidate therefore uses the verified 1,024 MiB default
Lovable/development limit. Protected staging and production retain their 4,096
MiB limits. A separate normal 4,096 MiB production-style build also passed.

The exact constrained output then passed a local Worker browser smoke test:
Home, About, and Research returned 200, rendered their expected headings and
icons, retained Motion-driven styles, and did not render the application error
boundary. The prepared calendar slice also passed its direct render test.

Acceptance still requires exactly one connected Lovable preview build for the
new exact candidate SHA. No same-SHA retry, publish, merge to `main`, staging or
production deploy, database migration, or secret change is authorized.

## Fifth hosted result and prepared Motion slice

The prepared calendar/Sentry candidate,
`6c4f992320865dd70c39a413e542b0476a7df9ff`, passed GitHub Build & SSR
Verification in 1m11s. Lovable still ended as **Build unsuccessful** with
**Preview is out of date** and exposed no actionable build diagnostic. No retry
or publish was performed.

Disabling Lovable-only minification did not improve the measured boundary: the
2,074-module client still exhausted 896 MiB while rendering chunks. That
experiment was fully reverted and was never committed or pushed.

A fresh inventory of the successful 1,024 MiB graph found that `motion-dom`
still contributed 219 modules, `framer-motion` 89, and `motion-utils` 30. The
direct-import candidate had reduced unnecessary entrypoint traversal but Vite
still had to transform Motion's reviewed internal feature graph.

The sequential preparation step now generates a third Lovable-client-only ESM
slice. `motion-client.mjs` is 139,226 bytes and exports exactly the nine public
Motion APIs used by the seven reviewed source files: `AnimatePresence`,
`LazyMotion`, `domMax`, `motion`, `useInView`, `useReducedMotion`, `useScroll`,
`useSpring`, and `useTransform`. React remains external, and any new unreviewed
`motion/react` importer fails the constrained build closed. Normal protected
staging and production builds continue to use Motion's public package normally.

The prepared Motion slice test verifies the exact export surface and renders a
Motion element. The client graph falls from 2,074 to 1,737 transformed modules,
a reduction of 337 modules (16.2%):

- **896 MiB old space:** the client transformed all 1,737 modules, then failed
  with `JavaScript heap out of memory`.
- **960 MiB old space:** the client, server-rendered application, and final
  Nitro Worker bundle completed successfully. Service-worker generation also
  passed.

The exact 960 MiB output passed the local Worker browser smoke on Home, About,
and Research: all returned 200, rendered their expected headings and icons,
retained Motion-driven styles, and did not render the application error
boundary.

The candidate therefore uses the verified 960 MiB default
Lovable/development limit. Protected staging and production remain fixed at
4,096 MiB. Acceptance still requires exactly one connected Lovable preview
build for the new exact candidate SHA. No same-SHA retry, publish, merge to
`main`, deploy, migration, or secret change is authorized.

## Sixth hosted result and prepared content/validation slices

The prepared Motion candidate, `1dde80de19b19db82d72883d9c54d1fee9f191b4`,
passed GitHub Build & SSR Verification in 1m13s. Lovable again ended as **Build
unsuccessful** with **Preview is out of date** and no actionable diagnostic. No
retry or publish was performed.

The next measured candidate prebuilds four additional Lovable-client-only
public surfaces: React Markdown (117,508 bytes), Remark GFM (42,320 bytes), the
browser QR generator (24,859 bytes), and Zod (61,148 bytes). Importer routing is
restricted to the reviewed blog, security, and application source paths;
protected staging and production continue to resolve the original packages.

Behavior tests render a GFM table, parse a representative Zod object, and
generate a QR module matrix. Together these slices reduce the client graph from
1,737 to 1,430 transformed modules, a reduction of 307 modules (17.7%):

- **896 MiB old space:** the client transformed all 1,430 modules, then failed
  with `JavaScript heap out of memory`.
- **928 MiB old space:** the client, server-rendered application, and final
  Nitro Worker bundle completed successfully.

Service-worker generation also passed. The exact 928 MiB output passed the
local Worker browser smoke on Home, About, and Research: all returned 200,
rendered their expected headings and icons, retained Motion-driven styles, and
did not render the application error boundary.

The candidate therefore uses the verified 928 MiB default
Lovable/development limit. Protected staging and production remain at 4,096
MiB. Acceptance still requires exactly one connected Lovable preview build for
the new exact candidate SHA. No same-SHA retry, publish, merge to `main`,
deploy, migration, or secret change is authorized.

## Seventh hosted result and dependency advisory remediation

The prepared content/validation candidate,
`7a0806648668d9cb02b0d13bd1d702fedc000ba2`, produced one automatic Lovable
card. Lovable ended as **Build unsuccessful** with **Preview is out of date**
and exposed only the reviewed file list—no compiler error, exit code, memory
measurement, or other actionable diagnostic. No same-SHA retry or publish was
performed.

GitHub correctly failed closed before building because a newly published pair
of high-severity Browserslist advisories affected the transitive 4.28.2
resolution. The follow-up pins Browserslist 4.28.8 through the existing
override mechanism and regenerates the lockfile. `bun audit --audit-level=high`
then reports no high or critical findings.

The patched Browserslist release slightly changed build-time memory use while
leaving the application graph at 1,430 transformed client modules:

- **928 MiB old space:** the client transformed all 1,430 modules, then failed
  while rendering chunks with `JavaScript heap out of memory`.
- **944 MiB old space:** the client, server-rendered application, final Nitro
  Worker bundle, and service-worker generation completed successfully.

The exact 944 MiB output also passed local Worker browser smoke on Home, About,
and Research with the expected headings, icons, and Motion-driven styles and no
application error boundary.

The follow-up therefore uses the verified 944 MiB Lovable/development limit,
still below the previous 960 MiB candidate. Protected staging and production
remain at 4,096 MiB. Acceptance still requires exactly one connected Lovable
preview build for a fresh exact candidate SHA. No same-SHA retry, publish,
merge to `main`, deploy, migration, or secret change is authorized.

## Eighth hosted result and shared Zod resolver slice

The patched Browserslist candidate,
`0caba3f4ab9308b9af19c144c4a52b08b7d4b2c6`, passed GitHub Build & SSR
Verification. Lovable still ended as **Build unsuccessful** with **Preview is
out of date** and no compiler error, exit code, memory measurement, or other
actionable diagnostic. No same-SHA retry or publish was performed.

A local-only client inventory found that 937 of the remaining 1,430 modules
were TransitionForward application files. The largest unexpected dependency
remainder was 55 Zod modules. React Hook Form's reviewed resolver imports the
public `zod/v4/core` entry even when the application schemas use Zod's
compatible v3 root surface.

The Lovable client now redirects that one exact
`@hookform/resolvers/zod/dist/zod.mjs` core import to the existing prepared Zod
bundle. That bundle is 63,993 bytes and adds exactly `$ZodError`, `parse`, and
`parseAsync` from the public core entry. App schemas and resolver support
therefore share one prepared Zod runtime instead of duplicating the 55-module
core graph. Any unrelated `zod/v4/core` importer continues through the normal
package resolution.

Focused behavior coverage sends both valid and invalid prepared schemas through
the real Zod resolver and verifies its output, in addition to checking the
required core symbols. The client graph falls from 1,430 to 1,375 transformed
modules:

- **912 MiB old space:** all 1,375 modules transformed, then the client failed
  while rendering chunks with `JavaScript heap out of memory`.
- **928 MiB old space:** the client, server-rendered application, final Nitro
  Worker bundle, and service-worker generation completed successfully.

The exact 928 MiB output also passed local Worker browser smoke on Home, About,
and Research with the expected headings, icons, and Motion-driven styles and no
application error boundary.

The candidate therefore returns to the verified 928 MiB Lovable/development
limit. Protected staging and production remain at 4,096 MiB. Acceptance still
requires exactly one connected Lovable preview build for a fresh exact
candidate SHA. No same-SHA retry, publish, merge to `main`, deploy, migration,
or secret change is authorized.

## Ninth hosted result and prepared report date formatter

The shared-Zod candidate, `157f33924e132ff2d7005fdff091521f10243483`,
passed GitHub Build & SSR Verification in 1m14s. Lovable again ended as **Build
unsuccessful** with **Preview is out of date** and exposed no compiler error,
exit code, memory measurement, or other actionable diagnostic. No same-SHA
retry or publish was performed.

A fresh local-only client inventory found the next low-risk dependency
remainder: 37 date-fns modules reached through the exact public
`date-fns/format` imports in the district and school report routes. The Lovable
client now redirects only those two reviewed imports to a prepared 19,621-byte
bundle that exports exactly `format`. Protected staging and production continue
to resolve the normal date-fns package.

Focused behavior coverage verifies that the prepared formatter produces the
existing `September 15, 2026` report output. Replacing the 37-module dependency
remainder with the one prepared module reduces the client graph from 1,375 to
1,339 transformed modules:

- **912 MiB old space:** all 1,339 modules transformed, then the client failed
  while rendering chunks with `JavaScript heap out of memory`.
- **928 MiB old space:** the client, server-rendered application, final Nitro
  Worker bundle, and service-worker generation completed successfully.

The exact 928 MiB output also passed local Worker browser smoke on Home, About,
and Research with the expected headings, icon counts, and Motion-driven styles
and no application error boundary.

The candidate keeps the verified 928 MiB Lovable/development limit. Protected
staging and production remain at 4,096 MiB. Acceptance still requires exactly
one connected Lovable preview build for a fresh exact candidate SHA. No
same-SHA retry, publish, merge to `main`, deploy, migration, or secret change is
authorized.

## Tenth hosted result and constrained client chunk merging

The prepared report-date formatter candidate,
`023fd710ae802b9ddf0fe439eda5adf8db1bfc9e`, passed GitHub Build & SSR
Verification in 56 seconds. Lovable created the exact automatic card but again
ended as **Build unsuccessful** with **Preview is out of date**. Its Details
view exposed only the reviewed file changes and no phase, exit code, memory
measurement, or actionable error. GitHub check, commit-status, deployment, and
webhook metadata likewise exposed no Lovable diagnostic. No same-SHA retry or
publish was performed.

A local-only experiment disabled minification in the constrained Lovable client
child. It still failed at 896 MiB and was discarded without a commit or hosted
attempt because the larger artifact did not provide useful headroom.

The accepted candidate instead uses Rollup's supported
`experimentalMinChunkSize` output option only in the constrained Lovable client
child. A 20,000-byte threshold merges small chunks only when their dependency
relationships permit it; it does not remove routes or application code. The
client output falls from 366 JavaScript chunks to 185. The server-rendered app,
Nitro Worker, protected staging, and production retain Rollup's default
threshold.

- **896 MiB old space:** all 1,339 client modules transformed and the small
  chunks merged, then the client failed with `JavaScript heap out of memory`.
- **912 MiB old space:** the client, server-rendered application, final Nitro
  Worker bundle, and service-worker generation completed successfully.

The exact 912 MiB output passed local Worker browser smoke on Home, About,
Research, the main demo, Student, Family, Educator, School Admin, District
Admin, Partner, and Owner demo views, the workspace tour, Pathway Report, and
Transition Channel. Every route rendered its expected heading with no
application error boundary, dynamic-import failure, or console error.

The candidate therefore lowers the constrained Lovable/development limit from
928 to 912 MiB. Protected staging and production remain at 4,096 MiB.
Acceptance still requires exactly one connected Lovable preview build for a
fresh exact candidate SHA. No same-SHA retry, publish, merge to `main`, deploy,
migration, or secret change is authorized.

## Eleventh hosted result and Node runtime compatibility

The constrained-chunk candidate,
`b1332bfb1bc12e64124c72d6ac50ee761764dff9`, passed GitHub Build & SSR
Verification. Lovable created the exact automatic card but again ended as
**Build unsuccessful** with **Preview is out of date** and no phase, exit code,
memory measurement, or actionable error. No same-SHA retry or publish was
performed.

The remaining pre-Vite compatibility review found in the
[Node CLI documentation](https://nodejs.org/download/release/v22.12.0/docs/api/cli.html#--expose-gc)
that `--expose-gc` was added to Node 20 in 20.18.0 and to Node 22 in 22.3.0.
[Lovable's public external-build guidance](https://docs.lovable.dev/tips-tricks/external-deployment-hosting)
recommends Node 22, but it does not establish the exact Node patch version used
by the hosted preview container. An older patch would reject the flag from
`NODE_OPTIONS` and exit before Vite could write a diagnostic. This is a
compatibility hypothesis, not a confirmed explanation for the hosted failure.

The explicit flag is no longer necessary for the important heap-reclamation
boundary: the constrained build now runs client and server-rendered builds in
separate child processes, and each process releases its entire graph on exit.
The optional `global.gc?.()` calls remain safe no-ops when an operator has not
started Node with explicit GC exposure.

The default Lovable/development scripts therefore remove only `--expose-gc` and
retain the verified 4 MiB semi-space and 912 MiB old-space bounds. The exact
912 MiB build without the flag completed the client, server-rendered
application, final Nitro Worker bundle, and service-worker generation. Its
Worker output passed browser smoke on Home, Student demo, Owner Hub demo, and
the expanded Pathway Report with the expected headings and no application
boundary, dynamic-import failure, or console error.

Acceptance still requires exactly one connected Lovable preview build for a
fresh exact candidate SHA. No same-SHA retry, publish, merge to `main`, deploy,
migration, or secret change is authorized.
