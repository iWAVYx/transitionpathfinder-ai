import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/lib/planning-record-write.server", () => ({ updateGoalStatusAtomically: api.mutate }));
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
import { updateGoalStatus } from "../../src/lib/students.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { userId: id(1), supabase: {} };
const intent = {
  id: id(2),
  student_id: id(3),
  expected_updated_at: "2026-11-21T10:00:00.000001Z",
  expected_viewer_id: id(1),
  status: "met",
};
beforeEach(() => {
  vi.clearAllMocks();
  api.mutate.mockResolvedValue(intent);
});
it.each(["student_id", "expected_updated_at"])(
  "rejects omitted %s before database access",
  async (field) => {
    const data: any = { ...intent };
    delete data[field];
    await expect((updateGoalStatus as any)({ data, context })).rejects.toThrow();
    expect(api.mutate).not.toHaveBeenCalled();
  },
);
it.each(["not-started", "in-progress", "met", "paused"])(
  "preserves loaded identity and revision for %s",
  async (status) => {
    const data = { ...intent, status };
    await expect((updateGoalStatus as any)({ data, context })).resolves.toMatchObject({ ok: true });
    expect(api.mutate).toHaveBeenCalledExactlyOnceWith(context.supabase, context.userId, data);
  },
);
it("does not turn an uncertain save into success or retry it", async () => {
  api.mutate.mockRejectedValue(Error("Unconfirmed"));
  await expect((updateGoalStatus as any)({ data: intent, context })).rejects.toThrow("Unconfirmed");
  expect(api.mutate).toHaveBeenCalledOnce();
});
