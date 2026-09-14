# Production security inventory — 2026-09-14

## Decision

**READ-ONLY INVENTORY COMPLETE; PRODUCTION REMAINS NO-GO.** No migration was
applied, no ledger row was repaired, and no data, bucket, policy, secret,
deployment, Lovable setting, staging resource, or production configuration was
changed.

## Target and scope

- Lovable production project:
  `a4a5068b-10df-4e31-8d22-73186657d452`.
- Previously established production Supabase ref: `lrqcntqyekucamifpffs`.
- Query: `production-security-inventory.sql`.
- The query returns database identity, bucket configuration, RLS flags,
  policies, constraints, table/column grants, SECURITY DEFINER routine grants,
  and default function privileges. It does not read application rows, auth
  users, uploaded files, credentials, tokens, or secret values.
- The Lovable SQL results pane displayed 188 metadata rows across two pages.
  A raw CSV download did not complete, so this document records the reviewed
  aggregate evidence and does not claim that an export artifact exists.

## Recorded findings

### Storage and attachment boundary

- `channel-attachments` exists and is private (`public=false`).
- RLS is enabled and not forced on both `public.channel_attachments` and
  `public.form_templates`.
- `public.channel_attachments` currently has its primary key and three reviewed
  foreign keys: channel, message, and uploader. It does not yet have the
  antivirus scan-status constraint from the blocked attachment rollout.
- Authenticated users do not have table-level `UPDATE` on
  `public.channel_attachments`. Existing membership policies still allow a
  channel member to insert metadata and read attachment metadata without
  requiring `scan_status='clean'`.
- The related `storage.objects` read policy is membership-based and does not
  yet require a clean scan result. This confirms that the two attachment
  migrations must remain blocked until a private-scanning provider is approved
  and clean-file/EICAR staging evidence passes.

### Form templates

- `public.form_templates` has RLS enabled.
- Authenticated access still includes table-wide `SELECT` plus broader table
  privileges. The reviewed migration
  `20260907190000_security_finding_alignment.sql` remains necessary to replace
  table-wide reading with the explicit eight-column allowlist.

### Privileged routines

- Production has 76 public-schema SECURITY DEFINER routines.
- Effective execution before the pending least-privilege migration is:
  17 for PUBLIC, 26 for anonymous callers, 70 for authenticated callers, and
  all 76 for `service_role`.
- The reviewed target allowlists remain 0 PUBLIC, 5 anonymous, and 54
  authenticated routines. The service role must retain access to every
  privileged routine.

### Future function defaults

- Public-schema default ACL rows for the `postgres` and `supabase_admin`
  creator roles include function `EXECUTE` entries for browser-facing roles.
- The pending current-routine migration revokes PUBLIC execution by default for
  the role that applies it, but it does not revoke the existing anonymous and
  authenticated default entries. A later application-created function could
  therefore regain broad client execution even after current routines are
  aligned.
- The forward-only migration
  `20260914120000_harden_application_function_default_privileges.sql` closes
  that application-migration-role gap. It revokes default function execution
  from PUBLIC, `anon`, and `authenticated`, verifies those grants are absent,
  and verifies that `service_role` remains present. It does not alter current
  routines or explicitly target a platform-managed creator role; it governs
  whichever application migration role applies it.

## Migration ordering and boundary

The new migration is intentionally ordered after the existing current-routine
grant migration:

1. `20260907190000_security_finding_alignment.sql`
2. `20260907224500_least_privilege_security_definer_grants.sql`
3. `20260914120000_harden_application_function_default_privileges.sql`

The antivirus-dependent attachment migrations remain a separate blocked
release unit and were not edited by this alignment. This evidence and draft SQL
do not authorize a staging or production migration. Replay, review, isolated
staging application, protected regression evidence, named maintenance/abort
owners, and separate production authorization are still required.
