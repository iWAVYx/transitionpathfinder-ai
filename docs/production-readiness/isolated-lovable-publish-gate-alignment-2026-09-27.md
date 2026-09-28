# Isolated Lovable publish-gate alignment — 2026-09-27

Status: **DRAFT — NOT APPLIED.** Production remains **NO-GO**.

This package responds to the isolated Lovable staging project's disabled
Publish control. The visible gate reported a stale build-validation failure and
two critical security groups. No finding is ignored, and Lovable's automatic
fix is not used.

## Reviewed scope

The forward-only migration
`20260927210000_narrow_catalog_and_site_media_reads.sql` proposes these changes:

- anonymous and signed-in clients lose direct `SELECT` on `jurisdictions`,
  `high_school_program_tags`, `plan_capacities`, and
  `partnerforward_incentive_categories`;
- each public catalog receives a `SECURITY DEFINER`, search-path-pinned listing
  function exposing only the fields the product intentionally renders;
- signed-in form templates move from direct table reading to two
  authenticated-only RPCs containing the previously reviewed eight-column
  allowlist;
- the old row-returning `active_jurisdiction_version` client grant is removed
  because it exposed every column of the version record; and
- `Public can read site-media` is removed from `storage.objects`. The bucket
  remains private and the existing server function continues to issue signed
  URLs without giving browsers permission to enumerate or read storage rows.

This is a migration proposal only. It has not been applied to isolated staging
or production and does not authorize a migration window.

## Build validation versus deployment acceptance

Lovable's internal validation reached the application through `localhost` and
had no staging Stripe token. The source build completed, but the strict
deployment endpoint correctly returned HTTP 503 because `localhost` is not an
approved staging hostname and payment mode was unknown. Treating that result as
a compilation failure mixed two different questions.

The new `/api/public/build-health` endpoint answers only whether immutable build
inputs agree:

- application and public environment labels;
- exact staging or production Supabase project identity;
- absence of opposite-environment credentials; and
- a structurally valid runtime source fingerprint and file count.

It explicitly reports that deployment acceptance is still required. It does
not inspect or approve a hostname, Stripe mode, deployment SHA, or public
availability. `/api/public/env-health` remains unchanged and fail closed for
those checks. A release operator must still compare the returned exact source
fingerprint with the reviewed source artifact and must run the external health
check on the real hosted origin.

## Regression boundary

Repository tests pin all of the following:

- no direct client reads remain on the five scanner-identified base tables;
- the four public catalog functions expose explicit non-sensitive fields;
- form-template functions require an authenticated session;
- `site-media` has no public storage-object policy and the application uses
  server-generated signed URLs rather than public object URLs;
- hosted build validation cannot substitute for deployment acceptance; and
- the cumulative `SECURITY DEFINER` client-execution allowlist remains explicit.

## Authorization boundary

This draft does not authorize applying or repairing a migration, deploying a
SHA, updating or publishing Lovable, ignoring scanner findings, changing
secrets or configuration, changing DNS or Cloudflare, running a payment, or
touching production. Those remain separate owner-approved actions after review,
green checks, and isolated-staging proof.
