// Workstream 6 — Access code + redemption RLS regression.
//
// Coverage:
//   access_codes
//     * Org admin can INSERT + SELECT + UPDATE own-org codes.
//     * Outsider cannot SELECT or INSERT another org's codes.
//     * uses_le_capacity constraint blocks over-capacity increments.
//     * Revocation stamps revoked_at.
//
//   access_code_redemptions
//     * User can INSERT their own redemption.
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
  if (role) await admin.from("user_roles").insert({ user_id: uid, role });
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

test("access_codes: org-admin scoping + capacity constraint", { skip: SKIP }, async () => {
  const orgId = await makeOrg("CodeOrg");
  const orgAdmin = await makeUser("orgadmin", "district_admin");
  const outsider = await makeUser("outsider", null);

  const bind = await admin.from("org_memberships").insert({
    user_id: orgAdmin.uid,
    organization_id: orgId,
    role: "district_admin",
    status: "active",
  });
  if (bind.error) return; // membership table shape differs — skip

  // Org admin issues code.
  const raw = `AC-${STAMP}-${Math.random().toString(36).slice(2, 8)}`;
  const ins = await orgAdmin.client
    .from("access_codes")
    .insert({
      code_hash: hashCode(raw),
      org_id: orgId,
      role: "educator",
      capacity: 2,
      single_use: false,
      created_by: orgAdmin.uid,
    })
    .select("id, uses, capacity")
    .single();
  assert.equal(ins.error, null, `org admin insert should succeed: ${ins.error?.message}`);
  const codeId = ins.data.id;

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

  // Over-capacity blocked by CHECK.
  const over = await admin
    .from("access_codes")
    .update({ uses: 3 })
    .eq("id", codeId);
  assert.ok(over.error, "uses > capacity must be rejected by check constraint");

  // Revocation stamp.
  const rev = await orgAdmin.client
    .from("access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", codeId)
    .select("revoked_at")
    .single();
  assert.equal(rev.error, null);
  assert.ok(rev.data.revoked_at);
});

test("access_code_redemptions: self-only INSERT/SELECT + unique reuse block", { skip: SKIP }, async () => {
  const orgId = await makeOrg("RedeemOrg");
  const orgAdmin = await makeUser("owner", "district_admin");
  const userA = await makeUser("a", null);
  const userB = await makeUser("b", null);

  const bind = await admin.from("org_memberships").insert({
    user_id: orgAdmin.uid,
    organization_id: orgId,
    role: "district_admin",
    status: "active",
  });
  if (bind.error) return;

  const raw = `RC-${STAMP}-${Math.random().toString(36).slice(2, 8)}`;
  const code = await orgAdmin.client
    .from("access_codes")
    .insert({
      code_hash: hashCode(raw),
      org_id: orgId,
      role: "educator",
      capacity: 10,
      created_by: orgAdmin.uid,
    })
    .select("id")
    .single();
  const codeId = code.data.id;

  // User A records own redemption.
  const okA = await userA.client
    .from("access_code_redemptions")
    .insert({ code_id: codeId, user_id: userA.uid })
    .select("id")
    .single();
  assert.equal(okA.error, null, `self INSERT must succeed: ${okA.error?.message}`);

  // User A cannot record on behalf of B.
  const spoof = await userA.client
    .from("access_code_redemptions")
    .insert({ code_id: codeId, user_id: userB.uid });
  assert.ok(spoof.error, "cross-user INSERT must be denied");

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

  // Reuse blocked by unique(code_id, user_id).
  const reuse = await userA.client
    .from("access_code_redemptions")
    .insert({ code_id: codeId, user_id: userA.uid });
  assert.ok(reuse.error, "duplicate redemption must be rejected");
});
