import { z } from "zod";
import { readReportPages, readReportBatches } from "./report-query-pages";
import { assertExpectedViewer } from "./viewer-intent";
import { isActionItemComplete, normalizeActionRecord } from "./action-item-values";
export const CASELOAD_UNAVAILABLE =
  "We couldn't load all of your student information. Refresh to check your access and current records.";
const stamp = z.string().datetime({ offset: true });
const studentSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  grade_band: z.string().nullable(),
  school: z.string().nullable(),
  photo_url: z.string().nullable(),
});
const recordSchema = z
  .object({ id: z.string().uuid(), student_id: z.string().uuid() })
  .passthrough();
type Client = {
  from(table: string): any;
  rpc(name: string, args: Record<string, string>): PromiseLike<{ data: unknown; error: unknown }>;
};
export async function studentCapability(client: Client, actor: string, student: string) {
  const read = await client.rpc("can_access_student", { _user_id: actor, _student_id: student });
  const partner = await client.rpc("is_partner_only", { _user_id: actor });
  const edit = await client.rpc("can_edit_student", { _user_id: actor, _student_id: student });
  if (
    read.error !== null ||
    read.data !== true ||
    partner.error !== null ||
    partner.data !== false ||
    edit.error !== null ||
    typeof edit.data !== "boolean"
  )
    throw Error(CASELOAD_UNAVAILABLE);
  return edit.data;
}
async function capabilities(client: Client, actor: string, ids: string[]) {
  const result = new Map<string, boolean>();
  for (let i = 0; i < ids.length; i += 10)
    await Promise.all(
      ids.slice(i, i + 10).map(async (id) => {
        result.set(id, await studentCapability(client, actor, id));
      }),
    );
  return result;
}
export async function readCaseloadScope(
  caller: unknown,
  actor: string,
  intent?: { expected_viewer_id?: string },
) {
  assertExpectedViewer(intent ?? {}, actor);
  const client = caller as Client;
  try {
    const partner = await client.rpc("is_partner_only", { _user_id: actor });
    if (partner.error !== null || partner.data !== false) throw Error();
    const raw = await readReportPages<unknown>((from, to) =>
      client
        .from("students")
        .select("id, owner_id, first_name, last_name, grade_band, school, photo_url", {
          count: "exact",
        })
        .order("id")
        .range(from, to),
    );
    const students = raw.map((row) => studentSchema.parse(row)),
      ids = students.map((s) => s.id);
    if (new Set(ids).size !== ids.length) throw Error();
    const canEdit = await capabilities(client, actor, ids);
    return { client, actor, students, ids, byId: new Map(students.map((s) => [s.id, s])), canEdit };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
export type CaseloadScope = Awaited<ReturnType<typeof readCaseloadScope>>;
export async function confirmCaseloadScope(scope: CaseloadScope) {
  try {
    const current = await capabilities(scope.client, scope.actor, scope.ids);
    for (const [id, edit] of current) if (edit !== scope.canEdit.get(id)) throw Error();
    const partner = await scope.client.rpc("is_partner_only", { _user_id: scope.actor });
    if (partner.error !== null || partner.data !== false) throw Error();
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
export async function readCaseloadRows(
  scope: CaseloadScope,
  table: string,
  fields: string,
  configure: (q: any) => any = (q) => q,
) {
  try {
    const rows = await readReportBatches<unknown>(scope.ids, (ids, from, to) =>
      configure(scope.client.from(table).select(fields, { count: "exact" }).in("student_id", ids))
        .order("id")
        .range(from, to),
    );
    const parsed = rows.map((row) => recordSchema.parse(row));
    if (
      new Set(parsed.map((r) => r.id)).size !== parsed.length ||
      parsed.some((r) => !scope.byId.has(r.student_id))
    )
      throw Error();
    return parsed;
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
const fullName = (s: { first_name: string; last_name: string | null }) =>
  [s.first_name, s.last_name].filter(Boolean).join(" ");
export async function readCaseloadOverview(
  caller: unknown,
  actor: string,
  intent?: { expected_viewer_id?: string },
) {
  try {
    const scope = await readCaseloadScope(caller, actor, intent),
      now = new Date().toISOString();
    const [actions, goals, notes, reports, meetings] = await Promise.all([
      readCaseloadRows(scope, "action_items", "id, student_id, status"),
      readCaseloadRows(scope, "goals", "id, student_id"),
      readCaseloadRows(scope, "collaboration_notes", "id, student_id, created_at", (q) =>
        q.order("created_at", { ascending: false }),
      ),
      readCaseloadRows(scope, "pathway_reports", "id, student_id, created_at", (q) =>
        q.order("created_at", { ascending: false }),
      ),
      readCaseloadRows(scope, "meetings", "id, student_id, title, scheduled_at, status", (q) =>
        q.gte("scheduled_at", now).order("scheduled_at", { ascending: true }),
      ),
    ]);
    const students = scope.students.map((s) => ({
      ...s,
      relationship: (s.owner_id === actor
        ? "owner"
        : scope.canEdit.get(s.id)
          ? "editor"
          : "viewer") as "owner" | "editor" | "viewer",
      open_action_items: 0,
      goal_count: 0,
      last_note_at: null as string | null,
      latest_report_id: null as string | null,
      next_meeting_at: null as string | null,
      next_meeting_id: null as string | null,
      next_meeting_title: null as string | null,
    }));
    const byId = new Map(students.map((s) => [s.id, s]));
    for (const a of actions) {
      const status = z
        .enum(["not_started", "in_progress", "complete", "completed", "blocked"])
        .parse(a.status);
      if (!isActionItemComplete(status)) byId.get(a.student_id)!.open_action_items++;
    }
    for (const g of goals) byId.get(g.student_id)!.goal_count++;
    for (const n of notes) {
      const value = stamp.parse(n.created_at),
        s = byId.get(n.student_id)!;
      if (!s.last_note_at || Date.parse(value) > Date.parse(s.last_note_at)) s.last_note_at = value;
    }
    const latest = new Map<string, string>();
    for (const report of reports) {
      const date = stamp.parse(report.created_at);
      if (
        !latest.has(report.student_id) ||
        Date.parse(date) > Date.parse(latest.get(report.student_id)!)
      ) {
        latest.set(report.student_id, date);
        byId.get(report.student_id)!.latest_report_id = report.id;
      }
    }
    for (const m of meetings) {
      const status = z.string().parse(m.status);
      if (status === "cancelled") continue;
      const date = stamp.parse(m.scheduled_at);
      if (Date.parse(date) < Date.parse(now)) throw Error();
      const s = byId.get(m.student_id)!;
      if (!s.next_meeting_at || Date.parse(date) < Date.parse(s.next_meeting_at)) {
        s.next_meeting_at = date;
        s.next_meeting_id = m.id;
        s.next_meeting_title = z.string().nullable().parse(m.title);
      }
    }
    await confirmCaseloadScope(scope);
    return { students };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
const actionSchema = recordSchema
  .extend({
    title: z.string(),
    description: z.string().nullable(),
    status: z.enum(["not_started", "in_progress", "complete", "completed", "blocked"]),
    category: z.enum(["family", "student", "teacher", "educator", "school", "team", "partner"]),
    priority: z.enum(["low", "medium", "high"]),
    due_date: z.string().nullable(),
    created_at: stamp,
    updated_at: stamp,
    assigned_to_user_id: z.string().uuid().nullable(),
  })
  .strip();
export async function readCaseloadActions(
  caller: unknown,
  actor: string,
  intent?: { expected_viewer_id?: string },
) {
  try {
    const scope = await readCaseloadScope(caller, actor, intent);
    const raw = await readCaseloadRows(
      scope,
      "action_items",
      "id, student_id, title, description, status, category, priority, due_date, created_at, updated_at, assigned_to_user_id",
      (q) => q.order("created_at", { ascending: false }),
    );
    const items = raw
      .map((r) => {
        const a = actionSchema.parse(r);
        return {
          ...normalizeActionRecord(a),
          student_name: fullName(scope.byId.get(a.student_id)!),
          can_update: scope.canEdit.get(a.student_id) === true || a.assigned_to_user_id === actor,
        };
      })
      .sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id),
      );
    await confirmCaseloadScope(scope);
    return { items };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
const noteSchema = recordSchema
  .extend({ content: z.string(), note_type: z.string(), visibility: z.string(), created_at: stamp })
  .strip();
export async function readCaseloadNotes(
  caller: unknown,
  actor: string,
  intent?: { expected_viewer_id?: string },
) {
  try {
    const scope = await readCaseloadScope(caller, actor, intent);
    const raw = await readCaseloadRows(
      scope,
      "collaboration_notes",
      "id, student_id, content, note_type, visibility, created_at",
      (q) => q.order("created_at", { ascending: false }),
    );
    const notes = raw
      .map((r) => {
        const n = noteSchema.parse(r);
        return { ...n, student_name: fullName(scope.byId.get(n.student_id)!) };
      })
      .sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id),
      );
    await confirmCaseloadScope(scope);
    return { notes };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
export async function readCaseloadReadiness(
  caller: unknown,
  actor: string,
  intent?: { expected_viewer_id?: string },
) {
  try {
    const scope = await readCaseloadScope(caller, actor, intent);
    const raw = await readCaseloadRows(
      scope,
      "readiness_scores",
      "id, student_id, category, score, updated_at",
      (q) => q.order("updated_at", { ascending: false }),
    );
    const scores = raw
      .map((r) =>
        recordSchema
          .extend({ category: z.string(), score: z.number().min(0).max(100), updated_at: stamp })
          .parse(r),
      )
      .sort(
        (a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at) || a.id.localeCompare(b.id),
      );
    const bucket = new Map<string, number>();
    for (const s of scores) {
      const key = s.student_id + ":" + s.category;
      if (!bucket.has(key)) bucket.set(key, s.score);
    }
    const rows = scope.students
      .map((s) => {
        const values = ["employment", "education", "independent_living", "self_advocacy"].map(
          (k) => [k, bucket.get(s.id + ":" + k) ?? null] as const,
        );
        const scored = values.filter(
          (v): v is readonly [string, number] => typeof v[1] === "number",
        );
        return {
          student_id: s.id,
          student_name: fullName(s),
          employment: values[0][1],
          education: values[1][1],
          independent_living: values[2][1],
          self_advocacy: values[3][1],
          overall: scored.length
            ? Math.round(scored.reduce((n, s) => n + s[1], 0) / scored.length)
            : null,
          gap_pillar: scored.length ? scored.reduce((a, b) => (a[1] <= b[1] ? a : b))[0] : null,
        };
      })
      .sort(
        (a, b) =>
          (a.overall ?? Infinity) - (b.overall ?? Infinity) ||
          a.student_id.localeCompare(b.student_id),
      );
    await confirmCaseloadScope(scope);
    return { rows };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}

export async function readStudentPlanningNotes(
  caller: unknown,
  actor: string,
  intent: { student_id: string; expected_viewer_id?: string },
) {
  assertExpectedViewer(intent ?? {}, actor);
  const client = caller as Client;
  try {
    const canEdit = await studentCapability(client, actor, intent.student_id);
    const rows = await readReportPages<unknown>((from, to) =>
      client
        .from("collaboration_notes")
        .select("id, student_id, content, note_type, visibility, created_at, created_by_user_id", {
          count: "exact",
        })
        .eq("student_id", intent.student_id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    const notes = rows.map((r) =>
      noteSchema.extend({ created_by_user_id: z.string().uuid() }).parse(r),
    );
    if (
      new Set(notes.map((n) => n.id)).size !== notes.length ||
      notes.some((n) => n.student_id !== intent.student_id)
    )
      throw Error();
    if ((await studentCapability(client, actor, intent.student_id)) !== canEdit) throw Error();
    return { notes, canEdit };
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
export async function readStudentProfile(
  caller: unknown,
  actor: string,
  intent: { id: string; expected_viewer_id?: string },
) {
  assertExpectedViewer(intent ?? {}, actor);
  const client = caller as Client;
  try {
    await studentCapability(client, actor, intent.id);
    const result = await client.from("students").select("*").eq("id", intent.id).maybeSingle();
    if (result.error !== null) throw Error();
    const student = studentSchema
      .extend({
        student_user_id: z.string().uuid().nullable(),
        date_of_birth: z.string().nullable(),
        notes: z.string().nullable(),
        created_at: stamp,
        updated_at: stamp,
      })
      .passthrough()
      .parse(result.data);
    if (student.id !== intent.id) throw Error();
    await studentCapability(client, actor, intent.id);
    return student;
  } catch {
    throw Error(CASELOAD_UNAVAILABLE);
  }
}
