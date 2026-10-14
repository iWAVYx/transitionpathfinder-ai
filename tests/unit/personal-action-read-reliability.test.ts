import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder: any = {
      middleware: () => builder,
      validator: () => builder,
      handler: (fn: any) => fn,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getNextActionsForMe } from "@/lib/next-actions/next-actions.functions";
function database(fail?: string, cap = 500, noCount = false) {
  const tables: Record<string, any[]> = {
    next_actions: [],
    pathway_reports: [],
    profiles: [{ id: "caller", email: "caller@example.invalid" }],
    invitations: [],
    meetings: [],
    students: [],
    report_evidence_links: [],
  };
  const queries: any[] = [];
  const supabase = {
    from(table: string) {
      const state: any = { table, filters: [], orders: [] };
      queries.push(state);
      const result = () => {
        let rows = tables[table];
        for (const [op, key, value] of state.filters)
          rows = rows.filter((row) =>
            op === "eq"
              ? row[key] === value
              : op === "in"
                ? value.includes(row[key])
                : op === "gte"
                  ? row[key] >= value
                  : row[key] <= value,
          );
        const count = rows.length;
        if (state.range)
          rows = rows.slice(state.range[0], Math.min(state.range[1] + 1, state.range[0] + cap));
        return {
          data: fail === table ? null : state.single ? (rows[0] ?? null) : rows,
          error: fail === table ? { message: "SECRET backend detail" } : null,
          count: noCount ? null : count,
        };
      };
      const q: any = {
        select: (_: string, opts: any) => {
          state.counted = opts?.count === "exact";
          return q;
        },
        order: (field: string) => {
          state.orders.push(field);
          return q;
        },
        range: (a: number, b: number) => {
          state.range = [a, b];
          return q;
        },
        maybeSingle: () => {
          state.single = true;
          return q;
        },
        then: (resolve: any, reject: any) => Promise.resolve(result()).then(resolve, reject),
      };
      for (const op of ["eq", "in", "gte", "lte"])
        q[op] = (key: string, value: any) => {
          state.filters.push([op, key, value]);
          return q;
        };
      return q;
    },
  };
  return {
    tables,
    queries,
    call: () => getNextActionsForMe({ context: { supabase, userId: "caller" } } as any),
  };
}
const row = (id: string, extra: any = {}) => ({
  id,
  kind: "review_report",
  title: id,
  status: "needs_review",
  priority: 1,
  owner_user_id: "caller",
  student_id: "student",
  cta_route: "/reports",
  ...extra,
});
it("loads beyond the stored cap with caller-only counted stable short pages", async () => {
  const db = database(undefined, 17);
  db.tables.next_actions = Array.from({ length: 603 }, (_, i) => row(`action-${i}`));
  db.tables.next_actions.push(row("other", { owner_user_id: "other" }));
  const result = await db.call();
  expect(result.active).toHaveLength(603);
  expect(result.viewer_id).toBe("caller");
  for (const q of db.queries.filter((q) => q.table === "next_actions")) {
    expect(q.counted).toBe(true);
    expect(q.orders).toContain("id");
    expect(q.filters).toContainEqual(["eq", "owner_user_id", "caller"]);
  }
});
it("keeps distinct reports for one student and does not let completion suppress a pending draft", async () => {
  const db = database();
  db.tables.next_actions = [
    row("stored-a", { related_report_id: "a" }),
    row("completed-b", { status: "completed", related_report_id: "b" }),
  ];
  db.tables.pathway_reports = ["a", "b", "c"].map((id) => ({
    id,
    student_id: "student",
    status: "draft",
  }));
  const result = await db.call();
  expect(result.active.map((a) => a.id)).toEqual([
    "stored-a",
    "derived:report:b",
    "derived:report:c",
  ]);
  expect(result.recentlyCompleted.map((a) => a.id)).toEqual(["completed-b"]);
  expect(result.active[1].ctaRoute).toBe("/reports/b");
  expect(result.active[1].urgency).toBe("normal");
});
it("retains all visible invitations and evidence students beyond the old caps", async () => {
  const db = database(undefined, 2);
  db.tables.invitations = Array.from({ length: 7 }, (_, i) => ({
    id: `i${i}`,
    email: "caller@example.invalid",
    status: "pending",
  }));
  db.tables.students = Array.from({ length: 12 }, (_, i) => ({
    id: `s${i}`,
    first_name: "Sample",
  }));
  const result = await db.call();
  expect(result.active.filter((a) => a.kind === "accept_invitation")).toHaveLength(7);
  expect(result.active.filter((a) => a.kind === "attach_evidence")).toHaveLength(12);
  expect(result.active.find((a) => a.kind === "attach_evidence")?.reason).toContain(
    "visible to you",
  );
});
for (const table of [
  "next_actions",
  "pathway_reports",
  "profiles",
  "invitations",
  "meetings",
  "students",
  "report_evidence_links",
])
  it(`fails visibly rather than inventing absence on ${table} failure`, async () => {
    const db = database(table);
    db.tables.students = [{ id: "student" }];
    await expect(db.call()).rejects.toThrow("Workspace information could not be fully loaded");
  });
it("rejects missing counts instead of silently truncating", async () => {
  await expect(database(undefined, 500, true).call()).rejects.toThrow("could not be fully loaded");
});
it("does not display NaN for an invalid recorded date", async () => {
  const db = database();
  db.tables.next_actions = [row("invalid", { due_at: "bad-date" })];
  const result = await db.call();
  expect(result.active[0].dueLabel).toBeUndefined();
  expect(result.active[0].urgency).toBe("normal");
});
