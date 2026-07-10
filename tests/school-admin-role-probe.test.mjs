// School Admin journey probe: verifies a school_admin scoped to School A
// sees only their school's memberships and cannot reach a peer School B,
// district-only tables, admin roles, or unrelated student data.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeUser(tag, role) {
  const email = `qa.schooladmin.${tag}.${Date.now()}@transitionforward.test`;
  const password = "TestPass!2026";
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const uid = data.user.id;
  await admin.from("user_roles").insert({ user_id: uid, role });
  const client = createClient(URL, PUB, { auth: { persistSession: false } });
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { uid, email, password, client };
}

async function cleanup(u) { try { await admin.auth.admin.deleteUser(u.uid); } catch {} }

test("school_admin RLS: scoped to own school; no district / cross-school / admin access", async () => {
  const SA = await makeUser("SA", "school_admin");
  const owner = await makeUser("SO", "school_admin"); // owns a separate school
  const parent = await makeUser("PS", "parent");     // owns an unrelated student
  const district = { id: null };
  const schoolA = { id: null };
  const schoolB = { id: null };

  try {
    // Seed orgs (verified, so peers can appear in verified directory only)
    const { data: dRow } = await admin.from("organizations").insert({
      name: "QA District", type: "district", verified_status: "verified",
    }).select("id").single();
    district.id = dRow.id;

    const { data: aRow } = await admin.from("organizations").insert({
      name: "QA School A", type: "school", verified_status: "verified", parent_organization_id: district.id,
    }).select("id").single();
    schoolA.id = aRow.id;

    const { data: bRow } = await admin.from("organizations").insert({
      name: "QA School B", type: "school", verified_status: "pending", parent_organization_id: district.id,
    }).select("id").single();
    schoolB.id = bRow.id;

    // SA is active school_admin on School A only
    await admin.from("organization_memberships").insert({
      organization_id: schoolA.id, user_id: SA.uid,
      role_within_org: "school_admin", status: "active", membership_status: "active",
    });
    // owner is school_admin on School B
    await admin.from("organization_memberships").insert({
      organization_id: schoolB.id, user_id: owner.uid,
      role_within_org: "school_admin", status: "active", membership_status: "active",
    });

    // --- SA sees their own membership row
    const { data: myMemb } = await SA.client
      .from("organization_memberships").select("id, organization_id")
      .eq("user_id", SA.uid);
    assert.equal(myMemb?.length, 1, "SA cannot read own membership");
    assert.equal(myMemb[0].organization_id, schoolA.id);

    // --- SA CANNOT read School B's memberships (not org admin there)
    const { data: bMemb } = await SA.client
      .from("organization_memberships").select("id").eq("organization_id", schoolB.id);
    assert.equal(bMemb?.length ?? 0, 0, "SA can read peer School B memberships");

    // --- SA CANNOT see School B via directory (unverified — not verified & not member)
    const { data: bOrg } = await SA.client
      .from("organizations").select("id").eq("id", schoolB.id);
    assert.equal(bOrg?.length ?? 0, 0, "SA can view unverified peer School B");

    // --- SA CANNOT insert a membership into School B (not org admin)
    const { error: badInsert } = await SA.client.from("organization_memberships").insert({
      organization_id: schoolB.id, user_id: SA.uid,
      role_within_org: "school_admin", status: "active", membership_status: "active",
    });
    assert.ok(badInsert, "SA was able to insert membership into peer School B");

    // --- SA CANNOT read admin_roles or access_entitlements broadly
    for (const tbl of ["admin_roles", "access_entitlements"]) {
      const { data } = await SA.client.from(tbl).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `SA can read privileged table ${tbl}`);
    }

    // --- SA CANNOT read unrelated student records
    const { data: unrelated } = await admin.from("students")
      .insert({ owner_id: parent.uid, first_name: "Unrelated" }).select("id").single();
    const { data: sees } = await SA.client.from("students").select("id").eq("id", unrelated.id);
    assert.equal(sees?.length ?? 0, 0, "SA can read unrelated student");

    // --- SA CANNOT escalate own app role
    const { error: escErr } = await SA.client.from("user_roles").insert({ user_id: SA.uid, role: "admin" });
    assert.ok(escErr, "SA was able to insert admin role for self");

    // --- SA cannot demote/change own membership to a district-admin role on the district (not member)
    const { error: promoteErr } = await SA.client.from("organization_memberships").insert({
      organization_id: district.id, user_id: SA.uid,
      role_within_org: "district_admin", status: "active", membership_status: "active",
    });
    assert.ok(promoteErr, "SA was able to insert district_admin membership on district");
  } finally {
    // best-effort cleanup: delete users, then orgs cascade-cleanup memberships
    await cleanup(SA); await cleanup(owner); await cleanup(parent);
    if (schoolA.id) await admin.from("organizations").delete().eq("id", schoolA.id);
    if (schoolB.id) await admin.from("organizations").delete().eq("id", schoolB.id);
    if (district.id) await admin.from("organizations").delete().eq("id", district.id);
  }
});
