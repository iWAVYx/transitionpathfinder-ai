import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const migration = readFileSync("supabase/migrations/20261006180000_server_only_report_share_rpcs.sql", "utf8");
const caller = readFileSync("src/lib/share.functions.ts", "utf8");
const original = readFileSync("supabase/migrations/20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql", "utf8");
const allowlist = JSON.parse(readFileSync("docs/production-readiness/security-definer-execute-allowlist.json", "utf8"));
test("raw share RPCs are restricted to the trusted server with atomic effective-privilege checks", () => {
  assert.match(migration, /BEGIN;/); assert.match(migration, /COMMIT;\s*$/);
  for (const name of ["resolve_share_token", "track_share_view"]) {
    assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${name}(text) FROM PUBLIC, anon, authenticated;`));
    assert.ok(migration.includes(`GRANT EXECUTE ON FUNCTION public.${name}(text) TO service_role;`));
    const signature = `public.${name}(text)`;
    assert.ok(allowlist.clientExecuteForbidden.includes(signature));
    assert.ok(!allowlist.anonymousExecute.includes(signature));
    assert.ok(!allowlist.authenticatedExecute.includes(signature));
  }
  assert.match(migration, /has_function_privilege\('anon', signature, 'EXECUTE'\)/);
  assert.match(migration, /has_function_privilege\('authenticated', signature, 'EXECUTE'\)/);
  assert.match(migration, /has_function_privilege\('service_role', signature, 'EXECUTE'\)/);
  assert.match(migration, /aclexplode/); assert.match(migration, /acl.grantee = 0/);
  assert.match(migration, /RAISE EXCEPTION 'Client execution remains/);
  assert.match(migration, /RAISE EXCEPTION 'PUBLIC execution remains/);
});
test("the application retains token authorization and projection without a browser-key fallback", () => {
  assert.match(caller, /const \{ supabaseAdmin \} = await import\("@\/integrations\/supabase\/client.server"\)/);
  assert.match(caller, /sb.rpc\("resolve_share_token", \{ _token: data.token \}\)/);
  assert.match(caller, /projectSharedReport\(r.content\)/);
  assert.doesNotMatch(caller, /SUPABASE_PUBLISHABLE_KEY|createClient|\.from\(/);
  assert.match(original, /WHERE st.token = _token\s+AND st.revoked = false\s+AND \(st.expires_at IS NULL OR st.expires_at > now\(\)\)/);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION|UPDATE public\.|DELETE FROM|INSERT INTO/i);
  assert.match(migration, /Deploy the server-only share caller before applying these grants in staging/);
  assert.match(migration, /Production application requires a separately approved maintenance window/);
});
