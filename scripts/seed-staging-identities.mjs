// Provision synthetic staging test identities (7 roles) + minimal org/student data.
//
//   node scripts/seed-staging-identities.mjs
//
// Refuses to run against the production project. Creates ONLY synthetic data —
// no production users, IEPs, documents, or student records are copied.
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";
const STAGING_PROJECT_REF = "qgrertkqbwanerqqemph";
const url = process.env.STAGING_SUPABASE_URL;
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAGING_E2E_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error(
    "STAGING_SUPABASE_URL, STAGING_SUPABASE_SERVICE_ROLE_KEY, and STAGING_E2E_PASSWORD are required",
  );
  process.exit(1);
}
if (url.includes(PRODUCTION_PROJECT_REF)) {
  console.error("REFUSING: target is the production Supabase project");
  process.exit(2);
}
if (!url.includes(STAGING_PROJECT_REF)) {
  console.error(`REFUSING: target is not the approved staging project (${STAGING_PROJECT_REF})`);
  process.exit(3);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

/** email suffix keeps every fixture obviously synthetic and greppable */
const D = "@staging.transitionforwardct.test";

const IDENTITIES = [
  { key: "student", email: `e2e.student${D}`, name: "Sam Staging", roles: ["student"], primary: "student" },
  { key: "parent", email: `e2e.parent${D}`, name: "Pat Staging", roles: ["parent"], primary: "parent" },
  { key: "educator", email: `e2e.educator${D}`, name: "Casey Staging", roles: ["educator", "case_manager"], primary: "educator" },
  { key: "school_admin", email: `e2e.schooladmin${D}`, name: "Sky Staging", roles: ["school_admin"], primary: "school_admin" },
  { key: "district_admin", email: `e2e.districtadmin${D}`, name: "Dana Staging", roles: ["district_admin"], primary: "district_admin" },
  { key: "partner", email: `e2e.partner${D}`, name: "Parker Staging", roles: ["partner"], primary: "partner" },
  { key: "owner", email: `e2e.owner${D}`, name: "Ollie Staging", roles: ["admin"], primary: "admin" },
];

// These older fixed identities own the cross-district and consent fixtures.
// They must remain distinct from the seven browser-E2E identities, but all
// synthetic staging accounts consume the same protected staging password.
const REQUIRED_FIXED_QA_IDENTITIES = [
  "qa.districtadmin@transitionforward.test",
  "qa.schooladmin@transitionforward.test",
  "qa.partner@transitionforward.test",
  "qa.parent@transitionforward.test",
  "qa.educator@transitionforward.test",
];

let usersByEmail;

async function getUsersByEmail() {
  if (usersByEmail) return usersByEmail;

  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list staging auth users: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }

  usersByEmail = new Map(users.map((user) => [user.email, user]));
  return usersByEmail;
}

async function ensureUser({ email, name }) {
  const users = await getUsersByEmail();
  const existing = users.get(email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        full_name: name,
        synthetic: true,
      },
    });
    if (error) throw new Error(`${email}: ${error.message}`);
    users.set(email, data.user);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, synthetic: true },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  users.set(email, data.user);
  return data.user.id;
}

async function reconcileFixedQaPasswords() {
  const users = await getUsersByEmail();
  for (const email of REQUIRED_FIXED_QA_IDENTITIES) {
    const existing = users.get(email);
    if (!existing) {
      throw new Error(`required fixed staging QA identity is missing: ${email}`);
    }
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (error) throw new Error(`${email}: ${error.message}`);
    users.set(email, data.user);
  }
  console.log("password reconciled: fixed QA identities", REQUIRED_FIXED_QA_IDENTITIES.length);
}

async function main() {
  const ids = {};
  for (const identity of IDENTITIES) {
    ids[identity.key] = await ensureUser(identity);
    console.log("user:", identity.key, ids[identity.key]);
  }
  await reconcileFixedQaPasswords();

  // Organizations: one district with one school child (no unique constraint on
  // name in this schema, so look up before inserting).
  async function ensureOrg(row) {
    const { data: found } = await admin
      .from("organizations").select("id").eq("name", row.name).maybeSingle();
    if (found) return found.id;
    const { data, error } = await admin.from("organizations").insert(row).select("id").single();
    if (error) throw new Error(`org ${row.name}: ${error.message}`);
    return data.id;
  }

  const districtId = await ensureOrg({
    name: "Staging Unified District", type: "district", state: "CT",
    status: "active", verified_status: "verified",
  });
  const schoolId = await ensureOrg({
    name: "Staging High School", type: "school", state: "CT",
    status: "active", verified_status: "verified", parent_organization_id: districtId,
  });
  const partnerOrgId = await ensureOrg({
    name: "Staging Career Network", type: "partner", state: "CT",
    status: "active", verified_status: "verified",
  });

  for (const [key, orgId, role] of [
    ["district_admin", districtId, "district_admin"],
    ["school_admin", schoolId, "school_admin"],
    ["educator", schoolId, "educator"],
    ["student", schoolId, "student"],
    ["parent", schoolId, "parent"],
    ["partner", partnerOrgId, "admin"],
  ]) {
    const { data: member, error: memberReadError } = await admin
      .from("organization_memberships").select("id")
      .eq("user_id", ids[key]).eq("organization_id", orgId).maybeSingle();
    if (memberReadError) {
      throw new Error(`membership lookup ${key}: ${memberReadError.message}`);
    }

    const membership = {
      user_id: ids[key],
      organization_id: orgId,
      role_within_org: role,
      status: "active",
      membership_status: "active",
    };
    const { error } = member
      ? await admin.from("organization_memberships").update(membership).eq("id", member.id)
      : await admin.from("organization_memberships").insert(membership);
    if (error) throw new Error(`membership ${key}: ${error.message}`);
  }

  for (const identity of IDENTITIES) {
    await admin.from("profiles").upsert({
      id: ids[identity.key],
      full_name: identity.name,
      email: identity.email,
      primary_role: identity.primary,
      onboarding_completed: true,
      organization_id:
        identity.key === "district_admin"
          ? districtId
          : ["school_admin", "educator", "student", "parent"].includes(identity.key)
            ? schoolId
            : identity.key === "partner"
              ? partnerOrgId
              : null,
    });
    for (const role of identity.roles) {
      const { data: existingRole } = await admin
        .from("user_roles").select("id")
        .eq("user_id", ids[identity.key]).eq("role", role).maybeSingle();
      if (!existingRole) {
        const { error } = await admin
          .from("user_roles").insert({ user_id: ids[identity.key], role });
        if (error) console.warn("role", identity.key, role, error.message);
      }
    }
  }

  // The Admin Hub authorizes against admin_roles, not the generic admin app role.
  // Reconcile this on every staging seed so an existing synthetic owner cannot drift.
  const { error: ownerAdminRoleError } = await admin.from("admin_roles").upsert(
    { user_id: ids.owner, role: "platform_owner" },
    { onConflict: "user_id,role" },
  );
  if (ownerAdminRoleError) {
    throw new Error(`owner platform role: ${ownerAdminRoleError.message}`);
  }

  const { data: ownerAdminRole, error: ownerAdminRoleReadError } = await admin
    .from("admin_roles")
    .select("role")
    .eq("user_id", ids.owner)
    .eq("role", "platform_owner")
    .maybeSingle();
  if (ownerAdminRoleReadError || !ownerAdminRole) {
    throw new Error(
      `owner platform role verification failed: ${ownerAdminRoleReadError?.message ?? "row missing"}`,
    );
  }
  console.log("admin role: owner platform_owner");

  // One synthetic student owned by the parent, linked to the student account.
  let studentId;
  const { data: existingStudent } = await admin
    .from("students").select("id")
    .eq("owner_id", ids.parent).eq("first_name", "Robin").maybeSingle();
  if (existingStudent) {
    studentId = existingStudent.id;
    const { error } = await admin.from("students").update({
      student_user_id: ids.student,
      organization_id: schoolId,
    }).eq("id", studentId);
    if (error) throw new Error(`student link: ${error.message}`);
  } else {
    const { data, error } = await admin.from("students").insert({
      owner_id: ids.parent,
      first_name: "Robin",
      last_name: "Staging",
      grade_band: "high_school",
      school: "Staging High School",
      organization_id: schoolId,
      student_user_id: ids.student,
      expected_graduation_year: new Date().getFullYear() + 2,
      interests_summary: "Synthetic fixture — culinary arts, robotics",
    }).select("id").single();
    if (error) throw new Error(`student: ${error.message}`);
    studentId = data.id;
  }

  // A realistic staging umbrella license. The district entitlement powers the
  // existing feature gates; the three pools and four allocations prove the
  // market-release seat model without copying any production data.
  const { error: entitlementError } = await admin.from("access_entitlements").upsert({
    organization_id: districtId,
    user_id: null,
    plan_type: "district_pilot",
    status: "pilot",
    grants_family_access: true,
    grants_student_access: true,
    grants_partner_access: false,
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 365 * 86_400_000).toISOString(),
    source: "synthetic-staging-seed",
  }, { onConflict: "organization_id,user_id,plan_type" });
  if (entitlementError) throw new Error(`district entitlement: ${entitlementError.message}`);

  async function ensurePool(licenseType, purchased) {
    const note = `Synthetic staging ${licenseType} pool`;
    const { data: found, error: findError } = await admin
      .from("license_pools")
      .select("id")
      .eq("organization_id", districtId)
      .eq("license_type", licenseType)
      .eq("source", "pilot")
      .eq("notes", note)
      .maybeSingle();
    if (findError) throw new Error(`pool lookup ${licenseType}: ${findError.message}`);
    const row = {
      organization_id: districtId,
      user_id: null,
      license_type: licenseType,
      source: "pilot",
      plan_code: "district_starter",
      purchased,
      status: "active",
      effective_to: null,
      notes: note,
    };
    if (found) {
      const { error } = await admin.from("license_pools").update(row).eq("id", found.id);
      if (error) throw new Error(`pool update ${licenseType}: ${error.message}`);
      return found.id;
    }
    const { data, error } = await admin.from("license_pools").insert(row).select("id").single();
    if (error) throw new Error(`pool insert ${licenseType}: ${error.message}`);
    return data.id;
  }

  const pools = {
    pathway: await ensurePool("pathway", 150),
    staff: await ensurePool("staff", 35),
    admin: await ensurePool("admin", 5),
  };

  async function ensureAllocation({ licenseType, beneficiaryUserId, studentId: allocationStudentId = null }) {
    let query = admin
      .from("license_allocations")
      .select("id")
      .eq("sponsor_organization_id", districtId)
      .eq("license_type", licenseType)
      .in("state", ["reserved", "active"]);
    query = allocationStudentId
      ? query.eq("student_id", allocationStudentId)
      : query.eq("beneficiary_user_id", beneficiaryUserId);
    const { data: found, error: findError } = await query.maybeSingle();
    if (findError) throw new Error(`allocation lookup ${licenseType}: ${findError.message}`);
    const row = {
      pool_id: pools[licenseType],
      sponsor_organization_id: districtId,
      sponsor_user_id: ids.owner,
      license_type: licenseType,
      state: "active",
      beneficiary_user_id: beneficiaryUserId,
      student_id: allocationStudentId,
      invitation_source: "synthetic_staging_seed",
      reserved_until: null,
      activated_at: new Date().toISOString(),
      created_by: ids.owner,
      notes: "Synthetic staging license allocation",
    };
    if (found) {
      const { error } = await admin.from("license_allocations").update(row).eq("id", found.id);
      if (error) throw new Error(`allocation update ${licenseType}: ${error.message}`);
      return;
    }
    const { error } = await admin.from("license_allocations").insert(row);
    if (error) throw new Error(`allocation insert ${licenseType}: ${error.message}`);
  }

  await ensureAllocation({
    licenseType: "pathway",
    beneficiaryUserId: ids.student,
    studentId,
  });
  await ensureAllocation({ licenseType: "staff", beneficiaryUserId: ids.educator });
  await ensureAllocation({ licenseType: "admin", beneficiaryUserId: ids.school_admin });
  await ensureAllocation({ licenseType: "admin", beneficiaryUserId: ids.district_admin });

  const district = { id: districtId };
  const school = { id: schoolId };
  const partner = { id: partnerOrgId };
  const student = { id: studentId };

  console.log(JSON.stringify({
    ids,
    district: district.id,
    school: school.id,
    partner: partner.id,
    student: student.id,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
