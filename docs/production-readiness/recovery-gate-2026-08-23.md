# Production recovery gate — 2026-08-23

Decision: **BLOCKED / NO-GO**. No production publish, migration, export, or
restore was performed while collecting this evidence.

## Current evidence

- Lovable documents that a Live database backup is created automatically before
  each publish and directs customers to Lovable Support for restoration help:
  <https://docs.lovable.dev/features/environments>.
- Lovable Support replied on 2026-08-25 that Lovable Cloud creates automatic
  daily backups with approximately 14 days of retention. Support says those
  backups cover the full database, including the `auth` schema and authentication
  users, but do not contain uploaded Storage objects.
- The signed-in production dashboard for project
  `a4a5068b-10df-4e31-8d22-73186657d452` displayed 15 daily recovery points from
  **Aug 11, 2026, 10:18:45 AM UTC** through
  **Aug 25, 2026, 10:14:51 AM UTC**.
- The same read-only inspection found three private Storage buckets:
  `student-documents`, `site-media`, and `channel-attachments`. Each displayed
  **0.0 KB for 0 files**. This only proves that there were no Storage objects at
  inspection time; inventory must be repeated immediately before release.
- Lovable Support confirmed that self-service backup restore is in-place only.
  It cannot restore a backup into an isolated environment, and the service does
  not record restore start/end times. An in-place production restore is not an
  acceptable drill.
- Lovable exposes **Cloud → Overview → Advanced settings → Export data** for a
  downloadable database dump. The control was visible and enabled during the
  2026-08-25 inspection. **Export data was not selected**, no dump was created or
  downloaded, and no restore was started.
- Support said the built-in in-place backup restore has no additional cost. That
  statement does not establish that a separate isolated restore target is free.
- A Lovable Support request with subject
  **Production backup inventory and isolated restore drill** was submitted and
  the UI confirmed: **Your message has been sent successfully!**

The support request asked Lovable to confirm backup inventory and retention,
identify the latest recovery point, state whether database schema/data,
authentication users, and storage objects are covered, and assist with a restore
into a new isolated non-production environment. Lovable answered the inventory
and coverage questions, but cannot provide the requested isolated restore.

The request explicitly says: do not publish, migrate, pause, reset, or otherwise
modify production; do not begin a paid restore or create a paid project without
separate approval.

## Evidence still required

The support request is not proof that recovery works. The response and visible
backup inventory close the inventory question, not the restore-drill gate. Keep
`production.restoreDrillVerified` set to `false` until all of the following are
attached:

1. The recovery-point timestamp and documented retention.
2. A Lovable Data Export restored into a new isolated non-production target that
   is neither production `lrqcntqyekucamifpffs` nor the existing isolated staging
   project `qgrertkqbwanerqqemph`.
3. Schema verification plus representative application smoke testing against
   the restored target without real-student test fixtures.
4. Recorded restore start/end times and evaluated RPO/RTO.
5. Coverage evidence for database schema/data, authentication users, and storage
   objects, or an explicit recovery plan for any excluded component.

The controlled compensating procedure and cost gate are in
`isolated-restore-drill-plan-2026-08-25.md`. No target may be created and no
export may be generated until its expected cost and sensitive-data handling are
accepted. Production and existing staging must remain untouched.

The pending production migrations
`20260821230000_security_remediation_hardening.sql` and
`20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`, followed
by `20260825050000_scope_public_cms_admin_policies.sql`, remain unauthorized
while this gate is blocked.
