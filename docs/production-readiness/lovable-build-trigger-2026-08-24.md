# Lovable hosted-build trigger — 2026-08-24

Decision: **NO-GO remains in force.** This intentionally documentation-only
change exists to create a new protected `main` commit that the connected
Lovable project can ingest and build. It does not authorize a Lovable publish,
production deployment, DNS change, production migration, secret change, live
payment, or production-data mutation.

## Baseline and scope

The trigger branch starts from merged `main` SHA
`4b1550f875e62ac5ced2fe39d2b2aff920deca3a` (PR #57). That baseline separates
the memory-heavy client and SSR bundles into different child processes and
passed the repository build, production-readiness, and isolated-staging gates.

This trigger changes documentation only. It does not change application code,
dependencies, build commands, GitHub workflows, Supabase migrations, RLS,
authentication, MFA, role guards, Cloudflare configuration, Stripe behavior,
or any environment or secret value.

## Post-merge acceptance

After this PR is explicitly approved and merged:

1. Record the resulting 40-character GitHub `main` merge SHA.
2. Confirm the connected Lovable project receives that exact SHA and starts no
   more than one hosted preview build for it.
3. Require Lovable to report `Build successful` and a current preview for the
   exact merge SHA. `Build unsuccessful`, `Preview is out of date`, a different
   SHA, or an unverifiable build identity remains a release stop.
4. If the build fails, capture the available failing phase, first actionable
   error, exit code, and build identity without retrying, editing code in
   Lovable, weakening the exact-SHA gate, publishing, or exposing secrets.

The production-readiness decision may change only in a separate reviewed PR
after all remaining blocking controls have evidence. This trigger alone cannot
move the product to GO.
