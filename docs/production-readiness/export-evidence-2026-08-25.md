# Lovable database export evidence — 2026-08-25

Status: **EXPORT COMPLETE / ISOLATED RESTORE PASSED**. Production remains
**NO-GO**.

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

The file was downloaded to the local operator account, verified by size and
hash, and later consumed only by the isolated local restore documented in
`restore-drill-evidence-2026-08-26.md`. PostgreSQL parsed its catalog and restored
its schema and data locally; no row contents, credentials, or tokens were
printed. The dump was not uploaded or copied into the repository, GitHub, CI,
Cloudflare, staging, or a hosted project. The dump itself is not evidence
attached to this PR and must never be committed.

## Target-capacity evidence

The signed-in Supabase organization `Transition Forward LLC` displayed the Free
plan and two active projects, which consumes its current free-project capacity:

1. `iWAVYx's Project` — ref `cyhclwpkjnzaelwkzgly`;
2. `staging/E2E` — ref `qgrertkqbwanerqqemph`.

The dashboard showed organization database usage of 44 MB / 500 MB. That figure
describes the existing Supabase organization; it does not prove that the Lovable
dump will restore below 500 MB. Compressed export size also does not prove the
restored database size.

The owner authorized installation of local restore tooling. Docker Desktop,
WSL 2, and a pinned Supabase CLI were installed and verified, and the restored
database measured 543,632,531 bytes. Therefore:

- neither existing Supabase project may be repurposed;
- no free hosted target is currently available;
- the 500 MB free hosted target would not fit this restored database;
- the isolated local $0 restore route was selected and completed;
- no paid target may be created until its exact price is disclosed and approved.

## Gate effect

This export supplied the recovery point for the completed isolated drill. The
restore, RPO/RTO, aggregate integrity checks, and migration rehearsal are
recorded in `restore-drill-evidence-2026-08-26.md`. No production or staging
database, Lovable publish, deployment, migration, DNS, secrets, or payment
configuration was changed.
