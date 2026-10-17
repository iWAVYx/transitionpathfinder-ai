// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  edit: vi.fn(),
  remove: vi.fn(),
  pin: vi.fn(),
  bookmark: vi.fn(),
  attachments: vi.fn(),
  download: vi.fn(),
  open: vi.fn(),
  changed: vi.fn(),
  reply: vi.fn(),
  promote: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channel-messages.functions", () => ({
  editChannelMessage: api.edit,
  deleteChannelMessage: api.remove,
  setMessagePinned: api.pin,
  toggleBookmark: api.bookmark,
  listMessageAttachments: api.attachments,
  getAttachmentDownloadUrl: api.download,
}));
vi.mock("@/lib/channel-attachment-download.browser", () => ({ openChannelAttachment: api.open }));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import {
  MessageItem,
  useMessageAttachments,
  type MessageItemProps,
} from "@/components/channels/MessageItem";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  attachmentId = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444";
let client: QueryClient, currentScope: { current: string };
function message(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    author_id: "viewer-a",
    parent_id: null,
    body: "Recorded message",
    pinned: false,
    edited_at: null,
    deleted_at: null,
    created_at: "2026-10-15T00:00:00Z",
    author_name: "Synthetic Member",
    ...patch,
  };
}
function attachment(patch: any = {}) {
  return {
    id: attachmentId,
    message_id: id,
    channel_id: channel,
    storage_path: "synthetic/file",
    file_name: "privacy-safe-note.txt",
    content_type: "text/plain",
    size_bytes: 100,
    scan_status: "clean",
    uploaded_by: "viewer-a",
    created_at: "2026-10-15T00:00:00Z",
    ...patch,
  };
}
function deferred<T = any>() {
  let resolve!: (v: T) => void, reject!: (e: any) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function wrap(children: any, viewer = "viewer-a") {
  currentScope.current = viewer;
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary
        key={viewer}
        viewerId={viewer}
        scopeKey={viewer}
        currentScope={currentScope}
      >
        {children}
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
function view(patch: Partial<MessageItemProps> = {}, viewer = "viewer-a") {
  return wrap(
    <MessageItem
      m={message()}
      currentUserId={viewer}
      isAdmin={true}
      bookmarked={false}
      attachments={[]}
      onReply={api.reply}
      onPromote={api.promote}
      onChanged={api.changed}
      {...patch}
    />,
    viewer,
  );
}
function edit(body = "Edited draft") {
  fireEvent.click(screen.getByText("Edit"));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: body } });
  fireEvent.click(screen.getByText("Save"));
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: "viewer-a" };
  api.edit.mockResolvedValue({ ok: true });
  api.remove.mockResolvedValue({ ok: true });
  api.pin.mockResolvedValue({ ok: true });
  api.bookmark.mockResolvedValue({ bookmarked: true });
  api.download.mockResolvedValue({ url: "https://storage.example/synthetic" });
  api.attachments.mockResolvedValue({ attachments: [] });
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.unstubAllGlobals();
});
describe("actual message actions with mocked menu shell and transport", () => {
  it.each(["family", "student", "educator", "school", "district", "partner"])(
    "binds shared %s bookmark intent to viewer/message/channel",
    async () => {
      render(view());
      fireEvent.click(screen.getByTitle("Bookmark"));
      await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
      expect(api.bookmark).toHaveBeenCalledWith({
        data: {
          message_id: id,
          expected_channel_id: channel,
          expected_viewer_id: "viewer-a",
          bookmarked: true,
        },
      });
    },
  );
  it.each(["edit", "delete", "pin", "bookmark"])(
    "confirms %s once and blocks duplicate clicks",
    async (kind) => {
      const pending = deferred();
      const fn = kind === "delete" ? api.remove : api[kind as "edit" | "pin" | "bookmark"];
      fn.mockReturnValue(pending.promise);
      render(view());
      if (kind === "edit") {
        edit();
        fireEvent.click(screen.getByText("Save"));
      } else {
        const button =
          kind === "delete"
            ? screen.getByText("Delete")
            : screen.getByTitle(kind === "pin" ? "Pin" : "Bookmark");
        fireEvent.click(button);
        fireEvent.click(button);
      }
      await waitFor(() => expect(fn).toHaveBeenCalledOnce());
      expect(fn.mock.calls[0][0].data).toEqual(
        expect.objectContaining({
          message_id: id,
          expected_channel_id: channel,
          expected_viewer_id: "viewer-a",
        }),
      );
      await act(async () =>
        pending.resolve(kind === "bookmark" ? { bookmarked: true } : { ok: true }),
      );
      expect(api.changed).toHaveBeenCalledOnce();
    },
  );
  it.each(["body", "admin", "bookmark", "pin", "author"])(
    "ignores a captured action success after displayed %s state changes",
    async (change) => {
      const pending = deferred();
      api.pin.mockReturnValue(pending.promise);
      const ui = render(view());
      fireEvent.click(screen.getByTitle("Pin"));
      await waitFor(() => expect(api.pin).toHaveBeenCalledOnce());
      ui.rerender(
        view(
          change === "body"
            ? { m: message({ body: "Refreshed message" }) }
            : change === "admin"
              ? { isAdmin: false }
              : change === "pin"
                ? { m: message({ pinned: true }) }
                : change === "author"
                  ? { m: message({ author_id: "other" }) }
                  : { bookmarked: true },
        ),
      );
      await act(async () => pending.resolve({ ok: true }));
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it.each(["body", "admin", "bookmark", "pin", "author"])(
    "ignores a captured action error after displayed %s state changes",
    async (change) => {
      const pending = deferred();
      api.pin.mockReturnValue(pending.promise);
      const ui = render(view());
      fireEvent.click(screen.getByTitle("Pin"));
      await waitFor(() => expect(api.pin).toHaveBeenCalledOnce());
      ui.rerender(
        view(
          change === "body"
            ? { m: message({ body: "Refreshed message" }) }
            : change === "admin"
              ? { isAdmin: false }
              : change === "pin"
                ? { m: message({ pinned: true }) }
                : change === "author"
                  ? { m: message({ author_id: "other" }) }
                  : { bookmarked: true },
        ),
      );
      await act(async () => pending.reject(new Error("departed")));
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("retains newer edits when an earlier save finishes", async () => {
    const pending = deferred();
    api.edit.mockReturnValue(pending.promise);
    render(view());
    edit("Original submitted edit");
    await waitFor(() => expect(api.edit).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Newer unsaved edit" } });
    await act(async () => pending.resolve({ ok: true }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Newer unsaved edit");
    expect(api.edit.mock.calls[0][0].data.expected_body).toBe("Recorded message");
  });
  it.each(["account", "message", "unmount"])(
    "ignores old action success after %s departure",
    async (kind) => {
      const pending = deferred();
      api.pin.mockReturnValue(pending.promise);
      const ui = render(view());
      fireEvent.click(screen.getByTitle("Pin"));
      await waitFor(() => expect(api.pin).toHaveBeenCalledOnce());
      if (kind === "account") ui.rerender(view({}, "viewer-b"));
      else if (kind === "message") ui.rerender(view({ m: message({ id: other }) }));
      else ui.unmount();
      await act(async () => pending.resolve({ ok: true }));
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("suppresses old failures after message A-to-B-to-A", async () => {
    const pending = deferred();
    api.edit.mockReturnValue(pending.promise);
    const ui = render(view());
    edit();
    await waitFor(() => expect(api.edit).toHaveBeenCalledOnce());
    ui.rerender(view({ m: message({ id: other }) }));
    ui.rerender(view());
    await act(async () => pending.reject(new Error("late")));
    expect(api.toast).not.toHaveBeenCalled();
    expect(api.changed).not.toHaveBeenCalled();
  });
  it.each([{}, { ok: false }])("keeps an unconfirmed edit draft %#", async (result) => {
    api.edit.mockResolvedValue(result);
    render(view());
    edit("Retain draft");
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("Retain draft");
    expect(api.changed).not.toHaveBeenCalled();
  });
  it("rejects a wrong bookmark response", async () => {
    api.bookmark.mockResolvedValue({ bookmarked: false });
    render(view());
    fireEvent.click(screen.getByTitle("Bookmark"));
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect(api.changed).not.toHaveBeenCalled();
  });
  it("preserves the editing baseline when recorded content refreshes", async () => {
    const ui = render(view());
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "My draft" } });
    ui.rerender(view({ m: message({ body: "Changed elsewhere" }) }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("My draft");
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(api.edit).toHaveBeenCalledOnce());
    expect(api.edit.mock.calls[0][0].data.expected_body).toBe("Recorded message");
  });
  it("keeps archived edit/delete/pin controls disabled while retaining personal bookmarking", async () => {
    render(view({ readOnly: true }));
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByTitle("Pin"));
    expect(api.edit).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
    expect(api.pin).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle("Bookmark"));
    await waitFor(() => expect(api.bookmark).toHaveBeenCalledOnce());
  });
  it("does not offer author or admin actions to another member", () => {
    render(view({ m: message({ author_id: "other" }), isAdmin: false }));
    expect(screen.queryByText("Edit")).toBeNull();
    expect(screen.queryByText("Delete")).toBeNull();
    expect(screen.queryByTitle("Pin")).toBeNull();
  });
  it("does not act after a declined delete confirmation", () => {
    vi.stubGlobal("confirm", () => false);
    render(view());
    fireEvent.click(screen.getByText("Delete"));
    expect(api.remove).not.toHaveBeenCalled();
  });
  it("ignores mutation controls when the viewer prop is mismatched", () => {
    render(view({ currentUserId: "other" }));
    fireEvent.click(screen.getByTitle("Bookmark"));
    expect(api.bookmark).not.toHaveBeenCalled();
  });
});
describe("clean attachment download context", () => {
  it("opens one scoped clean attachment", async () => {
    const pending = deferred();
    api.download.mockReturnValue(pending.promise);
    render(view({ attachments: [attachment()] }));
    const button = screen.getByTitle("Download privacy-safe-note.txt");
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(api.download).toHaveBeenCalledOnce());
    expect(api.download).toHaveBeenCalledWith({
      data: {
        attachment_id: attachmentId,
        expected_channel_id: channel,
        expected_message_id: id,
        expected_viewer_id: "viewer-a",
      },
    });
    await act(async () => pending.resolve({ url: "https://storage.example/synthetic" }));
    expect(api.open).toHaveBeenCalledWith("https://storage.example/synthetic");
  });
  it.each(["pending", "infected", "failed", "deleted"])("blocks %s downloads", (status) => {
    render(view({ attachments: [attachment({ scan_status: status })] }));
    fireEvent.click(screen.getByText("privacy-safe-note.txt"));
    expect(api.download).not.toHaveBeenCalled();
  });
  it("omits attachments from another message/channel", () => {
    render(
      view({ attachments: [attachment({ message_id: other }), attachment({ channel_id: other })] }),
    );
    expect(screen.queryByText("privacy-safe-note.txt")).toBeNull();
  });
  it.each(["account", "message", "status", "unmount"])(
    "suppresses departed download navigation on %s",
    async (kind) => {
      const pending = deferred();
      api.download.mockReturnValue(pending.promise);
      const ui = render(view({ attachments: [attachment()] }));
      fireEvent.click(screen.getByTitle("Download privacy-safe-note.txt"));
      await waitFor(() => expect(api.download).toHaveBeenCalledOnce());
      if (kind === "account") ui.rerender(view({ attachments: [attachment()] }, "viewer-b"));
      else if (kind === "message") ui.rerender(view({ m: message({ id: other }) }));
      else if (kind === "status")
        ui.rerender(view({ attachments: [attachment({ scan_status: "pending" })] }));
      else ui.unmount();
      await act(async () => pending.resolve({ url: "https://storage.example/synthetic" }));
      expect(api.open).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("shows a controlled download error and permits retry", async () => {
    api.download.mockRejectedValueOnce(new Error("private details"));
    render(view({ attachments: [attachment()] }));
    fireEvent.click(screen.getByTitle("Download privacy-safe-note.txt"));
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect(api.toast.mock.calls[0][0]).not.toContain("private details");
    fireEvent.click(screen.getByTitle("Download privacy-safe-note.txt"));
    await waitFor(() => expect(api.open).toHaveBeenCalledOnce());
  });
});
function Probe({ ids, channelId = channel }: { ids: string[]; channelId?: string }) {
  const result = useMessageAttachments(ids, channelId);
  return (
    <div>
      <p>{result.error ? "Attachments unavailable" : "Ready"}</p>
      {[...result.byMessage.values()].flat().map((a) => (
        <p key={a.id}>{a.file_name}</p>
      ))}
      <button onClick={() => void result.refetch()}>Retry Attachments</button>
    </div>
  );
}
describe("actual attachment query batching and recovery", () => {
  it("splits a 201-message thread into accepted batches", async () => {
    const ids = Array.from(
      { length: 201 },
      (_, i) => `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    );
    render(wrap(<Probe ids={ids} />));
    await waitFor(() => expect(api.attachments).toHaveBeenCalledTimes(2));
    expect(api.attachments.mock.calls.map(([arg]) => arg.data.message_ids.length)).toEqual([
      200, 1,
    ]);
    expect(api.attachments.mock.calls[0][0].data.expected_viewer_id).toBe("viewer-a");
  });
  it("hides cached attachments after a failed refresh and allows retry", async () => {
    api.attachments.mockResolvedValueOnce({ attachments: [attachment()] });
    render(wrap(<Probe ids={[id]} />));
    await screen.findByText("privacy-safe-note.txt");
    api.attachments.mockRejectedValueOnce(new Error("read failure"));
    fireEvent.click(screen.getByText("Retry Attachments"));
    await screen.findByText("Attachments unavailable");
    expect(screen.queryByText("privacy-safe-note.txt")).toBeNull();
    api.attachments.mockResolvedValue({ attachments: [attachment()] });
    fireEvent.click(screen.getByText("Retry Attachments"));
    await screen.findByText("privacy-safe-note.txt");
  });
  it.each([
    null,
    { attachments: null },
    { attachments: [attachment({ message_id: other })] },
    { attachments: [attachment({ channel_id: other })] },
  ])("rejects malformed/cross-context attachment reads %#", async (result) => {
    api.attachments.mockResolvedValue(result);
    render(wrap(<Probe ids={[id]} />));
    await screen.findByText("Attachments unavailable");
    expect(screen.queryByText("privacy-safe-note.txt")).toBeNull();
  });
  it("does not continue batches after departure", async () => {
    const pending = deferred();
    api.attachments.mockReturnValueOnce(pending.promise);
    const ids = Array.from(
      { length: 201 },
      (_, i) => `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    );
    const ui = render(wrap(<Probe ids={ids} />));
    await waitFor(() => expect(api.attachments).toHaveBeenCalledOnce());
    ui.unmount();
    await act(async () => pending.resolve({ attachments: [] }));
    expect(api.attachments).toHaveBeenCalledOnce();
  });
});

describe("unknown bookmark state", () => {
  it("disables changes until the caller's bookmark read is available", async () => {
    const v = render(view({ bookmarked: null }));
    const button = screen.getByTitle("Bookmarks unavailable");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(api.bookmark).not.toHaveBeenCalled();
    v.rerender(view({ bookmarked: false }));
    fireEvent.click(screen.getByTitle("Bookmark"));
    await waitFor(() => expect(api.bookmark).toHaveBeenCalledOnce());
  });
  it("does not acknowledge a result after bookmark visibility becomes unknown", async () => {
    const d = deferred();
    api.bookmark.mockReturnValueOnce(d.promise);
    const v = render(view());
    fireEvent.click(screen.getByTitle("Bookmark"));
    v.rerender(view({ bookmarked: null }));
    await act(async () => d.resolve({ bookmarked: true }));
    expect(api.changed).not.toHaveBeenCalled();
  });
});
