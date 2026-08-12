// Workstream 6 — Access code + redemption RLS regression.
//
// Coverage:
//   access_codes + license_allocations
//     * Org admin issues codes only through the transactional RPC.
//     * Outsider cannot SELECT or INSERT another org's codes.
//     * Issuance reserves purchased capacity immediately.
//     * Revocation releases only unclaimed reservations.
//
//   access_code_redemptions
//     * Redemption is recorded only through the activation RPC.
//     * User can SELECT own redemption.
//     * Cannot INSERT redemption with user_id ≠ auth.uid().
//     * Outsider cannot SELECT another user's redemption.
//     * (code_id, user_id) unique — reuse is blocked.
//
// Run with:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node --test tests/access-code-redemption.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SKIP = !URL || !PUB || !SVC;
const admin = SKIP ? null : createClient(URL, SVC, { auth: { persistSession: false } });

const PASSWORD = "TestPass!2026";
const STAMP = Date.now();

const hashCode = (raw) => createHash("sha256").update(raw).digest("hex");

async function makeUser(kind, role) {
  const email = `qa.code.${kind}.${STAMP}.${Math.random().toString(36).slice(2, 8)}@transitionforward.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user.id;
  if (role) {
    await admin.from("user_roles").insert({ user_id: uid, role });
    await admin
      .from("profiles")
      .update({ primary_role: role })
      .eq("id", uid);
  }
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  return { uid, email, client };
}

async function makeOrg(name) {
  const { data, error } = await admin
    .from("organizations")
    .insert({ name: `${name}_${STAMP}`, type: "district", verified_status: "verified" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

test("access codes reserve capacity and block direct browser writes", { skip: SKIP }, async () => {
  const orgId = await makeOrg("CodeOrg");
  const orgAdmin = await makeUser("orgadmin", "district_admin");
  const outsider = await makeUser("outsider", null);

  const bind = await admin.from("organization_memberships").insert({
    user_id: orgAdmin.uid,
    organization_id: orgId,
    role_within_org: "district_admin",
    status: "active",
    membership_status: "active",
  });
  assert.equal(bind.error, null, bind.error?.message);

  const pool = await admin.from("license_pools").insert({
    organization_id: orgId,
    license_type: "staff",
    source: "pilot",
    purchased: 3,
    status: "active",
  });
  assert.equal(pool.error, null, pool.error?.message);

  // Direct inserts are blocked so every code is backed by reserved capacity.
  const raw = `AC-${STAMP}-${Math.random().toString(36).slice(2, 8)}`;
  const direct = await orgAdmin.client
    .from("access_codes")
    .insert({
      code_hash: hashCode(raw),
      org_id: orgId,
      role: "educator",
      capacity: 2,
      single_use: false,
      created_by: orgAdmin.uid,
    });
  assert.ok(direct.error, "authenticated clients must not insert codes directly");

  const issued = await orgAdmin.client.rpc("issue_license_access_code", {
    _org_id: orgId,
    _target_organization_id: orgId,
    _role: "educator",
    _code_hash: hashCode(raw),
    _label: "Node Test Staff Code",
    _capacity: 2,
    _single_use: false,
    _expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  assert.equal(issued.error, null, issued.error?.message);
  const codeId = issued.data;

  const reservations = await admin
    .from("license_allocations")
    .select("id, state")
    .eq("access_code_id", codeId)
    .eq("state", "reserved");
  assert.equal(reservations.data?.length, 2);

  // Outsider cannot see.
  const leak = await outsider.client
    .from("access_codes")
    .select("id")
    .eq("id", codeId);
  assert.deepEqual(leak.data ?? [], [], "outsider must not see codes");

  // Outsider cannot issue a code for that org.
  const outIns = await outsider.client
    .from("access_codes")
    .insert({
      code_hash: hashCode(`X-${STAMP}`),
      org_id: orgId,
      role: "educator",
      created_by: outsider.uid,
    });
  assert.ok(outIns.error, "outsider insert must be denied");

  // Direct updates are blocked too; revocation must use the auditable RPC.
  const directRevoke = await orgAdmin.client
    .from("access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId);
  assert.ok(directRevoke.error, "authenticated clients must not update codes directly");

  const revoked = await orgAdmin.client.rpc("revoke_license_access_code", {
    _code_id: codeId,
    _reason: "Node regression test revocation",
  });
  assert.equal(revoked.error, null, revoked.error?.message);
  assert.equal(revoked.data.released_seats, 2);
});

test("access-code activation enforces role and records one redemption", { skip: SKIP }, async () => {
  const orgId = await makeOrg("RedeemOrg");
  const orgAdmin = await makeUser("owner", "district_admin");
  const userA = await makeUser("a", "student");
  const userB = await makeUser("b", "educator");

  const bind = await admin.from("organization_memberships").insert({
    user_id: orgAdmin.uid,
    organization_id: orgId,
    role_within_org: "district_admin",
    status: "active",
    membership_status: "active",
  });
  assert.equal(bind.error, null, bind.error?.message);

  const pool = await admin.from("license_pools").insert({
    organization_id: orgId,
    license_type: "pathway",
    source: "pilot",
    purchased: 2,
    status: "active",
  });
  assert.equal(pool.error, null, pool.error?.message);

  const raw = `RC-${STAMP}-${Math.random().toString(36).slice(2, 8)}`;
  const code = await orgAdmin.client.rpc("issue_license_access_code", {
    _org_id: orgId,
    _target_organization_id: orgId,
    _role: "student",
    _code_hash: hashCode(raw),
    _label: "Node Test Student Code",
    _capacity: 1,
    _single_use: true,
    _expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  });
  assert.equal(code.error, null, code.error?.message);
  const codeId = code.data;

  const okA = await userA.client.rpc("redeem_access_code", { _code: raw });
  assert.equal(okA.error, null, okA.error?.message);
  assert.equal(okA.data.ok, true);

  // Direct audit-row insertion is blocked, including cross-user spoofing.
  const spoof = await userA.client
    .from("access_code_redemptions")
    .insert({ code_id: codeId, user_id: userB.uid });
  assert.ok(spoof.error, "cross-user INSERT must be denied");

  const mismatch = await userB.client.rpc("redeem_access_code", { _code: raw });
  assert.equal(mismatch.error, null, mismatch.error?.message);
  assert.equal(mismatch.data.reason, "role_mismatch");

  // User A can see own row.
  const readA = await userA.client
    .from("access_code_redemptions")
    .select("id")
    .eq("code_id", codeId);
  assert.equal(readA.data?.length, 1);

  // User B cannot see A's row.
  const leak = await userB.client
    .from("access_code_redemptions")
    .select("id")
    .eq("code_id", codeId);
  assert.deepEqual(leak.data ?? [], [], "cross-user SELECT must return nothing");

  const reuse = await userA.client.rpc("redeem_access_code", { _code: raw });
  assert.equal(reuse.error, null, reuse.error?.message);
  assert.equal(reuse.data.reason, "already_redeemed");
});
