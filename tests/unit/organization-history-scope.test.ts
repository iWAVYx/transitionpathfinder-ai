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
import { getOrganizationHistoryRoster } from "@/lib/organization-history.functions";
import { listStudentAuditTrail } from "@/lib/audit.functions";
const SCHOOL = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const DISTRICT = "10000000-0000-4000-8000-000000000003";
const STUDENT = "10000000-0000-4000-8000-000000000004";
type Query = {
  table: string;
  filters: Array<[string, string, any]>;
  range?: [number, number];
  counted: boolean;
  order?: string;
  single?: boolean;
  fields?: string;
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
          entry.fields = _fields;
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
        limit: () => q,
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

const invoke = (fn: any, db: ReturnType<typeof database>, data: any) =>
  fn({ data, context: { supabase: db.supabase, userId: "caller" } });
const request = { scope: "school", organization_id: SCHOOL };
function student(db: ReturnType<typeof database>, organization_id = SCHOOL) {
  db.tables.students.push({
    id: STUDENT,
    first_name: "Synthetic",
    last_name: "Student",
    organization_id,
    owner_id: "private-owner",
    notes: "private",
  });
}
it("school roster is complete, caller-scoped and returns only names and IDs", async () => {
  const db = database();
  for (let n = 0; n < 2103; n++)
    db.tables.students.push({
      id: `s-${String(n).padStart(5, "0")}`,
      first_name: "Synthetic",
      last_name: "Student",
      organization_id: SCHOOL,
      notes: "private",
    });
  student(db, OTHER);
  const result = await invoke(getOrganizationHistoryRoster, db, request);
  expect(result.organization_id).toBe(SCHOOL);
  expect(result.students).toHaveLength(2103);
  expect(Object.keys(result.students[0]).sort()).toEqual(["first_name", "id", "last_name"]);
  for (const q of db.queries) {
    expect(q.counted).toBe(true);
    expect(q.order).toBe("id");
  }
  expect(
    db.queries
      .filter((q) => q.table === "students")
      .every((q) =>
        q.filters.some(
          ([op, key, ids]) =>
            op === "in" && key === "organization_id" && ids.length === 1 && ids[0] === SCHOOL,
        ),
      ),
  ).toBe(true);
});
it.each(["inactive", "wrong-role", "wrong-user", "unavailable"])(
  "%s membership fails before student or audit reads",
  async (variant) => {
    const db = database();
    student(db);
    const m = db.tables.organization_memberships[0];
    if (variant === "inactive") m.status = "removed";
    if (variant === "wrong-role") m.role_within_org = "member";
    if (variant === "wrong-user") m.user_id = "someone-else";
    const id = variant === "unavailable" ? OTHER : SCHOOL;
    await expect(
      invoke(getOrganizationHistoryRoster, db, { ...request, organization_id: id }),
    ).rejects.toThrow("Workspace information");
    await expect(
      invoke(listStudentAuditTrail, db, {
        student_id: STUDENT,
        organization: { scope: "school", id },
      }),
    ).rejects.toThrow("Workspace information");
    expect(db.queries.some((q) => q.table === "students" || q.table === "audit_log")).toBe(false);
  },
);
it.each([OTHER, null])(
  "out-of-scope or unassigned student (%s) cannot request audit activity",
  async (org) => {
    const db = database();
    student(db, org as any);
    await expect(
      invoke(listStudentAuditTrail, db, {
        student_id: STUDENT,
        organization: { scope: "school", id: SCHOOL },
      }),
    ).rejects.toThrow("Workspace information");
    expect(db.queries.some((q) => q.table === "audit_log")).toBe(false);
  },
);
it("caller-visible student recheck precedes a scoped audit read", async () => {
  const db = database();
  student(db);
  db.tables.audit_log = [{ id: "event", student_id: STUDENT }];
  const result = await invoke(listStudentAuditTrail, db, {
    student_id: STUDENT,
    limit: 200,
    organization: { scope: "school", id: SCHOOL },
  });
  expect(result.entries).toHaveLength(1);
  expect(db.queries.map((q) => q.table)).toEqual([
    "organization_memberships",
    "students",
    "audit_log",
  ]);
  expect(db.queries[2].filters).toContainEqual(["eq", "student_id", STUDENT]);
});
it("student missing from the caller-visible query fails even with an active organization membership", async () => {
  const db = database();
  await expect(
    invoke(listStudentAuditTrail, db, {
      student_id: STUDENT,
      organization: { scope: "school", id: SCHOOL },
    }),
  ).rejects.toThrow();
  expect(db.queries.some((q) => q.table === "audit_log")).toBe(false);
});
it("district roster includes child organizations only and batches more than 1,000 children", async () => {
  const db = database();
  db.tables.organization_memberships[0].organization_id = DISTRICT;
  db.tables.organization_memberships[0].role_within_org = "district_admin";
  db.tables.organizations.push({ id: DISTRICT, type: "district" });
  for (let n = 0; n < 1203; n++) {
    const id = `child-${n}`;
    db.tables.organizations.push({ id, parent_organization_id: DISTRICT, type: "school" });
    db.tables.students.push({
      id: `s-${n}`,
      first_name: "Synthetic",
      last_name: null,
      organization_id: id,
    });
  }
  student(db, DISTRICT);
  student(db, OTHER);
  const result = await invoke(getOrganizationHistoryRoster, db, {
    scope: "district",
    organization_id: DISTRICT,
  });
  expect(result.students).toHaveLength(1203);
  expect(
    db.queries
      .filter((q) => q.table === "students")
      .every(
        (q) =>
          q.filters.find(([op, k]) => op === "in" && k === "organization_id")![2].length <= 100,
      ),
  ).toBe(true);
  await expect(
    invoke(listStudentAuditTrail, db, {
      student_id: STUDENT,
      organization: { scope: "district", id: DISTRICT },
    }),
  ).rejects.toThrow();
  expect(db.queries.some((q) => q.table === "audit_log")).toBe(false);
});
it("a school organization cannot stand in for an authorized district", async () => {
  const db = database();
  db.tables.organization_memberships[0].role_within_org = "district_admin";
  await expect(
    invoke(getOrganizationHistoryRoster, db, { scope: "district", organization_id: SCHOOL }),
  ).rejects.toThrow();
  expect(db.queries.some((q) => q.table === "students")).toBe(false);
});
it.each(["missing-count", "second-page-failure", "changed-count"])(
  "%s produces no successful partial roster",
  async (variant) => {
    const db = database({
      noCount: (q) => variant === "missing-count" && q.table === "students",
      fail: (q) => variant === "second-page-failure" && q.table === "students" && q.range![0] > 0,
      changedCount: (q) => variant === "changed-count" && q.table === "students" && q.range![0] > 0,
    });
    for (let n = 0; n < 1003; n++)
      db.tables.students.push({ id: `s-${n}`, organization_id: SCHOOL });
    await expect(invoke(getOrganizationHistoryRoster, db, request)).rejects.toThrow(/Workspace/);
  },
);
it("malformed organization IDs and unsupported scopes fail before database reads", async () => {
  const db = database();
  for (const data of [
    { scope: "owner", organization_id: SCHOOL },
    { scope: "school", organization_id: "bad" },
  ])
    await expect(invoke(getOrganizationHistoryRoster, db, data)).rejects.toThrow();
  await expect(
    invoke(listStudentAuditTrail, db, {
      student_id: STUDENT,
      organization: { scope: "district", id: "bad" },
    }),
  ).rejects.toThrow();
  expect(db.queries).toEqual([]);
});
it("default selection is authorized; explicit unavailable selection never falls back", async () => {
  const db = database();
  student(db);
  expect(
    (await invoke(getOrganizationHistoryRoster, db, { scope: "school" })).organization_id,
  ).toBe(SCHOOL);
  await expect(
    invoke(getOrganizationHistoryRoster, db, { scope: "school", organization_id: OTHER }),
  ).rejects.toThrow();
});
