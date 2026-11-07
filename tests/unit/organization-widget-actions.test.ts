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
import {
  getOrganizationWidgetActions,
  organizationActionDestination,
} from "@/lib/dashboard/organization-widget-actions.functions";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
type Query = {
  table: string;
  fields?: string;
  filters: [string, string, any][];
  counted?: boolean;
  range?: [number, number];
  orders: string[];
  single?: boolean;
  roleClause?: string;
};
function database(
  options: {
    fail?: string;
    noCount?: boolean;
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
        organization_id: A,
        status: "active",
        role_within_org: "school_admin",
      },
    ],
    organizations: [{ id: A, type: "school" }],
    next_actions: [],
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
        if (query.roleClause) {
          const role = query.roleClause.split(",")[0].split(".").slice(2).join(".");
          rows = rows.filter((row) => row.owner_role === role || row.owner_role === null);
        }
        const count =
          options.noCount && table === "next_actions"
            ? null
            : rows.length + (options.changed && query.range && query.range[0] > 0 ? 1 : 0);
        if (query.range)
          rows = rows.slice(
            query.range[0],
            Math.min(query.range[1] + 1, query.range[0] + (options.cap ?? 500)),
          );
        if (options.emptyPage && query.range && query.range[0] > 0) rows = [];
        const projected = rows.map((row) =>
          Object.fromEntries(
            query.fields!.split(",").map((field) => [field.trim(), row[field.trim()] ?? null]),
          ),
        );
        return options.fail === table
          ? { data: null, error: { message: "Private backend detail" }, count: null }
          : { data: query.single ? (projected[0] ?? null) : projected, error: null, count };
      };
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
        or: (value: string) => {
          query.roleClause = value;
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
        maybeSingle: () => {
          query.single = true;
          return Promise.resolve(result());
        },
        then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
      };
      return q;
    },
  };
  return { queries, tables, supabase };
}
const row = (id = "action", route = "/school/team") => ({
  id,
  title: `Recorded ${id}`,
  reason: "Recorded details",
  cta_route: route,
  owner_user_id: "caller",
  organization_id: A,
  owner_role: "school_admin",
  status: "waiting",
  private_metadata: "Private metadata",
});
const invoke = (db: ReturnType<typeof database>, role = "school_admin", organization_id = A) =>
  (getOrganizationWidgetActions as any)({
    data: { role, organization_id },
    context: { supabase: db.supabase, userId: "caller" },
  });
it("complete scoped reads find valid tools beyond the old 50-row personal window and reject cross-role/user/scope rows", async () => {
  const db = database({ cap: 37 });
  db.tables.next_actions = Array.from({ length: 603 }, (_, n) =>
    row(`action-${n}`, n < 3 ? "/missing-tool" : "/school/team#members"),
  );
  db.tables.next_actions.push(
    { ...row("other-user"), owner_user_id: "other" },
    { ...row("other-school"), organization_id: B },
    { ...row("other-role"), owner_role: "family" },
    { ...row("completed"), status: "completed" },
    { ...row("dismissed"), status: "dismissed" },
  );
  const result = await invoke(db);
  expect(result.total).toBe(600);
  expect(result.entries).toHaveLength(5);
  expect(result.entries[0]).toMatchObject({
    id: "action-3",
    to: "/school/team",
    search: { org_id: A },
    hash: "members",
  });
  expect(JSON.stringify(result)).not.toContain("Private metadata");
  for (const query of db.queries.filter((query) => query.table === "next_actions")) {
    expect(query.filters).toContainEqual(["eq", "owner_user_id", "caller"]);
    expect(query.filters).toContainEqual(["eq", "organization_id", A]);
    expect(query.roleClause).toBe("owner_role.eq.school_admin,owner_role.is.null");
    expect(query.counted).toBe(true);
    expect(query.range).toBeDefined();
    expect(query.orders).toEqual(["priority", "updated_at", "id"]);
  }
});
it("District uses an active district membership, district type and its own tools/scope", async () => {
  const db = database();
  db.tables.organization_memberships[0].role_within_org = "district_admin";
  db.tables.organizations[0].type = "district";
  db.tables.next_actions = [{ ...row("district", "/district/team"), owner_role: "district_admin" }];
  const result = await invoke(db, "district_admin");
  expect(result.entries[0]).toMatchObject({ to: "/district/team", search: { district_id: A } });
});
it.each([{ status: "removed" }, { role_within_org: "member" }, { organization_id: B }])(
  "denied membership stops before actions (%j)",
  async (patch) => {
    const db = database();
    Object.assign(db.tables.organization_memberships[0], patch);
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
    expect(db.queries.map((query) => query.table)).toEqual(["organization_memberships"]);
  },
);
it.each(["organization_memberships", "organizations", "next_actions"])(
  "failed %s reads are not empty success",
  async (table) => {
    const db = database({ fail: table });
    await expect(invoke(db)).rejects.toThrow("Workspace information could not be fully loaded");
  },
);
it("District rejects non-district organizations before reading actions", async () => {
  const db = database();
  db.tables.organization_memberships[0].role_within_org = "district_admin";
  await expect(invoke(db, "district_admin")).rejects.toThrow();
  expect(db.queries.some((query) => query.table === "next_actions")).toBe(false);
});
it("successful empty scopes retain an explicit zero preview", async () => {
  const db = database();
  expect(await invoke(db)).toEqual({ entries: [], total: 0, viewer_id: "caller" });
});
it.each([{ noCount: true }, { cap: 37, changed: true }, { cap: 37, emptyPage: true }])(
  "incomplete scoped pages reject (%j)",
  async (options) => {
    const db = database(options);
    db.tables.next_actions = Array.from({ length: 503 }, (_, n) => row(String(n)));
    await expect(invoke(db)).rejects.toThrow();
  },
);
it.each([
  ["family", A],
  ["admin", A],
  ["school_admin", "invalid"],
])("invalid role/scope is rejected before any queries (%s)", async (role, organization) => {
  const db = database();
  await expect(invoke(db, role, organization)).rejects.toThrow();
  expect(db.queries).toHaveLength(0);
});
it.each([
  "/missing",
  "/documents",
  "/district/team",
  "https://example.test/school/team",
  "//example.test/school/team",
  "/\\example.test",
  `/school/team?org_id=${B}`,
  `/school/team?org_id=${A}&org_id=${A}`,
  "/school/history?student_id=invalid",
])("unsupported/unsafe/mismatched destinations are omitted: %s", (destination) => {
  expect(organizationActionDestination("school_admin", A, destination)).toBeNull();
});
it("retains valid history selection/anchor without accepting arbitrary redirect query fields", () => {
  expect(
    organizationActionDestination(
      "school_admin",
      A,
      `/school/history?student_id=${B}&returnTo=https://example.test#records`,
    ),
  ).toEqual({ to: "/school/history", search: { org_id: A, student_id: B }, hash: "records" });
});
