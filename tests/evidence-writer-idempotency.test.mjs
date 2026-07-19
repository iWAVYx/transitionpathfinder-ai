// Workstream B, Slice B4 — writer idempotency test.
//
// Proves the partial unique index on
// (student_id, source_kind, source_id) makes the evidence writer safe to
// call repeatedly. We exercise the same upsert semantics used by
// `emitEvidenceForConfirmedExtraction` directly against the table via a
// signed-in owner client so RLS is enforced.
//
// Run with:  node --test tests/evidence-writer-idempotency.test.mjs

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

test("evidence writer is idempotent on (student, source_kind, source_id)", async () => {
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
    .insert({ owner_id: userId, first_name: `WriterB4_${Date.now()}`, last_name: "Auto" })
    .select("id")
    .single();
  assert.ok(!sErr, `student seed failed: ${sErr?.message}`);

  const fakeExtractionId = crypto.randomUUID();
  const row = {
    student_id: student.id,
    kind: "document_extraction",
    source_kind: "document_extraction",
    source_id: fakeExtractionId,
    contributor_id: userId,
    verification_state: "human_confirmed",
    permission_scope: "student_team",
    payload: { probe: "b4" },
  };

  for (let i = 0; i < 3; i += 1) {
    const { error } = await c
      .from("evidence_items")
      .upsert(row, {
        onConflict: "student_id,source_kind,source_id",
        ignoreDuplicates: true,
      });
    assert.ok(!error, `upsert #${i + 1} failed: ${error?.message}`);
  }

  const { data: rows, error: readErr } = await c
    .from("evidence_items")
    .select("id, source_id")
    .eq("student_id", student.id)
    .eq("source_kind", "document_extraction")
    .eq("source_id", fakeExtractionId);
  assert.ok(!readErr, `read failed: ${readErr?.message}`);
  assert.equal(rows?.length, 1, "expected exactly one evidence_item row after 3 upserts");

  // Cleanup
  await c.from("evidence_items").delete().eq("student_id", student.id);
  await c.from("students").delete().eq("id", student.id);
});
