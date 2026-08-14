// Cross-district RLS regression.
//
// Verifies a District Admin can only see/modify rows scoped to a district
// they belong to, and gets correct failures (zero rows or permission
// denied) when reaching outside their scope.
//
// Fixtures (seeded by migration):
//   District A: 11111111-1111-1111-1111-1111111111aa
//     admin → qa.districtadmin@transitionforward.test
//   District B: 11111111-1111-1111-1111-1111111111bb
//     admin → qa.schooladmin@transitionforward.test
//     member → qa.parent@transitionforward.test
//
// Run with:  node --test tests/cross-district-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = process.env.STAGING_E2E_PASSWORD;
assert.ok(
  PASSWORD,
  "STAGING_E2E_PASSWORD is required for fixed staging identities",
);
const DISTRICT_A = "11111111-1111-1111-1111-1111111111aa";
const DISTRICT_B = "11111111-1111-1111-1111-1111111111bb";

const DISTRICT_A_ADMIN = "qa.districtadmin@transitionforward.test";
const DISTRICT_B_ADMIN = "qa.schooladmin@transitionforward.test";
const PARTNER_STRANGER = "qa.partner@transitionforward.test";

function client() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  assert.ok(!error, `sign-in failed for ${email}: ${error?.message}`);
  return c;
}

function assertDenied(label, { data, error }) {
  if (error) {
    const code = error.code ?? "";
    assert.ok(
      code === "42501" ||
        code.startsWith("PGRST") ||
        /permission|policy|denied/i.test(error.message),
      `${label}: unexpected error shape — ${code} ${error.message}`,
    );
    return;
  }
  assert.ok(Array.isArray(data), `${label}: expected array result`);
  assert.equal(
    data.length,
    0,
    `${label}: leaked ${data.length} cross-district row(s)`,
  );
}

// ---------- District A admin: in-scope reads succeed ----------

test("District A admin sees their own district membership", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    const { data, error } = await c
      .from("organization_memberships")
      .select("organization_id, role_within_org, status")
      .eq("organization_id", DISTRICT_A);
    assert.ok(!error, `expected success, got ${error?.message}`);
    assert.ok(
      data && data.length >= 1,
      "District A admin must see at least their own membership",
    );
    for (const row of data) {
      assert.equal(row.organization_id, DISTRICT_A);
    }
  } finally {
    await c.auth.signOut();
  }
});

test("District A admin can read their own district organization row", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    const { data, error } = await c
      .from("organizations")
      .select("id, name, type")
      .eq("id", DISTRICT_A)
      .maybeSingle();
    assert.ok(!error, `expected success, got ${error?.message}`);
    assert.ok(data, "District A admin must read their own district org row");
    assert.equal(data.type, "district");
  } finally {
    await c.auth.signOut();
  }
});

// ---------- District A admin: out-of-scope reads return zero ----------

test("District A admin cannot see District B memberships", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    assertDenied(
      "memberships filtered by District B id",
      await c
        .from("organization_memberships")
        .select("user_id, role_within_org")
        .eq("organization_id", DISTRICT_B),
    );
  } finally {
    await c.auth.signOut();
  }
});

test("District A admin cannot see pending District B organization row", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    const { data, error } = await c
      .from("organizations")
      .select("id")
      .eq("id", DISTRICT_B);
    assert.ok(!error, `unexpected error: ${error?.message}`);
    assert.equal(
      (data ?? []).length,
      0,
      "Pending (non-verified) District B must be hidden from outside admins",
    );
  } finally {
    await c.auth.signOut();
  }
});

// ---------- District A admin: out-of-scope writes are denied ----------

test("District A admin cannot UPDATE District B memberships", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    const res = await c
      .from("organization_memberships")
      .update({ role_within_org: "admin" })
      .eq("organization_id", DISTRICT_B)
      .select("user_id");
    // RLS UPDATE with no matching row returns success + empty data; either
    // shape (denied error OR zero rows changed) is acceptable.
    if (res.error) {
      assert.match(
        `${res.error.code ?? ""} ${res.error.message}`,
        /42501|permission|policy|denied/i,
        `expected permission error, got: ${res.error.code} ${res.error.message}`,
      );
    } else {
      assert.equal(
        (res.data ?? []).length,
        0,
        "Cross-district UPDATE must not affect any rows",
      );
    }
  } finally {
    await c.auth.signOut();
  }
});

test("District A admin cannot DELETE District B memberships", async () => {
  const c = await signIn(DISTRICT_A_ADMIN);
  try {
    const res = await c
      .from("organization_memberships")
      .delete()
      .eq("organization_id", DISTRICT_B)
      .select("user_id");
    if (res.error) {
      assert.match(
        `${res.error.code ?? ""} ${res.error.message}`,
        /42501|permission|policy|denied/i,
        `expected permission error, got: ${res.error.code} ${res.error.message}`,
      );
    } else {
      assert.equal(
        (res.data ?? []).length,
        0,
        "Cross-district DELETE must not affect any rows",
      );
    }
  } finally {
    await c.auth.signOut();
  }
});

// ---------- District B admin sanity: symmetric isolation ----------

test("District B admin sees District B memberships but not District A's", async () => {
  const c = await signIn(DISTRICT_B_ADMIN);
  try {
    const own = await c
      .from("organization_memberships")
      .select("user_id, organization_id")
      .eq("organization_id", DISTRICT_B);
    assert.ok(!own.error, `expected success, got ${own.error?.message}`);
    assert.ok((own.data ?? []).length >= 1, "B admin must see B memberships");

    assertDenied(
      "B admin querying District A memberships",
      await c
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", DISTRICT_A),
    );
  } finally {
    await c.auth.signOut();
  }
});

// ---------- Stranger (no district membership) ----------

test("Non-district user cannot see either district's memberships", async () => {
  const c = await signIn(PARTNER_STRANGER);
  try {
    for (const [label, id] of [
      ["District A", DISTRICT_A],
      ["District B", DISTRICT_B],
    ]) {
      assertDenied(
        `partner stranger reading ${label} memberships`,
        await c
          .from("organization_memberships")
          .select("user_id")
          .eq("organization_id", id),
      );
    }
  } finally {
    await c.auth.signOut();
  }
});
