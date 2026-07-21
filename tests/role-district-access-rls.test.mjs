// Cross-role district scoping + consent-approval regression.
//
// Complements:
//   - tests/cross-district-rls.test.mjs           (district admin isolation)
//   - tests/student-relationships-consent-rls.test.mjs (consent policy shape)
//   - tests/*-role-probe.test.mjs                 (per-role surface probes)
//
// This suite spins up ad-hoc users in two districts (A and B) and asserts:
//
//   District scoping (per-role)
//     * A `district_admin` in District A cannot see District B members,
//       schools, or org row; can see their own.
//     * A `teacher` who is an active member of District A's school cannot
//       see District B's org, schools, or members.
//     * A `parent` in District A whose child is enrolled in a District A
//       school cannot see District B org, schools, or members.
//
//   Approval flows
//     * A District A teacher CAN invite a District A parent as a pending
//       student_relationships row; only the parent (related user) can flip
//       consent_status to 'approved'.
//     * A District B teacher (stranger to Student A) is denied INSERT of a
//       pending relationship on Student A.
//     * Approved parent can then read Student A's goals; pending parent
//       cannot.
//
// Run with:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node --test tests/role-district-access-rls.test.mjs

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

const PASSWORD = "TestPass!2026";
const STAMP = Date.now();

async function makeUser(kind, role) {
  const email = `qa.rda.${kind}.${STAMP}.${Math.random().toString(36).slice(2, 8)}@transitionforward.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
  });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("user_roles").insert({ user_id: uid, role });
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signErr) throw signErr;
  return { uid, email, client };
}

async function makeOrg(name, type, parent) {
  const { data, error } = await admin
    .from("organizations")
    .insert({
      name: `${name}_${STAMP}`,
      type,
      parent_organization_id: parent,
      verified_status: "verified",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function addMember(orgId, uid, role) {
  const { error } = await admin.from("organization_memberships").insert({
    organization_id: orgId,
    user_id: uid,
    role_within_org: role,
    status: "active",
    membership_status: "active",
  });
  if (error) throw error;
}

function assertDenied(label, { data, error }) {
  if (error) {
    const code = error.code ?? "";
    assert.ok(
      code === "42501" ||
        code.startsWith("PGRST") ||
        /permission|policy|denied|violates/i.test(error.message),
      `${label}: unexpected error shape — ${code} ${error.message}`,
    );
    return;
  }
  assert.equal(
    Array.isArray(data) ? data.length : 0,
    0,
    `${label}: leaked ${JSON.stringify(data)}`,
  );
}

// ---- Fixture graph (created once, torn down once) ----

const state = {
  districtA: null, districtB: null,
  schoolA: null,   schoolB: null,
  aDistrictAdmin: null, bDistrictAdmin: null,
  aTeacher: null,       bTeacher: null,
  aParent: null,        bParent: null,
  aStudent: null,       bStudent: null,
  aGoal: null,
};
const users = () => [
  state.aDistrictAdmin, state.bDistrictAdmin,
  state.aTeacher, state.bTeacher,
  state.aParent, state.bParent,
].filter(Boolean);
const orgs = () => [state.schoolA, state.schoolB, state.districtA, state.districtB].filter(Boolean);
const students = () => [state.aStudent?.id, state.bStudent?.id].filter(Boolean);

before(async () => {
  // Districts + schools
  state.districtA = await makeOrg("DistA", "district", null);
  state.districtB = await makeOrg("DistB", "district", null);
  state.schoolA = await makeOrg("SchoolA", "school", state.districtA);
  state.schoolB = await makeOrg("SchoolB", "school", state.districtB);

  // Users
  state.aDistrictAdmin = await makeUser("distA", "district_admin");
  state.bDistrictAdmin = await makeUser("distB", "district_admin");
  state.aTeacher = await makeUser("teachA", "teacher");
  state.bTeacher = await makeUser("teachB", "teacher");
  state.aParent = await makeUser("parA", "parent");
  state.bParent = await makeUser("parB", "parent");

  // Memberships
  await addMember(state.districtA, state.aDistrictAdmin.uid, "district_admin");
  await addMember(state.districtB, state.bDistrictAdmin.uid, "district_admin");
  await addMember(state.schoolA, state.aTeacher.uid, "teacher");
  await addMember(state.schoolB, state.bTeacher.uid, "teacher");
  await addMember(state.schoolA, state.aParent.uid, "parent");
  await addMember(state.schoolB, state.bParent.uid, "parent");

  // Students owned by parents; goal on A
  const { data: sA } = await admin.from("students")
    .insert({ owner_id: state.aParent.uid, first_name: "ParAKid" })
    .select("id").single();
  state.aStudent = sA;
  const { data: sB } = await admin.from("students")
    .insert({ owner_id: state.bParent.uid, first_name: "ParBKid" })
    .select("id").single();
  state.bStudent = sB;
  const { data: g } = await admin.from("goals")
    .insert({ student_id: sA.id, created_by: state.aParent.uid, title: "seed", category: "general" })
    .select("id").single();
  state.aGoal = g.id;
});

after(async () => {
  for (const id of students()) await admin.from("students").delete().eq("id", id);
  for (const id of orgs()) await admin.from("organizations").delete().eq("id", id);
  for (const u of users()) {
    try { await admin.auth.admin.deleteUser(u.uid); } catch { /* noop */ }
  }
});

// ============ District scoping — per role ============

test("district_admin in District A cannot see District B org, schools, or members", async () => {
  const c = state.aDistrictAdmin.client;

  assertDenied("A dist-admin → B org row",
    await c.from("organizations").select("id").eq("id", state.districtB));
  assertDenied("A dist-admin → B school row",
    await c.from("organizations").select("id").eq("id", state.schoolB));
  assertDenied("A dist-admin → B memberships",
    await c.from("organization_memberships").select("user_id").eq("organization_id", state.districtB));

  // Sanity: sees own
  const own = await c.from("organizations").select("id").eq("id", state.districtA);
  assert.ok(!own.error && (own.data ?? []).length === 1, "A dist-admin must see own district");
});

test("teacher in District A cannot see District B org, schools, or members", async () => {
  const c = state.aTeacher.client;

  assertDenied("A teacher → B district row",
    await c.from("organizations").select("id").eq("id", state.districtB));
  assertDenied("A teacher → B school row",
    await c.from("organizations").select("id").eq("id", state.schoolB));
  assertDenied("A teacher → B memberships",
    await c.from("organization_memberships").select("user_id").eq("organization_id", state.districtB));

  // Sanity: sees own school membership
  const own = await c.from("organization_memberships")
    .select("organization_id").eq("organization_id", state.schoolA);
  assert.ok(!own.error && (own.data ?? []).length >= 1, "A teacher must see own school membership");
});

test("parent in District A cannot see District B org, schools, or members", async () => {
  const c = state.aParent.client;

  assertDenied("A parent → B district row",
    await c.from("organizations").select("id").eq("id", state.districtB));
  assertDenied("A parent → B school row",
    await c.from("organizations").select("id").eq("id", state.schoolB));
  assertDenied("A parent → B memberships",
    await c.from("organization_memberships").select("user_id").eq("organization_id", state.districtB));
});

test("teacher in District B cannot read Student A's goals (cross-district student isolation)", async () => {
  const c = state.bTeacher.client;
  assertDenied("B teacher → A student goals",
    await c.from("goals").select("id").eq("student_id", state.aStudent.id));
  assertDenied("B teacher → A student row",
    await c.from("students").select("id").eq("id", state.aStudent.id));
});

// ============ Approval flow — cross-role ============

test("District A teacher can invite A parent as a pending relationship; only the parent can approve", async () => {
  // Teacher is not yet a collaborator on A's student — grant editor access so
  // teacher has can_edit_student, matching the real-world invite path.
  await admin.from("student_collaborators").insert({
    student_id: state.aStudent.id,
    user_id: state.aTeacher.uid,
    invited_email: state.aTeacher.email,
    role: "editor",
    status: "accepted",
    invited_by: state.aParent.uid,
  });

  // Fresh guardian user to be invited (a second parent on this student).
  const G = await makeUser("guardInv", "guardian");
  try {
    // Teacher inserts pending invite for the guardian.
    const ins = await state.aTeacher.client
      .from("student_relationships")
      .insert({
        student_id: state.aStudent.id,
        related_user_id: G.uid,
        relationship_type: "parent_guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id")
      .single();
    assert.ok(!ins.error, `teacher pending invite failed: ${ins.error?.message}`);
    const relId = ins.data.id;

    // Teacher CANNOT flip to approved on the guardian's behalf.
    const attack = await state.aTeacher.client
      .from("student_relationships")
      .update({ consent_status: "approved" })
      .eq("id", relId)
      .select("id");
    assertDenied("teacher self-approve on guardian's behalf", attack);

    // Row is still pending — pending guardian therefore cannot read goals.
    assertDenied("pending guardian → student goals",
      await G.client.from("goals").select("id").eq("student_id", state.aStudent.id));

    // Guardian (related user) approves their own row.
    const ok = await G.client
      .from("student_relationships")
      .update({ consent_status: "approved" })
      .eq("id", relId)
      .select("id, consent_status");
    assert.ok(!ok.error, `related self-approve failed: ${ok.error?.message}`);
    assert.equal(ok.data?.[0]?.consent_status, "approved");

    // Now approved — guardian can read Student A's goals.
    const goals = await G.client.from("goals").select("id").eq("student_id", state.aStudent.id);
    assert.ok(!goals.error, `approved guardian read failed: ${goals.error?.message}`);
    assert.ok((goals.data ?? []).length >= 1, "approved guardian must see at least the seeded goal");
  } finally {
    try { await admin.auth.admin.deleteUser(G.uid); } catch { /* noop */ }
  }
});

test("District B teacher (stranger to Student A) cannot INSERT a pending relationship on Student A", async () => {
  // B teacher has no can_edit_student on Student A — the INSERT policy's
  // can_edit_student() clause must reject regardless of other columns.
  const stranger = await makeUser("guardStr", "guardian");
  try {
    const res = await state.bTeacher.client
      .from("student_relationships")
      .insert({
        student_id: state.aStudent.id,
        related_user_id: stranger.uid,
        relationship_type: "guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id");
    assertDenied("B teacher cross-district invite", res);
  } finally {
    try { await admin.auth.admin.deleteUser(stranger.uid); } catch { /* noop */ }
  }
});

test("District A parent cannot INSERT a pre-approved relationship for a third party", async () => {
  // Even the student's own owner (A parent) must go through the pending step;
  // consent_status='approved' at INSERT is forbidden by WITH CHECK.
  const third = await makeUser("thirdInv", "guardian");
  try {
    const res = await state.aParent.client
      .from("student_relationships")
      .insert({
        student_id: state.aStudent.id,
        related_user_id: third.uid,
        relationship_type: "guardian",
        permission_level: "collaborate",
        consent_status: "approved", // <-- forbidden
      })
      .select("id");
    assertDenied("A parent INSERT pre-approved", res);
  } finally {
    try { await admin.auth.admin.deleteUser(third.uid); } catch { /* noop */ }
  }
});
