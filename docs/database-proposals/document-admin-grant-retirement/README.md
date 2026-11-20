# Private Document Grant Retirement — Verified Review Draft

Source/disposable verification is complete:36 targeted local cases,48 targeted real PostgreSQL cases with zero failures/skips and all56 fresh full-schema installation/catalog stages pass. The schema proof installs225 canonical migrations, the prior41 control drafts and this one separate review draft. Exact source/log/stage hashes are retained in the verified evidence under `docs/production-readiness/evidence`.

The draft blocks authenticated legacy grant inserts, makes historical grant rows inert and removes the metadata override policy. It also gates the current non-clean Storage exception on explicit student access and editing authority. Assigned editors/uploader copies and normal explicit permissions remain supported. Old grant rows, unrelated routines/policies/ACL, document/Storage data and paused control state remain unchanged. Existing quarantine/no-overwrite/delete fences are mandatory preflight prerequisites.

The initial targeted fixture used the June helper rather than its July replacement. Full installation correctly stopped at the pinned preflight before permission mutation. The corrected fixture uses the current July grant-revocation and August Storage definitions, adds non-clean role/removal cases and keeps exact reviewed-body guards. Historical27/39-case proof is superseded for the current draft; the failure is recorded in the verified certificate.

This remains a **separate, noncanonical, unpromoted review draft**. It has no ledger entry and is not included in prior225+41 or15-migration-batch execution claims. Promotion/ordering, target preflight and hosted rollout still need review/authorization. Canonical promotion must reconcile the SECURITY DEFINER inventory because the retired grant helper is now a harmless invoker routine. No already-issued bearer URL is revoked by these SQL changes.

The48 native cases use one fresh database per case, including observed COMMIT/ROLLBACK blockers, cached metadata/Storage reads and prepared grant INSERTs for both management roles. Their targeted fixture and the full application schema catalog proof are separate, source-matched evidence. The fixture's audience helper is false; audience-grant behavior and physical Storage/provider acceptance remain under existing privacy/hosted gates.

The focused schema job executes every56 bootstrap/install/catalog command verbatim from the pinned original replay workflow. Original regression workflows remain intact. A strict byte comparison verifies the prior297 SQL files and original test before composing with prior regression proof; the focused job does not claim to rerun those original2,405 cases.

Local model command, with a trusted `@electric-sql/pglite@0.5.8` installation:

```sh
DOCUMENT_GRANT_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/database/document-admin-grant-retirement.test.mjs
```

Native CI uses `tests/database/run-document-grant-native.mjs`, explicit loopback settings and a disposable Postgres service; it accepts no hosted connection string. The full-schema driver requires its dedicated GitHub Actions service marker and fake service credentials. Existing records are never removed by the retirement draft. Operational rollback would restore the old exception, so production recovery/forward-repair procedures remain an explicit packaging gate.

Owner audit still reads the caller `document.signed_url.denied` stream; its language distinguishes an unconfirmed refusal from recorded removal. Hosted alert delivery still needs launch verification.
