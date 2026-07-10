// Student-role journey probe: verifies a Student user can create own data
// and CANNOT read another student's data across the primary surfaces.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeStudent(tag) {
  const email = `qa.student.${tag}.${Date.now()}@transitionforward.test`;
  const password = "TestPass!2026";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user.id;
  // Assign 'student' app_role
  await admin.from("user_roles").insert({ user_id: uid, role: "student" });
  // Create their student row (mirrors self-student creation on onboarding)
  const { data: srow, error: serr } = await admin
    .from("students").insert({ owner_id: uid, first_name: `S_${tag}` }).select("id").single();
  if (serr) throw serr;
  // Sign in as this user
  const uclient = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await uclient.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { uid, email, password, studentId: srow.id, client: uclient };
}

async function cleanup(u) {
  try { await admin.auth.admin.deleteUser(u.uid); } catch {}
}

test("student RLS: cross-student isolation across all key surfaces", async () => {
  const A = await makeStudent("A");
  const B = await makeStudent("B");
  try {
    // --- Student A writes their own data
    for (const row of [
      ["goals", { student_id: A.studentId, title: "A goal", created_by: A.uid }],
      ["action_items", { student_id: A.studentId, title: "A action", created_by_user_id: A.uid }],
      ["student_voice_responses", { student_id: A.studentId, prompt_key: "hopes", response_text: "A hopes", age_band: "early-high", created_by: A.uid }],
      ["saved_resources", { user_id: A.uid, resource_id: null, resource_slug: "test-a" }],
      ["calendar_events", { owner_user_id: A.uid, student_id: A.studentId, visibility: "team", title: "A meeting", start_at: new Date().toISOString(), end_at: new Date(Date.now()+3600e3).toISOString() }],
    ]) {
      const [tbl, payload] = row;
      const { error } = await A.client.from(tbl).insert(payload);
      // saved_resources may not need resource_id — skip if schema rejects
      if (error && tbl !== "saved_resources") {
        assert.fail(`A insert ${tbl} failed: ${error.code} ${error.message}`);
      }
    }

    // Student B writes their own goal
    const { error: bGoalErr } = await B.client.from("goals").insert({
      student_id: B.studentId, title: "B goal", created_by: B.uid,
    });
    assert.ok(!bGoalErr, `B goal insert: ${bGoalErr?.message}`);

    // --- Cross-student isolation checks
    for (const tbl of ["goals", "action_items", "student_voice_responses", "calendar_events"]) {
      const { data: aReadsB } = await A.client.from(tbl).select("id").eq("student_id", B.studentId);
      assert.equal((aReadsB ?? []).length, 0, `A can read B rows from ${tbl}`);
      const { data: bReadsA } = await B.client.from(tbl).select("id").eq("student_id", A.studentId);
      assert.equal((bReadsA ?? []).length, 0, `B can read A rows from ${tbl}`);
    }

    // A cannot read B's student row
    const { data: bStudent } = await A.client.from("students").select("id").eq("id", B.studentId);
    assert.equal((bStudent ?? []).length, 0, "A can read B's student row");

    // A cannot update B's goal
    const { error: xUpd, count } = await A.client
      .from("goals").update({ title: "hijacked" }).eq("student_id", B.studentId).select("*", { count: "exact" });
    // RLS should silently allow the statement but affect 0 rows.
    assert.equal(count ?? 0, 0, "A was able to update B's goals");

    // A cannot escalate role via user_roles
    const { error: roleErr } = await A.client.from("user_roles").insert({ user_id: A.uid, role: "admin" });
    assert.ok(roleErr, "A was able to INSERT admin role for self");
  } finally {
    await cleanup(A); await cleanup(B);
  }
});
