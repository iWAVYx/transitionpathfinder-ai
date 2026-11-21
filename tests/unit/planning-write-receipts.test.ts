import { expect, it, vi } from "vitest";
import {
  createPlanningRecordAtomically,
  updateGoalStatusAtomically,
} from "../../src/lib/planning-record-write.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor = id(1),
  student = id(2),
  record = id(3),
  version = "2026-11-21T10:00:00.000001Z",
  next = "2026-11-21T10:00:00.000002Z";
const base = {
  id: record,
  student_id: student,
  title: "Fictional plan",
  category: "general",
  status: "not-started",
  created_at: version,
  updated_at: version,
};
const intent = {
  id: record,
  student_id: student,
  expected_updated_at: version,
  expected_viewer_id: actor,
  status: "met",
};
const input = {
  student_id: student,
  request_id: record,
  expected_viewer_id: actor,
  title: base.title,
};
const create = (kind: string) => ({
  schema: "planning-record-create-v1",
  kind,
  actor_id: actor,
  student_id: student,
  record_id: record,
  row: {
    ...base,
    ...(kind === "goals"
      ? { created_by: actor, description: null, target_date: null, measurable_criteria: null }
      : {
          created_by_user_id: actor,
          assigned_to_user_id: null,
          description: null,
          status: "not_started",
          category: "family",
          priority: "medium",
          due_date: null,
          related_goal_area: null,
          pathway_report_id: null,
        }),
  },
});
const update = () => ({
  schema: "goal-status-update-v1",
  actor_id: actor,
  student_id: student,
  goal_id: record,
  expected_updated_at: version,
  previous_status: "not-started",
  changed: true,
  row: { ...base, status: "met", updated_at: next },
});
const client = (data: unknown, error: unknown = null) => ({
  rpc: vi.fn().mockResolvedValue({ data, error }),
  from: vi.fn(),
});
for (const kind of ["goals", "action_items"] as const) {
  it(kind + " uses exactly one authenticated RPC and validates all default fields", async () => {
    const c = client(create(kind));
    await expect(createPlanningRecordAtomically(c, actor, kind, input)).resolves.toMatchObject({
      id: record,
    });
    expect(c.rpc).toHaveBeenCalledExactlyOnceWith("create_student_planning_record", {
      _kind: kind,
      _student_id: student,
      _expected_viewer_id: actor,
      _record_id: record,
      _fields: { title: base.title },
    });
    expect(c.from).not.toHaveBeenCalled();
  });
  for (const alter of [
    (v: any) => null,
    (v: any) => ({ ...v, actor_id: id(9) }),
    (v: any) => ({ ...v, kind: "other" }),
    (v: any) => ({ ...v, record_id: id(9) }),
    (v: any) => ({ ...v, student_id: id(9) }),
    (v: any) => ({ ...v, extra: true }),
    (v: any) => ({ ...v, row: { ...v.row, id: id(9) } }),
    (v: any) => ({ ...v, row: { ...v.row, student_id: id(9) } }),
    (v: any) => ({ ...v, row: { ...v.row, title: "Substituted" } }),
    (v: any) => ({ ...v, row: { ...v.row, created_by: id(9), created_by_user_id: id(9) } }),
    (v: any) => ({ ...v, row: { ...v.row, category: "wrong" } }),
    (v: any) => ({ ...v, row: { ...v.row, updated_at: "invalid" } }),
  ])
    it(kind + " rejects unconfirmed creation receipt " + alter.toString(), async () => {
      const c = client(alter(create(kind)));
      await expect(createPlanningRecordAtomically(c, actor, kind, input)).rejects.toThrow(
        "couldn't confirm",
      );
      expect(c.rpc).toHaveBeenCalledOnce();
      expect(c.from).not.toHaveBeenCalled();
    });
  it(kind + " refuses a departed account before all IO", async () => {
    const c = client(create(kind));
    await expect(
      createPlanningRecordAtomically(c, actor, kind, { ...input, expected_viewer_id: id(9) }),
    ).rejects.toThrow("sign-in changed");
    expect(c.rpc).not.toHaveBeenCalled();
  });
  it(kind + " preserves uncertain transport failures without retry", async () => {
    const c = client(create(kind), {});
    await expect(createPlanningRecordAtomically(c, actor, kind, input)).rejects.toThrow(
      "couldn't confirm",
    );
    expect(c.rpc).toHaveBeenCalledOnce();
  });
}
it("rejects unexpected action assignment in creation receipt", async () => {
  const v = create("action_items");
  (v.row as any).assigned_to_user_id = id(9);
  await expect(
    createPlanningRecordAtomically(client(v), actor, "action_items", input),
  ).rejects.toThrow("couldn't confirm");
});
it("validates linked report and optional action fields", async () => {
  const v = create("action_items"),
    fields = {
      pathway_report_id: id(7),
      due_date: "2026-12-01",
      related_goal_area: "Career",
      description: "Practice",
      priority: "high",
    };
  Object.assign(v.row, fields);
  await expect(
    createPlanningRecordAtomically(client(v), actor, "action_items", { ...input, ...fields }),
  ).resolves.toMatchObject(fields);
  await expect(
    createPlanningRecordAtomically(client(create("action_items")), actor, "action_items", {
      ...input,
      ...fields,
    }),
  ).rejects.toThrow();
});
it("status uses one RPC and requires exact newer microsecond revision", async () => {
  const c = client(update());
  await expect(updateGoalStatusAtomically(c, actor, intent)).resolves.toMatchObject({
    status: "met",
    updated_at: next,
  });
  expect(c.rpc).toHaveBeenCalledExactlyOnceWith("update_student_goal_status", {
    _student_id: student,
    _expected_viewer_id: actor,
    _goal_id: record,
    _expected_updated_at: version,
    _status: "met",
  });
  expect(c.from).not.toHaveBeenCalled();
});
for (const alter of [
  (v: any) => null,
  (v: any) => ({ ...v, actor_id: id(9) }),
  (v: any) => ({ ...v, student_id: id(9) }),
  (v: any) => ({ ...v, goal_id: id(9) }),
  (v: any) => ({ ...v, expected_updated_at: next }),
  (v: any) => ({ ...v, changed: false }),
  (v: any) => ({ ...v, previous_status: "met" }),
  (v: any) => ({ ...v, row: { ...v.row, id: id(9) } }),
  (v: any) => ({ ...v, row: { ...v.row, student_id: id(9) } }),
  (v: any) => ({ ...v, row: { ...v.row, status: "paused" } }),
  (v: any) => ({ ...v, row: { ...v.row, updated_at: version } }),
  (v: any) => ({ ...v, row: { ...v.row, updated_at: "2026-11-21T10:00:00.0000021Z" } }),
])
  it("status rejects unconfirmed receipt " + alter.toString(), async () => {
    const c = client(alter(update()));
    await expect(updateGoalStatusAtomically(c, actor, intent)).rejects.toThrow("couldn't confirm");
    expect(c.rpc).toHaveBeenCalledOnce();
  });
it("genuine no-op must retain its exact version", async () => {
  const v = update();
  Object.assign(v, { previous_status: "met", changed: false });
  v.row.updated_at = version;
  await expect(updateGoalStatusAtomically(client(v), actor, intent)).resolves.toMatchObject({
    updated_at: version,
  });
  v.row.updated_at = next;
  await expect(updateGoalStatusAtomically(client(v), actor, intent)).rejects.toThrow();
});
it("equivalent timezone representation preserves microseconds", async () => {
  const v = update();
  v.expected_updated_at = "2026-11-21T05:00:00.000001-05:00";
  v.row.updated_at = "2026-11-21T05:00:00.000002-05:00";
  await expect(updateGoalStatusAtomically(client(v), actor, intent)).resolves.toMatchObject({
    status: "met",
  });
});
it("status refuses departed actor before IO", async () => {
  const c = client(update());
  await expect(
    updateGoalStatusAtomically(c, actor, { ...intent, expected_viewer_id: id(9) }),
  ).rejects.toThrow("sign-in changed");
  expect(c.rpc).not.toHaveBeenCalled();
});
