// Workstream B, Slice B5 — edge writer + provenance read test.
//
// Verifies that:
//   1. Seeding an evidence_item and upserting an evidence_edges row to a
//      pathway_recommendation is idempotent (unique key on
//      from_type/from_id/to_type/to_id/relation).
//   2. The recommendation_provenance_v1 view returns exactly one row for the
//      owner, joining evidence_item ↔ edge ↔ recommendation id.
//   3. An unrelated signed-in parent sees zero rows through the view.
//
// Run with:  node --test tests/evidence-edge-writer.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const OWNER_EMAIL = "qa.parent@transitionforward.test";
const PASSWORD = "TestPass!2026";

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(client, email = OWNER_EMAIL) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ok(!error, `sign-in failed for ${email}: ${error?.message}`);
  return data.user;
}

async function seedItem(client, user) {
  const { data: student, error: sErr } = await client
    .from("students")
    .insert({ owner_id: user.id, first_name: `EdgeRLS_${Date.now()}`, last_name: "Auto" })
    .select("id").single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  const { data: ei, error: eErr } = await client
    .from("evidence_items")
    .insert({
      student_id: student.id,
      kind: "manual_note",
      source_kind: "manual",
      contributor_id: user.id,
      verification_state: "unverified",
      permission_scope: "student_team",
      payload: { note: "b5-edge-test" },
    })
    .select("id").single();
  assert.ok(!eErr, `evidence_item seed failed: ${eErr?.message}`);

  return { studentId: student.id, evidenceId: ei.id, recId: crypto.randomUUID() };
}

async function upsertEdge(client, user, { evidenceId, recId }) {
  const { data, error } = await client
    .from("evidence_edges")
    .upsert(
      {
        from_type: "evidence_item",
        from_id: evidenceId,
        to_type: "pathway_recommendation",
        to_id: recId,
        relation: "supports",
        weight: 1,
        created_by: user.id,
      },
      { onConflict: "from_type,from_id,to_type,to_id,relation", ignoreDuplicates: true },
    )
    .select("id").maybeSingle();
  assert.ok(!error, `edge upsert failed: ${error?.message}`);
  return data?.id ?? null;
}

async function cleanup(client, ids) {
  await client.from("evidence_edges").delete().eq("from_id", ids.evidenceId);
  await client.from("evidence_items").delete().eq("id", ids.evidenceId);
  await client.from("students").delete().eq("id", ids.studentId);
}

test("edge writer is idempotent on unique (from,to,relation)", async () => {
  const c = freshClient();
  const user = await signIn(c);
  const ids = await seedItem(c, user);
  try {
    await upsertEdge(c, user, ids);
    await upsertEdge(c, user, ids);
    await upsertEdge(c, user, ids);
    const { data: rows, error } = await c
      .from("evidence_edges")
      .select("id")
      .eq("from_id", ids.evidenceId)
      .eq("to_id", ids.recId)
      .eq("relation", "supports");
    assert.ok(!error, `count query failed: ${error?.message}`);
    assert.equal(rows?.length, 1, "expected exactly one edge after repeated upserts");
  } finally {
    await cleanup(c, ids);
  }
});

test("recommendation_provenance_v1 returns exactly one row for owner", async () => {
  const c = freshClient();
  const user = await signIn(c);
  const ids = await seedItem(c, user);
  try {
    await upsertEdge(c, user, ids);
    const { data: rows, error } = await c
      .from("recommendation_provenance_v1")
      .select("edge_id, evidence_id, relation")
      .eq("recommendation_id", ids.recId);
    assert.ok(!error, `provenance read failed: ${error?.message}`);
    assert.equal(rows?.length, 1);
    assert.equal(rows[0].evidence_id, ids.evidenceId);
    assert.equal(rows[0].relation, "supports");
  } finally {
    await cleanup(c, ids);
  }
});

test("unrelated user sees zero provenance rows", async () => {
  const owner = freshClient();
  const ownerUser = await signIn(owner);
  const ids = await seedItem(owner, ownerUser);
  await upsertEdge(owner, ownerUser, ids);

  const other = freshClient();
  const otherEmail = `qa.parent.edge.${Date.now()}@transitionforward.test`;
  const { error: suErr } = await other.auth.signUp({ email: otherEmail, password: PASSWORD });
  assert.ok(!suErr, `sign-up failed: ${suErr?.message}`);

  try {
    const { data: rows, error } = await other
      .from("recommendation_provenance_v1")
      .select("edge_id")
      .eq("recommendation_id", ids.recId);
    assert.ok(!error, `unrelated provenance read errored: ${error?.message}`);
    assert.equal(rows?.length ?? 0, 0, "unrelated user must not see the provenance row");
  } finally {
    await cleanup(owner, ids);
  }
});
