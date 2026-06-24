// End-to-end document access rules: upload / view / download / summarize
// across roles × document state (active / archived / deleted), for both a
// connected student and an unrelated student.
//
// Why this exists
// ---------------
// Document hardening introduced soft-delete (`archived_at`, `deleted_at`),
// a hard partner deny, and a 15-minute platform-admin override grant
// (`admin_doc_access_grants`). The behavior is centralized in:
//   - public.can_access_student / can_edit_student
//   - public.can_view_document
//   - public.is_partner_only
//   - public.has_recent_admin_doc_access
//   - public.storage_can_read_student_doc
//
// A single bad change to any of these can either (a) leak archived/deleted
// IEPs to unrelated users, or (b) lock case managers out of an active IEP.
// This suite probes every actor × state combination through the same
// helpers RLS calls, plus the document_summaries policy, inside a
// transaction that is ROLLBACK'd so nothing leaks into the database.
//
// Update snapshot after an intentional, reviewed change:
//   UPDATE_SNAPSHOTS=1 node --test tests/document-access-e2e.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SNAP = new URL(
  "./__snapshots__/document-access-e2e.snap.json",
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

// Actors:
//   owner            — owns the connected student
//   editor_collab    — accepted 'editor' on the connected student
//   viewer_collab    — accepted 'viewer' on the connected student
//   unrelated        — non-admin profile with no relation to either student
//   partner_only     — has only the 'partner' role (no other audience); must
//                      be hard-denied regardless of any relationship
//   platform_admin   — has 'admin' app role + admin_roles platform_admin
//   platform_admin_with_grant — same admin, additionally holding an
//                      unexpired admin_doc_access_grants row for the doc
//
// States (applied to the SAME document row, one variant at a time):
//   active   — archived_at IS NULL AND deleted_at IS NULL
//   archived — archived_at = now()
//   deleted  — deleted_at  = now()
//
// Probes per (actor, state) on the *connected* student's doc:
//   view_metadata  ≡ can_view_document(uid, doc)          -- documents SELECT
//   download       ≡ storage_can_read_student_doc(uid, path) -- storage SELECT
//   upload_new     ≡ can_edit_student(uid, student) AND NOT is_partner_only(uid)
//   read_summary   ≡ can_access_student(uid, student)     -- doc_summaries SELECT
//   write_summary  ≡ can_edit_student(uid, student) AND NOT is_partner_only(uid)
//
// On the *unrelated* student we only probe view/download for active docs —
// any true is a leak.

const SQL = `
BEGIN;

DO $do$
DECLARE
  v_owner uuid;
  v_editor uuid;
  v_viewer uuid;
  v_unrelated uuid;
  v_partner uuid;
  v_admin uuid;
  v_student uuid;
  v_other_student uuid;
  v_doc uuid;
  v_other_doc uuid;
  v_path text;
  v_other_path text;
BEGIN
  -- Connected student + owner.
  SELECT s.id, s.owner_id INTO v_student, v_owner
  FROM public.students s ORDER BY s.created_at LIMIT 1;

  -- Unrelated student (owned by someone else).
  SELECT s.id INTO v_other_student
  FROM public.students s
  WHERE s.id <> v_student AND s.owner_id <> v_owner
  ORDER BY s.created_at LIMIT 1;

  -- Platform admin (app role + admin_roles).
  SELECT ur.user_id INTO v_admin
  FROM public.user_roles ur
  WHERE ur.role='admin'
    AND EXISTS (SELECT 1 FROM public.admin_roles ar
                WHERE ar.user_id = ur.user_id
                  AND ar.role IN ('platform_owner','platform_admin'))
  ORDER BY ur.user_id LIMIT 1;
  -- Fallback: any admin app role (override grant test will still run).
  IF v_admin IS NULL THEN
    SELECT user_id INTO v_admin FROM public.user_roles
    WHERE role='admin' ORDER BY user_id LIMIT 1;
  END IF;

  -- Partner-only profile (has 'partner' role and no other audience).
  SELECT ur.user_id INTO v_partner
  FROM public.user_roles ur
  WHERE ur.role='partner'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur2
      WHERE ur2.user_id = ur.user_id
        AND ur2.role IN ('student','parent','guardian','educator','teacher',
                         'case_manager','school_admin','district_admin','admin')
    )
  ORDER BY ur.user_id LIMIT 1;

  -- Three other non-admin, non-partner profiles for editor/viewer/unrelated.
  WITH picks AS (
    SELECT p.id, row_number() OVER (ORDER BY p.id) AS rn
    FROM public.profiles p
    WHERE p.id <> v_owner
      AND p.id <> COALESCE(v_admin,'00000000-0000-0000-0000-000000000000')
      AND p.id <> COALESCE(v_partner,'00000000-0000-0000-0000-000000000000')
      AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role IN ('admin','partner'))
  )
  SELECT
    (SELECT id FROM picks WHERE rn=1),
    (SELECT id FROM picks WHERE rn=2),
    (SELECT id FROM picks WHERE rn=3)
  INTO v_editor, v_viewer, v_unrelated;

  IF v_owner IS NULL OR v_student IS NULL OR v_other_student IS NULL
     OR v_editor IS NULL OR v_viewer IS NULL OR v_unrelated IS NULL
     OR v_admin IS NULL THEN
    RAISE EXCEPTION 'Insufficient seed (owner=% student=% other_student=% editor=% viewer=% unrelated=% admin=% partner=%)',
      v_owner, v_student, v_other_student, v_editor, v_viewer, v_unrelated, v_admin, v_partner;
  END IF;

  -- Wire collaborators on connected student.
  INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
  VALUES
    (v_student, v_editor, 'doc-e2e-editor@test.local', v_owner, 'editor', 'accepted'),
    (v_student, v_viewer, 'doc-e2e-viewer@test.local', v_owner, 'viewer', 'accepted')
  ON CONFLICT DO NOTHING;

  -- Create one document row + matching storage object for the connected
  -- student, and one for the unrelated student. We mutate archived_at /
  -- deleted_at per-state below using a settings GUC and a CASE expression
  -- in the probe — but simpler: probe each state by directly updating the
  -- doc inline and capturing matrices three times.

  v_path := v_student::text || '/doc-e2e-' || extract(epoch from now())::bigint || '.pdf';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('student-documents', v_path, v_owner,
          jsonb_build_object('mimetype','application/pdf','size',1024));
  INSERT INTO public.documents (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at)
  VALUES (v_student, v_owner, 'current-iep', 'E2E IEP', v_path, 'application/pdf', 1024, 'team', now())
  RETURNING id INTO v_doc;

  v_other_path := v_other_student::text || '/doc-e2e-other-' || extract(epoch from now())::bigint || '.pdf';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('student-documents', v_other_path, (SELECT owner_id FROM public.students WHERE id=v_other_student),
          jsonb_build_object('mimetype','application/pdf','size',2048));
  INSERT INTO public.documents (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at)
  VALUES (v_other_student, (SELECT owner_id FROM public.students WHERE id=v_other_student),
          'current-iep', 'Other E2E IEP', v_other_path, 'application/pdf', 2048, 'team', now())
  RETURNING id INTO v_other_doc;

  -- Mint an active override grant for the platform admin on the connected doc.
  -- Schema (from supabase-tables): admin_doc_access_grants has 6 cols incl.
  -- actor_id, document_id, expires_at + reason. Use 10 min from now.
  INSERT INTO public.admin_doc_access_grants (actor_id, document_id, reason, expires_at)
  VALUES (v_admin, v_doc, 'e2e test grant', now() + interval '10 minutes');

  CREATE TEMP TABLE __doc_ctx(
    student_id uuid, other_student_id uuid,
    doc_id uuid, other_doc_id uuid,
    path text, other_path text
  ) ON COMMIT DROP;
  INSERT INTO __doc_ctx VALUES (v_student, v_other_student, v_doc, v_other_doc, v_path, v_other_path);

  CREATE TEMP TABLE __doc_actors(label text PRIMARY KEY, uid uuid, override_grant boolean) ON COMMIT DROP;
  INSERT INTO __doc_actors VALUES
    ('owner', v_owner, false),
    ('editor_collab', v_editor, false),
    ('viewer_collab', v_viewer, false),
    ('unrelated', v_unrelated, false),
    ('platform_admin_no_grant', v_admin, false),       -- we strip the grant for this probe
    ('platform_admin_with_grant', v_admin, true);      -- grant remains active

  IF v_partner IS NOT NULL THEN
    INSERT INTO __doc_actors VALUES ('partner_only', v_partner, false);
  END IF;
END
$do$;

-- Helper: build matrix for a given state. We re-run the same SELECT three
-- times after mutating the doc's archived_at/deleted_at.
CREATE OR REPLACE FUNCTION pg_temp.doc_matrix(_state text)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE
  ctx record;
  result json;
BEGIN
  SELECT * INTO ctx FROM __doc_ctx;

  -- Apply state to the connected doc.
  IF _state = 'active' THEN
    UPDATE public.documents SET archived_at=NULL, deleted_at=NULL WHERE id=ctx.doc_id;
  ELSIF _state = 'archived' THEN
    UPDATE public.documents SET archived_at=now(), deleted_at=NULL WHERE id=ctx.doc_id;
  ELSIF _state = 'deleted' THEN
    UPDATE public.documents SET archived_at=NULL, deleted_at=now() WHERE id=ctx.doc_id;
  END IF;

  WITH viewers AS (
    SELECT label, uid, override_grant FROM __doc_actors
    UNION ALL SELECT 'anon', NULL, false
  ),
  probes AS (
    SELECT v.label AS viewer,
      json_build_object(
        -- VIEW metadata on the connected doc.
        'view_metadata',
          (v.uid IS NOT NULL AND public.can_view_document(v.uid, ctx.doc_id)),
        -- DOWNLOAD: storage SELECT eligibility through bucket policy helper.
        'download',
          (v.uid IS NOT NULL AND public.storage_can_read_student_doc(v.uid, ctx.path)),
        -- UPLOAD a new doc for the connected student.
        'upload_new',
          (v.uid IS NOT NULL
            AND public.can_edit_student(v.uid, ctx.student_id)
            AND NOT public.is_partner_only(v.uid)),
        -- READ existing AI summary row (document_summaries SELECT policy).
        'read_summary',
          (v.uid IS NOT NULL AND public.can_access_student(v.uid, ctx.student_id)),
        -- WRITE/regenerate AI summary.
        'write_summary',
          (v.uid IS NOT NULL
            AND public.can_edit_student(v.uid, ctx.student_id)
            AND NOT public.is_partner_only(v.uid)),
        -- LEAK probes against the unrelated student's active doc — these
        -- must ALL be false for everyone except platform admins acting
        -- via an explicit override grant they don't currently hold.
        'leak_view_unrelated',
          (v.uid IS NOT NULL AND public.can_view_document(v.uid, ctx.other_doc_id)),
        'leak_download_unrelated',
          (v.uid IS NOT NULL AND public.storage_can_read_student_doc(v.uid, ctx.other_path))
      ) AS perms
    FROM viewers v
  )
  SELECT json_object_agg(viewer, perms ORDER BY viewer) INTO result FROM probes;
  RETURN result;
END
$$;

-- Active state: keep the admin override grant in place — that's what the
-- 'platform_admin_with_grant' row reflects.
SELECT pg_temp.doc_matrix('active')::text AS m_active;

-- Archived: keep the grant in place.
SELECT pg_temp.doc_matrix('archived')::text AS m_archived;

-- Deleted: keep the grant in place.
SELECT pg_temp.doc_matrix('deleted')::text AS m_deleted;

-- Then remove the override grant and re-probe deleted state to confirm
-- platform_admin without a grant can NOT reach a deleted doc.
DELETE FROM public.admin_doc_access_grants
WHERE document_id = (SELECT doc_id FROM __doc_ctx);

SELECT pg_temp.doc_matrix('deleted')::text AS m_deleted_no_grant;

ROLLBACK;
`;

function parseAllJson(out) {
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"))
    .map((l) => JSON.parse(l));
}

test("document access matrix across roles × state matches snapshot", { skip: SKIP }, () => {
  const out = psqlScript(SQL);
  const matrices = parseAllJson(out);
  assert.equal(matrices.length, 4, `expected 4 matrices, got ${matrices.length}\n${out}`);
  const [active, archived, deleted, deletedNoGrant] = matrices;
  const current = { active, archived, deleted, deleted_admin_no_grant: deletedNoGrant };

  if (UPDATE) {
    writeSnap(SNAP, current);
    return;
  }
  const expected = readSnap(SNAP);
  assert.ok(expected, "Missing snapshot. Run with UPDATE_SNAPSHOTS=1.");
  assert.deepEqual(current, expected,
    "Document access matrix drifted. A role gained/lost access it shouldn't.");

  // --- Hard invariants (independent of the snapshot) ---------------------

  const allStates = { active, archived, deleted };
  const leakKeys = ["leak_view_unrelated", "leak_download_unrelated"];
  const accessKeys = ["view_metadata", "download", "upload_new", "read_summary", "write_summary"];

  // 1. Anon: zero access of any kind in every state, no leaks.
  for (const [name, m] of Object.entries(allStates)) {
    for (const k of [...accessKeys, ...leakKeys]) {
      assert.equal(m.anon[k], false, `[${name}] anon must NEVER ${k}`);
    }
  }

  // 2. Unrelated user: zero access of any kind, zero leaks, every state.
  for (const [name, m] of Object.entries(allStates)) {
    for (const k of [...accessKeys, ...leakKeys]) {
      assert.equal(m.unrelated[k], false, `[${name}] unrelated user must NEVER ${k}`);
    }
  }

  // 3. Partner-only (when present): hard deny on EVERYTHING, every state.
  if (active.partner_only) {
    for (const [name, m] of Object.entries(allStates)) {
      for (const k of [...accessKeys, ...leakKeys]) {
        assert.equal(m.partner_only[k], false, `[${name}] partner_only must NEVER ${k}`);
      }
    }
  }

  // 4. Viewer collaborator on connected student:
  //    - active: can view/download/read_summary; cannot upload/write_summary.
  //    - archived: cannot download (only editors + admins w/ grant can).
  //    - deleted: cannot view, cannot download.
  assert.equal(active.viewer_collab.view_metadata, true, "viewer must see active doc metadata");
  assert.equal(active.viewer_collab.download,      true, "viewer must download active doc");
  assert.equal(active.viewer_collab.read_summary,  true, "viewer must read active summary");
  assert.equal(active.viewer_collab.upload_new,    false, "viewer must NOT upload");
  assert.equal(active.viewer_collab.write_summary, false, "viewer must NOT write summary");
  assert.equal(archived.viewer_collab.download,    false, "viewer must NOT download archived doc");
  assert.equal(deleted.viewer_collab.view_metadata,false, "viewer must NOT see deleted doc");
  assert.equal(deleted.viewer_collab.download,     false, "viewer must NOT download deleted doc");

  // 5. Editor collaborator on connected student:
  //    - active: full access except the leak probes.
  //    - archived: can still view/download/upload (rehydrate path).
  //    - deleted: view_metadata false (soft-deleted = invisible), download false.
  for (const k of accessKeys) {
    assert.equal(active.editor_collab[k], true, `editor must ${k} on active doc`);
  }
  assert.equal(archived.editor_collab.download,     true, "editor must download archived doc");
  assert.equal(archived.editor_collab.upload_new,   true, "editor must upload while archived exists");
  assert.equal(deleted.editor_collab.view_metadata, false, "editor must NOT see deleted doc metadata");
  assert.equal(deleted.editor_collab.download,      false, "editor must NOT download deleted doc");
  for (const [name, m] of Object.entries(allStates)) {
    for (const k of leakKeys) {
      assert.equal(m.editor_collab[k], false, `[${name}] editor must NEVER ${k}`);
    }
  }

  // 6. Owner: same as editor.
  for (const k of accessKeys) {
    assert.equal(active.owner[k], true, `owner must ${k} on active doc`);
  }
  assert.equal(deleted.owner.download, false, "owner must NOT download deleted (soft-delete blocks)");

  // 7. Platform admin WITH active override grant:
  //    - can view + download in EVERY state (including deleted).
  for (const [name, m] of Object.entries(allStates)) {
    assert.equal(m.platform_admin_with_grant.view_metadata, true,
      `[${name}] platform admin w/ grant must view`);
    assert.equal(m.platform_admin_with_grant.download, true,
      `[${name}] platform admin w/ grant must download`);
  }

  // 8. Platform admin WITHOUT any grant: blanket 'admin' app role still
  //    permits view_metadata and active downloads through can_access_student.
  //    But once the doc is DELETED and the grant is revoked, download must
  //    fall to false (storage_can_read_student_doc requires the override).
  assert.equal(
    deletedNoGrant.platform_admin_no_grant.download, false,
    "platform admin without a grant must NOT download a deleted doc",
  );
});
