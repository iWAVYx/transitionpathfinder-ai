import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260907224500_least_privilege_security_definer_grants.sql";
const allowlistPath =
  "docs/production-readiness/security-definer-execute-allowlist.json";

const migration = readFileSync(migrationPath, "utf8");
const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function migrationGrantsFor(role) {
  const pattern = new RegExp(
    `GRANT EXECUTE ON FUNCTION (public\\.[^(]+\\([^;]*?\\)) TO ${role};`,
    "g",
  );
  return [...migration.matchAll(pattern)].map((match) =>
    match[1].replaceAll("public.admin_role", "admin_role").replaceAll("public.app_role", "app_role"),
  );
}

test("privileged-routine allowlist is exact, unique, and fail closed", () => {
  assert.equal(allowlist.schemaVersion, 1);
  assert.equal(allowlist.scope, "public-schema-security-definer-routines");
  assert.deepEqual(allowlist.publicExecute, []);

  for (const key of [
    "anonymousExecute",
    "authenticatedExecute",
    "clientExecuteForbidden",
  ]) {
    assert.deepEqual(
      allowlist[key],
      sortedUnique(allowlist[key]),
      `${key} must stay sorted and duplicate-free`,
    );
  }

  assert.equal(allowlist.anonymousExecute.length, 5);
  assert.equal(allowlist.authenticatedExecute.length, 54);
  assert.equal(allowlist.clientExecuteForbidden.length, 20);

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
  assert.match(
    migration,
    /REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated/i,
  );
  assert.match(migration, /GRANT EXECUTE ON FUNCTION %s TO service_role/i);

  assert.deepEqual(
    sortedUnique(migrationGrantsFor("anon")),
    allowlist.anonymousExecute,
  );
  assert.deepEqual(
    sortedUnique(migrationGrantsFor("authenticated")),
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
  assert.match(migration, /Production application requires a separately approved maintenance window/);
});
