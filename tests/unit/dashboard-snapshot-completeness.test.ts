import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: any) => data;
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
import { getDashboardSnapshot } from "@/lib/golden-path.functions";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
function db(
  options: {
    fail?: string;
    noCount?: string;
    cap?: number;
    changed?: string;
    emptyPage?: string;
  } = {},
) {
  const tables: Record<string, any[]> = {
    students: [
      {
        id: A,
        owner_id: "caller",
        first_name: "Sample",
        interests_summary: "career jobs",
        created_at: "2026-01-01",
      },
    ],
    pathway_reports: [
      { id: "report", student_id: A, content: { recorded: true }, created_at: "2026-01-01" },
    ],
    goals: [],
    documents: [],
    action_items: [],
    meetings: [
      { id: "meeting", student_id: A, status: "upcoming", scheduled_at: "2026-10-20T00:00:00Z" },
    ],
    consent_records: [],
    meeting_prep_items: [],
    resources: [],
    saved_resources: [],
  };
  const queries: any[] = [];
  const supabase = {
    from(table: string) {
      const qstate: any = { table, filters: [], orders: [] };
      queries.push(qstate);
      const result = () => {
        let rows = tables[table].filter((row) =>
          qstate.filters.every(([op, key, value]: any) =>
            op === "eq" ? row[key] === value : value.includes(row[key]),
          ),
        );
        rows = [...rows].sort((a, b) => {
          for (const [key, ascending] of qstate.orders) {
            if (a[key] === b[key]) continue;
            return String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * (ascending ? 1 : -1);
          }
          return 0;
        });
        const count = rows.length + (options.changed === table && qstate.range?.[0] > 0 ? 1 : 0);
        if (qstate.range)
          rows = rows.slice(
            qstate.range[0],
            Math.min(qstate.range[1] + 1, qstate.range[0] + (options.cap ?? 500)),
          );
        if (options.emptyPage === table && qstate.range?.[0] > 0) rows = [];
        if (qstate.limit) rows = rows.slice(0, qstate.limit);
        rows = rows.map((row) =>
          Object.fromEntries(
            qstate.fields.split(",").map((key: string) => [key.trim(), row[key.trim()] ?? null]),
          ),
        );
        return {
          data: options.fail === table ? null : qstate.single ? (rows[0] ?? null) : rows,
          error: options.fail === table ? { message: "SECRET backend detail" } : null,
          count: options.noCount === table ? null : count,
        };
      };
      const q: any = {
        select: (fields: string, config: any) => {
          qstate.fields = fields;
          qstate.counted = config?.count === "exact";
          return q;
        },
        eq: (key: string, value: any) => {
          qstate.filters.push(["eq", key, value]);
          return q;
        },
        in: (key: string, value: any) => {
          qstate.filters.push(["in", key, value]);
          return q;
        },
        order: (key: string, config: any) => {
          qstate.orders.push([key, config?.ascending !== false]);
          return q;
        },
        range: (from: number, to: number) => {
          qstate.range = [from, to];
          return q;
        },
        limit: (limit: number) => {
          qstate.limit = limit;
          return q;
        },
        maybeSingle: () => {
          qstate.single = true;
          return q;
        },
        then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
      };
      return q;
    },
  };
  return {
    tables,
    queries,
    call: (data: any = { student_id: A }) =>
      getDashboardSnapshot({ data, context: { supabase, userId: "caller" } } as any),
  };
}
it("loads complete scoped collections through short pages rather than default database limits", async () => {
  const d = db({ cap: 17 });
  for (const table of [
    "goals",
    "documents",
    "action_items",
    "consent_records",
    "meeting_prep_items",
  ])
    d.tables[table] = Array.from({ length: 603 }, (_, i) => ({
      id: `${table}-${i}`,
      student_id: A,
      meeting_id: "meeting",
    }));
  for (const table of [
    "goals",
    "documents",
    "action_items",
    "consent_records",
    "meeting_prep_items",
  ])
    d.tables[table].push({ id: "foreign", student_id: B, meeting_id: "meeting" });
  const r = await d.call();
  for (const key of ["goals", "documents", "actionItems", "consents", "meetingPrep"] as const)
    expect(r[key]).toHaveLength(603);
  for (const q of d.queries.filter((q) =>
    ["goals", "documents", "action_items", "consent_records", "meeting_prep_items"].includes(
      q.table,
    ),
  )) {
    expect(q.filters).toContainEqual(["eq", "student_id", A]);
    expect(q.counted).toBe(true);
    expect(q.orders).toContainEqual(["id", true]);
    expect(q.range).toBeTruthy();
  }
});
it("ranks relevant resources beyond the old 50-row window and sees saved rows beyond the first page", async () => {
  const d = db({ cap: 17 });
  d.tables.resources = Array.from({ length: 60 }, (_, i) => ({
    id: `r-${i}`,
    title: "Sample Resource",
    topic: i === 59 ? "career exploration" : "other",
    created_at: String(i).padStart(3, "0"),
  }));
  d.tables.saved_resources = Array.from({ length: 603 }, (_, i) => ({
    id: `saved-${String(i).padStart(3, "0")}`,
    user_id: "caller",
    resource_id: i === 602 ? "r-59" : `unused-${i}`,
  }));
  d.tables.saved_resources.push({ id: "foreign", user_id: "other", resource_id: "r-0" });
  const r = await d.call();
  expect(r.recommendedResources).toHaveLength(6);
  expect(r.recommendedResources[0].id).toBe("r-59");
  expect(r.recommendedResources[0].saved).toBe(true);
  expect(r.recommendedResources[0].matched_reason).toContain("Topic keywords overlap");
  expect(r.recommendedResources.find((r) => r.id === "r-0")?.saved).toBe(false);
  for (const q of d.queries.filter((q) => q.table === "saved_resources"))
    expect(q.filters).toContainEqual(["eq", "user_id", "caller"]);
});
it("describes unmatched resources as browsing suggestions rather than personal matches", async () => {
  const d = db();
  d.tables.resources = [
    { id: "r", topic: "independent living" },
    { id: "general", topic: null },
  ];
  const r = await d.call();
  expect(
    r.recommendedResources.every((r) =>
      r.matched_reason.includes("no topic keyword overlap was found"),
    ),
  ).toBe(true);
});
for (const table of [
  "students",
  "pathway_reports",
  "goals",
  "documents",
  "action_items",
  "meetings",
  "consent_records",
  "meeting_prep_items",
  "resources",
  "saved_resources",
])
  it(`rejects ${table} failures instead of displaying false zero totals`, async () => {
    await expect(db({ fail: table }).call()).rejects.toThrow("could not be fully loaded");
  });
for (const table of [
  "goals",
  "documents",
  "action_items",
  "consent_records",
  "meeting_prep_items",
  "resources",
  "saved_resources",
])
  it(`rejects missing ${table} counts`, async () => {
    await expect(db({ noCount: table }).call()).rejects.toThrow("could not be fully loaded");
  });
for (const failure of ["changed", "emptyPage"] as const)
  it(`rejects a ${failure} collection after the first short page`, async () => {
    const d = db({ [failure]: "goals", cap: 1 });
    d.tables.goals = [
      { id: "a", student_id: A },
      { id: "b", student_id: A },
    ];
    await expect(d.call()).rejects.toThrow("Please try again");
  });
it("rejects an unavailable selected student before requesting child records", async () => {
  const d = db();
  await expect(d.call({ student_id: B })).rejects.toThrow("student is unavailable");
  expect(d.queries.map((q) => q.table)).toEqual(["students"]);
});
it("distinguishes a legitimate empty default from a failed default read", async () => {
  const d = db();
  d.tables.students = [];
  expect((await d.call({})).student).toBeNull();
  expect(d.queries.map((q) => q.table)).toEqual(["students"]);
  await expect(db({ fail: "students" }).call({})).rejects.toThrow("could not be fully loaded");
});
it("retains intentional latest-one report and meeting reads and scopes meeting preparation to both identities", async () => {
  const d = db();
  await d.call();
  for (const table of ["pathway_reports", "meetings"]) {
    const q = d.queries.find((q) => q.table === table);
    expect(q.limit).toBe(1);
    expect(q.orders).toContainEqual(["id", true]);
    expect(q.filters).toContainEqual(["eq", "student_id", A]);
  }
  const prep = d.queries.find((q) => q.table === "meeting_prep_items");
  expect(prep.filters).toContainEqual(["eq", "meeting_id", "meeting"]);
  expect(prep.filters).toContainEqual(["eq", "student_id", A]);
});
it("treats absence of a recorded report or meeting as empty rather than a read failure", async () => {
  const d = db();
  d.tables.pathway_reports = [];
  d.tables.meetings = [];
  const r = await d.call();
  expect(r.latestReport).toBeNull();
  expect(r.upcomingMeeting).toBeNull();
  expect(r.meetingPrep).toEqual([]);
  expect(d.queries.some((q) => q.table === "meeting_prep_items")).toBe(false);
});
