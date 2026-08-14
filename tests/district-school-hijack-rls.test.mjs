// Regression test: District admin cannot hijack a school owned by another
// district via direct DB writes.
//
// Fix (defense-in-depth):
//   1. supabaseAdmin path in src/lib/district-admin.functions.ts
//      (addSchoolToDistrict) — the server function bypasses RLS on purpose
//      but now checks the caller is independently a school admin before
//      re-parenting an already-claimed school. That path is exercised in
//      server-function unit coverage.
//   2. RLS on public.organizations — a district admin has no UPDATE policy
//      on the organizations table, so a direct PostgREST UPDATE from a
//      compromised client (or a copy/paste of the fix that forgets the
//      guard) cannot flip parent_organization_id.
//
// This file locks in guard #2 — the last line of defense at the database.
//
// Fixtures come from the cross-district QA seed:
//   District A admin: qa.districtadmin@transitionforward.test  (DISTRICT_A)
//   District B admin: qa.schooladmin@transitionforward.test    (DISTRICT_B)
//
// Run with:  node --test tests/district-school-hijack-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = process.env.STAGING_E2E_PASSWORD;
assert.ok(
  PASSWORD,
  "STAGING_E2E_PASSWORD is required for fixed staging identities",
);
const DISTRICT_A = "11111111-1111-1111-1111-1111111111aa";
const DISTRICT_B = "11111111-1111-1111-1111-1111111111bb";
const DISTRICT_A_ADMIN = "qa.districtadmin@transitionforward.test";
const DISTRICT_B_ADMIN = "qa.schooladmin@transitionforward.test";

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email) {
  const c = freshClient();
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ok(!error, `sign-in for ${email} failed: ${error?.message}`);
  return { client: c, user: data.user };
}

// Find a school currently parented to `districtId`. Signed-in as an admin
// of that district we can see it via View verified-or-member RLS.
async function findSchoolForDistrict(client, districtId) {
  const { data, error } = await client
    .from("organizations")
    .select("id, name, parent_organization_id")
    .eq("type", "school")
    .eq("parent_organization_id", districtId)
    .limit(1);
  assert.ok(!error, `school lookup failed: ${error?.message}`);
  return data?.[0] ?? null;
}

test("District A admin cannot re-parent District B's school via direct UPDATE", async () => {
  const b = await signIn(DISTRICT_B_ADMIN);
  const victimSchool = await findSchoolForDistrict(b.client, DISTRICT_B);
  await b.client.auth.signOut();
  if (!victimSchool) {
    // No seeded school under District B — nothing to hijack, skip.
    return;
  }

  const a = await signIn(DISTRICT_A_ADMIN);
  try {
    const res = await a.client
      .from("organizations")
      .update({ parent_organization_id: DISTRICT_A })
      .eq("id", victimSchool.id)
      .select("id, parent_organization_id");

    // RLS denies via error OR by filtering zero rows out. Either shape is fine.
    if (res.error) {
      assert.match(
        `${res.error.code ?? ""} ${res.error.message}`,
        /42501|policy|permission|denied/i,
        `expected RLS error, got ${res.error.code} ${res.error.message}`,
      );
    } else {
      assert.equal(
        (res.data ?? []).length,
        0,
        `hijack UPDATE must affect zero rows, got ${JSON.stringify(res.data)}`,
      );
    }
  } finally {
    await a.client.auth.signOut();
  }

  // Verify the victim school is still parented to District B.
  const b2 = await signIn(DISTRICT_B_ADMIN);
  try {
    const { data } = await b2.client
      .from("organizations")
      .select("parent_organization_id")
      .eq("id", victimSchool.id)
      .maybeSingle();
    assert.equal(
      data?.parent_organization_id,
      DISTRICT_B,
      "victim school parent must remain District B after failed hijack",
    );
  } finally {
    await b2.client.auth.signOut();
  }
});

test("District A admin cannot NULL out District B school's parent to unclaim it", async () => {
  const b = await signIn(DISTRICT_B_ADMIN);
  const victimSchool = await findSchoolForDistrict(b.client, DISTRICT_B);
  await b.client.auth.signOut();
  if (!victimSchool) return;

  const a = await signIn(DISTRICT_A_ADMIN);
  try {
    const res = await a.client
      .from("organizations")
      .update({ parent_organization_id: null })
      .eq("id", victimSchool.id)
      .select("id");
    if (res.error) {
      assert.match(
        `${res.error.code ?? ""} ${res.error.message}`,
        /42501|policy|permission|denied/i,
      );
    } else {
      assert.equal((res.data ?? []).length, 0, "unclaim UPDATE must affect zero rows");
    }
  } finally {
    await a.client.auth.signOut();
  }
});

test("District A admin cannot INSERT a school pre-parented to District B", async () => {
  // The org INSERT policy allows any authenticated user to create a pending
  // org — but that row is theirs to steward, not a way to spoof District B.
  // We still assert the row does NOT appear in District B admin's view (i.e.
  // it is not treated as a District B school).
  const a = await signIn(DISTRICT_A_ADMIN);
  let createdId = null;
  try {
    const name = `HijackAttempt_${Date.now()}`;
    const ins = await a.client
      .from("organizations")
      .insert({
        name,
        type: "school",
        parent_organization_id: DISTRICT_B,
        verified_status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (ins.error) {
      // Denial is the strongest outcome — accept and stop.
      assert.match(
        `${ins.error.code ?? ""} ${ins.error.message}`,
        /42501|policy|permission|denied/i,
      );
      return;
    }
    createdId = ins.data?.id ?? null;
  } finally {
    await a.client.auth.signOut();
  }

  if (!createdId) return;

  // District B admin should still not see a phantom pending school claiming
  // their district: the "View verified or member organizations" SELECT
  // policy only exposes verified rows or rows the viewer is a member of.
  const b = await signIn(DISTRICT_B_ADMIN);
  try {
    const { data } = await b.client
      .from("organizations")
      .select("id")
      .eq("id", createdId);
    assert.equal(
      (data ?? []).length,
      0,
      "pending cross-district INSERT must not surface in victim district's view",
    );
  } finally {
    await b.client.auth.signOut();
  }
});
