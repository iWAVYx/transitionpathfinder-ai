import { z } from "zod";
import { readReportPages } from "./report-query-pages";
import { assertExpectedViewer } from "./viewer-intent";
import { normalizeActionRecord } from "./action-item-values";
export const PLANNING_READ_UNAVAILABLE =
  "We couldn't load all the saved planning records. Refresh before making changes.";
export const PLANNING_WRITE_UNCONFIRMED =
  "We couldn't confirm this change. Refresh the saved records before trying again.";
// Calls stay on the authenticated caller's client; no service fallback or retry.
type Client = {
  from(table: string): any;
  rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }>;
};
const identity = z
  .object({
    id: z.string().uuid(),
    student_id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
    category: z.string(),
    updated_at: z.string().datetime({ offset: true }),
  })
  .passthrough();
async function access(
  client: Client,
  actor: string,
  student: string,
  write: boolean,
  assignee?: string | null,
) {
  const read = await client.rpc("can_access_student", { _user_id: actor, _student_id: student });
  if (read.error !== null || read.data !== true) throw Error();
  const partner = await client.rpc("is_partner_only", { _user_id: actor });
  if (partner.error !== null || partner.data !== false) throw Error();
  if (write) {
    const edit = await client.rpc("can_edit_student", { _user_id: actor, _student_id: student });
    if (edit.error !== null || !(edit.data === true || assignee === actor)) throw Error();
  }
}
export async function readPlanningRecords(
  caller: unknown,
  actor: string,
  table: "goals" | "action_items",
  data: { student_id: string; expected_viewer_id?: string },
) {
  assertExpectedViewer(data, actor);
  const client = caller as Client;
  try {
    await access(client, actor, data.student_id, false);
    const rows = await readReportPages((from, to) =>
      client
        .from(table)
        .select("*", { count: "exact" })
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: table === "goals" })
        .order("id")
        .range(from, to),
    );
    const parsed = rows.map((row) => identity.parse(row));
    if (
      parsed.some((row) => row.student_id !== data.student_id) ||
      new Set(parsed.map((row) => row.id)).size !== parsed.length
    )
      throw Error();
    await access(client, actor, data.student_id, false);
    const edit = await client.rpc("can_edit_student", {
      _user_id: actor,
      _student_id: data.student_id,
    });
    if (edit.error !== null || typeof edit.data !== "boolean") throw Error();
    return {
      records:
        table === "action_items" ? parsed.map((row) => normalizeActionRecord(row as any)) : parsed,
      canEdit: edit.data,
    };
  } catch {
    throw Error(PLANNING_READ_UNAVAILABLE);
  }
}
export async function createPlanningRecord(
  caller: unknown,
  actor: string,
  table: "goals" | "action_items",
  input: Record<string, unknown> & {
    student_id: string;
    expected_viewer_id?: string;
    request_id?: string;
  },
) {
  assertExpectedViewer(input, actor);
  const client = caller as Client;
  try {
    await access(client, actor, input.student_id, true);
    const { expected_viewer_id, request_id, ...fields } = input,
      id = request_id ?? crypto.randomUUID(),
      author = table === "goals" ? "created_by" : "created_by_user_id";
    if (table === "action_items" && fields.pathway_report_id)
      await linkedReport(client, input.student_id, String(fields.pathway_report_id));
    const payload = { ...fields, id, [author]: actor };
    const result = await client.from(table).insert(payload).select("*").single();
    if (result.error !== null) throw Error();
    const saved = identity.parse(result.data);
    if (Object.entries(payload).some(([key, value]) => (saved[key] ?? null) !== (value ?? null)))
      throw Error();
    return table === "action_items" ? normalizeActionRecord(saved as any) : saved;
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
async function linkedReport(client: Client, student: string, report: string) {
  const reply = await client
    .from("pathway_reports")
    .select("id,student_id")
    .eq("id", report)
    .maybeSingle();
  if (reply.error !== null || reply.data?.id !== report || reply.data?.student_id !== student)
    throw Error();
}
export async function mutatePlanningRecord(
  caller: unknown,
  actor: string,
  table: "goals" | "action_items",
  data: {
    id: string;
    student_id?: string;
    expected_updated_at?: string;
    expected_viewer_id?: string;
  },
  patch: Record<string, unknown> | null,
) {
  assertExpectedViewer(data, actor);
  const client = caller as Client;
  try {
    const found = await client.from(table).select("*").eq("id", data.id).maybeSingle();
    if (found.error !== null) throw Error();
    const before = identity.parse(found.data);
    if (
      before.id !== data.id ||
      (data.student_id && data.student_id !== before.student_id) ||
      (data.expected_updated_at && data.expected_updated_at !== before.updated_at)
    )
      throw Error();
    await access(
      client,
      actor,
      before.student_id,
      true,
      table === "action_items" && patch ? (before.assigned_to_user_id as string | null) : null,
    );
    if (table === "action_items" && patch && before.pathway_report_id)
      await linkedReport(client, before.student_id, String(before.pathway_report_id));
    if (
      patch &&
      (!Object.keys(patch).length ||
        Object.entries(patch).every(([key, value]) => (before[key] ?? null) === (value ?? null)))
    )
      return { before, row: before, changed: false };
    let q = patch ? client.from(table).update(patch) : client.from(table).delete();
    q = q
      .eq("id", before.id)
      .eq("student_id", before.student_id)
      .eq("updated_at", before.updated_at);
    const reply = await q.select("*").single();
    if (reply.error !== null) throw Error();
    const row = identity.parse(reply.data);
    if (
      row.id !== before.id ||
      row.student_id !== before.student_id ||
      (patch &&
        Object.entries(patch).some(([key, value]) => (row[key] ?? null) !== (value ?? null))) ||
      (!patch && row.updated_at !== before.updated_at)
    )
      throw Error();
    return { before, row, changed: true };
  } catch {
    throw Error(PLANNING_WRITE_UNCONFIRMED);
  }
}
