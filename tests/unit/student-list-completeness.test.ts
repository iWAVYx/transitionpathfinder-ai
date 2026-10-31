import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: any) => x;
    const b: any = {
      middleware: () => b,
      validator: (fn: any) => {
        validate = fn;
        return b;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { listStudents, ensureOwnStudentProfile } from "@/lib/students.functions";
import { getProfile, getMyRoles } from "@/lib/profile.functions";
import { getDashboardSnapshot, seedDemoStudent } from "@/lib/golden-path.functions";
function database(
  opts: {
    size?: number;
    failPage?: number;
    missingCount?: boolean;
    drift?: boolean;
    earlyEmpty?: boolean;
  } = {},
) {
  const rows = Array.from({ length: opts.size ?? 1203 }, (_, i) => ({
    id: `student-${i}`,
    first_name: `Student ${i}`,
    created_at: "2026-01-01",
  }));
  const reads: any[] = [];
  const supabase = {
    from: vi.fn((table: string) => {
      const state: any = { table, orders: [] };
      reads.push(state);
      const q: any = {
        select: (fields: string, options: any) => {
          state.fields = fields;
          state.counted = options?.count === "exact";
          return q;
        },
        order: (field: string, options: any) => {
          state.orders.push([field, options]);
          return q;
        },
        range: async (from: number, to: number) => {
          state.range = [from, to];
          const page = reads.length;
          return {
            data: opts.earlyEmpty && page > 1 ? [] : rows.slice(from, Math.min(to + 1, from + 71)),
            count: opts.missingCount ? null : rows.length + (opts.drift && page > 1 ? 1 : 0),
            error: opts.failPage === page ? { message: "Private detail" } : null,
          };
        },
      };
      return q;
    }),
    rpc: vi.fn(),
  };
  return { supabase, reads, rows };
}
it("reads the complete caller-visible list across short pages in stable order", async () => {
  const db = database();
  const result = await listStudents({
    context: { userId: "caller", supabase: db.supabase },
  } as any);
  expect(result).toEqual({ students: db.rows, loadFailed: false });
  expect(db.reads.length).toBeGreaterThan(10);
  for (const read of db.reads) {
    expect(read.table).toBe("students");
    expect(read.fields).toBe("*");
    expect(read.counted).toBe(true);
    expect(read.orders).toEqual([
      ["created_at", { ascending: false }],
      ["id", undefined],
    ]);
  }
  expect(db.reads[1].range[0]).toBe(71);
  expect(db.supabase.rpc).not.toHaveBeenCalled();
});
it.each([{ failPage: 2 }, { missingCount: true }, { drift: true }, { earlyEmpty: true }])(
  "returns failure without partial students on %j",
  async (opts) => {
    const db = database(opts);
    await expect(
      listStudents({
        data: { expected_viewer_id: "caller" },
        context: { userId: "caller", supabase: db.supabase },
      } as any),
    ).resolves.toEqual({ students: [], loadFailed: true });
  },
);
it("an exact zero count is a successful empty list", async () => {
  const db = database({ size: 0 });
  await expect(
    listStudents({ context: { userId: "caller", supabase: db.supabase } } as any),
  ).resolves.toEqual({ students: [], loadFailed: false });
});
it.each([
  listStudents,
  ensureOwnStudentProfile,
  getProfile,
  getMyRoles,
  getDashboardSnapshot,
  seedDemoStudent,
])("rejects stale viewer intent before reads, profile repair or demo writes", async (fn) => {
  const db = database();
  await expect(
    fn({
      data: { expected_viewer_id: "other" },
      context: { userId: "caller", supabase: db.supabase },
    } as any),
  ).rejects.toThrow("Your sign-in changed");
  expect(db.supabase.from).not.toHaveBeenCalled();
  expect(db.supabase.rpc).not.toHaveBeenCalled();
});
it("matching Student reconnect uses the existing authenticated RPC without an owner argument", async () => {
  const db = database();
  db.supabase.rpc.mockResolvedValue({ data: { id: "self" }, error: null });
  await expect(
    ensureOwnStudentProfile({
      data: { expected_viewer_id: "caller" },
      context: { userId: "caller", supabase: db.supabase },
    } as any),
  ).resolves.toEqual({ id: "self" });
  expect(db.supabase.rpc).toHaveBeenCalledWith("ensure_student_self_profile");
});
