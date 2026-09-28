import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20260928040000_atomic_student_channel_start.sql");
const server = read("src/lib/channels.functions.ts");
const form = read("src/components/channels/StartStudentConversation.tsx");
const route = read("src/routes/_authenticated/transition-channel.tsx");

test("student conversation starts atomically for two already-linked teammates", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.start_student_channel/);
  assert.match(migration, /SECURITY DEFINER\s+SET search_path = ''/);
  assert.match(migration, /is_linked_student_channel_participant\(v_actor, p_student_id\)/);
  assert.match(migration, /is_linked_student_channel_participant\(p_recipient_id, p_student_id\)/);
  assert.match(migration, /p_recipient_id = v_actor/);
  assert.match(migration, /INSERT INTO public\.channels[\s\S]*?INSERT INTO public\.channel_members[\s\S]*?INSERT INTO public\.channel_messages/);
  assert.match(migration, /INSERT INTO public\.channel_audit_events/);
  assert.doesNotMatch(migration, /ALTER POLICY|DROP POLICY|DISABLE ROW LEVEL SECURITY|service_role/);
});

test("only authenticated callers can start and list their linked-team conversations", () => {
  for (const signature of [
    "list_student_channel_students()",
    "list_student_channel_recipients(uuid)",
    "start_student_channel(uuid, uuid, text, text)",
  ]) {
    assert.ok(migration.includes(`GRANT EXECUTE ON FUNCTION public.${signature}`));
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.is_linked_student_channel_participant\(uuid, uuid\)\s+FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /WHERE u\.linked_id <> v_actor/);
  assert.match(migration, /c\.status = 'accepted'/);
  assert.match(migration, /r\.consent_status = 'approved'/);
  assert.match(server, /\.rpc\(\s*"start_student_channel"/);
  assert.doesNotMatch(server, /service_role|SERVICE_ROLE/);
});

test("new conversation and send UI expose success and failure without dropping the draft", () => {
  assert.match(form, /data-testid="start-student-conversation"/);
  assert.match(form, /Start and send/);
  assert.match(form, /onCreated\(channel_id\)/);
  assert.match(route, /<StartStudentConversation onCreated=/);
  assert.match(route, /onError: \(error: Error\) => \{\s+toast\.error/);
  assert.match(route, /Could not send this message\. It remains in the composer/);
});
