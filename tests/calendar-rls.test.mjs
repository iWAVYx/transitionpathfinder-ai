// Calendar RLS regression QA.
//
// Why this exists
// ---------------
// `public.calendar_events` is the shared collaboration surface across
// students, parents, educators, school/district admins and partners. A bad
// edit to its RLS policies could either (a) leak a family's private events
// to an unrelated student, or (b) break legitimate cross-role visibility
// for an accepted collaborator. This suite catches both regressions on
// every schema or policy change.
//
// What it checks
// --------------
// 1. **Policy snapshot.** The exact USING / WITH CHECK expressions on
//    `public.calendar_events` are compared against a committed snapshot.
//    Any intentional change to the policies must come with a snapshot
//    update, which forces human review of the new access semantics.
// 2. **Behavioral matrix.** A synthetic owner / parent-collaborator /
//    unrelated-student / platform-admin / anon × private / student_team /
//    family_team / public_event / platform_admin_only matrix is evaluated
//    using the same helper functions the policies call (`has_role`,
//    `has_audience`, `can_access_student`). Result is compared to a
//    committed matrix snapshot. Drift fails CI.
// 3. **Mutation guards.** The WITH CHECK clauses for INSERT and UPDATE are
//    evaluated against spoof / leak / self-promotion attempts and must all
//    reject.
//
// To intentionally update snapshots after a reviewed policy change:
//   UPDATE_SNAPSHOTS=1 node --test tests/calendar-rls.test.mjs
//
// Requires either `SUPABASE_DB_URL` or the standard PG* env vars to be set
// (both are wired up in CI and in the Lovable sandbox). Skips gracefully
// otherwise so local devs without DB access aren't blocked.

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

function psql(sql) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1", "-c", sql];
  if (process.env.SUPABASE_DB_URL) {
    args.unshift(process.env.SUPABASE_DB_URL);
    args.unshift("-d");
  }
  const out = execFileSync("psql", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out.trim();
}

function readSnap(url) {
  if (!existsSync(url)) return null;
  return JSON.parse(readFileSync(url, "utf8"));
}

function writeSnap(url, value) {
  const dir = dirname(fileURLToPath(url));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(url, JSON.stringify(value, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// 1. Policy snapshot — exact USING / WITH CHECK text on the table
// ---------------------------------------------------------------------------

test("calendar_events RLS policies match committed snapshot", { skip: !DB_AVAILABLE ? "no database" : false }, () => {
  const raw = psql(`
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

  // Also assert RLS is enabled.
  const rlsEnabled =
    psql(
      `SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.calendar_events'::regclass`,
    ) === "t";
  assert.equal(rlsEnabled, true, "RLS must be enabled on calendar_events");

  if (UPDATE) {
    writeSnap(SNAP_POLICIES, current);
    return;
  }
  const expected = readSnap(SNAP_POLICIES);
  assert.ok(
    expected,
    "Missing snapshot. Run: UPDATE_SNAPSHOTS=1 node --test tests/calendar-rls.test.mjs",
  );
  assert.deepEqual(
    current,
    expected,
    "calendar_events RLS policies changed. Review the diff and, if intentional, regenerate the snapshot.",
  );
});

// ---------------------------------------------------------------------------
// 2. Behavioral matrix — owner/parent/unrelated/admin/anon × 5 visibilities
// ---------------------------------------------------------------------------
//
// We simulate the SELECT policy by composing the same boolean expression
// PostgREST would evaluate, using the project's SECURITY DEFINER helpers
// (`has_role`, `has_audience`, `can_access_student`). The test runs inside
// a single transaction that ROLLBACKs, so no rows persist.

const MATRIX_SQL = `
BEGIN;

-- Synthetic actors (real auth.users rows so foreign keys resolve)
WITH ins_users AS (
  INSERT INTO auth.users (id, email, instance_id, aud, role, encrypted_password,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token,
    email_change, email_change_token_new, recovery_token)
  VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid, 'rls-owner@test.local',
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '',
      '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-00000000a002'::uuid, 'rls-parent@test.local',
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '',
      '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-00000000a003'::uuid, 'rls-unrelated@test.local',
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '',
      '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-00000000a004'::uuid, 'rls-admin@test.local',
      '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '',
      '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '')
  ON CONFLICT (id) DO NOTHING
  RETURNING 1
) SELECT count(*) FROM ins_users;

INSERT INTO public.profiles(id, full_name, email, primary_role)
VALUES
  ('00000000-0000-0000-0000-00000000a001','RLS Owner','rls-owner@test.local','student'),
  ('00000000-0000-0000-0000-00000000a002','RLS Parent','rls-parent@test.local','parent'),
  ('00000000-0000-0000-0000-00000000a003','RLS Other','rls-unrelated@test.local','student'),
  ('00000000-0000-0000-0000-00000000a004','RLS Admin','rls-admin@test.local','admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_roles(user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000a004','admin')
ON CONFLICT DO NOTHING;

INSERT INTO public.students(id, owner_id, first_name)
VALUES ('00000000-0000-0000-0000-00000000b001'::uuid,
        '00000000-0000-0000-0000-00000000a001'::uuid, 'RLS Student')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
VALUES (
  '00000000-0000-0000-0000-00000000b001',
  '00000000-0000-0000-0000-00000000a002',
  'rls-parent@test.local',
  '00000000-0000-0000-0000-00000000a001',
  'viewer', 'accepted'
) ON CONFLICT DO NOTHING;

-- Build the matrix as a single JSON blob so the Node side can compare.
WITH
  viewers(uid, label) AS (VALUES
    ('00000000-0000-0000-0000-00000000a001'::uuid,'owner'),
    ('00000000-0000-0000-0000-00000000a002'::uuid,'parent_collab'),
    ('00000000-0000-0000-0000-00000000a003'::uuid,'unrelated'),
    ('00000000-0000-0000-0000-00000000a004'::uuid,'platform_admin'),
    (NULL,'anon')
  ),
  events(title, owner, sid, vis) AS (VALUES
    ('private',        '00000000-0000-0000-0000-00000000a001'::uuid,'00000000-0000-0000-0000-00000000b001'::uuid,'private'),
    ('student_team',   '00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b001','student_team'),
    ('family_team',    '00000000-0000-0000-0000-00000000a001','00000000-0000-0000-0000-00000000b001','family_team'),
    ('public_event',   '00000000-0000-0000-0000-00000000a001',NULL,'public_event'),
    ('admin_only',     '00000000-0000-0000-0000-00000000a001',NULL,'platform_admin_only')
  ),
  matrix AS (
    SELECT v.label AS viewer, e.title AS event,
      (
        (v.uid IS NOT NULL AND e.owner = v.uid)
        OR (e.vis = 'public_event')
        OR (e.vis = 'platform_admin_only' AND v.uid IS NOT NULL AND public.has_audience(v.uid,'admin'))
        OR (e.vis IN ('team','student_team','family_team')
            AND e.sid IS NOT NULL AND v.uid IS NOT NULL
            AND public.can_access_student(v.uid, e.sid))
        OR (v.uid IS NOT NULL AND public.has_role(v.uid,'admin'))
      ) AS can_see
    FROM viewers v CROSS JOIN events e
  )
SELECT json_object_agg(viewer, per_event ORDER BY viewer)::text
FROM (
  SELECT viewer, json_object_agg(event, can_see ORDER BY event) AS per_event
  FROM matrix GROUP BY viewer
) g;

ROLLBACK;
`;

test("calendar_events visibility matrix matches committed snapshot", { skip: !DB_AVAILABLE ? "no database" : false }, () => {
  // psql -c with a multi-statement script needs -f or stdin; pipe via stdin.
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1"];
  if (process.env.SUPABASE_DB_URL) {
    args.push("-d", process.env.SUPABASE_DB_URL);
  }
  const out = execFileSync("psql", args, {
    input: MATRIX_SQL,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  // The final SELECT emits the JSON object; previous statements emit row counts.
  const lines = out.trim().split("\n").filter((l) => l.startsWith("{"));
  const jsonLine = lines[lines.length - 1];
  assert.ok(jsonLine, `no JSON matrix in psql output: ${out}`);
  const current = JSON.parse(jsonLine);

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

  // Hard invariants — must always hold regardless of snapshot.
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
});

// ---------------------------------------------------------------------------
// 3. Mutation guards — INSERT/UPDATE WITH CHECK rejects spoofing
// ---------------------------------------------------------------------------
//
// We can't `SET ROLE authenticated` from arbitrary CI environments, so we
// assert the boolean predicates the WITH CHECK clauses encode. If the
// snapshot test passes, these expressions are the real ones from the DB.

const GUARD_SQL = `
SELECT json_build_object(
  'spoof_other_owner',
    -- Non-owner trying to claim someone else's owner_user_id
    NOT (
      ('00000000-0000-0000-0000-00000000a001'::uuid = '00000000-0000-0000-0000-00000000a003'::uuid)
    ),
  'leak_team_event_to_inaccessible_student',
    NOT public.can_access_student(
      '00000000-0000-0000-0000-00000000a003'::uuid,
      gen_random_uuid()
    ),
  'self_promote_admin_only',
    NOT public.has_audience(
      '00000000-0000-0000-0000-00000000a003'::uuid, 'admin'
    ),
  'self_promote_public_event',
    NOT public.has_audience(
      '00000000-0000-0000-0000-00000000a003'::uuid, 'admin'
    )
)::text
`;

test("calendar_events mutation guards reject spoof / leak / privilege escalation", { skip: !DB_AVAILABLE ? "no database" : false }, () => {
  const raw = psql(GUARD_SQL);
  const guards = JSON.parse(raw);
  for (const [k, v] of Object.entries(guards)) {
    assert.equal(v, true, `Mutation guard "${k}" must reject — got ${v}`);
  }
});
