import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/lib/planning-records.server", () => ({
  mutatePlanningRecord: api.mutate,
  PLANNING_WRITE_UNCONFIRMED: "Refresh saved records",
  readPlanningRecords: vi.fn(),
  createPlanningRecord: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b: any = {
      middleware: () => b,
      validator: (fn: any) => {
        parse = fn;
        return b;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { updateStudentActionItem } from "../../src/lib/action-items.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  student = id(2),
  item = id(3),
  report = id(4);
function context({ eventError = false, reportError = false }: any = {}) {
  const from = vi.fn((table: string) => {
    const q: any = {};
    for (const m of ["insert", "update", "eq", "select"]) q[m] = vi.fn(() => q);
    q.single = vi.fn(async () =>
      table === "feed_events"
        ? {
            data: eventError ? null : { id: id(9), student_id: student, ref_id: item },
            error: eventError ? {} : null,
          }
        : {
            data: reportError ? null : { id: report, student_id: student },
            error: reportError ? {} : null,
          },
    );
    return q;
  });
  return { userId: id(1), supabase: { from } };
}
const run = (ctx: any, status = "completed") =>
  (updateStudentActionItem as any)({ data: { id: item, status }, context: ctx });
beforeEach(() => {
  vi.clearAllMocks();
  api.mutate.mockResolvedValue({
    changed: true,
    before: { status: "not_started" },
    row: {
      id: item,
      student_id: student,
      title: "Fictional action",
      category: "team",
      status: "completed",
      pathway_report_id: report,
    },
  });
});
it("never emits completion effects after an unconfirmed update", async () => {
  api.mutate.mockRejectedValue(Error("Unconfirmed"));
  const c = context();
  await expect(run(c)).rejects.toThrow();
  expect(c.supabase.from).not.toHaveBeenCalled();
});
it.each([
  { changed: false, before: { status: "completed" } },
  { changed: true, before: { status: "complete" } },
  { changed: true, before: { status: "completed" } },
])("does not duplicate completion events for existing completion %#", async (extra) => {
  api.mutate.mockResolvedValue({
    ...extra,
    row: { id: item, student_id: student, category: "team", status: "completed" },
  });
  const c = context();
  await run(c);
  expect(c.supabase.from).not.toHaveBeenCalled();
});
it("emits one verified event and scopes report stale marking to the same student", async () => {
  const c = context();
  await run(c);
  expect(c.supabase.from.mock.calls.map(([table]) => table)).toEqual([
    "feed_events",
    "pathway_reports",
  ]);
  const q = c.supabase.from.mock.results[1].value;
  expect(q.eq.mock.calls).toContainEqual(["student_id", student]);
});
it.each([{ eventError: true }, { reportError: true }])(
  "does not report success from partial/unconfirmed completion effects %j",
  async (options) => {
    const c = context(options);
    await expect(run(c)).rejects.toThrow("Refresh saved records");
    expect(api.mutate).toHaveBeenCalledOnce();
  },
);
