# Lovable hosted-build trigger — 2026-08-27

Decision: **NO-GO remains in force.** This documentation-only change exists
solely to create one new protected `main` commit for the connected Lovable
project to ingest and build. It does not authorize Lovable Publish, a production
deployment, DNS or secret changes, database work, or a live payment.

## Exact baseline

The trigger starts from protected `main` SHA
`1cf4f2a1dd31889b49c1c2d0964c1d438225756f` (PR #67). That commit passed the
repository checks and isolated-staging deployment and bounds Lovable's hosted
build memory without changing application behavior.

## Post-merge acceptance

After separate merge authorization, record the resulting 40-character `main`
SHA and allow exactly one Lovable hosted preview build. Do not publish or retry.
The build must succeed for that exact SHA and make the preview current;
otherwise retain NO-GO and capture the available failure evidence.
