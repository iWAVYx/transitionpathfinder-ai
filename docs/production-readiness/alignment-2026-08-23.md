# Production resources RLS alignment — 2026-08-23

## Observed state

Lovable's monitoring remediation applied a direct policy replacement to the
Lovable-managed production Supabase project `lrqcntqyekucamifpffs`:

- it removed the legacy `Anyone reads verified resources` policy, whose
  expression could invoke the authenticated-only `has_role` helper for anonymous
  requests;
- it added `Authenticated reads verified resources` with `TO authenticated`;
- it left the existing `Public reads published resources` policy as the narrow
  anonymous access boundary.

A read-only anonymous request for published resources returned HTTP 200 after the
change. GitHub `main` remained at
`f8b72c2370cc8bc966ab0275906925b2d11a9449`, and no application publish or
production deployment was performed.

## Canonical alignment

`20260823100000_align_public_resources_select_policies.sql` records the policy
replacement in the repository so migration replay and future environments have
the same behavior. It is idempotent with the observed production policy state.

This change does not apply the migration to staging or production. Production
remains **NO-GO** until the protected staging migration/replay checks pass and the
production migration history is reconciled through the approved release process.
