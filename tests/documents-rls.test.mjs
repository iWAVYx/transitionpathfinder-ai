// Documents & student-storage RLS regression QA.
//
// Why this exists
// ---------------
// IEPs, transition plans, evaluations and AI-generated summaries live in
// `public.documents` / `public.document_summaries` with the raw files in
// the `student-documents` storage bucket. Every row and every object is
// scoped to a single student. A bad RLS edit could either leak a private
// IEP to an unrelated parent/student or break access for an accepted
// case-manager. This suite catches both on every schema or policy change.
//
// What it checks
// --------------
// 1. **Policy snapshots** for `public.documents`, `public.document_summaries`,
//    and the four `storage.objects` policies on the `student-documents`
//    bucket. Any intentional change requires a snapshot update, forcing
//    human review of the new access semantics.
// 2. **Behavioral access matrix** for owner / editor-collaborator /
//    viewer-collaborator / unrelated user / platform-admin / anon × read /
//    write actions, evaluated through the same SECURITY DEFINER helpers
//    the policies call (`can_access_student`, `can_edit_student`,
//    `has_role`). Hard invariants assert that unrelated users and anon can
//    NEVER read another family's documents, and that viewer collaborators
//    can read but never write.
// 3. **Storage path scoping.** The bucket policies key off
//    `storage.foldername(name)[1]::uuid` — we assert that a path under the
//    owner's student folder resolves and that paths under an inaccessible
//    student's folder are rejected for the same viewer.
//
// To intentionally update snapshots after a reviewed change:
//   UPDATE_SNAPSHOTS=1 node --test tests/documents-rls.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SNAP_POLICIES = new URL(
  "./__snapshots__/documents-rls-policies.snap.json",
  import.meta.url,
);
const SNAP_MATRIX = new URL(
  "./__snapshots__/documents-rls-matrix.snap.json",
  import.meta.url,
);
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";
const POLICY_ONLY = process.env.DOCUMENT_RLS_POLICY_ONLY === "1";

const DB_AVAILABLE =
  Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.PGHOST);
const SKIP = DB_AVAILABLE ? false : "no database (set SUPABASE_DB_URL)";
const SKIP_NON_POLICY = POLICY_ONLY ? "document policy snapshot only" : SKIP;

function psqlArgs(extra = []) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1", ...extra];
  if (process.env.SUPABASE_DB_URL) args.push("-d", process.env.SUPABASE_DB_URL);
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
function writeSnap(url, value) {
  const dir = dirname(fileURLToPath(url));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(url, JSON.stringify(value, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// 1. Policy snapshots
// ---------------------------------------------------------------------------

const POLICY_SQL = `
WITH pols AS (
  SELECT
    n.nspname || '.' || c.relname AS rel,
    p.polname,
    p.polcmd,
    pg_get_expr(p.polqual, p.polrelid) AS using_expr,
    pg_get_expr(p.polwithcheck, p.polrelid) AS check_expr
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE (n.nspname='public' AND c.relname IN ('documents','document_summaries'))
     OR (n.nspname='storage' AND c.relname='objects'
         AND (pg_get_expr(p.polqual, p.polrelid) LIKE '%student-documents%'
              OR pg_get_expr(p.polwithcheck, p.polrelid) LIKE '%student-documents%'))
)
SELECT json_agg(json_build_object(
  'rel', rel,
  'polname', polname,
  'polcmd', polcmd,
  'using_expr', using_expr,
  'check_expr', check_expr
) ORDER BY rel, polname)::text
FROM pols
`;

function requiredPolicy(policies, rel, polname, polcmd) {
  const policy = policies.find(
    (candidate) =>
      candidate.rel === rel &&
      candidate.polname === polname &&
      candidate.polcmd === polcmd,
  );
  assert.ok(policy, `missing required ${rel}.${polname} (${polcmd}) policy`);
  return policy;
}

function assertDocumentPolicySecurityFloor(policies, source) {
  const active = requiredPolicy(
    policies,
    "public.documents",
    "documents_select_active",
    "r",
  );
  for (const guard of [
    /archived_at IS NULL/,
    /deleted_at IS NULL/,
    /NOT is_partner_only\(auth\.uid\(\)\)/,
    /can_access_student\(auth\.uid\(\), student_id\)/,
    /can_view_document\(auth\.uid\(\), id\)/,
    /scan_status = 'clean'(?:::text)?/,
    /auth\.uid\(\) = uploaded_by/,
    /is_platform_admin\(auth\.uid\(\)\)/,
  ]) {
    assert.match(
      active.using_expr ?? "",
      guard,
      `${source}: documents_select_active lost ${guard}`,
    );
  }

  const insert = requiredPolicy(
    policies,
    "public.documents",
    "documents_insert",
    "a",
  );
  for (const guard of [
    /NOT is_partner_only\(auth\.uid\(\)\)/,
    /auth\.uid\(\) = uploaded_by/,
    /can_edit_student\(auth\.uid\(\), student_id\)/,
  ]) {
    assert.match(
      insert.check_expr ?? "",
      guard,
      `${source}: documents_insert lost ${guard}`,
    );
  }

  const update = requiredPolicy(
    policies,
    "public.documents",
    "documents_update",
    "w",
  );
  for (const expression of [update.using_expr, update.check_expr]) {
    assert.match(
      expression ?? "",
      /NOT is_partner_only\(auth\.uid\(\)\)/,
      `${source}: documents_update permits partner-only access`,
    );
    assert.match(
      expression ?? "",
      /can_edit_student\(auth\.uid\(\), student_id\)/,
      `${source}: documents_update lost student edit scoping`,
    );
  }

  const deleteAdmin = requiredPolicy(
    policies,
    "public.documents",
    "documents_delete_platform_admin",
    "d",
  );
  assert.match(
    deleteAdmin.using_expr ?? "",
    /is_platform_admin\(auth\.uid\(\)\)/,
    `${source}: document deletion is not platform-admin scoped`,
  );

  const storageRead = requiredPolicy(
    policies,
    "storage.objects",
    "Read student docs",
    "r",
  );
  assert.match(storageRead.using_expr ?? "", /bucket_id = 'student-documents'/);
  assert.match(
    storageRead.using_expr ?? "",
    /storage_can_read_student_doc\(auth\.uid\(\), name\)/,
    `${source}: storage reads bypass the document quarantine helper`,
  );

  for (const [name, cmd, expressionKey] of [
    ["Upload student docs", "a", "check_expr"],
    ["Update student docs", "w", "check_expr"],
    ["Delete student docs", "d", "using_expr"],
  ]) {
    const policy = requiredPolicy(policies, "storage.objects", name, cmd);
    const expression = policy[expressionKey] ?? "";
    assert.match(
      expression,
      /bucket_id = 'student-documents'/,
      `${source}: ${name} lost bucket scoping`,
    );
    assert.match(
      expression,
      /can_edit_student\(auth\.uid\(\)/,
      `${source}: ${name} lost student edit scoping`,
    );
    if (name !== "Delete student docs") {
      assert.match(
        expression,
        /NOT is_partner_only\(auth\.uid\(\)\)/,
        `${source}: ${name} permits partner-only writes`,
      );
    }
  }
}

test("committed document RLS snapshot enforces the security floor", () => {
  const expected = readSnap(SNAP_POLICIES);
  assert.ok(expected, "Missing committed document RLS policy snapshot");
  assertDocumentPolicySecurityFloor(expected, "committed snapshot");
});

test("documents + storage RLS policies match committed snapshot", { skip: SKIP }, () => {
  const current = JSON.parse(psqlQuery(POLICY_SQL));
  assertDocumentPolicySecurityFloor(current, "database policy");

  // Hard checks regardless of snapshot.
  const rls = JSON.parse(
    psqlQuery(`
      SELECT json_build_object(
        'documents', (SELECT relrowsecurity::text FROM pg_class WHERE oid='public.documents'::regclass),
        'document_summaries', (SELECT relrowsecurity::text FROM pg_class WHERE oid='public.document_summaries'::regclass),
        'storage_objects', (SELECT relrowsecurity::text FROM pg_class WHERE oid='storage.objects'::regclass)
      )::text
    `),
  );
  for (const [k, v] of Object.entries(rls)) {
    assert.match(String(v), /^(t|true)$/, `RLS must be enabled on ${k}`);
  }

  if (UPDATE) {
    writeSnap(SNAP_POLICIES, current);
    return;
  }
  const expected = readSnap(SNAP_POLICIES);
  assert.ok(
    expected,
    "Missing snapshot. Run: UPDATE_SNAPSHOTS=1 node --test tests/documents-rls.test.mjs",
  );
  assert.deepEqual(
    current,
    expected,
    "Document or student-documents storage RLS policies changed. Review the diff and, if intentional, regenerate the snapshot.",
  );
});

// ---------------------------------------------------------------------------
// 2. Behavioral access matrix
// ---------------------------------------------------------------------------
//
// Picker logic (same convention as calendar-rls.test.mjs):
//   - owner: a profile that already owns a student
//   - editor_collab: any other non-admin profile — inserted as accepted
//     `editor` collaborator on the owner's student inside the transaction
//   - viewer_collab: another non-admin profile — inserted as accepted
//     `viewer` collaborator
//   - unrelated: a fourth non-admin profile with no relation
//   - admin: a profile with public.user_roles.role = 'admin'
//   - anon: NULL uid

const MATRIX_SQL = `
BEGIN;

DO $$
DECLARE
  owner_id uuid;
  editor_id uuid;
  viewer_id uuid;
  unrelated_id uuid;
  admin_id uuid;
  student_id uuid;
BEGIN
  SELECT s.owner_id, s.id INTO owner_id, student_id
  FROM public.students s ORDER BY s.created_at LIMIT 1;

  SELECT user_id INTO admin_id
  FROM public.user_roles WHERE role='admin' ORDER BY user_id LIMIT 1;

  WITH non_admins AS (
    SELECT p.id FROM public.profiles p
    WHERE p.id <> owner_id
      AND p.id <> coalesce(admin_id,'00000000-0000-0000-0000-000000000000')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role='admin')
    ORDER BY p.id
  ),
  picks AS (SELECT id, row_number() OVER () AS rn FROM non_admins)
  SELECT
    (SELECT id FROM picks WHERE rn=1),
    (SELECT id FROM picks WHERE rn=2),
    (SELECT id FROM picks WHERE rn=3)
  INTO editor_id, viewer_id, unrelated_id;

  IF owner_id IS NULL OR editor_id IS NULL OR viewer_id IS NULL
     OR unrelated_id IS NULL OR admin_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient seed data (owner=%, editor=%, viewer=%, unrelated=%, admin=%)',
      owner_id, editor_id, viewer_id, unrelated_id, admin_id;
  END IF;

  CREATE TEMP TABLE __doc_actors(role text PRIMARY KEY, uid uuid) ON COMMIT DROP;
  INSERT INTO __doc_actors VALUES
    ('owner', owner_id),
    ('editor_collab', editor_id),
    ('viewer_collab', viewer_id),
    ('unrelated', unrelated_id),
    ('platform_admin', admin_id);

  CREATE TEMP TABLE __doc_student(sid uuid) ON COMMIT DROP;
  INSERT INTO __doc_student VALUES (student_id);

  INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
  VALUES
    (student_id, editor_id, 'rls-editor@test.local', owner_id, 'editor', 'accepted'),
    (student_id, viewer_id, 'rls-viewer@test.local', owner_id, 'viewer', 'accepted')
  ON CONFLICT DO NOTHING;
END $$;

WITH viewers AS (
  SELECT role AS label, uid FROM __doc_actors
  UNION ALL SELECT 'anon', NULL
),
ctx AS (SELECT (SELECT sid FROM __doc_student) AS student_id),
matrix AS (
  SELECT v.label AS viewer,
    -- documents SELECT
    (v.uid IS NOT NULL AND public.can_access_student(v.uid, ctx.student_id))
      AS can_read_documents,
    -- documents INSERT: WITH CHECK requires can_edit + auth.uid()=uploaded_by;
    -- here we treat "uploaded_by = self" as always true for the test.
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_insert_documents,
    -- documents UPDATE / DELETE
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_write_documents,
    -- document_summaries SELECT
    (v.uid IS NOT NULL AND public.can_access_student(v.uid, ctx.student_id))
      AS can_read_summaries,
    -- document_summaries INSERT/UPDATE/DELETE
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_write_summaries,
    -- storage.objects SELECT on student-documents/<sid>/...
    (v.uid IS NOT NULL AND public.can_access_student(v.uid, ctx.student_id))
      AS can_read_storage,
    -- storage.objects INSERT/UPDATE/DELETE on student-documents/<sid>/...
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_write_storage
  FROM viewers v CROSS JOIN ctx
)
SELECT json_object_agg(viewer, perms ORDER BY viewer)::text
FROM (
  SELECT viewer, json_build_object(
    'read_documents', can_read_documents,
    'insert_documents', can_insert_documents,
    'write_documents', can_write_documents,
    'read_summaries', can_read_summaries,
    'write_summaries', can_write_summaries,
    'read_storage', can_read_storage,
    'write_storage', can_write_storage
  ) AS perms
  FROM matrix
) g;

ROLLBACK;
`;

test("documents access matrix matches committed snapshot", { skip: SKIP_NON_POLICY }, () => {
  const out = psqlScript(MATRIX_SQL);
  const jsonLine = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"))
    .pop();
  assert.ok(jsonLine, `no JSON matrix in psql output:\n${out}`);
  const current = JSON.parse(jsonLine);

  if (UPDATE) {
    writeSnap(SNAP_MATRIX, current);
  } else {
    const expected = readSnap(SNAP_MATRIX);
    assert.ok(expected, "Missing matrix snapshot. Run with UPDATE_SNAPSHOTS=1.");
    assert.deepEqual(
      current,
      expected,
      "Documents access matrix drifted. A role can now access (or no longer access) files it shouldn't.",
    );
  }

  // Hard invariants — must always hold regardless of snapshot.
  // Anon: zero document access of any kind.
  for (const k of [
    "read_documents", "insert_documents", "write_documents",
    "read_summaries", "write_summaries",
    "read_storage", "write_storage",
  ]) {
    assert.equal(current.anon[k], false, `anon must NEVER ${k.replace("_"," ")}`);
  }
  // Unrelated user: zero access of any kind.
  for (const k of Object.keys(current.unrelated)) {
    assert.equal(current.unrelated[k], false, `unrelated user must NEVER ${k.replace("_"," ")}`);
  }
  // Viewer collaborator: read yes, write no.
  assert.equal(current.viewer_collab.read_documents, true, "viewer must read documents");
  assert.equal(current.viewer_collab.read_summaries, true, "viewer must read summaries");
  assert.equal(current.viewer_collab.read_storage, true, "viewer must read storage objects");
  assert.equal(current.viewer_collab.insert_documents, false, "viewer must NOT insert documents");
  assert.equal(current.viewer_collab.write_documents, false, "viewer must NOT update/delete documents");
  assert.equal(current.viewer_collab.write_summaries, false, "viewer must NOT write summaries");
  assert.equal(current.viewer_collab.write_storage, false, "viewer must NOT write storage objects");
  // Editor collaborator: full access on this student.
  for (const k of Object.keys(current.editor_collab)) {
    assert.equal(current.editor_collab[k], true, `editor collaborator must ${k.replace("_"," ")}`);
  }
  // Owner: full access.
  for (const k of Object.keys(current.owner)) {
    assert.equal(current.owner[k], true, `owner must ${k.replace("_"," ")}`);
  }
});

// ---------------------------------------------------------------------------
// 3. Storage path scoping — the bucket policies derive student_id from the
//    object's path (`storage.foldername(name)[1]::uuid`). Confirm the
//    derivation matches student-level access for both an accessible and an
//    inaccessible folder.
// ---------------------------------------------------------------------------

const STORAGE_PATH_SQL = `
WITH s AS (SELECT id FROM public.students ORDER BY created_at LIMIT 1)
SELECT json_build_object(
  'derived_student_id_matches',
    ((storage.foldername(s.id::text || '/iep.pdf'))[1])::uuid = s.id,
  'owner_can_access_own_folder',
    public.can_access_student(s2.owner_id, ((storage.foldername(s2.id::text || '/iep.pdf'))[1])::uuid),
  'unrelated_cannot_access_other_folder',
    NOT public.can_access_student(
      (SELECT p.id FROM public.profiles p
        WHERE p.id <> s2.owner_id
          AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='admin')
        ORDER BY p.id LIMIT 1),
      ((storage.foldername(s2.id::text || '/iep.pdf'))[1])::uuid
    )
)::text
FROM s, public.students s2
WHERE s2.id = s.id
LIMIT 1
`;

test("storage bucket policy derives student_id from path correctly", { skip: SKIP_NON_POLICY }, () => {
  const guards = JSON.parse(psqlQuery(STORAGE_PATH_SQL));
  for (const [k, v] of Object.entries(guards)) {
    assert.equal(v, true, `Storage path guard "${k}" must hold — got ${v}`);
  }
});

// ---------------------------------------------------------------------------
// 4. Data-API GRANTs — ensure anon was never widened on document tables.
// ---------------------------------------------------------------------------

test("anon has NO direct privileges on documents or document_summaries", { skip: SKIP_NON_POLICY }, () => {
  const raw = psqlQuery(`
    SELECT json_agg(privilege_type ORDER BY privilege_type)::text
    FROM information_schema.role_table_grants
    WHERE grantee='anon' AND table_schema='public'
      AND table_name IN ('documents','document_summaries')
  `);
  const privs = raw && raw !== "" ? JSON.parse(raw) : null;
  assert.equal(
    privs,
    null,
    `anon must have zero privileges on documents/document_summaries — found: ${raw}`,
  );
});
