# Lovable security rescan — 2026-09-18

## Result

The fresh Lovable basic and deep scans completed successfully. Lovable reported
three warnings and no dependency vulnerabilities across 77 packages.

1. **Channel attachments are not yet proven virus-scanned.** This is the known
   production-readiness blocker. Source code is fail closed, but protected live
   clean-file and harmless EICAR proof is still blocked on an approved provider.
2. **Sensitive student-data policies inherited the PostgreSQL `PUBLIC` policy
   role.** Existing table grants still deny anonymous table access, and the
   predicates also fail closed when `auth.uid()` is null. The forward migration
   `20260918190000_scope_student_policies_and_access_code_roles.sql` narrows the
   three replaced `evidence_items` policies and both `student_relationships`
   update policies explicitly to `authenticated` without changing their access
   predicates.
3. **`access_codes.role` lacked a table-level allowlist.** Browser writes are
   already revoked and `issue_license_access_code` already rejects unsupported
   roles, so the scanner's proposed direct org-admin escalation path is not
   currently reachable. The same forward migration adds and validates an
   independent database constraint that permits only reviewed school/district
   license roles and supported legacy aliases.

## Safety boundary

This package does not apply a migration, change a database, alter Lovable
configuration, publish the app, change secrets, run antivirus, or touch
production. The catalog verification in the migration fails the transaction
closed unless all five policies resolve only to `authenticated` and the role
constraint is present and validated.

Production remains **NO-GO** until the new migration is reviewed and proven on
isolated staging, the malware provider path passes protected clean-file/EICAR
verification, and the other release blockers are closed.
