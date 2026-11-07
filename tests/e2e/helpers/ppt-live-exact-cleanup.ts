import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";
export type PptFixtureScope = {
  ownerId: string;
  intakeId: string;
  reportId: string;
  prepId: string;
  marker: string;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validate(f: PptFixtureScope) {
  if (
    ![f.ownerId, f.intakeId, f.reportId].every((x) => uuid.test(x)) ||
    (f.prepId && !uuid.test(f.prepId)) ||
    !/^QA PPT \d+-\d+ (parent|educator)$/.test(f.marker) ||
    new Set([f.ownerId, f.intakeId, f.reportId]).size !== 3
  )
    throw Error("Invalid exact PPT fixture scope");
}
/** Read the exact report scope before deleting. Never sweep old markers or unrelated reports. */
export async function cleanupPptExact(
  client: SupabaseClient<Database>,
  f: PptFixtureScope,
  record: (receipt: { prepIds: string[] }) => Promise<void>,
) {
  validate(f);
  const [intake, report, preps] = await Promise.all([
    client
      .from("student_intakes")
      .select("id,user_id,student_first_name")
      .eq("id", f.intakeId)
      .maybeSingle(),
    client
      .from("pathway_reports")
      .select("id,user_id,intake_id,model,is_demo,student_id")
      .eq("id", f.reportId)
      .maybeSingle(),
    client
      .from("ppt_meeting_preps")
      .select("id,user_id,report_id")
      .eq("report_id", f.reportId)
      .limit(2),
  ]);
  if (
    intake.error ||
    report.error ||
    preps.error ||
    !preps.data ||
    preps.data.length > 1 ||
    (intake.data &&
      (intake.data.user_id !== f.ownerId || intake.data.student_first_name !== f.marker)) ||
    (report.data &&
      (report.data.user_id !== f.ownerId ||
        report.data.intake_id !== f.intakeId ||
        report.data.model !== "synthetic-ppt-fixture" ||
        report.data.is_demo !== true ||
        report.data.student_id !== null)) ||
    preps.data.some(
      (p) =>
        !uuid.test(p.id) ||
        p.user_id !== f.ownerId ||
        p.report_id !== f.reportId ||
        (f.prepId && p.id !== f.prepId),
    )
  )
    throw Error("Unexpected or ambiguous PPT fixture context; cleanup stopped before deletion");
  const prepIds = preps.data.map((p) => p.id);
  await record({ prepIds });
  const errors: string[] = [];
  async function remove(
    label: string,
    q: PromiseLike<{ data: Array<{ id: string }> | null; error: unknown }>,
    id: string,
  ) {
    try {
      const r = await q;
      if (r.error || r.data?.length !== 1 || r.data[0].id !== id)
        errors.push(`Exact PPT ${label} deletion failed`);
    } catch {
      errors.push(`Exact PPT ${label} deletion failed`);
    }
  }
  for (const id of prepIds)
    await remove(
      "packet",
      client
        .from("ppt_meeting_preps")
        .delete()
        .eq("id", id)
        .eq("report_id", f.reportId)
        .eq("user_id", f.ownerId)
        .select("id"),
      id,
    );
  if (report.data)
    await remove(
      "report",
      client
        .from("pathway_reports")
        .delete()
        .eq("id", f.reportId)
        .eq("user_id", f.ownerId)
        .eq("intake_id", f.intakeId)
        .eq("model", "synthetic-ppt-fixture")
        .eq("is_demo", true)
        .is("student_id", null)
        .select("id"),
      f.reportId,
    );
  if (intake.data)
    await remove(
      "intake",
      client
        .from("student_intakes")
        .delete()
        .eq("id", f.intakeId)
        .eq("user_id", f.ownerId)
        .eq("student_first_name", f.marker)
        .select("id"),
      f.intakeId,
    );
  const checks = [
    ["ppt_meeting_preps", "report_id", f.reportId],
    ["pathway_reports", "id", f.reportId],
    ["student_intakes", "id", f.intakeId],
    ["pathway_report_versions", "report_id", f.reportId],
    ["share_tokens", "report_id", f.reportId],
    ...[...new Set([...prepIds, ...[f.prepId].filter(Boolean)])].map((id) => [
      "ppt_meeting_preps",
      "id",
      id,
    ]),
  ];
  for (const [table, column, id] of checks) {
    try {
      const r = await (client.from(table as "pathway_reports") as any)
        .select("id", { head: true, count: "exact" })
        .eq(column, id);
      if (r.error || r.count !== 0) errors.push(`Exact PPT ${table} absence failed`);
    } catch {
      errors.push(`Exact PPT ${table} absence failed`);
    }
  }
  if (errors.length) throw Error(errors.join("; "));
  return { prepIds, countsZero: true };
}
export function pptExactAbsenceSql(f: PptFixtureScope) {
  validate(f);
  return `BEGIN READ ONLY;
DO $guard$ BEGIN IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.student_intakes'::regclass,'public.pathway_reports'::regclass,'public.ppt_meeting_preps'::regclass,'public.pathway_report_versions'::regclass,'public.share_tokens'::regclass) AND (relowner<>current_user::regrole OR relforcerowsecurity)) THEN RAISE EXCEPTION 'Independent table-owner reader required'; END IF; END; $guard$;
SELECT jsonb_build_object('run_marker','${f.marker}','operator',current_user,'read_only',current_setting('transaction_read_only'),'observed_at',now(),
'intake_count',(SELECT count(*) FROM public.student_intakes WHERE id='${f.intakeId}'::uuid),
'report_count',(SELECT count(*) FROM public.pathway_reports WHERE id='${f.reportId}'::uuid),
'prep_count',(SELECT count(*) FROM public.ppt_meeting_preps WHERE report_id='${f.reportId}'::uuid OR student_name='${f.marker}'${f.prepId ? " OR id='" + f.prepId + "'::uuid" : ""}),
'version_count',(SELECT count(*) FROM public.pathway_report_versions WHERE report_id='${f.reportId}'::uuid),
'share_count',(SELECT count(*) FROM public.share_tokens WHERE report_id='${f.reportId}'::uuid)) AS exact_ppt_cleanup;
COMMIT;
`;
}
