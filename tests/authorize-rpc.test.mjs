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
