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
import { listMyMentions, markMentionSeen } from "@/lib/channel-tabs.functions";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  message = "33333333-3333-4333-8333-333333333333",
  author = "44444444-4444-4444-8444-444444444444",
  other = "55555555-5555-4555-8555-555555555555",
  viewer = "caller-viewer",
  time = "2026-10-15T12:00:00Z";
function mention(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    message_id: message,
    author_id: author,
    mentioned_user_id: viewer,
    seen_at: null,
    created_at: time,
    channel_messages: {
      id: message,
      channel_id: channel,
      body: "Recorded mention",
      deleted_at: null,
    },
    channels: { id: channel, title: "Synthetic team", kind: "student_team" },
    ...patch,
  };
}
function q(result: any) {
  const v: any = { patch: null };
  const resolve = () => (typeof result === "function" ? result(v) : result);
  v.then = (a: any, b: any) => Promise.resolve().then(resolve).then(a, b);
  v.maybeSingle = vi.fn(async () => resolve());
  v.single = vi.fn(async () => resolve());
  for (const method of ["select", "eq", "is", "in", "order", "range", "limit"])
    v[method] = vi.fn(() => v);
  v.update = vi.fn((patch: any) => {
    v.patch = patch;
    return v;
  });
  return v;
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
function context(supabase: any) {
  return { userId: viewer, supabase };
}
const input = {
  mention_id: id,
  expected_channel_id: channel,
  expected_message_id: message,
  expected_viewer_id: viewer,
};
const read = (data: any, supabase: any) =>
  (listMyMentions as any)({ data, context: context(supabase) });
const mark = (data: any, supabase: any) =>
  (markMentionSeen as any)({ data, context: context(supabase) });
function source(patch: any = {}) {
  return { id: message, channel_id: channel, deleted_at: null, ...patch };
}
describe("caller-specific bounded mention reads", () => {
  it("rejects changed caller before reads", async () => {
    const supabase = db();
    await expect(read({ expected_viewer_id: "departed" }, supabase)).rejects.toThrow(
      "sign-in changed",
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it("uses actual caller, stable ordering, deleted-source filter and a bounded sentinel", async () => {
    const mentions = q({ data: [mention()], error: null }),
      profiles = q({
        data: [{ id: author, full_name: "Synthetic author", preferred_name: null }],
        count: 1,
        error: null,
      });
    const result = await read({ expected_viewer_id: viewer }, db(mentions, profiles));
    expect(result.mentions[0].author_name).toBe("Synthetic author");
    expect(result.hasMore).toBe(false);
    expect(mentions.eq).toHaveBeenCalledWith("mentioned_user_id", viewer);
    expect(mentions.is).toHaveBeenCalledWith("channel_messages.deleted_at", null);
    expect(mentions.limit).toHaveBeenCalledWith(51);
    expect(mentions.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mentions.order).toHaveBeenCalledWith("id", { ascending: false });
    expect(profiles.select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    expect(profiles.in).toHaveBeenCalledWith("id", [author]);
  });
  it("returns only 50 visible rows and discloses additional mentions", async () => {
    const rows = Array.from({ length: 51 }, (_, i) =>
      mention({ id: `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa` }),
    );
    const result = await read(
      {},
      db(q({ data: rows, error: null }), q({ data: [], count: 0, error: null })),
    );
    expect(result.mentions).toHaveLength(50);
    expect(result.hasMore).toBe(true);
  });
  it("retains legacy no-hint empty reads without a profile query", async () => {
    const supabase = db(q({ data: [], error: null }));
    expect(await read(undefined, supabase)).toEqual({ mentions: [], hasMore: false });
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([
    { data: null, error: null },
    { data: [], error: { message: "denied" } },
  ])("fails unavailable/error collections %#", async (result) => {
    await expect(read({}, db(q(result)))).rejects.toThrow("couldn't load your mentions");
  });
  it.each([
    mention({ mentioned_user_id: "other" }),
    mention({ channel_messages: { ...source(), body: "wrong", id: other } }),
    mention({ channel_messages: { ...source(), body: "wrong", channel_id: other } }),
    mention({ channel_messages: { ...source(), body: "removed", deleted_at: time } }),
    mention({ channels: { id: other, title: "wrong", kind: "team" } }),
  ])("rejects another caller or mismatched/deleted joined record %#", async (row) => {
    await expect(
      read({}, db(q({ data: [row], error: null }), q({ data: [], count: 0, error: null }))),
    ).rejects.toThrow("details changed");
  });
  it("accepts the existing single-element nested relation shape", async () => {
    const row = mention();
    row.channel_messages = [row.channel_messages] as any;
    row.channels = [row.channels] as any;
    expect(
      (await read({}, db(q({ data: [row], error: null }), q({ data: [], count: 0, error: null }))))
        .mentions[0].message_body,
    ).toBe("Recorded mention");
  });
  it.each([
    { data: [], count: null, error: null },
    { data: [], count: 1, error: null },
    { data: null, count: null, error: { message: "denied" } },
  ])("does not hide incomplete profile reads behind default names %#", async (result) => {
    await expect(read({}, db(q({ data: [mention()], error: null }), q(result)))).rejects.toThrow(
      "couldn't load mention details",
    );
  });
});
describe("mark-seen original identity and confirmation", () => {
  it("rejects stale viewer intent before any query", async () => {
    const supabase = db();
    await expect(mark({ ...input, expected_viewer_id: "departed" }, supabase)).rejects.toThrow(
      "sign-in changed",
    );
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it.each([
    null,
    mention({ id: other }),
    mention({ mentioned_user_id: "other" }),
    mention({ channel_id: other }),
    mention({ message_id: other }),
  ])("rejects missing/foreign/wrong-channel or message mention %#", async (row) => {
    const supabase = db(q({ data: row, error: null }));
    await expect(mark(input, supabase)).rejects.toThrow("mention is no longer available");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([
    null,
    source({ id: other }),
    source({ channel_id: other }),
    source({ deleted_at: time }),
  ])("requires a currently visible matching nonremoved source %#", async (row) => {
    const supabase = db(q({ data: mention(), error: null }), q({ data: row, error: null }));
    await expect(mark(input, supabase)).rejects.toThrow("message is no longer available");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it("confirms only the actual caller's exact mention/message/channel with an unseen condition", async () => {
    const lookup = q({ data: mention(), error: null }),
      messageQuery = q({ data: source(), error: null }),
      save = q((v: any) => ({ data: mention(v.patch), error: null }));
    const result = await mark(input, db(lookup, messageQuery, save));
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        mention_id: id,
        channel_id: channel,
        message_id: message,
        seen_at: expect.any(String),
      }),
    );
    expect(lookup.eq).toHaveBeenCalledWith("mentioned_user_id", viewer);
    expect(messageQuery.eq).toHaveBeenCalledWith("id", message);
    expect(messageQuery.is).toHaveBeenCalledWith("deleted_at", null);
    for (const [key, value] of [
      ["id", id],
      ["mentioned_user_id", viewer],
      ["channel_id", channel],
      ["message_id", message],
    ])
      expect(save.eq).toHaveBeenCalledWith(key, value);
    expect(save.is).toHaveBeenCalledWith("seen_at", null);
  });
  it("returns the existing seen timestamp without another write for legacy input", async () => {
    const supabase = db(
      q({ data: mention({ seen_at: time }), error: null }),
      q({ data: source(), error: null }),
    );
    expect(await mark({ mention_id: id }, supabase)).toEqual({
      ok: true,
      mention_id: id,
      channel_id: channel,
      message_id: message,
      seen_at: time,
    });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it.each([
    null,
    mention({ id: other, seen_at: time }),
    mention({ channel_id: other, seen_at: time }),
    mention({ message_id: other, seen_at: time }),
    mention({ mentioned_user_id: "other", seen_at: time }),
    mention({ seen_at: null }),
    mention({ seen_at: "invalid" }),
  ])("rejects missing/mismatched/unconfirmed saved state %#", async (row) => {
    await expect(
      mark(
        input,
        db(
          q({ data: mention(), error: null }),
          q({ data: source(), error: null }),
          q({ data: row, error: null }),
        ),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
  it("does not acknowledge a resolved write error", async () => {
    await expect(
      mark(
        input,
        db(
          q({ data: mention(), error: null }),
          q({ data: source(), error: null }),
          q({ data: null, error: { message: "RLS denied" } }),
        ),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
  it("rejects an invalid prior seen timestamp after rechecking source access", async () => {
    await expect(
      mark(
        input,
        db(
          q({ data: mention({ seen_at: "invalid" }), error: null }),
          q({ data: source(), error: null }),
        ),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
});
