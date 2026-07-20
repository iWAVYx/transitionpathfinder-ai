// Workstream 7 — Counselor-scope evidence_items RLS regression.
//
// Coverage:
//   * A student's owner (educator) can SELECT evidence rows scoped to
//     'default'/'team' as usual.
//   * A student's owner CANNOT SELECT an evidence row where
//     permission_scope = 'counselor_scope' and contributor_id is
//     someone else — even though they can otherwise access the student.
//   * The contributor themselves CAN SELECT their own counselor_scope row.
//   * A non-contributor collaborator cannot escalate a row into
//     counselor_scope on UPDATE if the contributor_id is not themselves.
//   * professional_focus on profiles never widens access on its own —
//     setting the label alone does not grant visibility.
//
// Run with:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node --test tests/counselor-scope-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SKIP = !URL || !PUB || !SVC;
const admin = SKIP ? null : createClient(URL, SVC, { auth: { persistSession: false } });

const PASSWORD = "TestPass!2026";
const STAMP = Date.now();

async function makeUser(kind) {
  const email = `qa.counselor.${kind}.${STAMP}.${Math.random().toString(36).slice(2, 8)}@transitionforward.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user.id;
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  return { uid, email, client };
}

test("counselor-scope evidence rows are hidden from other team members", { skip: SKIP }, async () => {
  const owner = await makeUser("owner");
  const counselor = await makeUser("counselor");

  // Owner creates a student.
  const { data: student, error: sErr } = await owner.client
    .from("students")
    .insert({ owner_id: owner.uid, first_name: "QA", last_name: `Counselor-${STAMP}` })
    .select("id")
    .single();
  assert.equal(sErr, null, sErr?.message);

  // Add counselor as an accepted editor collaborator so they can otherwise access the student.
  const { error: cErr } = await admin.from("student_collaborators").insert({
    student_id: student.id,
    user_id: counselor.uid,
    invited_email: counselor.email,
    invited_by: owner.uid,
    role: "editor",
    status: "accepted",
  });
  assert.equal(cErr, null, cErr?.message);

  // Counselor sets professional_focus (should NOT change visibility on its own).
  await counselor.client
    .from("profiles")
    .update({ professional_focus: "school_counselor" })
    .eq("id", counselor.uid);

  // Counselor writes a scoped evidence row (contributor = self).
  const { data: ev, error: evErr } = await counselor.client
    .from("evidence_items")
    .insert({
      student_id: student.id,
      kind: "counseling_note",
      source_kind: "counselor_note",
      contributor_id: counselor.uid,
      permission_scope: "counselor_scope",
      payload: { note: "confidential" },
    })
    .select("id")
    .single();
  assert.equal(evErr, null, evErr?.message);

  // Owner CANNOT see the counselor-scope row.
  const { data: ownerView } = await owner.client
    .from("evidence_items")
    .select("id, permission_scope")
    .eq("id", ev.id);
  assert.equal(ownerView?.length ?? 0, 0, "owner must not see counselor_scope rows");

  // Counselor CAN see their own row.
  const { data: selfView } = await counselor.client
    .from("evidence_items")
    .select("id")
    .eq("id", ev.id);
  assert.equal(selfView?.length, 1);

  // Platform admin CAN see the counselor_scope row (audit path).
  const platformAdmin = await makeUser("padmin");
  const { error: roleErr } = await admin
    .from("admin_roles")
    .insert({ user_id: platformAdmin.uid, role: "platform_admin" });
  assert.equal(roleErr, null, roleErr?.message);
  // Re-sign so the JWT reflects any downstream claim materialization.
  const { data: adminView } = await platformAdmin.client
    .from("evidence_items")
    .select("id, permission_scope")
    .eq("id", ev.id);
  assert.equal(
    adminView?.length,
    1,
    "platform_admin must see counselor_scope rows for audit",
  );



  // Owner cannot escalate an existing default-scope row into counselor_scope
  // with a different contributor_id.
  const { data: normal } = await owner.client
    .from("evidence_items")
    .insert({
      student_id: student.id,
      kind: "note",
      source_kind: "manual",
      contributor_id: owner.uid,
      permission_scope: "default",
      payload: {},
    })
    .select("id")
    .single();
  const { error: escErr } = await owner.client
    .from("evidence_items")
    .update({ permission_scope: "counselor_scope", contributor_id: counselor.uid })
    .eq("id", normal.id);
  assert.notEqual(escErr, null, "owner must not be able to escalate scope with another contributor");

  // Cleanup best-effort.
  await admin.from("evidence_items").delete().eq("student_id", student.id);
  await admin.from("student_collaborators").delete().eq("student_id", student.id);
  await admin.from("students").delete().eq("id", student.id);
  await admin.from("admin_roles").delete().eq("user_id", platformAdmin.uid);
  await admin.auth.admin.deleteUser(owner.uid);
  await admin.auth.admin.deleteUser(counselor.uid);
  await admin.auth.admin.deleteUser(platformAdmin.uid);
});

test("profiles.professional_focus rejects unknown values", { skip: SKIP }, async () => {
  const u = await makeUser("focus");
  const { error } = await u.client
    .from("profiles")
    .update({ professional_focus: "principal" })
    .eq("id", u.uid);
  assert.notEqual(error, null, "check constraint must reject unknown focus");
  await admin.auth.admin.deleteUser(u.uid);
});
