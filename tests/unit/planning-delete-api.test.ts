import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock("@/lib/planning-record-delete.server", () => ({
  deletePlanningRecordAtomically: api.remove,
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
import { deleteGoal } from "../../src/lib/students.functions";
import { deleteStudentActionItem } from "../../src/lib/action-items.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  actor = id(1),
  student = id(2),
  record = id(3),
  version = "2026-11-20T10:00:00.000001Z",
  intent = {
    id: record,
    student_id: student,
    expected_updated_at: version,
    expected_viewer_id: actor,
  };
beforeEach(() => {
  vi.clearAllMocks();
  api.remove.mockResolvedValue({ ok: true });
});
for (const [kind, fn] of [
  ["goals", deleteGoal],
  ["action_items", deleteStudentActionItem],
] as const) {
  it(kind + " delegates one current loaded deletion without raw writes", async () => {
    const context = { userId: actor, supabase: { from: vi.fn() } };
    await expect((fn as any)({ data: intent, context })).resolves.toEqual({ ok: true });
    expect(api.remove).toHaveBeenCalledWith(context.supabase, actor, kind, intent);
    expect(context.supabase.from).not.toHaveBeenCalled();
  });
  for (const field of ["student_id", "expected_updated_at"])
    it(kind + " rejects an old request without " + field + " before IO", async () => {
      const data: any = { ...intent };
      delete data[field];
      await expect(
        (fn as any)({ data, context: { userId: actor, supabase: {} } }),
      ).rejects.toThrow();
      expect(api.remove).not.toHaveBeenCalled();
    });
  it(kind + " never reports success from an unconfirmed delete", async () => {
    api.remove.mockRejectedValue(Error("Unconfirmed"));
    await expect(
      (fn as any)({ data: intent, context: { userId: actor, supabase: {} } }),
    ).rejects.toThrow("Unconfirmed");
    expect(api.remove).toHaveBeenCalledOnce();
  });
}
