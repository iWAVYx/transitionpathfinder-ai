import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (input: any) => input;
    const b: any = {
      middleware: () => b,
      validator: (fn: any) => {
        validate = fn;
        return b;
      },
      handler: (fn: any) => (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getStudentHubContext } from "@/lib/dashboard/student-hub-context.functions";
function db(options: { fail?: string; noCount?: string; cap?: number; roles?: string[] } = {}) {
  const queries: any[] = [];
  const tables: Record<string, any[]> = {
    user_roles: (options.roles ?? ["student"]).map((role, i) => ({
      id: `r${i}`,
      user_id: "caller",
      role,
    })),
    students: [
      { id: "own", student_user_id: "caller" },
      { id: "other", student_user_id: "other" },
    ],
  };
  const supabase = {
    from(table: string) {
      const state: any = { table, filters: [], orders: [] };
      queries.push(state);
      const q: any = {
        select: (fields: string, config: any) => {
          state.fields = fields;
          state.counted = config?.count === "exact";
          return q;
        },
        eq: (key: string, value: string) => {
          state.filters.push([key, value]);
          return q;
        },
        order: (key: string) => {
          state.orders.push(key);
          return q;
        },
        range: (from: number, to: number) => {
          state.range = [from, to];
          return q;
        },
        then: (resolve: any, reject: any) => {
          let rows = tables[table].filter((row) =>
            state.filters.every(([key, value]: any) => row[key] === value),
          );
          const count = rows.length;
          rows = rows.slice(
            state.range[0],
            Math.min(state.range[1] + 1, state.range[0] + (options.cap ?? 500)),
          );
          const data = rows.map((row) =>
            Object.fromEntries(state.fields.split(",").map((key: string) => [key, row[key]])),
          );
          return Promise.resolve({
            data: options.fail === table ? null : data,
            error: options.fail === table ? {} : null,
            count: options.noCount === table ? null : count,
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return {
    tables,
    queries,
    call: (expected?: string) =>
      getStudentHubContext({
        data: expected ? { expected_viewer_id: expected } : undefined,
        context: { supabase, userId: "caller" },
      } as any),
  };
}
it("resolves only the linked caller profile using minimal counted caller reads", async () => {
  const d = db();
  d.tables.students.reverse();
  const r = await d.call();
  expect(r.student_id).toBe("own");
  expect(r.viewer_id).toBe("caller");
  expect(r.connection_status).toBe("ready");
  const q = d.queries.find((q) => q.table === "students");
  expect(q.fields).toBe("id");
  expect(q.filters).toEqual([["student_user_id", "caller"]]);
  expect(q.counted).toBe(true);
  expect(q.orders).toEqual(["id"]);
  expect(d.queries[0].filters).toEqual([["user_id", "caller"]]);
});
it("does not substitute another accessible team profile when the link is missing", async () => {
  const d = db();
  d.tables.students = [{ id: "other", student_user_id: "other" }];
  expect(await d.call()).toEqual({
    student_id: null,
    viewer_id: "caller",
    management_only: false,
    connection_status: "missing",
  });
});
it("detects ambiguous connections even through short server pages", async () => {
  const d = db({ cap: 1 });
  d.tables.students.push({ id: "second", student_user_id: "caller" });
  const r = await d.call();
  expect(r.student_id).toBeNull();
  expect(r.connection_status).toBe("ambiguous");
  expect(d.queries.filter((q) => q.table === "students")).toHaveLength(2);
});
for (const table of ["students", "user_roles"])
  for (const failure of ["fail", "noCount"] as const)
    it(`rejects ${table} ${failure} instead of inventing a missing link`, async () => {
      await expect(db({ [failure]: table }).call()).rejects.toThrow("could not be fully loaded");
    });
for (const role of ["parent", "educator", "partner", "school_admin", "district_admin", "other"])
  it(`does not resolve a personal profile for ${role}`, async () => {
    const d = db({ roles: [role] });
    await expect(d.call()).rejects.toThrow("student accounts");
    expect(d.queries.map((q) => q.table)).toEqual(["user_roles"]);
  });
it("keeps an Owner with secondary Student role management-only", async () => {
  const d = db({ roles: ["admin", "student"] });
  expect((await d.call()).management_only).toBe(true);
  expect(d.queries.map((q) => q.table)).toEqual(["user_roles"]);
});
it("does not inherit another user's admin role", async () => {
  const d = db();
  d.tables.user_roles.push({ id: "foreign", user_id: "other", role: "admin" });
  expect((await d.call()).student_id).toBe("own");
});

it("rejects a changed submitting viewer before checking roles or links", async () => {
  const d = db();
  await expect(d.call("other")).rejects.toThrow("Your sign-in changed");
  expect(d.queries).toEqual([]);
});
