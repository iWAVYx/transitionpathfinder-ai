# Lovable public client-only route stubs — 2026-08-29

Production decision: **NO-GO**. This change does not trigger or retry a Lovable
hosted build, publish Lovable, deploy staging or production, migrate a database,
or change a secret, payment control, role guard, RLS policy, MFA rule, or
Cloudflare protection.

## Confirmed boundary

Lovable's single authorized preview build for merged main SHA
`1f800a2d279314d74b29774e2a025e874f9d9a77` ended as **Build unsuccessful**
with an out-of-date preview. The read-only diagnostic returned empty
`diagnostics` and `failed_targets` data and exposed no compiler error, exit
code, timestamp, termination reason, memory measurement, or platform limit.
No retry or publish was performed.

The exact Lovable sandbox build passed locally at the repository's 1,536 MiB
V8 old-space limit, but process-tree sampling measured approximately 4,137 MiB
peak working set and 4,729 MiB peak private bytes. Reducing V8 old space to
1,024 MiB did not materially change total memory (approximately 4,128 MiB peak
working set). Disabling Vite or Nitro minification also produced no meaningful
reduction. Those experiments were reverted.

## Root cause and change

The final `lovable-fetch-bundle` is intentionally one file. Module reporting
showed that Nitro was inlining full interactive demo and shared-report UI graphs
even though those routes initialize their meaningful state in the browser:

- authenticated routes restore identity from browser storage;
- public demo routes restore fictional demo selections from browser state; and
- `/share/$token` resolves the token after the component mounts.

The existing server-only authenticated-route transform is therefore extended
to the public demo route group and `/share/$token`. The client environment still
receives the original route modules, components, loaders, sample data, and
interactions. The server receives a lightweight `ssr: false` route definition
with basic title, description, canonical, and privacy metadata. The transform
fails closed if any covered route gains an inline server primitive; such a
handler must first move to a dedicated server-function or server-route module.

This preserves the upcoming parent-testing sample pathway experience. It
removes only a duplicate server compilation path that did not produce the
meaningful interactive page.

## Local acceptance evidence

The exact sandbox build completed successfully with:

- client modules: 5,295 (unchanged);
- SSR modules: 600 (previously 759);
- Nitro modules: 3,720 (previously 3,762);
- final server bundle: approximately 7.665 MB (previously 8.918 MB);
- peak working set: approximately 1,907 MiB (previously 4,137 MiB); and
- peak private bytes: approximately 2,101 MiB (previously 4,729 MiB).

The client artifact sizes for the demo and report pages remained present and
unchanged in purpose. Repository acceptance additionally requires typecheck,
the production-readiness contract, and the exact full sandbox build from a clean
tree.

## Required post-merge acceptance

1. Merge only after green repository checks and explicit owner authorization.
2. Permit exactly one Lovable preview build for the resulting exact merge SHA.
   Do not publish or retry.
3. Require **Build successful** and a current preview for that exact SHA.
4. Exercise the signed-out demo, sample Pathway Report, and shared-report route.
5. Verify preview health and exact-SHA identity read-only.
6. Obtain separate owner authorization before any production publish.
