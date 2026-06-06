// Regression test: can_edit_student boundaries across access states and roles.
//
// can_edit_student(uid, student_id) returns TRUE iff:
//   (a) uid owns the student, OR
//   (b) uid is an accepted collaborator with role='editor', OR
//   (c) uid has app_role 'admin'
//
// Many tables gate UPDATE/DELETE on this function. A regression that loosens
// any branch — e.g. dropping the status='accepted' check, treating viewers as
// editors, or letting non-collaborators slip through — would silently let the
// wrong people mutate student data. We probe the canonical surface (public.goals,
// whose UPDATE policy is exactly `can_edit_student(auth.uid(), student_id)`)
// from every relevant identity and assert the matrix holds.
//
// Run with:  node --test tests/can-edit-student-boundaries.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const PASSWORD = "TestPass!2026";
const ACCOUNTS = {
  owner: "qa.parent@transitionforward.test",
  editor: "qa.educator@transitionforward.test",
  viewer: "qa.guardian@transitionforward.test",
  pendingEditor: "qa.casemanager@transitionforward.test",
  stranger: "qa.partner@transitionforward.test",
  admin: "qa.platformadmin@transitionforward.test",
};

function freshClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(client, email) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  assert.ok(!error, `sign-in for ${email} failed: ${error?.message}`);
  return data.user;
}

// Set up a fresh student owned by qa.parent and seed every collaborator state
// + one goal that every prober will try to update.
async function setupFixture() {
  const ownerClient = freshClient();
  const owner = await signIn(ownerClient, ACCOUNTS.owner);

  const { data: student, error: sErr } = await ownerClient
    .from("students")
    .insert({ owner_id: owner.id, first_name: `EditBoundary_${Date.now()}`, last_name: "Auto" })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  // Resolve collaborator user ids (they all share the test password).
  const ids = {};
  for (const key of ["editor", "viewer", "pendingEditor"]) {
    const c = freshClient();
    const u = await signIn(c, ACCOUNTS[key]);
    ids[key] = u.id;
    await c.auth.signOut();
  }

  // Owner inserts collaborator rows directly with user_id + status pre-set
  // (INSERT policy "Editors invite collaborators" allows this; owner has edit
  // access and is the inviter).
  const collabRows = [
    {
      student_id: student.id,
      user_id: ids.editor,
      invited_email: ACCOUNTS.editor,
      role: "editor",
      status: "accepted",
      invited_by: owner.id,
    },
    {
      student_id: student.id,
      user_id: ids.viewer,
      invited_email: ACCOUNTS.viewer,
      role: "viewer",
      status: "accepted",
      invited_by: owner.id,
    },
    {
      student_id: student.id,
      user_id: ids.pendingEditor,
      invited_email: ACCOUNTS.pendingEditor,
      role: "editor",
      status: "pending",
      invited_by: owner.id,
    },
  ];
  const { error: cErr } = await ownerClient.from("student_collaborators").insert(collabRows);
  assert.ok(!cErr, `collaborator seed failed: ${cErr?.message}`);

  const { data: goal, error: gErr } = await ownerClient
    .from("goals")
    .insert({
      student_id: student.id,
      created_by: owner.id,
      title: "baseline",
      category: "general",
    })
    .select("id")
    .single();
  assert.ok(!gErr, `goal seed failed: ${gErr?.message}`);

  return { ownerClient, owner, studentId: student.id, goalId: goal.id };
}

async function teardown({ ownerClient, studentId }) {
  // students CASCADE → collaborators, goals, etc. go with it.
  if (studentId) await ownerClient.from("students").delete().eq("id", studentId);
  await ownerClient.auth.signOut();
}

// Attempts to update the seeded goal as `email`, and reports whether the
// update actually took effect (using a fresh owner read to bypass the
// prober's own RLS view, which can hide the row regardless of the write
// result).
async function probeUpdate({ email, goalId, ownerClient }) {
  const probe = freshClient();
  await signIn(probe, email);
  const marker = `mut-${email}-${Date.now()}`;
  const writeResult = await probe
    .from("goals")
    .update({ title: marker })
    .eq("id", goalId)
    .select("id");
  await probe.auth.signOut();

  const { data: after, error: readErr } = await ownerClient
    .from("goals")
    .select("title")
    .eq("id", goalId)
    .single();
  assert.ok(!readErr, `owner reread failed: ${readErr?.message}`);

  return {
    writeError: writeResult.error,
    rowsReturned: Array.isArray(writeResult.data) ? writeResult.data.length : 0,
    appliedTitle: after.title,
    marker,
  };
}

function assertAllowed(result) {
  assert.ok(
    !result.writeError,
    `expected ALLOW but got error: ${result.writeError?.message}`,
  );
  assert.equal(result.rowsReturned, 1, "ALLOW should return the updated row");
  assert.equal(
    result.appliedTitle,
    result.marker,
    "ALLOW should have persisted the marker",
  );
}

function assertDenied(result) {
  // RLS denial manifests as zero affected rows (USING filters the row out)
  // and the persisted title must NOT match the prober's marker.
  assert.equal(result.rowsReturned, 0, "DENY should affect zero rows");
  assert.notEqual(
    result.appliedTitle,
    result.marker,
    "DENY must not persist the prober's marker",
  );
}

test("owner can update goals on their own student", async () => {
  const fx = await setupFixture();
  try {
    assertAllowed(await probeUpdate({ ...fx, email: ACCOUNTS.owner }));
  } finally {
    await teardown(fx);
  }
});

test("accepted editor collaborator can update goals", async () => {
  const fx = await setupFixture();
  try {
    assertAllowed(await probeUpdate({ ...fx, email: ACCOUNTS.editor }));
  } finally {
    await teardown(fx);
  }
});

test("accepted viewer collaborator CANNOT update goals (read access ≠ edit)", async () => {
  const fx = await setupFixture();
  try {
    assertDenied(await probeUpdate({ ...fx, email: ACCOUNTS.viewer }));
  } finally {
    await teardown(fx);
  }
});

test("pending editor collaborator CANNOT update goals (status must be 'accepted')", async () => {
  const fx = await setupFixture();
  try {
    assertDenied(await probeUpdate({ ...fx, email: ACCOUNTS.pendingEditor }));
  } finally {
    await teardown(fx);
  }
});

test("unrelated authenticated user CANNOT update goals on a student they don't know", async () => {
  const fx = await setupFixture();
  try {
    assertDenied(await probeUpdate({ ...fx, email: ACCOUNTS.stranger }));
  } finally {
    await teardown(fx);
  }
});

test("platform admin (app_role 'admin') can update goals on any student", async () => {
  const fx = await setupFixture();
  try {
    assertAllowed(await probeUpdate({ ...fx, email: ACCOUNTS.admin }));
  } finally {
    await teardown(fx);
  }
});

test("revoked editor (collaborator row deleted) loses update access immediately", async () => {
  const fx = await setupFixture();
  try {
    // Editor starts allowed.
    assertAllowed(await probeUpdate({ ...fx, email: ACCOUNTS.editor }));

    // Owner revokes by deleting the collaborator row.
    const { error: revokeErr } = await fx.ownerClient
      .from("student_collaborators")
      .delete()
      .eq("student_id", fx.studentId)
      .eq("invited_email", ACCOUNTS.editor);
    assert.ok(!revokeErr, `revoke failed: ${revokeErr?.message}`);

    assertDenied(await probeUpdate({ ...fx, email: ACCOUNTS.editor }));
  } finally {
    await teardown(fx);
  }
});

test("downgraded editor (role flipped to 'viewer') loses update access", async () => {
  const fx = await setupFixture();
  try {
    const { error: downgradeErr } = await fx.ownerClient
      .from("student_collaborators")
      .update({ role: "viewer" })
      .eq("student_id", fx.studentId)
      .eq("invited_email", ACCOUNTS.editor);
    assert.ok(!downgradeErr, `downgrade failed: ${downgradeErr?.message}`);

    assertDenied(await probeUpdate({ ...fx, email: ACCOUNTS.editor }));
  } finally {
    await teardown(fx);
  }
});

test("DELETE on goals follows the same can_edit_student matrix as UPDATE", async () => {
  // Cross-check that the boundary applies to DELETE too, not just UPDATE —
  // both policies wrap can_edit_student and must agree.
  const cases = [
    { email: ACCOUNTS.viewer, expect: "deny" },
    { email: ACCOUNTS.stranger, expect: "deny" },
    { email: ACCOUNTS.pendingEditor, expect: "deny" },
    { email: ACCOUNTS.editor, expect: "allow" },
  ];

  for (const c of cases) {
    const fx = await setupFixture();
    try {
      const probe = freshClient();
      await signIn(probe, c.email);
      const del = await probe.from("goals").delete().eq("id", fx.goalId).select("id");
      await probe.auth.signOut();

      const { data: still } = await fx.ownerClient
        .from("goals")
        .select("id")
        .eq("id", fx.goalId)
        .maybeSingle();

      if (c.expect === "allow") {
        assert.ok(!del.error, `${c.email} ALLOW delete errored: ${del.error?.message}`);
        assert.equal(del.data?.length, 1, `${c.email} ALLOW should delete one row`);
        assert.equal(still, null, `${c.email} ALLOW: row should be gone`);
      } else {
        assert.equal(del.data?.length ?? 0, 0, `${c.email} DENY should delete zero rows`);
        assert.ok(still, `${c.email} DENY: row must still exist`);
      }
    } finally {
      await teardown(fx);
    }
  }
});
