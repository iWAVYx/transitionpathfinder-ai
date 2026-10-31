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
import { listThreadMessages } from "@/lib/channel-messages.functions";
import { sendChannelMessage } from "@/lib/channels.functions";
const channel = "11111111-1111-4111-8111-111111111111",
  parentId = "22222222-2222-4222-8222-222222222222",
  other = "33333333-3333-4333-8333-333333333333";
function message(patch: any = {}) {
  return {
    id: parentId,
    channel_id: channel,
    parent_id: null,
    author_id: null,
    body: "Recorded",
    deleted_at: null,
    ...patch,
  };
}
function q(result: any) {
  const query: any = {
    then: (a: any, b: any) => Promise.resolve(result).then(a, b),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  for (const m of ["select", "eq", "order", "limit", "in", "gt", "insert"])
    query[m] = vi.fn(() => query);
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
const input = { parent_id: parentId, expected_channel_id: channel, expected_viewer_id: "viewer-a" };
describe("thread reads and reply parent scope", () => {
  it("rejects changed viewer before any query", async () => {
    const supabase = db();
    await expect(
      (listThreadMessages as any)({ data: input, context: { userId: "viewer-b", supabase } }),
    ).rejects.toThrow("sign-in changed");
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it.each([null, message({ id: other }), message({ channel_id: other })])(
    "rejects missing/mismatched parent before reply/profile reads %#",
    async (parent) => {
      const supabase = db(q({ data: parent, error: null }));
      await expect(
        (listThreadMessages as any)({ data: input, context: { userId: "viewer-a", supabase } }),
      ).rejects.toThrow("Thread not available");
      expect(supabase.from).toHaveBeenCalledOnce();
    },
  );
  it("keeps legacy no-hint callers and filters replies to the parent channel", async () => {
    const replies = q({ data: [], error: null });
    const supabase = db(q({ data: message(), error: null }), replies);
    const result = await (listThreadMessages as any)({
      data: { parent_id: parentId },
      context: { userId: "viewer-a", supabase },
    });
    expect(result.hasMore).toBe(false);
    expect(replies.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(replies.eq).toHaveBeenCalledWith("parent_id", parentId);
    expect(replies.limit).toHaveBeenCalledWith(201);
    expect(replies.order).toHaveBeenCalledWith("id", { ascending: true });
  });
  it("bounds visible replies to 200 with explicit hasMore", async () => {
    const rows = Array.from({ length: 201 }, () => message({ id: other, parent_id: parentId }));
    const result = await (listThreadMessages as any)({
      data: input,
      context: {
        userId: "viewer-a",
        supabase: db(q({ data: message(), error: null }), q({ data: rows, error: null })),
      },
    });
    expect(result.replies).toHaveLength(200);
    expect(result.hasMore).toBe(true);
  });
  it.each([
    null,
    [message({ parent_id: other })],
    [message({ parent_id: parentId, channel_id: other })],
  ])("rejects unavailable or other-thread reply collections %#", async (rows) => {
    await expect(
      (listThreadMessages as any)({
        data: input,
        context: {
          userId: "viewer-a",
          supabase: db(q({ data: message(), error: null }), q({ data: rows, error: null })),
        },
      }),
    ).rejects.toThrow("Thread replies unavailable");
  });
  it.each([
    { data: null, error: null },
    { data: message({ channel_id: other }), error: null },
    { data: message({ id: other }), error: null },
    { data: message({ deleted_at: "2026-10-15" }), error: null },
    { data: null, error: { message: "denied" } },
  ])("rejects missing/wrong/removed reply parent before dedupe or insert %#", async (parent) => {
    const supabase = db(q(parent));
    await expect(
      (sendChannelMessage as any)({
        data: {
          channel_id: channel,
          parent_id: parentId,
          body: "Reply",
          expected_viewer_id: "viewer-a",
        },
        context: { userId: "viewer-a", supabase },
      }),
    ).rejects.toThrow("no longer available for replies");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("sends after parent confirmation with actual caller and original parent", async () => {
    const parent = q({ data: message(), error: null }),
      lookup = q({ data: null, error: null }),
      saved = q({
        data: message({ id: other, parent_id: parentId, author_id: "viewer-a" }),
        error: null,
      });
    const result = await (sendChannelMessage as any)({
      data: {
        channel_id: channel,
        parent_id: parentId,
        body: "Reply",
        expected_viewer_id: "viewer-a",
      },
      context: { userId: "viewer-a", supabase: db(parent, lookup, saved) },
    });
    expect(parent.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(saved.insert).toHaveBeenCalledWith(
      expect.objectContaining({ author_id: "viewer-a", parent_id: parentId, channel_id: channel }),
    );
    expect(result.message.parent_id).toBe(parentId);
  });
});
