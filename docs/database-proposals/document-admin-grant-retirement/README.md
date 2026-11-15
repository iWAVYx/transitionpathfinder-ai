# Private Document Grant Retirement — Review Only

The current application override is retired, but canonical database policy still lets a platform admin create a short-lived grant for an unrelated document. The targeted local reproduction confirms metadata and Storage-row authorization through that grant.

The draft keeps historical grant rows, blocks new authenticated inserts, removes the metadata override policy and makes the existing grant helper always return false. Cached Storage policies retain their function reference while old grants become ineffective. Genuine explicit permissions and uploader reads are preserved. No file bytes, audits or student records are deleted.

This is one **separate review draft**, outside the existing225 canonical/41-control-proposal chain and the separate15-migration batch. Do not apply it as an extra hosted migration, infer its ledger version, or include it in prior complete-replay claims. Promotion/ordering and final integration must be reviewed first.

Local proof:27 targeted in-memory PostgreSQL/WASM cases with exact canonical function/policy excerpts, zero failures/skips. The fixture is deliberately minimal; `has_audience` is false, quarantine installation prerequisites are not fully replayed, and no concurrent sessions or Storage APIs are exercised. Native/full-chain and hosted acceptance remain open.

Owner audit still reads `document.signed_url.denied` from the caller audit stream. Its labels now distinguish a refused/unconfirmed link from historical recorded removal. Hosted operational alert delivery still requires verification.

Run locally with a trusted installed `@electric-sql/pglite@0.5.8` module:

```sh
DOCUMENT_GRANT_PGLITE_MODULE=/absolute/path/to/pglite/dist/index.js node --test tests/database/document-admin-grant-retirement.test.mjs
```

The dedicated CI workflow uses a disposable in-memory database and no hosted credentials or GitHub environment. The SQL draft checks the exact reviewed legacy helper body and baseline policy names, stops on changed/already-retired state, uses bounded locks/timeouts and performs no data DML. Final migration concurrency/rollback and old-client compatibility remain review gates.
