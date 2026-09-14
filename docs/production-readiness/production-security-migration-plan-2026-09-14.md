# Production security migration plan — 2026-09-14

Status: **PREPARED FOR REVIEW ONLY; production remains NO-GO.** Do not execute
this procedure until the owner separately authorizes the exact three migration
files, target, candidate SHA, operators, and maintenance window.

## Approved-scope candidate

The proposed antivirus-independent release unit is exactly:

1. `20260907190000_security_finding_alignment.sql`
2. `20260907224500_least_privilege_security_definer_grants.sql`
3. `20260914120000_harden_application_function_default_privileges.sql`

The files must be applied in that order from the final approved protected-main
commit. Do not edit, rename, skip, combine, replace, or mark any file applied by
hand to get past an error.

The attachment migrations dated `20260908000500` and `20260909010000` are not
part of this window. They remain blocked on private-scanning provider/privacy
approval and protected clean-file/EICAR staging evidence.

## Preconditions — all must be recorded

- Name one release owner, one database operator, one abort owner, and one
  incident-communications channel. A person may hold more than one role, but
  every responsibility must be accepted explicitly.
- Record the exact 40-character protected-main SHA and verify that the three
  files match its reviewed contents.
- Visually confirm Lovable production project
  `a4a5068b-10df-4e31-8d22-73186657d452` maps to production Supabase ref
  `lrqcntqyekucamifpffs`. Stop if staging ref `qgrertkqbwanerqqemph` appears.
- Record the newest visible automatic backup recovery point and confirm the
  previously passed isolated export/restore drill is still accepted. Do not
  start an in-place production restore as a test.
- Capture a fresh SELECT-only production migration-history export and run the
  content-aware comparator against the exact candidate SHA. Stop on unknown,
  duplicate, malformed, mismatched, or newly pending content.
- Repeat the SELECT-only production security inventory and the extension
  namespace inventory. Record the current applying role, current privileged
  routine signatures/grants, form-template privileges, and public-schema
  default function privileges.
- Confirm no unrelated application publish, DNS change, secret rotation,
  payment test, background migration, or antivirus action overlaps the window.

## Abort conditions before the first write

Stop without applying anything if:

- the production project identity, candidate SHA, file hashes, pending list, or
  applying role is ambiguous;
- the current routine signatures no longer match the reviewed grant allowlist;
- a required backup/export, owner, communication path, or observation plan is
  missing;
- the database reports an unhealthy state, unexpected invalid object, or
  unreviewed migration; or
- either attachment migration appears in the proposed execution batch.

## Controlled application

1. Enter the approved maintenance state and record the UTC start time.
2. Reconfirm the project ref, candidate SHA, exact pending list, and current
   database role immediately before the first write.
3. Apply one canonical file at a time with stop-on-error. Use the reviewed
   migration mechanism that records the exact one-element statement in
   `supabase_migrations.schema_migrations`; do not paste a modified copy.
4. After each file commits, verify exactly one ledger row, the canonical name,
   one recorded statement, and the targeted invariants below. Do not advance
   after an error or mismatch.

### After `20260907190000`

- `is_partner_only(uuid)` is executable only by `authenticated` and
  `service_role`, not PUBLIC or anonymous callers.
- `form_templates` retains RLS.
- Anonymous and PUBLIC table/column reading is denied.
- Authenticated callers lack table-wide `SELECT` and can select only the eight
  reviewed columns: `slug`, `title`, `description`, `audience`, `category`,
  `schema`, `created_at`, and `updated_at`.

### After `20260907224500`

- No public-schema SECURITY DEFINER routine is PUBLIC-executable.
- The anonymous executable set exactly matches the reviewed five-routine
  allowlist.
- The authenticated executable set exactly matches the reviewed 54-routine
  allowlist.
- Every public-schema SECURITY DEFINER routine remains executable by
  `service_role`.
- The migration's embedded verifier completes; any new or missing signature is
  an abort, not a reason to loosen the allowlist during the window.

### After `20260914120000`

- For the role that applied the migration, public-schema default function
  `EXECUTE` contains no entry for PUBLIC, `anon`, or `authenticated`.
- The same applying-role defaults retain `service_role` execution.
- Record the applying role. This migration does not claim to govern a different
  platform-managed creator role; any separate `supabase_admin` defaults remain
  an explicit vendor/platform boundary rather than an inferred pass.

## Verification before reopening

- Export the final production migration history and rerun the content-aware
  comparator. The three-file release unit must have zero unresolved entries;
  the two antivirus-dependent files must remain explicitly pending/blocked.
- Rerun the permission, RLS, and cross-district suites only with approved
  production-safe synthetic tenants; never use real student or IEP data as a
  fixture.
- Run non-mutating production health and application smoke checks. Health must
  report production labels, production ref `lrqcntqyekucamifpffs`, the exact
  approved SHA, the approved hostname, live Stripe configuration, and
  `isolation.ok=true`.
- Recheck login/MFA, invitation/licensing, document authorization, and the
  public content flows affected by the grants. Do not run a live payment without
  separate approval.
- Review logs and error rates for the agreed observation period before reopening
  normal writes or declaring the database portion complete.

## Rollback and recovery decision

These files are forward-only. Do not improvise down SQL.

- If a file fails before commit, stop. Verify that its ledger row and effects
  are absent, preserve diagnostics, and do not advance.
- If catalog integrity and tenant isolation remain healthy, prefer a separately
  reviewed forward correction while writes stay paused.
- If data integrity, authentication, or tenant isolation is compromised and a
  safe forward correction cannot be reviewed inside the window, disable writes
  and use the approved pre-window recovery point. Record and reconcile any
  writes after that point before reopening.
- Application rollback is separate. Reverting the Lovable snapshot does not
  undo database changes, and database recovery does not select an application
  snapshot. Confirm schema compatibility before either action.
- Rotate a credential only if exposure is suspected and under its own approved
  procedure; never copy a staging credential into production.

The release owner must record UTC timestamps, operators, candidate SHA, file
hashes, ledger results, invariant results, smoke results, observation outcome,
and the final database GO/NO-GO decision. Passing this database window would
not close the independent malware, legal/privacy, email, observability,
Cloudflare, Stripe, or final production-release gates.
