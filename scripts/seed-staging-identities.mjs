// Provision synthetic staging test identities (7 roles) + minimal org/student data.
//
//   node scripts/seed-staging-identities.mjs
//
// Refuses to run against the production project. Creates ONLY synthetic data —
// no production users, IEPs, documents, or student records are copied.
import { createClient } from "@supabase/supabase-js";

const PRODUCTION_PROJECT_REF = "lrqcntqyekucamifpffs";
const url = process.env.STAGING_SUPABASE_URL;
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.STAGING_E2E_PASSWORD ?? "Staging-E2E-Passw0rd!";

if (!url || !serviceKey) {
  console.error("STAGING_SUPABASE_URL and STAGING_SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}
if (url.includes(PRODUCTION_PROJECT_REF)) {
  console.error("REFUSING: target is the production Supabase project");
  process.exit(2);
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

async function ensureUser({ email, name }) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, synthetic: true },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  const ids = {};
  for (const identity of IDENTITIES) {
    ids[identity.key] = await ensureUser(identity);
    console.log("user:", identity.key, ids[identity.key]);
  }

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

  for (const [key, orgId, role] of [
    ["district_admin", districtId, "district_admin"],
    ["school_admin", schoolId, "school_admin"],
    ["educator", schoolId, "educator"],
  ]) {
    const { data: member } = await admin
      .from("organization_memberships").select("id")
      .eq("user_id", ids[key]).eq("organization_id", orgId).maybeSingle();
    if (!member) {
      const { error } = await admin
        .from("organization_memberships")
        .insert({ user_id: ids[key], organization_id: orgId, role_within_org: role });
      if (error) console.warn("membership", key, error.message);
    }
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
          : ["school_admin", "educator"].includes(identity.key)
            ? schoolId
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

  // One synthetic student owned by the parent, linked to the student account.
  let studentId;
  const { data: existingStudent } = await admin
    .from("students").select("id")
    .eq("owner_id", ids.parent).eq("first_name", "Robin").maybeSingle();
  if (existingStudent) {
    studentId = existingStudent.id;
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

  const district = { id: districtId };
  const school = { id: schoolId };
  const student = { id: studentId };

  console.log(JSON.stringify({ ids, district: district?.id, school: school?.id, student: student?.id }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
