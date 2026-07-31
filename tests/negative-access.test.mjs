/**
 * Backend negative-access tests.
 *
 * These bypass the frontend entirely and talk to PostgREST / Storage
 * directly with the public anon key — exactly what an attacker with the
 * publishable key (which ships in the browser bundle) can do. Every case
 * MUST be denied by the backend, not by a UI guard.
 *
 * Run: node --test tests/negative-access.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const env = Object.fromEntries(
  fs
    .readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
assert.ok(URL_BASE && ANON, "Supabase URL/anon key must be present in .env");

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, Accept: "application/json" };

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body };
}

/** An anonymous read is "denied" when it errors OR returns zero rows. */
function assertNoRows(label, { status, body }) {
  if (status >= 400) return;
  assert.ok(Array.isArray(body), `${label}: expected array or error, got ${status}`);
  assert.equal(body.length, 0, `${label}: anon read leaked ${body.length} row(s)`);
}

// ---------------------------------------------------------------------------
// 1. Direct REST reads of tenant / student / family / partner-scoped tables
// ---------------------------------------------------------------------------
const PROTECTED_TABLES = [
  "students",
  "profiles",
  "documents",
  "document_extractions",
  "document_summaries",
  "pathway_reports",
  "pathway_recommendations",
  "student_relationships",
  "student_collaborators",
  "student_guardians",
  "student_team_members",
  "student_intakes",
  "collaboration_notes",
  "goals",
  "goal_statuses",
  "meetings",
  "meeting_agenda_items",
  "messages",
  "message_threads",
  "channels",
  "channel_messages",
  "channel_members",
  "channel_attachments",
  "organization_memberships",
  "organizations",
  "access_codes",
  "access_entitlements",
  "invitations",
  "admin_roles",
  "user_roles",
  "security_events",
  "audit_log",
  "waitlist",
  "consent_records",
  "notifications",
  "in_app_notifications",
  "email_send_log",
  "obs_events",
];

for (const table of PROTECTED_TABLES) {
  test(`anon cannot read public.${table}`, async () => {
    assertNoRows(table, await rest(`${table}?select=*&limit=5`));
  });
}

// ---------------------------------------------------------------------------
// 2. Direct-URL / row-targeted access (frontend guard fully bypassed)
// ---------------------------------------------------------------------------
test("anon cannot target an arbitrary student row by id", async () => {
  assertNoRows(
    "students by id",
    await rest("students?select=*&id=eq.00000000-0000-0000-0000-000000000001"),
  );
});

test("anon cannot enumerate documents by storage_path", async () => {
  assertNoRows("documents by path", await rest("documents?select=id,storage_path&limit=5"));
});

// ---------------------------------------------------------------------------
// 3. Anonymous writes must be rejected everywhere
// ---------------------------------------------------------------------------
const WRITE_TARGETS = [
  ["students", { full_name: "neg-test" }],
  ["user_roles", { user_id: "00000000-0000-0000-0000-000000000001", role: "admin" }],
  ["admin_roles", { user_id: "00000000-0000-0000-0000-000000000001", role: "platform_admin" }],
  ["organization_memberships", { organization_id: "00000000-0000-0000-0000-000000000001" }],
  ["security_events", { event_type: "password_change" }],
  ["documents", { title: "neg-test" }],
  ["channel_messages", { body: "neg-test" }],
];

for (const [table, payload] of WRITE_TARGETS) {
  test(`anon cannot insert into public.${table}`, async () => {
    const { status } = await rest(table, {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
    assert.ok(status >= 400, `anon INSERT into ${table} unexpectedly succeeded (${status})`);
  });
}

test("anon cannot escalate a role via UPDATE on user_roles", async () => {
  const { status } = await rest("user_roles?role=eq.parent", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ role: "admin" }),
  });
  assert.ok(status >= 400, `anon UPDATE user_roles unexpectedly succeeded (${status})`);
});

test("anon cannot delete audit rows (append-only guarantee)", async () => {
  for (const table of ["security_events", "audit_log", "channel_audit_events"]) {
    const { status } = await rest(`${table}?id=not.is.null`, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    });
    assert.ok(status >= 400, `anon DELETE on ${table} unexpectedly succeeded (${status})`);
  }
});

// ---------------------------------------------------------------------------
// 4. Privileged RPCs must not be callable anonymously
// ---------------------------------------------------------------------------
const RPC_CASES = [
  ["claim_admin_if_unclaimed", {}],
  ["redeem_access_code", { _code: "neg-test" }],
  ["accept_invitation_by_token", { _token: "neg-test" }],
  ["obs_slo_status", { _window_hours: 1 }],
  ["channel_retention_purge", {}],
];

for (const [fn, args] of RPC_CASES) {
  test(`anon call to rpc/${fn} is denied or empty`, async () => {
    const res = await fetch(`${URL_BASE}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (res.status < 400) {
      const body = await res.json().catch(() => null);
      const empty =
        body === null || body === false || (Array.isArray(body) && body.length === 0);
      assert.ok(empty, `rpc/${fn} returned data anonymously: ${JSON.stringify(body)?.slice(0, 200)}`);
    }
  });
}

// ---------------------------------------------------------------------------
// 5. Storage: every bucket is private, unsigned object URLs must 4xx
// ---------------------------------------------------------------------------
const BUCKETS = ["student-documents", "channel-attachments", "site-media"];

for (const bucket of BUCKETS) {
  test(`storage bucket ${bucket} rejects unsigned public object reads`, async () => {
    const res = await fetch(
      `${URL_BASE}/storage/v1/object/public/${bucket}/00000000-0000-0000-0000-000000000001/probe.pdf`,
    );
    assert.ok(res.status >= 400, `${bucket} served an object over the public URL (${res.status})`);
  });

  test(`storage bucket ${bucket} rejects anonymous listing`, async () => {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 5 }),
    });
    if (res.status < 400) {
      const body = await res.json().catch(() => []);
      assert.ok(
        Array.isArray(body) && body.length === 0,
        `${bucket} listed ${body?.length} object(s) anonymously`,
      );
    }
  });

  test(`storage bucket ${bucket} rejects anonymous upload`, async () => {
    const res = await fetch(
      `${URL_BASE}/storage/v1/object/${bucket}/00000000-0000-0000-0000-000000000001/neg-test.txt`,
      { method: "POST", headers: { ...headers, "Content-Type": "text/plain" }, body: "x" },
    );
    assert.ok(res.status >= 400, `${bucket} accepted an anonymous upload (${res.status})`);
  });
}

// ---------------------------------------------------------------------------
// 6. Auth surface: no anonymous sign-in, no metadata-driven authorization
// ---------------------------------------------------------------------------
test("anonymous sign-in is disabled on the auth server", async () => {
  const res = await fetch(`${URL_BASE}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.ok(res.status >= 400, `anonymous signup succeeded (${res.status})`);
});
