// Credential-free PostgreSQL tests. See docs/channel-history-removal.md to run.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { PGlite } = await import(
  process.env.CHANNEL_HISTORY_PGLITE_MODULE
    ? pathToFileURL(process.env.CHANNEL_HISTORY_PGLITE_MODULE).href
    : "@electric-sql/pglite"
);
const owner = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const stranger = "00000000-0000-4000-8000-000000000003";
const student = "00000000-0000-4000-8000-000000000010";
const collab = "00000000-0000-4000-8000-000000000020";
const channel = "00000000-0000-4000-8000-000000000030";
const message = "00000000-0000-4000-8000-000000000040";
const attachment = "00000000-0000-4000-8000-000000000050";
const fixture = `
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth, storage TO authenticated;
CREATE TABLE public.organizations (id uuid PRIMARY KEY);
CREATE TABLE public.students (id uuid PRIMARY KEY, owner_id uuid, student_user_id uuid, first_name text DEFAULT 'Student', last_name text, organization_id uuid);
CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, preferred_name text);
CREATE TABLE public.student_collaborators (id uuid PRIMARY KEY, student_id uuid, user_id uuid, status text);
CREATE TABLE public.student_relationships (id uuid PRIMARY KEY, student_id uuid, related_user_id uuid, consent_status text);
CREATE TABLE public.student_team_members (id uuid PRIMARY KEY, student_id uuid, member_user_id uuid, status text, role_on_team text);
CREATE TABLE public.student_guardians (id uuid PRIMARY KEY, student_id uuid, guardian_user_id uuid);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text, updated_at timestamptz DEFAULT now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON storage.objects TO authenticated;
CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION public.is_org_admin(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
CREATE FUNCTION public.safe_channel_id_from_path(text) RETURNS uuid LANGUAGE sql AS $$ SELECT split_part($1,'/',1)::uuid $$;
CREATE FUNCTION public.can_edit_student(u uuid, s uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS
  $$ SELECT EXISTS (SELECT 1 FROM public.students WHERE id=s AND owner_id=u) $$;
CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS
  $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
`;
async function database() {
  const db = new PGlite();
  await db.exec(fixture);
  const foundation = readFileSync(
    "supabase/migrations/20260721000023_94010d16-d613-440f-ba22-7d51a02e7dab.sql",
    "utf8",
  ).replace(/ALTER PUBLICATION supabase_realtime ADD TABLE[^;]+;/g, "");
  await db.exec(foundation);
  await db.exec(
    readFileSync(
      "supabase/migrations/20260721011205_059903d7-4ea9-4ceb-b583-ad510e015ead.sql",
      "utf8",
    ),
  );
  await db.exec(readFileSync("supabase/migrations/20260928040000_atomic_student_channel_start.sql", "utf8"));
  await db.exec(
    readFileSync("supabase/migrations/20260929010000_student_channel_removal_history.sql", "utf8"),
  );
  await db.exec(`
    INSERT INTO auth.users VALUES ('${owner}'), ('${member}'), ('${stranger}');
    INSERT INTO public.students (id,owner_id,student_user_id) VALUES ('${student}','${owner}',NULL);
    INSERT INTO public.profiles VALUES ('${owner}','Owner',NULL),('${member}','Member',NULL);
    INSERT INTO public.student_collaborators VALUES ('${collab}','${student}','${member}','accepted');
    INSERT INTO public.channels (id,kind,title,student_id,created_by) VALUES ('${channel}','student_transition','Original title','${student}','${owner}');
    INSERT INTO public.channel_members (channel_id,user_id,member_role) VALUES ('${channel}','${owner}','owner'),('${channel}','${member}','member');
    INSERT INTO public.channel_messages (id,channel_id,author_id,body) VALUES ('${message}','${channel}','${member}','Original message');
    INSERT INTO public.channel_attachments (id,message_id,channel_id,storage_path,file_name,scan_status,uploaded_by)
      VALUES ('${attachment}','${message}','${channel}','${channel}/old.pdf','old.pdf','clean','${owner}');
    INSERT INTO storage.objects (bucket_id,name) VALUES ('channel-attachments','${channel}/old.pdf');
  `);
  return db;
}
async function as(db, user) {
  await db.exec(
    `RESET ROLE; SELECT set_config('request.jwt.claim.sub','${user}',false); SET ROLE authenticated;`,
  );
}
async function remove(db, choice = "keep_read_only") {
  await as(db, owner);
  await db.query(`SELECT public.remove_student_member('collaborator',$1,$2)`, [collab, choice]);
}
async function count(db, table) {
  return Number((await db.query(`SELECT count(*) AS n FROM ${table}`)).rows[0].n);
}

test("keep history freezes text and title; blocks live reads, writes, self-reactivation and unrelated readers", async () => {
  const db = await database();
  try {
    await remove(db);
    await db.exec(`RESET ROLE; UPDATE public.channel_messages SET body='Later edit' WHERE id='${message}';
      UPDATE public.channels SET title='Later title' WHERE id='${channel}';
      INSERT INTO public.channel_messages (channel_id,author_id,body) VALUES ('${channel}','${owner}','New message');`);
    await as(db, member);
    assert.equal(await count(db, "public.channel_messages"), 0);
    assert.equal(await count(db, "public.channels"), 0);
    assert.equal(
      (await db.query("SELECT body FROM public.channel_history_messages")).rows[0].body,
      "Original message",
    );
    assert.equal(
      (await db.query("SELECT title FROM public.channel_history_grants")).rows[0].title,
      "Original title",
    );
    assert.equal(await count(db, "public.channel_history_messages"), 1);
    await assert.rejects(
      db.query(
        `INSERT INTO public.channel_messages(channel_id,author_id,body) VALUES ($1,$2,'No')`,
        [channel, member],
      ),
    );
    await assert.rejects(
      db.query(`UPDATE public.channel_members SET left_at=NULL WHERE user_id=$1`, [member]),
    );
    await assert.rejects(
      db.query(`UPDATE public.channel_members SET member_role='owner' WHERE user_id=$1`, [member]),
    );
    assert.equal(
      (
        await db.query(`UPDATE public.channel_messages SET body='No' WHERE id=$1 RETURNING id`, [
          message,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(`INSERT INTO public.channel_history_grants VALUES ($1,$2,'No',now())`, [
        channel,
        stranger,
      ]),
    );
    await as(db, stranger);
    assert.equal(await count(db, "public.channel_history_grants"), 0);
    assert.equal(await count(db, "public.channel_history_messages"), 0);
    await as(db, owner);
    assert.equal(await count(db, "public.channel_messages"), 2);
  } finally {
    await db.close();
  }
});

test("remove all grants no history or attachment access and audits the choice", async () => {
  const db = await database();
  try {
    await remove(db, "remove");
    await as(db, member);
    assert.equal(await count(db, "public.channel_history_grants"), 0);
    assert.equal(await count(db, "public.channel_messages"), 0);
    assert.equal(await count(db, "storage.objects"), 0);
    await db.exec("RESET ROLE");
    assert.equal(
      (await db.query("SELECT metadata FROM public.channel_audit_events")).rows[0].metadata
        .history_access,
      "remove",
    );
    const row = (
      await db.query(
        `SELECT left_at,notify_email,notify_in_app FROM public.channel_members WHERE user_id=$1`,
        [member],
      )
    ).rows[0];
    assert.ok(row.left_at);
    assert.equal(row.notify_email, false);
    assert.equal(row.notify_in_app, false);
  } finally {
    await db.close();
  }
});

test("unprivileged removal and missing choice fail without changing membership", async () => {
  const db = await database();
  try {
    for (const signature of [
      "public.remove_student_member(text,uuid,text)",
      "public.change_student_team_status(uuid,text,text,text)",
      "public.apply_student_chat_removal(uuid,uuid,text)",
      "public.close_removed_student_chats()",
      "public.guard_student_channel_member()",
      "public.purge_deleted_chat_history()",
      "public.can_read_chat_history_attachment(text)",
      "public.start_student_channel(uuid,uuid,text,text)",
      "public.list_student_channel_students()",
      "public.list_student_channel_recipients(uuid)",
      "public.is_linked_student_channel_participant(uuid,uuid)",
    ]) {
      assert.equal(
        (
          await db.query("SELECT has_function_privilege('anon',$1,'EXECUTE') AS allowed", [
            signature,
          ])
        ).rows[0].allowed,
        false,
      );
    }
    for (const actor of [member, stranger]) {
      await as(db, actor);
      await assert.rejects(
        db.query(`SELECT public.remove_student_member('collaborator',$1,'keep_read_only')`, [
          collab,
        ]),
      );
      await assert.rejects(
        db.query(`SELECT public.apply_student_chat_removal($1,$2,'keep_read_only')`, [
          student,
          member,
        ]),
      );
    }
    await as(db, owner);
    await assert.rejects(
      db.query(`SELECT public.remove_student_member('collaborator',$1,NULL)`, [collab]),
    );
    await db.exec("RESET ROLE");
    assert.equal(await count(db, "public.student_collaborators"), 1);
    assert.equal(await count(db, "public.student_channel_removals"), 0);
  } finally {
    await db.close();
  }
});

test("conversation start creates both memberships, first message and audit atomically", async () => {
  const db = await database();
  try {
    await as(db, owner);
    assert.equal((await db.query("SELECT * FROM public.list_student_channel_students()")).rows.length, 1);
    assert.deepEqual((await db.query("SELECT user_id FROM public.list_student_channel_recipients($1)", [student])).rows.map((r) => r.user_id), [member]);
    const id = (await db.query("SELECT public.start_student_channel($1,$2,'New conversation','First message') AS id", [student, member])).rows[0].id;
    assert.equal((await db.query("SELECT member_role FROM public.channel_members WHERE channel_id=$1 AND user_id=$2", [id, owner])).rows[0].member_role, 'owner');
    await as(db, member);
    assert.equal((await db.query("SELECT body FROM public.channel_messages WHERE channel_id=$1", [id])).rows[0].body, 'First message');
    await as(db, stranger);
    assert.equal((await db.query("SELECT * FROM public.list_student_channel_students()")).rows.length, 0);
    await assert.rejects(db.query("SELECT * FROM public.list_student_channel_recipients($1)", [student]));
    await db.exec('RESET ROLE');
    assert.equal((await db.query("SELECT count(*)::int AS n FROM public.channel_members WHERE channel_id=$1", [id])).rows[0].n, 2);
    assert.equal((await db.query("SELECT event_type FROM public.channel_audit_events WHERE channel_id=$1", [id])).rows[0].event_type, 'channel_created');
  } finally { await db.close(); }
});

test("a removal excludes remaining relationship links from the picker and new conversations", async () => {
  const db = await database();
  try {
    await db.exec(`INSERT INTO public.student_relationships VALUES ('${collab}','${student}','${member}','approved');`);
    await remove(db);
    assert.equal((await db.query("SELECT * FROM public.list_student_channel_recipients($1)", [student])).rows.length, 0);
    await assert.rejects(db.query("SELECT public.start_student_channel($1,$2,'Not allowed','No new message')", [student, member]));
    await as(db, member);
    assert.equal((await db.query("SELECT * FROM public.list_student_channel_students()")).rows.length, 0);
    await assert.rejects(db.query("SELECT * FROM public.list_student_channel_recipients($1)", [student]));
    await assert.rejects(db.query("SELECT public.start_student_channel($1,$2,'Not allowed','No new message')", [student, owner]));
    assert.equal(await count(db, 'public.channel_history_messages'), 1);
    await db.exec('RESET ROLE');
    assert.equal(await count(db, 'public.channels'), 1);
    assert.equal(await count(db, 'public.channel_messages'), 1);
  } finally { await db.close(); }
});

test("invalid participants and a failed first-message insert leave no partial conversation", async () => {
  const db = await database();
  try {
    await as(db, owner);
    for (const recipient of [owner, stranger]) {
      await assert.rejects(db.query("SELECT public.start_student_channel($1,$2,'Not allowed','First message')", [student, recipient]));
    }
    await db.exec(`RESET ROLE;
      CREATE FUNCTION public.reject_first_message() RETURNS trigger LANGUAGE plpgsql AS
        $$ BEGIN RAISE EXCEPTION 'Simulated message failure'; END $$;
      CREATE TRIGGER reject_first_message BEFORE INSERT ON public.channel_messages
        FOR EACH ROW EXECUTE FUNCTION public.reject_first_message();`);
    await as(db, owner);
    await assert.rejects(db.query("SELECT public.start_student_channel($1,$2,'Failed conversation','First message')", [student, member]));
    await db.exec('RESET ROLE');
    assert.equal(await count(db, 'public.channels'), 1);
    assert.equal(await count(db, 'public.channel_members'), 2);
    assert.equal(await count(db, 'public.channel_messages'), 1);
    assert.equal(await count(db, 'public.channel_audit_events'), 0);
  } finally { await db.close(); }
});

test("historical downloads enforce captured identity and current scan verdict; deleted messages purge history", async () => {
  const db = await database();
  try {
    await remove(db);
    await as(db, member);
    assert.equal(await count(db, "storage.objects"), 1);
    await db.exec(
      `RESET ROLE; UPDATE storage.objects SET updated_at=clock_timestamp() WHERE name='${channel}/old.pdf';`,
    );
    await as(db, member);
    assert.equal(await count(db, "storage.objects"), 0);
    await db.exec(
      `RESET ROLE; UPDATE storage.objects SET updated_at=(SELECT storage_updated_at FROM public.channel_history_attachments LIMIT 1);`,
    );
    await db.exec(
      `RESET ROLE; UPDATE public.channel_attachments SET scan_status='infected' WHERE id='${attachment}';`,
    );
    await as(db, member);
    assert.equal(await count(db, "storage.objects"), 0);
    await db.exec(
      `RESET ROLE; UPDATE public.channel_attachments SET scan_status='clean',storage_path='replacement.pdf' WHERE id='${attachment}';`,
    );
    await as(db, member);
    assert.equal(await count(db, "storage.objects"), 0);
    await db.exec(
      `RESET ROLE; UPDATE public.channel_messages SET deleted_at=now() WHERE id='${message}';`,
    );
    await as(db, member);
    assert.equal(await count(db, "public.channel_history_messages"), 0);
    assert.equal(await count(db, "public.channel_history_attachments"), 0);
  } finally {
    await db.close();
  }
});

test("team deactivation and guardian/relationship removal honor either history choice", async () => {
  for (const kind of ["team", "guardian", "relationship", "inactive"]) {
    const db = await database();
    try {
      if (kind === "guardian")
        await db.exec(
          `INSERT INTO public.student_guardians VALUES ('${collab}','${student}','${member}');`,
        );
      else if (kind === "relationship")
        await db.exec(
          `INSERT INTO public.student_relationships VALUES ('${collab}','${student}','${member}','approved');`,
        );
      else
        await db.exec(
          `INSERT INTO public.student_team_members VALUES ('${collab}','${student}','${member}','active','teacher');`,
        );
      await as(db, owner);
      if (kind === "inactive")
        await db.query(
          `SELECT public.change_student_team_status($1,'inactive','keep_read_only','educator')`,
          [collab],
        );
      else
        await db.query(`SELECT public.remove_student_member($1,$2,'keep_read_only')`, [
          kind,
          collab,
        ]);
      await as(db, member);
      assert.equal(await count(db, "public.channel_messages"), 0, kind);
      assert.equal(await count(db, "public.channel_history_messages"), 1, kind);
      // Another independent student permission remains, but cannot revive chat.
      await as(db, owner);
      await db.query(`SELECT public.remove_student_member('collaborator',$1,'keep_read_only')`, [
        collab,
      ]);
      await as(db, member);
      assert.equal(
        await count(db, "public.channel_history_messages"),
        1,
        "second keep choice preserves frozen history",
      );
    } finally {
      await db.close();
    }
  }
});

test("a failing membership deletion rolls back archive, audit, and revocation together", async () => {
  const db = await database();
  try {
    await db.exec(`CREATE FUNCTION public.reject_test_removal() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'Simulated failure'; END $$;
      CREATE TRIGGER reject_test_removal BEFORE DELETE ON public.student_collaborators
        FOR EACH ROW EXECUTE FUNCTION public.reject_test_removal();`);
    await as(db, owner);
    await assert.rejects(
      db.query(`SELECT public.remove_student_member('collaborator',$1,'keep_read_only')`, [collab]),
    );
    await db.exec("RESET ROLE");
    assert.equal(await count(db, "public.channel_history_grants"), 0);
    assert.equal(await count(db, "public.channel_audit_events"), 0);
    assert.equal(await count(db, "public.student_channel_removals"), 0);
    assert.equal(await count(db, "public.student_collaborators"), 1);
    await as(db, member);
    assert.equal(await count(db, "public.channel_messages"), 1);
  } finally {
    await db.close();
  }
});

test("direct relationship loss closes old membership; unrelated insertion stays blocked", async () => {
  const db = await database();
  try {
    await db.exec(`UPDATE public.student_collaborators SET status='revoked' WHERE id='${collab}';`);
    await as(db, member);
    assert.equal(await count(db, "public.channel_messages"), 0);
    assert.equal(await count(db, "public.channel_history_grants"), 0);
    await as(db, owner);
    await assert.rejects(
      db.query(`INSERT INTO public.channel_members(channel_id,user_id) VALUES ($1,$2)`, [
        channel,
        stranger,
      ]),
    );
    await assert.rejects(
      db.query(`INSERT INTO public.channel_members(channel_id,user_id) VALUES ($1,$2)`, [
        channel,
        member,
      ]),
    );
  } finally {
    await db.close();
  }
});

test("removing the same person from another student preserves separate frozen histories", async () => {
  const db = await database();
  const otherStudent = "00000000-0000-4000-8000-000000000011";
  const otherCollab = "00000000-0000-4000-8000-000000000021";
  const otherChannel = "00000000-0000-4000-8000-000000000031";
  try {
    await db.exec(`
      INSERT INTO public.students (id,owner_id,student_user_id) VALUES ('${otherStudent}','${owner}',NULL);
      INSERT INTO public.student_collaborators VALUES ('${otherCollab}','${otherStudent}','${member}','accepted');
      INSERT INTO public.channels(id,kind,title,student_id,created_by) VALUES
        ('${otherChannel}','student_transition','Other student','${otherStudent}','${owner}');
      INSERT INTO public.channel_members(channel_id,user_id) VALUES ('${otherChannel}','${member}');
      INSERT INTO public.channel_messages(channel_id,author_id,body) VALUES ('${otherChannel}','${owner}','Other history');
    `);
    await remove(db);
    await db.query(`SELECT public.remove_student_member('collaborator',$1,'keep_read_only')`, [
      otherCollab,
    ]);
    await as(db, member);
    assert.equal(await count(db, "public.channel_history_grants"), 2);
    assert.deepEqual(
      (await db.query("SELECT body FROM public.channel_history_messages ORDER BY body")).rows.map(
        (r) => r.body,
      ),
      ["Original message", "Other history"],
    );
    await as(db, stranger);
    assert.equal(await count(db, "public.channel_history_messages"), 0);
  } finally {
    await db.close();
  }
});
