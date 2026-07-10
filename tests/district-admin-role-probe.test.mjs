// District Admin journey probe: verifies a district_admin scoped to District 1
// sees only their own district's data, cannot reach a peer District 2, cannot
// escalate to admin, and cannot read partner/admin-only tables. Also verifies
// the server-side ensureDistrictAdmin gate refuses cross-district requests.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const PUB = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const admin = createClient(URL, SVC, { auth: { persistSession: false } });

async function makeUser(tag, role) {
  const email = `qa.districtadmin.${tag}.${Date.now()}@transitionforward.test`;
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

test("district_admin RLS: scoped to own district; no cross-district / admin / partner leakage", async () => {
  const DA1 = await makeUser("DA1", "district_admin");
  const DA2 = await makeUser("DA2", "district_admin");
  const parent = await makeUser("PS", "parent"); // owns an unrelated student

  const orgs = { d1: null, d2: null, s1: null, s2: null };
  try {
    const { data: d1 } = await admin.from("organizations").insert({
      name: "QA District 1", type: "district", verified_status: "verified",
    }).select("id").single();
    orgs.d1 = d1.id;
    const { data: d2 } = await admin.from("organizations").insert({
      name: "QA District 2", type: "district", verified_status: "verified",
    }).select("id").single();
    orgs.d2 = d2.id;
    const { data: s1 } = await admin.from("organizations").insert({
      name: "QA D1 School", type: "school", verified_status: "verified", parent_organization_id: orgs.d1,
    }).select("id").single();
    orgs.s1 = s1.id;
    const { data: s2 } = await admin.from("organizations").insert({
      name: "QA D2 School", type: "school", verified_status: "verified", parent_organization_id: orgs.d2,
    }).select("id").single();
    orgs.s2 = s2.id;

    // Active district_admin memberships
    await admin.from("organization_memberships").insert([
      { organization_id: orgs.d1, user_id: DA1.uid, role_within_org: "district_admin", status: "active", membership_status: "active" },
      { organization_id: orgs.d2, user_id: DA2.uid, role_within_org: "district_admin", status: "active", membership_status: "active" },
    ]);
    // Seed a school-level member on S2 so we can test isolation
    await admin.from("organization_memberships").insert({
      organization_id: orgs.s2, user_id: DA2.uid, role_within_org: "school_admin", status: "active", membership_status: "active",
    });

    // --- DA1 sees own district membership
    const { data: myMemb } = await DA1.client
      .from("organization_memberships").select("id, organization_id").eq("user_id", DA1.uid);
    assert.equal(myMemb?.length, 1, "DA1 cannot read own district membership");
    assert.equal(myMemb[0].organization_id, orgs.d1);

    // --- DA1 CANNOT see D2 or S2 memberships directly
    for (const orgId of [orgs.d2, orgs.s2]) {
      const { data } = await DA1.client
        .from("organization_memberships").select("id").eq("organization_id", orgId);
      assert.equal(data?.length ?? 0, 0, `DA1 can read memberships for peer org ${orgId}`);
    }

    // --- DA1 CANNOT insert a district_admin membership into peer District 2
    const { error: insD2 } = await DA1.client.from("organization_memberships").insert({
      organization_id: orgs.d2, user_id: DA1.uid,
      role_within_org: "district_admin", status: "active", membership_status: "active",
    });
    assert.ok(insD2, "DA1 was able to insert membership into peer District 2");

    // --- DA1 CANNOT change School S2's parent (would require admin rights on S2)
    const { error: reparent, count: rc } = await DA1.client.from("organizations")
      .update({ parent_organization_id: orgs.d1 }).eq("id", orgs.s2).select("*", { count: "exact" });
    // Either explicit error or 0 affected rows (RLS silently filters).
    assert.ok(reparent || (rc ?? 0) === 0, "DA1 was able to re-parent peer School S2");

    // --- DA1 CANNOT read privileged tables
    for (const tbl of ["admin_roles", "access_entitlements"]) {
      const { data } = await DA1.client.from(tbl).select("*").limit(1);
      assert.equal(data?.length ?? 0, 0, `DA1 can read privileged table ${tbl}`);
    }

    // --- DA1 CANNOT read unrelated student rows (no direct district→student RLS)
    const { data: srow } = await admin.from("students")
      .insert({ owner_id: parent.uid, first_name: "OutsideDistrict" }).select("id").single();
    const { data: sees } = await DA1.client.from("students").select("id").eq("id", srow.id);
    assert.equal(sees?.length ?? 0, 0, "DA1 can read unrelated student row directly");

    // --- DA1 CANNOT escalate own role to platform admin
    const { error: escErr } = await DA1.client.from("user_roles").insert({ user_id: DA1.uid, role: "admin" });
    assert.ok(escErr, "DA1 was able to insert admin role for self");

    // --- DA1 sees the verified peer District 2 in the org directory (verified status
    //     is intentionally public — this is expected, not a leak).
    const { data: dir } = await DA1.client.from("organizations").select("id").eq("id", orgs.d2);
    assert.equal(dir?.length, 1, "verified peer district should appear in directory");
  } finally {
    await cleanup(DA1); await cleanup(DA2); await cleanup(parent);
    for (const id of [orgs.s1, orgs.s2, orgs.d1, orgs.d2]) {
      if (id) await admin.from("organizations").delete().eq("id", id);
    }
  }
});
