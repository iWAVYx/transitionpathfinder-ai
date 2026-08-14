// One-time bootstrap for the fixed QA identities used by protected staging RLS
// checks. Routine verification intentionally refuses to create these accounts;
// this script is the explicit, reviewable staging-only provisioning path.
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
const DISTRICT_A = "11111111-1111-1111-1111-1111111111aa";
const DISTRICT_B = "11111111-1111-1111-1111-1111111111bb";

// The first three IDs are referenced by the migration-backed district fixtures.
// The remaining two are deterministic, staging-only IDs for legacy QA actors.
const FIXED_QA_IDENTITIES = [
  {
    id: "b4aec3a7-daa5-453d-9481-a45bac781437",
    email: "qa.districtadmin@transitionforward.test",
    name: "QA District Admin",
    primaryRole: "district_admin",
    roles: ["district_admin"],
    organizationId: DISTRICT_A,
    membershipRole: "district_admin",
  },
  {
    id: "97c6e8b7-faa9-4bd0-a044-012c55122ddd",
    email: "qa.schooladmin@transitionforward.test",
    name: "QA School Admin",
    primaryRole: "school_admin",
    roles: ["school_admin"],
    organizationId: DISTRICT_B,
    membershipRole: "district_admin",
  },
  {
    id: "038f92be-916f-4dc9-84e4-b36f9645f5c2",
    email: "qa.parent@transitionforward.test",
    name: "QA Parent",
    primaryRole: "parent",
    roles: ["parent"],
    organizationId: DISTRICT_B,
    membershipRole: "member",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    email: "qa.educator@transitionforward.test",
    name: "QA Educator",
    primaryRole: "educator",
    roles: ["educator", "case_manager"],
    organizationId: null,
    membershipRole: null,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    email: "qa.partner@transitionforward.test",
    name: "QA Partner",
    primaryRole: "partner",
    roles: ["partner"],
    organizationId: null,
    membershipRole: null,
  },
];

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`list staging auth users: ${error.message}`);
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

async function ensureAuthUser(identity, usersByEmail, usersById) {
  const existingByEmail = usersByEmail.get(identity.email);
  const existingById = usersById.get(identity.id);

  if (existingByEmail && existingByEmail.id !== identity.id) {
    throw new Error(`${identity.email}: existing auth user has unexpected id`);
  }
  if (existingById && existingById.email !== identity.email) {
    throw new Error(`${identity.id}: expected auth id belongs to a different email`);
  }

  const attributes = {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existingByEmail?.user_metadata ?? {}),
      full_name: identity.name,
      synthetic: true,
      legacy_qa_fixture: true,
    },
  };

  if (existingByEmail) {
    const { data, error } = await admin.auth.admin.updateUserById(identity.id, attributes);
    if (error) throw new Error(`${identity.email}: ${error.message}`);
    usersByEmail.set(identity.email, data.user);
    usersById.set(identity.id, data.user);
    return;
  }

  const { data, error } = await admin.auth.admin.createUser({
    id: identity.id,
    email: identity.email,
    ...attributes,
  });
  if (error) throw new Error(`${identity.email}: ${error.message}`);
  usersByEmail.set(identity.email, data.user);
  usersById.set(identity.id, data.user);
}

async function ensureProfile(identity) {
  const { data: existingEmail, error: emailLookupError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", identity.email)
    .maybeSingle();
  if (emailLookupError)
    throw new Error(`${identity.email} profile lookup: ${emailLookupError.message}`);
  if (existingEmail && existingEmail.id !== identity.id) {
    throw new Error(`${identity.email}: existing profile has unexpected id`);
  }

  const { error } = await admin.from("profiles").upsert(
    {
      id: identity.id,
      email: identity.email,
      full_name: identity.name,
      primary_role: identity.primaryRole,
      onboarding_completed: true,
      organization_id: identity.organizationId,
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(`${identity.email} profile: ${error.message}`);
}

async function ensureRoles(identity) {
  for (const role of identity.roles) {
    const { data: existing, error: lookupError } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", identity.id)
      .eq("role", role)
      .maybeSingle();
    if (lookupError) throw new Error(`${identity.email} role lookup: ${lookupError.message}`);
    if (existing) continue;

    const { error } = await admin.from("user_roles").insert({ user_id: identity.id, role });
    if (error) throw new Error(`${identity.email} role ${role}: ${error.message}`);
  }
}

async function ensureMembership(identity) {
  if (!identity.organizationId || !identity.membershipRole) return;

  const { data: existing, error: lookupError } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("user_id", identity.id)
    .eq("organization_id", identity.organizationId)
    .maybeSingle();
  if (lookupError) throw new Error(`${identity.email} membership lookup: ${lookupError.message}`);

  const row = {
    user_id: identity.id,
    organization_id: identity.organizationId,
    role_within_org: identity.membershipRole,
    status: "active",
    membership_status: "active",
  };
  const { error } = existing
    ? await admin.from("organization_memberships").update(row).eq("id", existing.id)
    : await admin.from("organization_memberships").insert(row);
  if (error) throw new Error(`${identity.email} membership: ${error.message}`);
}

async function requireFixtureOrganizations() {
  const { data, error } = await admin
    .from("organizations")
    .select("id")
    .in("id", [DISTRICT_A, DISTRICT_B]);
  if (error) throw new Error(`fixture organization lookup: ${error.message}`);
  if ((data ?? []).length !== 2) {
    throw new Error("required migration-backed QA district fixtures are missing");
  }
}

async function main() {
  await requireFixtureOrganizations();
  const users = await listAuthUsers();
  const usersByEmail = new Map(users.map((user) => [user.email, user]));
  const usersById = new Map(users.map((user) => [user.id, user]));

  for (const identity of FIXED_QA_IDENTITIES) {
    await ensureAuthUser(identity, usersByEmail, usersById);
    await ensureProfile(identity);
    await ensureRoles(identity);
    await ensureMembership(identity);
    console.log("bootstrapped fixed QA identity:", identity.email, identity.id);
  }

  console.log("fixed QA identity bootstrap complete:", FIXED_QA_IDENTITIES.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
