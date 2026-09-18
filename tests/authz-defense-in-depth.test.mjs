import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

const migration = read(
  "supabase/migrations/20260918190000_scope_student_policies_and_access_code_roles.sql",
);
const licenseMigration = read(
  "supabase/migrations/20260814203316_49779172-d01d-497c-95d2-b451a7c70890.sql",
);
const providerOptions = read(
  "docs/production-readiness/malware-provider-options-2026-09-18.md",
);
const executableMigration = migration
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");

const evidencePolicies = [
  "evidence_items view scoped by permission_scope",
  "evidence_items insert scoped",
  "evidence_items update scoped",
];
const relationshipPolicies = [
  "Editors update relationships",
  "Related user approves own consent",
];

test("sensitive evidence and relationship policies are authenticated-only", () => {
  for (const policy of evidencePolicies) {
    assert.match(
      migration,
      new RegExp(
        `ALTER POLICY "${policy}"\\s+ON public\\.evidence_items TO authenticated;`,
      ),
    );
  }
  for (const policy of relationshipPolicies) {
    assert.match(
      migration,
      new RegExp(
        `ALTER POLICY "${policy}"\\s+ON public\\.student_relationships TO authenticated;`,
      ),
    );
  }
  assert.doesNotMatch(migration, /ALTER POLICY[\s\S]*?\bTO\s+(?:PUBLIC|anon)\b/i);
  assert.match(migration, /v_expected_policy_count <> 5/);
  assert.match(migration, /p\.polroles = ARRAY\[v_authenticated_oid\]::oid\[\]/);
});

test("access-code roles have a validated database allowlist", () => {
  const constraint = migration.match(
    /ADD CONSTRAINT access_codes_role_allowlist_check[\s\S]*?\) NOT VALID;/,
  )?.[0];
  assert.ok(constraint, "role allowlist constraint must be present");

  for (const role of [
    "student",
    "family",
    "parent",
    "guardian",
    "educator",
    "teacher",
    "case_manager",
    "counselor",
    "school_admin",
    "district_admin",
  ]) {
    assert.match(constraint, new RegExp(`'${role}'`));
  }

  for (const elevated of ["admin", "platform_admin", "platform_owner", "owner"]) {
    assert.doesNotMatch(constraint, new RegExp(`'${elevated}'`));
  }

  assert.match(
    migration,
    /VALIDATE CONSTRAINT access_codes_role_allowlist_check;/,
  );
  assert.match(
    migration,
    /v_constraint_validated IS DISTINCT FROM true/,
  );
});

test("the role constraint remains additive to existing issuance controls", () => {
  assert.match(
    licenseMigration,
    /REVOKE INSERT, UPDATE, DELETE ON public\.access_codes FROM authenticated/,
  );
  assert.match(
    licenseMigration,
    /IF _role NOT IN \([\s\S]*?'student'[\s\S]*?'district_admin'[\s\S]*?\) THEN/,
  );
  assert.doesNotMatch(
    executableMigration,
    /\bGRANT\b[\s\S]*?ON public\.access_codes/i,
  );
  assert.doesNotMatch(
    executableMigration,
    /CREATE OR REPLACE FUNCTION public\.issue_license_access_code/,
  );
});

test("malware alternatives preserve fail-closed privacy requirements", () => {
  assert.match(providerOptions, /Cloudmersive/);
  assert.match(providerOptions, /ClamAV/);
  assert.match(providerOptions, /GuardDuty Malware Protection for S3/);
  assert.match(providerOptions, /Do not use the free public VirusTotal API/);
  assert.match(providerOptions, /clean-file and harmless EICAR/i);
  assert.match(providerOptions, /Production remains \*\*NO-GO\*\*/);
});
