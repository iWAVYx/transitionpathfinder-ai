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
  editChannelMessage,
  deleteChannelMessage,
  setMessagePinned,
  toggleBookmark,
  listMessageAttachments,
  getAttachmentDownloadUrl,
} from "@/lib/channel-messages.functions";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  attachmentId = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444",
  viewer = "viewer-a";
function message(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    author_id: viewer,
    body: "Recorded message",
    deleted_at: null,
    ...patch,
  };
}
function attachment(patch: any = {}) {
  return {
    id: attachmentId,
    channel_id: channel,
    message_id: id,
    storage_path: "synthetic/file",
    file_name: "privacy-safe-note.txt",
    scan_status: "clean",
    ...patch,
  };
}
function q(result: any) {
  const query: any = { patch: null, rangeValue: null, values: null };
  const resolve = () => (typeof result === "function" ? result(query) : result);
  query.then = (a: any, b: any) => Promise.resolve(resolve()).then(a, b);
  query.maybeSingle = vi.fn(async () => resolve());
  query.single = vi.fn(async () => resolve());
  for (const method of ["select", "eq", "is", "in", "order", "delete"])
    query[method] = vi.fn(() => query);
  query.update = vi.fn((patch: any) => {
    query.patch = patch;
    return query;
  });
  query.insert = vi.fn((values: any) => {
    query.values = values;
    return query;
  });
  query.range = vi.fn((from: number, to: number) => {
    query.rangeValue = [from, to];
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
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://storage.example/synthetic" },
          error: null,
        }),
      })),
    },
  };
}
async function call(fn: any, data: any, supabase: any) {
  return fn({ data, context: { userId: viewer, supabase } });
}
const intent = { message_id: id, expected_channel_id: channel, expected_viewer_id: viewer };
describe("message action negative intent and ownership", () => {
  it.each([
    [editChannelMessage, { ...intent, body: "Edit" }],
    [deleteChannelMessage, intent],
    [setMessagePinned, { ...intent, pinned: true }],
    [toggleBookmark, intent],
    [listMessageAttachments, { message_ids: [id] }],
    [getAttachmentDownloadUrl, { attachment_id: attachmentId }],
  ])("rejects departed caller before every endpoint effect %#", async (fn, input) => {
    const supabase = db();
    await expect(call(fn, { ...input, expected_viewer_id: "departed" }, supabase)).rejects.toThrow(
      "sign-in changed",
    );
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });
  it.each([
    [editChannelMessage, { body: "Edit" }],
    [deleteChannelMessage, {}],
    [setMessagePinned, { pinned: true }],
    [toggleBookmark, {}],
  ])("rejects a message from another channel before writes/RPC %#", async (fn, extra) => {
    const supabase = db(q({ data: message({ channel_id: other }), error: null }));
    await expect(call(fn, { ...intent, ...extra }, supabase)).rejects.toThrow(
      "no longer available",
    );
    expect(supabase.from).toHaveBeenCalledOnce();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it.each([editChannelMessage, deleteChannelMessage])(
    "does not give another author mutation access %#",
    async (fn) => {
      const supabase = db(
        q({
          data: message({
            author_id: "other",
            deleted_at: fn === deleteChannelMessage ? "2026-10-15" : null,
          }),
          error: null,
        }),
      );
      await expect(call(fn, { ...intent, body: "Edit" }, supabase)).rejects.toThrow(
        "Only the author",
      );
      expect(supabase.from).toHaveBeenCalledOnce();
    },
  );
  it("rejects a stale edit baseline before history or update", async () => {
    const supabase = db(q({ data: message({ body: "Changed elsewhere" }), error: null }));
    await expect(
      call(
        editChannelMessage,
        { ...intent, body: "Edit", expected_body: "Recorded message" },
        supabase,
      ),
    ).rejects.toThrow("changed while you were editing");
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("keeps legacy same-body edit acknowledgement without new writes", async () => {
    const supabase = db(q({ data: message(), error: null }));
    expect(
      await call(editChannelMessage, { message_id: id, body: "Recorded message" }, supabase),
    ).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it("confirms the edited caller/channel/body/time and preserves the prior-body history", async () => {
    const history = q({ error: null }),
      saved = q((query: any) => ({ data: message(query.patch), error: null }));
    expect(
      await call(
        editChannelMessage,
        { ...intent, body: "Edited", expected_body: "Recorded message" },
        db(q({ data: message(), error: null }), history, saved),
      ),
    ).toEqual({ ok: true });
    expect(history.insert).toHaveBeenCalledWith({
      message_id: id,
      channel_id: channel,
      editor_id: viewer,
      previous_body: "Recorded message",
    });
    expect(saved.eq).toHaveBeenCalledWith("author_id", viewer);
    expect(saved.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(saved.eq).toHaveBeenCalledWith("body", "Recorded message");
    expect(saved.is).toHaveBeenCalledWith("deleted_at", null);
  });
  it.each([
    null,
    message({ body: "wrong" }),
    message({ id: other }),
    message({ author_id: "other" }),
  ])("rejects an unconfirmed edit row %#", async (row) => {
    await expect(
      call(
        editChannelMessage,
        { ...intent, body: "Edit" },
        db(q({ data: message(), error: null }), q({ error: null }), q({ data: row, error: null })),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
  it("stops before edit update if history logging fails", async () => {
    const supabase = db(
      q({ data: message(), error: null }),
      q({ error: { message: "history unavailable" } }),
    );
    await expect(call(editChannelMessage, { ...intent, body: "Edit" }, supabase)).rejects.toThrow(
      "history unavailable",
    );
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it("confirms deletion under the actual author/channel filters", async () => {
    const saved = q((query: any) => ({ data: message(query.patch), error: null }));
    expect(
      await call(deleteChannelMessage, intent, db(q({ data: message(), error: null }), saved)),
    ).toEqual({ ok: true });
    expect(saved.eq).toHaveBeenCalledWith("author_id", viewer);
    expect(saved.eq).toHaveBeenCalledWith("channel_id", channel);
    expect(saved.is).toHaveBeenCalledWith("deleted_at", null);
  });
  it.each([
    null,
    message({ deleted_at: null }),
    message({ deleted_at: "2026-10-15", body: "still visible" }),
    message({ deleted_at: "2026-10-15", body: "", channel_id: other }),
  ])("does not acknowledge unconfirmed deletion %#", async (row) => {
    await expect(
      call(
        deleteChannelMessage,
        intent,
        db(q({ data: message(), error: null }), q({ data: row, error: null })),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
  it("acknowledges an already deleted author-owned message without another write", async () => {
    const supabase = db(q({ data: message({ deleted_at: "2026-10-15" }), error: null }));
    expect(await call(deleteChannelMessage, intent, supabase)).toEqual({ ok: true });
    expect(supabase.from).toHaveBeenCalledOnce();
  });
  it.each([false, null, "true", {}, 1])(
    "requires a true admin RPC result before pinning %#",
    async (value) => {
      const supabase = db(q({ data: message(), error: null }));
      supabase.rpc.mockResolvedValue({ data: value, error: null });
      await expect(call(setMessagePinned, { ...intent, pinned: true }, supabase)).rejects.toThrow(
        "Only channel admins",
      );
      expect(supabase.from).toHaveBeenCalledOnce();
      expect(supabase.rpc).toHaveBeenCalledWith("is_channel_admin", {
        _channel_id: channel,
        _user_id: viewer,
      });
    },
  );
  it.each([true, false])("confirms pin state and actor for pinned=%s", async (pinned) => {
    const saved = q((query: any) => ({
      data: { id, channel_id: channel, ...query.patch },
      error: null,
    }));
    expect(
      await call(
        setMessagePinned,
        { ...intent, pinned },
        db(q({ data: message(), error: null }), saved),
      ),
    ).toEqual({ ok: true });
    expect(saved.is).toHaveBeenCalledWith("deleted_at", null);
    expect(saved.patch.pinned_by).toBe(pinned ? viewer : null);
  });
  it("rejects an unconfirmed pin", async () => {
    await expect(
      call(
        setMessagePinned,
        { ...intent, pinned: true },
        db(q({ data: message(), error: null }), q({ data: null, error: null })),
      ),
    ).rejects.toThrow("couldn't confirm");
  });
});
describe("desired bookmark state and caller ownership", () => {
  it.each([
    [true, { id: attachmentId }],
    [false, null],
  ])("does not toggle away from already-desired %s state", async (desired, existing) => {
    const supabase = db(q({ data: message(), error: null }), q({ data: existing, error: null }));
    expect(await call(toggleBookmark, { ...intent, bookmarked: desired }, supabase)).toEqual({
      bookmarked: desired,
    });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });
  it("inserts only the actual viewer/message/channel and confirms saved identity", async () => {
    const lookup = q({ data: null, error: null }),
      saved = q((query: any) => ({ data: query.values, error: null }));
    expect(
      await call(
        toggleBookmark,
        { ...intent, bookmarked: true },
        db(q({ data: message(), error: null }), lookup, saved),
      ),
    ).toEqual({ bookmarked: true });
    expect(lookup.eq).toHaveBeenCalledWith("user_id", viewer);
    expect(saved.insert).toHaveBeenCalledWith({
      user_id: viewer,
      channel_id: channel,
      message_id: id,
      note: null,
    });
  });
  it("deletes only the caller's original bookmark", async () => {
    const removed = q({ data: { id: attachmentId }, error: null });
    expect(
      await call(
        toggleBookmark,
        { ...intent, bookmarked: false },
        db(
          q({ data: message(), error: null }),
          q({ data: { id: attachmentId }, error: null }),
          removed,
        ),
      ),
    ).toEqual({ bookmarked: false });
    expect(removed.eq).toHaveBeenCalledWith("user_id", viewer);
    expect(removed.eq).toHaveBeenCalledWith("message_id", id);
  });
  it("keeps legacy no-desired-state toggle compatibility", async () => {
    expect(
      await call(
        toggleBookmark,
        { message_id: id },
        db(
          q({ data: message(), error: null }),
          q({ data: { id: attachmentId }, error: null }),
          q({ data: { id: attachmentId }, error: null }),
        ),
      ),
    ).toEqual({ bookmarked: false });
  });
  it.each([true, false])(
    "rejects missing saved/deleted rows for desired=%s",
    async (bookmarked) => {
      await expect(
        call(
          toggleBookmark,
          { ...intent, bookmarked },
          db(
            q({ data: message(), error: null }),
            q({ data: bookmarked ? null : { id: attachmentId }, error: null }),
            q({ data: null, error: null }),
          ),
        ),
      ).rejects.toThrow("couldn't confirm");
    },
  );
});
describe("complete scoped attachment reads and clean signed downloads", () => {
  it("returns every counted attachment in bounded message/page requests", async () => {
    const rows = Array.from({ length: 1205 }, (_, i) =>
      attachment({ id: `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa` }),
    );
    const queries: any[] = [];
    const supabase = {
      from: vi.fn(() => {
        const query = q((v: any) => ({
          data: rows.slice(v.rangeValue[0], v.rangeValue[1] + 1),
          count: rows.length,
          error: null,
        }));
        queries.push(query);
        return query;
      }),
    };
    const result = await call(
      listMessageAttachments,
      { message_ids: [id], expected_channel_id: channel, expected_viewer_id: viewer },
      supabase,
    );
    expect(result.attachments).toHaveLength(1205);
    expect(queries).toHaveLength(3);
    expect(queries[0].select).toHaveBeenCalledWith(expect.any(String), { count: "exact" });
    for (const query of queries) {
      expect(query.eq).toHaveBeenCalledWith("channel_id", channel);
      expect(query.in).toHaveBeenCalledWith("message_id", [id]);
      expect(query.order).toHaveBeenCalledWith("id");
    }
  });
  it.each([
    { data: [], count: 1, error: null },
    { data: [], count: null, error: null },
    { data: null, count: 0, error: null },
    { data: [], count: 0, error: { message: "denied" } },
  ])("fails incomplete/missing/error attachment pages %#", async (result) => {
    await expect(
      call(listMessageAttachments, { message_ids: [id] }, db(q(result))),
    ).rejects.toThrow("couldn't load all");
  });
  it.each([attachment({ message_id: other }), attachment({ channel_id: other })])(
    "rejects mismatched returned attachment identity %#",
    async (row) => {
      await expect(
        call(
          listMessageAttachments,
          { message_ids: [id], expected_channel_id: channel },
          db(q({ data: [row], count: 1, error: null })),
        ),
      ).rejects.toThrow("changed");
    },
  );
  it("does not query for an empty attachment request", async () => {
    const supabase = db();
    expect(await call(listMessageAttachments, { message_ids: [] }, supabase)).toEqual({
      attachments: [],
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it.each(["pending", "infected", "failed", "deleted"])(
    "never signs a %s object",
    async (status) => {
      const supabase = db(q({ data: attachment({ scan_status: status }), error: null }));
      await expect(
        call(getAttachmentDownloadUrl, { attachment_id: attachmentId }, supabase),
      ).rejects.toThrow(/security scanning/);
      expect(supabase.storage.from).not.toHaveBeenCalled();
    },
  );
  it.each([
    attachment({ id: other }),
    attachment({ message_id: other }),
    attachment({ channel_id: other }),
  ])("rejects a different clean object before signing %#", async (row) => {
    const supabase = db(q({ data: row, error: null }));
    await expect(
      call(
        getAttachmentDownloadUrl,
        { attachment_id: attachmentId, expected_channel_id: channel, expected_message_id: id },
        supabase,
      ),
    ).rejects.toThrow("no longer matches");
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });
  it("signs a matching clean object for only the existing 60-second window", async () => {
    const signer = {
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://storage.example/synthetic" },
        error: null,
      }),
    };
    const supabase = db(q({ data: attachment(), error: null }));
    supabase.storage.from.mockReturnValue(signer);
    expect(
      await call(
        getAttachmentDownloadUrl,
        {
          attachment_id: attachmentId,
          expected_channel_id: channel,
          expected_message_id: id,
          expected_viewer_id: viewer,
        },
        supabase,
      ),
    ).toEqual({ url: "https://storage.example/synthetic" });
    expect(signer.createSignedUrl).toHaveBeenCalledWith("synthetic/file", 60, {
      download: "privacy-safe-note.txt",
    });
  });
  it("fails safely if signing returns no URL", async () => {
    const supabase = db(q({ data: attachment(), error: null }));
    supabase.storage.from.mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    await expect(
      call(getAttachmentDownloadUrl, { attachment_id: attachmentId }, supabase),
    ).rejects.toThrow("couldn't prepare");
  });
});
