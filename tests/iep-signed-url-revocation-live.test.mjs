// End-to-end live regression: an IEP signed URL that was already minted
// for a role MUST stop working immediately after that role's access to
// the student is revoked.
//
// Why this test is separate from `iep-signed-url-revocation.test.mjs`
// -------------------------------------------------------------------
// That test verifies the "next mint fails" half of revocation —
// `can_access_student(uid, studentId)` flips to false, so any future
// `createSignedUrl()` for that role can no longer produce a working URL.
//
// This test verifies the harder, often-overlooked half: a URL that the
// role ALREADY holds in their browser/clipboard/email must stop working
// the moment access is revoked, before its TTL expires. A Supabase signed
// URL is a stateless JWT signed by storage and validated against the
// underlying object at fetch time — so the two ways revocation can take
// effect immediately are:
//
//   1. The object is removed/rotated when access is revoked, so any
//      previously-minted URL 404s on its next fetch, OR
//   2. Storage RLS is consulted on the signed-fetch path (so the JWT
//      alone is not sufficient) and the revoked role gets blocked.
//
// We assert the *observed end-to-end behavior*: fetch the already-minted
// URL after revocation and require it to NOT return 200. If neither
// defense is in place, this test fails loudly and surfaces a real
// data-exposure gap (a former editor/viewer can keep reading the PDF
// from the URL they were already given).
//
// Skips cleanly when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / DB
// connectivity is unavailable (e.g. local dev without secrets).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;
const DB_AVAILABLE =
  Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.PGHOST);

const SKIP = !SUPABASE_URL
  ? "no SUPABASE_URL"
  : !SERVICE_KEY
    ? "no SUPABASE_SERVICE_ROLE_KEY"
    : !DB_AVAILABLE
      ? "no database (set SUPABASE_DB_URL)"
      : false;

// Long enough that TTL is irrelevant to this test — we want to prove
// revocation, not expiry. If a URL still works after revocation here,
// it's because Supabase did not invalidate it, not because the clock
// hasn't moved.
const TTL_SECONDS = 600;

function psql(sql) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1"];
  if (process.env.SUPABASE_DB_URL) args.push("-d", process.env.SUPABASE_DB_URL);
  return execFileSync("psql", args, {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function canMutate() {
  try {
    psql(`
      DO $$ BEGIN
        IF NOT has_table_privilege(current_user, 'public.student_collaborators', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.student_collaborators', 'INSERT')
           OR NOT has_table_privilege(current_user, 'public.user_roles', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.user_roles', 'INSERT')
        THEN
          RAISE EXCEPTION 'insufficient privileges';
        END IF;
      END $$;
    `);
    return true;
  } catch {
    return false;
  }
}

function canAccess(uid, studentId) {
  if (!uid) return false;
  const out = psql(
    `SELECT public.can_access_student('${uid}'::uuid, '${studentId}'::uuid)::text;`,
  );
  return out.trim() === "true";
}

async function storageFetch(path, init) {
  return fetch(`${SUPABASE_URL}/storage/v1${path}`, init);
}
function authHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4, 0xe5,
  0xf2, 0xe5, 0xeb, 0xa7, 0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a, 0x25, 0x25,
  0x45, 0x4f, 0x46, 0x0a,
]);

async function uploadObject(objectPath) {
  const res = await storageFetch(`/object/student-documents/${objectPath}`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/pdf" }),
    body: PDF_BYTES,
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`upload failed: ${res.status} ${await res.text()}`);
  }
}
async function deleteObject(objectPath) {
  await storageFetch(`/object/student-documents/${objectPath}`, {
    method: "DELETE",
    headers: authHeaders(),
  }).catch(() => {});
}
async function createSignedUrl(objectPath, expiresIn) {
  const res = await storageFetch(
    `/object/sign/student-documents/${objectPath}`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ expiresIn }),
    },
  );
  if (!res.ok) throw new Error(`sign failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return `${SUPABASE_URL}/storage/v1${json.signedURL || json.signedUrl}`;
}

function discoverActors() {
  const out = psql(`
    WITH candidate AS (
      SELECT s.id AS student_id, s.owner_id,
        (SELECT user_id FROM public.student_collaborators c
          WHERE c.student_id = s.id AND c.status='accepted' AND c.role='editor'
          ORDER BY user_id LIMIT 1) AS editor_id,
        (SELECT user_id FROM public.student_collaborators c
          WHERE c.student_id = s.id AND c.status='accepted' AND c.role='viewer'
          ORDER BY user_id LIMIT 1) AS viewer_id
      FROM public.students s
    ),
    pick AS (
      SELECT * FROM candidate
      WHERE editor_id IS NOT NULL AND viewer_id IS NOT NULL
      ORDER BY student_id LIMIT 1
    )
    SELECT json_build_object(
      'student_id', (SELECT student_id FROM pick),
      'owner_id',   (SELECT owner_id   FROM pick),
      'editor_id',  (SELECT editor_id  FROM pick),
      'viewer_id',  (SELECT viewer_id  FROM pick),
      'admin_id', (
        SELECT ur.user_id FROM public.user_roles ur, pick
        WHERE ur.role='admin'
          AND ur.user_id <> pick.owner_id
          AND ur.user_id <> pick.editor_id
          AND ur.user_id <> pick.viewer_id
          AND NOT EXISTS (
            SELECT 1 FROM public.student_collaborators c
            WHERE c.student_id = pick.student_id
              AND c.user_id = ur.user_id
              AND c.status = 'accepted'
          )
        ORDER BY ur.user_id LIMIT 1
      )
    )::text;
  `);
  return JSON.parse(out);
}

function snapshotCollaborator(studentId, uid) {
  const json = psql(`
    SELECT to_jsonb(c)::text FROM public.student_collaborators c
    WHERE c.student_id='${studentId}'::uuid AND c.user_id='${uid}'::uuid
      AND c.status='accepted'
    LIMIT 1;
  `);
  if (!json) throw new Error(`no collaborator row for ${uid} on ${studentId}`);
  return JSON.parse(json);
}
function deleteCollaborator(studentId, uid) {
  psql(`DELETE FROM public.student_collaborators
        WHERE student_id='${studentId}'::uuid AND user_id='${uid}'::uuid
          AND status='accepted';`);
}
function restoreCollaborator(row) {
  const payload = JSON.stringify(row).replace(/'/g, "''");
  psql(`INSERT INTO public.student_collaborators
        SELECT * FROM jsonb_populate_record(
          NULL::public.student_collaborators, '${payload}'::jsonb)
        ON CONFLICT DO NOTHING;`);
}
function deleteAdminRole(uid) {
  psql(`DELETE FROM public.user_roles WHERE user_id='${uid}'::uuid AND role='admin';`);
}
function restoreAdminRole(uid) {
  psql(`INSERT INTO public.user_roles (user_id, role) VALUES ('${uid}'::uuid, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;`);
}

async function withRestore(restore, body) {
  try { await body(); } finally {
    try { restore(); } catch (e) { console.error("restore failed:", e); throw e; }
  }
}

// Mint a URL as the role (precondition: role currently has access), verify
// it works, revoke access via `mutate`, then re-fetch the SAME URL and
// require a non-200. Restore access in `restore`.
async function assertRevocationInvalidatesUrl({
  label, studentId, uid, objectPath, mutate, restore,
}) {
  assert.equal(canAccess(uid, studentId), true,
    `[${label}] precondition: role must currently have access`);

  const signedUrl = await createSignedUrl(objectPath, TTL_SECONDS);
  const pre = await fetch(signedUrl);
  assert.equal(pre.status, 200,
    `[${label}] minted URL must return 200 before revocation, got ${pre.status}`);

  await withRestore(restore, async () => {
    mutate();
    assert.equal(canAccess(uid, studentId), false,
      `[${label}] after revocation, can_access_student must be false`);

    // The critical assertion: the URL the role already holds must no
    // longer work. If this returns 200, a former collaborator can
    // continue reading the IEP from a stale link — a real exposure.
    const post = await fetch(signedUrl);
    assert.notEqual(post.status, 200,
      `[${label}] already-minted signed URL still returned 200 AFTER access was revoked. ` +
      `Supabase signed URLs are stateless JWTs; revocation must invalidate them ` +
      `(e.g. by deleting/rotating the object or via storage RLS on the signed-fetch path). ` +
      `Current behavior leaks the IEP to the former ${label} until TTL elapses.`);
  });
}

test("already-minted IEP signed URL stops working immediately after revocation, per role", { skip: SKIP }, async () => {
  if (!canMutate()) {
    console.warn("iep-signed-url-revocation-live: current DB role lacks DELETE/INSERT; skipping (CI uses service role)");
    return;
  }

  const ctx = discoverActors();
  if (!ctx.student_id || !ctx.editor_id || !ctx.viewer_id || !ctx.admin_id) {
    console.warn("iep-signed-url-revocation-live: insufficient seed data, skipping", ctx);
    return;
  }

  const objectPath = `${ctx.student_id}/iep-revocation-live-${Date.now()}.pdf`;
  await uploadObject(objectPath);

  try {
    // Editor collaborator
    const editorRow = snapshotCollaborator(ctx.student_id, ctx.editor_id);
    await assertRevocationInvalidatesUrl({
      label: "editor_collab",
      studentId: ctx.student_id,
      uid: ctx.editor_id,
      objectPath,
      mutate: () => deleteCollaborator(ctx.student_id, ctx.editor_id),
      restore: () => restoreCollaborator(editorRow),
    });

    // Viewer collaborator
    const viewerRow = snapshotCollaborator(ctx.student_id, ctx.viewer_id);
    await assertRevocationInvalidatesUrl({
      label: "viewer_collab",
      studentId: ctx.student_id,
      uid: ctx.viewer_id,
      objectPath,
      mutate: () => deleteCollaborator(ctx.student_id, ctx.viewer_id),
      restore: () => restoreCollaborator(viewerRow),
    });

    // Platform admin (whose access is via has_role('admin') only)
    await assertRevocationInvalidatesUrl({
      label: "platform_admin",
      studentId: ctx.student_id,
      uid: ctx.admin_id,
      objectPath,
      mutate: () => deleteAdminRole(ctx.admin_id),
      restore: () => restoreAdminRole(ctx.admin_id),
    });
  } finally {
    await deleteObject(objectPath);
  }
});
