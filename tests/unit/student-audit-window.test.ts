import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: any) => data;
    const chain: any = {
      middleware: () => chain,
      validator: (fn: any) => {
        validate = fn;
        return chain;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { listStudentAuditTrail } from "@/lib/audit.functions";
it("recent audit reads keep the caller student filter, limit and deterministic timestamp/id order", async () => {
  const q: any = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const from = vi.fn(() => q);
  const student = "10000000-0000-4000-8000-000000000001";
  await (listStudentAuditTrail as any)({
    data: { student_id: student, limit: 200 },
    context: { supabase: { from } },
  });
  expect(from).toHaveBeenCalledExactlyOnceWith("audit_log");
  expect(q.eq).toHaveBeenCalledExactlyOnceWith("student_id", student);
  expect(q.order.mock.calls).toEqual([
    ["created_at", { ascending: false }],
    ["id", { ascending: false }],
  ]);
  expect(q.limit).toHaveBeenCalledExactlyOnceWith(200);
});
it("invalid or excessive audit windows fail validation before queries", async () => {
  const from = vi.fn();
  await expect(
    (listStudentAuditTrail as any)({
      data: { student_id: "10000000-0000-4000-8000-000000000001", limit: 201 },
      context: { supabase: { from } },
    }),
  ).rejects.toThrow();
  expect(from).not.toHaveBeenCalled();
});
