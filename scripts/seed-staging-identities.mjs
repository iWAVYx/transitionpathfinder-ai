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

  // Organizations: one district with one school child.
  const { data: district } = await admin
    .from("organizations")
    .upsert(
      { name: "Staging Unified District", type: "district", state: "CT", status: "active", verified_status: "verified" },
      { onConflict: "name" },
    )
    .select("id")
    .maybeSingle();
  const { data: school } = await admin
    .from("organizations")
    .upsert(
      {
        name: "Staging High School",
        type: "school",
        state: "CT",
        status: "active",
        verified_status: "verified",
        parent_organization_id: district?.id ?? null,
      },
      { onConflict: "name" },
    )
    .select("id")
    .maybeSingle();

  for (const [key, orgId, role] of [
    ["district_admin", district?.id, "district_admin"],
    ["school_admin", school?.id, "school_admin"],
    ["educator", school?.id, "educator"],
  ]) {
    if (!orgId) continue;
    await admin
      .from("organization_memberships")
      .upsert({ user_id: ids[key], organization_id: orgId, role }, { onConflict: "user_id,organization_id" });
  }

  for (const identity of IDENTITIES) {
    await admin.from("profiles").upsert({
      id: ids[identity.key],
      full_name: identity.name,
      email: identity.email,
      primary_role: identity.primary,
      onboarding_completed: true,
      organization_id:
        identity.key === "district_admin" ? district?.id : ["school_admin", "educator"].includes(identity.key) ? school?.id : null,
    });
    for (const role of identity.roles) {
      await admin.from("user_roles").upsert({ user_id: ids[identity.key], role }, { onConflict: "user_id,role" });
    }
  }

  // One synthetic student owned by the parent, linked to the student account.
  const { data: student, error: studentError } = await admin
    .from("students")
    .upsert(
      {
        owner_id: ids.parent,
        first_name: "Robin",
        last_name: "Staging",
        grade_band: "high_school",
        school: "Staging High School",
        organization_id: school?.id ?? null,
        student_user_id: ids.student,
        expected_graduation_year: new Date().getFullYear() + 2,
        interests_summary: "Synthetic fixture — culinary arts, robotics",
      },
      { onConflict: "owner_id,first_name,last_name" },
    )
    .select("id")
    .maybeSingle();
  if (studentError) console.warn("students upsert:", studentError.message);
  console.log("student:", student?.id);

  console.log(JSON.stringify({ ids, district: district?.id, school: school?.id, student: student?.id }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
