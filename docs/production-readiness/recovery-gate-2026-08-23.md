# Production recovery gate — 2026-08-23

Decision: **BLOCKED / NO-GO**. No production publish, migration, export, or
restore was performed while collecting this evidence.

## Current evidence

- Lovable documents that a Live database backup is created automatically before
  each publish and directs customers to Lovable Support for restoration help:
  <https://docs.lovable.dev/features/environments>.
- The current Lovable Cloud production dashboard for project
  `a4a5068b-10df-4e31-8d22-73186657d452` exposes **Export data**, but no visible
  self-service backup inventory or isolated restore control.
- **Export data was not selected.** An export artifact is not being treated as a
  successful restore drill or as proof that authentication users and storage
  objects can be recovered.
- A Lovable Support request with subject
  **Production backup inventory and isolated restore drill** was submitted and
  the UI confirmed: **Your message has been sent successfully!**

The request asks Lovable to confirm backup inventory and retention, identify the
latest recovery point, state whether database schema/data, authentication users,
and storage objects are covered, and assist with a restore into a new isolated
non-production environment. It also requires Lovable to disclose any cost or
credit impact before beginning.

The request explicitly says: do not publish, migrate, pause, reset, or otherwise
modify production; do not begin a paid restore or create a paid project without
separate approval.

## Evidence still required

The support request is not proof that recovery works. Keep
`production.restoreDrillVerified` set to `false` until all of the following are
attached:

1. The recovery-point timestamp and documented retention.
2. A restore into an isolated non-production target.
3. Schema verification plus representative application smoke testing against
   the restored target without real-student test fixtures.
4. Recorded restore start/end times and evaluated RPO/RTO.
5. Coverage evidence for database schema/data, authentication users, and storage
   objects, or an explicit recovery plan for any excluded component.

The pending production migrations
`20260821230000_security_remediation_hardening.sql` and
`20260825041500_restore_admin_helper_grants_and_public_cms_reads.sql`, followed
by `20260825050000_scope_public_cms_admin_policies.sql`, remain unauthorized
while this gate is blocked.
