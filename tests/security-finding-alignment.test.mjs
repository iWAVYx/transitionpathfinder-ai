import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

const alignmentMigration = read(
  "supabase/migrations/20260907190000_security_finding_alignment.sql",
);
const priorHardening = read(
  "supabase/migrations/20260821230000_security_remediation_hardening.sql",
);
const formsServer = read("src/lib/forms.functions.ts");
const inventorySql = read(
  "docs/production-readiness/security-finding-inventory.sql",
);
const disposition = read(
  "docs/production-readiness/security-finding-alignment-2026-09-07.md",
);

test("partner-only detection fails closed for every non-partner role", () => {
  assert.match(
    alignmentMigration,
    /CREATE OR REPLACE FUNCTION public\.is_partner_only\(_user_id uuid\)[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = pg_catalog, public/,
  );
  assert.match(
    alignmentMigration,
    /EXISTS[\s\S]*?role = 'partner'::public\.app_role[\s\S]*?NOT EXISTS[\s\S]*?role <> 'partner'::public\.app_role/,
  );
  assert.doesNotMatch(
    alignmentMigration,
    /role IN \('student'|'parent'|'guardian'|'educator'|'teacher'|'case_manager'|'school_admin'|'district_admin'|'admin'/,
  );
  assert.match(
    alignmentMigration,
    /REVOKE ALL ON FUNCTION public\.is_partner_only\(uuid\) FROM PUBLIC, anon/,
  );
  assert.match(
    alignmentMigration,
    /GRANT EXECUTE ON FUNCTION public\.is_partner_only\(uuid\)[\s\S]*?TO authenticated, service_role/,
  );
});

test("previously applied security remediations remain canonical", () => {
  assert.match(
    priorHardening,
    /can_access_student\(auth\.uid\(\), student_id\)[\s\S]*?note_type <> 'private_note'[\s\S]*?visibility <> 'private'/,
  );
  assert.match(
    priorHardening,
    /REVOKE UPDATE ON public\.channel_attachments FROM authenticated/,
  );
  assert.match(
    priorHardening,
    /REVOKE SELECT \(contact_email, phone\)[\s\S]*?ON public\.partner_organizations FROM PUBLIC, anon, authenticated/,
  );
  assert.match(
    priorHardening,
    /WHERE s\.review_status NOT IN \('archived', 'outdated'\)/,
  );
  assert.match(
    priorHardening,
    /REVOKE ALL ON FUNCTION public\.accept_invitation_by_token\(text\) FROM PUBLIC, anon/,
  );
});

test("signed-in form templates use an explicit column allowlist", () => {
  const reviewedColumns = [
    "slug",
    "title",
    "description",
    "audience",
    "category",
    "schema",
    "created_at",
    "updated_at",
  ];

  assert.match(
    alignmentMigration,
    /REVOKE SELECT ON public\.form_templates FROM PUBLIC, anon, authenticated/,
  );
  for (const column of reviewedColumns) {
    assert.match(alignmentMigration, new RegExp(`\\b${column}\\b`));
  }
  assert.match(
    alignmentMigration,
    /\) ON public\.form_templates TO authenticated/,
  );
  assert.match(
    formsServer,
    /FORM_TEMPLATE_SELECT\s*=\s*[\s\S]*?slug,title,description,audience,category,schema,created_at,updated_at/,
  );

  assert.equal(
    (formsServer.match(/\.from\("form_templates"\)[\s\S]{0,160}?\.select\(FORM_TEMPLATE_SELECT\)/g) ?? [])
      .length,
    2,
    "both form-template readers must use the reviewed column allowlist",
  );
  assert.doesNotMatch(
    formsServer,
    /\.from\("form_templates"\)[\s\S]{0,160}?\.select\("\*"\)/,
  );
});

test("catalog inventory is read-only and covers privileged routines and extensions", () => {
  const executable = inventorySql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .trim();
  const statements = executable
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  assert.ok(statements.length >= 3);
  for (const statement of statements) {
    assert.match(statement, /^(select|with)\b/i);
    assert.doesNotMatch(
      statement,
      /\b(insert|update|delete|merge|alter|drop|create|truncate|grant|revoke|call|do)\b/i,
    );
  }
  assert.match(inventorySql, /pg_proc/);
  assert.match(inventorySql, /prosecdef/);
  assert.match(inventorySql, /aclexplode/);
  assert.match(inventorySql, /pg_extension/);
  assert.match(inventorySql, /extnamespace/);
});

test("all nine Lovable findings have a fail-closed disposition", () => {
  for (let finding = 1; finding <= 9; finding += 1) {
    assert.match(disposition, new RegExp(`\\| ${finding} \\|`));
  }
  assert.match(disposition, /Production remains \*\*NO-GO\*\*/);
  assert.match(disposition, /do not authorize[\s\S]*migration/i);
  assert.match(disposition, /rescan/i);
});
