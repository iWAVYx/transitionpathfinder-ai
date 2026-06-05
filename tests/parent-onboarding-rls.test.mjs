// Regression test: Parent role can insert a row into public.students under RLS
// and read it back across a fresh session (persistence).
//
// Guards against the historical RLS recursion bug where a SECURITY DEFINER
// `can_access_student()` re-queried `students` inside the SELECT-USING clause,
// causing INSERT ... RETURNING to fail with "new row violates row-level
// security policy" even though WITH CHECK (auth.uid() = owner_id) was satisfied.
//
// Run with:  node --test tests/parent-onboarding-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const QA_PARENT_EMAIL = "qa.parent@transitionforward.test";
const QA_PARENT_PASSWORD = "TestPass!2026";

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInParent(client) {
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `parent sign-in failed: ${error?.message}`);
  assert.ok(data.session?.access_token, "expected access token after sign-in");
  return data.user;
}

test("parent can insert a student under RLS and read it back via INSERT ... RETURNING", async () => {
  const client = freshClient();
  const user = await signInParent(client);

  const firstName = `RegTest_${Date.now()}`;
  const { data, error } = await client
    .from("students")
    .insert({
      owner_id: user.id,
      first_name: firstName,
      last_name: "Auto",
      grade_band: "9-10",
    })
    .select("*")
    .single();

  try {
    assert.ok(!error, `insert failed: ${error?.code} ${error?.message}`);
    assert.equal(data.owner_id, user.id);
    assert.equal(data.first_name, firstName);
    assert.ok(data.id, "expected id returned by insert");
  } finally {
    if (data?.id) await client.from("students").delete().eq("id", data.id);
    await client.auth.signOut();
  }
});

test("parent insert persists across a fresh authenticated session", async () => {
  const writer = freshClient();
  const user = await signInParent(writer);

  const firstName = `RegPersist_${Date.now()}`;
  const { data: inserted, error: insertErr } = await writer
    .from("students")
    .insert({ owner_id: user.id, first_name: firstName })
    .select("id")
    .single();
  assert.ok(!insertErr, `insert failed: ${insertErr?.message}`);

  await writer.auth.signOut();

  // New session, simulating a page refresh / new device.
  const reader = freshClient();
  await signInParent(reader);
  const { data: rows, error: readErr } = await reader
    .from("students")
    .select("id, first_name, owner_id")
    .eq("id", inserted.id);

  try {
    assert.ok(!readErr, `read failed: ${readErr?.message}`);
    assert.equal(rows.length, 1, "student should persist for owner across sessions");
    assert.equal(rows[0].first_name, firstName);
    assert.equal(rows[0].owner_id, user.id);
  } finally {
    await reader.from("students").delete().eq("id", inserted.id);
    await reader.auth.signOut();
  }
});

test("anonymous client cannot insert into students (RLS denies)", async () => {
  const anon = freshClient();
  const { data, error } = await anon
    .from("students")
    .insert({
      owner_id: "00000000-0000-0000-0000-000000000000",
      first_name: "ShouldFail",
    })
    .select("*")
    .maybeSingle();

  assert.ok(error, "anonymous insert must be rejected by RLS");
  assert.equal(data, null);
});
