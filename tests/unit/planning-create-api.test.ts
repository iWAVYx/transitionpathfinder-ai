import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/planning-record-write.server", () => ({
  createPlanningRecordAtomically: api.create,
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
import { createGoal } from "../../src/lib/students.functions";
import { createStudentActionItem } from "../../src/lib/action-items.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { userId: id(1), supabase: { from: vi.fn() } },
  data = { student_id: id(2), request_id: id(3), expected_viewer_id: id(1), title: "  New goal  " };
beforeEach(() => {
  vi.clearAllMocks();
  api.create.mockResolvedValue({ id: id(3) });
});
for (const [kind, fn] of [
  ["goals", createGoal],
  ["action_items", createStudentActionItem],
] as const) {
  it(kind + " uses atomic creation with normalized title and caller identity", async () => {
    await (fn as any)({ data, context });
    expect(api.create).toHaveBeenCalledExactlyOnceWith(
      context.supabase,
      context.userId,
      kind,
      expect.objectContaining({
        ...data,
        title: "New goal",
        description: null,
        category: kind === "goals" ? "general" : "family",
        status: kind === "goals" ? "not-started" : "not_started",
      }),
    );
    expect(context.supabase.from).not.toHaveBeenCalled();
  });
  it(kind + " rejects missing student before database work", async () => {
    await expect(
      (fn as any)({ data: { ...data, student_id: undefined }, context }),
    ).rejects.toThrow();
    expect(api.create).not.toHaveBeenCalled();
  });
  it(kind + " cannot replace actual creator/assignee/identity through extra fields", async () => {
    await (fn as any)({
      data: {
        ...data,
        id: id(8),
        created_by: id(8),
        created_by_user_id: id(8),
        assigned_to_user_id: id(8),
      },
      context,
    });
    const sent = api.create.mock.calls[0][3];
    for (const key of ["id", "created_by", "created_by_user_id", "assigned_to_user_id"])
      expect(sent).not.toHaveProperty(key);
  });
  it(kind + " propagates uncertainty without repeat", async () => {
    api.create.mockRejectedValue(Error("Unconfirmed"));
    await expect((fn as any)({ data, context })).rejects.toThrow("Unconfirmed");
    expect(api.create).toHaveBeenCalledOnce();
  });
}
