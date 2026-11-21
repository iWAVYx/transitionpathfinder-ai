// Disposable PostgreSQL / credential-free PGlite only. No arbitrary connection URL is accepted.
import { before, beforeEach, after, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
let db, close;
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
const report = "00000000-0000-4000-8000-000000000010";
const foreign = "00000000-0000-4000-8000-000000000011";
const id = "00000000-0000-4000-8000-000000000020";
const proposal = readFileSync("supabase/migrations/20261023010000_restrict_report_share_token_writes.sql", "utf8");
async function actor(user = owner, role = "authenticated") {
  assert.ok(["authenticated", "anon", "service_role"].includes(role));
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec(`SET ROLE ${role}`);
}
async function row() {
  await db.exec("RESET ROLE");
  return (await db.query("SELECT * FROM public.share_tokens WHERE id=$1", [id])).rows[0];
}
async function seed() {
  await db.exec("RESET ROLE; TRUNCATE public.share_tokens, public.pathway_reports CASCADE");
  await db.query("INSERT INTO public.pathway_reports(id,user_id,content) VALUES ($1,$2,$3::jsonb),($4,$5,$6::jsonb)", [report, owner, '{"summary":"Own fictional report"}', foreign, other, '{"summary":"Foreign fictional report"}']);
  await db.query("INSERT INTO public.share_tokens(id,token,report_id,created_by) VALUES ($1,'fictional-link',$2,$3)", [id,report,owner]);
}
before(async () => {
  if (process.env.SHARE_POLICY_POSTGRES === "1") {
    if (![undefined,"localhost","127.0.0.1"].includes(process.env.PGHOST)) throw new Error("Disposable sharing tests require loopback PGHOST");
    const pgModule=await import(pathToFileURL(process.env.SHARE_POLICY_PG_MODULE).href);
    const { Client }=pgModule.default ?? pgModule;
    const options={host:"127.0.0.1",port:Number(process.env.PGPORT || 5432),user:process.env.PGUSER,password:process.env.PGPASSWORD,statement_timeout:10000};
    const admin=new Client({...options,database:"postgres"}); await admin.connect();
    const database=`tf_share_${randomUUID().replaceAll("-","")}`;
    try { await admin.query(`CREATE DATABASE ${database}`); }
    catch(error) { await admin.end(); throw error; }
    const client=new Client({...options,database});
    close=async () => { try { await client.end(); } finally { try { await admin.query(`DROP DATABASE ${database}`); } finally { await admin.end(); } } };
    await client.connect();
    db={query:(...args)=>client.query(...args),exec:async sql=>{ const result=await client.query(sql); return Array.isArray(result)?result:[result]; }};
  } else {
    const module=process.env.SHARE_POLICY_PGLITE_MODULE;
    const { PGlite }=await import(module?pathToFileURL(module).href:"@electric-sql/pglite");
    db=new PGlite(); close=()=>db.close();
  }
  await db.exec(`DO $$ BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
    END $$;
    CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text,name text,statements text[]);
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    CREATE TYPE public.app_role AS ENUM ('admin');
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.can_access_student(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.pathway_reports(id uuid PRIMARY KEY,user_id uuid,student_id uuid,content jsonb,created_at timestamptz DEFAULT now());
    ALTER TABLE public.pathway_reports ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.pathway_reports TO authenticated;
    CREATE POLICY own_report ON public.pathway_reports FOR SELECT TO authenticated USING(user_id=auth.uid());`);
  const original = readFileSync("supabase/migrations/20260527160738_4b10cdd0-0c92-40e1-b652-b016a9a0cafd.sql", "utf8");
  await db.exec(original.slice(original.indexOf("CREATE TABLE public.share_tokens"), original.indexOf("-- 11. AUDIT_LOG")));
  const insert = readFileSync("supabase/migrations/20260715152133_8ed7834a-7f65-4ccc-987e-ad11d1ded410.sql", "utf8");
  await db.exec(insert.slice(0,insert.indexOf("-- 2)")));
  await db.exec(readFileSync("supabase/migrations/20261006180000_server_only_report_share_rpcs.sql", "utf8"));
});
after(async () => { if(close) await close(); });
test("canonical migration exactly retains the reviewed proposal transaction", () => {
  const draft=readFileSync("docs/production-readiness/proposals/share-token-write-restriction.sql","utf8");
  assert.equal(proposal.slice(proposal.indexOf("BEGIN;")),draft.slice(draft.indexOf("BEGIN;")));
});
test("missing server-only grant prerequisite aborts before restricting token writes", async () => {
  await db.exec("RESET ROLE; GRANT EXECUTE ON FUNCTION public.resolve_share_token(text) TO anon");
  try {
    await assert.rejects(db.exec(proposal), /Server-only sharing prerequisite is not satisfied/);
    await db.exec("ROLLBACK");
    assert.equal((await db.query("SELECT has_table_privilege('authenticated','public.share_tokens','UPDATE') AS allowed")).rows[0].allowed,true);
  } finally { await db.exec("RESET ROLE; REVOKE EXECUTE ON FUNCTION public.resolve_share_token(text) FROM anon"); }
});
test("catalog preflight executes read-only without reading application rows", async () => {
  const results=await db.exec(readFileSync("docs/production-readiness/proposals/share-token-preflight.sql","utf8"));
  assert.ok(results.some(result=>result.rows.some(row=>row.relname === "share_tokens")));
});
test("single-row catalog and ledger preflight executes read-only", async () => {
  const results=await db.exec(readFileSync("docs/production-readiness/proposals/share-token-preflight-json.sql","utf8"));
  const result=results.flatMap(value=>value.rows).find(row=>row.staging_share_preflight)?.staging_share_preflight;
  assert.equal(result.read_only,"on");
  assert.equal(result.columns.length,10);
  assert.equal(result.table_grants.find(role=>role.role === "authenticated").update,true);
});
test("canonical baseline permits retargeting an owned token and resolves foreign content", async () => {
  await seed(); await actor();
  await db.query("UPDATE public.share_tokens SET report_id=$1 WHERE id=$2", [foreign,id]);
  await actor(owner,"service_role");
  const result = await db.query("SELECT * FROM public.resolve_share_token('fictional-link')");
  assert.equal(result.rows[0].report_id,foreign);
  assert.equal(result.rows[0].content.summary,"Foreign fictional report");
});
describe("unapplied canonical restriction", () => {
  before(async () => { await db.exec("RESET ROLE"); await db.exec(proposal); });
  beforeEach(seed);
  test("owner revokes the exact row, repeated revoke remains confirmable and new resolution stops", async () => {
    await actor();
    for(let i=0;i<2;i++) {
      const result = await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1 AND created_by=$2 RETURNING id,revoked",[id,owner]);
      assert.deepEqual(result.rows,[{ id,revoked:true }]);
    }
    await actor(owner,"service_role");
    assert.equal((await db.query("SELECT * FROM public.resolve_share_token('fictional-link')")).rows.length,0);
  });
  for(const [column,expression] of [
    ["report_id",`'${foreign}'::uuid`],["audience","'educator'"],["token","'replacement'"],
    ["expires_at","now() + interval '1 year'"],["created_by",`'${other}'::uuid`],
    ["view_count","99"],["last_viewed_at","now()"],["id",`'${foreign}'::uuid`],["created_at","now()"],
  ]) test(`direct ${column} update is denied without changing the token`, async () => {
    const before = await row(); await actor();
    await assert.rejects(db.query(`UPDATE public.share_tokens SET ${column}=${expression} WHERE id=$1`,[id]), { code:"42501" });
    assert.deepEqual(await row(),before);
  });
  test("non-issuer and missing token updates return no confirmation rows", async () => {
    await actor(other);
    assert.equal((await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1 RETURNING id",[id])).rows.length,0);
    assert.equal((await row()).revoked,false);
    await actor();
    assert.equal((await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1 RETURNING id",[foreign])).rows.length,0);
  });
  test("reactivation and delete/recreate bypass are denied", async () => {
    await actor(); await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1",[id]);
    await assert.rejects(db.query("UPDATE public.share_tokens SET revoked=false WHERE id=$1",[id]),{ code:"42501" });
    await assert.rejects(db.query("DELETE FROM public.share_tokens WHERE id=$1",[id]),{ code:"42501" });
    assert.equal((await row()).revoked,true);
  });
  test("legitimate creation works but foreign-report creation is denied", async () => {
    await actor();
    await db.query("INSERT INTO public.share_tokens(token,report_id,created_by) VALUES ('new-own-link',$1,$2)",[report,owner]);
    await assert.rejects(db.query("INSERT INTO public.share_tokens(token,report_id,created_by) VALUES ('new-foreign-link',$1,$2)",[foreign,owner]),{ code:"42501" });
    await actor(owner,"service_role");
    assert.equal((await db.query("SELECT * FROM public.resolve_share_token('new-own-link')")).rows[0].report_id,report);
  });
  test("expired links stay unresolved; direct raw RPC and token updates remain denied to anon", async () => {
    await db.query("UPDATE public.share_tokens SET expires_at=now()-interval '1 day' WHERE id=$1",[id]);
    await actor(owner,"service_role");
    assert.equal((await db.query("SELECT * FROM public.resolve_share_token('fictional-link')")).rows.length,0);
    await actor('',"anon");
    await assert.rejects(db.query("SELECT * FROM public.resolve_share_token('fictional-link')"),{ code:"42501" });
    await assert.rejects(db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1",[id]),{ code:"42501" });
  });
  test("an additional permissive policy cannot allow reactivation or foreign revocation", async () => {
    await db.exec("CREATE POLICY fixture_broad ON public.share_tokens FOR ALL TO authenticated USING(true) WITH CHECK(true)");
    try {
      await actor(); await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1",[id]);
      await assert.rejects(db.query("UPDATE public.share_tokens SET revoked=false WHERE id=$1",[id]),{ code:"42501" });
      await db.exec("RESET ROLE; UPDATE public.share_tokens SET revoked=false");
      await actor(other);
      assert.equal((await db.query("UPDATE public.share_tokens SET revoked=true WHERE id=$1 RETURNING id",[id])).rows.length,0);
      assert.equal((await row()).revoked,false);
    } finally { await db.exec("RESET ROLE; DROP POLICY fixture_broad ON public.share_tokens"); }
  });
  test("service-only view tracking and administrative expiry maintenance still work", async () => {
    await actor(owner,"service_role");
    await db.query("SELECT public.track_share_view('fictional-link')");
    await db.query("UPDATE public.share_tokens SET expires_at=now()+interval '1 day' WHERE id=$1",[id]);
    const result=await row(); assert.equal(result.view_count,1); assert.ok(result.expires_at);
  });
  test("disabled RLS aborts the proposal and rolls back its DDL", async () => {
    await db.exec("RESET ROLE; ALTER TABLE public.share_tokens DISABLE ROW LEVEL SECURITY");
    try {
      await assert.rejects(db.exec(proposal), /RLS or client role ownership assumptions failed/);
      await db.exec("ROLLBACK");
    } finally { await db.exec("RESET ROLE; ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY"); }
  });
  test("unexpected inherited write privileges abort the proposal atomically", async () => {
    await db.exec("RESET ROLE; CREATE ROLE fixture_writer; GRANT UPDATE(report_id) ON public.share_tokens TO fixture_writer; GRANT fixture_writer TO authenticated");
    try {
      await assert.rejects(db.exec(proposal), /Unexpected authenticated share-token UPDATE privilege/);
      await db.exec("ROLLBACK");
      assert.equal((await db.query("SELECT has_column_privilege('authenticated','public.share_tokens','report_id','UPDATE') AS allowed")).rows[0].allowed,true);
    } finally {
      await db.exec("RESET ROLE; REVOKE fixture_writer FROM authenticated; REVOKE ALL ON public.share_tokens FROM fixture_writer; REVOKE UPDATE(report_id) ON public.share_tokens FROM fixture_writer; DROP ROLE fixture_writer");
    }
  });
});
