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
import {
  listMyChannels,
  listChannelMessages,
  sendChannelMessage,
  markChannelRead,
} from "@/lib/channels.functions";
import {
  prepareChannelAttachmentUpload,
  failChannelAttachmentUpload,
  scanChannelAttachment,
} from "@/lib/channel-messages.functions";
import {
  listMyChatHistory,
  readChatHistory,
  downloadChatHistoryAttachment,
} from "@/lib/channel-history.functions";
const channelId = "11111111-1111-4111-8111-111111111111";
const messageId = "22222222-2222-4222-8222-222222222222";
const attachmentId = "33333333-3333-4333-8333-333333333333";
const userId = "caller-viewer";
function query(result: any) {
  const q: any = {
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  for (const method of ["select", "eq", "gt", "insert", "upsert", "order", "in"])
    q[method] = vi.fn(() => q);
  return q;
}
function message(patch: any = {}) {
  return {
    id: messageId,
    channel_id: channelId,
    author_id: userId,
    parent_id: null,
    body: "Synthetic message",
    ...patch,
  };
}
describe("channel request viewer intent", () => {
  it.each([
    ["list", listMyChannels, {}],
    ["messages", listChannelMessages, { channel_id: channelId }],
    ["send", sendChannelMessage, { channel_id: channelId, body: "Synthetic message" }],
    ["receipt", markChannelRead, { channel_id: channelId, last_read_message_id: messageId }],
    ["history grants", listMyChatHistory, {}],
    ["history page", readChatHistory, { channel_id: channelId, offset: 0 }],
    ["history download", downloadChatHistoryAttachment, { attachment_id: attachmentId }],
    [
      "upload prepare",
      prepareChannelAttachmentUpload,
      {
        channel_id: channelId,
        message_id: messageId,
        file_name: "privacy-safe-document.txt",
        content_type: "text/plain",
        size_bytes: 20,
      },
    ],
    ["upload fail", failChannelAttachmentUpload, { attachment_id: attachmentId }],
    ["scan", scanChannelAttachment, { attachment_id: attachmentId }],
  ])("rejects stale %s intent before database, RPC or storage access", async (_name, fn, input) => {
    const supabase = { from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } };
    await expect(
      (fn as any)({
        data: { ...input, expected_viewer_id: "departed-viewer" },
        context: { userId, supabase },
      }),
    ).rejects.toThrow("sign-in changed");
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });
});
describe("send deduplication and original caller identity", () => {
  it("returns an existing identical message under channel/author/dedupe filters without a new insert", async () => {
    const q = query({ data: message(), error: null });
    const supabase = { from: vi.fn(() => q) };
    const result = await (sendChannelMessage as any)({
      data: {
        channel_id: channelId,
        body: "Synthetic message",
        client_dedupe_key: "original-key",
        expected_viewer_id: userId,
      },
      context: { userId, supabase },
    });
    expect(result.message.id).toBe(messageId);
    expect(q.insert).not.toHaveBeenCalled();
    expect(q.eq).toHaveBeenCalledWith("channel_id", channelId);
    expect(q.eq).toHaveBeenCalledWith("author_id", userId);
    expect(q.eq).toHaveBeenCalledWith("client_dedupe_key", "original-key");
  });
  it("rejects a dedupe read error before attempting a potentially duplicate write", async () => {
    const q = query({ data: null, error: new Error("Private read detail") });
    await expect(
      (sendChannelMessage as any)({
        data: {
          channel_id: channelId,
          body: "Synthetic message",
          client_dedupe_key: "original-key",
        },
        context: { userId, supabase: { from: () => q } },
      }),
    ).rejects.toThrow("couldn't check whether this message was already sent");
    expect(q.insert).not.toHaveBeenCalled();
  });
  it.each([
    { channel_id: "wrong" },
    { author_id: "wrong" },
    { body: "Another request" },
    { body: null },
    { parent_id: attachmentId },
  ])("does not reuse a mismatched dedupe result %#", async (patch) => {
    const q = query({ data: message(patch), error: null });
    await expect(
      (sendChannelMessage as any)({
        data: { channel_id: channelId, body: "Synthetic message", client_dedupe_key: "key" },
        context: { userId, supabase: { from: () => q } },
      }),
    ).rejects.toThrow("no longer matches");
    expect(q.insert).not.toHaveBeenCalled();
  });
  it("inserts under the actual caller and confirms the original channel", async () => {
    const lookup = query({ data: null, error: null });
    const save = query({ data: message(), error: null });
    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(save);
    const result = await (sendChannelMessage as any)({
      data: {
        channel_id: channelId,
        body: " Synthetic message ",
        client_dedupe_key: "key",
        expected_viewer_id: userId,
        author_id: "forged",
      },
      context: { userId, supabase: { from } },
    });
    expect(save.insert).toHaveBeenCalledWith({
      channel_id: channelId,
      author_id: userId,
      parent_id: null,
      body: "Synthetic message",
      client_dedupe_key: "key",
    });
    expect(result.message.channel_id).toBe(channelId);
  });
  it.each([
    null,
    message({ channel_id: "wrong" }),
    message({ author_id: "wrong" }),
    message({ id: null }),
  ])("does not claim a confirmed inserted message from an invalid row %#", async (row) => {
    const lookup = query({ data: null, error: null });
    const save = query({ data: row, error: null });
    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(save);
    await expect(
      (sendChannelMessage as any)({
        data: { channel_id: channelId, body: "Synthetic message" },
        context: { userId, supabase: { from } },
      }),
    ).rejects.toThrow("couldn't confirm this message was sent");
  });
});
describe("read receipt message and saved-row confirmation", () => {
  it("checks the message's channel before saving the caller's receipt", async () => {
    const lookup = query({ data: { id: messageId, channel_id: channelId }, error: null });
    const save = query({
      data: { channel_id: channelId, user_id: userId, last_read_message_id: messageId },
      error: null,
    });
    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(save);
    expect(
      await (markChannelRead as any)({
        data: {
          channel_id: channelId,
          last_read_message_id: messageId,
          expected_viewer_id: userId,
        },
        context: { userId, supabase: { from } },
      }),
    ).toEqual({ ok: true });
    expect(lookup.eq).toHaveBeenCalledWith("id", messageId);
    expect(lookup.eq).toHaveBeenCalledWith("channel_id", channelId);
    expect(save.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        channel_id: channelId,
        user_id: userId,
        last_read_message_id: messageId,
      }),
      { onConflict: "channel_id,user_id" },
    );
  });
  it.each([null, { id: messageId, channel_id: "wrong" }, { id: "wrong", channel_id: channelId }])(
    "cannot use a missing or foreign-channel message as read position %#",
    async (row) => {
      const lookup = query({ data: row, error: null });
      const from = vi.fn(() => lookup);
      await expect(
        (markChannelRead as any)({
          data: { channel_id: channelId, last_read_message_id: messageId },
          context: { userId, supabase: { from } },
        }),
      ).rejects.toThrow("couldn't confirm");
      expect(from).toHaveBeenCalledTimes(1);
      expect(lookup.upsert).not.toHaveBeenCalled();
    },
  );
  it.each([
    null,
    { channel_id: "wrong", user_id: userId, last_read_message_id: messageId },
    { channel_id: channelId, user_id: "wrong", last_read_message_id: messageId },
    { channel_id: channelId, user_id: userId, last_read_message_id: "wrong" },
  ])("does not confirm a missing or mismatched saved receipt %#", async (row) => {
    const lookup = query({ data: { id: messageId, channel_id: channelId }, error: null });
    const save = query({ data: row, error: null });
    const from = vi.fn().mockReturnValueOnce(lookup).mockReturnValueOnce(save);
    await expect(
      (markChannelRead as any)({
        data: { channel_id: channelId, last_read_message_id: messageId },
        context: { userId, supabase: { from } },
      }),
    ).rejects.toThrow("couldn't confirm");
  });
});

describe("complete retained history reads", () => {
  function fixture(
    options: {
      grants?: number;
      attachments?: number;
      missingCount?: boolean;
      failPage?: number;
      error?: boolean;
    } = {},
  ) {
    const calls: { table: string; q: any }[] = [];
    const from = vi.fn((table: string) => {
      const q: any = {};
      for (const method of ["select", "eq", "in", "order"]) q[method] = vi.fn(() => q);
      q.range = vi.fn(async (start: number, end: number) => {
        const all =
          table === "channel_history_grants"
            ? Array.from({ length: options.grants ?? 0 }, (_, i) => ({
                channel_id: `channel-${i}`,
                title: `Sample ${i}`,
                removed_at: "2026-10-14",
              }))
            : table === "channel_history_messages"
              ? [
                  {
                    message_id: messageId,
                    body: "Synthetic history",
                    author_name: "Sample",
                    sent_at: "2026-10-14",
                    parent_id: null,
                  },
                ]
              : Array.from({ length: options.attachments ?? 0 }, (_, i) => ({
                  attachment_id: `attachment-${i}`,
                  message_id: messageId,
                  file_name: "Sample.txt",
                }));
        return {
          data: options.failPage === start || options.error ? null : all.slice(start, end + 1),
          count: options.missingCount ? null : all.length,
          error:
            options.failPage === start || options.error
              ? new Error("Private history detail")
              : null,
        };
      });
      calls.push({ table, q });
      return q;
    });
    return { calls, context: { userId, supabase: { from } } };
  }
  it("loads every caller grant with stable count/order filters", async () => {
    const input = fixture({ grants: 605 });
    const result = await (listMyChatHistory as any)({ context: input.context });
    expect(result).toHaveLength(605);
    expect(input.calls).toHaveLength(2);
    for (const { table, q } of input.calls) {
      expect(table).toBe("channel_history_grants");
      expect(q.eq).toHaveBeenCalledWith("user_id", userId);
      expect(q.order).toHaveBeenCalledWith("channel_id");
      expect(q.select.mock.calls[0][1]).toEqual({ count: "exact" });
    }
  });
  it.each([{ missingCount: true }, { failPage: 500 }])(
    "does not return partial history grants %#",
    async (options) => {
      const input = fixture({ grants: 605, ...options });
      await expect((listMyChatHistory as any)({ context: input.context })).rejects.toThrow(
        "Could not load retained chat history",
      );
    },
  );
  it("returns page identity and every attachment for its visible message ids", async () => {
    const input = fixture({ attachments: 1205 });
    const result = await (readChatHistory as any)({
      data: { channel_id: channelId, offset: 0, expected_viewer_id: userId },
      context: input.context,
    });
    expect(result).toMatchObject({ channel_id: channelId, offset: 0, hasMore: false });
    expect(result.attachments).toHaveLength(1205);
    const messages = input.calls.find((call) => call.table === "channel_history_messages")!;
    expect(messages.q.range).toHaveBeenCalledWith(0, 50);
    const attachments = input.calls.filter((call) => call.table === "channel_history_attachments");
    expect(attachments).toHaveLength(3);
    for (const { q } of attachments) {
      expect(q.eq).toHaveBeenCalledWith("channel_id", channelId);
      expect(q.eq).toHaveBeenCalledWith("user_id", userId);
      expect(q.in).toHaveBeenCalledWith("message_id", [messageId]);
      expect(q.order).toHaveBeenCalledWith("attachment_id");
    }
  });
  it("rejects an incomplete attachment collection instead of returning a partial page", async () => {
    const input = fixture({ attachments: 1205, missingCount: true });
    await expect(
      (readChatHistory as any)({ data: { channel_id: channelId }, context: input.context }),
    ).rejects.toThrow("Could not load history attachments");
  });
});
