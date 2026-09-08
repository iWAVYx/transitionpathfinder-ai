# Lovable security-finding alignment — 2026-09-07

Decision: **CODE ALIGNMENT PROPOSED; RESCAN AND LIVE EVIDENCE PENDING**.
Production remains **NO-GO**.

This review maps the nine ignored Lovable findings to the canonical database
controls and identifies the evidence still required to close them. The review
and its draft code do not authorize a merge, deployment, migration, Lovable
build or publish, database change, DNS change, or production release.

| # | Lovable finding | Disposition in this draft | Evidence still required |
|---|---|---|---|
| 1 | Partner organization contact emails readable by authenticated users | Remediated by `20260821230000_security_remediation_hardening.sql`; production-window verification already denied the sensitive columns to public client roles. | Re-run the Lovable scan after exact-SHA staging acceptance and retain the focused catalog result. |
| 2 | Collaboration-note visibility depends on `note_type` | Remediated by requiring both non-private `note_type` and non-private `visibility` for anyone other than the creator. | Migration replay and staging policy verification must pass. |
| 3 | Channel attachment metadata lacks explicit UPDATE control | Remediated by revoking authenticated UPDATE; the product has no supported metadata-update path. | Migration replay and staging privilege verification must pass. |
| 4 | Partner-only restriction could fail when roles are added | Real future-role gap addressed by `20260907190000_security_finding_alignment.sql`: partner-only now means partner exists and every role row is partner. | Review, migration replay, isolated-staging application, and live role regression are required before any production consideration. |
| 5 | Resource-source metadata is publicly viewable | Intentional public-directory behavior. Anonymous callers use a column-limited function that excludes `notes`, creator data, and archived/outdated sources; the base table remains unavailable to anonymous callers. | Confirm the function/base-table privilege split using the catalog inventory and document the refreshed scan disposition. |
| 6 | Form templates are readable by authenticated users | Intentional product behavior; templates contain prompts/schema, not responses or student data. This draft replaces the table-wide grant and wildcard application query with a reviewed column allowlist so future columns fail closed. | Migration replay and an authenticated forms smoke test must pass in isolated staging. |
| 7 | Public can execute a SECURITY DEFINER function | Requires exact routine identity rather than assuming every definer function is unsafe. Public resource listing is intentionally anonymous; account-changing functions are not. | Run `security-finding-inventory.sql`, compare every public/anonymous grant with the reviewed allowlist, and retain the output without application data. |
| 8 | Signed-in users can execute a SECURITY DEFINER function | Some signed-in execution is required by RLS helpers. `is_partner_only` is search-path pinned and re-granted only to authenticated/service roles in this draft. | Inventory every authenticated grant and confirm each function is search-path pinned, caller-bound, and necessary. |
| 9 | Extension installed in the public schema | Location must be established from the live catalog; changing or moving a managed extension based only on a scanner label is unsafe. | Record `pg_extension.extnamespace` from staging and production read-only. Escalate only an unmanaged extension actually located in `public`. |

## Verification sequence

1. Run the credential-free contract test on the pull request.
2. Replay every migration in a disposable PostgreSQL instance and run the
   targeted privilege assertions plus the catalog-only inventory.
3. After separate owner approval, merge the reviewed change.
4. After separate staging authorization, apply only the new migration to the
   isolated staging project and run protected permission/RLS checks.
5. Re-run Lovable's security scan and attach the refreshed results.
6. Prepare a separate production migration window only if every earlier gate
   passes and the owner explicitly authorizes that exact migration.

Until steps 1–5 pass, `securityFindingsClosed` remains false. A draft PR or a
successful static test is evidence of progress, not permission to migrate or
release production.
