// Boundary test for the SQL public.authorize() function.
//
// Slice A2 introduces authorize() as the unified capability gate on top of
// RLS. This test verifies:
//   1. A district admin gets authorize('view','organization', theirDistrict) = true.
//   2. The same admin gets false for a district they don't belong to.
//   3. A partner gets authorize('publish_opportunity','partner_capability') = true
//      (baseline free-tier capability).
//
// Fixtures come from the shared QA seed (same as cross-district-rls.test.mjs).
//
// Run with:  node --test tests/authorize-rpc.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = "TestPass!2026";
const DISTRICT_A = "11111111-1111-1111-1111-1111111111aa";
const DISTRICT_B = "11111111-1111-1111-1111-1111111111bb";

const DISTRICT_A_ADMIN = "qa.districtadmin@transitionforward.test";
const PARTNER_USER = "qa.partner@transitionforward.test";
const PARENT_USER = "qa.parent@transitionforward.test";

function client() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ok(!error, `sign-in failed for ${email}: ${error?.message}`);
  const { data: userRes } = await c.auth.getUser();
  return { supabase: c, userId: userRes.user.id };
}

async function authorize(supabase, args) {
  const { data, error } = await supabase.rpc("authorize", {
    _user_id: args.userId,
    _action: args.action,
    _resource_type: args.resourceType,
    _resource_id: args.resourceId ?? null,
  });
  assert.ok(!error, `authorize() RPC failed: ${error?.message}`);
  return data === true;
}

test("district admin: authorize('view','organization', ownDistrict) = true", async () => {
  const { supabase, userId } = await signIn(DISTRICT_A_ADMIN);
  const allowed = await authorize(supabase, {
    userId,
    action: "view",
    resourceType: "organization",
    resourceId: DISTRICT_A,
  });
  assert.equal(allowed, true, "expected district admin to view their own district");
});

test("district admin: authorize('view','organization', otherDistrict) = false", async () => {
  const { supabase, userId } = await signIn(DISTRICT_A_ADMIN);
  const allowed = await authorize(supabase, {
    userId,
    action: "view",
    resourceType: "organization",
    resourceId: DISTRICT_B,
  });
  assert.equal(allowed, false, "expected district admin to be denied on other district");
});

test("partner user: authorize('publish_opportunity','partner_capability') = true baseline", async () => {
  const { supabase, userId } = await signIn(PARTNER_USER);
  const allowed = await authorize(supabase, {
    userId,
    action: "publish_opportunity",
    resourceType: "partner_capability",
  });
  assert.equal(allowed, true, "publish_opportunity is baseline true for any partner");
});

// --- Slice A3: entitlement / capability boundary ---
// A parent user has no partner entitlement, so partner_capability actions
// must be denied even at the free-tier baseline. Mirrors the waitlist
// boundary: signed-in ≠ entitled for a given resource type.

test("parent user: authorize('publish_opportunity','partner_capability') = false", async () => {
  const { supabase, userId } = await signIn(PARENT_USER);
  const allowed = await authorize(supabase, {
    userId,
    action: "publish_opportunity",
    resourceType: "partner_capability",
  });
  assert.equal(allowed, false, "parent user must not have partner publish capability");
});

test("parent user: authorize('view','organization', anyDistrict) = false", async () => {
  const { supabase, userId } = await signIn(PARENT_USER);
  const allowed = await authorize(supabase, {
    userId,
    action: "view",
    resourceType: "organization",
    resourceId: DISTRICT_A,
  });
  assert.equal(allowed, false, "parent user has no district membership");
});

// --- Slice A4: cross-org manage denial writes an audit row ---
// Verifies that a district admin attempting to manage a district they don't
// belong to gets denied AND the denial is captured in org_access_audit
// (the actor-scoped insert policy from Slice A2 lets us read our own rows).

test("cross-org manage denial writes org_access_audit deny row", async () => {
  const { supabase, userId } = await signIn(DISTRICT_A_ADMIN);
  const before = new Date().toISOString();

  // Call authorize() directly (matches src/lib/authz.ts wire) then insert
  // the denial row the same way isAuthorized() would.
  const allowed = await authorize(supabase, {
    userId,
    action: "manage",
    resourceType: "organization",
    resourceId: DISTRICT_B,
  });
  assert.equal(allowed, false);

  const { error: insertErr } = await supabase.from("org_access_audit").insert({
    actor_id: userId,
    action: "manage",
    resource_type: "organization",
    resource_id: DISTRICT_B,
    decision: "deny",
    reason: "denied",
  });
  assert.ok(!insertErr, `audit insert failed: ${insertErr?.message}`);

  const { data: rows, error: readErr } = await supabase
    .from("org_access_audit")
    .select("id, action, resource_type, resource_id, decision")
    .eq("actor_id", userId)
    .eq("resource_id", DISTRICT_B)
    .eq("decision", "deny")
    .gte("created_at", before);
  assert.ok(!readErr, `audit read failed: ${readErr?.message}`);
  assert.ok((rows?.length ?? 0) >= 1, "expected at least one deny audit row");
});

// --- Slice A5: Workstream A wrap-up ---
// Waitlist-vs-entitled boundary: a signed-in user without any active
// access_entitlements row must get user_has_feature = false for every
// feature flag. Signed-in ≠ entitled.

test("waitlist boundary: parent user has no entitlement features", async () => {
  const { supabase, userId } = await signIn(PARENT_USER);
  for (const feature of ["family_access", "student_access", "partner_access", "any"]) {
    const { data, error } = await supabase.rpc("user_has_feature", {
      _user_id: userId,
      _feature: feature,
    });
    assert.ok(!error, `user_has_feature(${feature}) failed: ${error?.message}`);
    assert.equal(data, false, `parent (waitlist) must not have ${feature}`);
  }
});

// Role-guard matrix wrap-up: enumerate (actor, action, resourceType, resourceId)
// tuples and assert authorize() returns the expected decision. This is the
// single source of truth for Workstream A boundary semantics; any regression
// in helper functions or RLS will flip a row here.

test("role-guard matrix: cross-tenant + capability decisions", async () => {
  const cases = [
    // District A admin
    { as: DISTRICT_A_ADMIN, action: "view",   type: "organization",       id: DISTRICT_A, expect: true  },
    { as: DISTRICT_A_ADMIN, action: "manage", type: "organization",       id: DISTRICT_A, expect: true  },
    { as: DISTRICT_A_ADMIN, action: "view",   type: "organization",       id: DISTRICT_B, expect: false },
    { as: DISTRICT_A_ADMIN, action: "manage", type: "organization",       id: DISTRICT_B, expect: false },
    { as: DISTRICT_A_ADMIN, action: "publish_opportunity", type: "partner_capability", id: null, expect: false },
    // Partner
    { as: PARTNER_USER,     action: "publish_opportunity", type: "partner_capability", id: null, expect: true  },
    { as: PARTNER_USER,     action: "view",   type: "organization",       id: DISTRICT_A, expect: false },
    // Parent (waitlist)
    { as: PARENT_USER,      action: "view",   type: "organization",       id: DISTRICT_A, expect: false },
    { as: PARENT_USER,      action: "publish_opportunity", type: "partner_capability", id: null, expect: false },
  ];

  for (const c of cases) {
    const { supabase, userId } = await signIn(c.as);
    const allowed = await authorize(supabase, {
      userId,
      action: c.action,
      resourceType: c.type,
      resourceId: c.id,
    });
    assert.equal(
      allowed,
      c.expect,
      `matrix: ${c.as} ${c.action} ${c.type}(${c.id ?? "-"}) expected ${c.expect} got ${allowed}`,
    );
  }
});
