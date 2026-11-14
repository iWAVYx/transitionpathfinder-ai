import { describe, expect, it, vi } from "vitest";
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
import {
  getSchoolSupportNeeds,
  getSchoolPlanningStatus,
  getSchoolReadinessTrends,
  getDistrictReadinessTrends,
  getSchoolResourceUsage,
} from "@/lib/school-insights.functions";
const SCHOOL = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const DISTRICT = "10000000-0000-4000-8000-000000000003";
type Query = {
  table: string;
  filters: Array<[string, string, any]>;
  range?: [number, number];
  counted: boolean;
  order?: string;
  single?: boolean;
};
function database(
  options: {
    cap?: number;
    fail?: (query: Query) => boolean;
    noCount?: (query: Query) => boolean;
    changedCount?: (query: Query) => boolean;
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
    readiness_scores: [],
    pathway_reports: [],
    profiles: [],
    saved_resources: [],
    resources: [],
  };
  const supabase = {
    from(table: string) {
      const entry: Query = { table, filters: [], counted: false };
      queries.push(entry);
      function result() {
        let data = tables[table] ?? [];
        for (const [op, field, value] of entry.filters)
          data = data.filter((row) =>
            op === "eq" ? row[field] === value : value.includes(row[field]),
          );
        if (entry.order)
          data = [...data].sort((a, b) =>
            String(a[entry.order!]).localeCompare(String(b[entry.order!])),
          );
        const count = options.noCount?.(entry)
          ? null
          : data.length + (options.changedCount?.(entry) ? 1 : 0);
        if (entry.range)
          data = data.slice(
            entry.range[0],
            Math.min(entry.range[1] + 1, entry.range[0] + (options.cap ?? 500)),
          );
        if (options.fail?.(entry))
          return { data: null, error: { message: "Private database detail" }, count: null };
        return { data: entry.single ? (data[0] ?? null) : data, error: null, count };
      }
      const q: any = {
        select: (_fields: string, config?: any) => {
          entry.counted = config?.count === "exact";
          return q;
        },
        eq: (field: string, value: any) => {
          entry.filters.push(["eq", field, value]);
          return q;
        },
        in: (field: string, value: any) => {
          entry.filters.push(["in", field, value]);
          return q;
        },
        order: (field: string) => {
          entry.order = field;
          return q;
        },
        range: (from: number, to: number) => {
          entry.range = [from, to];
          return q;
        },
        maybeSingle: () => {
          entry.single = true;
          return Promise.resolve(result());
        },
        then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
      };
      return q;
    },
  };
  return { tables, queries, supabase };
}
const id = (prefix: string, n: number) => `${prefix}-${String(n).padStart(5, "0")}`;
function addStudents(db: ReturnType<typeof database>, count: number, organization = SCHOOL) {
  db.tables.students.push(
    ...Array.from({ length: count }, (_, n) => ({
      id: id("student", n),
      organization_id: organization,
      first_name: `Student ${n}`,
      preferred_name: null,
      grade_band: "11",
      owner_id: id("owner", n),
    })),
  );
}
const invoke = (fn: any, db: ReturnType<typeof database>, data: any = { org_id: SCHOOL }) =>
  fn({ data, context: { supabase: db.supabase, userId: "caller" } });
function countedScope(db: ReturnType<typeof database>) {
  for (const query of db.queries.filter((q) => !q.single)) {
    expect(query.counted).toBe(true);
    expect(query.order).toBe("id");
    expect(query.range).toBeDefined();
    for (const [op, , ids] of query.filters)
      if (op === "in" && !query.table.includes("memberships"))
        expect(ids.length).toBeLessThanOrEqual(100);
  }
}
it("planning status counts all students and reports beyond the old 2,000-row limit and server short pages", async () => {
  const db = database({ cap: 73 });
  addStudents(db, 2103);
  db.tables.students.push({ id: "other-student", organization_id: OTHER, grade_band: "12" });
  db.tables.pathway_reports = db.tables.students
    .filter((row) => row.organization_id === SCHOOL)
    .map((row, n) => ({ id: id("report", n), student_id: row.id }));
  db.tables.pathway_reports.push({ id: "repeat-report", student_id: id("student", 2102) });
  const result = await invoke(getSchoolPlanningStatus, db);
  expect(result.total_students).toBe(2103);
  expect(result.total_with_report).toBe(2103);
  expect(result.by_grade).toEqual([{ grade_band: "11", total: 2103, with_report: 2103, pct: 100 }]);
  countedScope(db);
  expect(
    db.queries
      .filter((q) => q.table === "students")
      .every((q) =>
        q.filters.includes(q.filters.find((filter) => filter[1] === "organization_id")!),
      ),
  ).toBe(true);
  expect(
    db.queries
      .filter((q) => q.table === "students")
      .every((q) => q.filters.some((f) => f[1] === "organization_id" && f[2] === SCHOOL)),
  ).toBe(true);
});
it("support needs counts every flagged student but explicitly returns only the 50-row preview", async () => {
  const db = database({ cap: 61 });
  addStudents(db, 1203);
  db.tables.profiles = db.tables.students.map((row, n) => ({
    id: row.owner_id,
    full_name: `Owner ${n}`,
  }));
  db.tables.readiness_scores = db.tables.students.map((row, n) => ({
    id: id("score", n),
    student_id: row.id,
    category: "employment",
    score: n === 1202 ? 1 : 45,
  }));
  db.tables.pathway_reports = db.tables.students.map((row, n) => ({
    id: id("report", n),
    student_id: row.id,
  }));
  const result = await invoke(getSchoolSupportNeeds, db);
  expect(result.total_students).toBe(1203);
  expect(result.total_needing_support).toBe(1203);
  expect(result.needing_support).toHaveLength(50);
  expect(result.needing_support[0]).toMatchObject({
    student_id: id("student", 1202),
    avg_score: 1,
    owner_name: "Owner 1202",
    has_report: true,
  });
  countedScope(db);
});
it.each(["school", "district"])(
  "%s readiness includes the complete population and source scores",
  async (scope) => {
    const db = database({ cap: 83 });
    const count = scope === "district" ? 5103 : 2103;
    addStudents(db, count);
    if (scope === "district") {
      db.tables.organization_memberships = [
        {
          id: "district-member",
          user_id: "caller",
          organization_id: DISTRICT,
          status: "active",
          role_within_org: "district_admin",
        },
      ];
      db.tables.organizations.push({ id: DISTRICT, name: "Synthetic District", type: "district" });
      db.tables.organizations[0].parent_organization_id = DISTRICT;
    }
    db.tables.readiness_scores = db.tables.students.map((row, n) => ({
      id: id("score", n),
      student_id: row.id,
      category: "employment",
      score: 55,
    }));
    const result = await invoke(
      scope === "district" ? getDistrictReadinessTrends : getSchoolReadinessTrends,
      db,
      scope === "district" ? { district_id: DISTRICT } : { org_id: SCHOOL },
    );
    expect(result.total_students).toBe(count);
    expect(result.scored_students).toBe(count);
    expect(result.pillar_averages).toEqual([
      {
        category: "employment",
        avg_score: 55,
        scored_students: count,
        below_50: 0,
        below_60: count,
      },
    ]);
    countedScope(db);
  },
);
it("resource totals include all active members and saves beyond the old 2,000-row cap", async () => {
  const db = database({ cap: 67 });
  db.tables.organization_memberships.push(
    ...Array.from({ length: 1203 }, (_, n) => ({
      id: id("member", n),
      user_id: id("member-user", n),
      organization_id: SCHOOL,
      status: "active",
      role_within_org: "member",
    })),
  );
  db.tables.saved_resources = Array.from({ length: 2503 }, (_, n) => ({
    id: id("save", n),
    user_id: id("member-user", n % 1203),
    resource_id: id("resource", n % 130),
    created_at: n === 2502 ? "2030-12-31" : "2030-01-01",
  }));
  db.tables.resources = Array.from({ length: 130 }, (_, n) => ({
    id: id("resource", n),
    title: `Resource ${n}`,
    topic: "Assistive Technology",
  }));
  const result = await invoke(getSchoolResourceUsage, db);
  expect(result.team_size).toBe(1204);
  expect(result.total_saves).toBe(2503);
  expect(result.top_resources).toHaveLength(25);
  expect(
    result.top_resources.every((row: any) => row.title && row.category === "Assistive Technology"),
  ).toBe(true);
  countedScope(db);
});
const methods = [
  getSchoolPlanningStatus,
  getSchoolSupportNeeds,
  getSchoolReadinessTrends,
  getSchoolResourceUsage,
  getDistrictReadinessTrends,
];
it.each(methods.map((fn, index) => [index, fn] as const))(
  "reader %s rejects membership failures before source records",
  async (index, fn) => {
    const db = database({ fail: (query) => query.table === "organization_memberships" });
    await expect(
      invoke(fn, db, index === 4 ? { district_id: DISTRICT } : { org_id: SCHOOL }),
    ).rejects.toThrow("could not be fully loaded");
    expect(db.queries.map((q) => q.table)).toEqual(["organization_memberships"]);
  },
);
it.each(methods.map((fn, index) => [index, fn] as const))(
  "reader %s rejects an unavailable requested organization before other reads",
  async (index, fn) => {
    const db = database();
    await expect(
      invoke(fn, db, index === 4 ? { district_id: DISTRICT } : { org_id: OTHER }),
    ).rejects.toThrow("This workspace is unavailable.");
    expect(db.queries.map((q) => q.table)).toEqual(["organization_memberships"]);
  },
);
it.each(["error", "count", "changed"])(
  "a later student page %s fails rather than returning partial totals",
  async (kind) => {
    const later = (query: Query) => query.table === "students" && (query.range?.[0] ?? 0) > 0;
    const db = database({
      fail: kind === "error" ? later : undefined,
      noCount: kind === "count" ? later : undefined,
      changedCount: kind === "changed" ? later : undefined,
    });
    addStudents(db, 600);
    await expect(invoke(getSchoolPlanningStatus, db)).rejects.toThrow(
      kind === "changed" ? "records changed" : "could not be fully loaded",
    );
  },
);
it.each(["readiness_scores", "pathway_reports", "profiles"])(
  "support source %s failures cannot become false missing/low-data flags",
  async (table) => {
    const db = database({ fail: (query) => query.table === table });
    addStudents(db, 2);
    await expect(invoke(getSchoolSupportNeeds, db)).rejects.toThrow("could not be fully loaded");
  },
);
it("resource metadata failure is reported instead of producing apparently unnamed resources", async () => {
  const db = database({ fail: (query) => query.table === "resources" });
  db.tables.saved_resources = [
    { id: "saved", user_id: "caller", resource_id: "resource", created_at: "2030-01-01" },
  ];
  await expect(invoke(getSchoolResourceUsage, db)).rejects.toThrow("could not be fully loaded");
});
it("organization metadata failure cannot become a successful unnamed workspace", async () => {
  const db = database({ fail: (query) => query.table === "organizations" });
  await expect(invoke(getSchoolPlanningStatus, db)).rejects.toThrow("could not be fully loaded");
});

it("District readiness reads every child school and excludes a different district's students", async () => {
  const db = database({ cap: 37 });
  db.tables.organization_memberships = [
    {
      id: "membership",
      user_id: "caller",
      organization_id: DISTRICT,
      status: "active",
      role_within_org: "district_admin",
    },
  ];
  db.tables.organizations = [
    { id: DISTRICT, name: "Synthetic District", type: "district" },
    ...Array.from({ length: 1203 }, (_, n) => ({
      id: id("child-school", n),
      parent_organization_id: DISTRICT,
      type: "school",
    })),
  ];
  db.tables.students = Array.from({ length: 1203 }, (_, n) => ({
    id: id("student", n),
    organization_id: id("child-school", n),
  }));
  db.tables.organizations.push({
    id: "outside-school",
    parent_organization_id: OTHER,
    type: "school",
  });
  db.tables.students.push({ id: "outside-student", organization_id: "outside-school" });
  db.tables.readiness_scores = db.tables.students.map((row, n) => ({
    id: id("score", n),
    student_id: row.id,
    category: "employment",
    score: row.id === "outside-student" ? 100 : 45,
  }));
  const result = await invoke(getDistrictReadinessTrends, db, { district_id: DISTRICT });
  expect(result.total_students).toBe(1203);
  expect(result.scored_students).toBe(1203);
  expect(result.pillar_averages[0].avg_score).toBe(45);
  countedScope(db);
});
it("a later saved-resource batch failure cannot return partial usage totals", async () => {
  const db = database({
    fail: (query) =>
      query.table === "saved_resources" &&
      query.filters.some(
        ([op, field, values]) =>
          op === "in" && field === "user_id" && values.includes(id("user", 100)),
      ),
  });
  db.tables.organization_memberships.push(
    ...Array.from({ length: 101 }, (_, n) => ({
      id: id("membership", n),
      user_id: id("user", n),
      organization_id: SCHOOL,
      status: "active",
      role_within_org: "member",
    })),
  );
  db.tables.saved_resources = [
    { id: "save", user_id: id("user", 0), resource_id: "resource", created_at: "2030-01-01" },
  ];
  await expect(invoke(getSchoolResourceUsage, db)).rejects.toThrow("could not be fully loaded");
});
