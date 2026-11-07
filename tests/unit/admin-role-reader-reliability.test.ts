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
import { getMyAdminRoles } from "@/lib/owner/owner.functions";
function db(
  opts: {
    roles?: string[];
    failPage?: number;
    noCount?: boolean;
    drift?: boolean;
    earlyEmpty?: boolean;
  } = {},
) {
  const rows = (opts.roles ?? ["content_manager", "platform_owner"]).map((role, i) => ({
    id: `r${i}`,
    user_id: "caller",
    role,
    granted_at: "2026-01-01",
  }));
  rows.push({ id: "foreign", user_id: "other", role: "platform_admin", granted_at: "2026-01-01" });
  const reads: any[] = [];
  const supabase = {
    from: vi.fn((table: string) => {
      const state: any = { table, filters: [], orders: [] };
      reads.push(state);
      const q: any = {
        select: (fields: string, options: any) => {
          state.fields = fields;
          state.counted = options?.count === "exact";
          return q;
        },
        eq: (key: string, value: any) => {
          state.filters.push([key, value]);
          return q;
        },
        order: (key: string) => {
          state.orders.push(key);
          return q;
        },
        range: async (from: number, to: number) => {
          state.range = [from, to];
          const own = rows.filter((row) =>
            state.filters.every(([k, v]: any) => row[k as keyof typeof row] === v),
          );
          const page = reads.length;
          return {
            data: opts.earlyEmpty && page > 1 ? [] : own.slice(from, Math.min(from + 1, to + 1)),
            count: opts.noCount ? null : own.length + (opts.drift && page > 1 ? 1 : 0),
            error: opts.failPage === page ? { message: "PRIVATE admin detail" } : null,
          };
        },
      };
      return q;
    }),
  };
  return {
    reads,
    call: (expected?: string) =>
      getMyAdminRoles({
        data: expected ? { expected_viewer_id: expected } : undefined,
        context: { supabase, userId: "caller" },
      } as any),
  };
}
it("complete caller-only admin roles detect an Owner after a short first page", async () => {
  const d = db();
  expect(await d.call("caller")).toEqual({
    roles: ["content_manager", "platform_owner"],
    isPlatformAdmin: true,
    isAnyAdmin: true,
  });
  expect(d.reads).toHaveLength(2);
  for (const q of d.reads) {
    expect(q.table).toBe("admin_roles");
    expect(q.fields).toBe("id,role,granted_at");
    expect(q.counted).toBe(true);
    expect(q.filters).toEqual([["user_id", "caller"]]);
    expect(q.orders).toEqual(["id"]);
  }
  expect(d.reads[1].range[0]).toBe(1);
});
it.each(["platform_owner", "platform_admin", "content_manager", "support_admin"])(
  "retains the recorded %s platform-admin meaning",
  async (role) => {
    expect(await db({ roles: [role] }).call()).toEqual({
      roles: [role],
      isPlatformAdmin: role === "platform_owner" || role === "platform_admin",
      isAnyAdmin: true,
    });
  },
);
it("an empty complete list does not inherit a different user's platform role", async () => {
  expect(await db({ roles: [] }).call()).toEqual({
    roles: [],
    isPlatformAdmin: false,
    isAnyAdmin: false,
  });
});
it.each([
  { failPage: 1 },
  { failPage: 2 },
  { noCount: true },
  { drift: true },
  { earlyEmpty: true },
])("failed or incomplete admin pages %j never fabricate non-Owner status", async (opts) => {
  await expect(db(opts).call()).rejects.toThrow(
    opts.drift
      ? "Workspace records changed while loading. Please try again."
      : "Workspace information could not be fully loaded. Please try again.",
  );
});
it("stale viewer intent is rejected before reading admin metadata", async () => {
  const d = db();
  await expect(d.call("other")).rejects.toThrow("Your sign-in changed");
  expect(d.reads).toEqual([]);
});
