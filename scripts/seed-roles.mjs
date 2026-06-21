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

// app_role values: student, parent, educator, school_admin, district_admin, partner.
// "owner" is not in app_role; we model the e2e owner as a platform_owner
// in admin_roles (and also give them app_role 'admin' for has_role checks).
const roles = [
  { key: 'student',        email: 'e2e-student@transitionforwardct.com',        appRole: 'student' },
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
    .upsert({ id: user.id, email: r.email, full_name: `E2E ${r.key}`, onboarding_completed: true, primary_role: r.appRole }, { onConflict: 'id' })
  if (pErr) throw new Error(`profile ${r.email}: ${pErr.message}`)

  // app_role
  const { error: rErr } = await admin
    .from('user_roles')
    .upsert({ user_id: user.id, role: r.appRole }, { onConflict: 'user_id,role' })
  if (rErr) throw new Error(`user_roles ${r.email}: ${rErr.message}`)

  if (r.key === 'educator') {
    const { error: cmErr } = await admin
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'case_manager' }, { onConflict: 'user_id,role' })
    if (cmErr) throw new Error(`case_manager role ${r.email}: ${cmErr.message}`)
  }

  // admin_role (owner only)
  if (r.adminRole) {
    const { error: aErr } = await admin
      .from('admin_roles')
      .upsert({ user_id: user.id, role: r.adminRole }, { onConflict: 'user_id,role' })
    if (aErr) throw new Error(`admin_roles ${r.email}: ${aErr.message}`)
  }

  if (['student', 'parent', 'educator'].includes(r.key)) {
    const { data: existing } = await admin
      .from('students')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_demo', true)
      .limit(1)
      .maybeSingle()
    let studentId = existing?.id
    if (!studentId) {
      const { data: s, error: sErr } = await admin
        .from('students')
        .insert({
          owner_id: user.id,
          student_user_id: r.key === 'student' ? user.id : null,
          first_name: 'E2E',
          last_name: r.key === 'student' ? 'Student' : 'Learner',
          grade_band: '11-12',
          school: 'E2E Transition School',
          is_demo: true,
        })
        .select('id')
        .single()
      if (sErr || !s) throw new Error(`student ${r.email}: ${sErr?.message ?? 'missing row'}`)
      studentId = s.id
    }
    if (r.key === 'parent' || r.key === 'student') {
      const { data: existingGuardian } = await admin
        .from('student_guardians')
        .select('id')
        .eq('student_id', studentId)
        .eq('guardian_user_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!existingGuardian) {
        const { error: gErr } = await admin.from('student_guardians').insert({
          student_id: studentId,
          guardian_user_id: user.id,
          guardian_email: r.email,
          relationship: r.key,
          is_primary: true,
          verified: true,
        })
        if (gErr) throw new Error(`guardian ${r.email}: ${gErr.message}`)
      }
    }
    if (r.key === 'educator') {
      const { error: cErr } = await admin
        .from('student_collaborators')
        .upsert({
          student_id: studentId,
          user_id: user.id,
          invited_email: r.email,
          role: 'editor',
          status: 'accepted',
          invited_by: user.id,
          is_demo: true,
        }, { onConflict: 'student_id,invited_email' })
      if (cErr) throw new Error(`collaborator ${r.email}: ${cErr.message}`)
    }
  }

  if (['school_admin', 'district_admin', 'partner'].includes(r.key)) {
    const orgType = r.key === 'district_admin' ? 'district' : r.key === 'partner' ? 'partner' : 'school'
    const orgName = `E2E ${r.key.replace(/_/g, ' ')} Organization`
    const { data: existingOrg } = await admin
      .from('organizations')
      .select('id')
      .eq('name', orgName)
      .eq('type', orgType)
      .limit(1)
      .maybeSingle()
    let orgId = existingOrg?.id
    if (!orgId) {
      const { data: org, error: orgErr } = await admin
        .from('organizations')
        .insert({ name: orgName, type: orgType, city: 'Hartford', state: 'CT', verified_status: 'verified', status: 'active' })
        .select('id')
        .single()
      if (orgErr || !org) throw new Error(`organization ${r.email}: ${orgErr?.message ?? 'missing row'}`)
      orgId = org.id
    }
    const { error: mErr } = await admin
      .from('organization_memberships')
      .upsert({ organization_id: orgId, user_id: user.id, role_within_org: r.key, status: 'active', membership_status: 'active' }, { onConflict: 'organization_id,user_id' })
    if (mErr) throw new Error(`membership ${r.email}: ${mErr.message}`)
  }

  results.push({ key: r.key, email: r.email, password })
}

console.log('\nSeeded E2E role accounts:\n')
for (const r of results) {
  const upper = r.key.toUpperCase()
  console.log(`E2E_${upper}_EMAIL=${r.email}`)
  console.log(`E2E_${upper}_PASSWORD=${r.password}`)
}
