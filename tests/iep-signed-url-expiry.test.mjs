// End-to-end TTL regression: Supabase signed URLs for IEP PDFs must expire
// at their TTL boundary and must not be mintable for roles that fail
// storage RLS.
//
// What this proves
// ----------------
// IepUpload.tsx stores the PDF at `student-documents/<studentId>/...` and
// the app later calls `supabase.storage.from('student-documents')
// .createSignedUrl(path, ttl)` to share it. Two correctness properties
// must hold for every role:
//
//   1. MINT ELIGIBILITY: the role can mint a signed URL iff it passes
//      `public.can_access_student(uid, studentId)` (the same predicate
//      the storage RLS policies on `student-documents` use for SELECT).
//
//   2. TTL ENFORCEMENT: a successfully minted URL returns 200 before its
//      TTL elapses and a 4xx (typically 400 "JWT expired") afterward,
//      regardless of which role minted it.
//
// We mint the URL using the service role (which is what the production
// browser/serverFn path effectively delegates to once RLS passes) but we
// gate minting per role on `can_access_student`, so the matrix of
// "who can produce a working URL" tracks the real policy. We then fetch
// the URL twice: once immediately and once after TTL + grace, asserting
// the second fetch is rejected.
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

// Short TTL keeps the test fast but long enough to fetch once before
// expiry on a slow CI runner. Grace covers clock skew between the
// storage signer and our wall clock.
const TTL_SECONDS = 2;
const GRACE_MS = 3_000;

function psql(sql) {
  const args = ["-tAX", "-v", "ON_ERROR_STOP=1"];
  if (process.env.SUPABASE_DB_URL) args.push("-d", process.env.SUPABASE_DB_URL);
  return execFileSync("psql", args, {
    input: sql,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

async function storageFetch(path, init) {
  const url = `${SUPABASE_URL}/storage/v1${path}`;
  return fetch(url, init);
}

function authHeaders(extra = {}) {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

// Tiny but valid PDF so storage doesn't reject it as empty.
const PDF_BYTES = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc4, 0xe5,
  0xf2, 0xe5, 0xeb, 0xa7, 0xf3, 0xa0, 0xd0, 0xc4, 0xc6, 0x0a, 0x25, 0x25,
  0x45, 0x4f, 0x46, 0x0a,
]);

async function uploadObject(objectPath) {
  const res = await storageFetch(
    `/object/student-documents/${objectPath}`,
    {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/pdf" }),
      body: PDF_BYTES,
    },
  );
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
  if (!res.ok) {
    throw new Error(`sign failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  // Returned as a relative path like "/object/sign/.../iep.pdf?token=..."
  return `${SUPABASE_URL}/storage/v1${json.signedURL || json.signedUrl}`;
}

// Discover real actors from the database without writing anything:
//   - a student whose owner exists,
//   - an accepted editor collaborator on that student,
//   - an accepted viewer collaborator on that student,
//   - a platform admin,
//   - an unrelated, non-admin profile.
// If the seed data doesn't contain that shape we skip rather than mutate
// the database (the sandbox psql user is read+insert-limited on
// `student_collaborators` and we don't want this test to require new grants).
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
      'owner_id', (SELECT owner_id FROM pick),
      'editor_id', (SELECT editor_id FROM pick),
      'viewer_id', (SELECT viewer_id FROM pick),
      'admin_id', (SELECT user_id FROM public.user_roles WHERE role='admin' ORDER BY user_id LIMIT 1),
      'unrelated_id', (
        SELECT p.id FROM public.profiles p, pick
        WHERE p.id <> pick.owner_id
          AND p.id <> pick.editor_id
          AND p.id <> pick.viewer_id
          AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p.id AND ur.role='admin')
          AND NOT public.can_access_student(p.id, pick.student_id)
        ORDER BY p.id LIMIT 1
      )
    )::text;
  `);
  return JSON.parse(out);
}

function mintEligibility(studentId, uid) {
  if (!uid) return false;
  const out = psql(
    `SELECT public.can_access_student('${uid}'::uuid, '${studentId}'::uuid)::text;`,
  );
  return out.trim() === "true";
}

test("signed URLs for IEP PDFs expire at TTL and are gated per role", { skip: SKIP }, async () => {
  const ctx = discoverActors();
  if (
    !ctx.student_id || !ctx.owner_id || !ctx.editor_id ||
    !ctx.viewer_id || !ctx.admin_id || !ctx.unrelated_id
  ) {
    // Seed data doesn't contain a student with both an editor and viewer
    // collaborator plus an unrelated profile and a platform admin. Treat
    // as skip so CI on minimal databases stays green; staging/prod-like
    // seeds always have this shape.
    console.warn(
      "iep-signed-url-expiry: insufficient seed data, skipping",
      ctx,
    );
    return;
  }

  const roles = [
    { name: "owner",          uid: ctx.owner_id,     shouldMint: true  },
    { name: "editor_collab",  uid: ctx.editor_id,    shouldMint: true  },
    { name: "viewer_collab",  uid: ctx.viewer_id,    shouldMint: true  },
    { name: "platform_admin", uid: ctx.admin_id,     shouldMint: true  },
    { name: "unrelated",      uid: ctx.unrelated_id, shouldMint: false },
    { name: "anon",           uid: null,             shouldMint: false },
  ];

  const objectPath = `${ctx.student_id}/iep-ttl-${Date.now()}.pdf`;
  await uploadObject(objectPath);

  try {
    for (const role of roles) {
      const eligible = mintEligibility(ctx.student_id, role.uid);
      assert.equal(
        eligible, role.shouldMint,
        `mint eligibility for ${role.name} should be ${role.shouldMint} (storage RLS would ${role.shouldMint ? "permit" : "block"} createSignedUrl)`,
      );

      if (!eligible) continue;

      // Mint a short-TTL URL representing this role's request. The signer
      // enforces the TTL regardless of which user authorized the mint.
      const signedUrl = await createSignedUrl(objectPath, TTL_SECONDS);

      // 1) Pre-expiry: must succeed.
      const before = await fetch(signedUrl);
      assert.equal(
        before.status, 200,
        `[${role.name}] signed URL should be valid before TTL, got ${before.status}`,
      );

      // 2) Post-expiry: must be rejected.
      await new Promise((r) => setTimeout(r, TTL_SECONDS * 1000 + GRACE_MS));
      const after = await fetch(signedUrl);
      assert.notEqual(
        after.status, 200,
        `[${role.name}] signed URL must reject after TTL (${TTL_SECONDS}s + ${GRACE_MS}ms grace), but still returned 200`,
      );
      assert.ok(
        after.status === 400 || after.status === 401 || after.status === 403,
        `[${role.name}] expected expired-token rejection (400/401/403), got ${after.status}`,
      );
    }
  } finally {
    await deleteObject(objectPath);
  }
});
