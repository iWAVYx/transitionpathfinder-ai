# Lovable database export evidence — 2026-08-25

Status: **EXPORT COMPLETE / RESTORE NOT STARTED**. Production remains **NO-GO**.

## Export record

- Source: Lovable Cloud project `a4a5068b-10df-4e31-8d22-73186657d452`.
- Action: exactly one **Start export** request.
- Lovable restriction shown before start: one export may be started every
  24 hours.
- Cloud folder: `database_export_26_08_26`.
- File: `transitionpathfinder-ai_260826.backup`.
- Dashboard-created timestamp: Aug 25, 2026, 9:02:42 PM America/New_York
  (Aug 26, 2026, 01:02:42 UTC).
- MIME type: `application/octet-stream`.
- Dashboard size: 17.0 MB.
- Exact downloaded size: 17,820,860 bytes.
- SHA-256:
  `2A70D53D32D6AFE1AC1F0A9B93AA4F336815230B88D9DAA461AEFD06A1660819`.

The file was downloaded to the local operator account solely for size and hash
verification. Its contents were not opened, parsed, printed, indexed, uploaded,
or copied into the repository, GitHub, CI, Cloudflare, staging, or a new project.
The dump itself is not evidence attached to this PR and must never be committed.

## Target-capacity evidence

The signed-in Supabase organization `Transition Forward LLC` displayed the Free
plan and two active projects, which consumes its current free-project capacity:

1. `iWAVYx's Project` — ref `cyhclwpkjnzaelwkzgly`;
2. `staging/E2E` — ref `qgrertkqbwanerqqemph`.

The dashboard showed organization database usage of 44 MB / 500 MB. That figure
describes the existing Supabase organization; it does not prove that the Lovable
dump will restore below 500 MB. Compressed export size also does not prove the
restored database size.

Read-only local checks found no Docker, Supabase CLI, or `psql` command on PATH.
Therefore:

- neither existing Supabase project may be repurposed;
- no free hosted target is currently available;
- no local restore can begin until compatible tooling is installed;
- no paid target may be created until its exact price is disclosed and approved.

## Gate effect

This closes export generation and integrity-recording steps only. It does not
prove that the dump restores, does not establish RPO/RTO, and does not change
`production.restoreDrillVerified=false`. No production or staging database,
Lovable publish, deployment, migration, DNS, secrets, or payment configuration
was changed.
