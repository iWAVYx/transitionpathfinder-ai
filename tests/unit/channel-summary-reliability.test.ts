import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (input: unknown) => input;
    const builder = {
      middleware: () => builder,
      validator: (fn: typeof parse) => {
        parse = fn;
        return builder;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getChannelTileSummary } from "@/lib/channel-tile-summary.functions";
function members(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `member-${i}`,
    channel_id: `channel-${i}`,
    muted: false,
    channels: {
      id: `channel-${i}`,
      title: `Sample ${i}`,
      kind: "student_team",
      last_message_at: "2026-10-14T10:00:00Z",
      archived_at: null as string | null,
    },
  }));
}
function fixture(
  rows = members(1),
  options: {
    fail?: string;
    badCount?: number | null;
    missingCollectionCount?: boolean;
    failPage?: number;
    changingCount?: boolean;
  } = {},
) {
  const calls: {
    table: string;
    query: any;
    ids: string[];
    head: boolean;
    kind?: string;
    due?: boolean;
    channel?: string;
  }[] = [];
  const from = vi.fn((table: string) => {
    const call: (typeof calls)[number] = { table, query: null, ids: [], head: false };
    const q: any = {};
    q.select = vi.fn((_cols: string, settings: any) => {
      call.head = !!settings?.head;
      return q;
    });
    q.eq = vi.fn((field: string, value: string) => {
      if (field === "kind") call.kind = value;
      if (field === "channel_id") call.channel = value;
      return q;
    });
    q.in = vi.fn((_field: string, ids: string[]) => {
      if (_field === "channel_id") call.ids = ids;
      return q;
    });
    for (const method of ["is", "order", "gt", "not"]) q[method] = vi.fn(() => q);
    q.lte = vi.fn(() => {
      call.due = true;
      return q;
    });
    q.range = vi.fn(async (start: number, end: number) => {
      const collection =
        table === "channel_members"
          ? rows
          : call.ids.map((id) => ({ channel_id: id, last_read_at: "2026-10-13T10:00:00Z" }));
      const failed =
        options.fail === table || (options.failPage === start && table === "channel_members");
      return {
        data: failed ? null : collection.slice(start, end + 1),
        error: failed ? new Error("Private collection detail") : null,
        count: options.missingCollectionCount
          ? null
          : collection.length + (options.changingCount && start > 0 ? 1 : 0),
      };
    });
    q.then = (yes: any, no: any) => {
      const key =
        table === "channel_messages"
          ? "unread"
          : table === "channel_actions"
            ? call.due
              ? "deadlines"
              : call.kind === "decision"
                ? "decisions"
                : "assigned"
            : table === "channel_mentions"
              ? "mentions"
              : "connections";
      const failed = options.fail === key;
      const count =
        failed && "badCount" in options
          ? options.badCount
          : table === "channel_messages"
            ? 2
            : call.ids.length || 0;
      return Promise.resolve({
        count,
        error: failed && !("badCount" in options) ? new Error("Private count detail") : null,
      }).then(yes, no);
    };
    call.query = q;
    calls.push(call);
    return q;
  });
  return { calls, context: { userId: "viewer-a", supabase: { from } } };
}
describe("complete caller-scoped channel summary", () => {
  it("keeps unseen mention counts aligned with current message/channel visibility", async () => {
    const input = fixture();
    const original = input.context.supabase.from;
    const rows = [
      { caller: true, seen: false, removed: false, messageVisible: true, channelVisible: true },
      { caller: true, seen: true, removed: false, messageVisible: true, channelVisible: true },
      { caller: false, seen: false, removed: false, messageVisible: true, channelVisible: true },
      { caller: true, seen: false, removed: true, messageVisible: true, channelVisible: true },
      { caller: true, seen: false, removed: false, messageVisible: false, channelVisible: true },
      { caller: true, seen: false, removed: false, messageVisible: true, channelVisible: false },
    ];
    input.context.supabase.from = vi.fn((table: string) => {
      const query = original(table);
      if (table === "channel_mentions")
        query.then = (yes: any, no: any) => {
          const selected = query.select.mock.calls[0][0];
          const hasIs = (field: string) =>
            query.is.mock.calls.some(([key, value]: any[]) => key === field && value === null);
          const caller = query.eq.mock.calls.some(
            ([key, value]: any[]) => key === "mentioned_user_id" && value === "viewer-a",
          );
          const visible = rows.filter(
            (row) =>
              (!caller || row.caller) &&
              (!hasIs("seen_at") || !row.seen) &&
              (!hasIs("channel_messages.deleted_at") || !row.removed) &&
              (!selected.includes("channel_messages!inner") || row.messageVisible) &&
              (!selected.includes("channels!inner") || row.channelVisible),
          );
          return Promise.resolve({ count: visible.length, error: null }).then(yes, no);
        };
      return query;
    });
    const result = await (getChannelTileSummary as any)({
      data: { expected_viewer_id: "viewer-a" },
      context: input.context,
    });
    expect(result.mentions).toBe(1);
    const query = input.calls.find((call) => call.table === "channel_mentions")!.query;
    expect(query.select).toHaveBeenCalledWith(
      "id,channel_messages!inner(id,deleted_at),channels!inner(id)",
      { count: "exact", head: true },
    );
    expect(query.eq).toHaveBeenCalledWith("mentioned_user_id", "viewer-a");
    expect(query.is).toHaveBeenCalledWith("channel_messages.deleted_at", null);
    expect(query.is).toHaveBeenCalledWith("seen_at", null);
  });
  it("loads all membership pages and bounds receipt/action id batches", async () => {
    const input = fixture(members(605));
    const result = await (getChannelTileSummary as any)({
      data: { expected_viewer_id: "viewer-a" },
      context: input.context,
    });
    expect(result).toMatchObject({
      unreadChannels: 605,
      unreadMessages: 1210,
      decisionsPending: 605,
      upcomingDeadlines: 605,
    });
    expect(result.recent).toHaveLength(3);
    const memberships = input.calls.filter((c) => c.table === "channel_members");
    expect(memberships).toHaveLength(2);
    for (const { query } of memberships) {
      expect(query.eq).toHaveBeenCalledWith("user_id", "viewer-a");
      expect(query.is).toHaveBeenCalledWith("left_at", null);
      expect(query.order).toHaveBeenCalledWith("id");
      expect(query.select.mock.calls[0][1]).toEqual({ count: "exact" });
    }
    const reads = input.calls.filter((c) => c.table === "channel_message_reads");
    expect(reads.map((c) => c.ids.length)).toEqual([100, 100, 100, 100, 100, 100, 5]);
    for (const { query } of reads) {
      expect(query.eq).toHaveBeenCalledWith("user_id", "viewer-a");
      expect(query.order).toHaveBeenCalledWith("channel_id");
    }
    for (const call of input.calls.filter((c) => c.table === "channel_actions" && c.ids.length))
      expect(call.ids.length).toBeLessThanOrEqual(100);
    const unread = input.calls.find((c) => c.table === "channel_messages")!;
    expect(unread.query.gt).toHaveBeenCalledWith("created_at", "2026-10-13T10:00:00Z");
  });
  it("retains mute/archive meanings without replacing successful zeros with errors", async () => {
    const rows = members(3);
    rows[1].muted = true;
    rows[2].channels.archived_at = "2026-10-14";
    const input = fixture(rows);
    const result = await (getChannelTileSummary as any)({ context: input.context });
    expect(result.unreadChannels).toBe(1);
    expect(result.unreadMessages).toBe(2);
    expect(result.recent).toHaveLength(2);
    expect(result.recent.find((c: any) => c.id === "channel-1")).toMatchObject({
      muted: true,
      unread: 2,
    });
    const empty = fixture([]);
    expect(await (getChannelTileSummary as any)({ context: empty.context })).toEqual({
      unreadChannels: 0,
      unreadMessages: 0,
      mentions: 0,
      assignedOpen: 0,
      decisionsPending: 0,
      upcomingDeadlines: 0,
      connectionRequests: 0,
      recent: [],
    });
  });
  it.each([
    "channel_members",
    "channel_message_reads",
    "unread",
    "mentions",
    "assigned",
    "decisions",
    "deadlines",
    "connections",
  ])("rejects %s failures instead of fabricating zeros", async (fail) => {
    const input = fixture(members(1), { fail });
    await expect((getChannelTileSummary as any)({ context: input.context })).rejects.toThrow(
      "We couldn't load all your channel counts. Please try again.",
    );
  });
  it.each([null, -1, 0.5, Number.NaN])("rejects missing or invalid count %s", async (badCount) => {
    const input = fixture(members(1), { fail: "mentions", badCount });
    await expect((getChannelTileSummary as any)({ context: input.context })).rejects.toThrow(
      "couldn't load all your channel counts",
    );
  });
  it.each([{ missingCollectionCount: true }, { failPage: 500 }, { changingCount: true }])(
    "does not expose partial collections %#",
    async (options) => {
      const input = fixture(members(605), options);
      await expect((getChannelTileSummary as any)({ context: input.context })).rejects.toThrow(
        "couldn't load all your channel counts",
      );
    },
  );
  it("rejects changed-viewer intent before reading anything", async () => {
    const input = fixture();
    await expect(
      (getChannelTileSummary as any)({
        data: { expected_viewer_id: "departed" },
        context: input.context,
      }),
    ).rejects.toThrow("sign-in changed");
    expect(input.context.supabase.from).not.toHaveBeenCalled();
  });
});
