import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";

export type LivePathwayScope = {
  ownerId: string; studentId: string; educatorId: string; marker: string;
  collaboratorEmail: string; intakeId: string; reportId: string; collaboratorId: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Privileged cleanup is confined to one exact run, never historical QA prefixes.
 * Resolve and validate every candidate before the first deletion. */
export async function cleanupLivePathwayExact(
  client: SupabaseClient<Database>, scope: LivePathwayScope,
  recordScope: (receipt: { intakeIds: string[]; reportIds: string[]; collaboratorIds: string[] }) => Promise<void>,
) {
  const run = /^QA Pathway (\d+-\d+)$/.exec(scope.marker)?.[1];
  if (!run || scope.collaboratorEmail !== `pathway.qa.${run}@staging.transitionforwardct.test` ||
    ![scope.ownerId, scope.studentId, scope.educatorId].every(id => uuid.test(id)) ||
    [scope.intakeId, scope.reportId, scope.collaboratorId].some(id => id !== "" && !uuid.test(id)))
    throw Error("Invalid exact Pathway cleanup scope");
  function one(rows: Array<{id: string}> | null, error: unknown, known: string, label: string) {
    if (error || !rows || rows.length > 1 || rows.some(row => !uuid.test(row.id)) ||
      (known && rows.some(row => row.id !== known))) throw Error(`Ambiguous exact Pathway ${label}; no cleanup started`);
    return rows.map(row => row.id);
  }
  const intakeRead = await client.from("student_intakes").select("id")
    .eq("user_id", scope.ownerId).eq("student_id", scope.studentId)
    .eq("student_first_name", scope.marker).limit(2);
  const intakeIds = one(intakeRead.data, intakeRead.error, scope.intakeId, "intake");
  let reportIds: string[] = [];
  if (intakeIds.length) {
    const reportRead = await client.from("pathway_reports").select("id, user_id, student_id")
      .eq("intake_id", intakeIds[0]).limit(2);
    if (reportRead.data?.some(row => row.user_id !== scope.ownerId || row.student_id !== scope.studentId))
      throw Error("Exact intake has an unexpected report context; no cleanup started");
    reportIds = one(reportRead.data, reportRead.error, scope.reportId, "report");
  } else if (scope.reportId) {
    throw Error("Known report has no matching exact intake; no cleanup started");
  }
  const collaboratorRead = await client.from("student_collaborators").select("id")
    .eq("student_id", scope.studentId).eq("user_id", scope.educatorId)
    .eq("invited_by", scope.ownerId).eq("invited_email", scope.collaboratorEmail)
    .eq("is_demo", true).limit(2);
  const collaboratorIds = one(collaboratorRead.data, collaboratorRead.error, scope.collaboratorId, "collaborator");
  const receipt = { intakeIds, reportIds, collaboratorIds };
  // Failure to save the exact deletion scope stops before any mutation.
  await recordScope(receipt);
  const errors: string[] = [];
  async function remove(label: string, request: () => PromiseLike<{data: Array<{id:string}> | null; error: unknown}>, expected: string) {
    try {
      const result = await request();
      if (result.error || result.data?.length !== 1 || result.data[0].id !== expected) errors.push(`Exact Pathway ${label} deletion failed`);
    } catch { errors.push(`Exact Pathway ${label} deletion failed`); }
  }
  for (const id of reportIds) await remove("report", () => client.from("pathway_reports").delete()
    .eq("id", id).eq("user_id", scope.ownerId).eq("student_id", scope.studentId)
    .eq("intake_id", intakeIds[0]).select("id"), id);
  for (const id of intakeIds) await remove("intake", () => client.from("student_intakes").delete()
    .eq("id", id).eq("user_id", scope.ownerId).eq("student_id", scope.studentId)
    .eq("student_first_name", scope.marker).select("id"), id);
  for (const id of collaboratorIds) await remove("collaborator", () => client.from("student_collaborators").delete()
    .eq("id", id).eq("student_id", scope.studentId).eq("user_id", scope.educatorId)
    .eq("invited_by", scope.ownerId).eq("invited_email", scope.collaboratorEmail)
    .eq("is_demo", true).select("id"), id);
  // Check exact row identities as well as the exact run scope; never touch the standing student.
  const checkIntakes = [...new Set([...intakeIds, ...[scope.intakeId].filter(Boolean)])];
  const checkReports = [...new Set([...reportIds, ...[scope.reportId].filter(Boolean)])];
  const checkCollaborators = [...new Set([...collaboratorIds, ...[scope.collaboratorId].filter(Boolean)])];
  const checks: Array<[string, string, string]> = [
    ...checkIntakes.map(id => ["student_intakes", "id", id] as [string,string,string]),
    ...checkReports.flatMap(id => [["pathway_reports","id",id], ["pathway_report_versions","report_id",id], ["share_tokens","report_id",id]] as Array<[string,string,string]>),
    ...checkCollaborators.map(id => ["student_collaborators", "id", id] as [string,string,string]),
  ];
  for (const [table,column,id] of checks) {
    try {
      // Tables and columns are fixed constants above, not caller input.
      const result = await (client.from(table as "pathway_reports") as any).select("id",{head:true,count:"exact"}).eq(column,id);
      if (result.error || result.count !== 0) errors.push(`Exact Pathway ${table} absence failed`);
    } catch { errors.push(`Exact Pathway ${table} absence failed`); }
  }
  if (errors.length) throw Error(errors.join("; "));
  return { ...receipt, countsZero: true };
}
