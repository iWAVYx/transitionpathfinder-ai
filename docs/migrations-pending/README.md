# migrations-pending (retired)

This directory no longer holds executable SQL.

Migration #173 —
`20260803161500_forward_only_defect_fixes_and_grant_hygiene.sql` — now lives in
the canonical directory:

    supabase/migrations/20260803161500_forward_only_defect_fixes_and_grant_hygiene.sql

That file is the single executable source of truth. It has already been applied
to the staging project (`qgrertkqbwanerqqemph`) and recorded in
`supabase_migrations.schema_migrations` as version `20260803161500`. It has NOT
been promoted to production.

Never copy migration SQL back into this directory: two executable copies means
two chances to apply the same forward-only change twice.
