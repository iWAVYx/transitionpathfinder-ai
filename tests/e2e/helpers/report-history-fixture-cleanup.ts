import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";

/** Delete only this run's exact owner-scoped IDs; never old QA markers or broad sets. */
export async function cleanupReportHistoryFixture(client: SupabaseClient<Database>, fixture: {reportId:string; intakeId:string; ownerId:string; reportCreated:boolean; intakeCreated:boolean; reportAttempted?:boolean; intakeAttempted?:boolean; marker:string; model?:"synthetic-no-ai-history"|"synthetic-no-ai-sharing"}) {
  const errors: string[] = [];
  const {reportId,intakeId,ownerId} = fixture;
  const model=fixture.model ?? "synthetic-no-ai-history";
  if (!["synthetic-no-ai-history","synthetic-no-ai-sharing"].includes(model)) throw new Error("Invalid exact fixture model");
  if (![reportId,intakeId,ownerId].every(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) throw new Error("Invalid exact fixture cleanup scope");
  for (const [table,id,created,attempted] of [["pathway_reports",reportId,fixture.reportCreated,fixture.reportAttempted],["student_intakes",intakeId,fixture.intakeCreated,fixture.intakeAttempted]] as const) {
    if (!created && !attempted) continue;
    try {
      const query = client.from(table).delete().eq("id",id).eq("user_id",ownerId);
      const result = table === "pathway_reports"
        ? await query.eq("model",model).eq("intake_id",intakeId).select("id")
        : await query.eq("student_first_name",fixture.marker).select("id");
      if (result.error || !result.data || (created ? result.data.length !== 1 : result.data.length > 1)) errors.push(`Exact disposable ${table} deletion failed`);
    } catch { errors.push(`Exact disposable ${table} deletion failed`); }
  }
  // These are caller-RLS readbacks, not privileged global absence assertions.
  for (const [table,column,id] of [["pathway_reports","id",reportId],["student_intakes","id",intakeId],["pathway_report_versions","report_id",reportId]] as const) {
    try {
      const result = await client.from(table).select("id",{count:"exact",head:true}).eq(column,id);
      if (result.error || result.count !== 0) errors.push(`Caller-RLS cleanup readback failed: ${table}`);
    } catch { errors.push(`Caller-RLS cleanup readback failed: ${table}`); }
  }
  return errors;
}
