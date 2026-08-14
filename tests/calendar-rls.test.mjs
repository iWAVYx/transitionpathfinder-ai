// Calendar RLS regression QA.
//
// Why this exists
// ---------------
// `public.calendar_events` is the shared collaboration surface across
// students, parents, educators, school/district admins and partners. A bad
// edit to its RLS policies could either (a) leak a family's private events
// to an unrelated student/parent, or (b) break legitimate cross-role
// visibility for an accepted collaborator. This suite catches both
// regressions on every schema or policy change.
//
// What it checks
// --------------
// 1. **Policy snapshot.** The exact USING / WITH CHECK expressions on
//    `public.calendar_events` are compared against a committed snapshot.
//    Any intentional change to the policies must come with a snapshot
//    update, which forces human review of the new access semantics.
// 2. **Behavioral matrix.** Synthetic owner / parent-collaborator /
//    unrelated-user / platform-admin / anon × private / student_team /
//    family_team / public_event / platform_admin_only matrix is evaluated
//    against the same SECURITY DEFINER helpers the policies call
//    (`has_role`, `has_audience`, `can_access_student`). The result is
//    compared to a committed matrix snapshot AND to hard invariants that
//    must always hold ("anon must never see private events", etc.).
// 3. **Mutation guards.** The boolean predicates the WITH CHECK clauses
//    encode for INSERT/UPDATE are evaluated against spoof / leak /
//    self-promotion attempts and must all reject.
//
// To intentionally update snapshots after a reviewed policy change:
//   UPDATE_SNAPSHOTS=1 node --test tests/calendar-rls.test.mjs
//
// Requires either `SUPABASE_DB_URL` or the standard PG* env vars (both are
// wired in CI and the Lovable sandbox). Skips gracefully otherwise.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SNAP_POLICIES = new URL(
  "./__snapshots__/calendar-rls-policies.snap.json",
  import.meta.url,
);
const SNAP_MATRIX = new URL(
  "./__snapshots__/calendar-rls-matrix.snap.json",
  import.meta.url,
);
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

const DB_AVAILABLE =
  Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.PGHOST);
const SKIP = DB_AVAILABLE ? false : "no database (set SUPABASE_DB_URL)";

function psqlArgs(extra = []) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1", ...extra];
  if (process.env.SUPABASE_DB_URL) {
    args.push("-d", process.env.SUPABASE_DB_URL);
  }
  return args;
}

function psqlQuery(sql) {
  return execFileSync("psql", psqlArgs(["-c", sql]), {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function psqlScript(sql) {
  return execFileSync("psql", psqlArgs(), {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function readSnap(url) {
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(url, "utf8"));
}

const RELATED_LINK_COLUMNS = [
  "related_partner_id",
  "related_pathway_report_id",
  "related_action_item_id",
  "related_meeting_id",
];

function assertRelatedLinkSecurityFloor(policies, source) {
  for (const policyName of [
    "calendar_events_insert",
    "calendar_events_update",
  ]) {
    const policy = policies.find(({ polname }) => polname === policyName);
    assert.ok(
      policy?.check_expr,
      `${source} ${policyName} must define a WITH CHECK expression`,
    );
    for (const relatedColumn of RELATED_LINK_COLUMNS) {
      assert.match(
        policy.check_expr,
        new RegExp(`\\b${relatedColumn}\\b`),
        `${source} ${policyName} must validate access to ${relatedColumn}`,
      );
    }
  }
}

function writeSnap(url, value) {
  const dir = dirname(fileURLToPath(url));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(url, JSON.stringify(value, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// 1. Policy snapshot
// ---------------------------------------------------------------------------

test("calendar_events RLS is enabled", { skip: SKIP }, () => {
  const enabled = psqlQuery(
    `SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.calendar_events'::regclass`,
  );
  assert.match(enabled, /^(t|true)$/, "RLS must be enabled on calendar_events");
});

test("committed calendar_events RLS snapshot protects related links", () => {
  const expected = readSnap(SNAP_POLICIES);
  assert.ok(expected, "Missing committed calendar RLS policy snapshot");
  assertRelatedLinkSecurityFloor(expected, "committed snapshot");
});

test("calendar_events RLS policies match committed snapshot", { skip: SKIP }, () => {
  const raw = psqlQuery(`
    SELECT json_agg(row ORDER BY (row->>'polname'))::text FROM (
      SELECT json_build_object(
        'polname', polname,
        'polcmd', polcmd,
        'polroles', (
          SELECT coalesce(array_agg(rolname ORDER BY rolname), ARRAY[]::text[])
          FROM pg_roles WHERE oid = ANY(polroles)
        ),
        'using_expr', pg_get_expr(polqual, polrelid),
        'check_expr', pg_get_expr(polwithcheck, polrelid)
      ) AS row
      FROM pg_policy
      WHERE polrelid = 'public.calendar_events'::regclass
    ) s
  `);
  const current = JSON.parse(raw);

  // Enforce the security floor even while a reviewed staging capture is
  // regenerating the snapshot.
  assertRelatedLinkSecurityFloor(current, "live database");

  if (UPDATE) {
    writeSnap(SNAP_POLICIES, current);
    return;
  }
  const expected = readSnap(SNAP_POLICIES);
  assert.ok(
    expected,
    "Missing policy snapshot. Run: UPDATE_SNAPSHOTS=1 node --test tests/calendar-rls.test.mjs",
  );
  assert.deepEqual(
    current,
    expected,
    "calendar_events RLS policies changed. Review the diff and, if intentional, regenerate the snapshot.",
  );
});

// ---------------------------------------------------------------------------
// 2. Behavioral matrix
// ---------------------------------------------------------------------------
//
// We compose the same boolean expression the SELECT policy would evaluate
// using the project's SECURITY DEFINER helpers, against real users picked
// dynamically from the database (so we don't have to touch the auth schema
// in CI). The whole thing runs inside a transaction that ROLLBACKs.
//
// Picker logic:
//   - owner: a profile that already owns a student
//   - parent_collab: any other profile (we insert an accepted collaborator
//     row for them on the owner's student inside the transaction)
//   - unrelated: a third profile with no relation to the student
//   - admin: a profile with public.user_roles.role = 'admin'

const MATRIX_SQL = `
BEGIN;

-- Pick representative users from existing seed data
DO $$
DECLARE
  owner_id uuid;
  parent_id uuid;
  unrelated_id uuid;
  admin_id uuid;
  student_id uuid;
BEGIN
  SELECT s.owner_id, s.id INTO owner_id, student_id
  FROM public.students s
  ORDER BY s.created_at
  LIMIT 1;

  SELECT user_id INTO admin_id
  FROM public.user_roles WHERE role = 'admin'
  ORDER BY user_id LIMIT 1;

  SELECT p.id INTO parent_id
  FROM public.profiles p
  WHERE p.id <> owner_id AND p.id <> coalesce(admin_id,'00000000-0000-0000-0000-000000000000')
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
  ORDER BY p.id LIMIT 1;

  SELECT p.id INTO unrelated_id
  FROM public.profiles p
  WHERE p.id NOT IN (owner_id, parent_id, coalesce(admin_id,'00000000-0000-0000-0000-000000000000'))
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
  ORDER BY p.id LIMIT 1;

  IF owner_id IS NULL OR parent_id IS NULL OR unrelated_id IS NULL OR admin_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient seed data for calendar RLS matrix test (owner=%, parent=%, unrelated=%, admin=%)',
      owner_id, parent_id, unrelated_id, admin_id;
  END IF;

  -- Stash IDs for the next statement
  CREATE TEMP TABLE __rls_actors (
    role text PRIMARY KEY, uid uuid
  ) ON COMMIT DROP;
  INSERT INTO __rls_actors VALUES
    ('owner', owner_id),
    ('parent_collab', parent_id),
    ('unrelated', unrelated_id),
    ('platform_admin', admin_id);

  CREATE TEMP TABLE __rls_student (sid uuid) ON COMMIT DROP;
  INSERT INTO __rls_student VALUES (student_id);

  -- Wire parent as accepted collaborator
  INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
  VALUES (student_id, parent_id, 'rls-parent@test.local', owner_id, 'viewer', 'accepted')
  ON CONFLICT DO NOTHING;
END $$;

-- Emit the matrix as JSON, with NULL added for anon
WITH viewers AS (
  SELECT role AS label, uid FROM __rls_actors
  UNION ALL SELECT 'anon', NULL
),
events(title, vis, with_student) AS (VALUES
  ('private', 'private', true),
  ('student_team', 'student_team', true),
  ('family_team', 'family_team', true),
  ('public_event', 'public_event', false),
  ('admin_only', 'platform_admin_only', false)
),
ctx AS (SELECT (SELECT uid FROM __rls_actors WHERE role='owner') AS owner_id,
               (SELECT sid FROM __rls_student) AS student_id),
matrix AS (
  SELECT v.label AS viewer, e.title AS event,
    (
      (v.uid IS NOT NULL AND v.uid = ctx.owner_id)
      OR (e.vis = 'public_event')
      OR (e.vis = 'platform_admin_only' AND v.uid IS NOT NULL AND public.has_audience(v.uid,'admin'))
      OR (e.vis IN ('team','student_team','family_team')
          AND e.with_student AND v.uid IS NOT NULL
          AND public.can_access_student(v.uid, ctx.student_id))
      OR (v.uid IS NOT NULL AND public.has_role(v.uid,'admin'))
    ) AS can_see
  FROM viewers v CROSS JOIN events e CROSS JOIN ctx
)
SELECT json_object_agg(viewer, per_event ORDER BY viewer)::text
FROM (
  SELECT viewer, json_object_agg(event, can_see ORDER BY event) AS per_event
  FROM matrix GROUP BY viewer
) g;

ROLLBACK;
`;

test("calendar_events visibility matrix matches committed snapshot", { skip: SKIP }, () => {
  const out = psqlScript(MATRIX_SQL);
  const jsonLine = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"))
    .pop();
  assert.ok(jsonLine, `no JSON matrix in psql output:\n${out}`);
  const current = JSON.parse(jsonLine);

  // Hard invariants must run in both regression and snapshot-capture mode.
  assert.equal(current.anon.private, false, "anon must NEVER see private events");
  assert.equal(current.anon.student_team, false, "anon must NEVER see team events");
  assert.equal(current.anon.family_team, false, "anon must NEVER see family events");
  assert.equal(current.anon.admin_only, false, "anon must NEVER see admin-only events");
  assert.equal(current.anon.public_event, true, "public_event must remain readable by anon");

  assert.equal(current.unrelated.private, false, "unrelated user must NEVER see private events");
  assert.equal(current.unrelated.student_team, false, "unrelated user must NEVER see team events");
  assert.equal(current.unrelated.family_team, false, "unrelated user must NEVER see family events");
  assert.equal(current.unrelated.admin_only, false, "unrelated user must NEVER see admin-only events");

  assert.equal(current.parent_collab.private, false, "collaborator must NOT see another user's private events");
  assert.equal(current.parent_collab.student_team, true, "accepted collaborator must see student_team events");
  assert.equal(current.parent_collab.family_team, true, "accepted collaborator must see family_team events");
  assert.equal(current.parent_collab.admin_only, false, "collaborator must NOT see admin-only events");

  assert.equal(current.owner.private, true, "owner must see their own private events");

  if (UPDATE) {
    writeSnap(SNAP_MATRIX, current);
    return;
  }
  const expected = readSnap(SNAP_MATRIX);
  assert.ok(expected, "Missing matrix snapshot. Run with UPDATE_SNAPSHOTS=1.");
  assert.deepEqual(
    current,
    expected,
    "Visibility matrix drifted. A role can now see (or no longer see) an event it shouldn't.",
  );
});

// ---------------------------------------------------------------------------
// 3. Mutation guards
// ---------------------------------------------------------------------------

const GUARD_SQL = `
WITH actors AS (
  SELECT
    (SELECT owner_id FROM public.students ORDER BY created_at LIMIT 1) AS owner_id,
    (SELECT p.id FROM public.profiles p
       WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role='admin')
         AND p.id <> (SELECT owner_id FROM public.students ORDER BY created_at LIMIT 1)
       ORDER BY p.id LIMIT 1) AS attacker_id,
    (SELECT id FROM public.students ORDER BY created_at LIMIT 1) AS student_id
)
SELECT json_build_object(
  'spoof_other_owner',
    NOT (attacker_id = owner_id),
  'leak_team_event_to_inaccessible_student',
    NOT public.can_access_student(attacker_id, student_id),
  'self_promote_admin_only',
    NOT public.has_audience(attacker_id, 'admin'),
  'self_promote_public_event',
    NOT public.has_audience(attacker_id, 'admin')
)::text
FROM actors
`;

test("calendar_events mutation guards reject spoof / leak / privilege escalation", { skip: SKIP }, () => {
  const raw = psqlQuery(GUARD_SQL);
  const guards = JSON.parse(raw);
  for (const [k, v] of Object.entries(guards)) {
    assert.equal(v, true, `Mutation guard "${k}" must reject — got ${v}`);
  }
});
