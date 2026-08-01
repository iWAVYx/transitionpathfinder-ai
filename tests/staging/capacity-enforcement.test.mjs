// Capacity + sponsored-access enforcement against a staging backend.
//
// Mirrors tests/licensing-capacity.test.mjs but is fully namespaced
// (FIXTURE_TAG) and parameterized for staging, and additionally asserts the
// governance audit trail and entitlement side effects.
//
//   node --test tests/staging/capacity-enforcement.test.mjs

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  SKIP,
  FIXTURE_TAG,
  FIXTURE_PASSWORD,
  fixtureEmail,
  adminClient,
  userClient,
} from "./harness.mjs";

const admin = adminClient();
const state = { orgA: null, orgB: null, adminUser: null, client: null };

async function capacity(orgId, type = "pathway") {
  const { data } = await state.client.rpc("org_capacity_summary", {
    _org_id: orgId,
  });
  return (data ?? []).find((r) => r.license_type === type) ?? null;
}

function reserve(orgId, email, type = "pathway") {
  return state.client.rpc("reserve_license_allocation", {
    _org_id: orgId,
    _license_type: type,
    _beneficiary_email: email,
    _invitation_source: FIXTURE_TAG,
  });
}

before(async () => {
  if (SKIP) return;
  const { data: orgs, error } = await admin
    .from("organizations")
    .insert([
      { name: `${FIXTURE_TAG} org A`, type: "school" },
      { name: `${FIXTURE_TAG} org B`, type: "school" },
    ])
    .select("id");
  assert.equal(error, null, error?.message);
  state.orgA = orgs[0].id;
  state.orgB = orgs[1].id;

  const email = fixtureEmail("orgadmin");
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password: FIXTURE_PASSWORD,
    email_confirm: true,
  });
  state.adminUser = created.user.id;

  await admin.from("organization_memberships").insert({
    organization_id: state.orgA,
    user_id: state.adminUser,
    role_within_org: "school_admin",
    status: "active",
    membership_status: "active",
  });

  state.client = userClient();
  await state.client.auth.signInWithPassword({
    email,
    password: FIXTURE_PASSWORD,
  });

  await admin.from("license_pools").insert({
    organization_id: state.orgA,
    license_type: "pathway",
    source: "grant",
    purchased: 2,
    status: "active",
  });
});

after(async () => {
  if (SKIP) return;
  await admin
    .from("organizations")
    .delete()
    .in("id", [state.orgA, state.orgB].filter(Boolean));
  if (state.adminUser) await admin.auth.admin.deleteUser(state.adminUser);
});

test("reservation consumes capacity", { skip: SKIP }, async () => {
  const before = await capacity(state.orgA);
  assert.equal(before.available, 2);

  const { data: id, error } = await reserve(state.orgA, fixtureEmail("a1"));
  assert.equal(error, null);
  assert.ok(id);

  const after = await capacity(state.orgA);
  assert.equal(after.reserved, 1);
  assert.equal(after.available, 1);
});

test("concurrent invitations cannot oversubscribe the pool", { skip: SKIP }, async () => {
  const results = await Promise.all([
    reserve(state.orgA, fixtureEmail("race1")),
    reserve(state.orgA, fixtureEmail("race2")),
    reserve(state.orgA, fixtureEmail("race3")),
  ]);
  const granted = results.filter((r) => !r.error && r.data);
  assert.equal(granted.length, 1, "exactly one reservation may win the last seat");

  const after = await capacity(state.orgA);
  assert.equal(after.available, 0);
  assert.ok(after.reserved + after.active <= after.purchased);
});

test("an exhausted pool refuses further reservations", { skip: SKIP }, async () => {
  const { data, error } = await reserve(state.orgA, fixtureEmail("overflow"));
  assert.ok(error || !data);
});

test("revocation records an audit event with the stated reason", { skip: SKIP }, async () => {
  const { data: rows } = await admin
    .from("license_allocations")
    .select("id")
    .eq("sponsor_organization_id", state.orgA)
    .eq("state", "reserved")
    .limit(1);
  const allocationId = rows[0].id;

  const reason = `${FIXTURE_TAG} revoke for verification`;
  const { error } = await state.client.rpc("revoke_license_allocation", {
    _allocation_id: allocationId,
    _reason: reason,
  });
  assert.equal(error, null);

  const after = await capacity(state.orgA);
  assert.equal(after.available, 1, "revoking returns the seat");

  const { data: events } = await admin
    .from("entitlement_audit_events")
    .select("event, reason, allocation_id, actor_id")
    .eq("allocation_id", allocationId)
    .order("created_at", { ascending: false });
  assert.ok(events?.length, "revocation must be audited");
  assert.equal(events[0].reason, reason);
  assert.equal(events[0].actor_id, state.adminUser);
});

test("the audit trail is immutable", { skip: SKIP }, async () => {
  const { data: events } = await admin
    .from("entitlement_audit_events")
    .select("id")
    .limit(1);
  if (!events?.length) return;
  const { error: updateError } = await admin
    .from("entitlement_audit_events")
    .update({ reason: "tampered" })
    .eq("id", events[0].id);
  assert.ok(updateError, "audit rows must not be updatable, even as service role");
  const { error: deleteError } = await admin
    .from("entitlement_audit_events")
    .delete()
    .eq("id", events[0].id);
  assert.ok(deleteError, "audit rows must not be deletable");
});

test("expired reservations release their capacity", { skip: SKIP }, async () => {
  const { data: id } = await reserve(state.orgA, fixtureEmail("expiring"));
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
  assert.equal((await capacity(state.orgA)).available, 1);
});

test("capacity is invisible across organizations", { skip: SKIP }, async () => {
  const other = await capacity(state.orgB);
  assert.ok(other === null || other.purchased === 0);
  const { data, error } = await reserve(state.orgB, fixtureEmail("iso"));
  assert.ok(error || !data, "org B has no pool of its own");
});

test("ending a membership releases sponsored capacity", { skip: SKIP }, async () => {
  const { data: allocationId } = await reserve(state.orgA, fixtureEmail("member"));
  assert.ok(allocationId);
  await admin
    .from("license_allocations")
    .update({
      state: "active",
      beneficiary_user_id: state.adminUser,
      activated_at: new Date().toISOString(),
    })
    .eq("id", allocationId);

  await admin
    .from("organization_memberships")
    .update({ membership_status: "removed", status: "suspended" })
    .eq("organization_id", state.orgA)
    .eq("user_id", state.adminUser);

  const { data: row } = await admin
    .from("license_allocations")
    .select("state, notes")
    .eq("id", allocationId)
    .single();
  assert.equal(row.state, "revoked");
  assert.match(row.notes ?? "", /membership ended/i);

  await admin
    .from("organization_memberships")
    .update({ membership_status: "active", status: "active" })
    .eq("organization_id", state.orgA)
    .eq("user_id", state.adminUser);
});
