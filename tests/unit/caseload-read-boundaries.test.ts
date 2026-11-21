import { expect, it, vi } from "vitest";
import {
  readCaseloadOverview,
  readCaseloadActions,
  readCaseloadNotes,
  readCaseloadReadiness,
  readStudentPlanningNotes,
  readStudentProfile,
  studentCapability,
} from "../../src/lib/caseload-records.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1),
  student = id(2),
  other = id(3),
  date = "2026-11-21T10:00:00.000001Z";
const profile = (sid = student) => ({
  id: sid,
  owner_id: actor,
  student_user_id: null,
  first_name: "Fictional Student",
  last_name: null,
  grade_band: "9-10",
  school: null,
  photo_url: null,
  date_of_birth: null,
  notes: null,
  created_at: date,
  updated_at: date,
});
const action = (n = 10, sid = student) => ({
  id: id(n),
  student_id: sid,
  title: "Practice",
  description: null,
  status: "not_started",
  category: "teacher",
  priority: "medium",
  due_date: null,
  created_at: date,
  updated_at: date,
  assigned_to_user_id: null,
});
const note = (n = 20, sid = student) => ({
  id: id(n),
  student_id: sid,
  content: "Fictional observation",
  note_type: "teacher_note",
  visibility: "team",
  created_at: date,
  created_by_user_id: actor,
});
function database(tables: Record<string, any[]> = {}, opts: any = {}) {
  const data: Record<string, any[]> = {
    students: [profile()],
    action_items: [],
    goals: [],
    collaboration_notes: [],
    pathway_reports: [],
    meetings: [],
    readiness_scores: [],
    ...tables,
  };
  const queries: any[] = [];
  let access = 0;
  const client = {
    rpc: vi.fn(async (name: string, args: any) => {
      if (name === "can_access_student") access++;
      return {
        data:
          name === "is_partner_only"
            ? (opts.partner ?? false)
            : name === "can_edit_student"
              ? (opts.edit ?? true)
              : opts.removed && access > data.students.length
                ? false
                : (opts.read ?? true),
        error: opts.rpcError ?? null,
      };
    }),
    from: vi.fn((table: string) => {
      const state: any = { table, filters: [], order: [] };
      queries.push(state);
      const q: any = {};
      q.select = vi.fn((fields: string, count: any) => {
        state.fields = fields;
        state.counted = count?.count === "exact";
        return q;
      });
      q.order = vi.fn((field: string, option: any) => {
        state.order.push([field, option?.ascending !== false]);
        return q;
      });
      q.eq = vi.fn((field: string, value: any) => {
        state.filters.push([field, value, false]);
        return q;
      });
      q.in = vi.fn((field: string, value: any) => {
        state.filters.push([field, value, true]);
        return q;
      });
      q.gte = vi.fn(() => q);
      const rows = () => {
        let items = (data[table] ?? []).filter((row) =>
          state.filters.every(([f, v, m]: any) => (m ? v.includes(row[f]) : v === row[f])),
        );
        for (const [field, asc] of [...state.order].reverse())
          items = [...items].sort(
            (a, b) => String(a[field]).localeCompare(String(b[field])) * (asc ? 1 : -1),
          );
        return items;
      };
      q.range = vi.fn(async (from: number, to: number) => {
        state.range = [from, to];
        const items = rows();
        return {
          data:
            opts.foreign && table === "action_items"
              ? [action(999, other)]
              : opts.duplicate && table === "action_items"
                ? [action(), action()]
                : items.slice(from, Math.min(to + 1, from + (opts.shortPage ?? 500))),
          count: opts.missingCount
            ? null
            : opts.duplicate && table === "action_items"
              ? 2
              : items.length + (opts.drift && from > 0 ? 1 : 0),
          error: opts.fail === table ? {} : null,
        };
      });
      q.maybeSingle = vi.fn(async () => ({
        data: opts.wrongProfile ? profile(other) : (rows()[0] ?? null),
        error: opts.fail === table ? {} : null,
      }));
      for (const method of ["insert", "update", "delete", "upsert"])
        q[method] = vi.fn(() => {
          throw Error("Unexpected write");
        });
      return q;
    }),
  };
  return { client, queries, data };
}
it("caseload GET is read-only and includes explicit relationship/self-visible students", async () => {
  const db = database(
    { students: [profile(), { ...profile(other), owner_id: id(9) }] },
    { edit: false },
  );
  const result = await readCaseloadOverview(db.client, actor);
  expect(result.students.map((s) => s.relationship)).toEqual(["owner", "viewer"]);
  expect(db.queries.some((q) => q.table === "student_collaborators")).toBe(false);
  expect(result.students).toHaveLength(2);
});
it("complete short pages drive accurate goal/action totals and both completion aliases", async () => {
  const actions = Array.from({ length: 1203 }, (_, i) => ({
    ...action(i + 100),
    status: i < 3 ? "complete" : i < 7 ? "completed" : "in_progress",
  }));
  const db = database(
    {
      action_items: actions,
      goals: Array.from({ length: 1204 }, (_, i) => ({ id: id(i + 2000), student_id: student })),
    },
    { shortPage: 71 },
  );
  const result = await readCaseloadOverview(db.client, actor);
  expect(result.students[0]).toMatchObject({ open_action_items: 1196, goal_count: 1204 });
  expect(db.queries.filter((q) => q.table === "action_items").length).toBeGreaterThan(10);
  for (const q of db.queries) expect(q.counted).toBe(true);
});
it("large caseloads use bounded ID batches and stable complete action ordering", async () => {
  const students = Array.from({ length: 203 }, (_, i) => profile(id(i + 1000)));
  const actions = students.map((s, i) => action(i + 5000, s.id));
  const db = database({ students, action_items: actions }, { shortPage: 71 });
  const result = await readCaseloadActions(db.client, actor);
  expect(result.items).toHaveLength(203);
  for (const q of db.queries.filter((q) => q.table === "action_items"))
    expect(q.filters[0][1].length).toBeLessThanOrEqual(100);
});
for (const read of [
  readCaseloadOverview,
  readCaseloadActions,
  readCaseloadNotes,
  readCaseloadReadiness,
]) {
  it(read.name + " rejects departed intent before all IO", async () => {
    const db = database();
    await expect(read(db.client, actor, { expected_viewer_id: other })).rejects.toThrow();
    expect(db.client.from).not.toHaveBeenCalled();
    expect(db.client.rpc).not.toHaveBeenCalled();
  });
  for (const options of [
    { read: false },
    { read: "true" },
    { partner: true },
    { partner: "false" },
    { edit: "true" },
    { rpcError: {} },
    { removed: true },
    { fail: "students" },
    { missingCount: true },
  ])
    it(
      read.name + " refuses unavailable access or partial records " + JSON.stringify(options),
      async () => {
        const db = database({}, options);
        await expect(read(db.client, actor)).rejects.toThrow("couldn't load");
      },
    );
  it(read.name + " returns actual empty data only after successful reads", async () => {
    const db = database({ students: [] });
    const result = await read(db.client, actor);
    expect(Object.values(result)[0]).toEqual([]);
  });
}
for (const table of ["action_items", "goals", "collaboration_notes", "pathway_reports", "meetings"])
  it("overview refuses failed " + table + " rather than showing zero", async () => {
    const db = database({}, { fail: table });
    await expect(readCaseloadOverview(db.client, actor)).rejects.toThrow();
  });
it("duplicate student rows cannot fabricate a complete roster", async () => {
  const db = database({ students: [profile(), profile()] });
  await expect(readCaseloadOverview(db.client, actor)).rejects.toThrow();
});
for (const opts of [{ foreign: true }, { duplicate: true }, { drift: true }])
  it("actions refuse foreign/duplicate/changing pages " + JSON.stringify(opts), async () => {
    const db = database({ action_items: [action(), action(11)] }, { shortPage: 1, ...opts });
    await expect(readCaseloadActions(db.client, actor)).rejects.toThrow();
  });
it("actions expose current editing capability and normalize old labels without rewriting data", async () => {
  const a = action(),
    b = { ...action(11), assigned_to_user_id: actor, status: "complete" };
  const db = database({ action_items: [a, b] }, { edit: false });
  const result = await readCaseloadActions(db.client, actor);
  expect(result.items.map((i) => i.can_update)).toEqual([false, true]);
  expect(result.items[0].category).toBe("educator");
  expect(result.items[1].status).toBe("completed");
  expect(a.category).toBe("teacher");
});
it("readiness uses newest dated score, not whichever row arrives last", async () => {
  const db = database(
    {
      readiness_scores: [
        { id: id(10), student_id: student, category: "employment", score: 70, updated_at: date },
        {
          id: id(11),
          student_id: student,
          category: "employment",
          score: 10,
          updated_at: "2025-01-01T00:00:00Z",
        },
        { id: id(12), student_id: student, category: "education", score: 40, updated_at: date },
      ],
    },
    { shortPage: 1 },
  );
  const { rows } = await readCaseloadReadiness(db.client, actor);
  expect(rows[0]).toMatchObject({
    employment: 70,
    education: 40,
    overall: 55,
    gap_pillar: "education",
    independent_living: null,
  });
});
it("overview picks actual newest timestamps across offsets and excludes cancelled meetings", async () => {
  const db = database({
    collaboration_notes: [
      { ...note(), created_at: "2026-11-21T08:00:00-05:00" },
      { ...note(21), created_at: "2026-11-21T12:00:00Z" },
    ],
    pathway_reports: [
      { id: id(40), student_id: student, created_at: "2026-11-21T08:00:00-05:00" },
      { id: id(41), student_id: student, created_at: "2026-11-21T12:00:00Z" },
    ],
    meetings: [
      {
        id: id(50),
        student_id: student,
        title: "Cancelled",
        status: "cancelled",
        scheduled_at: "2099-01-01T00:00:00Z",
      },
      {
        id: id(51),
        student_id: student,
        title: "Next",
        status: "scheduled",
        scheduled_at: "2099-01-02T00:00:00Z",
      },
    ],
  });
  expect((await readCaseloadOverview(db.client, actor)).students[0]).toMatchObject({
    last_note_at: "2026-11-21T08:00:00-05:00",
    latest_report_id: id(40),
    next_meeting_id: id(51),
  });
});
it("caseload and student notes have no silent 100/50-row truncation", async () => {
  const notes = Array.from({ length: 603 }, (_, i) => note(i + 100));
  const db = database({ collaboration_notes: notes }, { shortPage: 71 });
  expect((await readCaseloadNotes(db.client, actor)).notes).toHaveLength(603);
  expect(
    (await readStudentPlanningNotes(db.client, actor, { student_id: student })).notes,
  ).toHaveLength(603);
});
for (const options of [
  { removed: true },
  { wrongProfile: true },
  { fail: "students" },
  { partner: true },
])
  it(
    "student detail rejects foreign/unavailable/removed proof " + JSON.stringify(options),
    async () => {
      const db = database({}, options);
      await expect(readStudentProfile(db.client, actor, { id: student })).rejects.toThrow();
    },
  );
it("student detail validates exact identity and legitimate read-only capability", async () => {
  const db = database({}, { edit: false });
  expect(await readStudentProfile(db.client, actor, { id: student })).toEqual(profile());
  expect(await studentCapability(db.client, actor, student)).toBe(false);
});
