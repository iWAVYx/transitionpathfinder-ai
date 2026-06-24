// End-to-end document access rules: upload / view / download / summarize
// across roles × document state (active / archived / deleted with and
// without admin override grant), for both a connected student and an
// unrelated student.
//
// Why this exists
// ---------------
// Document hardening introduced soft-delete (`archived_at`, `deleted_at`),
// a hard partner deny, and a 15-minute platform-admin override grant
// (`admin_doc_access_grants`). The actual gates live across three RLS
// policies on `public.documents` + the storage helper
// `public.storage_can_read_student_doc`. A single bad change to any of
// these can either (a) leak archived/deleted IEPs to unrelated users, or
// (b) lock case managers out of an active IEP.
//
// This suite seeds four documents on a connected student (active,
// archived, deleted-with-grant, deleted-without-grant) plus one document
// on an unrelated student, then probes every actor against the SAME
// boolean expressions the three SELECT policies and the storage helper
// evaluate. Everything runs inside a transaction that is ROLLBACK'd, so
// nothing leaks into the database.
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
  v_doc_active uuid;
  v_doc_archived uuid;
  v_doc_deleted_grant uuid;
  v_doc_deleted_nogrant uuid;
  v_other_doc uuid;
  v_path_active text;
  v_path_archived text;
  v_path_deleted_grant text;
  v_path_deleted_nogrant text;
  v_other_path text;
  v_ts bigint := extract(epoch from clock_timestamp())::bigint;
BEGIN
  SELECT s.id, s.owner_id INTO v_student, v_owner
  FROM public.students s ORDER BY s.created_at LIMIT 1;

  SELECT s.id INTO v_other_student
  FROM public.students s
  WHERE s.id <> v_student AND s.owner_id <> v_owner
  ORDER BY s.created_at LIMIT 1;

  SELECT ur.user_id INTO v_admin
  FROM public.user_roles ur
  WHERE ur.role='admin'
    AND EXISTS (SELECT 1 FROM public.admin_roles ar
                WHERE ar.user_id = ur.user_id
                  AND ar.role IN ('platform_owner','platform_admin'))
  ORDER BY ur.user_id LIMIT 1;
  IF v_admin IS NULL THEN
    SELECT user_id INTO v_admin FROM public.user_roles
    WHERE role='admin' ORDER BY user_id LIMIT 1;
  END IF;

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

  WITH picks AS (
    SELECT p.id, row_number() OVER (ORDER BY p.id) AS rn
    FROM public.profiles p
    WHERE p.id <> v_owner
      AND p.id <> COALESCE(v_admin,  '00000000-0000-0000-0000-000000000000')
      AND p.id <> COALESCE(v_partner,'00000000-0000-0000-0000-000000000000')
      AND NOT EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id=p.id AND ur.role IN ('admin','partner')
      )
      -- Must have NO pre-existing relationship to either student so the
      -- leak probes are meaningful. (Seed data sometimes wires the same
      -- profile to multiple students; without this filter the editor/
      -- viewer pick could already own/collaborate on the "unrelated"
      -- student and the leak invariant would fire on healthy schemas.)
      AND NOT public.can_access_student(p.id, v_student)
      AND NOT public.can_access_student(p.id, v_other_student)
  )
  SELECT (SELECT id FROM picks WHERE rn=1),
         (SELECT id FROM picks WHERE rn=2),
         (SELECT id FROM picks WHERE rn=3)
  INTO v_editor, v_viewer, v_unrelated;

  IF v_owner IS NULL OR v_student IS NULL OR v_other_student IS NULL
     OR v_editor IS NULL OR v_viewer IS NULL OR v_unrelated IS NULL
     OR v_admin IS NULL THEN
    RAISE EXCEPTION 'Insufficient seed (owner=% student=% other_student=% editor=% viewer=% unrelated=% admin=% partner=%)',
      v_owner, v_student, v_other_student, v_editor, v_viewer, v_unrelated, v_admin, v_partner;
  END IF;

  INSERT INTO public.student_collaborators(student_id, user_id, invited_email, invited_by, role, status)
  VALUES
    (v_student, v_editor, 'doc-e2e-editor@test.local', v_owner, 'editor', 'accepted'),
    (v_student, v_viewer, 'doc-e2e-viewer@test.local', v_owner, 'viewer', 'accepted')
  ON CONFLICT DO NOTHING;

  -- Seed FOUR documents on the connected student: one per state.
  v_path_active         := v_student::text || '/doc-e2e-active-'         || v_ts || '.pdf';
  v_path_archived       := v_student::text || '/doc-e2e-archived-'       || v_ts || '.pdf';
  v_path_deleted_grant  := v_student::text || '/doc-e2e-deleted-grant-'  || v_ts || '.pdf';
  v_path_deleted_nogrant:= v_student::text || '/doc-e2e-deleted-ng-'     || v_ts || '.pdf';

  INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES
    ('student-documents', v_path_active,          v_owner, jsonb_build_object('mimetype','application/pdf','size',1024)),
    ('student-documents', v_path_archived,        v_owner, jsonb_build_object('mimetype','application/pdf','size',1024)),
    ('student-documents', v_path_deleted_grant,   v_owner, jsonb_build_object('mimetype','application/pdf','size',1024)),
    ('student-documents', v_path_deleted_nogrant, v_owner, jsonb_build_object('mimetype','application/pdf','size',1024));

  INSERT INTO public.documents
    (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at, archived_at, deleted_at)
  VALUES
    (v_student, v_owner, 'current-iep', 'E2E Active',         v_path_active,          'application/pdf', 1024, 'team', now(), NULL, NULL)
  RETURNING id INTO v_doc_active;
  INSERT INTO public.documents
    (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at, archived_at, deleted_at)
  VALUES
    (v_student, v_owner, 'current-iep', 'E2E Archived',       v_path_archived,        'application/pdf', 1024, 'team', now(), now(), NULL)
  RETURNING id INTO v_doc_archived;
  INSERT INTO public.documents
    (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at, archived_at, deleted_at)
  VALUES
    (v_student, v_owner, 'current-iep', 'E2E Deleted+Grant',  v_path_deleted_grant,   'application/pdf', 1024, 'team', now(), NULL, now())
  RETURNING id INTO v_doc_deleted_grant;
  INSERT INTO public.documents
    (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at, archived_at, deleted_at)
  VALUES
    (v_student, v_owner, 'current-iep', 'E2E Deleted NoGrant', v_path_deleted_nogrant,'application/pdf', 1024, 'team', now(), NULL, now())
  RETURNING id INTO v_doc_deleted_nogrant;

  -- Unrelated student's active doc for the leak probes.
  v_other_path := v_other_student::text || '/doc-e2e-other-' || v_ts || '.pdf';
  INSERT INTO storage.objects (bucket_id, name, owner, metadata)
  VALUES ('student-documents', v_other_path,
          (SELECT owner_id FROM public.students WHERE id=v_other_student),
          jsonb_build_object('mimetype','application/pdf','size',2048));
  INSERT INTO public.documents
    (student_id, uploaded_by, doc_type, title, storage_path, mime_type, size_bytes, visibility, consent_acknowledged_at)
  VALUES (v_other_student,
          (SELECT owner_id FROM public.students WHERE id=v_other_student),
          'current-iep', 'Other E2E IEP', v_other_path, 'application/pdf', 2048, 'team', now())
  RETURNING id INTO v_other_doc;

  -- Mint a 10-minute platform-admin override grant on the
  -- "deleted_grant" doc only. Everything else has no grant, so we can
  -- exercise BOTH paths through the override gate.
  INSERT INTO public.admin_doc_access_grants (actor_id, document_id, reason, expires_at)
  VALUES (v_admin, v_doc_deleted_grant, 'e2e test grant', now() + interval '10 minutes');

  CREATE TEMP TABLE __doc_ctx(
    student_id uuid, other_student_id uuid,
    doc_active uuid, doc_archived uuid,
    doc_deleted_grant uuid, doc_deleted_nogrant uuid,
    other_doc uuid,
    path_active text, path_archived text,
    path_deleted_grant text, path_deleted_nogrant text,
    other_path text
  ) ON COMMIT DROP;
  INSERT INTO __doc_ctx VALUES (
    v_student, v_other_student,
    v_doc_active, v_doc_archived, v_doc_deleted_grant, v_doc_deleted_nogrant,
    v_other_doc,
    v_path_active, v_path_archived, v_path_deleted_grant, v_path_deleted_nogrant,
    v_other_path
  );

  CREATE TEMP TABLE __doc_actors(label text PRIMARY KEY, uid uuid) ON COMMIT DROP;
  INSERT INTO __doc_actors VALUES
    ('owner', v_owner),
    ('editor_collab', v_editor),
    ('viewer_collab', v_viewer),
    ('unrelated', v_unrelated),
    ('platform_admin', v_admin);
  IF v_partner IS NOT NULL THEN
    INSERT INTO __doc_actors VALUES ('partner_only', v_partner);
  END IF;
END
$do$;

-- Build a per-(state, actor) matrix that mirrors:
--   documents SELECT  = (active policy) OR (archived_editors) OR (admin_override)
--   storage  SELECT  = public.storage_can_read_student_doc
--   document_summaries SELECT/INSERT/UPDATE/DELETE = can_access / can_edit
-- The "state" labels map to a specific seeded doc + storage path so we
-- never need UPDATE privileges on public.documents.
WITH ctx AS (SELECT * FROM __doc_ctx),
viewers AS (
  SELECT label, uid FROM __doc_actors UNION ALL SELECT 'anon', NULL
),
states AS (
  SELECT 'active'              AS state, ctx.doc_active          AS doc_id, ctx.path_active          AS path FROM ctx
  UNION ALL SELECT 'archived', ctx.doc_archived,        ctx.path_archived        FROM ctx
  UNION ALL SELECT 'deleted_with_grant',   ctx.doc_deleted_grant,    ctx.path_deleted_grant   FROM ctx
  UNION ALL SELECT 'deleted_no_grant',     ctx.doc_deleted_nogrant,  ctx.path_deleted_nogrant FROM ctx
),
joined AS (
  SELECT s.state, v.label AS viewer, v.uid,
         d.archived_at, d.deleted_at, s.doc_id, s.path,
         (SELECT student_id FROM ctx) AS student_id,
         (SELECT other_doc  FROM ctx) AS other_doc,
         (SELECT other_path FROM ctx) AS other_path
  FROM states s
  JOIN public.documents d ON d.id = s.doc_id
  CROSS JOIN viewers v
),
probes AS (
  SELECT state, viewer,
    json_build_object(
      'view_metadata', (
        uid IS NOT NULL AND (
          (archived_at IS NULL AND deleted_at IS NULL
            AND NOT public.is_partner_only(uid)
            AND (public.can_access_student(uid, student_id)
                 OR public.can_view_document(uid, doc_id)))
          OR
          (archived_at IS NOT NULL AND deleted_at IS NULL
            AND NOT public.is_partner_only(uid)
            AND public.can_edit_student(uid, student_id))
          OR
          public.has_recent_admin_doc_access(uid, doc_id)
        )
      ),
      'download',
        (uid IS NOT NULL AND public.storage_can_read_student_doc(uid, path)),
      'upload_new',
        (uid IS NOT NULL
          AND public.can_edit_student(uid, student_id)
          AND NOT public.is_partner_only(uid)),
      'read_summary',
        (uid IS NOT NULL AND public.can_access_student(uid, student_id)),
      'write_summary',
        (uid IS NOT NULL
          AND public.can_edit_student(uid, student_id)
          AND NOT public.is_partner_only(uid)),
      'leak_view_unrelated', (
        uid IS NOT NULL AND (
          (NOT public.is_partner_only(uid)
           AND (public.can_access_student(uid,
                  (SELECT student_id FROM public.documents WHERE id = other_doc))
                OR public.can_view_document(uid, other_doc)))
          OR public.has_recent_admin_doc_access(uid, other_doc)
        )
      ),
      'leak_download_unrelated',
        (uid IS NOT NULL AND public.storage_can_read_student_doc(uid, other_path))
    ) AS perms
  FROM joined
)
SELECT json_object_agg(state, by_viewer ORDER BY state)::text
FROM (
  SELECT state, json_object_agg(viewer, perms ORDER BY viewer) AS by_viewer
  FROM probes
  GROUP BY state
) g;

ROLLBACK;
`;

function parseJson(out) {
  const line = out
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{") && l.endsWith("}"))
    .pop();
  return line ? JSON.parse(line) : null;
}

test("document access matrix across roles × state matches snapshot", { skip: SKIP }, () => {
  const out = psqlScript(SQL);
  const current = parseJson(out);
  assert.ok(current, `psql produced no matrix JSON:\n${out}`);
  for (const k of ["active", "archived", "deleted_with_grant", "deleted_no_grant"]) {
    assert.ok(current[k], `matrix missing state '${k}'`);
  }

  if (UPDATE) {
    writeSnap(SNAP, current);
    return;
  }
  const expected = readSnap(SNAP);
  assert.ok(expected, "Missing snapshot. Run with UPDATE_SNAPSHOTS=1.");
  assert.deepEqual(current, expected,
    "Document access matrix drifted. A role gained or lost access it shouldn't.");

  // --- Hard invariants (independent of the snapshot) ---------------------
  const accessKeys = ["view_metadata", "download", "upload_new", "read_summary", "write_summary"];
  const leakKeys = ["leak_view_unrelated", "leak_download_unrelated"];
  const allStates = ["active", "archived", "deleted_with_grant", "deleted_no_grant"];

  // 1. Anon: zero access of any kind, every state, no leaks.
  for (const state of allStates) {
    for (const k of [...accessKeys, ...leakKeys]) {
      assert.equal(current[state].anon[k], false,
        `[${state}] anon must NEVER ${k}`);
    }
  }

  // 2. Unrelated user: zero access of any kind, every state, no leaks.
  for (const state of allStates) {
    for (const k of [...accessKeys, ...leakKeys]) {
      assert.equal(current[state].unrelated[k], false,
        `[${state}] unrelated user must NEVER ${k}`);
    }
  }

  // 3. Partner-only (when seeded): hard deny on EVERYTHING.
  if (current.active.partner_only) {
    for (const state of allStates) {
      for (const k of [...accessKeys, ...leakKeys]) {
        assert.equal(current[state].partner_only[k], false,
          `[${state}] partner_only must NEVER ${k}`);
      }
    }
  }

  // 4. Viewer collaborator on connected student.
  //    Active doc: read yes, write no.
  assert.equal(current.active.viewer_collab.view_metadata, true,
    "viewer must see active doc metadata");
  assert.equal(current.active.viewer_collab.download, true,
    "viewer must download active doc");
  assert.equal(current.active.viewer_collab.read_summary, true,
    "viewer must read active summary");
  assert.equal(current.active.viewer_collab.upload_new, false,
    "viewer must NOT upload");
  assert.equal(current.active.viewer_collab.write_summary, false,
    "viewer must NOT write summary");
  //    Archived doc: viewer is NOT an editor → cannot see or download.
  assert.equal(current.archived.viewer_collab.view_metadata, false,
    "viewer must NOT see archived metadata");
  assert.equal(current.archived.viewer_collab.download, false,
    "viewer must NOT download archived doc");
  //    Deleted doc: invisible to viewer.
  assert.equal(current.deleted_no_grant.viewer_collab.view_metadata, false,
    "viewer must NOT see deleted doc metadata");
  assert.equal(current.deleted_no_grant.viewer_collab.download, false,
    "viewer must NOT download deleted doc");

  // 5. Editor collaborator on connected student.
  for (const k of accessKeys) {
    assert.equal(current.active.editor_collab[k], true,
      `editor must ${k} on active doc`);
  }
  //    Editors can still reach an archived doc (rehydrate path).
  assert.equal(current.archived.editor_collab.view_metadata, true,
    "editor must see archived metadata");
  assert.equal(current.archived.editor_collab.download, true,
    "editor must download archived doc");
  //    Editors cannot reach a deleted doc without an override grant.
  assert.equal(current.deleted_no_grant.editor_collab.view_metadata, false,
    "editor must NOT see deleted metadata without override");
  assert.equal(current.deleted_no_grant.editor_collab.download, false,
    "editor must NOT download deleted doc without override");
  for (const state of allStates) {
    for (const k of leakKeys) {
      assert.equal(current[state].editor_collab[k], false,
        `[${state}] editor must NEVER ${k}`);
    }
  }

  // 6. Owner mirrors editor on the soft-delete invariant.
  assert.equal(current.deleted_no_grant.owner.view_metadata, false,
    "owner must NOT see a soft-deleted doc without override");
  assert.equal(current.deleted_no_grant.owner.download, false,
    "owner must NOT download a soft-deleted doc without override");

  // 7. Platform admin WITH an active grant on a deleted doc:
  //    view + download must both succeed via the override gate.
  assert.equal(current.deleted_with_grant.platform_admin.view_metadata, true,
    "platform admin with grant must see deleted doc metadata");
  assert.equal(current.deleted_with_grant.platform_admin.download, true,
    "platform admin with grant must download deleted doc");

  // 8. Platform admin WITHOUT a grant on a deleted doc:
  //    download must fail — the deleted branch of storage_can_read_student_doc
  //    requires an explicit override.
  assert.equal(current.deleted_no_grant.platform_admin.download, false,
    "platform admin without a grant must NOT download a deleted doc");
});
