import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inventoryPath =
  "docs/production-readiness/production-pg-net-dependency-inventory.sql";
const evidencePath =
  "docs/production-readiness/production-pg-net-hosting-boundary-2026-09-15.md";
const checklistPath = "docs/production-readiness/release-checklist.md";

const inventory = readFileSync(inventoryPath, "utf8");
const evidence = readFileSync(evidencePath, "utf8");
const checklist = readFileSync(checklistPath, "utf8");

const executable = inventory
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .trim();

test("pg_net inventory contains SELECT-only catalog statements", () => {
  const statements = executable
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  assert.equal(statements.length, 5);
  for (const statement of statements) {
    assert.match(statement, /^(select|with)\b/i);
    assert.doesNotMatch(
      statement,
      /(^|;)\s*(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke|call|do)\b/i,
    );
  }

  assert.match(inventory, /pg_catalog\.pg_extension/);
  assert.match(inventory, /pg_catalog\.pg_depend/);
  assert.match(inventory, /pg_catalog\.pg_identify_object/);
  assert.doesNotMatch(executable, /pg_get_functiondef|\bprosrc\b/i);
  assert.doesNotMatch(executable, /\bcron\.job\b|\bauth\.users\b/i);
  assert.doesNotMatch(executable, /\bstorage\.|\bvault\./i);
});

test("boundary guard fails closed unless zero members are in public", () => {
  assert.match(
    inventory,
    /count\(\*\) FROM members WHERE object_schema = 'public'/i,
  );
  assert.match(inventory, /public_member_count = 0/i);
  assert.match(inventory, /extension_count = 1/i);
  assert.match(inventory, /member_count > 0/i);
  assert.match(inventory, /non_platform_owned_member_count = 0/i);
  assert.match(inventory, /platform_owned_extension_count = 1/i);
  assert.match(inventory, /non_relocatable_extension_count = 1/i);
  assert.match(
    inventory,
    /1\s*\/\s*CASE[\s\S]*?WHEN extension_count = 1[\s\S]*?public_member_count = 0[\s\S]*?THEN 1[\s\S]*?ELSE 0[\s\S]*?END AS boundary_guard/i,
  );
});

test("evidence records the platform-owned non-relocatable boundary", () => {
  assert.match(evidence, /version: `0\.20\.3`/i);
  assert.match(evidence, /extension metadata namespace: `public`/i);
  assert.match(evidence, /extension owner: `supabase_admin`/i);
  assert.match(evidence, /relocatable: `false`/i);
  assert.match(evidence, /owns 28 catalog members/i);
  assert.match(evidence, /Zero members are in `public`/i);
  assert.match(evidence, /nine PostgreSQL-managed structural relationships/i);
  assert.match(evidence, /outbound query returned eight relationships/i);
  assert.match(evidence, /absence of an external\s+catalog edge is not evidence/i);
  assert.match(evidence, /Finding 9 is not closed/i);
  assert.match(evidence, /PRODUCTION REMAINS\s+NO-GO/i);
});

test("evidence and checklist prohibit an automatic extension rewrite", () => {
  for (const content of [evidence, checklist]) {
    assert.match(content, /non-relocatable/i);
    assert.match(content, /supabase_admin/i);
    assert.match(content, /zero.*(?:member|actual).*public/is);
  }
  assert.match(evidence, /does not authorize dropping, reinstalling, upgrading, or altering/i);
  assert.match(checklist, /Finding\s+9 remains open/i);
});
