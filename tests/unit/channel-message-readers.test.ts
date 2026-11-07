import { describe, it, expect, vi } from "vitest";
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
import {
  listPinnedMessages,
  listMyBookmarks,
  listChannelBookmarkIds,
} from "@/lib/channel-messages.functions";
import { validatePinnedRead, validateBookmarkRead } from "@/lib/channel-message-read-contract";
const viewer = "viewer-a",
  channel = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const uid = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const date = "2026-10-15T00:00:00Z";
function message(i = 1, patch: any = {}) {
  return {
    id: uid(i),
    channel_id: channel,
    author_id: viewer,
    parent_id: null,
    body: `Pinned ${i}`,
    pinned: true,
    edited_at: null,
    deleted_at: null,
    created_at: date,
    ...patch,
  };
}
function bookmark(i = 1, patch: any = {}) {
  return {
    id: uid(i + 10000),
    user_id: viewer,
    channel_id: channel,
    message_id: uid(i),
    note: null,
    created_at: date,
    channel_messages: {
      id: uid(i),
      channel_id: channel,
      body: `Saved ${i}`,
      author_id: viewer,
      created_at: date,
      deleted_at: null,
    },
    channels: { id: channel, title: "Current channel" },
    ...patch,
  };
}
function query(rows: any[], patch: any = {}) {
  const q: any = { filters: {}, window: [0, 499] };
  for (const method of ["select", "order"]) q[method] = vi.fn(() => q);
  for (const method of ["eq", "is", "in"])
    q[method] = vi.fn((key: string, value: any) => {
      q.filters[key] = value;
      return q;
    });
  q.range = vi.fn((a: number, b: number) => {
    q.window = [a, b];
    return q;
  });
  q.then = (a: any, b: any) =>
    Promise.resolve({
      data: rows.slice(q.window[0], q.window[1] + 1),
      count: rows.length,
      error: null,
      ...patch,
    }).then(a, b);
  return q;
}
function call(fn: any, data: any, ...queries: any[]) {
  const from = vi.fn(() => {
    const next = queries.shift();
    if (!next) throw Error("Unexpected query");
    return next;
  });
  return {
    from,
    result: Promise.resolve().then(() =>
      fn({ data, context: { userId: viewer, supabase: { from } } }),
    ),
  };
}
describe("complete caller-scoped pinned and bookmarked message reads", () => {
  it.each([listPinnedMessages, listMyBookmarks, listChannelBookmarkIds])(
    "rejects wrong viewer before queries",
    async (fn) => {
      const c = call(fn, { channel_id: channel, expected_viewer_id: "other" });
      await expect(c.result).rejects.toThrow();
      expect(c.from).not.toHaveBeenCalled();
    },
  );
  it("loads 1,205 pins beyond the old cap with complete profile metadata", async () => {
    const rows = Array.from({ length: 1205 }, (_, i) => message(i + 1));
    const q = query(rows),
      profiles = query([{ id: viewer, full_name: "Recorded Name", preferred_name: null }]);
    const c = call(listPinnedMessages, { channel_id: channel }, q, q, q, profiles);
    const result = await c.result;
    expect(result.pinned).toHaveLength(1205);
    expect(result.pinned[1204].author_name).toBe("Recorded Name");
    expect(q.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
    expect(q.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(q.eq).toHaveBeenCalledWith("pinned", true);
    expect(q.is).toHaveBeenCalledWith("deleted_at", null);
    expect(q.order).toHaveBeenCalledWith("id");
    expect(q.select.mock.calls[0][1]).toEqual({ count: "exact" });
  });
  it("keeps Member fallback only for profiles absent under successful caller visibility", async () => {
    const result = await call(
      listPinnedMessages,
      { channel_id: channel },
      query([message()]),
      query([]),
    ).result;
    expect(result.pinned[0].author_name).toBe("Member");
  });
  it.each([
    { channel_id: other },
    { pinned: false },
    { deleted_at: date },
    { id: "bad" },
    { created_at: "bad" },
  ])("rejects foreign/deleted/malformed pin %j", async (patch) => {
    await expect(
      call(listPinnedMessages, { channel_id: channel }, query([message(1, patch)])).result,
    ).rejects.toThrow();
  });
  it("rejects duplicate pins", async () => {
    await expect(
      call(listPinnedMessages, { channel_id: channel }, query([message(), message()])).result,
    ).rejects.toThrow();
  });
  it.each([{ error: { message: "private" } }, { data: null }, { count: null }, { count: 2 }])(
    "fails incomplete pin reads %j",
    async (patch) => {
      const q = query([message()], patch);
      await expect(
        call(listPinnedMessages, { channel_id: channel }, q, q).result,
      ).rejects.toThrow();
    },
  );
  it.each([{ error: { message: "private" } }, { count: null }, { data: null }, { count: 1 }])(
    "fails unavailable/incomplete author metadata %j",
    async (patch) => {
      await expect(
        call(
          listPinnedMessages,
          { channel_id: channel },
          query([message()]),
          query([], patch),
          query([], patch),
        ).result,
      ).rejects.toThrow();
    },
  );
  it.each([listChannelBookmarkIds, listMyBookmarks])(
    "loads all 605 owned visible bookmarks with stable paging",
    async (fn) => {
      const rows = Array.from({ length: 605 }, (_, i) => bookmark(i + 1)),
        q = query(rows);
      const result = await call(fn, { channel_id: channel }, q, q).result;
      expect(fn === listMyBookmarks ? result.bookmarks : result.message_ids).toHaveLength(605);
      expect(q.range.mock.calls).toEqual([
        [0, 499],
        [500, 999],
      ]);
      expect(q.eq).toHaveBeenCalledWith("user_id", viewer);
      expect(q.is).toHaveBeenCalledWith("channel_messages.deleted_at", null);
      expect(q.order).toHaveBeenCalledWith("id");
      expect(q.select.mock.calls[0][1]).toEqual({ count: "exact" });
      if (fn === listChannelBookmarkIds) expect(q.eq).toHaveBeenCalledWith("channel_id", channel);
    },
  );
  it.each([listChannelBookmarkIds, listMyBookmarks])(
    "rejects foreign owner and duplicate message entries",
    async (fn) => {
      await expect(
        call(fn, { channel_id: channel }, query([bookmark(1, { user_id: "another" })])).result,
      ).rejects.toThrow();
      await expect(
        call(fn, { channel_id: channel }, query([bookmark(), bookmark(2, { message_id: uid(1) })]))
          .result,
      ).rejects.toThrow();
    },
  );
  it.each([listChannelBookmarkIds, listMyBookmarks])(
    "supports legacy no-viewer hints and actual empty reads",
    async (fn) => {
      await expect(
        call(fn, fn === listMyBookmarks ? undefined : { channel_id: channel }, query([])).result,
      ).resolves.toEqual(
        fn === listMyBookmarks ? { bookmarks: [] } : { channel_id: channel, message_ids: [] },
      );
    },
  );
  it.each([listChannelBookmarkIds, listMyBookmarks])(
    "does not turn missing counts or denied reads into empty bookmarks",
    async (fn) => {
      await expect(
        call(fn, { channel_id: channel }, query([], { count: null })).result,
      ).rejects.toThrow();
      await expect(
        call(fn, { channel_id: channel }, query([], { error: { message: "denied" } })).result,
      ).rejects.toThrow();
    },
  );
  it.each([listChannelBookmarkIds, listMyBookmarks])(
    "rejects wrong message, missing/ambiguous joins and removed sources",
    async (fn) => {
      for (const patch of [
        { channel_messages: null },
        { channel_messages: [] },
        { channel_messages: [bookmark().channel_messages, bookmark().channel_messages] },
        { channel_messages: { ...bookmark().channel_messages, id: other } },
        { channel_messages: { ...bookmark().channel_messages, channel_id: other } },
        { channel_messages: { ...bookmark().channel_messages, deleted_at: date } },
        { channels: { id: other, title: "Other" } },
      ])
        await expect(
          call(fn, { channel_id: channel }, query([bookmark(1, patch)])).result,
        ).rejects.toThrow();
    },
  );
  it("accepts exactly one joined row and preserves original recorded fields", async () => {
    const row = bookmark();
    row.note = "Recorded note";
    const result = await call(
      listMyBookmarks,
      {},
      query([{ ...row, channel_messages: [row.channel_messages], channels: [row.channels] }]),
    ).result;
    expect(result.bookmarks[0]).toEqual({
      id: row.id,
      channel_id: channel,
      message_id: row.message_id,
      note: "Recorded note",
      created_at: date,
      message_body: "Saved 1",
      message_author_id: viewer,
      message_created_at: date,
      channel_title: "Current channel",
    });
    expect(result.bookmarks[0]).not.toHaveProperty("user_id");
  });
  it("rejects a foreign channel from the channel-specific reader", async () => {
    await expect(
      call(
        listChannelBookmarkIds,
        { channel_id: channel },
        query([
          bookmark(1, {
            channel_id: other,
            channels: { id: other },
            channel_messages: { ...bookmark().channel_messages, channel_id: other },
          }),
        ]),
      ).result,
    ).rejects.toThrow();
  });
  it("validates client pin and bookmark source context", () => {
    expect(
      validatePinnedRead(
        { channel_id: channel, pinned: [{ ...message(), author_name: null }] },
        channel,
      ).pinned,
    ).toHaveLength(1);
    expect(
      validateBookmarkRead({ channel_id: channel, message_ids: [uid(1)] }, channel).message_ids,
    ).toEqual([uid(1)]);
    for (const bad of [
      { channel_id: other, pinned: [] },
      { channel_id: channel, pinned: [{ ...message(), author_name: null, pinned: false }] },
      {
        channel_id: channel,
        pinned: [
          { ...message(), author_name: null },
          { ...message(), author_name: null },
        ],
      },
    ])
      expect(() => validatePinnedRead(bad, channel)).toThrow();
    for (const bad of [
      { channel_id: other, message_ids: [] },
      { channel_id: channel, message_ids: [uid(1), uid(1)] },
      { channel_id: channel, message_ids: ["bad"] },
    ])
      expect(() => validateBookmarkRead(bad, channel)).toThrow();
  });
  it.each([
    [{ id: "another", full_name: "Foreign", preferred_name: null }],
    [
      { id: viewer, full_name: "A", preferred_name: null },
      { id: viewer, full_name: "B", preferred_name: null },
    ],
    [{ id: viewer, full_name: 123, preferred_name: null }],
  ])("rejects foreign/duplicate/malformed profile results %j", async (profiles) => {
    await expect(
      call(listPinnedMessages, { channel_id: channel }, query([message()]), query(profiles)).result,
    ).rejects.toThrow();
  });
});
