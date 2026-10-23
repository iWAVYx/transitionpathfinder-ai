// Credential-free fixture only. No staging or production connections.
import test, { before, beforeEach, after, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { historyMigrationSource, wrapperFreeHistorySource, historyLedgerReconciliationSql } from "./atomic-history-ledger-sql.mjs";
const real = process.env.PATHWAY_HISTORY_POSTGRES === "1";
let db, close, newSession;
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const report = "00000000-0000-4000-8000-000000000010";
const secondReport = "00000000-0000-4000-8000-000000000011";
const intake = "00000000-0000-4000-8000-000000000020";
const original = { summary: "Fictional original", goals: ["Practice"] };
const next = { summary: "Fictional saved", goals: ["Practice"], section_updates: { write_id: "00000000-0000-4000-8000-000000000030" } };
const signature = "public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)";
async function as(client, user = owner, role = "authenticated") {
  await client.exec("RESET ROLE");
  await client.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await client.exec(`SET ROLE ${role}`);
}
async function save(client = db, expected = original, replacement = next, summary = "Saved", id = report) {
  return client.query("SELECT public.save_pathway_report_content_atomic($1,$2::jsonb,$3::jsonb,$4) AS version", [id, JSON.stringify(expected), JSON.stringify(replacement), summary]);
}
async function state() {
  await db.exec("RESET ROLE");
  return {
    reports: (await db.query("SELECT id, content FROM public.pathway_reports ORDER BY id")).rows,
    versions: (await db.query("SELECT report_id, version_number, content, change_summary, created_by FROM public.pathway_report_versions ORDER BY report_id, version_number")).rows,
  };
}
before(async () => {
  if (real) {
    // The host is literal loopback; never accept an arbitrary connection URL.
    if (![undefined, "localhost", "127.0.0.1"].includes(process.env.PGHOST)) throw new Error("Disposable tests require loopback PGHOST");
    const pgModule = await import(pathToFileURL(process.env.PATHWAY_HISTORY_PG_MODULE).href);
    const { Client } = pgModule.default ?? pgModule;
    const options = { host: "127.0.0.1", port: Number(process.env.PGPORT || 5432), user: process.env.PGUSER, password: process.env.PGPASSWORD, statement_timeout: 10000 };
    const admin = new Client({ ...options, database: "postgres" });
    await admin.connect();
    const name = `tf_history_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE DATABASE ${name}`);
    const clients = [];
    newSession = async () => {
      const client = new Client({ ...options, database: name });
      await client.connect();
      clients.push(client);
      return { query: (...args) => client.query(...args), exec: sql => client.query(sql) };
    };
    close = async () => {
      try { await Promise.all(clients.map(client => client.end())); }
      finally { try { await admin.query(`DROP DATABASE ${name}`); } finally { await admin.end(); } }
    };
    db = await newSession();
  } else {
    const { PGlite } = await import(process.env.PATHWAY_HISTORY_PGLITE_MODULE ? pathToFileURL(process.env.PATHWAY_HISTORY_PGLITE_MODULE).href : "@electric-sql/pglite");
    db = new PGlite(); close = () => db.close();
  }
  await db.exec(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
    END $$;
    CREATE SCHEMA supabase_migrations;
    CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY, statements text[], name text, created_by text);
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, service_role;
    CREATE TYPE public.app_role AS ENUM ('admin');
    CREATE OR REPLACE FUNCTION public.can_access_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.can_edit_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.is_platform_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.email_send_log(id uuid);
    CREATE TABLE public.suppressed_emails(id uuid);
    ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
  `);
  await db.exec(readFileSync("supabase/migrations/20260527130223_fdbf4e54-a144-4f99-b374-d0762f795c12.sql", "utf8"));
  await db.exec("ALTER TABLE public.pathway_reports ADD COLUMN student_id uuid");
  await db.exec(readFileSync("supabase/migrations/20260605050011_dea7210b-36a2-424b-b150-4e85e892dec9.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20260612002440_d58544e0-e353-434a-8cd1-c21f48f8026a.sql", "utf8"));
  // Current canonical Team policies, matching the observed staging predicates.
  const team=readFileSync("supabase/migrations/20260626004005_5548d717-fc48-4da6-ac20-69d7c80eb9a5.sql","utf8");
  await db.exec(team.slice(team.indexOf('DROP POLICY IF EXISTS "Owners view report versions"'),team.indexOf('REVOKE EXECUTE ON FUNCTION public.can_access_student')));
  await db.exec(readFileSync("supabase/migrations/20261012190000_atomic_pathway_report_content.sql", "utf8"));
});
after(async () => { if (close) await close(); });
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE public.pathway_report_versions, public.pathway_reports, public.student_intakes, auth.users CASCADE;
    INSERT INTO auth.users VALUES ('${owner}'),('${other}');
    INSERT INTO public.student_intakes(id,user_id,student_first_name) VALUES ('${intake}','${owner}','Fictional Student');`);
  for (const id of [report, secondReport]) await db.query("INSERT INTO public.pathway_reports(id,user_id,intake_id,model,content) VALUES ($1,$2,$3,'fixture',$4::jsonb)", [id, owner, intake, JSON.stringify(original)]);
  await db.exec("TRUNCATE supabase_migrations.schema_migrations");
  await db.query("INSERT INTO supabase_migrations.schema_migrations(version,name,statements,created_by) VALUES ('20261012190000','atomic_pathway_report_content',$1,'fixture-reviewer')", [[wrapperFreeHistorySource]]);
  await as(db);
});
test("owner save and restore retain exact previous content with ordered versions", async () => {
  assert.equal((await save()).rows[0].version, 1);
  assert.equal((await save(db, next, original, "Restored")).rows[0].version, 2);
  const result = await state();
  assert.deepEqual(result.versions.map(v => v.content), [original, next]);
  assert.deepEqual(result.versions.map(v => v.version_number), [1, 2]);
  assert.ok(result.versions.every(v => v.created_by === owner));
  assert.deepEqual(result.reports[0].content, original);
});
test("effective grants deny anonymous/service execution and missing authenticated identity", async () => {
  await db.exec("RESET ROLE");
  for (const role of ["anon", "service_role"]) {
    assert.equal((await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS allowed", [role, signature])).rows[0].allowed, false);
    await as(db, owner, role);
    await assert.rejects(save(), { code: "42501" });
    await db.exec("RESET ROLE");
  }
  assert.equal((await db.query("SELECT has_function_privilege('authenticated',$1,'EXECUTE') AS allowed", [signature])).rows[0].allowed, true);
  assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE oid=$1::regprocedure", [signature])).rows[0].prosecdef, false);
  await as(db, ""); await assert.rejects(save(), { code: "42501" });
  assert.equal((await state()).versions.length, 0);
});
test("different owner cannot save even with broader read visibility; missing report stays denied", async () => {
  await db.exec('RESET ROLE; CREATE POLICY fixture_read ON public.pathway_reports FOR SELECT TO authenticated USING (true)');
  try {
    await as(db, other);
    assert.equal((await db.query("SELECT id FROM public.pathway_reports")).rows.length, 2);
    await assert.rejects(save(), { code: "42501" });
    await as(db); await assert.rejects(save(db, original, next, "Saved", randomUUID()), { code: "42501" });
    assert.equal((await state()).versions.length, 0);
  } finally { await db.exec("RESET ROLE; DROP POLICY fixture_read ON public.pathway_reports"); }
});
test("malformed payloads and oversized summary fail without either write", async () => {
  for (const [expected, replacement, summary] of [[null,next,""],[[],next,""],[original,null,""],[original,[],""],[original,next,"x".repeat(501)]]) {
    await assert.rejects(save(db, expected, replacement, summary), { code: "22023" });
  }
  assert.equal((await state()).versions.length, 0);
  assert.deepEqual((await state()).reports[0].content, original);
});
test("full JSONB comparison catches intervening direct content changes without a marker", async () => {
  await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2", [JSON.stringify({ ...original, summary: "Intervening edit" }), report]);
  await assert.rejects(save(), { code: "40001" });
  const result = await state(); assert.equal(result.versions.length, 0);
  assert.equal(result.reports[0].content.summary, "Intervening edit");
});
test("JSONB object order does not create a conflict but changed array order does", async () => {
  assert.equal((await save(db, { goals: ["Practice"], summary: original.summary })).rows[0].version, 1);
  await assert.rejects(save(db, { ...next, goals: ["Other", "Practice"] }, original), { code: "40001" });
  assert.equal((await state()).versions.length, 1);
});
test("snapshot constraint failure rolls back with no current-content change", async () => {
  await db.exec("RESET ROLE; ALTER TABLE public.pathway_report_versions ADD CONSTRAINT fixture_reject CHECK (false)");
  try {
    await as(db); await assert.rejects(save(), { code: "23514" });
    const result = await state(); assert.equal(result.versions.length, 0); assert.deepEqual(result.reports[0].content, original);
  } finally { await db.exec("RESET ROLE; ALTER TABLE public.pathway_report_versions DROP CONSTRAINT fixture_reject"); }
});
test("update exception and silently skipped update both roll back inserted snapshot", async () => {
  for (const body of ["RAISE EXCEPTION 'Injected fixture failure';", "RETURN NULL;"]) {
    await db.exec(`RESET ROLE; CREATE FUNCTION public.fixture_update_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${body} END $$;
      CREATE TRIGGER fixture_fail BEFORE UPDATE ON public.pathway_reports FOR EACH ROW EXECUTE FUNCTION public.fixture_update_fail();`);
    try {
      await as(db); await assert.rejects(save(), { code: body.startsWith("RETURN") ? "42501" : "P0001" });
      const result = await state(); assert.equal(result.versions.length, 0); assert.deepEqual(result.reports[0].content, original);
    } finally { await db.exec("RESET ROLE; DROP TRIGGER fixture_fail ON public.pathway_reports; DROP FUNCTION public.fixture_update_fail()"); }
  }
});
test("revoked update privileges fail closed instead of adding history", async () => {
  await db.exec("RESET ROLE; REVOKE UPDATE ON public.pathway_reports FROM authenticated");
  try {
    await as(db); await assert.rejects(save(), { code: "42501" });
    assert.equal((await state()).versions.length, 0);
  } finally { await db.exec("RESET ROLE; GRANT UPDATE ON public.pathway_reports TO authenticated"); }
});
test("snapshot uniqueness collision preserves the existing version and current report", async () => {
  await save();
  const before = await state();
  await db.exec(`CREATE FUNCTION public.fixture_version_collision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.version_number = 1; RETURN NEW; END $$;
    CREATE TRIGGER fixture_collision BEFORE INSERT ON public.pathway_report_versions FOR EACH ROW EXECUTE FUNCTION public.fixture_version_collision();`);
  try {
    await as(db); await assert.rejects(save(db, next, original), { code: "23505" });
    assert.deepEqual(await state(), before);
  } finally { await db.exec("RESET ROLE; DROP TRIGGER fixture_collision ON public.pathway_report_versions; DROP FUNCTION public.fixture_version_collision()"); }
});
test("restrictive update RLS rolls back an already inserted snapshot", async () => {
  await db.exec("RESET ROLE; CREATE POLICY fixture_update_deny ON public.pathway_reports AS RESTRICTIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (false)");
  try {
    await as(db); await assert.rejects(save(), { code: "42501" });
    const result = await state(); assert.equal(result.versions.length, 0); assert.deepEqual(result.reports[0].content, original);
  } finally { await db.exec("RESET ROLE; DROP POLICY fixture_update_deny ON public.pathway_reports"); }
});
test("simultaneous sessions serialize the same report while unrelated report saves proceed", { skip: !real, timeout: 20000 }, async () => {
  const winner = await newSession(), loser = await newSession(), unrelated = await newSession();
  await as(winner); await as(loser); await as(unrelated);
  await winner.exec("BEGIN");
  try {
    assert.equal((await save(winner)).rows[0].version, 1);
    const loserPid = (await loser.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    // Attach rejection handling immediately; completion is checked after commit.
    const pending = save(loser).then(value => ({ value }), error => ({ error }));
    await db.exec("RESET ROLE");
    const deadline = Date.now() + 5000;
    let waiting = false;
    while (Date.now() < deadline) {
      waiting = (await db.query("SELECT wait_event_type = 'Lock' AS waiting FROM pg_stat_activity WHERE pid=$1", [loserPid])).rows[0]?.waiting === true;
      if (waiting) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.ok(waiting, "second session must be waiting for the owned report lock");
    assert.equal((await save(unrelated, original, next, "Other report", secondReport)).rows[0].version, 1);
    await winner.exec("COMMIT");
    const result = await pending;
    assert.equal(result.error?.code, "40001");
    const saved = await state();
    assert.equal(saved.versions.length, 2);
    assert.equal(saved.versions.filter(v => v.report_id === report).length, 1);
    assert.deepEqual(saved.reports[0].content, next);
  } finally { await winner.exec("ROLLBACK"); }
});

async function installedDefinition() {
  return (await db.query("SELECT pg_get_functiondef('public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text)'::regprocedure) AS definition")).rows[0].definition;
}
async function ledgerRow() {
  return (await db.query("SELECT version,name,statements,created_by FROM supabase_migrations.schema_migrations WHERE version='20261012190000'")).rows[0];
}
test("ledger reconciliation stores canonical text as data, preserving installed function and other ledger metadata", async () => {
  await db.exec("RESET ROLE");
  const definition = await installedDefinition();
  await db.exec("INSERT INTO supabase_migrations.schema_migrations VALUES ('20000101000000',ARRAY['Unrelated fixture'],'unchanged','other')");
  await db.exec(historyLedgerReconciliationSql);
  const row = await ledgerRow();
  assert.deepEqual(row.statements, [historyMigrationSource]);
  assert.equal(row.created_by, "fixture-reviewer"); assert.equal(row.name, "atomic_pathway_report_content");
  assert.equal(await installedDefinition(), definition);
  assert.deepEqual((await db.query("SELECT statements FROM supabase_migrations.schema_migrations WHERE version='20000101000000'")).rows[0].statements, ["Unrelated fixture"]);
  await db.exec(historyLedgerReconciliationSql);
  assert.deepEqual(await ledgerRow(), row);
});
test("unexpected ledger source stops reconciliation without changing function or ledger", async () => {
  await db.exec("RESET ROLE; UPDATE supabase_migrations.schema_migrations SET statements=ARRAY['Unexpected fixture'] WHERE version='20261012190000'");
  const row = await ledgerRow(), definition = await installedDefinition();
  await assert.rejects(db.exec(historyLedgerReconciliationSql), /Unexpected history ledger representation/);
  assert.deepEqual(await ledgerRow(), row); assert.equal(await installedDefinition(), definition);
});
test("ledger update failure rolls back instead of partially recording canonical source", async () => {
  await db.exec("RESET ROLE; ALTER TABLE supabase_migrations.schema_migrations ADD CONSTRAINT fixture_ledger_reject CHECK (position(E'BEGIN;\\n' in statements[1])=0)");
  try {
    const row = await ledgerRow(), definition = await installedDefinition();
    await assert.rejects(db.exec(historyLedgerReconciliationSql), { code: "23514" });
    assert.deepEqual(await ledgerRow(), row); assert.equal(await installedDefinition(), definition);
  } finally { await db.exec("ALTER TABLE supabase_migrations.schema_migrations DROP CONSTRAINT fixture_ledger_reject"); }
});
test("changed function grants prevent a misleading ledger correction", async () => {
  await db.exec("RESET ROLE; GRANT EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) TO anon");
  try {
    const row = await ledgerRow();
    await assert.rejects(db.exec(historyLedgerReconciliationSql), /differs from reviewed source or grants/);
    assert.deepEqual(await ledgerRow(), row);
  } finally { await db.exec("REVOKE EXECUTE ON FUNCTION public.save_pathway_report_content_atomic(uuid,jsonb,jsonb,text) FROM anon"); }
});

// Baseline reproductions use real table grants/RLS, not mocked query builders.
test("baseline direct owner content update bypasses report history", async()=>{
 await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);
 const result=await state();assert.deepEqual(result.reports[0].content,next);assert.equal(result.versions.length,0);
});
test("baseline owner can insert a fabricated version attributed to another identity",async()=>{
 await db.query("INSERT INTO public.pathway_report_versions(report_id,version_number,content,change_summary,created_by) VALUES ($1,99,$2::jsonb,'Fictional forged history',$3)",[report,JSON.stringify(next),other]);
 const result=await state();assert.equal(result.versions[0].created_by,other);assert.deepEqual(result.reports[0].content,original);
});
test("review proposal rejects disabled RLS without changing grants or installing a trigger",async()=>{
 await db.exec("RESET ROLE; ALTER TABLE public.pathway_reports DISABLE ROW LEVEL SECURITY");
 try{await assert.rejects(db.exec(readFileSync("docs/production-readiness/proposals/report-content-history-boundary.sql","utf8")),/Unexpected report history ownership or RLS/);await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.pathway_report_versions','INSERT') AS allowed")).rows[0].allowed,true);
  assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgname='snapshot_report_content_update'")).rows[0].n,0);
 }finally{await db.exec("RESET ROLE; ALTER TABLE public.pathway_reports ENABLE ROW LEVEL SECURITY");}
});
test("privileged authenticated role aborts before any proposal change",async()=>{
 await db.exec("RESET ROLE; ALTER ROLE authenticated BYPASSRLS");
 try{await assert.rejects(db.exec(readFileSync("docs/production-readiness/proposals/report-content-history-boundary.sql","utf8")),/Unexpected privileged client role/);await db.exec("ROLLBACK");
  assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.pathway_report_versions','INSERT') AS allowed")).rows[0].allowed,true);
 }finally{await db.exec("RESET ROLE; ALTER ROLE authenticated NOBYPASSRLS");}
});
test("inherited version INSERT stops the entire proposal transaction",async()=>{
 await db.exec("RESET ROLE; CREATE ROLE fixture_history_writer; GRANT INSERT ON public.pathway_report_versions TO fixture_history_writer; GRANT fixture_history_writer TO authenticated");
 try{const definition=await installedDefinition();await assert.rejects(db.exec(readFileSync("docs/production-readiness/proposals/report-content-history-boundary.sql","utf8")),/Inherited report history write privileges remain/);await db.exec("ROLLBACK");
  assert.equal(await installedDefinition(),definition);assert.equal((await db.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgname='snapshot_report_content_update'")).rows[0].n,0);
 }finally{await db.exec("RESET ROLE; REVOKE fixture_history_writer FROM authenticated; REVOKE INSERT ON public.pathway_report_versions FROM fixture_history_writer; DROP ROLE fixture_history_writer");}
});
test("broad staging-like TRUNCATE privilege bypasses row-level report visibility in disposable SQL",async()=>{
 await db.exec("RESET ROLE; GRANT TRUNCATE ON public.pathway_reports,public.pathway_report_versions TO authenticated");
 try{await db.query("UPDATE public.pathway_reports SET user_id=$1 WHERE id=$2",[other,secondReport]);await as(db);assert.equal((await db.query("SELECT id FROM public.pathway_reports")).rows.length,1);
  await db.exec("TRUNCATE public.pathway_reports CASCADE");assert.equal((await state()).reports.length,0);
 }finally{await db.exec("RESET ROLE; REVOKE TRUNCATE ON public.pathway_reports,public.pathway_report_versions FROM authenticated");}
});
describe("review-only trigger proposal, not a canonical migration",()=>{
 before(async()=>{await db.exec("RESET ROLE; GRANT ALL ON public.pathway_reports,public.pathway_report_versions TO authenticated");await db.exec(readFileSync("docs/production-readiness/proposals/report-content-history-boundary.sql","utf8"));});
 test("direct owner updates snapshot exact prior content and actual actor",async()=>{
  await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);
  const result=await state();assert.deepEqual(result.versions.map(v=>v.content),[original]);assert.equal(result.versions[0].created_by,owner);assert.deepEqual(result.reports[0].content,next);
 });
 test("RPC save and restore each create exactly one version with the supplied summary",async()=>{
  assert.equal((await save()).rows[0].version,1);await as(db);assert.equal((await save(db,next,original,"Restored")).rows[0].version,2);
  const result=await state();assert.deepEqual(result.versions.map(v=>v.content),[original,next]);assert.deepEqual(result.versions.map(v=>v.change_summary),["Saved","Restored"]);
 });
 test("identical-content save retains the existing one-version-per-save contract",async()=>{
  assert.equal((await save(db,original,original)).rows[0].version,1);assert.equal((await state()).versions.length,1);
 });
 test("direct version insertion, alteration and deletion are denied",async()=>{
  await save();await as(db);
  await assert.rejects(db.query("INSERT INTO public.pathway_report_versions(report_id,version_number,content,created_by) VALUES ($1,99,$2::jsonb,$3)",[report,JSON.stringify(next),other]),{code:"42501"});
  await assert.rejects(db.query("UPDATE public.pathway_report_versions SET content='{}'::jsonb WHERE report_id=$1",[report]),{code:"42501"});
  await assert.rejects(db.query("DELETE FROM public.pathway_report_versions WHERE report_id=$1",[report]),{code:"42501"});
  assert.equal((await state()).versions.length,1);
 });
 test("unrelated caller cannot modify a report and does not gain history access",async()=>{
  await as(db,other);assert.equal((await db.query("UPDATE public.pathway_reports SET content='{}'::jsonb WHERE id=$1 RETURNING id",[report])).rows.length,0);
  assert.equal((await db.query("SELECT * FROM public.pathway_report_versions")).rows.length,0);assert.equal((await state()).versions.length,0);
 });
 test("existing permitted editor can update through RLS and gets attributed history, but cannot use owner RPC",async()=>{
  await db.exec(`RESET ROLE; CREATE OR REPLACE FUNCTION public.can_edit_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${other}'::uuid $$;
   CREATE POLICY fixture_editor_read ON public.pathway_reports FOR SELECT TO authenticated USING(student_id IS NOT NULL AND public.can_edit_student(auth.uid(),student_id));
   UPDATE public.pathway_reports SET student_id='00000000-0000-4000-8000-000000000040' WHERE id='${report}';`);
  try{await as(db,other);await assert.rejects(save(),{code:"42501"});
   assert.equal((await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2 RETURNING id",[JSON.stringify(next),report])).rows.length,1);
   const result=await state();assert.equal(result.versions[0].created_by,other);assert.deepEqual(result.versions[0].content,original);
  }finally{await db.exec("RESET ROLE; DROP POLICY fixture_editor_read ON public.pathway_reports; CREATE OR REPLACE FUNCTION public.can_edit_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;");}
 });
 test("observed broad client grants are narrowed without removing report CRUD or service administration",async()=>{
  await db.exec("RESET ROLE");for(const table of ["public.pathway_reports","public.pathway_report_versions"]){for(const capability of ["TRIGGER","TRUNCATE"]){for(const role of ["anon","authenticated"])assert.equal((await db.query("SELECT has_table_privilege($1,$2,$3) AS allowed",[role,table,capability])).rows[0].allowed,false);assert.equal((await db.query("SELECT has_table_privilege('service_role',$1,$2) AS allowed",[table,capability])).rows[0].allowed,true);}}
  for(const capability of ["SELECT","INSERT","UPDATE","DELETE"])assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.pathway_reports',$1) AS allowed",[capability])).rows[0].allowed,true);
  await as(db);await assert.rejects(db.exec("TRUNCATE public.pathway_reports CASCADE"),{code:"42501"});await assert.rejects(db.exec("CREATE TRIGGER fixture_unauthorized BEFORE UPDATE ON public.pathway_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()"),{code:"42501"});assert.equal((await state()).reports.length,2);
 });
 test("metadata-only updates do not create content-history versions",async()=>{
  await db.query("UPDATE public.pathway_reports SET model='fixture-metadata' WHERE id=$1",[report]);assert.equal((await state()).versions.length,0);
 });
 test("history failure rolls back direct updates and RPC saves",async()=>{
  await db.exec("RESET ROLE; ALTER TABLE public.pathway_report_versions ADD CONSTRAINT fixture_history_reject CHECK(false)");
  try{await as(db);await assert.rejects(db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]),{code:"23514"});
   await assert.rejects(save(),{code:"23514"});const result=await state();assert.deepEqual(result.reports[0].content,original);assert.equal(result.versions.length,0);
  }finally{await db.exec("RESET ROLE; ALTER TABLE public.pathway_report_versions DROP CONSTRAINT fixture_history_reject");}
 });
 test("skipped report update creates no orphan snapshot",async()=>{
  await db.exec("RESET ROLE; CREATE FUNCTION public.fixture_skip_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$; CREATE TRIGGER fixture_skip BEFORE UPDATE ON public.pathway_reports FOR EACH ROW EXECUTE FUNCTION public.fixture_skip_update();");
  try{await as(db);await assert.rejects(save(),{code:"42501"});assert.equal((await state()).versions.length,0);}
  finally{await db.exec("RESET ROLE; DROP TRIGGER fixture_skip ON public.pathway_reports; DROP FUNCTION public.fixture_skip_update()");}
 });
 test("conflicting RPC still rejects stale server-observed content",async()=>{
  await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);await assert.rejects(save(),{code:"40001"});const result=await state();assert.equal(result.versions.length,1);assert.deepEqual(result.reports[0].content,next);
 });
 test("snapshot trigger is not client executable and RPC remains invoker scoped",async()=>{
  await db.exec("RESET ROLE");for(const role of ["anon","authenticated","service_role"]){assert.equal((await db.query("SELECT has_function_privilege($1,'public.snapshot_report_content_update()','EXECUTE') AS allowed",[role])).rows[0].allowed,false);}
  assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE oid=$1::regprocedure",[signature])).rows[0].prosecdef,false);
 });
 test("invalid direct content is rejected without changing the report",async()=>{
  await assert.rejects(db.query("UPDATE public.pathway_reports SET content='[]'::jsonb WHERE id=$1",[report]),{code:"22023"});const result=await state();assert.equal(result.versions.length,0);assert.deepEqual(result.reports[0].content,original);
 });
 test("broader SELECT visibility alone does not permit report edits",async()=>{
  await db.exec("RESET ROLE; CREATE POLICY fixture_reader ON public.pathway_reports FOR SELECT TO authenticated USING(true)");
  try{await as(db,other);assert.equal((await db.query("SELECT id FROM public.pathway_reports")).rows.length,2);assert.equal((await db.query("UPDATE public.pathway_reports SET content='{}'::jsonb WHERE id=$1 RETURNING id",[report])).rows.length,0);assert.equal((await state()).versions.length,0);}
  finally{await db.exec("RESET ROLE; DROP POLICY fixture_reader ON public.pathway_reports");}
 });
 test("canonical admin read/update exception is preserved and attributed, not silently removed",async()=>{
  await db.exec(`RESET ROLE; CREATE OR REPLACE FUNCTION public.can_access_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
   CREATE OR REPLACE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $1='${other}'::uuid $$;`);
  const policy=readFileSync("supabase/migrations/20260529000630_71025c8e-e746-4a03-8685-c152eedcf177.sql","utf8").split("-- 2.")[0];await db.exec(policy);
  try{await as(db,other);assert.equal((await db.query("SELECT id FROM public.pathway_reports")).rows.length,2);await assert.rejects(save(),{code:"42501"});
   await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);const result=await state();assert.equal(result.versions[0].created_by,other);assert.deepEqual(result.versions[0].content,original);
  }finally{await db.exec("RESET ROLE; DROP POLICY \"View reports via owner or student access\" ON public.pathway_reports; CREATE POLICY \"Users view own reports\" ON public.pathway_reports FOR SELECT TO authenticated USING(auth.uid()=user_id); CREATE OR REPLACE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$; CREATE OR REPLACE FUNCTION public.can_access_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$");}
 });
 test("privileged maintenance with no end-user claim records an honest null actor",async()=>{
  await db.exec("RESET ROLE; SELECT set_config('request.jwt.claim.sub','',false)");await db.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);assert.equal((await state()).versions[0].created_by,null);
  for(const privilege of ["INSERT","UPDATE","DELETE"])assert.equal((await db.query("SELECT has_table_privilege('service_role','public.pathway_report_versions',$1) AS allowed",[privilege])).rows[0].allowed,true);
 });
 test("two direct writers serialize history while another report proceeds",{skip:!real,timeout:20000},async()=>{
  const winner=await newSession(),loser=await newSession(),unrelated=await newSession();for(const client of [winner,loser,unrelated])await as(client);
  await winner.exec("BEGIN");
  try{await winner.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),report]);
   const pid=(await loser.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
   const later={summary:"Fictional second direct edit"};const pending=loser.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(later),report]).then(value=>({value}),error=>({error}));
   await db.exec("RESET ROLE");const deadline=Date.now()+5000;let waiting=false;
   while(Date.now()<deadline){waiting=(await db.query("SELECT wait_event_type='Lock' AS waiting FROM pg_stat_activity WHERE pid=$1",[pid])).rows[0]?.waiting===true;if(waiting)break;await new Promise(resolve=>setTimeout(resolve,25));}assert.ok(waiting,"Second direct writer must wait on this report");
   await unrelated.query("UPDATE public.pathway_reports SET content=$1::jsonb WHERE id=$2",[JSON.stringify(next),secondReport]);await winner.exec("COMMIT");const result=await pending;if(result.error)throw result.error;
   const saved=await state();const versions=saved.versions.filter(v=>v.report_id===report);assert.deepEqual(versions.map(v=>v.version_number),[1,2]);assert.deepEqual(versions.map(v=>v.content),[original,next]);assert.deepEqual(saved.reports.find(r=>r.id===report).content,later);
  }finally{await winner.exec("ROLLBACK");}
 });

});
