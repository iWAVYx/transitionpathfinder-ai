// Slice 3 (I-04): explicit role revocation propagation regression.
//
// Verifies that removing a role/membership row from the database causes the
// authorization primitives that RLS policies rely on to flip on the very
// next read — no caching layer, no client-side escalation path. If any of
// these checks continued to return true after the row was deleted, a
// revoked user could keep loading protected data until their JWT expired.
//
// Roles covered:
//   * has_role(user_id, 'admin')       — platform admin
//   * has_admin_role(user_id, 'platform_admin')
//   * is_org_admin(user_id, org_id)    — org-scoped admin
//   * is_org_member(user_id, org_id)   — org membership
//   * can_access_student / can_edit_student — student collaborator
//
// Each mutation is wrapped in save-and-restore so the DB is left as-is.
// Skips cleanly without DB / privileges.

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

function canMutate() {
  try {
    psql(`
      DO $$ BEGIN
        IF NOT has_table_privilege(current_user, 'public.user_roles', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.user_roles', 'INSERT')
           OR NOT has_table_privilege(current_user, 'public.admin_roles', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.admin_roles', 'INSERT')
           OR NOT has_table_privilege(current_user, 'public.organization_memberships', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.organization_memberships', 'INSERT')
           OR NOT has_table_privilege(current_user, 'public.student_collaborators', 'DELETE')
           OR NOT has_table_privilege(current_user, 'public.student_collaborators', 'INSERT')
        THEN RAISE EXCEPTION 'insufficient privileges'; END IF;
      END $$;
    `);
    return true;
  } catch {
    return false;
  }
}

function bool(sql) {
  return psql(sql).trim() === "true";
}

async function withRestore(restore, body) {
  try { await body(); } finally {
    try { restore(); } catch (e) { console.error("restore failed:", e); throw e; }
  }
}

test("role revocation propagates immediately across app-surface primitives", { skip: SKIP }, async () => {
  if (!canMutate()) {
    console.warn("role-revocation-propagation: current DB role lacks INSERT/DELETE; skipping (CI uses service role)");
    return;
  }

  // ---- platform admin revocation (has_role + has_admin_role) ---------------
  const adminCtx = JSON.parse(psql(`
    SELECT json_build_object(
      'user_role_uid',
        (SELECT user_id FROM public.user_roles WHERE role='admin' ORDER BY user_id LIMIT 1),
      'admin_role_uid',
        (SELECT user_id FROM public.admin_roles WHERE role='platform_admin' ORDER BY user_id LIMIT 1)
    )::text;
  `));

  if (adminCtx.user_role_uid) {
    const uid = adminCtx.user_role_uid;
    assert.equal(bool(`SELECT public.has_role('${uid}'::uuid, 'admin')::text;`), true);
    await withRestore(
      () => psql(`INSERT INTO public.user_roles (user_id, role) VALUES ('${uid}'::uuid, 'admin') ON CONFLICT DO NOTHING;`),
      async () => {
        psql(`DELETE FROM public.user_roles WHERE user_id='${uid}'::uuid AND role='admin';`);
        assert.equal(
          bool(`SELECT public.has_role('${uid}'::uuid, 'admin')::text;`), false,
          "has_role('admin') must flip false immediately after DELETE",
        );
      },
    );
  } else {
    console.warn("no user_roles admin to test");
  }

  if (adminCtx.admin_role_uid) {
    const uid = adminCtx.admin_role_uid;
    assert.equal(bool(`SELECT public.has_admin_role('${uid}'::uuid, 'platform_admin')::text;`), true);
    // Snapshot the row to preserve non-key columns (invited_at, etc.).
    const row = psql(`SELECT to_jsonb(a)::text FROM public.admin_roles a WHERE user_id='${uid}'::uuid AND role='platform_admin' LIMIT 1;`);
    const payload = row.replace(/'/g, "''");
    await withRestore(
      () => psql(`INSERT INTO public.admin_roles SELECT * FROM jsonb_populate_record(NULL::public.admin_roles, '${payload}'::jsonb) ON CONFLICT DO NOTHING;`),
      async () => {
        psql(`DELETE FROM public.admin_roles WHERE user_id='${uid}'::uuid AND role='platform_admin';`);
        assert.equal(
          bool(`SELECT public.has_admin_role('${uid}'::uuid, 'platform_admin')::text;`), false,
          "has_admin_role('platform_admin') must flip false immediately after DELETE",
        );
        assert.equal(
          bool(`SELECT public.is_platform_admin('${uid}'::uuid)::text;`), false,
          "is_platform_admin must flip false immediately after DELETE (unless user still holds platform_owner)",
        );
      },
    );
  } else {
    console.warn("no admin_roles platform_admin to test");
  }

  // ---- org membership revocation (is_org_admin + is_org_member) ------------
  const orgCtx = JSON.parse(psql(`
    SELECT to_jsonb(m)::text FROM public.organization_memberships m
    WHERE m.status='active' AND m.membership_status='active'
      AND m.role_within_org IN ('admin','owner','school_admin','district_admin')
    ORDER BY m.user_id, m.organization_id LIMIT 1;
  `) || "null");
  if (orgCtx && orgCtx.user_id && orgCtx.organization_id) {
    const uid = orgCtx.user_id, oid = orgCtx.organization_id;
    assert.equal(bool(`SELECT public.is_org_admin('${uid}'::uuid, '${oid}'::uuid)::text;`), true);
    assert.equal(bool(`SELECT public.is_org_member('${uid}'::uuid, '${oid}'::uuid)::text;`), true);
    const payload = JSON.stringify(orgCtx).replace(/'/g, "''");
    await withRestore(
      () => psql(`INSERT INTO public.organization_memberships SELECT * FROM jsonb_populate_record(NULL::public.organization_memberships, '${payload}'::jsonb) ON CONFLICT DO NOTHING;`),
      async () => {
        psql(`DELETE FROM public.organization_memberships WHERE user_id='${uid}'::uuid AND organization_id='${oid}'::uuid;`);
        // If the user still has platform admin, is_org_admin stays true — skip that assertion in that case.
        const stillPlatformAdmin = bool(`SELECT public.has_role('${uid}'::uuid, 'admin')::text;`);
        if (!stillPlatformAdmin) {
          assert.equal(
            bool(`SELECT public.is_org_admin('${uid}'::uuid, '${oid}'::uuid)::text;`), false,
            "is_org_admin must flip false immediately after membership DELETE",
          );
        }
        assert.equal(
          bool(`SELECT public.is_org_member('${uid}'::uuid, '${oid}'::uuid)::text;`), false,
          "is_org_member must flip false immediately after membership DELETE",
        );
      },
    );
  } else {
    console.warn("no active org-admin membership to test");
  }

  // ---- student collaborator revocation (can_access_student / can_edit_student) ----
  const collabCtx = JSON.parse(psql(`
    SELECT to_jsonb(c)::text FROM public.student_collaborators c
    WHERE c.status='accepted' AND c.role='editor'
      AND NOT public.has_role(c.user_id, 'admin')
      AND NOT EXISTS (SELECT 1 FROM public.students s WHERE s.id=c.student_id AND s.owner_id=c.user_id)
    ORDER BY c.student_id, c.user_id LIMIT 1;
  `) || "null");
  if (collabCtx && collabCtx.user_id && collabCtx.student_id) {
    const uid = collabCtx.user_id, sid = collabCtx.student_id;
    assert.equal(bool(`SELECT public.can_access_student('${uid}'::uuid, '${sid}'::uuid)::text;`), true);
    assert.equal(bool(`SELECT public.can_edit_student('${uid}'::uuid, '${sid}'::uuid)::text;`), true);
    const payload = JSON.stringify(collabCtx).replace(/'/g, "''");
    await withRestore(
      () => psql(`INSERT INTO public.student_collaborators SELECT * FROM jsonb_populate_record(NULL::public.student_collaborators, '${payload}'::jsonb) ON CONFLICT DO NOTHING;`),
      async () => {
        psql(`DELETE FROM public.student_collaborators WHERE student_id='${sid}'::uuid AND user_id='${uid}'::uuid AND status='accepted';`);
        assert.equal(
          bool(`SELECT public.can_access_student('${uid}'::uuid, '${sid}'::uuid)::text;`), false,
          "can_access_student must flip false immediately after collaborator DELETE",
        );
        assert.equal(
          bool(`SELECT public.can_edit_student('${uid}'::uuid, '${sid}'::uuid)::text;`), false,
          "can_edit_student must flip false immediately after collaborator DELETE",
        );
      },
    );
  } else {
    console.warn("no eligible editor collaborator to test");
  }
});
