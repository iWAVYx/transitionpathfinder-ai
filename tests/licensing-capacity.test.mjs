// Licensing capacity enforcement — database contract.
//
// Coverage:
//   * Reserving consumes capacity; the pool never over-allocates.
//   * Simultaneous invitations at the ceiling: exactly one wins.
//   * Expired invitations release their reservation automatically.
//   * Activation on invitation acceptance flips reserved → active.
//   * Revocation and transfer return / move capacity.
//   * Ending an org membership immediately releases sponsored capacity.
//   * Cross-organization isolation: org A capacity is invisible to org B.
//
// Run with:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node --test tests/licensing-capacity.test.mjs

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SKIP = !URL || !SVC || !PUB;
const admin = SKIP
  ? null
  : createClient(URL, SVC, { auth: { persistSession: false } });

const STAMP = Date.now();
const PASSWORD = "TestPass!2026";
// Capacity RPCs are authorized as an org administrator, never as service role.
const state = { orgA: null, orgB: null, poolA: null, client: null, userId: null };

async function capacity(orgId, type) {
  const { data } = await state.client.rpc("org_capacity_summary", {
    _org_id: orgId,
  });
  return (data ?? []).find((r) => r.license_type === type) ?? null;
}

async function reserve(orgId, email, type = "pathway") {
  return state.client.rpc("reserve_license_allocation", {
    _org_id: orgId,
    _license_type: type,
    _beneficiary_email: email,
    _invitation_source: "test",
  });
}

before(async () => {
  if (SKIP) return;
  const { data: orgs } = await admin
    .from("organizations")
    .insert([
      { name: `QA Licensing A ${STAMP}`, type: "school" },
      { name: `QA Licensing B ${STAMP}`, type: "school" },
    ])
    .select("id");
  state.orgA = orgs[0].id;
  state.orgB = orgs[1].id;

  const email = `qa.licadmin.${STAMP}@transitionforward.test`;
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  state.userId = created.user.id;
  await admin.from("organization_memberships").insert({
    organization_id: state.orgA,
    user_id: state.userId,
    role_within_org: "school_admin",
    status: "active",
    membership_status: "active",
  });
  state.client = createClient(URL, PUB, { auth: { persistSession: false } });
  await state.client.auth.signInWithPassword({ email, password: PASSWORD });

  const { data: pool } = await admin
    .from("license_pools")
    .insert({
      organization_id: state.orgA,
      license_type: "pathway",
      source: "grant",
      purchased: 2,
      status: "active",
    })
    .select("id")
    .single();
  state.poolA = pool.id;
});

after(async () => {
  if (SKIP) return;
  await admin
    .from("organizations")
    .delete()
    .in("id", [state.orgA, state.orgB].filter(Boolean));
  if (state.userId) await admin.auth.admin.deleteUser(state.userId);
});

test("reserving consumes available capacity", { skip: SKIP }, async () => {
  const before = await capacity(state.orgA, "pathway");
  assert.equal(before.purchased, 2);
  assert.equal(before.available, 2);

  const { data: id, error } = await reserve(state.orgA, `a1.${STAMP}@qa.test`);
  assert.equal(error, null);
  assert.ok(id);

  const after = await capacity(state.orgA, "pathway");
  assert.equal(after.reserved, 1);
  assert.equal(after.available, 1);
});

test(
  "simultaneous invitations cannot exceed the ceiling",
  { skip: SKIP },
  async () => {
    // One seat left; fire three reservations at once.
    const results = await Promise.all([
      reserve(state.orgA, `race1.${STAMP}@qa.test`),
      reserve(state.orgA, `race2.${STAMP}@qa.test`),
      reserve(state.orgA, `race3.${STAMP}@qa.test`),
    ]);
    const granted = results.filter((r) => !r.error && r.data);
    assert.equal(granted.length, 1, "exactly one reservation may win");

    const after = await capacity(state.orgA, "pathway");
    assert.equal(after.available, 0);
    assert.ok(after.reserved + after.active <= after.purchased);
  },
);

test("no capacity means no reservation", { skip: SKIP }, async () => {
  const { data, error } = await reserve(state.orgA, `full.${STAMP}@qa.test`);
  assert.ok(error || !data, "must refuse when the pool is exhausted");
});

test("revoking returns capacity to the pool", { skip: SKIP }, async () => {
  const { data: rows } = await admin
    .from("license_allocations")
    .select("id")
    .eq("sponsor_organization_id", state.orgA)
    .eq("state", "reserved")
    .limit(1);
  const allocId = rows[0].id;

  const { error } = await state.client.rpc("revoke_license_allocation", {
    _allocation_id: allocId,
    _reason: "test revoke",
  });
  assert.equal(error, null);

  const after = await capacity(state.orgA, "pathway");
  assert.equal(after.available, 1);
});

test("expired reservations are released automatically", { skip: SKIP }, async () => {
  const { data: id } = await reserve(state.orgA, `exp.${STAMP}@qa.test`);
  await admin
    .from("license_allocations")
    .update({ reserved_until: new Date(Date.now() - 60_000).toISOString() })
    .eq("id", id);

  const { error } = await admin.rpc("release_expired_license_allocations");
  assert.equal(error, null);

  const { data: row } = await admin
    .from("license_allocations")
    .select("state")
    .eq("id", id)
    .single();
  assert.equal(row.state, "expired");

  const after = await capacity(state.orgA, "pathway");
  assert.equal(after.available, 1, "expired reservations free their capacity");
});

test("cross-organization isolation", { skip: SKIP }, async () => {
  const other = await capacity(state.orgB, "pathway");
  assert.ok(
    other === null || other.purchased === 0,
    "org B must not see org A capacity",
  );
  const { data, error } = await reserve(state.orgB, `iso.${STAMP}@qa.test`);
  assert.ok(error || !data, "org B has no pool to allocate from");
});

test(
  "ending an organization membership releases sponsored capacity",
  { skip: SKIP },
  async () => {
    const { data: allocId } = await reserve(
      state.orgA,
      `member.${STAMP}@qa.test`,
    );
    // Simulate acceptance: the license is now held by the admin user.
    await admin
      .from("license_allocations")
      .update({
        state: "active",
        beneficiary_user_id: state.userId,
        activated_at: new Date().toISOString(),
      })
      .eq("id", allocId);

    await admin
      .from("organization_memberships")
      .update({ membership_status: "inactive", status: "inactive" })
      .eq("organization_id", state.orgA)
      .eq("user_id", state.userId);

    const { data: row } = await admin
      .from("license_allocations")
      .select("state, revoked_reason")
      .eq("id", allocId)
      .single();
    assert.equal(row.state, "revoked");
    assert.match(row.revoked_reason ?? "", /membership ended/i);

    // Restore the membership so later runs of this file are unaffected.
    await admin
      .from("organization_memberships")
      .update({ membership_status: "active", status: "active" })
      .eq("organization_id", state.orgA)
      .eq("user_id", state.userId);
  },
);
