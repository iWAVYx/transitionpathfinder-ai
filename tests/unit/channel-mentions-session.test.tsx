// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ list: vi.fn(), mark: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channel-tabs.functions", () => ({
  listMyMentions: api.list,
  markMentionSeen: api.mark,
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import { ChannelMentions } from "@/components/channels/ChannelMentions";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  message = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444";
const time = "2026-10-15T12:00:00Z";
let client: QueryClient, child: QueryClient, currentScope: { current: string };
function mention(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    message_id: message,
    author_id: other,
    author_name: "Synthetic Member",
    mentioned_user_id: "viewer-a",
    channel_title: "Synthetic team",
    channel_kind: "student_team",
    message_body: "Recorded mention",
    seen_at: null,
    created_at: time,
    ...patch,
  };
}
function ack(data: any, patch: any = {}) {
  return {
    ok: true,
    mention_id: data.mention_id,
    channel_id: data.expected_channel_id,
    message_id: data.expected_message_id,
    seen_at: time,
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
function Capture() {
  child = useQueryClient();
  return null;
}
function view(viewer = "viewer-a", visible = true) {
  currentScope.current = viewer;
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary
        key={viewer}
        viewerId={viewer}
        scopeKey={viewer}
        currentScope={currentScope}
      >
        <Capture />
        {visible && <ChannelMentions />}
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
async function ready() {
  await screen.findByText("Recorded mention");
}
function mark() {
  fireEvent.click(screen.getByText("Mark Seen"));
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: "viewer-a" };
  api.list.mockResolvedValue({ mentions: [mention()], hasMore: false });
  api.mark.mockImplementation(async ({ data }) => ack(data));
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("actual shared mention read and mark-seen flow", () => {
  it.each(["family", "student", "educator", "school", "district", "partner"])(
    "uses exact caller/channel/message for shared %s usage",
    async () => {
      render(view());
      await ready();
      mark();
      await screen.findByText("Seen");
      expect(api.list).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } });
      expect(api.mark).toHaveBeenCalledWith({
        data: {
          mention_id: id,
          expected_channel_id: channel,
          expected_message_id: message,
          expected_viewer_id: "viewer-a",
        },
      });
    },
  );
  it("prevents duplicate mark-seen submission", async () => {
    const pending = deferred();
    api.mark.mockReturnValue(pending.promise);
    render(view());
    await ready();
    mark();
    mark();
    await waitFor(() => expect(api.mark).toHaveBeenCalledOnce());
    await act(async () => pending.resolve(ack(api.mark.mock.calls[0][0].data)));
    await screen.findByText("Seen");
    expect(screen.queryByText("Mark Seen")).toBeNull();
  });
  it("allows independent mention acknowledgements", async () => {
    const first = deferred();
    api.list.mockResolvedValue({
      mentions: [mention(), mention({ id: other, message_body: "Second mention" })],
      hasMore: false,
    });
    api.mark.mockReturnValueOnce(first.promise);
    render(view());
    await ready();
    fireEvent.click(screen.getAllByText("Mark Seen")[0]);
    fireEvent.click(screen.getAllByText("Mark Seen")[1]);
    await waitFor(() => expect(api.mark).toHaveBeenCalledTimes(2));
    await act(async () => first.resolve(ack(api.mark.mock.calls[0][0].data)));
    expect(api.mark.mock.calls.map(([arg]) => arg.data.mention_id)).toEqual([id, other]);
  });
  it.each(["account", "tab", "unmount"])(
    "suppresses departed update success on %s",
    async (departure) => {
      const pending = deferred();
      api.mark.mockReturnValue(pending.promise);
      const ui = render(view());
      await ready();
      const invalidate = vi.spyOn(child, "invalidateQueries");
      mark();
      await waitFor(() => expect(api.mark).toHaveBeenCalledOnce());
      if (departure === "account") {
        api.list.mockResolvedValue({ mentions: [], hasMore: false });
        ui.rerender(view("viewer-b"));
      } else if (departure === "tab") ui.rerender(view("viewer-a", false));
      else ui.unmount();
      await act(async () => pending.resolve(ack(api.mark.mock.calls[0][0].data)));
      expect(invalidate).not.toHaveBeenCalled();
      expect(screen.queryByText("Seen")).toBeNull();
    },
  );
  it("ignores a late error after leaving and returning to mentions", async () => {
    const pending = deferred();
    api.mark.mockReturnValue(pending.promise);
    const ui = render(view());
    await ready();
    mark();
    await waitFor(() => expect(api.mark).toHaveBeenCalledOnce());
    ui.rerender(view("viewer-a", false));
    ui.rerender(view());
    await ready();
    await act(async () => pending.reject(new Error("late")));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it.each(["mention_id", "channel_id", "message_id", "seen_at", "ok"])(
    "rejects an unconfirmed %s acknowledgement",
    async (field) => {
      api.mark.mockImplementation(async ({ data }) =>
        ack(data, { [field]: field === "ok" ? false : "wrong" }),
      );
      render(view());
      await ready();
      mark();
      await screen.findByRole("alert");
      expect(screen.queryByText("Seen")).toBeNull();
      expect(screen.getByText("Mark Seen")).toBeTruthy();
    },
  );
  it("keeps a failed change retryable and reloads through the real query", async () => {
    api.mark.mockRejectedValueOnce(new Error("private mutation failure"));
    render(view());
    await ready();
    mark();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).not.toContain("private mutation failure");
    fireEvent.click(screen.getByText("Reload Mentions"));
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    mark();
    await screen.findByText("Seen");
  });
  it("does not offer a mutation for a recorded seen timestamp", async () => {
    api.list.mockResolvedValue({ mentions: [mention({ seen_at: time })], hasMore: false });
    render(view());
    await ready();
    expect(screen.getByText("Seen")).toBeTruthy();
    expect(screen.queryByText("Mark Seen")).toBeNull();
    expect(api.mark).not.toHaveBeenCalled();
  });
  it("distinguishes failed list reads from no mentions and retries", async () => {
    api.list.mockRejectedValueOnce(new Error("private read details"));
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByText("No mentions yet.")).toBeNull();
    fireEvent.click(screen.getByText("Reload Mentions"));
    await ready();
  });
  it("hides failed cached content on refresh and supports recovery", async () => {
    render(view());
    await ready();
    api.list.mockRejectedValueOnce(new Error("read failed"));
    fireEvent.click(screen.getByText("Refresh Mentions"));
    await screen.findByRole("alert");
    expect(screen.queryByText("Recorded mention")).toBeNull();
    fireEvent.click(screen.getByText("Reload Mentions"));
    await ready();
  });
  it.each([
    null,
    { mentions: null, hasMore: false },
    { mentions: [mention({ mentioned_user_id: "other" })], hasMore: false },
    { mentions: [mention(), mention()], hasMore: false },
    { mentions: [mention({ channel_id: "bad" })], hasMore: false },
    { mentions: [], hasMore: "unknown" },
  ])("rejects malformed or other-viewer list results %#", async (result) => {
    api.list.mockResolvedValue(result);
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByText("Recorded mention")).toBeNull();
    expect(api.mark).not.toHaveBeenCalled();
  });
  it.each(["account", "tab", "unmount"])(
    "does not render departed private reads after %s",
    async (departure) => {
      const pending = deferred();
      api.list.mockReturnValueOnce(pending.promise);
      const ui = render(view());
      await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
      if (departure === "account") {
        api.list.mockResolvedValue({ mentions: [], hasMore: false });
        ui.rerender(view("viewer-b"));
      } else if (departure === "tab") ui.rerender(view("viewer-a", false));
      else ui.unmount();
      await act(async () =>
        pending.resolve({
          mentions: [mention({ message_body: "Departed private mention" })],
          hasMore: false,
        }),
      );
      expect(screen.queryByText("Departed private mention")).toBeNull();
    },
  );
  it("discloses older mentions beyond the displayed window", async () => {
    api.list.mockResolvedValue({ mentions: [mention()], hasMore: true });
    render(view());
    await ready();
    expect(screen.getByText(/50 most recent mentions/)).toBeTruthy();
  });
});
