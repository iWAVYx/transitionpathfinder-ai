// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "viewer-a" as string | null,
  loading: false,
  roles: vi.fn(),
  owner: vi.fn(),
  summary: vi.fn(),
  channels: vi.fn(),
  history: vi.fn(),
  navigate: vi.fn(),
  search: { tab: "inbox", unread: "all", due: "all", status: "all", archived: "all" } as any,
  clients: [] as any[],
  child: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => options,
  useSearch: () => api.search,
  useNavigate: () => api.navigate,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
vi.mock("@/lib/owner/owner.functions", () => ({ getMyAdminRoles: api.owner }));
vi.mock("@/lib/channel-tile-summary.functions", () => ({ getChannelTileSummary: api.summary }));
vi.mock("@/lib/channels.functions", () => ({
  listMyChannels: api.channels,
  listChannelMessages: vi.fn(),
  sendChannelMessage: vi.fn(),
  markChannelRead: vi.fn(),
}));
vi.mock("@/lib/channel-tabs.functions", () => ({
  listMyMentions: vi.fn().mockResolvedValue({ mentions: [] }),
  listChannelActions: vi.fn().mockResolvedValue({ actions: [] }),
  markMentionSeen: vi.fn(),
}));
vi.mock("@/lib/channel-actions.functions", () => ({
  updateChannelAction: vi.fn(),
  listChannelAssigneeOptions: vi.fn(),
  ACTION_STATUSES: ["open", "in_progress", "resolved"],
}));
vi.mock("@/lib/channel-connection-requests.functions", () => ({
  listMyConnectionRequests: vi.fn().mockResolvedValue({ requests: [] }),
  respondToConnectionRequest: vi.fn(),
  withdrawConnectionRequest: vi.fn(),
}));
vi.mock("@/lib/channel-messages.functions", () => ({
  listPinnedMessages: vi.fn(),
  listChannelBookmarkIds: vi.fn(),
  prepareChannelAttachmentUpload: vi.fn(),
  failChannelAttachmentUpload: vi.fn(),
  scanChannelAttachment: vi.fn(),
}));
vi.mock("@/lib/channel-history.functions", () => ({
  listMyChatHistory: api.history,
  readChatHistory: vi.fn(),
  downloadChatHistoryAttachment: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/channels/MessageItem", () => ({
  MessageItem: () => null,
  useMessageAttachments: () => ({ byMessage: {}, refetch: vi.fn() }),
}));
vi.mock("@/components/channels/ThreadPanel", () => ({ ThreadPanel: () => null }));
vi.mock("@/components/channels/PromoteRecordDialog", () => ({ PromoteRecordDialog: () => null }));
vi.mock("@/components/channels/StartStudentConversation", () => ({
  StartStudentConversation: () => null,
}));
vi.mock("@/components/channels/ChannelMuteToggle", () => ({ ChannelMuteToggle: () => null }));
vi.mock("@/components/channels/ConnectionRequestsDrawer", () => ({
  ConnectionRequestsDrawer: () => <button>Connection Controls</button>,
}));
vi.mock("@/components/privacy/SensitiveFilePrivacyReviewDialog", () => ({
  SensitiveFilePrivacyReviewDialog: () => null,
}));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("@/components/feature/FeatureShell", () => ({
  FeatureShell: ({ children, primaryAction, backTo }: any) => {
    const client = useQueryClient();
    api.clients.push(client);
    return (
      <main>
        <a href={backTo.to}>{backTo.label}</a>
        {primaryAction}
        {children}
      </main>
    );
  },
}));
import { Route } from "@/routes/_authenticated/transition-channel";
const Page = (Route as any).component;
const counts = {
  unreadChannels: 0,
  unreadMessages: 0,
  mentions: 0,
  assignedOpen: 0,
  decisionsPending: 0,
  upcomingDeadlines: 0,
  connectionRequests: 0,
  recent: [],
};
const clients: QueryClient[] = [];
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  const view = render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  return {
    ...view,
    client,
    refresh: () =>
      view.rerender(
        <QueryClientProvider client={client}>
          <Page />
        </QueryClientProvider>,
      ),
  };
}
function deferred() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
});
beforeEach(() => {
  vi.resetAllMocks();
  api.viewer = "viewer-a";
  api.loading = false;
  api.clients = [];
  api.search = { tab: "inbox", unread: "all", due: "all", status: "all", archived: "all" };
  api.owner.mockResolvedValue({ isPlatformAdmin: false });
  api.roles.mockResolvedValue({ roles: ["parent"] });
  api.summary.mockResolvedValue(counts);
  api.channels.mockResolvedValue({ channels: [] });
  api.history.mockResolvedValue([]);
  api.navigate.mockResolvedValue(undefined);
});
describe("Transition Channel account and role entry", () => {
  it("waits for settled auth and complete roles before tabs, counts or conversations", async () => {
    api.loading = true;
    api.search.tab = "assigned";
    const view = mount();
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.owner).not.toHaveBeenCalled();
    api.loading = false;
    const roles = deferred();
    api.roles.mockReturnValueOnce(roles.promise);
    view.refresh();
    await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
    expect(api.summary).not.toHaveBeenCalled();
    expect(api.channels).not.toHaveBeenCalled();
    expect(api.navigate).not.toHaveBeenCalled();
    await act(async () => roles.resolve({ roles: ["teacher"] }));
    await screen.findByRole("tab", { name: /Assigned To Me/ });
    expect(api.navigate).not.toHaveBeenCalled();
    expect(api.roles).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } });
    await waitFor(() =>
      expect(api.summary).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } }),
    );
  });
  it.each([
    ["student", false, "/dashboard"],
    ["parent", false, "/dashboard"],
    ["teacher", true, "/caseload"],
    ["school_admin", true, "/school/overview"],
    ["district_admin", true, "/district/overview"],
    ["partner", true, "/partners-manage"],
  ])("shows applicable %s tabs and workspace return", async (role, tools, destination) => {
    api.roles.mockResolvedValue({ roles: [role] });
    mount();
    await screen.findByRole("tab", { name: /Inbox/ });
    expect(Boolean(screen.queryByRole("tab", { name: /Assigned To Me/ }))).toBe(tools);
    expect(Boolean(screen.queryByRole("button", { name: "Connection Controls" }))).toBe(tools);
    expect(screen.getByRole("link", { name: /Back to/ }).getAttribute("href")).toBe(destination);
  });
  it("redirects verified Owners before role/count/conversation reads", async () => {
    api.owner.mockResolvedValue({ isPlatformAdmin: true });
    mount();
    await waitFor(() => expect(api.navigate).toHaveBeenCalledWith({ to: "/owner", replace: true }));
    expect(api.roles).not.toHaveBeenCalled();
    expect(api.summary).not.toHaveBeenCalled();
    expect(api.channels).not.toHaveBeenCalled();
  });
  it.each([null, {}, { roles: null }, { roles: ["parent", null] }])(
    "malformed role responses require retry %#",
    async (value) => {
      api.roles.mockResolvedValueOnce(value);
      mount();
      const retry = await screen.findByRole("button", { name: "Try Again" });
      expect(api.channels).not.toHaveBeenCalled();
      expect(api.summary).not.toHaveBeenCalled();
      expect(api.navigate).not.toHaveBeenCalled();
      fireEvent.click(retry);
      await screen.findByRole("tab", { name: /Inbox/ });
    },
  );
  it.each([{ roles: [] }, { roles: ["unknown"] }, { roles: ["admin"] }])(
    "does not invent a channel audience from %j",
    async ({ roles }) => {
      api.roles.mockResolvedValue({ roles });
      mount();
      await screen.findByText(/No channel workspace is available/);
      expect(api.summary).not.toHaveBeenCalled();
      expect(api.channels).not.toHaveBeenCalled();
    },
  );
  it("retries failed count reads without claiming zero counts or hiding conversations", async () => {
    api.summary.mockRejectedValueOnce(new Error("Private count detail"));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Reload Channel Counts" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Reload Channel Counts" })).toBeNull(),
    );
    expect(api.summary).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).not.toContain("Private count detail");
    expect(screen.getByRole("tab", { name: /Inbox/ })).toBeTruthy();
  });
  it("corrects an inapplicable tab only after the current role resolves and offers navigation retry", async () => {
    api.search.tab = "decisions";
    api.navigate.mockRejectedValueOnce(new Error("Private navigation detail"));
    mount();
    const retry = await screen.findByRole("button", { name: "Try Again" });
    expect(api.navigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: expect.objectContaining({ tab: "inbox" }), replace: true }),
    );
    expect(document.body.textContent).not.toContain("Private navigation detail");
    fireEvent.click(retry);
    await screen.findByRole("tab", { name: /Inbox/ });
  });
  it("uses a private non-persisted child query client and clears it at account change/unmount", async () => {
    const view = mount();
    await screen.findByRole("tab", { name: /Inbox/ });
    const first = api.clients.at(-1);
    expect(first).not.toBe(view.client);
    first.setQueryData(
      ["retained-chat-history"],
      [{ channel_id: "old", title: "Old Private History" }],
    );
    api.viewer = "viewer-b";
    view.refresh();
    await screen.findByRole("tab", { name: /Inbox/ });
    const second = api.clients.at(-1);
    expect(second).not.toBe(first);
    expect(second.getQueryData(["retained-chat-history"])).toBeUndefined();
    expect(first.getQueryCache().getAll()).toHaveLength(0);
    expect(view.client.getQueryData(["my-roles", "viewer-a"])).toBeUndefined();
    view.unmount();
    expect(second.getQueryCache().getAll()).toHaveLength(0);
  });
  it.each([false, true])(
    "departed roles cannot replace the next viewer (failure %s)",
    async (failure) => {
      const old = deferred();
      api.roles.mockReturnValueOnce(old.promise);
      const view = mount();
      await waitFor(() => expect(api.roles).toHaveBeenCalledOnce());
      api.viewer = "viewer-b";
      api.roles.mockResolvedValue({ roles: ["teacher"] });
      view.refresh();
      await screen.findByRole("tab", { name: /Assigned To Me/ });
      await act(async () =>
        failure ? old.reject(new Error("Old role")) : old.resolve({ roles: ["parent"] }),
      );
      expect(screen.getByRole("tab", { name: /Assigned To Me/ })).toBeTruthy();
    },
  );
  it.each(["loading", "signout"])(
    "immediately removes channel/history controls on %s",
    async (change) => {
      const view = mount();
      await screen.findByRole("tab", { name: /Inbox/ });
      if (change === "loading") api.loading = true;
      else api.viewer = null;
      view.refresh();
      expect(screen.queryByRole("tab", { name: /Inbox/ })).toBeNull();
    },
  );
});

it("does not restore general persisted roles, summary or retained-history data into the private workspace", async () => {
  api.search.tab = "archived";
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  client.setQueryData(["my-roles"], { roles: ["teacher"] });
  client.setQueryData(["channel-tile-summary"], { ...counts, connectionRequests: 99 });
  client.setQueryData(
    ["retained-chat-history"],
    [{ channel_id: "old", title: "Old Private History" }],
  );
  const history = deferred();
  api.history.mockReturnValueOnce(history.promise);
  render(
    <QueryClientProvider client={client}>
      <Page />
    </QueryClientProvider>,
  );
  await screen.findByText("Loading history…");
  expect(screen.queryByText("Old Private History")).toBeNull();
  expect(screen.queryByRole("button", { name: "Connection Controls" })).toBeNull();
  expect(screen.queryByText("99")).toBeNull();
  await act(async () => history.resolve([]));
  await screen.findByText("No retained conversations.");
  expect(client.getQueryData(["retained-chat-history"])).toEqual([
    { channel_id: "old", title: "Old Private History" },
  ]);
});
it.each([false, true])(
  "a departed summary cannot replace the next viewer's counts (failure %s)",
  async (failure) => {
    const old = deferred();
    api.summary.mockReturnValueOnce(old.promise);
    const view = mount();
    await waitFor(() => expect(api.summary).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    api.summary.mockResolvedValue({ ...counts, unreadMessages: 7 });
    view.refresh();
    await screen.findByText("7");
    await act(async () =>
      failure
        ? old.reject(new Error("Old private count"))
        : old.resolve({ ...counts, unreadMessages: 99 }),
    );
    expect(screen.queryByText("99")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("7")).toBeTruthy();
  },
);
it("clears retained-history selection and ignores departed grants when changing accounts", async () => {
  api.search.tab = "archived";
  const old = deferred();
  api.history.mockReturnValueOnce(old.promise);
  const view = mount();
  await screen.findByText("Loading history…");
  api.viewer = "viewer-b";
  view.refresh();
  await screen.findByText("No retained conversations.");
  await act(async () => old.resolve([{ channel_id: "old", title: "Old Retained Grant" }]));
  expect(screen.queryByText("Old Retained Grant")).toBeNull();
});
it("does not cancel or clear the outer application's cache on workspace departure", async () => {
  const view = mount();
  view.client.setQueryData(["unrelated-public-resource"], { title: "Public" });
  await screen.findByRole("tab", { name: /Inbox/ });
  view.unmount();
  expect(view.client.getQueryData(["unrelated-public-resource"])).toEqual({ title: "Public" });
});
it("recovers the private query observer under Strict Mode effect replay", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    </StrictMode>,
  );
  await screen.findByRole("tab", { name: /Inbox/ });
  await waitFor(() => expect(api.summary).toHaveBeenCalled());
});
