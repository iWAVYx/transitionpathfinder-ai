// Workstream B, Slice B3: evidence graph read-view RLS test.
//
// Verifies:
//   1. A signed-in student-team member (parent owner) who inserts an
//      evidence_item + evidence_edge sees them in student_evidence_v1 and
//      recommendation_provenance_v1.
//   2. An unrelated signed-in parent sees zero rows for those same ids.
//   3. Anon (no session) sees zero rows.
//
// Run with:  node --test tests/evidence-graph-views.test.mjs

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

async function signInParent(client, email = QA_PARENT_EMAIL) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `sign-in failed for ${email}: ${error?.message}`);
  return data.user;
}

async function ensureOtherParent() {
  // Reuse a second stable fixture if present; otherwise create an ephemeral
  // parent via sign-up so the test is self-contained.
  const email = `qa.parent.evidence.${Date.now()}@transitionforward.test`;
  const client = freshClient();
  const { data, error } = await client.auth.signUp({
    email,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `sign-up failed: ${error?.message}`);
  return { client, user: data.user, email };
}

async function seedEvidence(client, user) {
  const { data: student, error: sErr } = await client
    .from("students")
    .insert({
      owner_id: user.id,
      first_name: `EvidenceRLS_${Date.now()}`,
      last_name: "Auto",
    })
    .select("id")
    .single();
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
      payload: { note: "b3-view-test" },
    })
    .select("id")
    .single();
  assert.ok(!eErr, `evidence_item seed failed: ${eErr?.message}`);

  // Fake target uuid — polymorphic edges do not FK the to-side.
  const recId = crypto.randomUUID();
  const { data: edge, error: edErr } = await client
    .from("evidence_edges")
    .insert({
      from_type: "evidence_item",
      from_id: ei.id,
      to_type: "pathway_recommendation",
      to_id: recId,
      relation: "supports",
      created_by: user.id,
    })
    .select("id")
    .single();
  assert.ok(!edErr, `evidence_edges seed failed: ${edErr?.message}`);

  return { studentId: student.id, evidenceId: ei.id, edgeId: edge.id, recId };
}

async function cleanup(client, ids) {
  if (ids?.edgeId) await client.from("evidence_edges").delete().eq("id", ids.edgeId);
  if (ids?.evidenceId) await client.from("evidence_items").delete().eq("id", ids.evidenceId);
  if (ids?.studentId) await client.from("students").delete().eq("id", ids.studentId);
}

test("owner sees own evidence in student_evidence_v1 and recommendation_provenance_v1", async () => {
  const client = freshClient();
  const user = await signInParent(client);
  const ids = await seedEvidence(client, user);

  try {
    const { data: rows, error } = await client
      .from("student_evidence_v1")
      .select("evidence_id, edge_count, relations")
      .eq("evidence_id", ids.evidenceId);
    assert.ok(!error, `student_evidence_v1 read failed: ${error?.message}`);
    assert.equal(rows?.length, 1, "owner should see exactly their evidence row");
    assert.equal(rows[0].edge_count, 1, "edge count should reflect one attached edge");
    assert.ok(
      Array.isArray(rows[0].relations) && rows[0].relations.includes("supports"),
      "relations aggregate should include 'supports'",
    );

    const { data: prov, error: pErr } = await client
      .from("recommendation_provenance_v1")
      .select("recommendation_id, evidence_id, relation")
      .eq("evidence_id", ids.evidenceId);
    assert.ok(!pErr, `recommendation_provenance_v1 read failed: ${pErr?.message}`);
    assert.equal(prov?.length, 1, "owner should see exactly their provenance row");
    assert.equal(prov[0].recommendation_id, ids.recId);
    assert.equal(prov[0].relation, "supports");
  } finally {
    await cleanup(client, ids);
  }
});

test("unrelated signed-in user sees zero rows in evidence views", async () => {
  const owner = freshClient();
  const ownerUser = await signInParent(owner);
  const ids = await seedEvidence(owner, ownerUser);

  const { client: other } = await ensureOtherParent();
  try {
    const { data: rows, error } = await other
      .from("student_evidence_v1")
      .select("evidence_id")
      .eq("evidence_id", ids.evidenceId);
    assert.ok(!error, `unrelated read errored: ${error?.message}`);
    assert.equal(rows?.length ?? 0, 0, "unrelated user must not see the evidence row");

    const { data: prov, error: pErr } = await other
      .from("recommendation_provenance_v1")
      .select("edge_id")
      .eq("evidence_id", ids.evidenceId);
    assert.ok(!pErr, `unrelated provenance read errored: ${pErr?.message}`);
    assert.equal(prov?.length ?? 0, 0, "unrelated user must not see the provenance row");
  } finally {
    await cleanup(owner, ids);
  }
});

test("anon sees zero rows in evidence views", async () => {
  const owner = freshClient();
  const ownerUser = await signInParent(owner);
  const ids = await seedEvidence(owner, ownerUser);

  const anon = freshClient();
  try {
    const { data: rows } = await anon
      .from("student_evidence_v1")
      .select("evidence_id")
      .eq("evidence_id", ids.evidenceId);
    assert.equal(rows?.length ?? 0, 0, "anon must not see the evidence row");

    const { data: prov } = await anon
      .from("recommendation_provenance_v1")
      .select("edge_id")
      .eq("evidence_id", ids.evidenceId);
    assert.equal(prov?.length ?? 0, 0, "anon must not see the provenance row");
  } finally {
    await cleanup(owner, ids);
  }
});
