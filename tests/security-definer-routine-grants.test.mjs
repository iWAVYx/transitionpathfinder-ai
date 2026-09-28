import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260907224500_least_privilege_security_definer_grants.sql";
const alignmentMigrationPath =
  "supabase/migrations/20260927210000_narrow_catalog_and_site_media_reads.sql";
const allowlistPath = "docs/production-readiness/security-definer-execute-allowlist.json";

const migration = readFileSync(migrationPath, "utf8");
const alignmentMigration = readFileSync(alignmentMigrationPath, "utf8");
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function cumulativeMigrationGrantsFor(role) {
  const grants = new Set();
  const statements =
    `${migration}\n${alignmentMigration}`.match(
      /(?:GRANT EXECUTE|REVOKE (?:ALL|EXECUTE)) ON FUNCTION public\.[^;]+;/g,
    ) ?? [];

  for (const statement of statements) {
    const signature = statement
      .match(/ON FUNCTION (public\.[^(]+\([^;]*?\))\s+(?:TO|FROM)/)?.[1]
      ?.replaceAll("public.admin_role", "admin_role")
      .replaceAll("public.app_role", "app_role");
    if (!signature) continue;
    const principals =
      statement
        .match(/\s(?:TO|FROM)\s+([^;]+);$/)?.[1]
        ?.split(",")
        .map((principal) => principal.trim()) ?? [];
    if (!principals.includes(role)) continue;
    if (statement.startsWith("GRANT EXECUTE")) grants.add(signature);
    else grants.delete(signature);
  }

  return [...grants];
}

test("privileged-routine allowlist is exact, unique, and fail closed", () => {
  assert.equal(allowlist.schemaVersion, 1);
  assert.equal(allowlist.scope, "public-schema-security-definer-routines");
  assert.deepEqual(allowlist.publicExecute, []);

  for (const key of ["anonymousExecute", "authenticatedExecute", "clientExecuteForbidden"]) {
    assert.deepEqual(
      allowlist[key],
      sortedUnique(allowlist[key]),
      `${key} must stay sorted and duplicate-free`,
    );
  }

  assert.equal(allowlist.anonymousExecute.length, 8);
  assert.equal(allowlist.authenticatedExecute.length, 59);
  assert.equal(allowlist.clientExecuteForbidden.length, 21);

  for (const signature of allowlist.anonymousExecute) {
    assert.ok(
      allowlist.authenticatedExecute.includes(signature),
      `anonymous entry must also be reviewed for signed-in callers: ${signature}`,
    );
  }

  for (const signature of allowlist.clientExecuteForbidden) {
    assert.ok(!allowlist.anonymousExecute.includes(signature));
    assert.ok(!allowlist.authenticatedExecute.includes(signature));
  }
});

test("migration resets inherited grants before restoring exact client allowlists", () => {
  assert.match(
    migration,
    /ALTER DEFAULT PRIVILEGES IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;/i,
  );
  assert.match(migration, /WHERE n\.nspname = 'public'\s+AND p\.prosecdef/i);
  assert.match(migration, /REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION %s TO service_role/i);

  assert.deepEqual(sortedUnique(cumulativeMigrationGrantsFor("anon")), allowlist.anonymousExecute);
  assert.deepEqual(
    sortedUnique(cumulativeMigrationGrantsFor("authenticated")),
    allowlist.authenticatedExecute,
  );
});

test("migration verifies live effective privileges and aborts on drift", () => {
  assert.match(migration, /pg_catalog\.aclexplode/);
  assert.match(migration, /pg_catalog\.has_function_privilege\('anon'/);
  assert.match(migration, /pg_catalog\.has_function_privilege\('authenticated'/);
  assert.match(migration, /pg_catalog\.has_function_privilege\('service_role'/);
  assert.match(migration, /Unexpected PUBLIC execution on SECURITY DEFINER routines/);
  assert.match(migration, /Anonymous SECURITY DEFINER allowlist mismatch/);
  assert.match(migration, /Authenticated SECURITY DEFINER allowlist mismatch/);
  assert.match(migration, /Service-role execution missing for SECURITY DEFINER routines/);
  assert.match(
    migration,
    /Production application requires a separately approved maintenance window/,
  );
});
