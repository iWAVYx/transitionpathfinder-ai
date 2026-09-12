# Isolated staging migration-ledger repair — 2026-09-11

Decision: **STAGING LEDGER ALIGNED; production remains NO-GO.**

This record covers one narrowly authorized correction to the isolated staging
migration history. It did not execute the canonical migration SQL, modify the
Storage bucket, deploy code, publish Lovable, or access production.

## Scope and preflight

- Authorized migration version: `20260909010000` only.
- Isolated staging project: `qgrertkqbwanerqqemph` (`staging/E2E`).
- Production project `lrqcntqyekucamifpffs` was not opened, queried, or changed.
- The staging migration ledger did not contain `20260909010000` before repair;
  its newest visible row was `20260908000500_channel_attachment_malware_gate`.
- A read-only bucket query returned exactly one `channel-attachments` row with
  `public = false` before repair.
- The ledger schema permits `statements`, `name`, `created_by`,
  `idempotency_key`, and `rollback` to be null; only `version` is required.

## Ledger-only correction

One idempotent history row was inserted into
`supabase_migrations.schema_migrations`:

| Field | Recorded value |
| --- | --- |
| `version` | `20260909010000` |
| `name` | `create_private_channel_attachments_bucket` |
| recorded statement count | `0` |

The operation used an empty `statements` array and a `where not exists` guard.
It did **not** run
`supabase/migrations/20260909010000_create_private_channel_attachments_bucket.sql`.

## Post-repair verification

- A new read-only ledger query returned the exact version and name above with
  `recorded_statement_count = 0`.
- A separate read-only bucket query again returned
  `channel-attachments / channel-attachments / false`.
- No migration file was applied or reapplied.
- No Storage row or policy was inserted, updated, or deleted.

## Exact-SHA protected staging evidence

The already deployed protected `main` SHA remained
`c0cee6269363fa3368654191ad3b5efd7b58c5c1`. Deployment run
[34663612644](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663612644)
had already proved exact-SHA parity and `production_environment: false`; no
redeployment was performed for this ledger correction.

After the repair, the protected staging workflows were rerun at that exact SHA:

| Workflow | Attempt | Result |
| --- | ---: | --- |
| [CT Seed v2 Audit](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585603) | 2 | PASS |
| [Cross-district RLS QA](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585616) | 2 | PASS |
| [RLS regression QA](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585629) | 2 | PASS |
| [Permission regression QA](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585586) | 2 | PASS |
| [Role-guard QA](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585585) | 2 | PASS |
| [Dashboard regression](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34663585578) | 2 | PASS |
| [Release readiness](https://github.com/iWAVYx/transitionpathfinder-ai/actions/runs/34664391649) | 3 | PASS |

Release-readiness attempt 2 had one 60-second browser stall on the duplicate
partner `/goals` guard while its earlier check of the same restriction passed.
The captured page never exposed private content and remained on
`Checking access…`. One failed-job-only retry was allowed at the same SHA and
protected staging environment; attempt 3 passed the complete suite in 11m03s.
No further retry occurred.

## Remaining boundary

This evidence closes only the isolated-staging ledger mismatch. It does not
authorize a production baseline query, production migration, release publish,
DNS change, secret change, Stripe transaction, or production GO decision. The
unchecked controls in `release-checklist.md` remain fail-closed.
