import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260914120000_harden_application_function_default_privileges.sql";
const inventoryPath =
  "docs/production-readiness/production-security-inventory.sql";
const evidencePath =
  "docs/production-readiness/production-security-inventory-2026-09-14.md";
const stagingEvidencePath =
  "docs/production-readiness/staging-security-default-privileges-2026-09-14.md";
const productionPlanPath =
  "docs/production-readiness/production-security-migration-plan-2026-09-14.md";

const migration = readFileSync(migrationPath, "utf8");
const inventory = readFileSync(inventoryPath, "utf8");
const evidence = readFileSync(evidencePath, "utf8");
const stagingEvidence = readFileSync(stagingEvidencePath, "utf8");
const productionPlan = readFileSync(productionPlanPath, "utf8");

test("forward-only migration closes application function defaults without changing current objects", () => {
  assert.match(migration, /^--[\s\S]*?\nBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.match(
    migration,
    /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;/i,
  );
  assert.doesNotMatch(migration, /ON FUNCTION public\./i);
  assert.doesNotMatch(migration, /FOR ROLE supabase_admin/i);
  assert.doesNotMatch(migration, /\b(channel_attachments|form_templates|storage\.objects)\b/i);
});

test("migration verifies the applying role and preserves privileged backend execution", () => {
  assert.match(migration, /pg_catalog\.pg_default_acl/);
  assert.match(migration, /pg_catalog\.aclexplode/);
  assert.match(
    migration,
    /default_acl\.defaclrole[\s\S]*?migration_role\.rolname = current_user/,
  );
  assert.match(migration, /acl\.grantee = 0/);
  assert.match(migration, /'anon', 'authenticated'/);
  assert.match(migration, /grantee\.rolname = 'service_role'/);
  assert.match(
    migration,
    /Unexpected application function default EXECUTE privileges remain/,
  );
  assert.match(
    migration,
    /Application function default EXECUTE is missing for service_role/,
  );
  assert.doesNotMatch(
    migration,
    /REVOKE EXECUTE ON FUNCTIONS FROM[^;]*service_role/i,
  );
});

test("production inventory remains one SELECT-only metadata query", () => {
  const executable = inventory
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();

  assert.match(executable, /^with\b/i);
  assert.doesNotMatch(
    executable,
    /(^|;)\s*(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke|call|do)\b/i,
  );
  assert.equal(executable.split(";").filter((part) => part.trim()).length, 1);
  assert.match(inventory, /storage\.buckets/);
  assert.match(inventory, /pg_catalog\.pg_policies/);
  assert.match(inventory, /pg_catalog\.pg_constraint/);
  assert.match(inventory, /information_schema\.role_table_grants/);
  assert.match(inventory, /information_schema\.column_privileges/);
  assert.match(inventory, /routine\.prosecdef/);
  assert.match(inventory, /pg_catalog\.pg_default_acl/);
  assert.doesNotMatch(inventory, /auth\.users/);
});

test("redacted production evidence preserves the NO-GO and no-change boundary", () => {
  assert.match(evidence, /188 metadata rows/);
  assert.match(evidence, /76 public-schema SECURITY DEFINER routines/);
  assert.match(
    evidence,
    /17 for PUBLIC, 26 for anonymous callers, 70 for authenticated callers/,
  );
  assert.match(evidence, /channel-attachments.*private/s);
  assert.match(evidence, /raw CSV download did not complete/i);
  assert.match(evidence, /do(?:es)? not authorize a staging or production migration/i);
  assert.match(evidence, /PRODUCTION REMAINS NO-GO/);
});

test("staging evidence records exact identity, ledger, and protected checks", () => {
  assert.match(stagingEvidence, /73c3c36a340cf6ef03174d503da5751a4eb1a4a4/);
  assert.match(stagingEvidence, /Deploy Staging run 34868713078/);
  assert.match(stagingEvidence, /qgrertkqbwanerqqemph/);
  assert.match(stagingEvidence, /isolation\.ok=true/);
  assert.match(stagingEvidence, /20260907190000_security_finding_alignment/);
  assert.match(stagingEvidence, /20260907224500_least_privilege_security_definer_grants/);
  assert.match(
    stagingEvidence,
    /20260914120000_harden_application_function_default_privileges/,
  );
  assert.match(stagingEvidence, /5db71d69000f8c0d6f2d1cb202a57e0f/);
  assert.match(stagingEvidence, /a0a57957f380d54efa83f579339a46ff/);
  for (const run of [
    "34868525031",
    "34868524987",
    "34868524913",
    "34868524860",
    "34868524944",
    "34868525011",
  ]) {
    assert.match(stagingEvidence, new RegExp(run));
  }
  assert.match(stagingEvidence, /production remains NO-GO/i);
  assert.match(stagingEvidence, /did not execute the migration again/i);
});

test("production procedure is exact-scope, fail-closed, and non-authorizing", () => {
  const ordered = [
    "20260907190000_security_finding_alignment.sql",
    "20260907224500_least_privilege_security_definer_grants.sql",
    "20260914120000_harden_application_function_default_privileges.sql",
  ].map((file) => productionPlan.indexOf(file));

  assert.ok(ordered.every((index) => index >= 0));
  assert.ok(ordered[0] < ordered[1] && ordered[1] < ordered[2]);
  assert.match(productionPlan, /PREPARED FOR REVIEW ONLY; production remains NO-GO/);
  assert.match(productionPlan, /separately authorizes the exact three migration\s+files/i);
  assert.match(productionPlan, /lrqcntqyekucamifpffs/);
  assert.match(productionPlan, /Stop if staging ref `qgrertkqbwanerqqemph` appears/);
  assert.match(productionPlan, /20260908000500.*20260909010000/s);
  assert.match(productionPlan, /not\s+part of this window/i);
  assert.match(productionPlan, /Do not improvise down SQL/i);
  assert.match(productionPlan, /never use real student or IEP data as a\s+fixture/i);
  assert.match(productionPlan, /Do not run a live payment without\s+separate approval/i);
});
