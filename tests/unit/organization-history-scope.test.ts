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
import {
  exportStudentAuditRecords,
  listStudentAuditTrail,
  listStudentAuditPage,
  listHistoryStudents,
} from "@/lib/audit.functions";
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
  limit?: number;
  boundary?: string;
  orders?: Array<[string, boolean]>;
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
        if (entry.boundary) {
          const match = entry.boundary.match(
            /^created_at\.lt\.(.+),and\(created_at\.eq\.(.+),id\.lt\.(.+)\)$/,
          )!;
          data = data.filter(
            (row) =>
              row.created_at < match[1] || (row.created_at === match[2] && row.id < match[3]),
          );
        }
        if (entry.orders)
          data = [...data].sort((a, b) => {
            for (const [field, ascending] of entry.orders!) {
              const compared = String(a[field]).localeCompare(String(b[field]));
              if (compared) return ascending ? compared : -compared;
            }
            return 0;
          });
        const count = options.noCount?.(entry)
          ? null
          : data.length + (options.changedCount?.(entry) ? 1 : 0);
        if (entry.limit !== undefined)
          data = data.slice(0, Math.min(entry.limit, options.cap ?? entry.limit));
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
        order: (field: string, options?: { ascending: boolean }) => {
          entry.order = field;
          (entry.orders ??= []).push([field, options?.ascending ?? true]);
          return q;
        },
        range: (from: number, to: number) => {
          entry.range = [from, to];
          return q;
        },
        or: (boundary: string) => {
          entry.boundary = boundary;
          return q;
        },
        limit: (limit: number) => {
          entry.limit = limit;
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

it("legacy-role history roster loads all caller-visible rows with a minimal projection", async () => {
  const db = database();
  for (let n = 0; n < 2103; n++)
    db.tables.students.push({
      id: `student-${n}`,
      first_name: "Synthetic",
      last_name: null,
      owner_id: "private",
      notes: "private",
      organization_id: n % 2 ? OTHER : SCHOOL,
    });
  const result = await invoke(listHistoryStudents, db, {});
  expect(result.students).toHaveLength(2103);
  expect(result.loadFailed).toBe(false);
  expect(Object.keys(result.students[0]).sort()).toEqual(["first_name", "id", "last_name"]);
  expect(
    db.queries.every(
      (q) =>
        q.table === "students" &&
        q.counted &&
        q.fields === "id, first_name, last_name" &&
        q.filters.length === 0,
    ),
  ).toBe(true);
});
it.each(["missing-count", "second-page-failure", "changed-count"])(
  "legacy history %s fails generically without successful partial/empty roster",
  async (variant) => {
    const db = database({
      noCount: (q) => variant === "missing-count",
      fail: (q) => variant === "second-page-failure" && q.range![0] > 0,
      changedCount: (q) => variant === "changed-count" && q.range![0] > 0,
    });
    for (let n = 0; n < 1003; n++)
      db.tables.students.push({ id: `student-${n}`, first_name: "Synthetic", last_name: null });
    await expect(invoke(listHistoryStudents, db, {})).rejects.toThrow(
      "Student records could not be fully loaded.",
    );
  },
);
it("successful empty caller-visible history roster remains an empty success", async () => {
  const db = database();
  expect(await invoke(listHistoryStudents, db, {})).toEqual({ students: [], loadFailed: false });
});

const eventId = (n: number) => `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const timestamp = "2030-01-01T12:00:00.123456Z";
function auditEvents(db: ReturnType<typeof database>, count: number) {
  db.tables.audit_log = Array.from({ length: count }, (_, n) => ({
    id: eventId(n),
    student_id: STUDENT,
    created_at: timestamp,
    action: "view",
    entity_type: "document",
    metadata: null,
  }));
}
it("keyset pages traverse 603 equal-timestamp events exactly once and preserve timestamp precision", async () => {
  const db = database();
  auditEvents(db, 603);
  let cursor: any = undefined;
  const ids: string[] = [];
  do {
    const result = await invoke(listStudentAuditPage, db, {
      student_id: STUDENT,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    expect(result.entries.length).toBeLessThanOrEqual(200);
    ids.push(...result.entries.map((row: any) => row.id));
    cursor = result.next_cursor;
    if (cursor) expect(cursor.created_at).toBe(timestamp);
  } while (cursor);
  expect(ids).toHaveLength(603);
  expect(new Set(ids).size).toBe(603);
  expect(ids).toEqual([...db.tables.audit_log].reverse().map((row) => row.id));
  for (const q of db.queries) {
    expect(q.table).toBe("audit_log");
    expect(q.counted).toBe(true);
    expect(q.filters).toContainEqual(["eq", "student_id", STUDENT]);
    expect(q.limit).toBe(201);
    expect(q.orders).toEqual([
      ["created_at", false],
      ["id", false],
    ]);
  }
});
it("newer inserts do not shift the older boundary or repeat previously loaded rows", async () => {
  const db = database();
  auditEvents(db, 403);
  const first = await invoke(listStudentAuditPage, db, { student_id: STUDENT });
  db.tables.audit_log.push({
    id: eventId(999),
    student_id: STUDENT,
    created_at: "2031-01-01T00:00:00Z",
  });
  const second = await invoke(listStudentAuditPage, db, {
    student_id: STUDENT,
    cursor: first.next_cursor,
  });
  const firstIds = new Set(first.entries.map((row: any) => row.id));
  expect(second.entries).toHaveLength(200);
  expect(second.entries.some((row: any) => firstIds.has(row.id) || row.id === eventId(999))).toBe(
    false,
  );
});
it.each([0, 1, 200, 201])(
  "page size boundary %s describes whether older rows exist",
  async (count) => {
    const db = database();
    auditEvents(db, count);
    const result = await invoke(listStudentAuditPage, db, { student_id: STUDENT });
    expect(result.entries).toHaveLength(Math.min(200, count));
    expect(Boolean(result.next_cursor)).toBe(count > 200);
  },
);
it.each(["student", "scope", "malformed-time", "malformed-id"])(
  "invalid %s cursor is rejected before reads",
  async (variant) => {
    const db = database();
    const cursor: any = { student_id: STUDENT, created_at: timestamp, id: eventId(1) };
    if (variant === "student") cursor.student_id = OTHER;
    if (variant === "scope") cursor.organization = { scope: "school", id: SCHOOL };
    if (variant === "malformed-time") cursor.created_at = "2030-01-01,or(student_id.eq.private)";
    if (variant === "malformed-id") cursor.id = "bad,student_id.eq.other";
    await expect(
      invoke(listStudentAuditPage, db, { student_id: STUDENT, cursor }),
    ).rejects.toThrow();
    expect(db.queries).toEqual([]);
  },
);
it.each(["missing-count", "failure"])(
  "%s audit page is not returned as an empty success",
  async (variant) => {
    const db = database({
      noCount: () => variant === "missing-count",
      fail: () => variant === "failure",
    });
    auditEvents(db, 3);
    await expect(invoke(listStudentAuditPage, db, { student_id: STUDENT })).rejects.toThrow(
      "History could not be fully loaded.",
    );
  },
);
it("organization membership is checked again before every older-page audit read", async () => {
  const db = database();
  student(db);
  auditEvents(db, 203);
  const organization = { scope: "school", id: SCHOOL };
  const first = await invoke(listStudentAuditPage, db, { student_id: STUDENT, organization });
  expect(first.next_cursor.organization).toEqual(organization);
  const before = db.queries.filter((q) => q.table === "audit_log").length;
  db.tables.organization_memberships[0].status = "removed";
  await expect(
    invoke(listStudentAuditPage, db, {
      student_id: STUDENT,
      organization,
      cursor: first.next_cursor,
    }),
  ).rejects.toThrow("Workspace information");
  expect(db.queries.filter((q) => q.table === "audit_log")).toHaveLength(before);
});

it("a capped partial audit page with a larger exact count fails instead of hiding older rows", async () => {
  const db = database({ cap: 100 });
  auditEvents(db, 303);
  await expect(invoke(listStudentAuditPage, db, { student_id: STUDENT })).rejects.toThrow(
    "History could not be fully loaded.",
  );
});

it("fresh export loads every requested ID and returns only permitted display fields", async () => {
  const db = database();
  student(db);
  auditEvents(db, 1203);
  for (const row of db.tables.audit_log) {
    row.actor_email = "team@example.invalid";
    row.actor_id = "private-actor";
    row.entity_id = "private-entity";
    row.metadata = { signed_url: "private-link", iep_text: "private-document" };
  }
  const ids = db.tables.audit_log.map((row) => row.id).reverse();
  const result = await invoke(exportStudentAuditRecords, db, {
    student_id: STUDENT,
    entry_ids: ids,
    filter: "documents",
  });
  expect(result.entries).toHaveLength(1203);
  expect(result.student).toEqual({ first_name: "Synthetic", last_name: "Student" });
  expect(Object.keys(result.entries[0]).sort()).toEqual([
    "action",
    "created_at",
    "entity_type",
    "recorded_by",
  ]);
  expect(result.entries[0].recorded_by).toBe("team@example.invalid");
  const serialized = JSON.stringify(result);
  for (const secret of [
    "private-actor",
    "private-entity",
    "private-link",
    "private-document",
    STUDENT,
    eventId(0),
  ])
    expect(serialized).not.toContain(secret);
  for (const q of db.queries.filter((q) => q.table === "audit_log")) {
    expect(q.counted).toBe(true);
    expect(q.filters).toContainEqual(["eq", "student_id", STUDENT]);
    expect(q.filters.find(([op, k]) => op === "in" && k === "id")![2].length).toBeLessThanOrEqual(
      100,
    );
    expect(q.fields).not.toContain("metadata");
  }
});
it.each(["missing-student", "missing-entry", "other-student", "changed-category"])(
  "export %s fails without a successful partial result",
  async (variant) => {
    const db = database();
    if (variant !== "missing-student") student(db);
    auditEvents(db, 1);
    if (variant === "missing-entry") db.tables.audit_log = [];
    if (variant === "other-student") db.tables.audit_log[0].student_id = OTHER;
    if (variant === "changed-category") db.tables.audit_log[0].entity_type = "meeting";
    await expect(
      invoke(exportStudentAuditRecords, db, {
        student_id: STUDENT,
        entry_ids: [eventId(0)],
        filter: "documents",
      }),
    ).rejects.toThrow("Activity could not be exported.");
  },
);
it.each(["missing-count", "failed-batch"])(
  "export %s is rejected with a generic message",
  async (variant) => {
    const db = database({
      noCount: (q) => variant === "missing-count" && q.table === "audit_log",
      fail: (q) =>
        variant === "failed-batch" &&
        q.table === "audit_log" &&
        q.filters.some(
          ([op, key, ids]) => op === "in" && key === "id" && ids.includes(eventId(101)),
        ),
    });
    student(db);
    auditEvents(db, 203);
    await expect(
      invoke(exportStudentAuditRecords, db, {
        student_id: STUDENT,
        entry_ids: db.tables.audit_log.map((row) => row.id),
      }),
    ).rejects.toThrow("Activity could not be exported.");
  },
);
it.each(["scope", "removed-membership"])(
  "export rechecks %s before activity reads",
  async (variant) => {
    const db = database();
    student(db, variant === "scope" ? OTHER : SCHOOL);
    auditEvents(db, 1);
    if (variant === "removed-membership") db.tables.organization_memberships[0].status = "removed";
    await expect(
      invoke(exportStudentAuditRecords, db, {
        student_id: STUDENT,
        entry_ids: [eventId(0)],
        organization: { scope: "school", id: SCHOOL },
      }),
    ).rejects.toThrow("Activity could not be exported.");
    expect(db.queries.some((q) => q.table === "audit_log")).toBe(false);
  },
);
it("duplicate, malformed, empty and excessive export selections fail before queries", async () => {
  const db = database();
  for (const ids of [
    [],
    ["bad"],
    [eventId(0), eventId(0)],
    Array.from({ length: 10001 }, (_, n) => eventId(n)),
  ])
    await expect(
      invoke(exportStudentAuditRecords, db, { student_id: STUDENT, entry_ids: ids }),
    ).rejects.toThrow();
  expect(db.queries).toEqual([]);
});
it("export actor fallback keeps system/team labels without raw actor IDs", async () => {
  const db = database();
  student(db);
  auditEvents(db, 2);
  db.tables.audit_log[0].actor_id = "private-id";
  const result = await invoke(exportStudentAuditRecords, db, {
    student_id: STUDENT,
    entry_ids: [eventId(0), eventId(1)],
  });
  expect(result.entries.map((row: any) => row.recorded_by)).toEqual(["Team member", "System"]);
});
