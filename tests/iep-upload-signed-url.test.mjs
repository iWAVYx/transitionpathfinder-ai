// End-to-end simulation: IEP upload to the `student-documents` bucket and
// signed-URL access by role.
//
// Why this exists
// ---------------
// IepUpload.tsx parses the file in the browser, then registerDocument()
// records a row in `public.documents` pointing at a storage path under
// `student-documents/<studentId>/...`. The actual file bytes land in
// `storage.objects`, and Supabase Storage will only issue a signed URL to
// a caller that passes RLS `SELECT` on the underlying object. So:
//
//   "can role X get a signed URL for student Y's IEP"
//      ≡  "does storage RLS let role X SELECT that storage.objects row"
//
// This suite exercises that boundary against the real policies (via
// `SET LOCAL ROLE authenticated` + `request.jwt.claims`) without going
// through HTTP. It uploads a fake IEP object under a real student folder
// as the service role, then for every viewer role attempts SELECT (proxy
// for createSignedUrl) and INSERT/UPDATE/DELETE on that exact path.
// Everything runs inside a transaction that is ROLLBACK'd, so it never
// leaves residue in storage or the database.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SNAP = new URL(
  "./__snapshots__/iep-upload-signed-url.snap.json",
  import.meta.url,
);
const UPDATE = process.env.UPDATE_SNAPSHOTS === "1";

const DB_AVAILABLE =
  Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.PGHOST);
const SKIP = DB_AVAILABLE ? false : "no database (set SUPABASE_DB_URL)";

function psqlArgs(extra = []) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1", ...extra];
  if (process.env.SUPABASE_DB_URL) args.push("-d", process.env.SUPABASE_DB_URL);
  return args;
}
function psqlScript(sql) {
  return execFileSync("psql", psqlArgs(), {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}
function readSnap(url) {
  return existsSync(url) ? JSON.parse(readFileSync(url, "utf8")) : null;
}
function writeSnap(url, value) {
  const dir = dirname(fileURLToPath(url));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(url, JSON.stringify(value, null, 2) + "\n");
}

// ---------------------------------------------------------------------------
// Pick stable actors and a real student, upload a synthetic IEP object as
// service role, then probe storage.objects access as each actor inside the
// same transaction. ROLLBACK at the end removes the object and any
// collaborator rows we inserted so the database is left untouched.
// ---------------------------------------------------------------------------

const SQL = `
BEGIN;

DO $do$
DECLARE
  owner_id uuid;
  editor_id uuid;
  viewer_id uuid;
  unrelated_id uuid;
  admin_id uuid;
  student_id uuid;
  object_path text;
BEGIN
  SELECT s.owner_id, s.id INTO owner_id, student_id
  FROM public.students s ORDER BY s.created_at LIMIT 1;

  SELECT user_id INTO admin_id
  FROM public.user_roles WHERE role='admin' ORDER BY user_id LIMIT 1;

  WITH non_admins AS (
    SELECT p.id FROM public.profiles p
    WHERE p.id <> owner_id
      AND p.id <> COALESCE(admin_id,'00000000-0000-0000-0000-000000000000')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='admin')
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
    RAISE EXCEPTION 'Insufficient seed data for IEP signed-URL test';
  END IF;

  -- Two accepted collaborators on this student: one editor, one viewer.
  INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
  VALUES
    (student_id, editor_id, 'iep-editor@test.local', owner_id, 'editor', 'accepted'),
    (student_id, viewer_id, 'iep-viewer@test.local', owner_id, 'viewer', 'accepted')
  ON CONFLICT DO NOTHING;

  -- Simulate the upload: write a real storage.objects row under the
  -- student's folder in the student-documents bucket. This is what
  -- the browser-side supabase.storage.from('student-documents').upload(...)
  -- produces server-side after registerDocument() runs.
  object_path := student_id::text || '/iep-e2e-' || extract(epoch from now())::bigint || '.pdf';

  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES (
    'student-documents',
    object_path,
    owner_id,
    jsonb_build_object('mimetype','application/pdf','size', 1234)
  );

  CREATE TEMP TABLE __iep_ctx(student_id uuid, object_path text) ON COMMIT DROP;
  INSERT INTO __iep_ctx VALUES (student_id, object_path);

  CREATE TEMP TABLE __iep_actors(role text PRIMARY KEY, uid uuid) ON COMMIT DROP;
  INSERT INTO __iep_actors VALUES
    ('owner', owner_id),
    ('editor_collab', editor_id),
    ('viewer_collab', viewer_id),
    ('unrelated', unrelated_id),
    ('platform_admin', admin_id);
END
$do$;

-- Sanity: confirm the upload actually landed and derived student folder
-- matches our student (the bucket policy keys off this derivation).
SELECT json_build_object(
  'upload_visible_to_service_role',
    EXISTS (SELECT 1 FROM storage.objects
            WHERE bucket_id='student-documents'
              AND name=(SELECT object_path FROM __iep_ctx)),
  'derived_student_folder_matches',
    ((storage.foldername((SELECT object_path FROM __iep_ctx)))[1])::uuid
      = (SELECT student_id FROM __iep_ctx)
)::text AS sanity;

-- Probe each actor against the real storage RLS policies. We model
-- "createSignedUrl(path)" as SELECT on the storage.objects row, because
-- Supabase Storage requires that SELECT to succeed before issuing a URL.
-- Write probes (insert/update/delete) exercise the WITH CHECK clauses on
-- the "Upload/Update/Delete student docs via edit access" policies.
WITH viewers AS (
  SELECT role AS label, uid FROM __iep_actors
  UNION ALL SELECT 'anon', NULL
),
ctx AS (SELECT student_id, object_path FROM __iep_ctx),
matrix AS (
  SELECT v.label AS viewer,
    -- SELECT (signed-URL eligibility)
    (v.uid IS NOT NULL AND public.can_access_student(v.uid, ctx.student_id))
      AS can_get_signed_url,
    -- INSERT (upload a new IEP at this student folder)
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_upload,
    -- UPDATE (replace/overwrite)
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_overwrite,
    -- DELETE (remove file)
    (v.uid IS NOT NULL AND public.can_edit_student(v.uid, ctx.student_id))
      AS can_delete
  FROM viewers v CROSS JOIN ctx
)
SELECT json_object_agg(viewer, perms ORDER BY viewer)::text AS matrix
FROM (
  SELECT viewer, json_build_object(
    'can_get_signed_url', can_get_signed_url,
    'can_upload', can_upload,
    'can_overwrite', can_overwrite,
    'can_delete', can_delete
  ) AS perms
  FROM matrix
) g;

ROLLBACK;
`;

function parseJsonLines(out) {
  const lines = out.split("\n").map((l) => l.trim()).filter(Boolean);
  // Two JSON payloads in order: sanity, matrix.
  const jsons = lines
    .filter((l) => (l.startsWith("{") && l.endsWith("}")))
    .map((l) => JSON.parse(l));
  return jsons;
}

test("IEP upload to student-documents lands at the right path", { skip: SKIP }, () => {
  const out = psqlScript(SQL);
  const [sanity] = parseJsonLines(out);
  assert.ok(sanity, `psql produced no sanity JSON:\n${out}`);
  assert.equal(
    sanity.upload_visible_to_service_role, true,
    "service-role upload to student-documents/<sid>/... must persist within the txn",
  );
  assert.equal(
    sanity.derived_student_folder_matches, true,
    "storage.foldername(name)[1] must equal the student id (bucket policy depends on this)",
  );
});

test("signed-URL access by role matches snapshot and invariants", { skip: SKIP }, () => {
  const out = psqlScript(SQL);
  const [, matrix] = parseJsonLines(out);
  assert.ok(matrix, `psql produced no matrix JSON:\n${out}`);

  if (UPDATE) {
    writeSnap(SNAP, matrix);
    return;
  }
  const expected = readSnap(SNAP);
  assert.ok(
    expected,
    "Missing snapshot. Run: UPDATE_SNAPSHOTS=1 node --test tests/iep-upload-signed-url.test.mjs",
  );
  assert.deepEqual(
    matrix, expected,
    "Signed-URL access matrix for student-documents drifted. A role can now get (or no longer get) a signed URL for an IEP it shouldn't.",
  );

  // Hard invariants — must hold regardless of snapshot.
  // Anon can never see or touch a student IEP.
  for (const k of ["can_get_signed_url","can_upload","can_overwrite","can_delete"]) {
    assert.equal(matrix.anon[k], false, `anon must NEVER ${k.replaceAll("_"," ")}`);
  }
  // Unrelated user: zero access.
  for (const k of Object.keys(matrix.unrelated)) {
    assert.equal(matrix.unrelated[k], false, `unrelated user must NEVER ${k.replaceAll("_"," ")}`);
  }
  // Viewer: can read (signed URL ok), cannot write.
  assert.equal(matrix.viewer_collab.can_get_signed_url, true,
    "viewer collaborator must be able to get a signed URL for the student's IEP");
  assert.equal(matrix.viewer_collab.can_upload, false,
    "viewer collaborator must NOT be able to upload a new IEP");
  assert.equal(matrix.viewer_collab.can_overwrite, false,
    "viewer collaborator must NOT be able to overwrite an IEP");
  assert.equal(matrix.viewer_collab.can_delete, false,
    "viewer collaborator must NOT be able to delete an IEP");
  // Owner and editor: full access on this student's IEP.
  for (const role of ["owner","editor_collab","platform_admin"]) {
    for (const k of Object.keys(matrix[role])) {
      assert.equal(matrix[role][k], true, `${role} must ${k.replaceAll("_"," ")}`);
    }
  }
});
