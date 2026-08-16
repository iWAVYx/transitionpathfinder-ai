// Regression test: student_relationships RLS consent-bypass guards.
//
// Fix: supabase/migrations/20260710233005_*.sql tightened the INSERT and
// UPDATE policies on public.student_relationships so an editor cannot:
//   (a) INSERT a row for themselves (self-invite), or
//   (b) INSERT a row already flagged consent_status='approved', or
//   (c) UPDATE an existing pending row to consent_status='approved' for
//       another user.
// Only the related_user themselves may flip consent_status to 'approved'.
//
// This test seeds a student owned by qa.parent (the editor) and a target
// related user (qa.educator) and probes the four attack shapes plus the
// legitimate self-approval happy-path.
//
// Run with:  node --test tests/student-relationships-consent-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = process.env.STAGING_E2E_PASSWORD;
assert.ok(
  PASSWORD,
  "STAGING_E2E_PASSWORD is required for fixed staging identities",
);
const EDITOR_EMAIL = "qa.parent@transitionforward.test";
const RELATED_EMAIL = "qa.educator@transitionforward.test";

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

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

async function setupFixture() {
  const { client: ownerClient, user: owner } = await getSession(EDITOR_EMAIL);
  const { data: student, error: sErr } = await ownerClient
    .from("students")
    .insert({ owner_id: owner.id, first_name: `ConsentRLS_${Date.now()}`, last_name: "Auto" })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);
  const { user: related } = await getSession(RELATED_EMAIL);
  return { ownerClient, owner, studentId: student.id, relatedId: related.id };
}

async function teardown({ ownerClient, studentId }) {
  if (studentId) await ownerClient.from("students").delete().eq("id", studentId);
}

function assertRlsDenied(res, label) {
  if (res.error) {
    const code = res.error.code ?? "";
    assert.notEqual(
      code,
      "23514",
      `${label}: fixture violated a CHECK constraint instead of exercising RLS: ${res.error.message}`,
    );
    assert.ok(
      code === "42501" || code.startsWith("PGRST") || /policy|permission|denied/i.test(res.error.message),
      `${label}: expected RLS denial, got ${code} ${res.error.message}`,
    );
    return;
  }
  assert.equal(
    Array.isArray(res.data) ? res.data.length : 0,
    0,
    `${label}: expected zero rows affected, got ${JSON.stringify(res.data)}`,
  );
}

// ---------- INSERT guards ----------

test("editor cannot INSERT student_relationship with consent_status='approved'", async () => {
  const fx = await setupFixture();
  try {
    const res = await fx.ownerClient
      .from("student_relationships")
      .insert({
        student_id: fx.studentId,
        related_user_id: fx.relatedId,
        relationship_type: "educator_case_manager",
        permission_level: "collaborate",
        consent_status: "approved", // <-- forbidden by WITH CHECK
      })
      .select("id");
    assertRlsDenied(res, "insert-with-approved");
  } finally {
    await teardown(fx);
  }
});

test("editor cannot INSERT student_relationship with related_user_id = self", async () => {
  const fx = await setupFixture();
  try {
    const res = await fx.ownerClient
      .from("student_relationships")
      .insert({
        student_id: fx.studentId,
        related_user_id: fx.owner.id, // <-- self-invite forbidden
        relationship_type: "parent_guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id");
    assertRlsDenied(res, "insert-self-invite");
  } finally {
    await teardown(fx);
  }
});

test("editor CAN INSERT a legitimate pending invite for a different user", async () => {
  const fx = await setupFixture();
  try {
    const { data, error } = await fx.ownerClient
      .from("student_relationships")
      .insert({
        student_id: fx.studentId,
        related_user_id: fx.relatedId,
        relationship_type: "educator_case_manager",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id, consent_status")
      .single();
    assert.ok(!error, `expected allow, got ${error?.code} ${error?.message}`);
    assert.equal(data.consent_status, "pending");
  } finally {
    await teardown(fx);
  }
});

// ---------- UPDATE guards ----------

test("editor cannot UPDATE consent_status to 'approved' on another user's pending row", async () => {
  const fx = await setupFixture();
  try {
    const { data: inserted, error: insErr } = await fx.ownerClient
      .from("student_relationships")
      .insert({
        student_id: fx.studentId,
        related_user_id: fx.relatedId,
        relationship_type: "educator_case_manager",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id")
      .single();
    assert.ok(!insErr, `seed insert failed: ${insErr?.message}`);

    // Editor (owner) attempts to approve on the related user's behalf.
    const attack = await fx.ownerClient
      .from("student_relationships")
      .update({ consent_status: "approved" })
      .eq("id", inserted.id)
      .select("id");
    assertRlsDenied(attack, "editor-self-approve");

    // Owner reread confirms status is still pending.
    const { data: after } = await fx.ownerClient
      .from("student_relationships")
      .select("consent_status")
      .eq("id", inserted.id)
      .single();
    assert.equal(after.consent_status, "pending", "consent must remain pending");
  } finally {
    await teardown(fx);
  }
});

test("related user CAN approve their own pending consent row", async () => {
  const fx = await setupFixture();
  try {
    const { data: inserted } = await fx.ownerClient
      .from("student_relationships")
      .insert({
        student_id: fx.studentId,
        related_user_id: fx.relatedId,
        relationship_type: "educator_case_manager",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id")
      .single();

    const { client: relatedClient } = await getSession(RELATED_EMAIL);
    const res = await relatedClient
      .from("student_relationships")
      .update({ consent_status: "approved" })
      .eq("id", inserted.id)
      .select("id, consent_status");
    assert.ok(!res.error, `related self-approve failed: ${res.error?.message}`);
    assert.equal(res.data?.[0]?.consent_status, "approved");
  } finally {
    await teardown(fx);
  }
});
