// RLS + column-level privilege regression tests.
//
// Verifies that PII (emails, tokens, internal records) is NOT readable from
// either an unauthenticated (anon) client or an authenticated user without
// the right role. Covers the protections set up via RLS policies and
// column-level REVOKEs on contact_email columns.
//
// Run with:  node --test tests/rls-pii-access.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const QA_PARENT_EMAIL = "qa.parent@transitionforward.test";
const QA_PARENT_PASSWORD = "TestPass!2026";

function client(token) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

async function parentClient() {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `parent sign-in failed: ${error?.message}`);
  return { client: c, user: data.user };
}

/**
 * Assert that a SELECT either returns zero rows (RLS hides them) OR fails with
 * a permission-denied error (column-level REVOKE or table-level deny).
 * Both outcomes mean the caller cannot read this data.
 */
function assertNoLeak(label, { data, error }) {
  if (error) {
    // 42501 = insufficient_privilege, PGRST = policy denied / no policy match.
    const code = error.code ?? "";
    assert.ok(
      code === "42501" || code.startsWith("PGRST") || /permission|policy|denied/i.test(error.message),
      `${label}: unexpected error shape — ${code} ${error.message}`,
    );
    return;
  }
  assert.ok(Array.isArray(data), `${label}: expected array result`);
  assert.equal(
    data.length,
    0,
    `${label}: leaked ${data.length} row(s) — first row keys: ${Object.keys(data[0] ?? {}).join(",")}`,
  );
}

// ---------- ANON (unauthenticated) reads ----------

test("anon cannot read organizations.contact_email column", async () => {
  const c = client();
  // Selecting the column directly must be blocked by column-level REVOKE.
  const res = await c.from("organizations").select("contact_email").limit(1);
  assert.ok(res.error, "anon SELECT of contact_email must fail");
  assert.match(
    `${res.error.code ?? ""} ${res.error.message}`,
    /42501|permission|denied/i,
    `expected privilege error, got: ${res.error.code} ${res.error.message}`,
  );
});

test("anon cannot read partner_opportunities.contact_email column", async () => {
  const c = client();
  const res = await c.from("partner_opportunities").select("contact_email").limit(1);
  assert.ok(res.error, "anon SELECT of contact_email must fail");
  assert.match(
    `${res.error.code ?? ""} ${res.error.message}`,
    /42501|permission|denied/i,
  );
});

test("anon cannot read admin_invitations (tokens, invitee emails)", async () => {
  const c = client();
  assertNoLeak("admin_invitations", await c.from("admin_invitations").select("id,email,token").limit(1));
});

test("anon cannot read admin_roles", async () => {
  const c = client();
  assertNoLeak("admin_roles", await c.from("admin_roles").select("user_id,role").limit(1));
});

test("anon cannot read contact_submissions (inbound PII)", async () => {
  const c = client();
  assertNoLeak("contact_submissions", await c.from("contact_submissions").select("email,first_name,message").limit(1));
});

test("anon cannot read email_send_log", async () => {
  const c = client();
  assertNoLeak("email_send_log", await c.from("email_send_log").select("recipient_email").limit(1));
});

test("anon cannot read email_unsubscribe_tokens", async () => {
  const c = client();
  assertNoLeak("email_unsubscribe_tokens", await c.from("email_unsubscribe_tokens").select("email,token").limit(1));
});

test("anon cannot read students", async () => {
  const c = client();
  assertNoLeak("students", await c.from("students").select("id,first_name,owner_id").limit(1));
});

test("anon cannot read profiles", async () => {
  const c = client();
  assertNoLeak("profiles", await c.from("profiles").select("id,email").limit(1));
});

test("anon cannot read audit_log", async () => {
  const c = client();
  assertNoLeak("audit_log", await c.from("audit_log").select("actor_email,action").limit(1));
});

test("anon cannot read admin_activity_logs", async () => {
  const c = client();
  assertNoLeak("admin_activity_logs", await c.from("admin_activity_logs").select("admin_user_id,action_type").limit(1));
});

test("anon cannot read user_roles", async () => {
  const c = client();
  assertNoLeak("user_roles", await c.from("user_roles").select("user_id,role").limit(1));
});

test("anon cannot read consent_records", async () => {
  const c = client();
  assertNoLeak("consent_records", await c.from("consent_records").select("consenting_user_id,student_id").limit(1));
});

// ---------- AUTHENTICATED (parent role) reads ----------

test("authenticated parent cannot read organizations.contact_email column", async () => {
  const { client: c } = await parentClient();
  try {
    const res = await c.from("organizations").select("contact_email").limit(1);
    assert.ok(res.error, "authenticated SELECT of contact_email must fail");
    assert.match(
      `${res.error.code ?? ""} ${res.error.message}`,
      /42501|permission|denied/i,
    );
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read partner_opportunities.contact_email column", async () => {
  const { client: c } = await parentClient();
  try {
    const res = await c.from("partner_opportunities").select("contact_email").limit(1);
    assert.ok(res.error, "authenticated SELECT of contact_email must fail");
    assert.match(
      `${res.error.code ?? ""} ${res.error.message}`,
      /42501|permission|denied/i,
    );
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read contact_submissions (admin only)", async () => {
  const { client: c } = await parentClient();
  try {
    assertNoLeak("contact_submissions", await c.from("contact_submissions").select("email,message").limit(1));
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read admin_invitations (admin only)", async () => {
  const { client: c } = await parentClient();
  try {
    assertNoLeak("admin_invitations", await c.from("admin_invitations").select("email,token").limit(1));
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read email_send_log (admin only)", async () => {
  const { client: c } = await parentClient();
  try {
    assertNoLeak("email_send_log", await c.from("email_send_log").select("recipient_email").limit(1));
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read admin_activity_logs (platform admin only)", async () => {
  const { client: c } = await parentClient();
  try {
    assertNoLeak("admin_activity_logs", await c.from("admin_activity_logs").select("admin_user_id").limit(1));
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read other users' profiles email", async () => {
  const { client: c, user } = await parentClient();
  try {
    // Selecting profiles excluding own user — must return zero rows under RLS.
    const res = await c
      .from("profiles")
      .select("id,email")
      .neq("id", user.id)
      .limit(5);
    assertNoLeak("profiles (other users)", res);
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot escalate to admin via user_roles insert", async () => {
  const { client: c, user } = await parentClient();
  try {
    const { error } = await c
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    assert.ok(error, "self-promotion to admin must be rejected by RLS");
  } finally {
    await c.auth.signOut();
  }
});

test("authenticated parent cannot read other users' students", async () => {
  const { client: c, user } = await parentClient();
  try {
    const res = await c
      .from("students")
      .select("id,first_name,owner_id")
      .neq("owner_id", user.id)
      .limit(5);
    assertNoLeak("students (not owned/shared)", res);
  } finally {
    await c.auth.signOut();
  }
});
