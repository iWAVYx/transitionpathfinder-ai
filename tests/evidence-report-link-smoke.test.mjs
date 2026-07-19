// Workstream B, Slice B7 — live smoke: report link → provenance read.
//
// With EVIDENCE_GRAPH_WRITES=true, seed a student + evidence_item + pathway
// report, mirror the linkReportProvenance upsert (student's evidence → report
// id) and assert the RLS-honoring recommendation_provenance_v1 view returns
// the row for the owner and hides it from an unrelated signed-in parent.
//
// Run with:  node --test tests/evidence-report-link-smoke.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const QA_PARENT_EMAIL = "qa.parent@transitionforward.test";
const QA_PARENT_PASSWORD = "TestPass!2026";

function client() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signInParent(c, email = QA_PARENT_EMAIL) {
  const { data, error } = await c.auth.signInWithPassword({
    email,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `sign-in failed for ${email}: ${error?.message}`);
  return data.user;
}

test("report link emits provenance edges visible to owner, hidden from others", async () => {
  const owner = client();
  const user = await signInParent(owner);

  // 1. Seed student + evidence item
  const { data: student, error: sErr } = await owner
    .from("students")
    .insert({ owner_id: user.id, first_name: `SmokeB7_${Date.now()}`, last_name: "Auto" })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  const { data: ei, error: eErr } = await owner
    .from("evidence_items")
    .insert({
      student_id: student.id,
      kind: "manual_note",
      source_kind: "manual",
      contributor_id: user.id,
      verification_state: "unverified",
      permission_scope: "student_team",
      payload: { note: "b7-smoke" },
    })
    .select("id")
    .single();
  assert.ok(!eErr, `evidence_item seed failed: ${eErr?.message}`);

  // 2. Seed pathway_report owned by the parent
  const { data: report, error: rErr } = await owner
    .from("pathway_reports")
    .insert({
      user_id: user.id,
      student_id: student.id,
      submitter_role: "family",
      student_first_name: "SmokeB7",
      inputs_json: {},
      report_json: { summary: "smoke" },
    })
    .select("id")
    .single();
  assert.ok(!rErr, `pathway_report seed failed: ${rErr?.message}`);

  // 3. Mirror linkReportProvenance upsert (idempotent via unique index)
  const edgeRow = {
    from_type: "evidence_item",
    from_id: ei.id,
    to_type: "pathway_recommendation",
    to_id: report.id,
    relation: "supports",
    weight: 1,
    created_by: user.id,
  };
  for (let i = 0; i < 2; i += 1) {
    const { error: upErr } = await owner
      .from("evidence_edges")
      .upsert(edgeRow, {
        onConflict: "from_type,from_id,to_type,to_id,relation",
        ignoreDuplicates: true,
      });
    assert.ok(!upErr, `edge upsert #${i + 1} failed: ${upErr?.message}`);
  }

  try {
    // 4. Owner reads provenance view — should see exactly one row
    const { data: ownerRows, error: ovErr } = await owner
      .from("recommendation_provenance_v1")
      .select("recommendation_id, evidence_id, relation")
      .eq("recommendation_id", report.id);
    assert.ok(!ovErr, `owner provenance read failed: ${ovErr?.message}`);
    assert.equal(ownerRows?.length, 1, "owner should see one provenance row");
    assert.equal(ownerRows[0].evidence_id, ei.id);
    assert.equal(ownerRows[0].relation, "supports");

    // 5. Anon sees nothing
    const anon = client();
    const { data: anonRows } = await anon
      .from("recommendation_provenance_v1")
      .select("edge_id")
      .eq("recommendation_id", report.id);
    assert.equal(anonRows?.length ?? 0, 0, "anon must not see the row");

    // 6. Unrelated signed-in parent sees nothing
    const otherEmail = `qa.parent.b7.${Date.now()}@transitionforward.test`;
    const other = client();
    const { error: suErr } = await other.auth.signUp({
      email: otherEmail,
      password: QA_PARENT_PASSWORD,
    });
    assert.ok(!suErr, `sign-up failed: ${suErr?.message}`);
    const { data: otherRows } = await other
      .from("recommendation_provenance_v1")
      .select("edge_id")
      .eq("recommendation_id", report.id);
    assert.equal(otherRows?.length ?? 0, 0, "unrelated user must not see the row");
  } finally {
    await owner.from("evidence_edges").delete().eq("to_id", report.id);
    await owner.from("evidence_items").delete().eq("id", ei.id);
    await owner.from("pathway_reports").delete().eq("id", report.id);
    await owner.from("students").delete().eq("id", student.id);
  }
});
