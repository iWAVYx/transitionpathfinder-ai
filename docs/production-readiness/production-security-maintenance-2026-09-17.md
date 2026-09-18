# Production security maintenance evidence — 2026-09-17

Decision: **DATABASE SECURITY WINDOW PASSED; overall production remains
NO-GO.** This record documents the separately authorized, antivirus-independent
production maintenance window. It does not authorize or record a Lovable
publish, attachment migration, DNS change, antivirus run, secret change, or
live payment.

## Authorization and identity

- Protected `main` SHA:
  `f933401803e26ac76e3190d71cab9ca8c8b52536`.
- Lovable production project:
  `a4a5068b-10df-4e31-8d22-73186657d452`.
- Production Supabase project ref: `lrqcntqyekucamifpffs`.
- Applying database role: `postgres`.
- The project owner was the release and abort owner. Codex operated the
  production SQL editor within the exact authorized scope, and the authorizing
  Codex task was the incident-communication record.
- Pre-window database observation: `2026-09-17 11:56:16.840501 UTC`.
- Final database verification: `2026-09-17 23:54:44.631906 UTC`.
- Newest visible automatic Lovable backup before the first write:
  `2026-09-17 10:20:10 UTC`. No restore was started.

Immediately before the first write, the production ledger contained 184 rows
through `20260825050000`. The comparator found exactly five canonical pending
files, no malformed or duplicate versions, no unresolved production rows, and
no policy errors. The attachment files were identified and excluded before the
window opened.

## Applied release unit

The following reviewed files were applied one at a time, in this order, with a
5-second lock timeout, a 60-second statement timeout, stop-on-error behavior,
an exact one-element migration-ledger statement, and a post-file verifier:

| Order | Version and name | Canonical SQL SHA-256 | Result |
| ---: | --- | --- | --- |
| 1 | `20260907190000_security_finding_alignment` | `3155d9b4cba7eec0a3171edd041a004155dc509cc585a8deb74aa9723a8d22cf` | PASS |
| 2 | `20260907224500_least_privilege_security_definer_grants` | `8c98ef5e949331209182d049f2daca58c0f68aaade6e345116aab01d58f3cc71` | PASS |
| 3 | `20260914120000_harden_application_function_default_privileges` | `8c261dafac5b3a6eeec4a2b59ae92884a4d217daeec0a1949197c6382c2a26b5` | PASS |

Each version is recorded exactly once with one statement, the reviewed name,
and the expected SHA-256. No migration required a retry, rollback, or forward
correction.

## Post-file security evidence

After `20260907190000`:

- `is_partner_only(uuid)` is not executable by PUBLIC or `anon`;
- `authenticated` and `service_role` retain the reviewed execution access;
- `form_templates` retains row-level security;
- PUBLIC, `anon`, and `authenticated` lack table-wide `SELECT`; and
- authenticated column access is limited to `audience`, `category`,
  `created_at`, `description`, `schema`, `slug`, `title`, and `updated_at`.

After `20260907224500`:

- 76 public-schema SECURITY DEFINER routines were inventoried;
- PUBLIC-executable routines: 0;
- anonymous-executable routines: 5, matching the embedded reviewed allowlist;
- authenticated-executable routines: 54, matching the embedded reviewed
  allowlist; and
- routines missing `service_role` execution: 0.

After `20260914120000`, the applying role's public-schema function defaults
contained zero EXECUTE entries for PUBLIC, `anon`, and `authenticated`, and one
for `service_role`. The separate platform-managed `supabase_admin` defaults
were observed but not changed.

One SELECT-only verifier initially addressed PostgreSQL's `PUBLIC` pseudo-role
as if it were a login role and returned an error. It made no database change.
The corrected catalog-ACL verifier passed before the window advanced.

## Final baseline and invariant checks

The final ledger contains 187 rows and ends at `20260914120000`. The fresh
SELECT-only export is
`evidence/production-migration-history-2026-09-17.csv`:

- rows: 187 plus the header;
- source-export SHA-256:
  `E257F51422040DFF6A5A8DCC9D221E7C3F3A93D674D906A124B68494D1D626D1`;
- comparator result: expected `blocked` status only because the two excluded
  attachment migrations remain pending;
- direct production coverage: 187;
- reviewed supersessions: 6;
- production-forbidden exclusions: 1; and
- malformed, duplicate, unresolved, and policy-error entries: 0.

The two deliberately excluded files remain absent from production:

1. `20260908000500_channel_attachment_malware_gate.sql`
2. `20260909010000_create_private_channel_attachments_bucket.sql`

Storage was unchanged. The final bucket signature was
`channel-attachments:false,database_export_26_08_26:false,site-media:false,student-documents:false`.

The managed `pg_net` boundary also remained intact: one non-relocatable,
`supabase_admin`-owned extension; 28 platform-owned members; zero members in
`public`; and a passing boundary guard. No extension object was moved, altered,
upgraded, dropped, or reinstalled.

## Application health and remaining NO-GO boundary

The non-mutating production health endpoint responded after the database
window and confirmed the production hostname and Supabase ref. It did not pass
the overall release isolation gate:

- `app_env=production`;
- `vite_app_env=unknown` because the public build value is absent;
- `stripe_mode=unknown` and `stripe_livemode=null`;
- reported application SHA
  `9b8620a79ca60d62eb7768a6ee8f3d7764c5ee71`, not the approved protected-main
  SHA; and
- `isolation.ok=false` for the missing application-environment and Stripe
  build inputs.

These application configuration and publish gates are independent of the
successful database security window. Production remains NO-GO until they and
the remaining release checklist items are separately closed. No Lovable
publish, DNS change, attachment migration, antivirus run, or live payment was
performed during this window.
