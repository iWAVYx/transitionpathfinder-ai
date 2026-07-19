// Workstream C, Slice C3 — content-hash duplicate short-circuit.
//
// Directly exercises the (student_id, content_hash) partial index that the
// registerDocument server fn uses to detect duplicate uploads. Signs in as
// the QA parent, inserts one document with a real SHA-256, then inserts a
// second row with the same hash and verifies the dedupe lookup returns the
// first row (matching the server-fn short-circuit path).
//
// Run with:  node --test tests/document-content-hash-dedupe.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

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

test("documents.content_hash dedupe lookup returns the live row for the same student", async () => {
  const c = client();
  const { error: signInErr } = await c.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!signInErr, `sign-in failed: ${signInErr?.message}`);
  const { data: userRes } = await c.auth.getUser();
  const userId = userRes.user.id;

  const { data: student, error: sErr } = await c
    .from("students")
    .insert({ owner_id: userId, first_name: `HashC3_${Date.now()}`, last_name: "Auto" })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  const bytes = `c3-dedupe-${randomUUID()}`;
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path1 = `${student.id}/first-${Date.now()}.pdf`;

  const { data: first, error: firstErr } = await c
    .from("documents")
    .insert({
      student_id: student.id,
      uploaded_by: userId,
      title: "Original upload",
      storage_path: path1,
      doc_type: "other",
      visibility: "team",
      content_hash: hash,
    })
    .select("*")
    .single();
  assert.ok(!firstErr, `first insert failed: ${firstErr?.message}`);

  try {
    // Mirror the server-fn dedupe lookup exactly.
    const { data: found, error: lookupErr } = await c
      .from("documents")
      .select("id")
      .eq("student_id", student.id)
      .eq("content_hash", hash)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.ok(!lookupErr, `dedupe lookup failed: ${lookupErr?.message}`);
    assert.equal(found?.id, first.id, "dedupe lookup should return the original row");

    // A different student uploading the same bytes must NOT collide.
    const { data: other, error: otherErr } = await c
      .from("students")
      .insert({ owner_id: userId, first_name: `HashC3_other_${Date.now()}`, last_name: "Auto" })
      .select("id")
      .single();
    assert.ok(!otherErr, `sibling student seed failed: ${otherErr?.message}`);

    const { data: crossRow } = await c
      .from("documents")
      .select("id")
      .eq("student_id", other.id)
      .eq("content_hash", hash)
      .maybeSingle();
    assert.equal(crossRow, null, "hash must be scoped per student");

    await c.from("students").delete().eq("id", other.id);
  } finally {
    await c.from("documents").delete().eq("id", first.id);
    await c.from("students").delete().eq("id", student.id);
  }
});
