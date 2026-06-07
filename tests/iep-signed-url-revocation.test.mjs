// End-to-end revocation regression: when a user's access to a student is
// revoked, IEP signed URLs for that student must stop working for that user
// immediately on the next request.
//
// What "immediately" means for Supabase signed URLs
// -------------------------------------------------
// A Supabase signed URL is a stateless JWT signed by storage; once minted
// it is valid until its embedded `exp` regardless of later RLS changes.
// The app therefore enforces revocation by re-minting on every share/open
// request — `supabase.storage.from('student-documents').createSignedUrl(...)`
// goes through storage RLS, which is gated by
// `public.can_access_student(auth.uid(), studentId)`. So "the signed URL
// stops working immediately on revocation" is the same property as:
//
//   After revocation, `can_access_student(uid, studentId)` flips to FALSE,
//   so the next createSignedUrl() call for that role fails RLS and no new
//   working URL can be produced.
//
// This test verifies exactly that for each revocable role:
//   * editor collaborator     -> remove from student_collaborators
//   * viewer collaborator     -> remove from student_collaborators
//   * platform admin          -> remove the 'admin' user_roles row
//
// Owner revocation is out of scope (would require an ownership transfer,
// which the product does not model). The owner remains a control case:
// access never flips during the test.
//
// Each mutation is wrapped in a save-and-restore block so the database is
// left exactly as it was, even on assertion failure.
//
// Skips cleanly when DB connectivity is unavailable (local dev w/o secrets).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const DB_AVAILABLE =
  Boolean(process.env.SUPABASE_DB_URL) || Boolean(process.env.PGHOST);
const SKIP = !DB_AVAILABLE ? "no database (set SUPABASE_DB_URL)" : false;

function psql(sql) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1"];
  if (process.env.SUPABASE_DB_URL) args.push("-d", process.env.SUPABASE_DB_URL);
  return execFileSync("psql", args, {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

function canAccess(uid, studentId) {
  if (!uid) return false;
  const out = psql(
    `SELECT public.can_access_student('${uid}'::uuid, '${studentId}'::uuid)::text;`,
  );
  return out.trim() === "true";
}

// Discover a student with both an accepted editor and viewer collaborator,
// plus its owner, a platform admin who is NOT already a collaborator on
// that student (so revoking their admin role actually flips access), and
// an unrelated control profile. If the seed data can't supply this shape,
// skip — revocation isn't meaningful without it.
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
      ),
      'unrelated_id', (
        SELECT p.id FROM public.profiles p, pick
        WHERE p.id <> pick.owner_id
          AND p.id <> pick.editor_id
          AND p.id <> pick.viewer_id
          AND NOT EXISTS (SELECT 1 FROM public.user_roles ur
                          WHERE ur.user_id=p.id AND ur.role='admin')
          AND NOT public.can_access_student(p.id, pick.student_id)
        ORDER BY p.id LIMIT 1
      )
    )::text;
  `);
  return JSON.parse(out);
}

// Snapshot a collaborator row as JSON so we can restore exactly after the
// destructive DELETE. We don't assume a particular column set — `to_jsonb`
// captures whatever the schema currently exposes.
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
  psql(`
    DELETE FROM public.student_collaborators
    WHERE student_id='${studentId}'::uuid AND user_id='${uid}'::uuid
      AND status='accepted';
  `);
}

function restoreCollaborator(row) {
  // Re-insert from the JSONB snapshot. Conflict-safe in case a parallel
  // run restored it first.
  const payload = JSON.stringify(row).replace(/'/g, "''");
  psql(`
    INSERT INTO public.student_collaborators
    SELECT * FROM jsonb_populate_record(
      NULL::public.student_collaborators,
      '${payload}'::jsonb
    )
    ON CONFLICT DO NOTHING;
  `);
}

function deleteAdminRole(uid) {
  psql(`
    DELETE FROM public.user_roles
    WHERE user_id='${uid}'::uuid AND role='admin';
  `);
}

function restoreAdminRole(uid) {
  psql(`
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('${uid}'::uuid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  `);
}

// Run `body`, then always run `restore` — even on assertion failure — so
// the database state is preserved.
async function withRestore(restore, body) {
  try {
    await body();
  } finally {
    try { restore(); } catch (e) {
      console.error("restore failed:", e);
      throw e;
    }
  }
}

test("revoking access flips signed-URL mint eligibility immediately per role", { skip: SKIP }, async () => {
  const ctx = discoverActors();
  if (
    !ctx.student_id || !ctx.owner_id || !ctx.editor_id ||
    !ctx.viewer_id || !ctx.admin_id || !ctx.unrelated_id
  ) {
    console.warn(
      "iep-signed-url-revocation: insufficient seed data, skipping",
      ctx,
    );
    return;
  }

  // Sanity: owner is a control — access must remain TRUE for the whole run.
  assert.equal(canAccess(ctx.owner_id, ctx.student_id), true,
    "precondition: owner should have access");
  assert.equal(canAccess(ctx.unrelated_id, ctx.student_id), false,
    "precondition: unrelated user should not have access");

  // --- Editor collaborator revocation -------------------------------------
  const editorRow = snapshotCollaborator(ctx.student_id, ctx.editor_id);
  assert.equal(canAccess(ctx.editor_id, ctx.student_id), true,
    "precondition: editor collaborator should have access");

  await withRestore(() => restoreCollaborator(editorRow), async () => {
    deleteCollaborator(ctx.student_id, ctx.editor_id);
    assert.equal(
      canAccess(ctx.editor_id, ctx.student_id), false,
      "after revoking editor collaborator, can_access_student must flip to false " +
      "— this is what causes the next createSignedUrl() call to fail storage RLS, " +
      "making any subsequent share/open attempt produce no working URL",
    );
    // Owner unaffected.
    assert.equal(canAccess(ctx.owner_id, ctx.student_id), true,
      "revoking editor must not affect owner access");
  });
  assert.equal(canAccess(ctx.editor_id, ctx.student_id), true,
    "editor access must be restored after the test");

  // --- Viewer collaborator revocation -------------------------------------
  const viewerRow = snapshotCollaborator(ctx.student_id, ctx.viewer_id);
  assert.equal(canAccess(ctx.viewer_id, ctx.student_id), true,
    "precondition: viewer collaborator should have access");

  await withRestore(() => restoreCollaborator(viewerRow), async () => {
    deleteCollaborator(ctx.student_id, ctx.viewer_id);
    assert.equal(
      canAccess(ctx.viewer_id, ctx.student_id), false,
      "after revoking viewer collaborator, can_access_student must flip to false " +
      "so no further signed URL can be minted for this role",
    );
  });
  assert.equal(canAccess(ctx.viewer_id, ctx.student_id), true,
    "viewer access must be restored after the test");

  // --- Platform admin revocation ------------------------------------------
  // The admin actor is selected to NOT be a collaborator on this student,
  // so their access derives solely from has_role('admin'). Removing the
  // admin row must therefore drop their student access entirely.
  assert.equal(canAccess(ctx.admin_id, ctx.student_id), true,
    "precondition: platform admin should have access via has_role('admin')");

  await withRestore(() => restoreAdminRole(ctx.admin_id), async () => {
    deleteAdminRole(ctx.admin_id);
    assert.equal(
      canAccess(ctx.admin_id, ctx.student_id), false,
      "after removing the 'admin' user_roles row, the former admin must lose " +
      "access to non-owned/non-collaborated students; their next createSignedUrl() " +
      "for this student's IEP must fail storage RLS",
    );
  });
  assert.equal(canAccess(ctx.admin_id, ctx.student_id), true,
    "admin role must be restored after the test");
});
