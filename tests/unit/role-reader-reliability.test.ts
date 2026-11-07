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
import { getMyRoles } from "@/lib/profile.functions";
function db(
  opts: {
    failRoles?: number;
    failProfile?: boolean;
    noCount?: boolean;
    drift?: boolean;
    emptyPage?: boolean;
    primary?: string | null;
    size?: number;
  } = {},
) {
  const roles = Array.from({ length: opts.size ?? 1101 }, (_, i) => ({
    id: `role-${i}`,
    user_id: "caller",
    role: i === 1100 ? "student" : `unknown-${i}`,
  }));
  roles.push({ id: "foreign", user_id: "other", role: "admin" });
  const reads: any[] = [];
  const supabase = {
    from: (table: string) => {
      const state: any = { table, filters: [], orders: [] };
      reads.push(state);
      const q: any = {
        select: (fields: string, config: any) => {
          state.fields = fields;
          state.counted = config?.count === "exact";
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
          const own = roles.filter((row) =>
            state.filters.every(([key, value]: any) => row[key as keyof typeof row] === value),
          );
          const page = reads.filter((q) => q.table === "user_roles").length;
          return {
            data: opts.emptyPage && page > 1 ? [] : own.slice(from, Math.min(to + 1, from + 73)),
            count: opts.noCount ? null : own.length + (opts.drift && page > 1 ? 1 : 0),
            error: opts.failRoles === page ? { message: "PRIVATE role error" } : null,
          };
        },
        maybeSingle: async () => ({
          data: opts.failProfile
            ? null
            : { primary_role: opts.primary === undefined ? "parent" : opts.primary },
          error: opts.failProfile ? { message: "PRIVATE profile error" } : null,
        }),
      };
      return q;
    },
  };
  return {
    reads,
    call: (expected?: string) =>
      getMyRoles({
        data: expected ? { expected_viewer_id: expected } : undefined,
        context: { supabase, userId: "caller" },
      } as any),
  };
}
it("loads complete caller roles through short pages, retaining existing primary-role compatibility", async () => {
  const d = db();
  const result = await d.call("caller");
  expect(result.roles).toHaveLength(1102);
  expect(result.roles).toContain("student");
  expect(result.roles).toContain("parent");
  expect(result.roles).not.toContain("admin");
  const pages = d.reads.filter((q) => q.table === "user_roles");
  expect(pages.length).toBeGreaterThan(10);
  for (const q of pages) {
    expect(q.fields).toBe("id,role");
    expect(q.counted).toBe(true);
    expect(q.filters).toEqual([["user_id", "caller"]]);
    expect(q.orders).toEqual(["id"]);
  }
  expect(d.reads.find((q) => q.table === "profiles").filters).toEqual([["id", "caller"]]);
});
it.each([
  { failRoles: 1 },
  { failRoles: 2 },
  { failProfile: true },
  { noCount: true },
  { drift: true },
  { emptyPage: true },
])("fails without fabricated roles on %j", async (opts) => {
  await expect(db(opts).call()).rejects.toThrow(
    opts.drift
      ? "Workspace records changed while loading. Please try again."
      : "Workspace information could not be fully loaded. Please try again.",
  );
});
it("keeps an empty complete role result explicit", async () => {
  expect(await db({ size: 0, primary: null }).call()).toEqual({ roles: [] });
});
it("retains a recorded primary role when the complete role collection is empty", async () => {
  expect(await db({ size: 0, primary: "guardian" }).call()).toEqual({ roles: ["guardian"] });
});
it("rejects mismatched caller intent before reading either source", async () => {
  const d = db();
  await expect(d.call("other")).rejects.toThrow("Your sign-in changed");
  expect(d.reads).toEqual([]);
});
