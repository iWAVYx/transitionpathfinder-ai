// Educator/Case-Manager journey probe: verifies an educator granted
// collaborator access to Student A can read/write assigned surfaces and
// CANNOT read/write unrelated Student B, escalate roles, or reach
// admin/partner-only tables.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeUser(kind, tag, role) {
  const email = `qa.${kind}.${tag}.${Date.now()}@transitionforward.test`;
  const password = "TestPass!2026";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("user_roles").insert({ user_id: uid, role });
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { uid, email, password, client };
}

async function makeStudentOwner(tag) {
  const owner = await makeUser("parent", tag, "parent");
  const { data: srow, error } = await admin
    .from("students").insert({ owner_id: owner.uid, first_name: `S_${tag}` })
    .select("id").single();
  if (error) throw error;
  return { ...owner, studentId: srow.id };
}

async function cleanup(u) { try { await admin.auth.admin.deleteUser(u.uid); } catch {} }

test("educator RLS: access limited to assigned students; no admin/role escalation", async () => {
  const educator = await makeUser("educator", "E", "case_manager");
  const A = await makeStudentOwner("A"); // assigned to educator
  const B = await makeStudentOwner("B"); // NOT assigned
  try {
    // Owner A invites educator as accepted editor collaborator (bypass invite
    // flow via service role — mirrors what the accept-invitation path does).
    const { error: collabErr } = await admin.from("student_collaborators").insert({
      student_id: A.studentId,
      user_id: educator.uid,
      invited_email: educator.email,
      role: "editor",
      status: "accepted",
      invited_by: A.uid,
    });
    assert.ok(!collabErr, `collab insert: ${collabErr?.message}`);

    // Educator can SELECT student A
    const { data: aRow } = await educator.client.from("students").select("id").eq("id", A.studentId);
    assert.equal(aRow?.length, 1, "educator cannot read assigned student A");

    // Educator CANNOT SELECT student B
    const { data: bRow } = await educator.client.from("students").select("id").eq("id", B.studentId);
    assert.equal(bRow?.length ?? 0, 0, "educator can read unassigned student B");

    // Educator can INSERT notes, action items, goals, readiness for A
    const writes = [
      ["collaboration_notes", { student_id: A.studentId, created_by_user_id: educator.uid, note_type: "teacher_note", visibility: "team", content: "Progress note" }],
      ["action_items", { student_id: A.studentId, title: "Follow up", created_by_user_id: educator.uid }],
      ["goals", { student_id: A.studentId, title: "Goal from educator", created_by: educator.uid }],
      ["readiness_scores", { student_id: A.studentId, category: "self_advocacy", score: 60, updated_by_user_id: educator.uid }],
    ];
    for (const [tbl, payload] of writes) {
      const { error } = await educator.client.from(tbl).insert(payload);
      assert.ok(!error, `educator insert into ${tbl} for A failed: ${error?.code} ${error?.message}`);
    }

    // Educator CANNOT INSERT for student B on any of these surfaces
    for (const [tbl, payload] of writes) {
      const p = { ...payload, student_id: B.studentId };
      const { error } = await educator.client.from(tbl).insert(p);
      assert.ok(error, `educator wrongly inserted into ${tbl} for unassigned B`);
    }

    // Educator CANNOT read B's notes/actions/goals/readiness
    for (const tbl of ["collaboration_notes", "action_items", "goals", "readiness_scores"]) {
      // seed one row on B as owner
      await admin.from(tbl).insert(
        tbl === "collaboration_notes"
          ? { student_id: B.studentId, created_by_user_id: B.uid, note_type: "general", visibility: "team", content: "B-only" }
        : tbl === "action_items"
          ? { student_id: B.studentId, title: "B action", created_by_user_id: B.uid }
        : tbl === "goals"
          ? { student_id: B.studentId, title: "B goal", created_by: B.uid }
          : { student_id: B.studentId, category: "self_advocacy", score: 50, updated_by_user_id: B.uid }
      );
      const { data } = await educator.client.from(tbl).select("id").eq("student_id", B.studentId);
      assert.equal(data?.length ?? 0, 0, `educator can read ${tbl} for unassigned B`);
    }

    // Educator CANNOT escalate role
    const { error: escErr } = await educator.client.from("user_roles").insert({ user_id: educator.uid, role: "admin" });
    assert.ok(escErr, "educator was able to insert admin role for self");

    // Educator CANNOT read admin_roles / partner_organizations / district-only surfaces
    for (const tbl of ["admin_roles", "partner_organizations", "access_entitlements"]) {
      const { data } = await educator.client.from(tbl).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `educator can read privileged table ${tbl}`);
    }
  } finally {
    await cleanup(educator); await cleanup(A); await cleanup(B);
  }
});
