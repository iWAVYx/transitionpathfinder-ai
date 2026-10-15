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
  uploadsEnabled: false,
  privacyConfirm: null as any,
  channels: vi.fn(),
  messages: vi.fn(),
  send: vi.fn(),
  read: vi.fn(),
  prepare: vi.fn(),
  failUpload: vi.fn(),
  scan: vi.fn(),
  upload: vi.fn(),
  historyRead: vi.fn(),
  historyDownload: vi.fn(),
  openDownload: vi.fn(),
  toast: vi.fn(),
  removeRealtime: vi.fn(),
  realtimeCallbacks: [] as (() => void)[],
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
  listChannelMessages: api.messages,
  sendChannelMessage: api.send,
  markChannelRead: api.read,
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
  listPinnedMessages: vi.fn().mockResolvedValue({ pinned: [] }),
  listChannelBookmarkIds: vi.fn().mockResolvedValue({ message_ids: [] }),
  prepareChannelAttachmentUpload: api.prepare,
  failChannelAttachmentUpload: api.failUpload,
  scanChannelAttachment: api.scan,
}));
vi.mock("@/lib/channel-history.functions", () => ({
  listMyChatHistory: api.history,
  readChatHistory: api.historyRead,
  downloadChatHistoryAttachment: api.historyDownload,
}));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
vi.mock("@/lib/channel-history-download.browser", () => ({
  openHistoryAttachment: api.openDownload,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: vi.fn((_event: unknown, _filter: unknown, callback: () => void) => {
          api.realtimeCallbacks.push(callback);
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    },
    removeChannel: api.removeRealtime,
    storage: { from: () => ({ uploadToSignedUrl: api.upload }) },
  },
}));
vi.mock("@/components/channels/MessageItem", () => ({
  MessageItem: ({ m }: any) => <p>{m.body}</p>,
  useMessageAttachments: () => ({ byMessage: new Map(), refetch: vi.fn() }),
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
vi.mock("@/lib/protected-file-uploads", () => ({
  get PROTECTED_FILE_UPLOADS_ENABLED() {
    return api.uploadsEnabled;
  },
  PROTECTED_FILE_UPLOADS_MESSAGE: "Uploads unavailable in this fixture",
  assertProtectedFileUploadsEnabled: () => {
    if (!api.uploadsEnabled) throw new Error("Uploads unavailable in this fixture");
  },
}));
vi.mock("@/components/privacy/SensitiveFilePrivacyReviewDialog", () => ({
  SensitiveFilePrivacyReviewDialog: (props: any) => {
    api.privacyConfirm = props.onConfirm;
    return null;
  },
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
  vi.clearAllMocks();
  for (const fn of [
    api.roles,
    api.owner,
    api.summary,
    api.channels,
    api.history,
    api.messages,
    api.send,
    api.read,
    api.prepare,
    api.failUpload,
    api.scan,
    api.upload,
    api.historyRead,
    api.historyDownload,
  ])
    fn.mockReset();
  api.uploadsEnabled = false;
  api.privacyConfirm = null;
  api.viewer = "viewer-a";
  api.loading = false;
  api.clients = [];
  api.search = { tab: "inbox", unread: "all", due: "all", status: "all", archived: "all" };
  api.owner.mockResolvedValue({ isPlatformAdmin: false });
  api.roles.mockResolvedValue({ roles: ["parent"] });
  api.summary.mockResolvedValue(counts);
  api.channels.mockResolvedValue({ channels: [] });
  api.history.mockResolvedValue([]);
  api.realtimeCallbacks = [];
  api.messages.mockResolvedValue({ messages: [] });
  api.read.mockResolvedValue({ ok: true });
  api.send.mockImplementation(({ data }: any) =>
    Promise.resolve({
      message: {
        id: sentId,
        channel_id: data.channel_id,
        author_id: data.expected_viewer_id,
        body: data.body,
      },
    }),
  );
  api.removeRealtime.mockResolvedValue("ok");
  api.historyRead.mockImplementation(({ data }: any) =>
    Promise.resolve(historyPage(data.channel_id, data.offset)),
  );
  api.historyDownload.mockResolvedValue({ url: "https://files.example.test/signed-sample" });
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

const channelA = "11111111-1111-4111-8111-111111111111";
const channelB = "22222222-2222-4222-8222-222222222222";
const sentId = "33333333-3333-4333-8333-333333333333";
const messageA = "44444444-4444-4444-8444-444444444444";
const attachmentId = "55555555-5555-4555-8555-555555555555";
function conversationChannels() {
  return [channelA, channelB].map((id, index) => ({
    id,
    title: index ? "Beta Channel" : "Alpha Channel",
    kind: "student_team",
    purpose: null,
    student_id: null,
    organization_id: null,
    partner_organization_id: null,
    last_message_at: null,
    archived_at: null,
    unread_count: 0,
    muted: false,
    member_role: "member",
  }));
}
async function conversations() {
  api.search.tab = "channels";
  api.channels.mockResolvedValue({ channels: conversationChannels() });
  const view = mount();
  await screen.findByRole("textbox", { name: "Message" });
  await waitFor(() => expect(screen.queryByText("Loading messages…")).toBeNull());
  return view;
}
function draft(body: string) {
  fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: body } });
}
function send() {
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
}
function selectBeta() {
  fireEvent.click(screen.getByRole("button", { name: /^Beta Channel/ }));
}
function selectAlpha() {
  fireEvent.click(screen.getByRole("button", { name: /^Alpha Channel/ }));
}
function sent(channelId = channelA, author = "viewer-a") {
  return { message: { id: sentId, channel_id: channelId, author_id: author } };
}
function historyPage(channelId: string, offset = 0) {
  return {
    channel_id: channelId,
    offset,
    messages: [
      {
        message_id: messageA,
        body: `History ${channelId}:${offset}`,
        author_name: "Sample",
        sent_at: "2026-10-14T10:00:00Z",
        parent_id: null,
      },
    ],
    attachments: [{ attachment_id: attachmentId, message_id: messageA, file_name: "Sample.txt" }],
    hasMore: offset === 0,
  };
}
async function history() {
  api.search.tab = "archived";
  api.history.mockResolvedValue([
    { channel_id: channelA, title: "Alpha History", removed_at: "2026-10-14" },
    { channel_id: channelB, title: "Beta History", removed_at: "2026-10-14" },
  ]);
  const view = mount();
  fireEvent.click(await screen.findByRole("button", { name: "Alpha History" }));
  await screen.findByRole("button", { name: "Sample.txt" });
  return view;
}
describe("main conversation request effects", () => {
  it("keeps drafts per channel and clears only the unchanged submitted draft", async () => {
    const pending = deferred();
    api.send.mockReturnValueOnce(pending.promise);
    await conversations();
    draft("Alpha draft");
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    selectBeta();
    await screen.findByRole("textbox", { name: "Message" });
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "",
    );
    draft("Beta draft");
    await act(async () => pending.resolve(sent()));
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "Beta draft",
    );
    selectAlpha();
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "",
    );
    expect(api.send.mock.calls[0][0].data).toMatchObject({
      channel_id: channelA,
      body: "Alpha draft",
      expected_viewer_id: "viewer-a",
      client_dedupe_key: expect.any(String),
    });
  });
  it("does not erase edits made while sending", async () => {
    const pending = deferred();
    api.send.mockReturnValueOnce(pending.promise);
    await conversations();
    draft("Submitted");
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    draft("New unsent edit");
    await act(async () => pending.resolve(sent()));
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "New unsent edit",
    );
  });
  it("serializes duplicate submits but lets another channel keep its own send state", async () => {
    const pending = deferred();
    api.send.mockReturnValueOnce(pending.promise);
    await conversations();
    draft("Alpha");
    send();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Message" }), { key: "Enter" });
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    selectBeta();
    await waitFor(() => expect(screen.queryByText("Loading messages…")).toBeNull());
    draft("Beta");
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(2));
    expect(api.send.mock.calls[1][0].data.channel_id).toBe(channelB);
    await act(async () => pending.resolve(sent()));
  });
  it("reuses the original dedupe key for an unchanged failed send", async () => {
    api.send.mockRejectedValueOnce(new Error("Private send detail"));
    await conversations();
    draft("Retry this");
    send();
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "Retry this",
    );
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledTimes(2));
    expect(api.send.mock.calls[1][0].data.client_dedupe_key).toBe(
      api.send.mock.calls[0][0].data.client_dedupe_key,
    );
    expect(api.toast.mock.calls[0][0]).not.toContain("Private send detail");
  });
  it.each([{}, sent(channelB), sent(channelA, "another-author")])(
    "does not clear a draft for a mismatched send response %#",
    async (response) => {
      api.send.mockResolvedValueOnce(response);
      await conversations();
      draft("Keep this");
      send();
      await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
      expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
        "Keep this",
      );
    },
  );
  it.each([false, true])(
    "late send completion cannot affect a different account (failure %s)",
    async (failure) => {
      const pending = deferred();
      api.send.mockReturnValueOnce(pending.promise);
      const view = await conversations();
      draft("Old account");
      send();
      await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
      api.viewer = "viewer-b";
      view.refresh();
      await screen.findByRole("textbox", { name: "Message" });
      draft("New account");
      await act(async () =>
        failure ? pending.reject(new Error("Old send failure")) : pending.resolve(sent()),
      );
      expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
        "New account",
      );
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("late send errors after an A-to-B-to-A transition cannot show a current-view error", async () => {
    const pending = deferred();
    api.send.mockReturnValueOnce(pending.promise);
    await conversations();
    draft("Original");
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    selectBeta();
    selectAlpha();
    await act(async () => pending.reject(new Error("Late original error")));
    expect(api.toast).not.toHaveBeenCalled();
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "Original",
    );
  });
  it("read failures keep messages visible and offer retry", async () => {
    api.messages.mockImplementation(({ data }: any) =>
      Promise.resolve({
        messages: [
          { id: messageA, channel_id: data.channel_id, body: "Recorded message", parent_id: null },
        ],
      }),
    );
    api.read.mockRejectedValueOnce(new Error("Private read detail"));
    await conversations();
    fireEvent.click(await screen.findByRole("button", { name: "Retry Read Status" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Retry Read Status" })).toBeNull(),
    );
    expect(screen.getByText("Recorded message")).toBeTruthy();
    expect(api.read).toHaveBeenCalledWith({
      data: {
        channel_id: channelA,
        last_read_message_id: messageA,
        expected_viewer_id: "viewer-a",
      },
    });
  });
  it("late read failure and realtime callbacks cannot affect the next selected channel", async () => {
    const pending = deferred();
    api.read.mockReturnValueOnce(pending.promise);
    api.messages.mockImplementation(({ data }: any) =>
      Promise.resolve({
        messages: [
          {
            id: messageA,
            channel_id: data.channel_id,
            body: `Message ${data.channel_id}`,
            parent_id: null,
          },
        ],
      }),
    );
    const view = await conversations();
    await waitFor(() => expect(api.read).toHaveBeenCalledOnce());
    const oldRealtime = api.realtimeCallbacks[0];
    selectBeta();
    await waitFor(() => expect(api.read).toHaveBeenCalledTimes(2));
    const client = api.clients.at(-1);
    const invalidate = vi.spyOn(client, "invalidateQueries");
    invalidate.mockClear();
    await act(async () => {
      pending.reject(new Error("Old read failure"));
      oldRealtime();
    });
    expect(screen.queryByRole("button", { name: "Retry Read Status" })).toBeNull();
    expect(invalidate).not.toHaveBeenCalled();
    expect(api.removeRealtime).toHaveBeenCalled();
    view.unmount();
  });
  it("message read errors and mismatched channels never become an empty conversation", async () => {
    api.messages.mockRejectedValueOnce(new Error("Private read failure"));
    await conversations();
    const retry = await screen.findByRole("button", { name: "Reload Messages" });
    expect(screen.queryByText("Be the first to write in this channel.")).toBeNull();
    draft("Waiting draft");
    fireEvent.submit(screen.getByRole("textbox", { name: "Message" }).closest("form")!);
    expect(api.send).not.toHaveBeenCalled();
    api.messages.mockResolvedValueOnce({
      messages: [{ id: messageA, channel_id: channelB, body: "Foreign message" }],
    });
    fireEvent.click(retry);
    await screen.findByRole("button", { name: "Reload Messages" });
    expect(screen.queryByText("Foreign message")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reload Messages" }));
    await screen.findByText("Be the first to write in this channel.");
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "Waiting draft",
    );
  });
  it("conversation-list failure has its own retry and does not claim no conversations", async () => {
    api.search.tab = "channels";
    api.channels.mockRejectedValueOnce(new Error("Private list failure"));
    mount();
    const retry = await screen.findByRole("button", { name: "Reload Conversations" });
    expect(screen.queryByText(/No channels match your filters/)).toBeNull();
    fireEvent.click(retry);
    await screen.findByText(/No channels match your filters/);
  });
  it("archived channels cannot send even through a direct form submit", async () => {
    api.search.tab = "channels";
    const rows = conversationChannels();
    rows[0].archived_at = "2026-10-14" as any;
    api.channels.mockResolvedValue({ channels: rows });
    mount();
    await screen.findByRole("textbox", { name: "Message" });
    draft("Blocked");
    fireEvent.submit(screen.getByRole("textbox", { name: "Message" }).closest("form")!);
    expect(api.send).not.toHaveBeenCalled();
  });
});

describe("retained history download intent", () => {
  it("opens only the current authorized attachment and prevents duplicate downloads", async () => {
    const pending = deferred();
    api.historyDownload.mockReturnValueOnce(pending.promise);
    await history();
    fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
    fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
    expect(api.historyDownload).toHaveBeenCalledOnce();
    expect(api.historyDownload).toHaveBeenCalledWith({
      data: { attachment_id: attachmentId, expected_viewer_id: "viewer-a" },
    });
    await act(async () => pending.resolve({ url: "https://files.example.test/allowed" }));
    expect(api.openDownload).toHaveBeenCalledWith("https://files.example.test/allowed");
  });
  it.each(["channel", "page", "account", "unmount", "roundtrip"])(
    "ignores a signed download after %s departure",
    async (change) => {
      const pending = deferred();
      api.historyDownload.mockReturnValueOnce(pending.promise);
      const view = await history();
      fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
      if (change === "channel" || change === "roundtrip") {
        fireEvent.click(screen.getByRole("button", { name: "Beta History" }));
        await screen.findByText(`History ${channelB}:0`);
      }
      if (change === "roundtrip") {
        fireEvent.click(screen.getByRole("button", { name: "Alpha History" }));
        await screen.findByText(`History ${channelA}:0`);
      }
      if (change === "page") {
        fireEvent.click(screen.getByRole("button", { name: "Older" }));
        await screen.findByText(`History ${channelA}:50`);
      }
      if (change === "account") {
        api.viewer = "viewer-b";
        view.refresh();
        await screen.findByRole("button", { name: "Alpha History" });
      }
      if (change === "unmount") view.unmount();
      await act(async () => pending.resolve({ url: "https://files.example.test/departed" }));
      expect(api.openDownload).not.toHaveBeenCalled();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("a late download error cannot show a notice on another history page", async () => {
    const pending = deferred();
    api.historyDownload.mockReturnValueOnce(pending.promise);
    await history();
    fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
    fireEvent.click(screen.getByRole("button", { name: "Older" }));
    await screen.findByText(`History ${channelA}:50`);
    await act(async () => pending.reject(new Error("Old private download failure")));
    expect(api.toast).not.toHaveBeenCalled();
  });
  it("failed current downloads keep generic retry guidance", async () => {
    api.historyDownload.mockRejectedValueOnce(new Error("Private signing detail"));
    await history();
    fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
    await waitFor(() => expect(api.toast).toHaveBeenCalledOnce());
    expect(api.toast.mock.calls[0][0]).not.toContain("Private signing detail");
    fireEvent.click(screen.getByRole("button", { name: "Sample.txt" }));
    await waitFor(() => expect(api.openDownload).toHaveBeenCalledOnce());
  });
  it("does not expose a history page returned for another conversation", async () => {
    api.historyRead.mockResolvedValueOnce(historyPage(channelB));
    api.search.tab = "archived";
    api.history.mockResolvedValue([
      { channel_id: channelA, title: "Alpha History", removed_at: "2026-10-14" },
    ]);
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Alpha History" }));
    await screen.findByText("Could not load messages.");
    expect(screen.queryByText(`History ${channelB}:0`)).toBeNull();
    expect(screen.queryByRole("button", { name: "Sample.txt" })).toBeNull();
  });
});

function attachSample() {
  act(() =>
    api.privacyConfirm({
      file: new File(["Fictional reviewed text"], "privacy-safe-document.txt", {
        type: "text/plain",
      }),
    }),
  );
}
function preparedAttachment() {
  return {
    attachment: { id: attachmentId },
    upload: { storage_path: "synthetic/path", token: "synthetic-token" },
  };
}
describe("original-message attachment pipeline (mocked staging policy only)", () => {
  it("keeps an in-flight attachment on its original message/channel when selecting another conversation", async () => {
    api.uploadsEnabled = true;
    const pending = deferred();
    api.prepare.mockReturnValueOnce(pending.promise);
    api.upload.mockResolvedValue({ error: null });
    api.scan.mockResolvedValue({ attachment: { id: attachmentId } });
    await conversations();
    attachSample();
    draft("With a file");
    send();
    await waitFor(() => expect(api.prepare).toHaveBeenCalledOnce());
    selectBeta();
    await waitFor(() => expect(screen.queryByText("Loading messages…")).toBeNull());
    draft("New channel text");
    await act(async () => pending.resolve(preparedAttachment()));
    await waitFor(() => expect(api.scan).toHaveBeenCalledOnce());
    expect(api.prepare.mock.calls[0][0].data).toMatchObject({
      channel_id: channelA,
      message_id: sentId,
      file_name: "privacy-safe-document.txt",
      expected_viewer_id: "viewer-a",
    });
    expect(api.scan).toHaveBeenCalledWith({
      data: { attachment_id: attachmentId, expected_viewer_id: "viewer-a" },
    });
    expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
      "New channel text",
    );
  });
  it("does not start storage upload after a prepare response returns to a departed account", async () => {
    api.uploadsEnabled = true;
    const pending = deferred();
    api.prepare.mockReturnValueOnce(pending.promise);
    const view = await conversations();
    attachSample();
    draft("File request");
    send();
    await waitFor(() => expect(api.prepare).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    view.refresh();
    await screen.findByRole("textbox", { name: "Message" });
    await act(async () => pending.resolve(preparedAttachment()));
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.scan).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
  });
  it("does not start scanning after an upload returns to a departed account", async () => {
    api.uploadsEnabled = true;
    api.prepare.mockResolvedValue(preparedAttachment());
    const pending = deferred();
    api.upload.mockReturnValueOnce(pending.promise);
    const view = await conversations();
    attachSample();
    draft("Uploading");
    send();
    await waitFor(() => expect(api.upload).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    view.refresh();
    await screen.findByRole("textbox", { name: "Message" });
    await act(async () => pending.resolve({ error: null }));
    expect(api.scan).not.toHaveBeenCalled();
    expect(api.failUpload).not.toHaveBeenCalled();
    expect(api.toast).not.toHaveBeenCalled();
  });
  it("keeps a failed old-channel scan notice out of the new conversation", async () => {
    api.uploadsEnabled = true;
    api.prepare.mockResolvedValue(preparedAttachment());
    api.upload.mockResolvedValue({ error: null });
    const pending = deferred();
    api.scan.mockReturnValueOnce(pending.promise);
    await conversations();
    attachSample();
    draft("Scanning");
    send();
    await waitFor(() => expect(api.scan).toHaveBeenCalledOnce());
    selectBeta();
    await waitFor(() => expect(screen.queryByText("Loading messages…")).toBeNull());
    await act(async () => pending.reject(new Error("Private scan detail")));
    expect(api.toast).not.toHaveBeenCalled();
  });
  it("a stale privacy confirmation cannot attach a file to a different channel", async () => {
    api.uploadsEnabled = true;
    await conversations();
    const oldConfirm = api.privacyConfirm;
    selectBeta();
    await waitFor(() => expect(screen.queryByText("Loading messages…")).toBeNull());
    act(() =>
      oldConfirm({
        file: new File(["Fictional"], "privacy-safe-document.txt", { type: "text/plain" }),
      }),
    );
    expect(screen.queryByText("privacy-safe-document.txt")).toBeNull();
  });
  it("removes an unavailable selected conversation without loading or sending to a replacement", async () => {
    await conversations();
    draft("Retained unsent draft");
    api.channels.mockResolvedValueOnce({ channels: [conversationChannels()[1]] });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Conversations" }));
    await screen.findByText(/This conversation is no longer available/);
    expect(screen.queryByRole("textbox", { name: "Message" })).toBeNull();
    expect(api.send).not.toHaveBeenCalled();
  });
});

it.each(["student", "parent", "teacher", "school_admin", "district_admin", "partner"])(
  "sends in the same scoped conversation flow for %s",
  async (role) => {
    api.roles.mockResolvedValue({ roles: [role] });
    await conversations();
    draft("Scoped role message");
    send();
    await waitFor(() => expect(api.send).toHaveBeenCalledOnce());
    expect(api.send.mock.calls[0][0].data).toMatchObject({
      channel_id: channelA,
      expected_viewer_id: "viewer-a",
      body: "Scoped role message",
    });
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: "Message" }) as HTMLTextAreaElement).value).toBe(
        "",
      ),
    );
  },
);
