// Regression test: collaboration_notes UPDATE/DELETE require can_edit_student.
//
// Guards against a regression where the previous "Update own notes" /
// "Delete own notes" policies only checked authorship (created_by_user_id =
// auth.uid()), allowing a collaborator who later lost edit access — or any
// signed-out caller spoofing the author id — to still mutate the row.
//
// Policies under test:
//   - "Update own notes with edit access"
//   - "Delete own notes with edit access"
// Both require: created_by_user_id = auth.uid() AND can_edit_student(auth.uid(), student_id)
//
// Run with:  node --test tests/collaboration-notes-edit-rls.test.mjs

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

async function signInParent(client) {
  const { data, error } = await client.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `parent sign-in failed: ${error?.message}`);
  return data.user;
}

async function seedStudentAndNote(client, user) {
  const { data: student, error: sErr } = await client
    .from("students")
    .insert({
      owner_id: user.id,
      first_name: `NoteRLS_${Date.now()}`,
      last_name: "Auto",
    })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  const { data: note, error: nErr } = await client
    .from("collaboration_notes")
    .insert({
      student_id: student.id,
      created_by_user_id: user.id,
      content: "initial",
      note_type: "general",
      visibility: "team",
    })
    .select("id")
    .single();
  assert.ok(!nErr, `note seed failed: ${nErr?.message}`);

  return { studentId: student.id, noteId: note.id };
}

async function cleanup(client, ids) {
  if (ids?.noteId) await client.from("collaboration_notes").delete().eq("id", ids.noteId);
  if (ids?.studentId) await client.from("students").delete().eq("id", ids.studentId);
}

test("owner with edit access CAN update their collaboration_note", async () => {
  const client = freshClient();
  const user = await signInParent(client);
  const ids = await seedStudentAndNote(client, user);

  try {
    const { data, error } = await client
      .from("collaboration_notes")
      .update({ content: "edited-by-owner" })
      .eq("id", ids.noteId)
      .select("id, content");

    assert.ok(!error, `update failed: ${error?.message}`);
    assert.equal(data.length, 1, "owner update should affect exactly one row");
    assert.equal(data[0].content, "edited-by-owner");
  } finally {
    await cleanup(client, ids);
    await client.auth.signOut();
  }
});

test("owner with edit access CAN delete their collaboration_note", async () => {
  const client = freshClient();
  const user = await signInParent(client);
  const ids = await seedStudentAndNote(client, user);

  try {
    const { data, error } = await client
      .from("collaboration_notes")
      .delete()
      .eq("id", ids.noteId)
      .select("id");

    assert.ok(!error, `delete failed: ${error?.message}`);
    assert.equal(data.length, 1, "owner delete should remove exactly one row");
    ids.noteId = null; // already removed
  } finally {
    await cleanup(client, ids);
    await client.auth.signOut();
  }
});

test("anonymous (no auth) CANNOT update or delete a collaboration_note", async () => {
  const owner = freshClient();
  const user = await signInParent(owner);
  const ids = await seedStudentAndNote(owner, user);

  try {
    const anon = freshClient();

    const upd = await anon
      .from("collaboration_notes")
      .update({ content: "hijacked" })
      .eq("id", ids.noteId)
      .select("id");
    // RLS makes the row invisible — either an error or zero rows updated.
    assert.ok(
      upd.error || (Array.isArray(upd.data) && upd.data.length === 0),
      "anonymous update must not modify the row",
    );

    const del = await anon
      .from("collaboration_notes")
      .delete()
      .eq("id", ids.noteId)
      .select("id");
    assert.ok(
      del.error || (Array.isArray(del.data) && del.data.length === 0),
      "anonymous delete must not remove the row",
    );

    // Confirm row is still intact and unchanged when read back by the owner.
    const { data: check, error: checkErr } = await owner
      .from("collaboration_notes")
      .select("id, content")
      .eq("id", ids.noteId)
      .single();
    assert.ok(!checkErr, `owner reread failed: ${checkErr?.message}`);
    assert.equal(check.content, "initial", "content must be untouched after anon attempts");
  } finally {
    await cleanup(owner, ids);
    await owner.auth.signOut();
  }
});

test("author who no longer has edit access (student deleted) CANNOT update the note", async () => {
  // Simulates losing can_edit_student: we orphan the note by deleting the
  // student, so can_edit_student(auth.uid(), student_id) returns false even
  // though created_by_user_id still matches the caller.
  const client = freshClient();
  const user = await signInParent(client);
  const ids = await seedStudentAndNote(client, user);

  // Drop the student → caller no longer satisfies can_edit_student for this row.
  const { error: delStudentErr } = await client
    .from("students")
    .delete()
    .eq("id", ids.studentId);
  assert.ok(!delStudentErr, `student delete failed: ${delStudentErr?.message}`);
  ids.studentId = null;

  try {
    const { data, error } = await client
      .from("collaboration_notes")
      .update({ content: "should-not-apply" })
      .eq("id", ids.noteId)
      .select("id");

    // Policy USING must filter the row out → zero rows updated (or error).
    assert.ok(
      error || (Array.isArray(data) && data.length === 0),
      "author without edit access must not be able to update the note",
    );
  } finally {
    // Best-effort cleanup; row may now be unreachable via RLS.
    await client.from("collaboration_notes").delete().eq("id", ids.noteId);
    await client.auth.signOut();
  }
});
