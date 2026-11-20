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
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data ?? {}) }),
    };
    return chain;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (table: string) => runtime.aggregate.from(table) },
}));
import { getDistrictDashboard } from "@/lib/district-admin.functions";
const DISTRICT = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const SCHOOL = "10000000-0000-4000-8000-000000000003";
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
type Query = {
  client: "caller" | "aggregate";
  table: string;
  fields: string;
  counted: boolean;
  filters: [string, string, any][];
  orders: string[];
  range?: [number, number];
};
function database(
  options: {
    cap?: number;
    fail?: (query: Query) => boolean;
    noCount?: (query: Query) => boolean;
    changed?: boolean;
    emptyPage?: boolean;
  } = {},
) {
  const queries: Query[] = [];
  const tables: Record<string, any[]> = {
    organization_memberships: [
      {
        id: "caller-membership",
        organization_id: DISTRICT,
        user_id: "caller",
        role_within_org: "district_admin",
        status: "active",
        created_at: "2026-01-01",
      },
    ],
    organizations: [
      { id: DISTRICT, name: "Synthetic District", type: "district" },
      { id: OTHER, name: "Other District", type: "district" },
      { id: SCHOOL, name: "Synthetic School", type: "school", parent_organization_id: DISTRICT },
    ],
    profiles: [
      {
        id: "caller",
        full_name: "Synthetic Administrator",
        email: "synthetic@example.test",
        primary_role: "district_admin",
      },
    ],
    students: [],
    pathway_reports: [],
    action_items: [],
    goals: [],
  };
  function client(kind: Query["client"]) {
    return {
      from(table: string) {
        const query: Query = {
          client: kind,
          table,
          fields: "",
          counted: false,
          filters: [],
          orders: [],
        };
        queries.push(query);
        function result() {
          let rows = tables[table];
          for (const [op, field, value] of query.filters)
            rows = rows.filter((row) =>
              op === "eq" ? row[field] === value : value.includes(row[field]),
            );
          rows = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
          const count = options.noCount?.(query)
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
          return options.fail?.(query)
            ? { data: null, count: null, error: { message: "Private backend detail" } }
            : { data: projected, count, error: null };
        }
        const q: any = {
          select: (fields: string, config?: any) => {
            query.fields = fields;
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
  }
  return { queries, tables, caller: client("caller"), aggregate: client("aggregate") };
}
function addStudents(db: ReturnType<typeof database>, count: number, schoolIds = [SCHOOL]) {
  db.tables.students.push(
    ...Array.from({ length: count }, (_, n) => ({
      id: id("private-student", n),
      organization_id: schoolIds[n % schoolIds.length],
      first_name: "Private student name",
      owner_id: "caller",
    })),
  );
}
function invoke(db: ReturnType<typeof database>, data: any = { district_id: DISTRICT }) {
  runtime.aggregate = db.aggregate;
  return (getDistrictDashboard as any)({
    data,
    context: { supabase: db.caller, userId: "caller" },
  });
}
function completeQueries(db: ReturnType<typeof database>) {
  for (const query of db.queries) {
    expect(query.counted).toBe(true);
    expect(query.orders).toContain("id");
    expect(query.range).toBeDefined();
    for (const [op, field, values] of query.filters)
      if (op === "in" && field !== "role_within_org")
        expect(values.length).toBeLessThanOrEqual(100);
  }
  expect(
    db.queries
      .filter((query) => query.client === "caller")
      .every((query) => query.table === "organization_memberships"),
  ).toBe(true);
}
it("retains every child-school aggregate beyond default row caps without adding other/district/unassigned students", async () => {
  const db = database({ cap: 37 });
  db.tables.organizations = db.tables.organizations.filter((row) => row.id !== SCHOOL);
  const schools = Array.from({ length: 151 }, (_, n) => id("school", n));
  db.tables.organizations.push(
    ...schools.map((school) => ({
      id: school,
      name: school,
      type: "school",
      parent_organization_id: DISTRICT,
    })),
    { id: "other-school", name: "Other School", parent_organization_id: OTHER },
  );
  addStudents(db, 1421, schools);
  db.tables.students.push(
    { id: "outside-student", organization_id: "other-school", owner_id: "caller" },
    { id: "district-student", organization_id: DISTRICT, owner_id: "caller" },
    { id: "unassigned-student", organization_id: null, owner_id: "caller" },
  );
  db.tables.pathway_reports = Array.from({ length: 1907 }, (_, n) => ({
    id: id("report", n),
    student_id: id("private-student", n % 1421),
    content: "Private report text",
  }));
  db.tables.action_items = Array.from({ length: 1807 }, (_, n) => ({
    id: id("action", n),
    student_id: id("private-student", n % 1421),
    status: "open",
  }));
  db.tables.goals = Array.from({ length: 1707 }, (_, n) => ({
    id: id("goal", n),
    student_id: id("private-student", n % 1421),
    status: "active",
  }));
  for (const student_id of ["outside-student", "district-student", "unassigned-student"]) {
    db.tables.pathway_reports.push({ id: student_id, student_id });
    db.tables.action_items.push({ id: student_id, student_id, status: "open" });
    db.tables.goals.push({ id: student_id, student_id, status: "active" });
  }
  const result = await invoke(db);
  expect(result.schools).toHaveLength(151);
  expect(result.metrics).toMatchObject({
    schools_count: 151,
    students_count: 1421,
    reports_count: 1907,
    open_actions: 1807,
    pct_with_report: 100,
    pct_with_goals: 100,
    pct_with_actions: 100,
  });
  expect(result.schools.reduce((sum: number, school: any) => sum + school.students_count, 0)).toBe(
    1421,
  );
  expect(
    result.schools.reduce((sum: number, school: any) => sum + school.students_with_report, 0),
  ).toBe(1421);
  expect(JSON.stringify(result)).not.toContain("Private student name");
  expect(JSON.stringify(result)).not.toContain("private-student");
  expect(JSON.stringify(result)).not.toContain("Private report text");
  for (const query of db.queries.filter((query) => query.table === "students")) {
    expect(query.fields).toBe("id, organization_id");
    expect(query.filters.some(([, field]) => field === "owner_id")).toBe(false);
  }
  completeQueries(db);
});
it("loads all admin choices, selected district team and bounded profile reads", async () => {
  const db = database({ cap: 41 });
  db.tables.organization_memberships.push(
    ...Array.from({ length: 503 }, (_, n) => ({
      id: id("admin", n),
      user_id: "caller",
      organization_id: id("district", n),
      role_within_org: "admin",
      status: "active",
    })),
  );
  db.tables.organizations.push(
    ...Array.from({ length: 503 }, (_, n) => ({
      id: id("district", n),
      name: "Authorized District",
      type: "district",
    })),
  );
  db.tables.organization_memberships.push(
    ...Array.from({ length: 1103 }, (_, n) => ({
      id: id("team", n),
      user_id: id("user", n),
      organization_id: DISTRICT,
      status: n % 2 ? "invited" : "active",
      role_within_org: "member",
    })),
  );
  db.tables.profiles.push(
    ...Array.from({ length: 1103 }, (_, n) => ({
      id: id("user", n),
      full_name: `Member ${n}`,
      email: `synthetic${n}@example.test`,
    })),
  );
  const result = await invoke(db);
  expect(result.districts).toHaveLength(504);
  expect(result.team).toHaveLength(553);
  expect(result.pending_team).toHaveLength(551);
  expect(result.team.find((member: any) => member.user_id === id("user", 1102))?.full_name).toBe(
    "Member 1102",
  );
  completeQueries(db);
});
it("counts only active school administrators and educators while retaining existing pending membership fields", async () => {
  const db = database({ cap: 43 });
  db.tables.organization_memberships.push(
    ...Array.from({ length: 1103 }, (_, n) => ({
      id: id("school-team", n),
      user_id: id("staff", n),
      organization_id: SCHOOL,
      status: n % 2 ? "suspended" : "active",
      role_within_org: n % 3 ? "educator" : "school_admin",
    })),
  );
  const result = await invoke(db);
  expect(result.schools[0]).toMatchObject({ active_members: 552, pending_members: 551 });
  expect(result.metrics.school_admins).toBe(
    db.tables.organization_memberships.filter(
      (row) =>
        row.organization_id === SCHOOL &&
        row.status === "active" &&
        row.role_within_org === "school_admin",
    ).length,
  );
  expect(result.metrics.educators).toBe(
    db.tables.organization_memberships.filter(
      (row) =>
        row.organization_id === SCHOOL &&
        row.status === "active" &&
        row.role_within_org === "educator",
    ).length,
  );
  completeQueries(db);
});
it("rejects an unavailable district before using aggregate reads", async () => {
  const db = database();
  await expect(invoke(db, { district_id: OTHER })).rejects.toThrow(
    "Workspace information could not be fully loaded",
  );
  expect(db.queries.map((query) => query.client)).toEqual(["caller"]);
});
it.each([
  { status: "removed" },
  { role_within_org: "member" },
  { role_within_org: "school_admin" },
])("rejects unavailable caller scope %j", async (patch) => {
  const db = database();
  Object.assign(db.tables.organization_memberships[0], patch);
  await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  expect(db.queries.some((query) => query.client === "aggregate")).toBe(false);
});
it.each(["wrong type", "missing record"])(
  "rejects a selected district with %s rather than falling back",
  async (kind) => {
    const db = database();
    db.tables.organization_memberships.push({
      id: "other-member",
      user_id: "caller",
      organization_id: OTHER,
      role_within_org: "district_admin",
      status: "active",
    });
    if (kind === "wrong type") db.tables.organizations[0].type = "school";
    else db.tables.organizations = db.tables.organizations.filter((row) => row.id !== DISTRICT);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
    expect(db.queries.some((query) => query.table === "students")).toBe(false);
  },
);
it("returns setup only after a successful empty caller membership read", async () => {
  const db = database();
  db.tables.organization_memberships = [];
  const result = await invoke(db, {});
  expect(result.is_district_admin).toBe(false);
  expect(db.queries).toHaveLength(1);
});
it("allows an authorized empty district and skips empty child/event batches", async () => {
  const db = database();
  db.tables.organizations = db.tables.organizations.filter((row) => row.id !== SCHOOL);
  const result = await invoke(db);
  expect(result.is_district_admin).toBe(true);
  expect(result.schools).toEqual([]);
  expect(result.metrics.students_count).toBe(0);
  expect(
    db.queries.some((query) =>
      ["students", "pathway_reports", "goals", "action_items"].includes(query.table),
    ),
  ).toBe(false);
});
it("keeps empty child schools without falsely claiming follow-up completion", async () => {
  const db = database();
  const result = await invoke(db);
  expect(result.schools[0]).toMatchObject({
    students_count: 0,
    reports_count: 0,
    needs_followup: true,
  });
});
const stages: Array<[string, (query: Query) => boolean]> = [
  ["caller membership", (query) => query.client === "caller"],
  [
    "district choices",
    (query) =>
      query.table === "organizations" && query.filters.some(([, field]) => field === "type"),
  ],
  [
    "child schools",
    (query) =>
      query.table === "organizations" &&
      query.filters.some(([, field]) => field === "parent_organization_id"),
  ],
  [
    "district team",
    (query) =>
      query.table === "organization_memberships" &&
      query.client === "aggregate" &&
      query.filters.some(([op]) => op === "eq"),
  ],
  ["profiles", (query) => query.table === "profiles"],
  [
    "school membership",
    (query) =>
      query.table === "organization_memberships" &&
      query.client === "aggregate" &&
      query.filters.some(([op]) => op === "in"),
  ],
  ["students", (query) => query.table === "students"],
  ["reports", (query) => query.table === "pathway_reports"],
  ["actions", (query) => query.table === "action_items"],
  ["goals", (query) => query.table === "goals"],
];
for (const [name, match] of stages) {
  it(`rejects failed ${name} reads rather than false zero totals`, async () => {
    const db = database({ fail: match });
    addStudents(db, 1);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  });
  it(`rejects missing ${name} counts`, async () => {
    const db = database({ noCount: match });
    addStudents(db, 1);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  });
}
it("rejects changed counts across cohort pages", async () => {
  const db = database({ cap: 37, changed: true });
  addStudents(db, 503);
  await expect(invoke(db)).rejects.toThrow("Workspace records changed while loading");
});
it("rejects a premature empty cohort page", async () => {
  const db = database({ cap: 37, emptyPage: true });
  addStudents(db, 503);
  await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
});
it("validates malformed district IDs before querying", async () => {
  const db = database();
  await expect(invoke(db, { district_id: "invalid" })).rejects.toThrow();
  expect(db.queries).toHaveLength(0);
});
it("keeps version counts separate from student coverage and excludes completed/met records", async () => {
  const db = database();
  addStudents(db, 2);
  db.tables.pathway_reports = Array.from({ length: 5 }, (_, n) => ({
    id: id("version", n),
    student_id: id("private-student", 0),
  }));
  db.tables.action_items = [
    { id: "open", student_id: id("private-student", 0), status: "open" },
    { id: "done", student_id: id("private-student", 1), status: "complete" },
  ];
  db.tables.goals = [
    { id: "active", student_id: id("private-student", 0), status: "active" },
    { id: "met", student_id: id("private-student", 1), status: "met" },
  ];
  const result = await invoke(db);
  expect(result.metrics).toMatchObject({
    reports_count: 5,
    pct_with_report: 50,
    pct_with_goals: 50,
    pct_with_actions: 50,
    open_actions: 1,
  });
  expect(result.schools[0]).toMatchObject({ reports_count: 5, students_with_report: 1 });
});
