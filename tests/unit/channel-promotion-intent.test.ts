import { beforeEach, describe, it, expect, vi } from "vitest";
const admin = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b = {
      middleware: () => b,
      validator: (v: any) => {
        parse = v;
        return b;
      },
      handler:
        (fn: any) =>
        ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import {
  promoteMessageToAction,
  listChannelAssigneeOptions,
} from "@/lib/channel-actions.functions";
const channel = "11111111-1111-4111-8111-111111111111",
  messageId = "22222222-2222-4222-8222-222222222222",
  student = "33333333-3333-4333-8333-333333333333",
  action = "44444444-4444-4444-8444-444444444444",
  task = "55555555-5555-4555-8555-555555555555",
  other = "66666666-6666-4666-8666-666666666666",
  viewer = "caller-viewer";
function q(result: any) {
  const query: any = { values: null, patch: null, filters: {}, window: [0, 499] };
  const resolve = () => (typeof result === "function" ? result(query) : result);
  query.then = (a: any, b: any) => Promise.resolve().then(resolve).then(a, b);
  query.maybeSingle = vi.fn(async () => resolve());
  query.single = vi.fn(async () => resolve());
  for (const method of ["select", "order"]) query[method] = vi.fn(() => query);
  query.eq = vi.fn((key: string, value: any) => {
    query.filters[key] = value;
    return query;
  });
  query.is = vi.fn((key: string, value: any) => {
    query.filters[key] = value;
    return query;
  });
  query.in = vi.fn((key: string, value: any) => {
    query.filters[key] = value;
    return query;
  });
  query.range = vi.fn((a: number, b: number) => {
    query.window = [a, b];
    return query;
  });
  query.insert = vi.fn((value: any) => {
    query.values = JSON.parse(JSON.stringify(value));
    return query;
  });
  query.update = vi.fn((value: any) => {
    query.patch = JSON.parse(JSON.stringify(value));
    return query;
  });
  return query;
}
function db(...queries: any[]) {
  return {
    from: vi.fn(() => {
      const next = queries.shift();
      if (!next) throw new Error("Unexpected query");
      return next;
    }),
  };
}
function msg(patch: any = {}) {
  return {
    id: messageId,
    channel_id: channel,
    body: "Recorded request",
    deleted_at: null,
    ...patch,
  };
}
function chan(patch: any = {}) {
  return {
    id: channel,
    title: "Synthetic team",
    student_id: student,
    organization_id: null,
    archived_at: null,
    ...patch,
  };
}
function member(patch: any = {}) {
  return { channel_id: channel, user_id: viewer, ...patch };
}
const input = {
  channel_id: channel,
  message_id: messageId,
  kind: "action",
  expected_viewer_id: viewer,
  expected_student_id: student,
  expected_message_body: "Recorded request",
};
function reads() {
  return [
    q({ data: msg(), error: null }),
    q({ data: chan(), error: null }),
    q({ data: member(), error: null }),
  ];
}
function primary() {
  return q((query: any) => ({ data: { id: action, ...query.values }, error: null }));
}
function linked() {
  return q((query: any) => ({ data: { id: action, ...query.patch }, error: null }));
}
const call = (data: any, supabase: any) =>
  (promoteMessageToAction as any)({ data, context: { userId: viewer, supabase } });
beforeEach(() => {
  vi.clearAllMocks();
  admin.from.mockImplementation(() => {
    throw new Error("Unexpected notification access");
  });
});
describe("promotion caller and related-record intent", () => {
  it.each([promoteMessageToAction, listChannelAssigneeOptions])(
    "rejects stale caller before database or notification access %#",
    async (fn) => {
      const supabase = db();
      await expect(
        (fn as any)({
          data: { ...input, expected_viewer_id: "departed" },
          context: { userId: viewer, supabase },
        }),
      ).rejects.toThrow("sign-in changed");
      expect(supabase.from).not.toHaveBeenCalled();
      expect(admin.from).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    msg({ id: other }),
    msg({ channel_id: other }),
    msg({ deleted_at: "2026-10-15" }),
    msg({ body: "Changed elsewhere" }),
  ])("rejects unavailable or changed source before channel/writes %#", async (row) => {
    const supabase = db(q({ data: row, error: null }));
    await expect(call(input, supabase)).rejects.toThrow("Message not found");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([
    null,
    chan({ id: other }),
    chan({ student_id: other }),
    chan({ archived_at: "2026-10-15" }),
  ])("rejects unavailable/changed/archived channel before writes %#", async (row) => {
    const supabase = db(q({ data: msg(), error: null }), q({ data: row, error: null }));
    await expect(call(input, supabase)).rejects.toThrow("student or access changed");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it.each([null, member({ user_id: "other" }), member({ channel_id: other })])(
    "requires current actual-caller membership %#",
    async (row) => {
      const supabase = db(
        q({ data: msg(), error: null }),
        q({ data: chan(), error: null }),
        q({ data: row, error: null }),
      );
      await expect(call(input, supabase)).rejects.toThrow("membership could not be confirmed");
      expect(supabase.from).toHaveBeenCalledTimes(3);
    },
  );
  it.each([null, member({ user_id: viewer }), member({ user_id: other, channel_id: other })])(
    "rejects missing or wrong assignee before any insert %#",
    async (row) => {
      const supabase = db(...reads(), q({ data: row, error: null }));
      await expect(call({ ...input, assignee_user_id: other }, supabase)).rejects.toThrow(
        "assignee is no longer available",
      );
      expect(supabase.from).toHaveBeenCalledTimes(4);
      expect(admin.from).not.toHaveBeenCalled();
    },
  );
  it("reads only active caller and assignee membership", async () => {
    const base = reads(),
      assignee = q({ data: member({ user_id: other }), error: null });
    const supabase = db(...base, assignee, primary());
    await call({ ...input, assignee_user_id: other }, supabase);
    expect(base[2].eq).toHaveBeenCalledWith("user_id", viewer);
    expect(base[2].is).toHaveBeenCalledWith("left_at", null);
    expect(assignee.eq).toHaveBeenCalledWith("user_id", other);
    expect(assignee.is).toHaveBeenCalledWith("left_at", null);
  });
  it.each([{ create_action_item: true, kind: "feedback" }, { create_calendar_event: true }])(
    "rejects inapplicable related writes before primary creation %#",
    async (extra) => {
      const supabase = db(...reads());
      await expect(call({ ...input, ...extra }, supabase)).rejects.toThrow("matching student");
      expect(supabase.from).toHaveBeenCalledTimes(3);
    },
  );
  it("does not invent a student target for an unscoped channel", async () => {
    const supabase = db(
      q({ data: msg(), error: null }),
      q({ data: chan({ student_id: null }), error: null }),
      q({ data: member(), error: null }),
    );
    await expect(
      call({ ...input, expected_student_id: null, create_action_item: true }, supabase),
    ).rejects.toThrow("matching student");
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });
});
describe("primary confirmation before optional effects", () => {
  it.each([
    null,
    { id: "bad" },
    { id: action, channel_id: other, message_id: messageId, kind: "action", promoted_by: viewer },
    { id: action, channel_id: channel, message_id: other, kind: "action", promoted_by: viewer },
    {
      id: action,
      channel_id: channel,
      message_id: messageId,
      kind: "feedback",
      promoted_by: viewer,
    },
    {
      id: action,
      channel_id: channel,
      message_id: messageId,
      kind: "action",
      promoted_by: "wrong",
    },
  ])(
    "does not create mirrors or notifications after missing/mismatched primary %#",
    async (row) => {
      const supabase = db(...reads(), q({ data: row, error: null }));
      await expect(
        call(
          {
            ...input,
            create_action_item: true,
            create_calendar_event: true,
            due_at: "2026-10-16T09:30:00Z",
          },
          supabase,
        ),
      ).rejects.toThrow("couldn't confirm");
      expect(supabase.from.mock.calls.map(([table]) => table)).toEqual([
        "channel_messages",
        "channels",
        "channel_members",
        "channel_actions",
      ]);
      expect(admin.from).not.toHaveBeenCalled();
    },
  );
  it("stops optional writes on a rejected primary request", async () => {
    const supabase = db(
      ...reads(),
      q(() => {
        throw new Error("network");
      }),
    );
    await expect(call({ ...input, create_action_item: true }, supabase)).rejects.toThrow();
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });
  it("keeps legacy no-hint record-only calls and confirms the actual promoter", async () => {
    const save = primary();
    const result = await call(
      { channel_id: channel, message_id: messageId, kind: "question" },
      db(...reads(), save),
    );
    expect(result).toEqual(
      expect.objectContaining({
        action_id: action,
        channel_id: channel,
        message_id: messageId,
        kind: "question",
        sync: { action_item: "not_requested", calendar: "not_requested", links: "not_needed" },
      }),
    );
    expect(save.values.promoted_by).toBe(viewer);
    expect(save.values.target_id).toBeNull();
  });
  it("writes the primary first, then optional tasks/calendar, then confirms their links", async () => {
    const save = primary(),
      taskQuery = q((v: any) => ({ data: { id: task, ...v.values }, error: null })),
      calendar = q((v: any) => ({ data: { id: other, ...v.values }, error: null })),
      link = linked();
    const supabase = db(...reads(), save, taskQuery, calendar, link);
    const result = await call(
      {
        ...input,
        create_action_item: true,
        create_calendar_event: true,
        due_at: "2026-10-16T09:30:00Z",
      },
      supabase,
    );
    expect(supabase.from.mock.calls.map(([table]) => table)).toEqual([
      "channel_messages",
      "channels",
      "channel_members",
      "channel_actions",
      "action_items",
      "calendar_events",
      "channel_actions",
    ]);
    expect(save.values.metadata).toEqual({});
    expect(taskQuery.values).toEqual(
      expect.objectContaining({ student_id: student, created_by_user_id: viewer }),
    );
    expect(calendar.values).toEqual(
      expect.objectContaining({
        student_id: student,
        owner_user_id: viewer,
        related_action_item_id: task,
      }),
    );
    expect(link.eq).toHaveBeenCalledWith("id", action);
    expect(link.eq).toHaveBeenCalledWith("promoted_by", viewer);
    expect(result.sync).toEqual({ action_item: "created", calendar: "created", links: "saved" });
  });
  it.each([
    { data: null, error: { message: "task denied" } },
    { data: { id: task, student_id: other, created_by_user_id: viewer }, error: null },
    { data: { id: task, student_id: student, created_by_user_id: "other" }, error: null },
  ])("reports unconfirmed tasks without pretending primary failure %#", async (row) => {
    const result = await call(
      { ...input, create_action_item: true },
      db(...reads(), primary(), q(row)),
    );
    expect(result.action_id).toBe(action);
    expect(result.action_item_id).toBeNull();
    expect(result.sync).toEqual({
      action_item: "unconfirmed",
      calendar: "not_requested",
      links: "not_needed",
    });
  });
  it("continues an independent requested calendar after a task transport failure", async () => {
    const result = await call(
      {
        ...input,
        create_action_item: true,
        create_calendar_event: true,
        due_at: "2026-10-16T09:30:00Z",
      },
      db(
        ...reads(),
        primary(),
        q(() => {
          throw new Error("task transport");
        }),
        q((v: any) => ({ data: { id: other, ...v.values }, error: null })),
        linked(),
      ),
    );
    expect(result.sync).toEqual({
      action_item: "unconfirmed",
      calendar: "created",
      links: "saved",
    });
    expect(result.action_item_id).toBeNull();
  });
  it("reports an unconfirmed calendar without losing the saved task", async () => {
    const result = await call(
      {
        ...input,
        create_action_item: true,
        create_calendar_event: true,
        due_at: "2026-10-16T09:30:00Z",
      },
      db(
        ...reads(),
        primary(),
        q((v: any) => ({ data: { id: task, ...v.values }, error: null })),
        q({ data: null, error: { message: "calendar denied" } }),
        linked(),
      ),
    );
    expect(result.sync).toEqual({
      action_item: "created",
      calendar: "unconfirmed",
      links: "saved",
    });
  });
  it.each([
    { data: null, error: null },
    { data: { id: action, target_id: task, metadata: {} }, error: null },
    { data: null, error: { message: "link denied" } },
  ])("reports unconfirmed links while retaining confirmed related ids %#", async (row) => {
    const result = await call(
      { ...input, create_action_item: true },
      db(
        ...reads(),
        primary(),
        q((v: any) => ({ data: { id: task, ...v.values }, error: null })),
        q(row),
      ),
    );
    expect(result.action_item_id).toBe(task);
    expect(result.sync).toEqual({
      action_item: "created",
      calendar: "not_requested",
      links: "unconfirmed",
    });
  });
});
describe("notification preference failures stay quiet", () => {
  it.each([
    { data: {}, error: null },
    { data: { muted: false }, error: null },
    { data: null, error: null },
    { data: null, error: { message: "preference denied" } },
    { data: { muted: true, notify_in_app: true }, error: null },
    { data: { muted: false, notify_in_app: false }, error: null },
  ])(
    "skips notification when current preference is missing/failed/muted %#",
    async (preference) => {
      admin.from.mockReturnValue(q(preference));
      await call(
        { ...input, assignee_user_id: other },
        db(...reads(), q({ data: member({ user_id: other }), error: null }), primary()),
      );
      expect(admin.from.mock.calls.map(([table]) => table)).toEqual(["channel_members"]);
    },
  );
  it("notifies only after the confirmed primary and allowed active preference", async () => {
    const preference = q({ data: { muted: false, notify_in_app: true }, error: null }),
      notification = q({ error: null });
    admin.from.mockReturnValueOnce(preference).mockReturnValueOnce(notification);
    await call(
      { ...input, assignee_user_id: other },
      db(...reads(), q({ data: member({ user_id: other }), error: null }), primary()),
    );
    expect(preference.is).toHaveBeenCalledWith("left_at", null);
    expect(notification.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: other, related_record_id: action }),
    );
  });
});
describe("complete assignee option reads", () => {
  it("counts all active memberships and bounded profiles beyond the old 200 limit", async () => {
    const members = Array.from({ length: 605 }, (_, i) => ({
      id: `membership-${i}`,
      user_id: `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
      member_role: "member",
    }));
    const queries: any[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        const query = q((v: any) => {
          const rows =
            table === "channel_members"
              ? members
              : v.filters.id.map((id: string) => ({
                  id,
                  full_name: "Synthetic Member",
                  preferred_name: null,
                }));
          return {
            data: rows.slice(v.window[0], v.window[1] + 1),
            count: rows.length,
            error: null,
          };
        });
        queries.push({ table, query });
        return query;
      }),
    };
    const result = await (listChannelAssigneeOptions as any)({
      data: { channel_id: channel, expected_viewer_id: viewer },
      context: { userId: viewer, supabase },
    });
    expect(result.options).toHaveLength(605);
    const memberQueries = queries.filter((v) => v.table === "channel_members");
    expect(memberQueries).toHaveLength(2);
    for (const { query } of memberQueries) {
      expect(query.is).toHaveBeenCalledWith("left_at", null);
      expect(query.eq).toHaveBeenCalledWith("channel_id", channel);
      expect(query.select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    }
    for (const { query } of queries.filter((v) => v.table === "profiles"))
      expect(query.filters.id.length).toBeLessThanOrEqual(100);
  });
  it.each([
    { data: [], count: null, error: null },
    { data: [], count: 1, error: null },
    { data: null, count: 0, error: null },
  ])(
    "rejects incomplete memberships rather than invent unassigned-only options %#",
    async (row) => {
      await expect(
        (listChannelAssigneeOptions as any)({
          data: { channel_id: channel },
          context: { userId: viewer, supabase: db(q(row)) },
        }),
      ).rejects.toThrow("couldn't load all");
    },
  );
  it("rejects failed profile reads after complete membership", async () => {
    await expect(
      (listChannelAssigneeOptions as any)({
        data: { channel_id: channel },
        context: {
          userId: viewer,
          supabase: db(
            q({
              data: [{ id: messageId, user_id: other, member_role: "member" }],
              count: 1,
              error: null,
            }),
            q({ data: null, count: null, error: { message: "denied" } }),
          ),
        },
      }),
    ).rejects.toThrow("couldn't load all");
  });
  it("retains a verified empty member list and legacy no-hint input", async () => {
    expect(
      await (listChannelAssigneeOptions as any)({
        data: { channel_id: channel },
        context: { userId: viewer, supabase: db(q({ data: [], count: 0, error: null })) },
      }),
    ).toEqual({ options: [] });
  });
});
