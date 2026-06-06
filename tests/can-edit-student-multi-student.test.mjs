// Regression test: can_edit_student boundaries when a single user has
// access to MULTIPLE students with DIFFERENT permission levels per student.
//
// The function is evaluated per (user_id, student_id) pair. A regression
// that accidentally collapsed the scope — e.g. caching "user X can edit"
// globally, or letting editor access on student A satisfy a policy check
// against student B's row — would silently leak edit rights across the
// roster. These tests pin the per-student scoping.
//
// Probed surface: public.goals (UPDATE/DELETE policies = can_edit_student).
//
// Run with:  node --test tests/can-edit-student-multi-student.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = "TestPass!2026";
const ACCOUNTS = {
  ownerA: "qa.parent@transitionforward.test",       // owns student A in these tests
  ownerB: "qa.guardian@transitionforward.test",     // owns student B in these tests
  multi: "qa.educator@transitionforward.test",      // the user under test
  stranger: "qa.partner@transitionforward.test",
};

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Pooled sessions to stay under the password-grant rate limit.
const SESSION_POOL = new Map();
async function getSession(email) {
  if (SESSION_POOL.has(email)) return SESSION_POOL.get(email);
  const client = freshClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ok(!error, `sign-in for ${email} failed: ${error?.message}`);
  const session = { client, user: data.user };
  SESSION_POOL.set(email, session);
  return session;
}

async function seedStudent(ownerEmail, label) {
  const { client, user } = await getSession(ownerEmail);
  const { data: student, error: sErr } = await client
    .from("students")
    .insert({
      owner_id: user.id,
      first_name: `MultiStu_${label}_${Date.now()}`,
      last_name: "Auto",
    })
    .select("id")
    .single();
  assert.ok(!sErr, `student ${label} seed failed: ${sErr?.message}`);

  const { data: goal, error: gErr } = await client
    .from("goals")
    .insert({
      student_id: student.id,
      created_by: user.id,
      title: `baseline-${label}`,
      category: "general",
    })
    .select("id")
    .single();
  assert.ok(!gErr, `goal ${label} seed failed: ${gErr?.message}`);

  return { ownerClient: client, ownerId: user.id, studentId: student.id, goalId: goal.id };
}

async function addCollaborator({ ownerClient, ownerId, studentId }, email, role, status) {
  const { user } = await getSession(email);
  const { error } = await ownerClient.from("student_collaborators").insert({
    student_id: studentId,
    user_id: user.id,
    invited_email: email,
    role,
    status,
    invited_by: ownerId,
  });
  assert.ok(!error, `collab seed (${email}, ${role}/${status}) failed: ${error?.message}`);
}

async function teardown(...fixtures) {
  for (const fx of fixtures) {
    if (fx?.studentId) {
      await fx.ownerClient.from("students").delete().eq("id", fx.studentId);
    }
  }
}

// Try to update the seeded goal as `email`; verify outcome by re-reading via
// the goal's owner (RLS-bypass-free, but the owner can always see their row).
async function probeUpdate({ email, fx }) {
  const { client: probe } = await getSession(email);
  const marker = `mut-${email}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const writeResult = await probe
    .from("goals")
    .update({ title: marker })
    .eq("id", fx.goalId)
    .select("id");
  const { data: after, error: readErr } = await fx.ownerClient
    .from("goals")
    .select("title")
    .eq("id", fx.goalId)
    .single();
  assert.ok(!readErr, `owner reread failed: ${readErr?.message}`);
  return {
    writeError: writeResult.error,
    rowsReturned: Array.isArray(writeResult.data) ? writeResult.data.length : 0,
    appliedTitle: after.title,
    marker,
  };
}

function assertAllowed(result, label) {
  assert.ok(!result.writeError, `${label}: expected ALLOW, got error ${result.writeError?.message}`);
  assert.equal(result.rowsReturned, 1, `${label}: ALLOW should return one row`);
  assert.equal(result.appliedTitle, result.marker, `${label}: ALLOW should persist marker`);
}

function assertDenied(result, label) {
  assert.equal(result.rowsReturned, 0, `${label}: DENY should affect zero rows`);
  assert.notEqual(result.appliedTitle, result.marker, `${label}: DENY must not persist marker`);
}

test("editor on A + viewer on B: can edit A's goal, NOT B's goal", async () => {
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");
    await addCollaborator(studentB, ACCOUNTS.multi, "viewer", "accepted");

    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A (editor)");
    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B (viewer-only)");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("owner of A + viewer on B: can edit A, NOT B", async () => {
  // Ownership on one student must not bleed into edit rights on another.
  const studentA = await seedStudent(ACCOUNTS.multi, "A-owned-by-multi");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentB, ACCOUNTS.multi, "viewer", "accepted");

    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A (owner)");
    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B (viewer-only)");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("editor on A, no relation to B: can edit A, cannot edit or even read B", async () => {
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");

    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A (editor)");
    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B (no access)");

    // And SELECT on B must also be filtered out — no leak via can_access_student.
    const { client: probe } = await getSession(ACCOUNTS.multi);
    const { data: visible } = await probe
      .from("goals")
      .select("id")
      .eq("id", studentB.goalId);
    assert.equal(visible?.length ?? 0, 0, "B's goal must be invisible to a non-collaborator");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("editor on A + pending editor on B: can edit A, NOT B (pending ≠ accepted)", async () => {
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");
    await addCollaborator(studentB, ACCOUNTS.multi, "editor", "pending");

    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A (accepted editor)");
    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B (pending editor)");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("downgrade on A does NOT affect editor rights on B", async () => {
  // Per-student scoping must work in both directions: changing one student's
  // collaborator row must not touch the other student's grant.
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");
    await addCollaborator(studentB, ACCOUNTS.multi, "editor", "accepted");

    // Baseline: both allowed.
    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A baseline");
    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B baseline");

    // Downgrade only on A.
    const { error: downErr } = await studentA.ownerClient
      .from("student_collaborators")
      .update({ role: "viewer" })
      .eq("student_id", studentA.studentId)
      .eq("invited_email", ACCOUNTS.multi);
    assert.ok(!downErr, `downgrade failed: ${downErr?.message}`);

    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A after downgrade");
    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B still editor");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("revoking access on A does NOT affect editor rights on B", async () => {
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");
    await addCollaborator(studentB, ACCOUNTS.multi, "editor", "accepted");

    // Revoke A only.
    const { error: revokeErr } = await studentA.ownerClient
      .from("student_collaborators")
      .delete()
      .eq("student_id", studentA.studentId)
      .eq("invited_email", ACCOUNTS.multi);
    assert.ok(!revokeErr, `revoke failed: ${revokeErr?.message}`);

    assertDenied(await probeUpdate({ email: ACCOUNTS.multi, fx: studentA }), "A after revoke");
    assertAllowed(await probeUpdate({ email: ACCOUNTS.multi, fx: studentB }), "B unaffected");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("editor on A cannot DELETE B's goal even when A and B share the same user", async () => {
  // Same scope check, but on DELETE. The UPDATE and DELETE policies on goals
  // both wrap can_edit_student; per-student scoping must hold for both.
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    await addCollaborator(studentA, ACCOUNTS.multi, "editor", "accepted");
    await addCollaborator(studentB, ACCOUNTS.multi, "viewer", "accepted");

    const { client: probe } = await getSession(ACCOUNTS.multi);

    // DELETE B's goal — should be DENIED (zero rows, still present).
    const delB = await probe.from("goals").delete().eq("id", studentB.goalId).select("id");
    assert.equal(delB.data?.length ?? 0, 0, "DENY: viewer must not delete B's goal");
    const { data: stillB } = await studentB.ownerClient
      .from("goals").select("id").eq("id", studentB.goalId).maybeSingle();
    assert.ok(stillB, "B's goal must still exist after denied delete");

    // DELETE A's goal — should be ALLOWED.
    const delA = await probe.from("goals").delete().eq("id", studentA.goalId).select("id");
    assert.ok(!delA.error, `ALLOW delete on A errored: ${delA.error?.message}`);
    assert.equal(delA.data?.length, 1, "ALLOW: editor should delete A's goal");
    const { data: goneA } = await studentA.ownerClient
      .from("goals").select("id").eq("id", studentA.goalId).maybeSingle();
    assert.equal(goneA, null, "A's goal should be gone after allowed delete");
  } finally {
    await teardown(studentA, studentB);
  }
});

test("stranger with no relation to either student cannot edit A or B", async () => {
  // Sanity baseline alongside the multi-grant matrix.
  const studentA = await seedStudent(ACCOUNTS.ownerA, "A");
  const studentB = await seedStudent(ACCOUNTS.ownerB, "B");
  try {
    assertDenied(await probeUpdate({ email: ACCOUNTS.stranger, fx: studentA }), "A (stranger)");
    assertDenied(await probeUpdate({ email: ACCOUNTS.stranger, fx: studentB }), "B (stranger)");
  } finally {
    await teardown(studentA, studentB);
  }
});
