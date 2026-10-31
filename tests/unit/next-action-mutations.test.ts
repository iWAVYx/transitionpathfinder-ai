import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: any) => x;
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
import {
  completeNextAction,
  dismissNextAction,
  listMyActivityHistory,
} from "@/lib/next-actions/next-actions.functions";
const ID = "10000000-0000-4000-8000-000000000001";
const VERSION = "2026-10-14T12:00:00.123456+00:00";
function db(
  opts: {
    fail?: string;
    throwLog?: boolean;
    race?: Record<string, any>;
    deleteRace?: boolean;
    role?: string;
    noRoleCount?: boolean;
  } = {},
) {
  const tables: Record<string, any[]> = {
    next_actions: [
      {
        id: ID,
        owner_user_id: "caller",
        status: "needs_review",
        updated_at: VERSION,
        completed_at: null,
        title: "Review Report",
        cta_route: "/reports",
        owner_role: "family",
        student_id: "student",
        organization_id: null,
      },
    ],
    user_roles: [{ id: "role", user_id: "caller", role: opts.role ?? "parent" }],
    activity_history: [],
  };
  const queries: any[] = [];
  const logs: any[] = [];
  const supabase = {
    from(table: string) {
      const state: any = { table, filters: [], orders: [] };
      queries.push(state);
      const result = () => {
        if (table === "next_actions" && state.patch) {
          if (opts.race) Object.assign(tables.next_actions[0], opts.race);
          if (opts.deleteRace) tables.next_actions = [];
        }
        let rows = tables[table].filter((row) =>
          state.filters.every(([key, value]: any) => row[key] === value),
        );
        const count = rows.length;
        if (opts.fail === (state.patch ? "update" : table))
          return { data: null, error: { message: "PRIVATE backend detail" }, count: null };
        if (state.patch) rows.forEach((row) => Object.assign(row, state.patch));
        if (state.range) rows = rows.slice(state.range[0], state.range[1] + 1);
        rows = rows.map((row) =>
          Object.fromEntries(state.fields.split(",").map((key: string) => [key, row[key] ?? null])),
        );
        return {
          data: state.single ? (rows[0] ?? null) : rows,
          error: null,
          count: opts.noRoleCount && table === "user_roles" ? null : count,
        };
      };
      const q: any = {
        select: (fields: string, options: any) => {
          state.fields = fields;
          state.counted = options?.count === "exact";
          return q;
        },
        eq: (key: string, value: any) => {
          state.filters.push([key, value]);
          return q;
        },
        is: (key: string, value: any) => {
          state.filters.push([key, value]);
          return q;
        },
        order: (key: string) => {
          state.orders.push(key);
          return q;
        },
        range: (a: number, b: number) => {
          state.range = [a, b];
          return q;
        },
        limit: () => q,
        update: (patch: any) => {
          state.patch = patch;
          return q;
        },
        maybeSingle: () => {
          state.single = true;
          return q;
        },
        then: (yes: any, no: any) => Promise.resolve(result()).then(yes, no),
        insert: async (row: any) => {
          logs.push(row);
          if (opts.throwLog) throw new Error("PRIVATE log failure");
          if (opts.fail === "log") return { error: { message: "PRIVATE log failure" } };
          tables[table].push({ ...row, id: "log" });
          return { error: null };
        },
      };
      return q;
    },
  };
  const args = (data: any) => ({ data, context: { supabase, userId: "caller" } }) as any;
  return {
    tables,
    queries,
    logs,
    complete: (data: any = { id: ID }) => completeNextAction(args(data)),
    dismiss: (data: any = { id: ID }) => dismissNextAction(args(data)),
    history: () => listMyActivityHistory(args(undefined)),
  };
}
it("completes only an owned active/version-matched row and records the authenticated actor", async () => {
  const d = db();
  const r = await d.complete({ id: ID, note: "  Checked with my team  " });
  expect(r).toEqual({ ok: true, alreadyCompleted: false, activityLogged: true });
  const row = d.tables.next_actions[0];
  expect(row.status).toBe("completed");
  expect(row.completed_by).toBe("caller");
  expect(row.completed_at).toBe(row.updated_at);
  expect(row.completion_note).toBe("Checked with my team");
  expect(d.logs[0].actor_user_id).toBe("caller");
  expect(d.logs[0].actor_role).toBe("family");
  expect(d.logs[0].metadata).toEqual({ note: "Checked with my team" });
  const update = d.queries.find((q) => q.patch);
  for (const filter of [
    ["id", ID],
    ["owner_user_id", "caller"],
    ["status", "needs_review"],
    ["updated_at", VERSION],
    ["completed_at", null],
  ])
    expect(update.filters).toContainEqual(filter);
  expect(update.fields).toBe("id");
});
for (const method of ["complete", "dismiss"] as const)
  it(`${method} rejects foreign ownership without changing or logging records`, async () => {
    const d = db();
    d.tables.next_actions[0].owner_user_id = "other";
    await expect(d[method]()).rejects.toThrow("unavailable");
    expect(d.tables.next_actions[0].status).toBe("needs_review");
    expect(d.logs).toEqual([]);
    expect(d.queries.some((q) => q.patch)).toBe(false);
    expect(d.queries[0].filters).toContainEqual(["owner_user_id", "caller"]);
  });
for (const race of [
  { status: "dismissed" },
  { status: "completed" },
  { updated_at: "2026-10-15T12:00:00Z" },
  { owner_user_id: "other" },
  { completed_at: "2026-10-15T12:00:00Z" },
])
  for (const method of ["complete", "dismiss"] as const)
    it(`${method} detects concurrent ${Object.keys(race)[0]} changes`, async () => {
      const d = db({ race });
      await expect(d[method]()).rejects.toThrow("has changed");
      expect(d.logs).toEqual([]);
      expect(d.tables.next_actions[0].completed_by).toBeUndefined();
    });
for (const method of ["complete", "dismiss"] as const)
  it(`${method} does not treat a disappeared row as success`, async () => {
    const d = db({ deleteRace: true });
    await expect(d[method]()).rejects.toThrow("has changed");
    expect(d.logs).toEqual([]);
  });
it("does not complete a dismissed action", async () => {
  const d = db();
  d.tables.next_actions[0].status = "dismissed";
  await expect(d.complete()).rejects.toThrow("has changed");
  expect(d.logs).toEqual([]);
  expect(d.queries.some((q) => q.patch)).toBe(false);
});
it("does not dismiss a completed action", async () => {
  const d = db();
  d.tables.next_actions[0].status = "completed";
  await expect(d.dismiss()).rejects.toThrow("has changed");
  expect(d.tables.next_actions[0].status).toBe("completed");
});
it("repeated completion is idempotent and does not duplicate history", async () => {
  const d = db();
  await d.complete();
  const version = d.tables.next_actions[0].updated_at;
  expect(await d.complete()).toEqual({ ok: true, alreadyCompleted: true, activityLogged: null });
  expect(d.logs).toHaveLength(1);
  expect(d.tables.next_actions[0].updated_at).toBe(version);
});
it("dismisses once with the same ownership/state/version predicates and no invented event", async () => {
  const d = db();
  expect(await d.dismiss()).toEqual({ ok: true, alreadyDismissed: false });
  expect(await d.dismiss()).toEqual({ ok: true, alreadyDismissed: true });
  expect(d.tables.next_actions[0].status).toBe("dismissed");
  expect(d.logs).toEqual([]);
  const q = d.queries.find((q) => q.patch);
  expect(q.filters).toContainEqual(["owner_user_id", "caller"]);
  expect(q.filters).toContainEqual(["updated_at", VERSION]);
  expect(q.filters).toContainEqual(["completed_at", null]);
});
it("does not log two events for racing completions", async () => {
  const d = db();
  const r = await Promise.allSettled([d.complete(), d.complete()]);
  expect(r.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(d.logs).toHaveLength(1);
});
for (const fields of [
  { status: "unknown" },
  { completed_at: "2026-10-13T12:00:00Z" },
  { updated_at: null },
  { updated_at: "invalid" },
])
  it(`rejects unverifiable state ${JSON.stringify(fields)}`, async () => {
    const d = db();
    Object.assign(d.tables.next_actions[0], fields);
    await expect(d.complete()).rejects.toThrow("has changed");
    expect(d.queries.some((q) => q.patch)).toBe(false);
    expect(d.logs).toEqual([]);
  });
for (const data of [
  { id: "derived:report:x" },
  { id: ID, note: "x".repeat(2001) },
  { id: ID, note: { unexpected: true } },
])
  it("rejects invalid mutation inputs before querying", async () => {
    const d = db();
    await expect(d.complete(data)).rejects.toThrow();
    expect(d.queries).toEqual([]);
  });
for (const fail of ["next_actions", "user_roles", "update"])
  it(`reports ${fail} failures without exposing backend details or logging completion`, async () => {
    const d = db({ fail });
    await expect(d.complete()).rejects.toThrow(/could not/);
    expect(d.logs).toEqual([]);
    expect(d.tables.next_actions[0].status).toBe("needs_review");
  });
it("requires complete recorded-role reads before a completion write", async () => {
  const d = db({ noRoleCount: true });
  await expect(d.complete()).rejects.toThrow("could not be fully loaded");
  expect(d.queries.some((q) => q.patch)).toBe(false);
});
for (const opts of [{ fail: "log" }, { throwLog: true }])
  it("distinguishes successful completion from failed history logging", async () => {
    const d = db(opts);
    expect(await d.complete()).toEqual({
      ok: true,
      alreadyCompleted: false,
      activityLogged: false,
    });
    expect(d.tables.next_actions[0].status).toBe("completed");
    expect((await d.complete()).alreadyCompleted).toBe(true);
    expect(d.logs).toHaveLength(1);
  });
it("does not impersonate a recorded owner-role that the actor no longer has", async () => {
  const d = db();
  d.tables.next_actions[0].owner_role = "admin";
  await d.complete();
  expect(d.logs[0].actor_role).toBeNull();
  expect((await d.history())[0].actorLabel).toBe("Not Recorded");
});

for (const method of ["complete", "dismiss"] as const)
  it(`${method} rejects a stale displayed version before writing`, async () => {
    const d = db();
    await expect(
      d[method]({ id: ID, expected_updated_at: "2026-10-13T12:00:00Z" }),
    ).rejects.toThrow("has changed");
    expect(d.queries.some((q) => q.patch)).toBe(false);
    expect(d.logs).toEqual([]);
  });
it("accepts the exact displayed version without rounding database timestamp precision", async () => {
  const d = db();
  expect((await d.complete({ id: ID, expected_updated_at: VERSION })).activityLogged).toBe(true);
  expect(d.queries.find((q) => q.patch).filters).toContainEqual(["updated_at", VERSION]);
});

for (const [recordedRole, actorRole] of [
  ["student", "student"],
  ["guardian", "family"],
  ["teacher", "educator"],
  ["case_manager", "educator"],
  ["school_admin", "school_admin"],
  ["district_admin", "district_admin"],
  ["partner", "partner"],
  ["admin", "admin"],
])
  it(`retains ownership predicates and recorded actor mapping for ${recordedRole}`, async () => {
    const d = db({ role: recordedRole });
    d.tables.next_actions[0].owner_role = actorRole;
    await d.complete();
    expect(d.logs[0].actor_role).toBe(actorRole);
    expect(d.logs[0].actor_user_id).toBe("caller");
    expect(d.queries.find((q) => q.patch).filters).toContainEqual(["owner_user_id", "caller"]);
  });

for (const route of [
  "https://example.invalid",
  "//example.invalid",
  "/missing",
  "/partners-manage",
  "/owner",
])
  it(`does not propagate an unsafe or ineligible history route ${route}`, async () => {
    const d = db();
    d.tables.next_actions[0].cta_route = route;
    await d.complete();
    expect(d.logs[0].subject_route).toBeNull();
  });
it("records the sanitized registered personal tool rather than an arbitrary redirect payload", async () => {
  const d = db();
  d.tables.next_actions[0].cta_route = "/reports?redirect=https://example.invalid#evidence";
  await d.complete();
  expect(d.logs[0].subject_route).toBe("/reports#evidence");
});
it("keeps a School history link in its recorded organization scope", async () => {
  const d = db({ role: "school_admin" });
  const org = "20000000-0000-4000-8000-000000000001";
  Object.assign(d.tables.next_actions[0], {
    owner_role: "school_admin",
    organization_id: org,
    cta_route: "/school/team#members",
  });
  await d.complete();
  expect(d.logs[0].subject_route).toBe(`/school/team?org_id=${org}#members`);
});
it("does not record another organization as the School action destination", async () => {
  const d = db({ role: "school_admin" });
  Object.assign(d.tables.next_actions[0], {
    owner_role: "school_admin",
    organization_id: "20000000-0000-4000-8000-000000000001",
    cta_route: "/school/team?org_id=20000000-0000-4000-8000-000000000002",
  });
  await d.complete();
  expect(d.logs[0].subject_route).toBeNull();
});

for (const method of ["complete", "dismiss"] as const)
  it(`${method} rejects a different submitting viewer before looking up any action`, async () => {
    const d = db();
    await expect(d[method]({ id: ID, expected_viewer_id: "other" })).rejects.toThrow(
      "sign-in changed",
    );
    expect(d.queries).toEqual([]);
    expect(d.logs).toEqual([]);
    expect(d.tables.next_actions[0].status).toBe("needs_review");
  });
it("accepts a matching viewer hint without using it as mutation authority", async () => {
  const d = db();
  await d.complete({ id: ID, expected_viewer_id: "caller" });
  expect(d.queries.find((q) => q.patch).filters).toContainEqual(["owner_user_id", "caller"]);
  expect(d.logs[0].actor_user_id).toBe("caller");
});
