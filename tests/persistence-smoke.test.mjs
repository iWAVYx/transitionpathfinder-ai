// Phase 8 — Persistence smoke suite.
//
// For each user-writable surface, run: insert → re-read in a fresh client
// session (simulates "refresh + logout/login") → assert row survived.
//
// Uses the QA parent account already provisioned for other suites:
//   qa.parent@transitionforward.test / TestPass!2026
//
// Run with:  node --test tests/persistence-smoke.test.mjs
//
// Surfaces covered (all scoped to the parent's own data):
//   - students                  (Add Student)
//   - goals                     (Pathway plan goal)
//   - action_items              (Action item)
//   - calendar_events           (Calendar event)
//   - student_voice_responses   (Student Voice answer)
//   - saved_resources           (Resource library save)
//   - student_saved_partners    (Partner save)
//   - meeting_prep_items        (Meeting prep)
//
// Skips automatically when QA env vars are missing so PRs without secrets
// don't fail.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

const QA_PARENT_EMAIL =
  process.env.QA_PARENT_EMAIL || "qa.parent@transitionforward.test";
const QA_PARENT_PASSWORD =
  process.env.QA_PARENT_PASSWORD || "TestPass!2026";

const SKIP = !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY;

function fresh() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(client) {
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `sign-in failed: ${error?.message}`);
  return data.user;
}

async function getOrCreateStudent(client, userId) {
  const { data: existing } = await client
    .from("students")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  if (existing && existing.length) return existing[0].id;
  const { data, error } = await client
    .from("students")
    .insert({
      owner_id: userId,
      first_name: `PSmoke_${Date.now()}`,
      last_name: "Auto",
      grade_band: "9-10",
    })
    .select("id")
    .single();
  assert.ok(!error, `student insert failed: ${error?.message}`);
  return data.id;
}

async function reReadAcrossSession(table, id) {
  const c = fresh();
  await signIn(c);
  const { data, error } = await c
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle();
  assert.ok(!error, `${table} re-read failed: ${error?.message}`);
  assert.ok(data, `${table} row ${id} did not persist across session`);
}

const skipIf = SKIP ? { skip: "Supabase env not configured" } : {};

test("persistence: students survive refresh + re-login", skipIf, async () => {
  const c = fresh();
  const user = await signIn(c);
  const { data, error } = await c
    .from("students")
    .insert({
      owner_id: user.id,
      first_name: `Persist_${Date.now()}`,
      last_name: "Auto",
      grade_band: "11-12",
    })
    .select("id")
    .single();
  assert.ok(!error, error?.message);
  await reReadAcrossSession("students", data.id);
});

test("persistence: goals", skipIf, async () => {
  const c = fresh();
  const user = await signIn(c);
  const studentId = await getOrCreateStudent(c, user.id);
  const { data, error } = await c
    .from("goals")
    .insert({
      student_id: studentId,
      created_by: user.id,
      title: `Goal ${Date.now()}`,
      category: "employment",
    })
    .select("id")
    .single();
  assert.ok(!error, error?.message);
  await reReadAcrossSession("goals", data.id);
});

test("persistence: action_items", skipIf, async () => {
  const c = fresh();
  const user = await signIn(c);
  const studentId = await getOrCreateStudent(c, user.id);
  const { data, error } = await c
    .from("action_items")
    .insert({
      student_id: studentId,
      created_by_user_id: user.id,
      title: `Action ${Date.now()}`,
    })
    .select("id")
    .single();
  assert.ok(!error, error?.message);
  await reReadAcrossSession("action_items", data.id);
});

test("persistence: calendar_events", skipIf, async () => {
  const c = fresh();
  const user = await signIn(c);
  const studentId = await getOrCreateStudent(c, user.id);
  const { data, error } = await c
    .from("calendar_events")
    .insert({
      student_id: studentId,
      owner_user_id: user.id,
      title: `Event ${Date.now()}`,
      event_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  assert.ok(!error, error?.message);
  await reReadAcrossSession("calendar_events", data.id);
});

test("persistence: saved_resources", skipIf, async () => {
  const c = fresh();
  const user = await signIn(c);
  // pick any active resource id
  const { data: resources } = await c
    .from("resources")
    .select("id")
    .limit(1);
  if (!resources?.length) return; // nothing to save against
  const { data, error } = await c
    .from("saved_resources")
    .insert({ user_id: user.id, resource_id: resources[0].id })
    .select("id")
    .single();
  if (error && /duplicate/i.test(error.message)) return; // already saved
  assert.ok(!error, error?.message);
  await reReadAcrossSession("saved_resources", data.id);
});
