import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";
import { CREATOR_EMPTY_STUDENT_TABLES } from "./pathway-creator-cleanup";
export type ReadinessScope = { ownerId: string; studentId: string; scoreId: string; marker: string; role: "parent" | "educator" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emptyTables = ["student_intakes", "pathway_reports", ...CREATOR_EMPTY_STUDENT_TABLES.filter(t => t !== "readiness_scores")];
export function validateReadinessScope(f: ReadinessScope) {
  if (!uuid.test(f.ownerId) || !uuid.test(f.studentId) || f.ownerId === f.studentId || !["parent", "educator"].includes(f.role) || !new RegExp("^QA Readiness \\d+-\\d+ " + f.role + "$" ).test(f.marker) || (f.role === "parent" ? f.scoreId !== "" : !uuid.test(f.scoreId) || [f.ownerId, f.studentId].includes(f.scoreId))) throw Error("Invalid exact Readiness scope");
}
export function readinessAbsenceSql(f: ReadinessScope) {
  validateReadinessScope(f);
  const tables = ["students", "readiness_scores", ...emptyTables];
  const counts = ["'student_count',(SELECT count(*) FROM public.students WHERE id='" + f.studentId + "'::uuid)", "'readiness_count',(SELECT count(*) FROM public.readiness_scores WHERE student_id='" + f.studentId + "'::uuid" + (f.scoreId ? " OR id='" + f.scoreId + "'::uuid" : "") + ")", ...emptyTables.map(t => "'" + t + "_count',(SELECT count(*) FROM public." + t + " WHERE student_id='" + f.studentId + "'::uuid)")];
  return `BEGIN READ ONLY;
DO $guard$ BEGIN IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN (${tables.map(t => `'public.${t}'::regclass`).join(",")}) AND (relowner<>current_user::regrole OR relforcerowsecurity)) THEN RAISE EXCEPTION 'Independent table-owner reader required'; END IF; END; $guard$;
SELECT jsonb_build_object('run_marker','${f.marker}','operator',current_user,'read_only',current_setting('transaction_read_only'),'observed_at',now(),${counts.join(",")}) AS readiness_cleanup;
COMMIT;
`;
}
export async function cleanupReadiness(client: SupabaseClient<Database>, f: ReadinessScope) {
  validateReadinessScope(f);
  const s = await client.from("students").select("id,owner_id,first_name,last_name,notes,is_demo,student_user_id").eq("id", f.studentId).maybeSingle();
  const r = await client.from("readiness_scores").select("id,student_id,category,score,evidence,updated_by_user_id,is_demo").eq("student_id", f.studentId).limit(2);
  if (s.error || r.error || !s.data || !r.data || s.data.owner_id !== f.ownerId || s.data.first_name !== f.marker || s.data.last_name !== "Synthetic" || s.data.notes !== f.marker || !s.data.is_demo || s.data.student_user_id !== null || r.data.length !== (f.scoreId ? 1 : 0) || r.data.some(x => x.id !== f.scoreId || x.student_id !== f.studentId || x.category !== "employment" || x.score !== 75.5 || x.evidence !== f.marker || x.updated_by_user_id !== f.ownerId || !x.is_demo)) throw Error("Unexpected Readiness fixture; cleanup stopped");
  for (const table of emptyTables) {
    const q = await (client.from(table as "students") as any).select("*", { head: true, count: "exact" }).eq("student_id", f.studentId);
    if (q.error || q.count !== 0) throw Error("Unexpected related records; cleanup stopped");
  }
  if (f.scoreId) {
    const removed = await client.from("readiness_scores").delete().eq("id", f.scoreId).eq("student_id", f.studentId).eq("evidence", f.marker).eq("updated_by_user_id", f.ownerId).eq("is_demo", true).select("id");
    if (removed.error || removed.data?.length !== 1 || removed.data[0].id !== f.scoreId) throw Error("Readiness removal unconfirmed; parent retained");
  }
  const removed = await client.from("students").delete().eq("id", f.studentId).eq("owner_id", f.ownerId).eq("first_name", f.marker).eq("last_name", "Synthetic").eq("notes", f.marker).eq("is_demo", true).is("student_user_id", null).select("id");
  if (removed.error || removed.data?.length !== 1 || removed.data[0].id !== f.studentId) throw Error("Student removal unconfirmed");
  for (const [table, field] of [["students", "id"], ["readiness_scores", "student_id"], ...emptyTables.map(t => [t, "student_id"])]) {
    const q = await (client.from(table as "students") as any).select("*", { head: true, count: "exact" }).eq(field, f.studentId);
    if (q.error || q.count !== 0) throw Error("Caller-visible absence unconfirmed");
  }
  return { ...f, callerVisibleCountsZero: true, independentPrivilegedAbsenceRequired: true };
}
