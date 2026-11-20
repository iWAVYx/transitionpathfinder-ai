import { expect, it, vi } from "vitest";
import {
  readPlanningRecords,
  createPlanningRecord,
  mutatePlanningRecord,
  PLANNING_READ_UNAVAILABLE,
  PLANNING_WRITE_UNCONFIRMED,
} from "../../src/lib/planning-records.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  actor = id(1),
  student = id(2),
  record = id(3),
  version = "2026-11-19T12:00:00.000001Z";
const row = (extra: any = {}) => ({
  id: record,
  student_id: student,
  title: "Fictional next step",
  category: "family",
  status: "not_started",
  updated_at: version,
  assigned_to_user_id: null,
  pathway_report_id: null,
  ...extra,
});
function fixture({
  before = row(),
  saved = row({ status: "completed" }),
  error = null,
  readRows = [row()],
  count = readRows?.length ?? null,
  permission = true,
  edit = true,
  partner = false,
  linked = { id: id(8), student_id: student },
}: any = {}) {
  const queries: any[] = [];
  const from = vi.fn((table: string) => {
    const q: any = {
      table,
      mode: "read",
      then: (resolve: any, reject: any) =>
        Promise.resolve({ data: readRows, error, count }).then(resolve, reject),
    };
    for (const name of ["select", "eq", "order"]) q[name] = vi.fn(() => q);
    for (const name of ["insert", "update", "delete"])
      q[name] = vi.fn(() => {
        q.mode = name;
        return q;
      });
    q.range = vi.fn(async () => ({ data: readRows, error, count }));
    q.maybeSingle = vi.fn(async () => ({
      data: table === "pathway_reports" ? linked : before,
      error,
    }));
    q.single = vi.fn(async () => ({ data: saved, error }));
    queries.push(q);
    return q;
  });
  const rpc = vi.fn(async (name: string) => ({
    data: name === "is_partner_only" ? partner : name === "can_edit_student" ? edit : permission,
    error: null,
  }));
  return { from, rpc, queries };
}
const intent = {
  id: record,
  student_id: student,
  expected_updated_at: version,
  expected_viewer_id: actor,
};
it.each(["goals", "action_items"] as const)(
  "rejects departed %s intent before all IO",
  async (table) => {
    const f = fixture();
    await expect(
      mutatePlanningRecord(
        f,
        actor,
        table,
        { ...intent, expected_viewer_id: id(9) },
        { status: "completed" },
      ),
    ).rejects.toThrow("sign-in changed");
    expect(f.from).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  },
);
it.each([
  null,
  {},
  row({ id: id(9) }),
  row({ student_id: id(9) }),
  row({ updated_at: "2026-11-19T12:00:01Z" }),
])("refuses absent/foreign/stale loaded record before mutation %#", async (before) => {
  const f = fixture({ before });
  await expect(
    mutatePlanningRecord(f, actor, "action_items", intent, { status: "completed" }),
  ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
  expect(f.queries.some((q) => q.mode === "update" || q.mode === "delete")).toBe(false);
});
it.each([
  { permission: false },
  { permission: null },
  { permission: "true" },
  { partner: true },
  { partner: "false" },
  { edit: false },
])("requires literal current student/edit proof: %j", async (options) => {
  const f = fixture(options);
  await expect(mutatePlanningRecord(f, actor, "goals", intent, { status: "met" })).rejects.toThrow(
    PLANNING_WRITE_UNCONFIRMED,
  );
  expect(f.queries.some((q) => q.mode === "update")).toBe(false);
});
it("preserves an assignee update only with current student read access", async () => {
  const f = fixture({ before: row({ assigned_to_user_id: actor }), edit: false });
  await expect(
    mutatePlanningRecord(f, actor, "action_items", intent, { status: "completed" }),
  ).resolves.toMatchObject({ changed: true });
  const denied = fixture({
    before: row({ assigned_to_user_id: actor }),
    edit: false,
    permission: false,
  });
  await expect(
    mutatePlanningRecord(denied, actor, "action_items", intent, { status: "completed" }),
  ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
});
it.each([null, {}, row({ id: id(9) }), row({ student_id: id(9) }), row({ status: "not_started" })])(
  "never confirms zero-row or mismatched update receipt %#",
  async (saved) => {
    const f = fixture({ saved });
    await expect(
      mutatePlanningRecord(f, actor, "action_items", intent, { status: "completed" }),
    ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
    expect(f.queries.filter((q) => q.mode === "update")).toHaveLength(1);
  },
);
it("uses exact id/student/loaded timestamp conditions and the confirmed returned row", async () => {
  const f = fixture();
  const result = await mutatePlanningRecord(f, actor, "action_items", intent, {
    status: "completed",
  });
  expect(result.row.status).toBe("completed");
  const q = f.queries.find((q) => q.mode === "update");
  expect(q.eq.mock.calls).toEqual([
    ["id", record],
    ["student_id", student],
    ["updated_at", version],
  ]);
  expect(q.single).toHaveBeenCalledOnce();
});
it("does not repeat writes or completion effects for a genuine no-op", async () => {
  const f = fixture({ before: row({ status: "completed" }) });
  expect(
    await mutatePlanningRecord(f, actor, "action_items", intent, { status: "completed" }),
  ).toMatchObject({ changed: false });
  expect(f.queries.some((q) => q.mode === "update")).toBe(false);
});
it.each([null, row({ id: id(9) }), row({ updated_at: "2026-11-19T12:00:01Z" })])(
  "does not confirm an absent/mismatched deletion %#",
  async (saved) => {
    await expect(
      mutatePlanningRecord(fixture({ saved }), actor, "goals", intent, null),
    ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
  },
);
it("deletion returns only after an identical removed-row receipt", async () => {
  const f = fixture({ saved: row() });
  await expect(mutatePlanningRecord(f, actor, "goals", intent, null)).resolves.toMatchObject({
    row: { id: record },
    changed: true,
  });
  expect(f.queries.find((q) => q.mode === "delete").eq.mock.calls).toContainEqual([
    "updated_at",
    version,
  ]);
});
it("refuses a different linked student report before mutating any action", async () => {
  const f = fixture({
    before: row({ pathway_report_id: id(8) }),
    linked: { id: id(8), student_id: id(9) },
  });
  await expect(
    mutatePlanningRecord(f, actor, "action_items", intent, { status: "completed" }),
  ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
  expect(f.queries.some((q) => q.mode === "update")).toBe(false);
});
it.each([null, {}, row({ student_id: id(9) })])(
  "does not call an unconfirmed creation successful %#",
  async (saved) => {
    const f = fixture({ saved });
    await expect(
      createPlanningRecord(f, actor, "action_items", {
        student_id: student,
        request_id: record,
        title: "Fictional next step",
        status: "not_started",
        category: "family",
      }),
    ).rejects.toThrow(PLANNING_WRITE_UNCONFIRMED);
  },
);
it("confirms every supplied creation field and actual actor attribution", async () => {
  const saved = row({ created_by_user_id: actor });
  const f = fixture({ saved });
  await expect(
    createPlanningRecord(f, actor, "action_items", {
      student_id: student,
      request_id: record,
      title: saved.title,
      status: saved.status,
      category: saved.category,
    }),
  ).resolves.toMatchObject({ id: record });
  expect(f.queries[0].insert.mock.calls[0][0]).toMatchObject({
    id: record,
    student_id: student,
    created_by_user_id: actor,
  });
});
it.each([
  { error: { message: "PRIVATE failure" } },
  { readRows: null },
  { count: null },
  { readRows: [row({ student_id: id(9) })] },
  { readRows: [row(), row()], count: 2 },
])("does not label unreadable/partial/foreign records as empty %#", async (options) => {
  const f = fixture(options);
  await expect(
    readPlanningRecords(f, actor, "action_items", { student_id: student }),
  ).rejects.toThrow(PLANNING_READ_UNAVAILABLE);
});
it("normalizes legacy action values at the read boundary without modifying stored rows", async () => {
  const legacy = row({ status: "complete", category: "teacher" }),
    f = fixture({ readRows: [legacy] });
  const result = await readPlanningRecords(f, actor, "action_items", { student_id: student });
  expect(result.records[0]).toMatchObject({ status: "completed", category: "educator" });
  expect(legacy).toMatchObject({ status: "complete", category: "teacher" });
  expect(f.queries.every((q) => q.mode === "read")).toBe(true);
});
it("retains both completion forms and complete page counts beyond one REST page", async () => {
  const rows = Array.from({ length: 1205 }, (_, n) =>
    row({ id: id(n + 100), status: n % 2 ? "complete" : "completed" }),
  );
  const f = fixture();
  f.from.mockImplementation((table: string) => {
    const q: any = { mode: "read" };
    for (const name of ["select", "eq", "order"]) q[name] = vi.fn(() => q);
    q.range = vi.fn(async (from: number, to: number) => ({
      data: rows.slice(from, to + 1),
      error: null,
      count: rows.length,
    }));
    f.queries.push(q);
    return q;
  });
  const result = await readPlanningRecords(f, actor, "action_items", { student_id: student });
  expect(result.records).toHaveLength(1205);
  expect(result.records.every((r) => r.status === "completed")).toBe(true);
});
