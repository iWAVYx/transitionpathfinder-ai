// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  load: vi.fn(),
  item: vi.fn(),
  send: vi.fn(),
  changed: vi.fn(),
  close: vi.fn(),
  toast: vi.fn(),
  callbacks: [] as (() => void)[],
  remove: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channels.functions", () => ({ sendChannelMessage: api.send }));
vi.mock("@/lib/channel-messages.functions", () => ({ listThreadMessages: api.load }));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: (...args: any[]) => {
          api.callbacks.push(args.at(-1));
          return channel;
        },
        subscribe: () => channel,
      };
      return channel;
    },
    removeChannel: api.remove,
  },
}));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: any) => <div>{children}</div>,
  SheetHeader: ({ children }: any) => <div>{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
}));
vi.mock("@/components/channels/MessageItem", () => ({
  MessageItem: (props: any) => {
    api.item(props);
    return <p>{props.m.body}</p>;
  },
  useMessageAttachments: () => ({ byMessage: new Map() }),
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import { ThreadPanel, type ThreadPanelProps } from "@/components/channels/ThreadPanel";
const channel = "11111111-1111-4111-8111-111111111111";
const parentId = "22222222-2222-4222-8222-222222222222";
const otherParent = "33333333-3333-4333-8333-333333333333";
const replyId = "44444444-4444-4444-8444-444444444444";
let client: QueryClient;
let currentScope: { current: string };
function message(patch: any = {}) {
  return {
    id: parentId,
    channel_id: channel,
    parent_id: null,
    author_id: "viewer-a",
    body: "Recorded parent",
    deleted_at: null,
    ...patch,
  };
}
function result(patch: any = {}) {
  return { parent: message(), replies: [], hasMore: false, ...patch };
}
function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
function view(patch: Partial<ThreadPanelProps> = {}, viewer = "viewer-a") {
  currentScope.current = viewer;
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary
        key={viewer}
        viewerId={viewer}
        scopeKey={viewer}
        currentScope={currentScope}
      >
        <ThreadPanel
          parentId={parentId}
          channelId={channel}
          currentUserId={viewer}
          isAdmin={false}
          bookmarkedIds={new Set()}
          onChanged={api.changed}
          onClose={api.close}
          {...patch}
        />
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
async function ready() {
  await screen.findByText("Recorded parent");
}
function type(body: string) {
  fireEvent.change(screen.getByLabelText("Thread reply"), { target: { value: body } });
}
function submit() {
  fireEvent.submit(screen.getByLabelText("Thread reply").closest("form")!);
}
beforeEach(() => {
  vi.clearAllMocks();
  api.callbacks = [];
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: "viewer-a" };
  api.load.mockResolvedValue(result());
  api.remove.mockResolvedValue(undefined);
  api.send.mockImplementation(async ({ data }) => ({
    message: message({
      id: replyId,
      parent_id: data.parent_id,
      channel_id: data.channel_id,
      author_id: data.expected_viewer_id,
      body: data.body,
    }),
  }));
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("actual thread composer context with mocked transport", () => {
  it.each(["family", "student", "educator", "school", "district", "partner"])(
    "sends a scoped reply in the shared %s view",
    async (role) => {
      render(view({ isAdmin: ["educator", "school", "district", "partner"].includes(role) }));
      await ready();
      expect(api.load).toHaveBeenCalledWith({
        data: { parent_id: parentId, expected_channel_id: channel, expected_viewer_id: "viewer-a" },
      });
      type("A recorded reply");
      submit();
      await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
      expect(api.send).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel_id: channel,
          parent_id: parentId,
          body: "A recorded reply",
          expected_viewer_id: "viewer-a",
          client_dedupe_key: expect.any(String),
        }),
      });
      expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe("");
    },
  );
  it("keeps newer edits when the original send finishes and prevents duplicate submit", async () => {
    const pending = deferred();
    api.send.mockReturnValue(pending.promise);
    render(view());
    await ready();
    type("Original reply");
    submit();
    submit();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    type("Newer draft");
    await act(async () =>
      pending.resolve({ message: message({ id: replyId, parent_id: parentId }) }),
    );
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe(
      "Newer draft",
    );
    expect(api.changed).toHaveBeenCalledOnce();
  });
  it("preserves failed drafts and reuses the dedupe key on unchanged retry", async () => {
    api.send.mockRejectedValueOnce(new Error("private server details"));
    render(view());
    await ready();
    type("Keep this");
    submit();
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect(api.toast.mock.calls[0][0]).not.toContain("private server details");
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe("Keep this");
    submit();
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(2));
    expect(api.send.mock.calls[0][0].data.client_dedupe_key).toBe(
      api.send.mock.calls[1][0].data.client_dedupe_key,
    );
  });
  it.each(["channel_id", "parent_id", "author_id", "id"])(
    "rejects a mismatched send %s without clearing the draft",
    async (field) => {
      api.send.mockResolvedValue({
        message: message({ id: replyId, parent_id: parentId, [field]: "wrong" }),
      });
      render(view());
      await ready();
      type("Preserve reply");
      submit();
      await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
      expect(api.changed).not.toHaveBeenCalled();
      expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe(
        "Preserve reply",
      );
    },
  );
  it.each(["account", "parent", "close", "unmount"])(
    "suppresses departed send completion on %s",
    async (kind) => {
      const pending = deferred();
      api.send.mockReturnValue(pending.promise);
      const ui = render(view());
      await ready();
      type("Old draft");
      submit();
      await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
      if (kind === "account") ui.rerender(view({}, "viewer-b"));
      else if (kind === "parent") ui.rerender(view({ parentId: otherParent }));
      else if (kind === "close") ui.rerender(view({ parentId: null }));
      else ui.unmount();
      await act(async () =>
        pending.resolve({ message: message({ id: replyId, parent_id: parentId }) }),
      );
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("does not resurface an old failure after A-to-B-to-A", async () => {
    const pending = deferred();
    api.send.mockReturnValue(pending.promise);
    const ui = render(view());
    await ready();
    type("Old");
    submit();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    ui.rerender(view({ parentId: otherParent }));
    ui.rerender(view());
    await ready();
    type("Current draft");
    await act(async () => pending.reject(new Error("late")));
    expect(api.toast).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe(
      "Current draft",
    );
  });
  it("offers read retry and blocks submission during failure", async () => {
    api.load.mockRejectedValueOnce(new Error("private read details"));
    render(view());
    await screen.findByRole("alert");
    type("Retain me");
    submit();
    expect(api.send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Reload Thread"));
    await ready();
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe("Retain me");
    submit();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
  });
  it.each([
    result({ parent: message({ channel_id: otherParent }) }),
    result({ replies: [message({ id: replyId, parent_id: otherParent })] }),
    result({ hasMore: undefined }),
  ])("rejects malformed or other-thread reads %#", async (data) => {
    api.load.mockResolvedValue(data);
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByText("Recorded parent")).toBeNull();
    type("No send");
    submit();
    expect(api.send).not.toHaveBeenCalled();
  });
  it.each([{ readOnly: true }, { parentDeleted: true }])(
    "blocks archived or removed-parent replies %#",
    async (mode) => {
      if (mode.parentDeleted)
        api.load.mockResolvedValue(
          result({ parent: message({ deleted_at: "2026-10-15T00:00:00Z" }) }),
        );
      render(view({ readOnly: !!mode.readOnly }));
      await ready();
      type("Blocked");
      submit();
      expect(api.send).not.toHaveBeenCalled();
    },
  );
  it("shows the bounded-window notice", async () => {
    api.load.mockResolvedValue(result({ hasMore: true }));
    render(view());
    await ready();
    expect(screen.getByText(/Showing the first 200 replies/)).toBeTruthy();
  });
  it("ignores a departed realtime callback", async () => {
    const ui = render(view());
    await ready();
    const callback = api.callbacks[0];
    ui.unmount();
    const calls = api.load.mock.calls.length;
    await act(async () => callback());
    expect(api.load).toHaveBeenCalledTimes(calls);
    expect(api.remove).toHaveBeenCalled();
  });
  it.each(["account", "parent", "close", "unmount"])(
    "ignores a departed thread read on %s",
    async (kind) => {
      const pending = deferred();
      api.load.mockReturnValueOnce(pending.promise);
      const ui = render(view());
      await waitFor(() => expect(api.load).toHaveBeenCalledOnce());
      if (kind === "account") ui.rerender(view({}, "viewer-b"));
      else if (kind === "parent") ui.rerender(view({ parentId: otherParent }));
      else if (kind === "close") ui.rerender(view({ parentId: null }));
      else ui.unmount();
      await act(async () =>
        pending.resolve(result({ parent: message({ body: "Departed private message" }) })),
      );
      expect(screen.queryByText("Departed private message")).toBeNull();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("submits Enter once and ignores empty submission", async () => {
    render(view());
    await ready();
    submit();
    expect(api.send).not.toHaveBeenCalled();
    type("Keyboard reply");
    fireEvent.keyDown(screen.getByLabelText("Thread reply"), { key: "Enter", shiftKey: false });
    await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
    expect(api.send).toHaveBeenCalledOnce();
  });
  it("refreshes only the active thread on realtime events", async () => {
    render(view());
    await ready();
    await act(async () => api.callbacks[0]());
    await waitFor(() => expect(api.load).toHaveBeenCalledTimes(2));
    expect(api.load.mock.calls[1][0].data.parent_id).toBe(parentId);
  });
  it("can refresh after an unconfirmed send and keeps the draft if the read fails", async () => {
    api.send.mockRejectedValueOnce(new Error("unconfirmed"));
    const ui = render(view());
    await ready();
    type("Recover this reply");
    submit();
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    api.load.mockRejectedValueOnce(new Error("reload failed"));
    fireEvent.click(screen.getByText("Refresh Thread"));
    await screen.findByRole("alert");
    expect(screen.queryByText("Recorded parent")).toBeNull();
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe(
      "Recover this reply",
    );
    submit();
    expect(api.send).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText("Reload Thread"));
    await ready();
    expect((screen.getByLabelText("Thread reply") as HTMLTextAreaElement).value).toBe(
      "Recover this reply",
    );
    ui.unmount();
  });
  it("does not read for a mismatched viewer prop", async () => {
    render(view({ currentUserId: "other" }));
    expect(api.load).not.toHaveBeenCalled();
    type("Blocked");
    submit();
    expect(api.send).not.toHaveBeenCalled();
  });
});

it("passes unknown bookmark state to both the parent and replies", async () => {
  api.load.mockResolvedValueOnce(
    result({ replies: [message({ id: replyId, parent_id: parentId, body: "Recorded reply" })] }),
  );
  const v = render(
    view({ bookmarksAvailable: false, bookmarkedIds: new Set([parentId, replyId]) }),
  );
  await screen.findByText("Recorded reply");
  expect(
    api.item.mock.calls
      .filter(([p]: any) => p.m.id === parentId || p.m.id === replyId)
      .every(([p]: any) => p.bookmarked === null),
  ).toBe(true);
  v.rerender(view({ bookmarksAvailable: true, bookmarkedIds: new Set([parentId, replyId]) }));
  await waitFor(() => expect(api.item.mock.calls.at(-1)?.[0].bookmarked).toBe(true));
});
