import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const sql = readFileSync("supabase/migrations/20261012190000_atomic_pathway_report_content.sql", "utf8");
const plan = readFileSync("docs/pathway-transactional-history-plan.md", "utf8");
test("prepared operation preserves caller privileges and explicit owner scope", () => {
  assert.match(sql, /SECURITY INVOKER\s+SET search_path = pg_catalog/);
  assert.doesNotMatch(sql, /SECURITY DEFINER|EXCEPTION WHEN|_user_id|_owner_id/);
  assert.match(sql, /owner_id uuid := auth.uid\(\)/);
  assert.match(sql, /owner_id IS NULL/);
  assert.equal((sql.match(/r.id = _report_id AND r.user_id = owner_id/g) ?? []).length, 2);
  assert.match(sql, /FROM PUBLIC, anon, authenticated, service_role;/);
  assert.match(sql, /GRANT EXECUTE[\s\S]+TO authenticated;/);
});
test("lock and complete-content conflict check precede snapshot allocation and both writes", () => {
  const positions = ["FOR UPDATE;", "current_content IS DISTINCT FROM _expected_content", "MAX(v.version_number)", "INSERT INTO public.pathway_report_versions", "UPDATE public.pathway_reports", "RETURN next_version;"].map(s => sql.indexOf(s));
  assert.ok(positions.every((p, i) => p >= 0 && (!i || p > positions[i - 1])));
  assert.match(sql, /VALUES \(_report_id, next_version, current_content,/);
  assert.match(sql, /SET content = _next_content/);
  assert.match(sql, /ERRCODE = '40001'/);
  assert.match(sql, /IF NOT FOUND THEN[\s\S]+Could not save the report/);
  assert.match(sql, /BEGIN;[\s\S]+COMMIT;\s*$/);
});
test("payload validation and both-caller atomic cutover retain release gates", () => {
  assert.match(sql, /jsonb_typeof\(_expected_content\) IS DISTINCT FROM 'object'/);
  assert.match(sql, /jsonb_typeof\(_next_content\) IS DISTINCT FROM 'object'/);
  assert.match(sql, /length\(_change_summary\) > 500/);
  const caller = readFileSync("src/lib/pathway.functions.ts", "utf8");
  const helper = readFileSync("src/lib/report-content-write.server.ts", "utf8");
  for (const handler of [caller.slice(caller.indexOf("export const updateReportContent"), caller.indexOf("export const listReportVersions")), caller.slice(caller.indexOf("export const regeneratePathwayReport"))]) {
    assert.match(handler, /await writeReportContent\(/);
    assert.doesNotMatch(handler, /\.insert\(|\.update\(|from\("pathway_report_versions"\)/);
  }
  assert.match(helper, /client.rpc\("save_pathway_report_content_for_student"/);
  assert.doesNotMatch(helper, /supabaseAdmin|service_role|\.from\(/);
  assert.match(plan, /Both callers are switched only in draft source; neither hosted application has been deployed with this cutover/);
  assert.match(plan, /Never retry generation automatically/);
  assert.match(plan, /Local SQL text checks do not prove transaction or RLS behavior/);
});
