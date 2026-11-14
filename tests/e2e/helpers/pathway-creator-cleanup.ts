import { reportAssistName } from "./report-assist-fixture";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";
export type CreatorScope = {
  ownerId: string;
  studentId: string;
  intakeId: string;
  reportId: string;
  marker: string;
  role: "parent" | "educator";
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const CREATOR_EMPTY_STUDENT_TABLES = [
  "student_relationships",
  "student_collaborators",
  "student_guardians",
  "student_team_members",
  "student_voice_responses",
  "goals",
  "readiness_scores",
  "documents",
  "document_extractions",
  "student_resource_recommendations",
  "student_opportunity_matches",
  "student_saved_partners",
  "action_items",
  "ppt_meeting_preps",
  "evidence_items",
  "report_evidence_links",
] as const;
type FixtureKind = "creator" | "assist";
function validate(f: CreatorScope, kind: FixtureKind = "creator") {
  if (
    !["parent", "educator"].includes(f.role) ||
    !new RegExp("^QA " + (kind === "creator" ? "Pathway Creator" : "Report Assist") + " \\d+-\\d+ " + f.role + "$").test(f.marker) ||
    ![f.ownerId, f.studentId].every((x) => uuid.test(x)) ||
    [f.intakeId, f.reportId].some((x) => x !== "" && !uuid.test(x)) ||
    new Set([f.ownerId, f.studentId, ...[f.intakeId, f.reportId].filter(Boolean)]).size !==
      2 + [f.intakeId, f.reportId].filter(Boolean).length
  )
    throw Error("Invalid exact Pathway creator scope");
}
async function cleanupPlanningFixture(
  client: SupabaseClient<Database>,
  f: CreatorScope,
  record: (f: CreatorScope & { versionIds: string[] }) => Promise<void>,
  kind: FixtureKind,
) {
  validate(f, kind);
  const displayName = kind === "creator" ? f.marker : reportAssistName(f.role);
  const model = kind === "creator" ? "google/gemini-2.5-pro" : "synthetic-report-assist-fixture";
  const [s, i, r] = await Promise.all([
    client
      .from("students")
      .select("id,owner_id,first_name,last_name,is_demo,student_user_id,notes")
      .eq("id", f.studentId)
      .maybeSingle(),
    client
      .from("student_intakes")
      .select("id,user_id,student_id,student_first_name,submitter_role")
      .eq("student_id", f.studentId)
      .limit(2),
    client
      .from("pathway_reports")
      .select("id,user_id,student_id,intake_id,model,is_demo")
      .eq("student_id", f.studentId)
      .limit(2),
  ]);
  if (
    s.error ||
    i.error ||
    r.error ||
    !i.data ||
    !r.data ||
    i.data.length > 1 ||
    r.data.length > 1 ||
    (s.data &&
      (s.data.owner_id !== f.ownerId ||
        s.data.first_name !== displayName ||
        s.data.last_name !== "Synthetic" ||
        s.data.is_demo !== true ||
        s.data.student_user_id !== null ||
        s.data.notes !== f.marker)) ||
    i.data.some(
      (x) =>
        !uuid.test(x.id) ||
        x.user_id !== f.ownerId ||
        x.student_id !== f.studentId ||
        x.student_first_name !== displayName ||
        x.submitter_role !== (f.role === "parent" ? "family" : "educator") ||
        (f.intakeId && x.id !== f.intakeId),
    ) ||
    r.data.some(
      (x) =>
        !uuid.test(x.id) ||
        x.user_id !== f.ownerId ||
        x.student_id !== f.studentId ||
        x.intake_id !== i.data![0]?.id ||
        x.model !== model ||
        (kind === "assist" && x.is_demo !== true) ||
        (f.reportId && x.id !== f.reportId),
    ) ||
    (f.intakeId && !i.data.length) ||
    (f.reportId && !r.data.length) ||
    (!s.data && (i.data.length || r.data.length))
  )
    throw Error("Unexpected Pathway creator context; no cleanup started");
  const resolved = {
    ...f,
    intakeId: i.data[0]?.id ?? f.intakeId,
    reportId: r.data[0]?.id ?? f.reportId,
  };
  const emptyChecks = CREATOR_EMPTY_STUDENT_TABLES.map((table) => [
    table,
    "student_id",
    f.studentId,
  ]);
  if (resolved.reportId)
    emptyChecks.push(
      ["share_tokens", "report_id", resolved.reportId],
      ["evidence_edges", "to_id", resolved.reportId],
    );
  for (const [table, column, id] of emptyChecks) {
    const q = await (client.from(table as "students") as any)
      .select("*", { head: true, count: "exact" })
      .eq(column, id);
    if (q.error || q.count !== 0)
      throw Error("Unexpected related rows or unavailable count; no cleanup started: " + table);
  }
  let versionIds: string[] = [];
  if (resolved.reportId) {
    const v = await client
      .from("pathway_report_versions")
      .select("id,created_by,report_id")
      .eq("report_id", resolved.reportId)
      .limit(2);
    if (
      v.error ||
      !v.data ||
      v.data.length > (kind === "creator" ? 1 : 0) ||
      v.data.some(
        (x) => !uuid.test(x.id) || x.created_by !== f.ownerId || x.report_id !== resolved.reportId,
      )
    )
      throw Error("Unexpected history; no cleanup started");
    versionIds = v.data.map((x) => x.id);
  }
  await record({ ...resolved, versionIds });
  const errors: string[] = [];
  async function remove(
    table: string,
    q: PromiseLike<{ data: Array<{ id: string }> | null; error: unknown }>,
    id: string,
  ) {
    try {
      const d = await q;
      if (d.error || d.data?.length !== 1 || d.data[0].id !== id)
        errors.push("Exact deletion failed: " + table);
    } catch {
      errors.push("Exact deletion failed: " + table);
    }
  }
  if (r.data.length) {
    const reportDelete = client
        .from("pathway_reports")
        .delete()
        .eq("id", resolved.reportId)
        .eq("user_id", f.ownerId)
        .eq("student_id", f.studentId)
        .eq("intake_id", resolved.intakeId)
        .eq("model", model);
    if (kind === "assist") reportDelete.eq("is_demo", true);
    await remove("report", reportDelete.select("id"), resolved.reportId);
  }
  if (!errors.length && i.data.length)
    await remove(
      "intake",
      client
        .from("student_intakes")
        .delete()
        .eq("id", resolved.intakeId)
        .eq("user_id", f.ownerId)
        .eq("student_id", f.studentId)
        .eq("student_first_name", displayName)
        .select("id"),
      resolved.intakeId,
    );
  // Do not cascade a parent after a failed child deletion.
  if (!errors.length && s.data)
    await remove(
      "student",
      client
        .from("students")
        .delete()
        .eq("id", f.studentId)
        .eq("owner_id", f.ownerId)
        .eq("first_name", displayName)
        .eq("last_name", "Synthetic")
        .eq("notes", f.marker)
        .eq("is_demo", true)
        .is("student_user_id", null)
        .select("id"),
      f.studentId,
    );
  const checks = [
    ["students", "id", f.studentId],
    ["student_intakes", "student_id", f.studentId],
    ["pathway_reports", "student_id", f.studentId],
    ...emptyChecks,
  ];
  if (resolved.intakeId) checks.push(["student_intakes", "id", resolved.intakeId]);
  if (resolved.reportId)
    checks.push(
      ["pathway_reports", "id", resolved.reportId],
      ["pathway_report_versions", "report_id", resolved.reportId],
    );
  for (const [table, column, id] of checks) {
    try {
      const q = await (client.from(table as "students") as any)
        .select("*", { head: true, count: "exact" })
        .eq(column, id);
      if (q.error || q.count !== 0) errors.push("Caller-visible absence failed: " + table);
    } catch {
      errors.push("Caller-visible absence failed: " + table);
    }
  }
  if (errors.length) throw Error(errors.join("; "));
  return {
    ...resolved,
    versionIds,
    callerVisibleCountsZero: true,
    independentPrivilegedAbsenceRequired: true,
  };
}
function planningAbsenceSql(f: CreatorScope, kind: FixtureKind) {
  validate(f, kind);
  const tables = [
    "students",
    "student_intakes",
    "pathway_reports",
    "pathway_report_versions",
    "share_tokens",
    "evidence_edges",
    ...CREATOR_EMPTY_STUDENT_TABLES,
  ];
  const reportWhere = `student_id='${f.studentId}'::uuid${f.reportId ? ` OR id='${f.reportId}'::uuid` : ""}`;
  const reportIds = `SELECT id FROM public.pathway_reports WHERE ${reportWhere}${f.reportId ? ` UNION SELECT '${f.reportId}'::uuid` : ""}`;
  const counts = [
    `'student_count',(SELECT count(*) FROM public.students WHERE id='${f.studentId}'::uuid)`,
    `'intake_count',(SELECT count(*) FROM public.student_intakes WHERE student_id='${f.studentId}'::uuid${f.intakeId ? ` OR id='${f.intakeId}'::uuid` : ""})`,
    `'report_count',(SELECT count(*) FROM public.pathway_reports WHERE ${reportWhere})`,
    `'version_count',(SELECT count(*) FROM public.pathway_report_versions WHERE report_id IN (${reportIds}))`,
    `'share_count',(SELECT count(*) FROM public.share_tokens WHERE report_id IN (${reportIds}))`,
    `'edge_count',(SELECT count(*) FROM public.evidence_edges WHERE to_id IN (${reportIds}))`,
    ...CREATOR_EMPTY_STUDENT_TABLES.map(
      (table) =>
        `'${table}_count',(SELECT count(*) FROM public.${table} WHERE student_id='${f.studentId}'::uuid)`,
    ),
  ];
  return `BEGIN READ ONLY;\nDO $guard$ BEGIN IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN (${tables.map((t) => `'public.${t}'::regclass`).join(",")}) AND (relowner<>current_user::regrole OR relforcerowsecurity)) THEN RAISE EXCEPTION 'Independent table-owner reader required'; END IF; END; $guard$;\nSELECT jsonb_build_object('run_marker','${f.marker}','operator',current_user,'read_only',current_setting('transaction_read_only'),'observed_at',now(),${counts.join(",\n")}) AS pathway_creator_cleanup;\nCOMMIT;\n`;
}

// Fixed policies: callers cannot supply a marker pattern, provider model or history allowance.
export const cleanupCreator = (client: SupabaseClient<Database>, f: CreatorScope, record: (f: CreatorScope & { versionIds: string[] }) => Promise<void>) => cleanupPlanningFixture(client, f, record, "creator");
export const cleanupReportAssist = (client: SupabaseClient<Database>, f: CreatorScope, record: (f: CreatorScope & { versionIds: string[] }) => Promise<void>) => cleanupPlanningFixture(client, f, record, "assist");
export const creatorAbsenceSql = (f: CreatorScope) => planningAbsenceSql(f, "creator");
export const reportAssistAbsenceSql = (f: CreatorScope) => planningAbsenceSql(f, "assist");
