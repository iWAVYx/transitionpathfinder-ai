# Production-readiness alignment — 2026-08-15

Scope: post-merge evidence for PR #19 and the credential-free/protected checks
needed to align document RLS and permission fixtures. This work does not deploy
or migrate production.

## PR #19 post-merge evidence

PR #19 merged to `main` as
`4f3c8367e36be5ada277b4ec08ed86a7ace09c02`. Build, disposable migration
replay, cross-district RLS, accessibility, CT Seed v2, and the production
readiness contract passed.

Four protected checks failed closed:

- Dashboard and role-guard QA expected `4f3c8367` but isolated staging still
  served `b137b22`.
- Permission regression used obsolete `student_relationships.relationship_type`
  fixture values (`educator` and `parent`) instead of the schema's canonical
  values (`educator_case_manager` and `parent_guardian`). The invalid values
  produced CHECK-constraint failures before the intended RLS policies ran.
- Document RLS behavioral, storage-path, privilege, and hard-invariant checks
  passed, but the exact document/storage policy snapshot was stale.

Protected workflow runs:

- Dashboard: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31924455204>
- Role guard: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31924455141>
- Permission regression: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31924455146>
- RLS regression: <https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/31924455143>

## Alignment controls

- Permission fixtures now use canonical relationship types, and an RLS-denial
  assertion rejects SQLSTATE `23514` so a CHECK constraint cannot masquerade as
  a successful RLS denial test.
- The committed document policy snapshot represents the final canonical
  migration chain, including the malware-clean download gate in
  `20260814215748_0bb83fc3-57a7-4fa4-a669-cce132fe5c0f.sql`.
- Disposable migration replay compares that credential-free canonical policy
  state to the committed snapshot.
- Static and live document-policy security floors require partner isolation,
  student edit scoping, uploader/admin quarantine exceptions, and the
  `storage_can_read_student_doc` gate.
- Snapshot capture remains manual, `main`-only, and protected by the GitHub
  `staging` environment. Capture now includes calendar and document evidence,
  and update mode still enforces the behavioral hard invariants.

## Required staging sequence

After this alignment is reviewed and merged:

1. Apply the approved, pending canonical migrations to isolated staging only.
2. Deploy the resulting exact `main` SHA to the staging Worker.
3. Run the protected staging snapshot capture and review the artifact.
4. Rerun every protected `main` gate and require all checks to pass.

Do not weaken exact-SHA parity or copy staging credentials into pull-request
workflows. Production remains **NO-GO** and must not be deployed or migrated as
part of this sequence.
