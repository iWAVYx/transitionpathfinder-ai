import { expect, it, vi } from "vitest";
const runtime = vi.hoisted(() => ({ aggregate: null as any }));
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
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => runtime.aggregate.from(table) },
}));
import { listSchoolReports, getSchoolReadiness } from "@/lib/school-admin.functions";
const SCHOOL = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
type Query = {
  client: string;
  table: string;
  fields: string;
  filters: [string, string, any][];
  count?: boolean;
  range?: [number, number];
  order: [string, boolean][];
  single?: boolean;
};
function database(
  options: {
    fail?: string;
    noCount?: string;
    cap?: number;
    changed?: boolean;
    emptyPage?: boolean;
  } = {},
) {
  const queries: Query[] = [];
  const tables: Record<string, any[]> = {
    organization_memberships: [
      {
        id: "membership",
        user_id: "caller",
        organization_id: SCHOOL,
        status: "active",
        role_within_org: "school_admin",
      },
    ],
    students: [],
    pathway_reports: [],
    action_items: [],
    goals: [],
  };
  function client(kind: string) {
    return {
      from(table: string) {
        const query: Query = { client: kind, table, fields: "", filters: [], order: [] };
        queries.push(query);
        const result = () => {
          let rows = tables[table];
          for (const [op, field, value] of query.filters)
            rows = rows.filter((row) =>
              op === "eq" ? row[field] === value : value.includes(row[field]),
            );
          rows = [...rows].sort((left, right) => {
            for (const [field, ascending] of query.order) {
              const difference = String(left[field]).localeCompare(String(right[field]));
              if (difference) return ascending ? difference : -difference;
            }
            return 0;
          });
          const count =
            options.noCount === table
              ? null
              : rows.length +
                (options.changed && table === "students" && query.range![0] > 0 ? 1 : 0);
          if (query.range)
            rows = rows.slice(
              query.range[0],
              Math.min(query.range[1] + 1, query.range[0] + (options.cap ?? 500)),
            );
          if (options.emptyPage && table === "students" && query.range![0] > 0) rows = [];
          const projected = rows.map((row) =>
            Object.fromEntries(
              query.fields.split(",").map((field) => [field.trim(), row[field.trim()] ?? null]),
            ),
          );
          return options.fail === table
            ? { data: null, error: { message: "Private backend error" }, count: null }
            : { data: query.single ? (projected[0] ?? null) : projected, error: null, count };
        };
        const q: any = {
          select: (fields: string, config?: any) => {
            query.fields = fields;
            query.count = config?.count === "exact";
            return q;
          },
          eq: (field: string, value: any) => {
            query.filters.push(["eq", field, value]);
            return q;
          },
          in: (field: string, value: any) => {
            query.filters.push(["in", field, value]);
            return q;
          },
          order: (field: string, config?: any) => {
            query.order.push([field, config?.ascending !== false]);
            return q;
          },
          range: (from: number, to: number) => {
            query.range = [from, to];
            return q;
          },
          maybeSingle: () => {
            query.single = true;
            return Promise.resolve(result());
          },
          then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
        };
        return q;
      },
    };
  }
  return { tables, queries, caller: client("caller"), aggregate: client("aggregate") };
}
function addStudents(db: ReturnType<typeof database>, count: number) {
  db.tables.students = Array.from({ length: count }, (_, n) => ({
    id: id("student", n),
    organization_id: SCHOOL,
    owner_id: "caller",
    first_name: `Student ${n}`,
    last_name: "Sample",
    preferred_name: n === 0 ? "Preferred" : null,
  }));
}
function invoke(handler: any, db: ReturnType<typeof database>, organization_id = SCHOOL) {
  runtime.aggregate = db.aggregate;
  return handler({ data: { organization_id }, context: { supabase: db.caller, userId: "caller" } });
}
function completeReads(db: ReturnType<typeof database>) {
  for (const query of db.queries.filter((query) => query.client === "aggregate")) {
    expect(query.count).toBe(true);
    expect(query.range).toBeDefined();
    expect(query.order.some(([field]) => field === "id")).toBe(true);
    for (const [op, , values] of query.filters)
      if (op === "in") expect(values.length).toBeLessThanOrEqual(100);
    if (query.table === "students") {
      expect(query.filters).toContainEqual(["eq", "organization_id", SCHOOL]);
      expect(query.filters.some(([, field]) => field === "owner_id")).toBe(false);
    }
  }
}
it("returns all authorized report metadata beyond 100 reports and default roster caps, globally newest first", async () => {
  const db = database({ cap: 31 });
  addStudents(db, 1107);
  db.tables.students.push(
    { id: "outside", organization_id: OTHER, owner_id: "caller", first_name: "Other Student" },
    { id: "unassigned", organization_id: null, owner_id: "caller" },
  );
  db.tables.pathway_reports = Array.from({ length: 1407 }, (_, n) => ({
    id: id("report", n),
    student_id: id("student", n % 1107),
    created_at: new Date(Date.UTC(2026, 9, 1, 0, 0, n)).toISOString(),
    content: "Private report content",
  }));
  db.tables.pathway_reports.push(
    { id: "tie-a", student_id: id("student", 0), created_at: "2026-10-31T12:00:00Z" },
    { id: "tie-z", student_id: id("student", 1106), created_at: "2026-10-31T12:00:00Z" },
    { id: "outside-report", student_id: "outside", created_at: "2027-01-01T00:00:00Z" },
  );
  const result = await invoke(listSchoolReports, db);
  expect(result.reports).toHaveLength(1409);
  expect(result.reports.slice(0, 2).map((report: any) => report.id)).toEqual(["tie-z", "tie-a"]);
  expect(result.reports[1].student_name).toBe("Preferred Sample");
  expect(result.reports.some((report: any) => report.id === "outside-report")).toBe(false);
  expect(Object.keys(result.reports[0]).sort()).toEqual([
    "audience",
    "created_at",
    "id",
    "student_id",
    "student_name",
  ]);
  expect(JSON.stringify(result)).not.toContain("Private report content");
  completeReads(db);
});
it("retains complete aggregate coverage and open-action average without other-school or completed/met rows", async () => {
  const db = database({ cap: 37 });
  addStudents(db, 1107);
  db.tables.students.push({ id: "outside", organization_id: OTHER, owner_id: "caller" });
  db.tables.pathway_reports = Array.from({ length: 1407 }, (_, n) => ({
    id: id("report", n),
    student_id: id("student", n % 1107),
    content: "Private content",
  }));
  db.tables.action_items = Array.from({ length: 1407 }, (_, n) => ({
    id: id("action", n),
    student_id: id("student", n % 1107),
    status: "open",
    title: "Private action",
  }));
  db.tables.goals = Array.from({ length: 1250 }, (_, n) => ({
    id: id("goal", n),
    student_id: id("student", n % 1107),
    status: "active",
    description: "Private goal",
  }));
  db.tables.action_items.push({ id: "done", student_id: id("student", 0), status: "complete" });
  db.tables.goals.push({ id: "met", student_id: id("student", 0), status: "met" });
  for (const table of ["pathway_reports", "action_items", "goals"])
    db.tables[table].push({ id: "outside", student_id: "outside", status: "active" });
  const result = await invoke(getSchoolReadiness, db);
  expect(result).toEqual({
    total_students: 1107,
    with_pathway_report: 1107,
    with_open_action_items: 1107,
    with_active_goals: 1107,
    avg_open_actions_per_student: 1.3,
  });
  completeReads(db);
});
for (const [name, handler, tables] of [
  ["index", listSchoolReports, ["students", "pathway_reports"]],
  ["readiness", getSchoolReadiness, ["students", "pathway_reports", "action_items", "goals"]],
] as const) {
  it(`${name} rejects access-check errors before aggregate queries`, async () => {
    const db = database({ fail: "organization_memberships" });
    await expect(invoke(handler, db)).rejects.toThrow("School access could not be checked");
    expect(db.queries.some((query) => query.client === "aggregate")).toBe(false);
  });
  it.each([{ status: "removed" }, { role_within_org: "member" }, { organization_id: OTHER }])(
    `${name} rejects unavailable access %j without false empty success`,
    async (patch) => {
      const db = database();
      Object.assign(db.tables.organization_memberships[0], patch);
      await expect(invoke(handler, db)).rejects.toThrow("Not authorized for this school");
      expect(db.queries.some((query) => query.client === "aggregate")).toBe(false);
    },
  );
  it(`${name} preserves selected school/caller authorization filters`, async () => {
    const db = database();
    await invoke(handler, db);
    expect(db.queries[0].filters).toEqual([
      ["eq", "organization_id", SCHOOL],
      ["eq", "user_id", "caller"],
      ["eq", "status", "active"],
      ["in", "role_within_org", ["admin", "owner", "school_admin"]],
    ]);
  });
  it(`${name} accepts a genuinely empty authorized school`, async () => {
    const db = database();
    const result = await invoke(handler, db);
    expect(name === "index" ? result.reports : result.total_students).toEqual(
      name === "index" ? [] : 0,
    );
    expect(
      db.queries.filter((query) => query.client === "aggregate").map((query) => query.table),
    ).toEqual(["students"]);
  });
  it(`${name} validates malformed school IDs before querying`, async () => {
    const db = database();
    await expect(invoke(handler, db, "invalid")).rejects.toThrow();
    expect(db.queries).toHaveLength(0);
  });
  it(`${name} rejects changed roster counts`, async () => {
    const db = database({ cap: 37, changed: true });
    addStudents(db, 503);
    await expect(invoke(handler, db)).rejects.toThrow("Workspace records changed while loading");
  });
  it(`${name} rejects premature empty roster pages`, async () => {
    const db = database({ cap: 37, emptyPage: true });
    addStudents(db, 503);
    await expect(invoke(handler, db)).rejects.toThrow(
      "Workspace information could not be fully loaded",
    );
  });
  for (const table of tables) {
    it(`${name} rejects failed ${table} reads`, async () => {
      const db = database({ fail: table });
      addStudents(db, 1);
      await expect(invoke(handler, db)).rejects.toThrow(
        "Workspace information could not be fully loaded",
      );
    });
    it(`${name} rejects missing ${table} counts`, async () => {
      const db = database({ noCount: table });
      addStudents(db, 1);
      await expect(invoke(handler, db)).rejects.toThrow(
        "Workspace information could not be fully loaded",
      );
    });
  }
}
it("empty recorded report/action/goal sets remain genuine zero coverage, not a read failure", async () => {
  const db = database();
  addStudents(db, 2);
  expect(await invoke(getSchoolReadiness, db)).toEqual({
    total_students: 2,
    with_pathway_report: 0,
    with_open_action_items: 0,
    with_active_goals: 0,
    avg_open_actions_per_student: 0,
  });
});
it("global report order retains fractional seconds and equivalent timezone offsets across batches", async () => {
  const db = database(); addStudents(db, 101);
  db.tables.pathway_reports = [
    { id: "z-older", student_id: id("student", 0), created_at: "2026-10-31T12:00:00.000001Z" },
    { id: "a-newer", student_id: id("student", 100), created_at: "2026-10-31T12:00:00.000002+00:00" },
    { id: "offset-newest", student_id: id("student", 0), created_at: "2026-10-31T07:00:00.000003-05:00" },
  ];
  const result = await invoke(listSchoolReports, db);
  expect(result.reports.map((report: any) => report.id)).toEqual(["offset-newest", "a-newer", "z-older"]);
  expect(result.reports[0].created_at).toBe("2026-10-31T07:00:00.000003-05:00");
});
it("invalid recorded report dates fail instead of returning a falsely ordered index", async () => {
  const db = database(); addStudents(db, 1); db.tables.pathway_reports = [{ id: "bad", student_id: id("student", 0), created_at: "invalid" }];
  await expect(invoke(listSchoolReports, db)).rejects.toThrow("Workspace information could not be fully loaded");
});
