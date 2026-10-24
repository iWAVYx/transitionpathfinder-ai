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
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data ?? {}) }),
    };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getSchoolDashboard } from "@/lib/school-admin.functions";
import { buildSchoolAdminLivePreview } from "@/lib/dashboard/school-admin-live-preview";
const SCHOOL = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
type Query = {
  table: string;
  filters: [string, string, any][];
  counted?: boolean;
  range?: [number, number];
  orders: string[];
};
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
function database(
  options: {
    cap?: number;
    fail?: string;
    noCount?: string;
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
    organizations: [
      { id: SCHOOL, name: "Synthetic School", type: "school" },
      { id: OTHER, name: "Other School", type: "school" },
    ],
    students: [],
    profiles: [],
    pathway_reports: [],
    documents: [],
  };
  const supabase = {
    from(table: string) {
      const query: Query = { table, filters: [], orders: [] };
      queries.push(query);
      const result = () => {
        let rows = tables[table];
        for (const [op, field, value] of query.filters)
          rows = rows.filter((row) =>
            op === "eq" ? row[field] === value : value.includes(row[field]),
          );
        rows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
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
        return options.fail === table
          ? { data: null, count: null, error: { message: "Private database detail" } }
          : { data: rows, count, error: null };
      };
      const q: any = {
        select: (_fields: string, config?: any) => {
          query.counted = config?.count === "exact";
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
        order: (field: string) => {
          query.orders.push(field);
          return q;
        },
        range: (from: number, to: number) => {
          query.range = [from, to];
          return q;
        },
        then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
      };
      return q;
    },
  };
  return { tables, queries, supabase };
}
function addStudents(db: ReturnType<typeof database>, count: number) {
  db.tables.students.push(
    ...Array.from({ length: count }, (_, n) => ({
      id: id("student", n),
      organization_id: SCHOOL,
      first_name: `Student ${n}`,
      preferred_name: null,
      grade_band: "11",
      owner_id: "caller",
    })),
  );
}
const invoke = (db: ReturnType<typeof database>, data: any = { org_id: SCHOOL }) =>
  (getSchoolDashboard as any)({ data, context: { supabase: db.supabase, userId: "caller" } });
function assertQueries(db: ReturnType<typeof database>) {
  for (const query of db.queries) {
    expect(query.counted).toBe(true);
    expect(query.orders).toContain("id");
    expect(query.range).toBeDefined();
    for (const [op, field, values] of query.filters)
      if (op === "in" && field !== "role_within_org")
        expect(values.length).toBeLessThanOrEqual(100);
  }
}
it("reads the full assigned-school cohort and events beyond old caps, excluding staff-owned other/unassigned students", async () => {
  const db = database({ cap: 37 });
  addStudents(db, 1103);
  db.tables.students.push(
    { id: "other-owned", owner_id: "caller", organization_id: OTHER },
    { id: "unassigned-owned", owner_id: "caller", organization_id: null },
  );
  db.tables.pathway_reports = Array.from({ length: 1407 }, (_, n) => ({
    id: id("report", n),
    student_id: id("student", n % 1103),
  }));
  db.tables.documents = Array.from({ length: 1807 }, (_, n) => ({
    id: id("document", n),
    student_id: id("student", n % 1103),
  }));
  db.tables.pathway_reports.push({ id: "other-report", student_id: "other-owned" });
  db.tables.documents.push({ id: "other-document", student_id: "other-owned" });
  const result = await invoke(db);
  expect(result.students).toHaveLength(1103);
  expect(result.metrics).toMatchObject({
    students_count: 1103,
    reports_count: 1407,
    students_with_report: 1103,
    documents_count: 1807,
  });
  expect(result.students.some((student: any) => student.id.includes("owned"))).toBe(false);
  for (const query of db.queries.filter((row) => row.table === "students")) {
    expect(query.filters).toContainEqual(["eq", "organization_id", SCHOOL]);
    expect(query.filters.some(([, field]) => field === "owner_id")).toBe(false);
  }
  assertQueries(db);
});
it("pages all admin scopes, team rows and bounded profile batches", async () => {
  const db = database({ cap: 41 });
  db.tables.organization_memberships.push(
    ...Array.from({ length: 503 }, (_, n) => ({
      id: id("admin", n),
      user_id: "caller",
      organization_id: id("org", n),
      status: "active",
      role_within_org: "admin",
    })),
  );
  db.tables.organizations.push(
    ...Array.from({ length: 503 }, (_, n) => ({
      id: id("org", n),
      name: "Authorized Organization",
      type: "school",
    })),
  );
  db.tables.organization_memberships.push(
    ...Array.from({ length: 1103 }, (_, n) => ({
      id: id("team", n),
      user_id: id("user", n),
      organization_id: SCHOOL,
      status: n % 2 ? "invited" : "active",
      role_within_org: "member",
    })),
  );
  db.tables.profiles = Array.from({ length: 1103 }, (_, n) => ({
    id: id("user", n),
    full_name: `Member ${n}`,
    email: `synthetic${n}@example.test`,
  }));
  const result = await invoke(db);
  expect(result.orgs).toHaveLength(504);
  expect(result.metrics).toMatchObject({
    total_members: 1104,
    active_members: 553,
    pending_members: 551,
  });
  expect(result.members.find((member: any) => member.user_id === id("user", 1102))?.full_name).toBe(
    "Member 1102",
  );
  assertQueries(db);
});
it("rejects an unavailable explicit school without reading a substitute", async () => {
  const db = database();
  await expect(invoke(db, { org_id: OTHER })).rejects.toThrow(
    "Workspace information could not be fully loaded",
  );
  expect(db.queries.map((row) => row.table)).toEqual(["organization_memberships"]);
});
it.each([{ role_within_org: "member" }, { status: "suspended" }])(
  "rejects unauthorized membership %j",
  async (patch) => {
    const db = database();
    Object.assign(db.tables.organization_memberships[0], patch);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
    expect(db.queries.some((row) => row.table === "students")).toBe(false);
  },
);
it("returns setup only for a successfully empty membership read", async () => {
  const db = database();
  db.tables.organization_memberships = [];
  const result = await invoke(db, {});
  expect(result.is_school_admin).toBe(false);
  expect(result.metrics.students_count).toBe(0);
  expect(db.queries).toHaveLength(1);
});
it("rejects a selected school absent from caller-visible organization records", async () => {
  const db = database();
  db.tables.organizations = [];
  await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  expect(db.queries.some((row) => row.table === "students")).toBe(false);
});
it("keeps successful empty-school results and skips event reads", async () => {
  const db = database();
  const result = await invoke(db);
  expect(result.is_school_admin).toBe(true);
  expect(result.metrics).toMatchObject({
    students_count: 0,
    reports_count: 0,
    students_with_report: 0,
    documents_count: 0,
  });
  expect(db.queries.some((row) => ["pathway_reports", "documents"].includes(row.table))).toBe(
    false,
  );
});
for (const table of [
  "organization_memberships",
  "organizations",
  "profiles",
  "students",
  "pathway_reports",
  "documents",
]) {
  it(`rejects ${table} query failures without false zero metrics`, async () => {
    const db = database({ fail: table });
    addStudents(db, 1);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  });
  it(`rejects missing ${table} counts`, async () => {
    const db = database({ noCount: table });
    addStudents(db, 1);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  });
}
it("rejects a changed student count", async () => {
  const db = database({ cap: 37, changed: true });
  addStudents(db, 503);
  await expect(invoke(db)).rejects.toThrow("Workspace records changed while loading");
});
it("rejects a premature empty student page", async () => {
  const db = database({ cap: 37, emptyPage: true });
  addStudents(db, 503);
  await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
});
it("validates malformed selection before any reads", async () => {
  const db = database();
  await expect(invoke(db, { org_id: "not-a-uuid" })).rejects.toThrow();
  expect(db.queries).toHaveLength(0);
});
it("counts students with reports separately from report versions, omitting unknown coverage", async () => {
  const db = database();
  addStudents(db, 2);
  db.tables.pathway_reports = Array.from({ length: 5 }, (_, n) => ({
    id: id("version", n),
    student_id: id("student", 0),
  }));
  const result = await invoke(db);
  expect(result.metrics).toMatchObject({ reports_count: 5, students_with_report: 1 });
  expect(
    buildSchoolAdminLivePreview(result, SCHOOL)?.details["report-completion"].stats,
  ).toContainEqual({ label: "Students With Reports", value: "50%" });
  delete result.metrics.students_with_report;
  expect(
    buildSchoolAdminLivePreview(result, SCHOOL)?.details["report-completion"].stats?.some((stat) =>
      stat.value.endsWith("%"),
    ),
  ).toBe(false);
});
