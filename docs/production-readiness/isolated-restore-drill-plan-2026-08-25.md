# Isolated Lovable recovery drill plan — 2026-08-25

Status: **PLANNED / NOT YET RUN**. Production remains **NO-GO**.

This document converts Lovable Support's 2026-08-25 response and the signed-in
read-only dashboard inspection into a safe recovery drill. It does not authorize
a production restore, production migration, Lovable publish, database export,
new paid project, or deletion.

## What is now known

- Project `a4a5068b-10df-4e31-8d22-73186657d452` displayed 15 daily backup
  points from Aug 11 through Aug 25, 2026. The newest visible recovery point was
  **Aug 25, 2026, 10:14:51 AM UTC**; the oldest was
  **Aug 11, 2026, 10:18:45 AM UTC**.
- Lovable Support says daily backups retain approximately 14 days and include
  the full database, schema, data, and authentication users in the `auth` schema.
- Support says uploaded Storage objects are excluded. The production dashboard
  showed three private buckets — `student-documents`, `site-media`, and
  `channel-attachments` — and each showed **0.0 KB for 0 files** on 2026-08-25.
- The production Cloud database reported PostgreSQL `17.6.1.127`, a Tiny
  instance, and 1.44 GB used of a 2 GB disk during the inspection. Disk usage is
  not the same as logical export size, so it cannot establish target capacity.
- Lovable's built-in restore is in-place only and would replace the existing
  production database. It is therefore prohibited as a rehearsal.
- Lovable's **Export data** control is visible and enabled. It creates a
  downloadable database dump suitable for restoring elsewhere. It was not
  selected, so no sensitive dump currently exists from this inspection.
- Lovable does not record restore start/end times; the operator must time the
  drill manually.

The support response is operational guidance, not proof that any recovery path
works. The isolated drill below is the compensating test for the unavailable
isolated backup restore.

## Hard isolation rules

The restore target must be a new disposable environment. It must never be:

- production Supabase ref `lrqcntqyekucamifpffs`;
- existing staging Supabase ref `qgrertkqbwanerqqemph`;
- connected to the production or staging Lovable application;
- configured with production or staging API keys, webhooks, mail delivery,
  background jobs, Stripe credentials, domains, or OAuth callbacks.

Until teardown is separately approved, the disposable target must use restricted
access, have outbound integrations disabled, and be treated as containing live
student and authentication data. The export and connection strings must remain
untracked, outside the repository and CI artifacts, and must never be printed in
logs or copied into GitHub, Cloudflare, Lovable chat, or support messages.

## Cost gate and target choice

Use the lowest-cost compatible option, but do not create it until the owner sees
and accepts the exact price:

1. **Preferred if it fits: a disposable free Supabase project.** Supabase's
   published Free plan currently allows two active free projects and 500 MB of
   database size per project. This option is $0 only if the account has an
   available free-project slot and the restored database fits the limit.
2. **Otherwise: a temporary paid Supabase project.** Show the exact monthly and
   compute estimate before creation. Delete it only after separate approval once
   evidence is retained.
3. **Local Supabase is a no-cloud-cost fallback** only after Docker Desktop and
   compatible local tooling are available. A local instance is for the drill
   only and is never a production target.

Official references:

- <https://supabase.com/pricing>
- <https://supabase.com/docs/guides/platform/billing-on-supabase>
- <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>
- <https://supabase.com/docs/guides/local-development/restoring-downloaded-backup>

## Authorized drill sequence

Each phase needs an operator timestamp and a stop/go decision. Do not skip ahead.

1. Re-open Lovable Backups and Storage read-only. Record the latest recovery
   point and confirm all three Storage bucket object counts again.
2. Select **Export data** once. Save the dump to a restricted temporary location,
   record only its byte size and SHA-256 checksum, and never commit the dump.
3. Use the dump size and current account project inventory to choose the target.
   Stop for explicit approval if creating the target could cost money.
4. Create one disposable isolated target. Record its new project ref and prove it
   differs from both protected refs above before obtaining its connection string.
5. Disable email delivery, webhooks, scheduled/background jobs, payment calls,
   external AI calls, and custom domains before restoring data.
6. Start the RTO clock immediately before restore. Restore with stop-on-error and
   preserve the complete error summary without recording row contents or secrets.
7. Verify schema version, migration history, expected table inventory,
   representative non-sensitive row counts, authentication-user count, required
   extensions, RLS enabled state, and grants. Do not display names, email
   addresses, student records, credentials, or tokens.
8. Run a read-only smoke test against the isolated target with outbound services
   disabled. Confirm public reads, one controlled authentication path, and denial
   of cross-district access. Do not send mail or process a payment.
9. Stop the clock when verification passes. Record export timestamp, restore
   start/end, elapsed RTO, recovery point and calculated RPO, failures, and the
   operator decision.
10. Retain only the redacted evidence. Teardown of the target and dump is a
    separate destructive action and requires explicit approval.

## Pass criteria

The drill passes only when:

- the target identity is new and isolated;
- the dump restores without unreviewed errors;
- schema, migration history, authentication counts, RLS/grants, and smoke tests
  agree with the source evidence;
- Storage remains zero objects, or a separately tested Storage recovery procedure
  covers any objects found during the pre-release recheck;
- RPO and RTO are measured and accepted by the owner;
- no production or staging state changed and no outbound side effect occurred;
- redacted evidence is attached to a reviewed PR.

Until then, `production.restoreDrillVerified` remains `false`, the three pending
production migrations remain unauthorized, and production remains **NO-GO**.
