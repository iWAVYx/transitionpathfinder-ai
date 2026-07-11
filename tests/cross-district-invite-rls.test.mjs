// Cross-district invite + relationship-creation regression.
//
// Companion to:
//   - tests/role-district-access-rls.test.mjs (broad scoping + approval flow)
//   - tests/student-relationships-consent-rls.test.mjs (consent policy shape)
//   - tests/district-school-hijack-rls.test.mjs (school re-parenting)
//
// This suite exercises the INVITE creation paths and asserts that a caller
// in District A cannot mint invitations or student_relationships rows that
// target District B's org, District B's students, or a guardian whose email
// belongs to a District B invite.
//
// Coverage:
//   invitations table
//     * A District A school_admin cannot INSERT a join_school invite with
//       organization_id = District B's school (is_org_admin fails).
//     * A District A school_admin cannot INSERT a join_district invite with
//       organization_id = District B's district.
//     * A District A school_admin cannot INSERT a connect_to_student invite
//       for a student they don't own or edit (District B's student).
//     * accept_invitation_by_token rejects when the authenticated user's
//       email does not match the invitation email (cross-guardian hijack).
//     * Sanity: a District A school_admin CAN mint a join_school invite for
//       District A's own school.
//
//   student_relationships table
//     * A District A parent (owner of Student A) cannot mint a
//       student_relationships row on Student B (owned in District B) even
//       for a valid guardian target.
//     * A District B parent cannot mint a student_relationships row on
//       Student A.
//     * A District A school_admin (no can_edit_student on Student A) cannot
//       mint a pending student_relationships row on Student A.
//
// Run with:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_PUBLISHABLE_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   node --test tests/cross-district-invite-rls.test.mjs

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
  const email = `qa.xdi.${kind}.${STAMP}.${Math.random().toString(36).slice(2, 8)}@transitionforward.test`;
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

function randomToken() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
}

const state = {
  districtA: null, districtB: null,
  schoolA: null,   schoolB: null,
  aSchoolAdmin: null, bSchoolAdmin: null,
  aParent: null, bParent: null,
  aStudent: null, bStudent: null,
};
const users = () => [state.aSchoolAdmin, state.bSchoolAdmin, state.aParent, state.bParent].filter(Boolean);
const orgs = () => [state.schoolA, state.schoolB, state.districtA, state.districtB].filter(Boolean);
const students = () => [state.aStudent?.id, state.bStudent?.id].filter(Boolean);

before(async () => {
  state.districtA = await makeOrg("XDIDistA", "district", null);
  state.districtB = await makeOrg("XDIDistB", "district", null);
  state.schoolA = await makeOrg("XDISchoolA", "school", state.districtA);
  state.schoolB = await makeOrg("XDISchoolB", "school", state.districtB);

  state.aSchoolAdmin = await makeUser("saA", "school_admin");
  state.bSchoolAdmin = await makeUser("saB", "school_admin");
  state.aParent = await makeUser("parA", "parent");
  state.bParent = await makeUser("parB", "parent");

  await addMember(state.schoolA, state.aSchoolAdmin.uid, "school_admin");
  await addMember(state.districtA, state.aSchoolAdmin.uid, "school_admin");
  await addMember(state.schoolB, state.bSchoolAdmin.uid, "school_admin");
  await addMember(state.districtB, state.bSchoolAdmin.uid, "school_admin");
  await addMember(state.schoolA, state.aParent.uid, "parent");
  await addMember(state.schoolB, state.bParent.uid, "parent");

  const { data: sA } = await admin.from("students")
    .insert({ owner_id: state.aParent.uid, first_name: "XDIParAKid" })
    .select("id").single();
  state.aStudent = sA;
  const { data: sB } = await admin.from("students")
    .insert({ owner_id: state.bParent.uid, first_name: "XDIParBKid" })
    .select("id").single();
  state.bStudent = sB;
});

after(async () => {
  for (const id of students()) await admin.from("students").delete().eq("id", id);
  await admin.from("invitations").delete().like("email", `qa.xdi.%${STAMP}%`);
  for (const id of orgs()) await admin.from("organizations").delete().eq("id", id);
  for (const u of users()) {
    try { await admin.auth.admin.deleteUser(u.uid); } catch { /* noop */ }
  }
});

// ============ invitations INSERT — cross-district ============

test("District A school_admin cannot INSERT join_school invite for District B's school", async () => {
  const res = await state.aSchoolAdmin.client
    .from("invitations")
    .insert({
      email: `xdi.guardian.${STAMP}@transitionforward.test`,
      invited_role: "parent",
      invitation_type: "join_school",
      organization_id: state.schoolB, // <-- cross-district target
      invited_by_user_id: state.aSchoolAdmin.uid,
      status: "pending",
      token: randomToken(),
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    })
    .select("id");
  assertDenied("A school_admin → B school invite", res);
});

test("District A school_admin cannot INSERT join_district invite for District B's district", async () => {
  const res = await state.aSchoolAdmin.client
    .from("invitations")
    .insert({
      email: `xdi.dadmin.${STAMP}@transitionforward.test`,
      invited_role: "district_admin",
      invitation_type: "join_district",
      organization_id: state.districtB,
      invited_by_user_id: state.aSchoolAdmin.uid,
      status: "pending",
      token: randomToken(),
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    })
    .select("id");
  assertDenied("A school_admin → B district invite", res);
});

test("District A school_admin cannot INSERT connect_to_student invite on District B student", async () => {
  const res = await state.aSchoolAdmin.client
    .from("invitations")
    .insert({
      email: `xdi.guard2.${STAMP}@transitionforward.test`,
      invited_role: "guardian",
      invitation_type: "connect_to_student",
      student_profile_id: state.bStudent.id, // <-- other district's student
      invited_by_user_id: state.aSchoolAdmin.uid,
      status: "pending",
      token: randomToken(),
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    })
    .select("id");
  assertDenied("A school_admin → B student connect invite", res);
});

test("Sanity: District A school_admin CAN INSERT join_school invite for own school", async () => {
  const res = await state.aSchoolAdmin.client
    .from("invitations")
    .insert({
      email: `xdi.ok.${STAMP}@transitionforward.test`,
      invited_role: "parent",
      invitation_type: "join_school",
      organization_id: state.schoolA,
      invited_by_user_id: state.aSchoolAdmin.uid,
      status: "pending",
      token: randomToken(),
      expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    })
    .select("id");
  assert.ok(!res.error, `own-school invite must be allowed: ${res.error?.message}`);
  assert.equal(res.data?.length, 1);
});

// ============ accept_invitation_by_token — wrong recipient ============

test("A guardian in one district cannot redeem an invitation addressed to a different email", async () => {
  // Seed a legitimate District B invite for a fresh guardian email.
  const targetEmail = `xdi.guardB.${STAMP}@transitionforward.test`;
  const token = randomToken();
  const { error: seedErr } = await admin.from("invitations").insert({
    email: targetEmail,
    invited_role: "parent",
    invitation_type: "join_school",
    organization_id: state.schoolB,
    invited_by_user_id: state.bSchoolAdmin.uid,
    status: "pending",
    token,
    expires_at: new Date(Date.now() + 7 * 864e5).toISOString(),
  });
  assert.ok(!seedErr, `seed invite failed: ${seedErr?.message}`);

  // District A parent (different email) tries to accept it.
  const res = await state.aParent.client.rpc("accept_invitation_by_token", { _token: token });
  assert.ok(res.error, "wrong-recipient acceptance must fail");
  assert.match(
    res.error.message ?? "",
    /different email|not authenticated|not found|expired|no longer pending/i,
    `unexpected error: ${res.error.message}`,
  );

  // And the invite is still pending, not accepted by the attacker.
  const { data: after } = await admin.from("invitations")
    .select("status, accepted_by").eq("token", token).single();
  assert.equal(after.status, "pending");
  assert.equal(after.accepted_by, null);
});

// ============ student_relationships — cross-district creation ============

test("District A parent cannot INSERT student_relationships row on District B's student", async () => {
  const stranger = await makeUser("guardX1", "guardian");
  try {
    const res = await state.aParent.client
      .from("student_relationships")
      .insert({
        student_id: state.bStudent.id, // <-- not their student
        related_user_id: stranger.uid,
        relationship_type: "guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id");
    assertDenied("A parent → B student relationship", res);
  } finally {
    try { await admin.auth.admin.deleteUser(stranger.uid); } catch { /* noop */ }
  }
});

test("District B parent cannot INSERT student_relationships row on District A's student", async () => {
  const stranger = await makeUser("guardX2", "guardian");
  try {
    const res = await state.bParent.client
      .from("student_relationships")
      .insert({
        student_id: state.aStudent.id,
        related_user_id: stranger.uid,
        relationship_type: "guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id");
    assertDenied("B parent → A student relationship", res);
  } finally {
    try { await admin.auth.admin.deleteUser(stranger.uid); } catch { /* noop */ }
  }
});

test("District A school_admin (no can_edit_student on Student A) cannot INSERT pending relationship on Student A", async () => {
  // aSchoolAdmin has org membership in District A, but no collaborator or
  // relationship grant on aParent's private student — can_edit_student must
  // fail and the INSERT policy must reject.
  const stranger = await makeUser("guardX3", "guardian");
  try {
    const res = await state.aSchoolAdmin.client
      .from("student_relationships")
      .insert({
        student_id: state.aStudent.id,
        related_user_id: stranger.uid,
        relationship_type: "guardian",
        permission_level: "collaborate",
        consent_status: "pending",
      })
      .select("id");
    assertDenied("A school_admin → A private student relationship", res);
  } finally {
    try { await admin.auth.admin.deleteUser(stranger.uid); } catch { /* noop */ }
  }
});
