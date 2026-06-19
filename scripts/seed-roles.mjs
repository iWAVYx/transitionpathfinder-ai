// Seed E2E role test accounts via the Supabase Admin API.
// Idempotent: re-running updates password and re-asserts role rows.
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

// app_role values: parent, educator, school_admin, district_admin, partner.
// "owner" is not in app_role; we model the e2e owner as a platform_owner
// in admin_roles (and also give them app_role 'admin' for has_role checks).
const roles = [
  { key: 'parent',         email: 'e2e-parent@transitionforwardct.com',         appRole: 'parent' },
  { key: 'educator',       email: 'e2e-educator@transitionforwardct.com',       appRole: 'educator' },
  { key: 'school_admin',   email: 'e2e-school-admin@transitionforwardct.com',   appRole: 'school_admin' },
  { key: 'district_admin', email: 'e2e-district-admin@transitionforwardct.com', appRole: 'district_admin' },
  { key: 'partner',        email: 'e2e-partner@transitionforwardct.com',        appRole: 'partner' },
  { key: 'owner',          email: 'e2e-owner@transitionforwardct.com',          appRole: 'admin', adminRole: 'platform_owner' },
]

function genPassword(label) {
  const suffix = randomBytes(8).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 12)
  return `E2e${label}!${suffix}`
}

async function findUserByEmail(email) {
  // paginate auth.users until we find the email
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const u = data.users.find((x) => (x.email ?? '').toLowerCase() === email.toLowerCase())
    if (u) return u
    if (data.users.length < 200) return null
  }
  return null
}

const results = []

for (const r of roles) {
  const password = genPassword(r.key.replace(/_/g, ''))
  let user = await findUserByEmail(r.email)
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: r.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `E2E ${r.key}`, seeded_e2e: true },
    })
    if (error) throw new Error(`create ${r.email}: ${error.message}`)
    user = data.user
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    })
    if (error) throw new Error(`update ${r.email}: ${error.message}`)
  }

  // profile
  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id: user.id, email: r.email, full_name: `E2E ${r.key}` }, { onConflict: 'id' })
  if (pErr) throw new Error(`profile ${r.email}: ${pErr.message}`)

  // app_role
  const { error: rErr } = await admin
    .from('user_roles')
    .upsert({ user_id: user.id, role: r.appRole }, { onConflict: 'user_id,role' })
  if (rErr) throw new Error(`user_roles ${r.email}: ${rErr.message}`)

  // admin_role (owner only)
  if (r.adminRole) {
    const { error: aErr } = await admin
      .from('admin_roles')
      .upsert({ user_id: user.id, role: r.adminRole }, { onConflict: 'user_id,role' })
    if (aErr) throw new Error(`admin_roles ${r.email}: ${aErr.message}`)
  }

  results.push({ key: r.key, email: r.email, password })
}

console.log('\nSeeded E2E role accounts:\n')
for (const r of results) {
  const upper = r.key.toUpperCase()
  console.log(`E2E_${upper}_EMAIL=${r.email}`)
  console.log(`E2E_${upper}_PASSWORD=${r.password}`)
}
