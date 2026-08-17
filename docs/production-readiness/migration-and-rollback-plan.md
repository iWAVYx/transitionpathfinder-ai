# Production migration and rollback plan

This plan is deliberately forward-only and fail-closed. Do not run any command
in this document until the production environment exists, a release owner has
approved the exact commit and migration delta, and a database operator is in
the maintenance window.

## 1. Establish the baseline (read-only)

1. Record the approved Git SHA and the 187 sorted canonical migration files.
2. After visually confirming Lovable Cloud production project ref
   `lrqcntqyekucamifpffs`, run the SELECT-only
   `production-migration-baseline.sql` query in its SQL editor and export the
   ordered result as JSON or CSV. The production project is Lovable-managed and
   is not one of the projects in the separately signed-in Supabase organization.
3. Save the export outside tracked source (for example,
   `.tmp/production-migration-history.json`) and compare it locally:

   ```sh
   npm run audit:production-migrations -- .tmp/production-migration-history.json
   ```

   The comparator fails closed on an empty or malformed export, duplicate or
   production-only versions, non-increasing order, and any missing historical
   version. It emits the exact canonical forward tail only when the recorded
   versions are aligned.
4. Compare version numbers exactly. Stop for a missing historical version,
   production-only version, duplicate, renamed migration, or checksum concern.
5. Produce the exact pending list. Never assume every file after a remembered
   timestamp is pending.
6. Review each pending statement for locks, table rewrites, uniqueness failures,
   role/grant changes, RLS changes, extension needs, and post-deploy jobs.

## 2. Prove recovery

1. Confirm Lovable Cloud backup/export retention and record the recovery point
   immediately before the maintenance window. A visible daily-backup inventory
   is evidence of backups, not evidence that recovery works.
2. Restore the backup into an isolated, non-production project.
3. Run schema verification and a representative application smoke test on the
   restored copy. Record elapsed restore time and recovery-point objective.
4. Export non-secret Lovable publish/build/domain metadata and record the last
   known-good published application snapshot. If an approved release changes
   production hosting to Cloudflare, export Worker version/route metadata too.
5. Define the abort owner, database operator, release operator, and incident
   communication channel.

If the restore drill has not passed, the migration is NO-GO.

## 3. Apply in canonical order

1. Put write-heavy/background operations into the approved maintenance state.
2. Confirm the target project ref is exactly `lrqcntqyekucamifpffs` and is not
   staging (`qgrertkqbwanerqqemph`).
3. Re-read the migration baseline and confirm the pending list has not changed.
4. Apply one canonical migration at a time in filename order with stop-on-error.
5. After each file, verify its recorded version and targeted invariants. Do not
   edit, rename, skip, or mark a migration applied manually to get past a
   failure.
6. The August 14 repository sync added six later migration versions whose SQL
   repeats already-canonical changes. Preserve those version numbers when
   comparing remote history. The two copies that create indexes are deliberately
   idempotent so a clean replay and a database that already has the original
   indexes both succeed; never mark either version applied by hand.
7. After both
   `20260813013345_20260812163612_harden_scheduled_hook_isolation.sql` and its
   later synchronized version
   `20260814203430_dd944c00-cb34-4cb1-b5a7-ee6e76f67235.sql`, verify the three
   privileged HTTP cron jobs are absent. Provision the production Vault origin
   and webhook secret, verify the Worker secret matches, then call the private
   scheduling function as the database operator. Never store a decrypted secret
   in migration SQL or `cron.job.command`.

## 4. Verification gates

- Exact migration history equals the reviewed canonical list.
- RLS/permission regression and cross-district isolation pass on a controlled
  production-safe test tenant or approved clone; never use real student data as
  a test fixture.
- Production env health reports both labels `production`, project ref
  `lrqcntqyekucamifpffs`, Stripe `live`, allowed hostname, exact Git SHA, and
  `isolation.ok=true`.
- Cron endpoints reject missing/bad authorization and accept only the exact
  production origin/secret pair.
- Application smoke tests and observability checks pass.

## 5. Rollback decision

Application rollback and database recovery are separate decisions:

- If the schema is healthy and backward-compatible but the application fails,
  restore the recorded last known-good Lovable published snapshot. If production
  has been intentionally moved to Cloudflare, roll the Worker back to its
  recorded last known-good version instead. Verify that the chosen application
  version is compatible with the new schema.
- If a forward migration partially fails, stop immediately. Do not improvise
  down SQL. Prefer a reviewed corrective forward migration when data integrity
  is intact.
- If the migration corrupts data, breaks isolation, or cannot be corrected
  safely inside the window, disable writes, capture evidence, and restore to the
  pre-migration recovery point. Reconcile any writes after that point under the
  incident plan before reopening.
- Rotate any credential suspected of exposure. Never copy staging credentials
  into production during recovery.

The release owner records the decision, timestamps, affected versions, and
verification evidence before declaring recovery complete.
