// Workstream B, Slice B8 — provenance coverage view smoke test.
//
// Asserts the RLS-honoring `report_provenance_coverage_v1` view reports
// evidence_edge_count = 1 / has_coverage = true for the report owner once
// a linkReportProvenance-style edge is written, and hides the row from
// unrelated signed-in parents (they see zero rows for that report_id).
//
// Run with:  node --test tests/evidence-report-provenance-coverage.test.mjs

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

test("report_provenance_coverage_v1 reflects owner edges and hides from others", async () => {
  const owner = client();
  const user = await signInParent(owner);

  const { data: student, error: sErr } = await owner
    .from("students")
    .insert({ owner_id: user.id, first_name: `CoverageB8_${Date.now()}`, last_name: "Auto" })
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
      payload: { note: "b8-coverage" },
    })
    .select("id")
    .single();
  assert.ok(!eErr, `evidence_item seed failed: ${eErr?.message}`);

  const { data: intake, error: iErr } = await owner
    .from("student_intakes")
    .insert({
      user_id: user.id,
      student_id: student.id,
      submitter_role: "family",
      student_first_name: "CoverageB8",
    })
    .select("id")
    .single();
  assert.ok(!iErr, `student_intake seed failed: ${iErr?.message}`);

  const { data: report, error: rErr } = await owner
    .from("pathway_reports")
    .insert({
      user_id: user.id,
      student_id: student.id,
      intake_id: intake.id,
      model: "test-fixture",
      content: { summary: "coverage" },
    })
    .select("id")
    .single();
  assert.ok(!rErr, `pathway_report seed failed: ${rErr?.message}`);

  try {
    // Before any edge: owner sees a coverage row with count 0.
    const { data: preRow, error: preErr } = await owner
      .from("report_provenance_coverage_v1")
      .select("report_id, evidence_edge_count, has_coverage")
      .eq("report_id", report.id)
      .maybeSingle();
    assert.ok(!preErr, `pre-edge coverage read failed: ${preErr?.message}`);
    assert.equal(preRow?.report_id, report.id);
    assert.equal(preRow?.evidence_edge_count, 0);
    assert.equal(preRow?.has_coverage, false);

    // Mirror linkReportProvenance upsert (idempotent).
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

    // After edge: owner sees count 1 / has_coverage true.
    const { data: postRow, error: postErr } = await owner
      .from("report_provenance_coverage_v1")
      .select("evidence_edge_count, has_coverage")
      .eq("report_id", report.id)
      .maybeSingle();
    assert.ok(!postErr, `post-edge coverage read failed: ${postErr?.message}`);
    assert.equal(postRow?.evidence_edge_count, 1);
    assert.equal(postRow?.has_coverage, true);

    // Unrelated signed-in parent sees zero rows for this report id.
    const otherEmail = `qa.parent.b8.${Date.now()}@transitionforward.test`;
    const other = client();
    const { error: suErr } = await other.auth.signUp({
      email: otherEmail,
      password: QA_PARENT_PASSWORD,
    });
    assert.ok(!suErr, `sign-up failed: ${suErr?.message}`);
    const { data: otherRows, error: otherErr } = await other
      .from("report_provenance_coverage_v1")
      .select("report_id")
      .eq("report_id", report.id);
    assert.ok(!otherErr, `unrelated coverage read errored: ${otherErr?.message}`);
    assert.equal(otherRows?.length ?? 0, 0, "unrelated user must not see coverage row");

    // Anon sees zero rows too.
    const anon = client();
    const { data: anonRows } = await anon
      .from("report_provenance_coverage_v1")
      .select("report_id")
      .eq("report_id", report.id);
    assert.equal(anonRows?.length ?? 0, 0, "anon must not see coverage row");
  } finally {
    await owner.from("evidence_edges").delete().eq("to_id", report.id);
    await owner.from("evidence_items").delete().eq("id", ei.id);
    await owner.from("pathway_reports").delete().eq("id", report.id);
    await owner.from("students").delete().eq("id", student.id);
  }
});
