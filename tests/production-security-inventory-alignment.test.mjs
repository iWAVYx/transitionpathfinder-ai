import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260914120000_harden_application_function_default_privileges.sql";
const inventoryPath =
  "docs/production-readiness/production-security-inventory.sql";
const evidencePath =
  "docs/production-readiness/production-security-inventory-2026-09-14.md";

const migration = readFileSync(migrationPath, "utf8");
const inventory = readFileSync(inventoryPath, "utf8");
const evidence = readFileSync(evidencePath, "utf8");

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
