import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/integrations/supabase/types";
export type LinkedAccessFixture = {
  studentId: string;
  intakeId: string;
  reportId: string;
  relationshipIds: string[];
  actorIds: string[];
  marker: string;
  studentAttempted: boolean;
  intakeAttempted: boolean;
  reportAttempted: boolean;
  relationshipsAttempted: boolean;
};

/** Only five exact fictional row IDs, plus truthful versions cascading with their report.
 * All clients use the public key and their own RLS. Global absence needs independent SQL. */
export async function cleanupLinkedAccessFixture(
  clients: Array<{ id: string; client: SupabaseClient<Database> }>,
  f: LinkedAccessFixture,
) {
  assertLinkedAccessScope(f);
  if (clients.length !== 3 || clients.some((c, i) => c.id !== f.actorIds[i]))
    throw Error("Invalid bounded linked-access cleanup scope");
  const errors: string[] = [];
  const owner = clients[0].client;
  const run = async (name: string, request: () => PromiseLike<{ error: unknown }>) => {
    try {
      if ((await request()).error) errors.push(name);
    } catch {
      errors.push(name);
    }
  };
  if (f.relationshipsAttempted)
    await run("Exact relationship cleanup failed", () =>
      owner
        .from("student_relationships")
        .delete()
        .in("id", f.relationshipIds)
        .eq("student_id", f.studentId)
        .in("related_user_id", f.actorIds.slice(1)),
    );
  if (f.reportAttempted)
    await run("Exact report cleanup failed", () =>
      owner
        .from("pathway_reports")
        .delete()
        .eq("id", f.reportId)
        .eq("intake_id", f.intakeId)
        .eq("model", "synthetic-no-ai-history")
        .in("user_id", f.actorIds),
    );
  // The exact owned intake cascades only its fictional report if ownership was
  // unexpectedly changed by the permission probe. No broad marker deletion.
  if (f.intakeAttempted)
    await run("Exact intake cleanup failed", () =>
      owner
        .from("student_intakes")
        .delete()
        .eq("id", f.intakeId)
        .eq("user_id", f.actorIds[0])
        .eq("student_first_name", f.marker),
    );
  if (f.studentAttempted)
    for (const c of clients)
      await run("Exact student cleanup failed", () =>
        c.client
          .from("students")
          .delete()
          .eq("id", f.studentId)
          .eq("owner_id", c.id)
          .eq("first_name", f.marker)
          .eq("is_demo", true),
      );
  for (const [table, column, id] of [
    ["students", "id", f.studentId],
    ["student_intakes", "id", f.intakeId],
    ["pathway_reports", "id", f.reportId],
    ["pathway_report_versions", "report_id", f.reportId],
    ["student_relationships", "student_id", f.studentId],
  ] as const) {
    try {
      const result = await owner
        .from(table)
        .select("id", { head: true, count: "exact" })
        .eq(column, id);
      if (result.error || result.count !== 0)
        errors.push(`Caller-RLS cleanup readback failed: ${table}`);
    } catch {
      errors.push(`Caller-RLS cleanup readback failed: ${table}`);
    }
  }
  return errors;
}

function assertLinkedAccessScope(f: LinkedAccessFixture) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ids = [f.studentId, f.intakeId, f.reportId, ...f.relationshipIds, ...f.actorIds];
  if (
    f.relationshipIds.length !== 2 ||
    f.actorIds.length !== 3 ||
    !ids.every((id) => uuid.test(id)) ||
    new Set(ids).size !== ids.length ||
    !/^QA Linked Access \d+-\d+$/.test(f.marker)
  )
    throw Error("Invalid bounded linked-access cleanup scope");
}
/** Operator runs only on the already verified isolated staging SQL editor. */
export function linkedAccessCleanupVerificationSql(f: LinkedAccessFixture) {
  assertLinkedAccessScope(f);
  return `-- Exact fictional identifiers from ${f.marker}; metadata/counts only. No mutation.
BEGIN READ ONLY;
DO $scope$ BEGIN
 IF current_user<>'postgres' OR EXISTS(SELECT 1 FROM pg_class WHERE oid IN ('public.students'::regclass,'public.student_intakes'::regclass,'public.pathway_reports'::regclass,'public.pathway_report_versions'::regclass,'public.student_relationships'::regclass,'public.student_collaborators'::regclass,'public.channels'::regclass,'public.share_tokens'::regclass) AND (relowner<>current_user::regrole OR relforcerowsecurity)) THEN RAISE EXCEPTION 'Expected independent table-owner reader'; END IF;
END; $scope$;
SELECT jsonb_build_object('run_marker','${f.marker}','operator',current_user,'read_only',current_setting('transaction_read_only'),'observed_at',now(),
 'student_count',(SELECT count(*) FROM public.students WHERE id='${f.studentId}'::uuid),
 'intake_count',(SELECT count(*) FROM public.student_intakes WHERE id='${f.intakeId}'::uuid),
 'report_count',(SELECT count(*) FROM public.pathway_reports WHERE id='${f.reportId}'::uuid),
 'version_count',(SELECT count(*) FROM public.pathway_report_versions WHERE report_id='${f.reportId}'::uuid),
 'relationship_count',(SELECT count(*) FROM public.student_relationships WHERE student_id='${f.studentId}'::uuid OR id IN ('${f.relationshipIds[0]}'::uuid,'${f.relationshipIds[1]}'::uuid)),
 'collaborator_count',(SELECT count(*) FROM public.student_collaborators WHERE student_id='${f.studentId}'::uuid),
 'channel_count',(SELECT count(*) FROM public.channels WHERE student_id='${f.studentId}'::uuid),
 'share_count',(SELECT count(*) FROM public.share_tokens WHERE report_id='${f.reportId}'::uuid)
) AS exact_linked_access_cleanup;
COMMIT;
`;
}
