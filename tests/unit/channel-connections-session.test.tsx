// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  list: vi.fn(),
  respond: vi.fn(),
  withdraw: vi.fn(),
  open: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channel-connection-requests.functions", () => ({
  listMyConnectionRequests: api.list,
  respondToConnectionRequest: api.respond,
  withdrawConnectionRequest: api.withdraw,
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import { ChannelConnectionRequests } from "@/components/channels/ChannelConnectionRequests";
import { ConnectionRequestsDrawer } from "@/components/channels/ConnectionRequestsDrawer";
const id = "11111111-1111-4111-8111-111111111111",
  viewer = "22222222-2222-4222-8222-222222222222",
  requester = "33333333-3333-4333-8333-333333333333",
  org = "44444444-4444-4444-8444-444444444444",
  channel = "55555555-5555-4555-8555-555555555555",
  other = "66666666-6666-4666-8666-666666666666",
  future = new Date(Date.now() + 86400000).toISOString();
let client: QueryClient, child: QueryClient, currentScope: { current: string };
function request(patch: any = {}) {
  return {
    id,
    status: "pending",
    message: "Synthetic request",
    purpose_category: "transition",
    proposed_next_step: null,
    created_at: new Date().toISOString(),
    expires_at: future,
    requester_id: requester,
    requester_name: "Synthetic Member",
    requester_organization_id: null,
    requester_organization_name: null,
    target_partner_organization_id: org,
    target_partner_organization_name: "Synthetic Partner",
    resulting_channel_id: null,
    direction: "incoming",
    can_respond: true,
    can_withdraw: false,
    channel_ready: false,
    ...patch,
  };
}
function ack(args: any) {
  return {
    ok: true,
    request_id: args.request_id,
    status: args.decision ?? "withdrawn",
    channel_id: args.decision === "accepted" ? channel : null,
    channel_ready: args.decision === "accepted",
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
function view(user = viewer, visible = true, drawer = false) {
  currentScope.current = user;
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary key={user} viewerId={user} scopeKey={user} currentScope={currentScope}>
        <Capture />
        {visible &&
          (drawer ? (
            <ConnectionRequestsDrawer onOpenChannel={api.open} />
          ) : (
            <ChannelConnectionRequests onOpenChannel={api.open} />
          ))}
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
async function ready() {
  await screen.findByText("Synthetic request");
}
function choose(label = "Accept") {
  fireEvent.click(screen.getByRole("button", { name: label, exact: true }));
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: viewer };
  api.list.mockResolvedValue({ requests: [request()] });
  api.respond.mockImplementation(async ({ data }) => ack(data));
  api.withdraw.mockImplementation(async ({ data }) => ack(data));
  api.open.mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("actual shared connection decisions with mocked transport", () => {
  it.each(["educator", "school", "district", "partner"])(
    "captures original request and actor for shared %s controls",
    async () => {
      render(view());
      await ready();
      choose();
      await screen.findByRole("status");
      expect(api.respond).toHaveBeenCalledWith({
        data: expect.objectContaining({
          request_id: id,
          decision: "accepted",
          expected_viewer_id: viewer,
          expected_requester_id: requester,
          expected_requester_organization_id: null,
          expected_target_organization_id: org,
          expected_expires_at: future,
          expected_message: "Synthetic request",
        }),
      });
      expect(api.open).not.toHaveBeenCalled();
      choose("Open Channel");
      await waitFor(() => expect(api.open).toHaveBeenCalledWith(channel));
    },
  );
  it.each(["Accept", "Decline"])("locks competing decisions while %s is pending", async (label) => {
    const pending = deferred();
    api.respond.mockReturnValue(pending.promise);
    render(view());
    await ready();
    choose(label);
    choose(label === "Accept" ? "Decline" : "Accept");
    await waitFor(() => expect(api.respond).toHaveBeenCalledOnce());
    await act(async () => pending.resolve(ack(api.respond.mock.calls[0][0].data)));
    await screen.findByRole("status");
    expect(screen.queryByRole("button", { name: "Accept", exact: true })).toBeNull();
  });
  it("uses requester-only withdrawal intent for outgoing requests", async () => {
    api.list.mockResolvedValue({
      requests: [
        request({
          requester_id: viewer,
          direction: "outgoing",
          can_respond: false,
          can_withdraw: true,
        }),
      ],
    });
    render(view());
    await ready();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    choose("Withdraw");
    await screen.findByRole("status");
    expect(api.withdraw.mock.calls[0][0].data.expected_requester_id).toBe(viewer);
    expect(api.respond).not.toHaveBeenCalled();
  });
  it.each(["account", "close", "unmount"])(
    "suppresses departed decision effects on %s",
    async (departure) => {
      const pending = deferred();
      api.respond.mockReturnValue(pending.promise);
      const ui = render(view());
      await ready();
      const invalidation = vi.spyOn(child, "invalidateQueries");
      choose();
      await waitFor(() => expect(api.respond).toHaveBeenCalledOnce());
      if (departure === "account") {
        api.list.mockResolvedValue({ requests: [] });
        ui.rerender(view(other));
      } else if (departure === "close") ui.rerender(view(viewer, false));
      else ui.unmount();
      await act(async () => pending.resolve(ack(api.respond.mock.calls[0][0].data)));
      expect(invalidation).not.toHaveBeenCalled();
      expect(api.open).not.toHaveBeenCalled();
    },
  );
  it("does not show old failure after closing and reopening", async () => {
    const pending = deferred();
    api.respond.mockReturnValue(pending.promise);
    const ui = render(view());
    await ready();
    choose();
    await waitFor(() => expect(api.respond).toHaveBeenCalledOnce());
    ui.rerender(view(viewer, false));
    ui.rerender(view());
    await ready();
    await act(async () => pending.reject(new Error("late")));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("suppresses callbacks when displayed request terms change", async () => {
    const pending = deferred();
    api.respond.mockReturnValue(pending.promise);
    render(view());
    await ready();
    const invalidation = vi.spyOn(child, "invalidateQueries");
    choose();
    await waitFor(() => expect(api.respond).toHaveBeenCalledOnce());
    api.list.mockResolvedValue({ requests: [request({ message: "Updated terms" })] });
    choose("Refresh Requests");
    await screen.findByText("Updated terms");
    invalidation.mockClear();
    await act(async () => pending.resolve(ack(api.respond.mock.calls[0][0].data)));
    expect(invalidation).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });
  it.each(["ok", "request_id", "status", "channel_id", "channel_ready"])(
    "rejects unconfirmed %s responses",
    async (field) => {
      api.respond.mockImplementation(async ({ data }) => ({
        ...ack(data),
        [field]: field === "ok" ? false : field === "channel_ready" ? "unknown" : "wrong",
      }));
      render(view());
      await ready();
      choose();
      await screen.findByRole("alert");
      expect(screen.queryByRole("status")).toBeNull();
      expect(api.open).not.toHaveBeenCalled();
    },
  );
  it("keeps accepted setup failures distinct and prevents reacceptance", async () => {
    api.respond.mockImplementation(async ({ data }) => ({
      ...ack(data),
      channel_id: null,
      channel_ready: false,
    }));
    render(view());
    await ready();
    choose();
    await screen.findByText(/channel setup or access needs review/);
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open Channel" })).toBeNull();
    expect(api.respond).toHaveBeenCalledOnce();
  });
  it("lets authoritative refreshed readiness replace prior positive acknowledgement", async () => {
    render(view());
    await ready();
    choose();
    await screen.findByRole("button", { name: "Open Channel" });
    api.list.mockResolvedValue({
      requests: [
        request({
          status: "accepted",
          can_respond: false,
          resulting_channel_id: channel,
          channel_ready: false,
        }),
      ],
    });
    choose("Refresh Requests");
    await screen.findByText(/channel setup or access needs review/);
    expect(screen.queryByRole("button", { name: "Open Channel" })).toBeNull();
  });
  it("keeps confirmed decisions separate from a failed channel navigation", async () => {
    api.open.mockRejectedValueOnce(new Error("navigation failed"));
    render(view());
    await ready();
    choose();
    await screen.findByRole("button", { name: "Open Channel" });
    choose("Open Channel");
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).toContain("connection is confirmed");
    choose("Open Channel");
    await waitFor(() => expect(api.open).toHaveBeenCalledTimes(2));
    expect(api.respond).toHaveBeenCalledOnce();
  });
  it("disables expired pending requests before mutation", async () => {
    api.list.mockResolvedValue({
      requests: [
        request({ expires_at: new Date(Date.now() - 1000).toISOString(), can_respond: false }),
      ],
    });
    render(view());
    await ready();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("expired");
  });
  it("does not expose controls without verified flags", async () => {
    api.list.mockResolvedValue({ requests: [request({ can_respond: false })] });
    render(view());
    await ready();
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    expect(api.respond).not.toHaveBeenCalled();
  });
  it("distinguishes read errors from no requests and retries", async () => {
    api.list.mockRejectedValueOnce(new Error("private read error"));
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByText("No connection requests yet.")).toBeNull();
    choose("Reload Requests");
    await ready();
  });
  it("hides cached requests on failed refresh", async () => {
    render(view());
    await ready();
    api.list.mockRejectedValueOnce(new Error("read failed"));
    choose("Refresh Requests");
    await screen.findByRole("alert");
    expect(screen.queryByText("Synthetic request")).toBeNull();
  });
  it.each([
    { requests: null },
    { requests: [request({ direction: "outgoing" })] },
    { requests: [request(), request()] },
    { requests: [request({ channel_ready: true })] },
  ])("rejects malformed or inconsistent reads %#", async (response) => {
    api.list.mockResolvedValue(response);
    render(view());
    await screen.findByRole("alert");
    expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
  });
  it("can browse older resolved requests from the complete loaded collection", async () => {
    api.list.mockResolvedValue({
      requests: Array.from({ length: 12 }, (_, i) =>
        request({
          id: `${(i + 1).toString(16).padStart(8, "0")}-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
          status: "declined",
          can_respond: false,
          message: `Resolved request ${i + 1}`,
        }),
      ),
    });
    render(view());
    await screen.findByText("Resolved request 1");
    expect(screen.queryByText("Resolved request 12")).toBeNull();
    choose("Show More Resolved Requests");
    await screen.findByText("Resolved request 12");
  });
  it("ignores a departed read after account change", async () => {
    const pending = deferred();
    api.list.mockReturnValueOnce(pending.promise);
    const ui = render(view());
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
    api.list.mockResolvedValue({ requests: [] });
    ui.rerender(view(other));
    await act(async () =>
      pending.resolve({ requests: [request({ message: "Departed private request" })] }),
    );
    expect(screen.queryByText("Departed private request")).toBeNull();
  });
});
describe("actual drawer shares the scoped panel", () => {
  it("does not read until opened and uses the same decision endpoint", async () => {
    render(view(viewer, true, true));
    expect(api.list).not.toHaveBeenCalled();
    choose("Open connection requests");
    await ready();
    choose();
    await screen.findByRole("button", { name: "Open Channel" });
    choose("Open Channel");
    await waitFor(() => expect(api.open).toHaveBeenCalledWith(channel));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("does not acknowledge old decisions into a reopened drawer", async () => {
    const pending = deferred();
    api.respond.mockReturnValue(pending.promise);
    render(view(viewer, true, true));
    choose("Open connection requests");
    await ready();
    choose();
    await waitFor(() => expect(api.respond).toHaveBeenCalledOnce());
    choose("Close");
    choose("Open connection requests");
    await ready();
    await act(async () => pending.resolve(ack(api.respond.mock.calls[0][0].data)));
    expect(screen.queryByRole("status")).toBeNull();
    expect(api.open).not.toHaveBeenCalled();
  });
});
