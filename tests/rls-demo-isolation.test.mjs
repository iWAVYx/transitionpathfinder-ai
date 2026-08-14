// RLS regression: authenticated non-demo users must never see is_demo=true rows.
//
// Demo data is seeded by the platform-admin Demo Hub and tagged
// is_demo=true on every seeded table. Isolation is enforced indirectly:
// RLS on each table is student-scoped through can_access_student() /
// owner_id = auth.uid(), and the demo student is owned by
// demo.parent@transitionforward.demo. A normal authenticated user is
// neither the owner, an accepted collaborator, nor an admin, so they
// must see zero is_demo rows on any seeded table.
//
// Run with:  node --test tests/rls-demo-isolation.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const QA_PARENT_EMAIL = "qa.parent@transitionforward.test";
const QA_PARENT_PASSWORD = process.env.STAGING_E2E_PASSWORD;
assert.ok(
  QA_PARENT_PASSWORD,
  "STAGING_E2E_PASSWORD is required for the fixed staging parent identity",
);

const DEMO_SEEDED_TABLES = [
  "students",
  "goals",
  "action_items",
  "calendar_events",
  "student_voice_responses",
  "readiness_scores",
  "pathway_reports",
  "student_resource_recommendations",
  "student_saved_partners",
  "student_collaborators",
];

function client(token) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

async function parentClient() {
  const c = client();
  const { error } = await c.auth.signInWithPassword({
    email: QA_PARENT_EMAIL,
    password: QA_PARENT_PASSWORD,
  });
  assert.ok(!error, `parent sign-in failed: ${error?.message}`);
  return c;
}

function assertNoLeak(label, { data, error }) {
  if (error) {
    const code = error.code ?? "";
    assert.ok(
      code === "42501" || code.startsWith("PGRST") || /permission|policy|denied/i.test(error.message),
      `${label}: unexpected error — ${code} ${error.message}`,
    );
    return;
  }
  assert.ok(Array.isArray(data), `${label}: expected array result`);
  assert.equal(
    data.length,
    0,
    `${label}: leaked ${data.length} is_demo row(s) — keys: ${Object.keys(data[0] ?? {}).join(",")}`,
  );
}

// ---------- ANON ----------

for (const table of DEMO_SEEDED_TABLES) {
  test(`anon cannot read is_demo=true rows from ${table}`, async () => {
    const c = client();
    assertNoLeak(
      `${table} (anon, is_demo)`,
      await c.from(table).select("id").eq("is_demo", true).limit(5),
    );
  });
}

// ---------- AUTHENTICATED non-demo user ----------

for (const table of DEMO_SEEDED_TABLES) {
  test(`authenticated parent cannot read is_demo=true rows from ${table}`, async () => {
    const c = await parentClient();
    try {
      assertNoLeak(
        `${table} (authenticated, is_demo)`,
        await c.from(table).select("id").eq("is_demo", true).limit(5),
      );
    } finally {
      await c.auth.signOut();
    }
  });
}
