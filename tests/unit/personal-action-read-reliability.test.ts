import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: any) => data;
    const builder: any = {
      middleware: () => builder,
      validator: (fn: any) => {
        validate = fn;
        return builder;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getNextActionsForMe } from "@/lib/next-actions/next-actions.functions";
function database(fail?: string, cap = 500, noCount = false) {
  const tables: Record<string, any[]> = {
    user_roles: [{ id: "role", user_id: "caller", role: "parent" }],
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
        if (state.studentScope)
          rows = rows.filter(
            (row) => row.student_id == null || row.student_id === state.studentScope,
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
        or: (clause: string) => {
          state.scopeClause = clause;
          state.studentScope = clause.split(",")[0].slice("student_id.eq.".length);
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
    call: (data?: any) =>
      getNextActionsForMe({ data, context: { supabase, userId: "caller" } } as any),
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
it("keeps complete supported derivations without inventing invitation or evidence handoffs", async () => {
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
  db.tables.pathway_reports = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    student_id: `s${i}`,
    status: "draft",
  }));
  db.tables.meetings = Array.from({ length: 7 }, (_, i) => ({
    id: `m${i}`,
    student_id: `s${i}`,
    scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
  }));
  const result = await db.call();
  expect(result.active.filter((a) => a.kind === "review_report")).toHaveLength(12);
  expect(result.active.filter((a) => a.kind === "prepare_meeting")).toHaveLength(7);
  expect(result.active.filter((a) => a.kind === "accept_invitation")).toHaveLength(0);
  expect(result.active.filter((a) => a.kind === "attach_evidence")).toHaveLength(0);
  expect(
    db.queries.some((q) =>
      ["profiles", "invitations", "students", "report_evidence_links"].includes(q.table),
    ),
  ).toBe(false);
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
  it(`handles ${table} failure through a supported read or omits that unsupported source`, async () => {
    const db = database(table);
    const selected = "10000000-0000-4000-8000-000000000001";
    db.tables.students = [{ id: selected }];
    if (["profiles", "invitations", "report_evidence_links"].includes(table)) {
      const result = await db.call();
      expect(result.active).toEqual([]);
      expect(db.queries.some((q) => q.table === table)).toBe(false);
    } else {
      await expect(
        db.call(table === "students" ? { student_id: selected } : undefined),
      ).rejects.toThrow("Workspace information could not be fully loaded");
    }
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

it("fails closed on authenticated role lookup failures", async () => {
  await expect(database("user_roles").call()).rejects.toThrow("could not be fully loaded");
});
it("rejects a requested role the caller does not have", async () => {
  await expect(database().call({ role: "partner" })).rejects.toThrow("not available for your role");
});
it("validates the requested role rather than accepting unknown labels", async () => {
  await expect(database().call({ role: "admin" })).rejects.toThrow();
});
for (const role of ["student", "partner", "school_admin", "district_admin", "admin", "other"])
  it(`does not read family-only invitation or evidence sources for ${role}`, async () => {
    const db = database();
    db.tables.user_roles = [{ id: "role", user_id: "caller", role }];
    db.tables.pathway_reports = [{ id: "report", student_id: "student", status: "draft" }];
    const result = await db.call();
    expect(
      db.queries.some((q) =>
        ["profiles", "invitations", "meetings", "students", "report_evidence_links"].includes(
          q.table,
        ),
      ),
    ).toBe(false);
    expect(result.active.map((a) => a.id)).toEqual(
      role === "student" ? ["derived:report:report"] : [],
    );
  });
it("keeps Owner management-only even with a secondary family role", async () => {
  const db = database();
  db.tables.user_roles.push({ id: "owner", user_id: "caller", role: "admin" });
  expect((await db.call({ role: "family" })).active).toEqual([]);
  expect(db.queries.map((q) => q.table)).toEqual(["user_roles"]);
});
it("respects the selected personal role for a multi-role caller", async () => {
  const db = database();
  db.tables.user_roles.push({ id: "partner", user_id: "caller", role: "partner" });
  db.tables.next_actions = [
    row("family", { owner_role: "family" }),
    row("partner", { owner_role: "partner", cta_route: "/partners-manage/profile" }),
  ];
  const result = await db.call({ role: "partner" });
  expect(result.active.map((a) => a.id)).toEqual(["partner"]);
  expect(db.queries.some((q) => q.table === "pathway_reports")).toBe(false);
});
it("does not let an unusable stored link suppress an eligible report suggestion", async () => {
  const db = database();
  db.tables.next_actions = [row("bad", { related_report_id: "report", cta_route: "/missing" })];
  db.tables.pathway_reports = [{ id: "report", student_id: "student", status: "draft" }];
  expect((await db.call()).active.map((a) => a.id)).toEqual(["derived:report:report"]);
});
it("removes ineligible primary and secondary links without inventing a fallback", async () => {
  const db = database();
  db.tables.next_actions = [
    row("bad", { cta_route: "https://example.invalid" }),
    row("other-role", { cta_route: "/partners-manage" }),
    row("valid", { secondary_route: "/owner", secondary_label: "Manage" }),
  ];
  const result = await db.call();
  expect(result.active.map((a) => a.id)).toEqual(["valid"]);
  expect(result.active[0].secondaryRoute).toBeUndefined();
  expect(result.active[0].secondaryLabel).toBeUndefined();
});

const SELECTED = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
for (const role of ["student", "family", "educator", "partner"] as const)
  it(`${role} checks the selected student and narrows stored and derived records before returning`, async () => {
    const db = database(undefined, 2);
    db.tables.user_roles = [
      { id: "role", user_id: "caller", role: role === "family" ? "parent" : role },
    ];
    db.tables.students = [{ id: SELECTED }, { id: OTHER }];
    const route = role === "partner" ? "/partners-manage/profile" : "/reports";
    db.tables.next_actions = [
      row("selected", { student_id: SELECTED, cta_route: route }),
      row("other", { student_id: OTHER, cta_route: route }),
      row("global", { student_id: null, cta_route: route }),
      row("foreign", { student_id: SELECTED, owner_user_id: "other", cta_route: route }),
    ];
    db.tables.pathway_reports = [
      { id: "selected-report", student_id: SELECTED, status: "draft" },
      { id: "other-report", student_id: OTHER, status: "draft" },
    ];
    db.tables.meetings = [
      {
        id: "selected-meeting",
        student_id: SELECTED,
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
      {
        id: "other-meeting",
        student_id: OTHER,
        scheduled_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ];
    const result = await db.call({ role, student_id: SELECTED });
    expect(result.active.map((a) => a.id)).toEqual([
      "selected",
      "global",
      ...(role !== "partner" ? ["derived:report:selected-report"] : []),
      ...(["family", "educator"].includes(role) ? ["derived:meeting:selected-meeting"] : []),
    ]);
    const studentQuery = db.queries.find((q) => q.table === "students");
    expect(studentQuery.filters).toContainEqual(["eq", "id", SELECTED]);
    expect(studentQuery.counted).toBe(true);
    expect(studentQuery.orders).toEqual(["id"]);
    for (const q of db.queries.filter((q) => q.table === "next_actions")) {
      expect(q.filters).toContainEqual(["eq", "owner_user_id", "caller"]);
      expect(q.scopeClause).toBe(`student_id.eq.${SELECTED},student_id.is.null`);
      expect(q.counted).toBe(true);
    }
    for (const q of db.queries.filter((q) => ["pathway_reports", "meetings"].includes(q.table)))
      expect(q.filters).toContainEqual(["eq", "student_id", SELECTED]);
  });
it("rejects an unavailable student before reading action or planning sources", async () => {
  const db = database();
  db.tables.students = [{ id: OTHER }];
  await expect(db.call({ student_id: SELECTED })).rejects.toThrow("student is unavailable");
  expect(db.queries.map((q) => q.table)).toEqual(["user_roles", "students"]);
});
it("rejects malformed student selection before querying the database", async () => {
  const db = database();
  await expect(db.call({ student_id: "invalid" })).rejects.toThrow();
  expect(db.queries).toEqual([]);
});
it("keeps an unavailable selection separate from a legitimate empty action list", async () => {
  const db = database();
  db.tables.students = [{ id: SELECTED }];
  const result = await db.call({ student_id: SELECTED });
  expect(result.active).toEqual([]);
  expect(result.viewer_id).toBe("caller");
});
it("counts and scopes completed actions as well as active actions", async () => {
  const db = database();
  db.tables.students = [{ id: SELECTED }];
  db.tables.next_actions = [
    row("mine", { status: "completed", student_id: SELECTED }),
    row("global", { status: "completed", student_id: null }),
    row("other", { status: "completed", student_id: OTHER }),
  ];
  expect((await db.call({ student_id: SELECTED })).recentlyCompleted.map((a) => a.id)).toEqual([
    "mine",
    "global",
  ]);
});
