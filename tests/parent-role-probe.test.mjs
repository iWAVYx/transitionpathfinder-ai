// Parent/Guardian journey probe: verifies a parent user who owns a student
// (and one added via student_relationships approved) can read/write family
// surfaces for their student, and CANNOT reach unrelated students, admin,
// partner, school, or district data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeUser(tag, role) {
  const email = `qa.parent.${tag}.${Date.now()}@transitionforward.test`;
  const password = "TestPass!2026";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("user_roles").insert({ user_id: uid, role });
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { uid, email, password, client };
}

async function cleanup(u) { try { await admin.auth.admin.deleteUser(u.uid); } catch {} }

test("parent RLS: owner + approved relationship access; cross-family isolation; no privilege escalation", async () => {
  const P = await makeUser("P", "parent");   // owns their own student
  const Q = await makeUser("Q", "guardian"); // owns another; unrelated
  const G = await makeUser("G", "parent");   // guardian added via relationship

  // Owner-created students (mirrors add-student onboarding flow)
  const { data: ps, error: psErr } = await admin.from("students")
    .insert({ owner_id: P.uid, first_name: "PKid" }).select("id").single();
  if (psErr) throw psErr;
  const { data: qs, error: qsErr } = await admin.from("students")
    .insert({ owner_id: Q.uid, first_name: "QKid" }).select("id").single();
  if (qsErr) throw qsErr;

  // G is added as an approved parent_guardian relationship on P's student
  await admin.from("student_relationships").insert({
    student_id: ps.id, related_user_id: G.uid,
    relationship_type: "parent_guardian",
    permission_level: "manage_documents",
    consent_status: "approved",
  });

  try {
    // --- Owner P: reads own student ---
    const { data: mineP } = await P.client.from("students").select("id").eq("id", ps.id);
    assert.equal(mineP?.length, 1, "parent P cannot read own student");

    // Parent P writes family surfaces on own student
    const pWrites = [
      ["consent_records", { student_id: ps.id, consenting_user_id: P.uid, consent_type: "ai_processing", consent_text_snapshot: "v1" }],
      ["sharing_permissions", { student_id: ps.id, shared_by_user_id: P.uid, shared_with_user_id: G.uid, access_level: "view_only" }],
      ["goals", { student_id: ps.id, title: "Family goal", created_by: P.uid }],
      ["action_items", { student_id: ps.id, title: "Family action", created_by_user_id: P.uid }],
      ["student_intakes", { user_id: P.uid, student_id: ps.id }],
    ];
    for (const [tbl, payload] of pWrites) {
      const { error } = await P.client.from(tbl).insert(payload);
      assert.ok(!error, `parent P insert ${tbl}: ${error?.code} ${error?.message}`);
    }

    // --- Approved relationship G reads P's student
    const { data: gSees } = await G.client.from("students").select("id").eq("id", ps.id);
    assert.equal(gSees?.length, 1, "approved relationship G cannot read shared student");

    // G with manage_documents can insert goals (permission_level maps in can_edit_student)
    const { error: gGoalErr } = await G.client.from("goals").insert({
      student_id: ps.id, title: "G-added goal", created_by: G.uid,
    });
    assert.ok(!gGoalErr, `approved manage_documents relationship cannot write goals: ${gGoalErr?.message}`);

    // --- Cross-family isolation: P cannot read/write Q's student
    const { data: qFromP } = await P.client.from("students").select("id").eq("id", qs.id);
    assert.equal(qFromP?.length ?? 0, 0, "parent P can read unrelated student Q");

    // Seed rows on Q's student so we know the tables are non-empty
    await admin.from("consent_records").insert({
      student_id: qs.id, consenting_user_id: Q.uid, consent_type: "ai_processing", consent_text_snapshot: "v1",
    });
    await admin.from("goals").insert({ student_id: qs.id, title: "Q goal", created_by: Q.uid });
    await admin.from("action_items").insert({ student_id: qs.id, title: "Q action", created_by_user_id: Q.uid });
    await admin.from("sharing_permissions").insert({
      student_id: qs.id, shared_by_user_id: Q.uid, shared_with_user_id: Q.uid, access_level: "view_only",
    });

    for (const tbl of ["consent_records", "goals", "action_items", "sharing_permissions"]) {
      const { data } = await P.client.from(tbl).select("id").eq("student_id", qs.id);
      assert.equal(data?.length ?? 0, 0, `parent P can read ${tbl} for unrelated student Q`);
    }

    // P cannot INSERT for Q's student on any of these
    const crossInserts = [
      ["consent_records", { student_id: qs.id, consenting_user_id: P.uid, consent_type: "ai_processing", consent_text_snapshot: "v1" }],
      ["goals", { student_id: qs.id, title: "hijack", created_by: P.uid }],
      ["action_items", { student_id: qs.id, title: "hijack", created_by_user_id: P.uid }],
      ["sharing_permissions", { student_id: qs.id, shared_by_user_id: P.uid, shared_with_user_id: P.uid, access_level: "admin" }],
    ];
    for (const [tbl, payload] of crossInserts) {
      const { error } = await P.client.from(tbl).insert(payload);
      assert.ok(error, `parent P wrongly inserted ${tbl} for unrelated Q`);
    }

    // --- Role escalation blocked
    const { error: escErr } = await P.client.from("user_roles").insert({ user_id: P.uid, role: "admin" });
    assert.ok(escErr, "parent P was able to insert admin role for self");

    // --- Parent cannot read admin / partner / district surfaces
    for (const tbl of ["admin_roles", "partner_organizations", "access_entitlements"]) {
      const { data } = await P.client.from(tbl).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `parent can read privileged table ${tbl}`);
    }
  } finally {
    await cleanup(P); await cleanup(Q); await cleanup(G);
  }
});
