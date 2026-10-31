// @vitest-environment jsdom
import { Children, isValidElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  members: vi.fn(),
  promote: vi.fn(),
  changed: vi.fn(),
  close: vi.fn(),
  warning: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channel-actions.functions", () => ({
  promoteMessageToAction: api.promote,
  listChannelAssigneeOptions: api.members,
  ACTION_PRIORITIES: ["low", "normal", "high", "urgent"],
}));
vi.mock("sonner", () => ({ toast: { warning: api.warning } }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, disabled }: any) => {
    const trigger = Children.toArray(children).find(
      (child: any) => isValidElement(child) && !!child.props.id,
    ) as any;
    return (
      <select
        id={trigger?.props.id}
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    );
  },
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import {
  PromoteRecordDialog,
  type PromoteRecordDialogProps,
} from "@/components/channels/PromoteRecordDialog";
const channel = "11111111-1111-4111-8111-111111111111",
  messageId = "22222222-2222-4222-8222-222222222222",
  student = "33333333-3333-4333-8333-333333333333",
  action = "44444444-4444-4444-8444-444444444444",
  task = "55555555-5555-4555-8555-555555555555",
  other = "66666666-6666-4666-8666-666666666666";
let client: QueryClient, currentScope: { current: string };
function message(patch: any = {}) {
  return {
    id: messageId,
    channel_id: channel,
    body: "Recorded request",
    author_id: "viewer-a",
    parent_id: null,
    pinned: false,
    edited_at: null,
    deleted_at: null,
    created_at: "2026-10-15T00:00:00Z",
    author_name: "Member",
    ...patch,
  };
}
function saved(data: any, patch: any = {}) {
  return {
    action_id: action,
    channel_id: data.channel_id,
    message_id: data.message_id,
    kind: data.kind,
    action_item_id: data.create_action_item ? task : null,
    calendar_event_id: data.create_calendar_event ? other : null,
    sync: {
      action_item: data.create_action_item ? "created" : "not_requested",
      calendar: data.create_calendar_event ? "created" : "not_requested",
      links: data.create_action_item || data.create_calendar_event ? "saved" : "not_needed",
    },
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
function view(patch: Partial<PromoteRecordDialogProps> = {}, viewer = "viewer-a") {
  currentScope.current = viewer;
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary
        key={viewer}
        viewerId={viewer}
        scopeKey={viewer}
        currentScope={currentScope}
      >
        <PromoteRecordDialog
          message={message()}
          channelId={channel}
          channelStudentId={student}
          onPromoted={api.changed}
          onOpenChange={api.close}
          {...patch}
        />
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
async function ready() {
  await waitFor(() =>
    expect((screen.getByRole("button", { name: /^Promot/ }) as HTMLButtonElement).disabled).toBe(
      false,
    ),
  );
}
function submit() {
  fireEvent.click(screen.getByRole("button", { name: /^Promot/ }));
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: "viewer-a" };
  api.members.mockResolvedValue({ options: [] });
  api.promote.mockImplementation(async ({ data }) => saved(data));
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("actual shared promotion form with synthetic shell/transport", () => {
  it.each(["family", "student", "educator", "school", "district", "partner"])(
    "captures original message/student/viewer for shared %s usage",
    async () => {
      render(view());
      await ready();
      submit();
      await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
      expect(api.promote).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel_id: channel,
          message_id: messageId,
          expected_student_id: student,
          expected_message_body: "Recorded request",
          expected_viewer_id: "viewer-a",
          create_action_item: true,
          create_calendar_event: false,
        }),
      });
      expect(api.close).toHaveBeenCalledWith(false);
    },
  );
  it("does not create another record if the parent keeps the saved dialog open", async () => {
    render(view());
    await ready();
    submit();
    await screen.findByRole("status");
    expect((screen.getByRole("button", { name: "Saved" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(api.promote).toHaveBeenCalledOnce();
    expect(api.changed).toHaveBeenCalledOnce();
  });
  it.each(["refresh", "close"])(
    "keeps confirmed creation distinct from a failed %s callback",
    async (callback) => {
      (callback === "refresh" ? api.changed : api.close).mockImplementationOnce(() => {
        throw new Error("parent callback failed");
      });
      render(view());
      await ready();
      submit();
      await screen.findByRole("status");
      expect(api.promote).toHaveBeenCalledOnce();
      expect(screen.queryByText(/We couldn't confirm this record/)).toBeNull();
      expect((screen.getByRole("button", { name: "Saved" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
      fireEvent.click(screen.getByRole("button", { name: "Saved" }));
      expect(api.promote).toHaveBeenCalledOnce();
      if (callback === "close")
        expect(screen.getByRole("alert").textContent).toContain("record was saved");
    },
  );
  it("locks pending fields and prevents duplicate creation", async () => {
    const pending = deferred();
    api.promote.mockReturnValue(pending.promise);
    render(view());
    await ready();
    submit();
    submit();
    await waitFor(() => expect(api.promote).toHaveBeenCalledOnce());
    expect(
      (screen.getByLabelText("Notes (optional)").closest("fieldset") as HTMLFieldSetElement)
        .disabled,
    ).toBe(true);
    await act(async () => pending.resolve(saved(api.promote.mock.calls[0][0].data)));
    expect(api.changed).toHaveBeenCalledOnce();
  });
  it.each(["account", "message", "student", "close", "unmount", "body"])(
    "suppresses departed promotion completion on %s",
    async (kind) => {
      const pending = deferred();
      api.promote.mockReturnValue(pending.promise);
      const ui = render(view());
      await ready();
      submit();
      await waitFor(() => expect(api.promote).toHaveBeenCalledOnce());
      if (kind === "account") ui.rerender(view({}, "viewer-b"));
      else if (kind === "message") ui.rerender(view({ message: message({ id: other }) }));
      else if (kind === "student") ui.rerender(view({ channelStudentId: other }));
      else if (kind === "close") ui.rerender(view({ message: null }));
      else if (kind === "body") ui.rerender(view({ message: message({ body: "Updated record" }) }));
      else ui.unmount();
      await act(async () => pending.resolve(saved(api.promote.mock.calls[0][0].data)));
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.close).not.toHaveBeenCalled();
      expect(api.warning).not.toHaveBeenCalled();
    },
  );
  it("suppresses departed error after A-to-B-to-A", async () => {
    const pending = deferred();
    api.promote.mockReturnValue(pending.promise);
    const ui = render(view());
    await ready();
    submit();
    await waitFor(() => expect(api.promote).toHaveBeenCalledOnce());
    ui.rerender(view({ message: message({ id: other }) }));
    ui.rerender(view());
    await ready();
    await act(async () => pending.reject(new Error("late")));
    expect(screen.queryByText(/We couldn't confirm this record/)).toBeNull();
    expect(api.close).not.toHaveBeenCalled();
  });
  it.each(["account", "channel", "unmount"])(
    "does not fill a new view with a departed %s member read",
    async (departure) => {
      const pending = deferred();
      api.members.mockReturnValueOnce(pending.promise);
      const ui = render(view());
      await waitFor(() => expect(api.members).toHaveBeenCalledOnce());
      if (departure === "account") ui.rerender(view({}, "viewer-b"));
      else if (departure === "channel")
        ui.rerender(view({ channelId: other, message: message({ channel_id: other }) }));
      else ui.unmount();
      await act(async () =>
        pending.resolve({
          options: [{ user_id: other, name: "Departed private member", member_role: "member" }],
        }),
      );
      expect(screen.queryByText("Departed private member")).toBeNull();
      expect(api.promote).not.toHaveBeenCalled();
    },
  );
  it("retains choices and provides cautious recovery after failure", async () => {
    api.promote.mockRejectedValueOnce(new Error("private write details"));
    render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "Keep this context" },
    });
    submit();
    await screen.findByRole("alert");
    expect((screen.getByLabelText("Notes (optional)") as HTMLTextAreaElement).value).toBe(
      "Keep this context",
    );
    expect(screen.getByRole("alert").textContent).not.toContain("private write details");
    expect(api.changed).not.toHaveBeenCalled();
    expect(api.close).not.toHaveBeenCalled();
  });
  it.each(["action_id", "channel_id", "message_id", "kind"])(
    "rejects an unconfirmed response %s",
    async (field) => {
      api.promote.mockImplementation(async ({ data }) => saved(data, { [field]: "wrong" }));
      render(view());
      await ready();
      submit();
      await screen.findByRole("alert");
      expect(api.changed).not.toHaveBeenCalled();
      expect(api.close).not.toHaveBeenCalled();
    },
  );
  it.each([
    { action_item: "unconfirmed", calendar: "not_requested", links: "not_needed" },
    { action_item: "created", calendar: "not_requested", links: "unconfirmed" },
  ])("acknowledges the saved primary once with partial-save warning %#", async (sync) => {
    api.promote.mockImplementation(async ({ data }) =>
      saved(data, { sync, action_item_id: sync.action_item === "created" ? task : null }),
    );
    render(view());
    await ready();
    submit();
    await waitFor(() => expect(api.warning).toHaveBeenCalledOnce());
    expect(api.changed).toHaveBeenCalledOnce();
    expect(api.close).toHaveBeenCalledWith(false);
  });
  it("rejects inconsistent mirror status before success", async () => {
    api.promote.mockImplementation(async ({ data }) => saved(data, { action_item_id: null }));
    render(view());
    await ready();
    submit();
    await screen.findByRole("alert");
    expect(api.changed).not.toHaveBeenCalled();
  });
  it("recovers failed member reads without inventing an empty list", async () => {
    api.members.mockRejectedValueOnce(new Error("member read unavailable"));
    render(view());
    await screen.findByText("Reload Members");
    submit();
    expect(api.promote).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Reload Members"));
    await ready();
    expect(api.members).toHaveBeenCalledWith({
      data: { channel_id: channel, expected_viewer_id: "viewer-a" },
    });
    submit();
    await waitFor(() => expect(api.promote).toHaveBeenCalledOnce());
  });
  it.each([
    { options: null },
    { options: [{ user_id: "invalid", name: "Member" }] },
    {
      options: [
        { user_id: other, name: "Member" },
        { user_id: other, name: "Duplicate" },
      ],
    },
  ])("blocks malformed member metadata %#", async (result) => {
    api.members.mockResolvedValue(result);
    render(view());
    await screen.findByText("Reload Members");
    submit();
    expect(api.promote).not.toHaveBeenCalled();
  });
  it("retains an unavailable selected assignee on refresh and blocks promotion", async () => {
    api.members.mockResolvedValueOnce({
      options: [{ user_id: other, name: "Synthetic Assignee", member_role: "member" }],
    });
    render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Assignee"), { target: { value: other } });
    fireEvent.click(screen.getByText("Refresh Members"));
    await screen.findByText(/selected assignee is no longer available/);
    submit();
    expect(api.promote).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Assignee"), { target: { value: "none" } });
    await ready();
    submit();
    await waitFor(() => expect(api.promote).toHaveBeenCalledOnce());
  });
  it.each([
    { readOnly: true },
    { message: message({ deleted_at: "2026-10-15" }) },
    { message: message({ channel_id: other }) },
  ])("blocks inapplicable promotion/member reads %#", async (props) => {
    render(view(props));
    submit();
    expect(api.promote).not.toHaveBeenCalled();
    expect(api.members).not.toHaveBeenCalled();
  });
  it("omits student mirrors for an unscoped channel", async () => {
    render(view({ channelStudentId: null }));
    await ready();
    expect(screen.queryByText("Related Tools")).toBeNull();
    submit();
    await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
    expect(api.promote.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        expected_student_id: null,
        create_action_item: false,
        create_calendar_event: false,
      }),
    );
  });
  it("only requests a calendar entry when enabled with a due date", async () => {
    render(view());
    await ready();
    fireEvent.change(screen.getByLabelText("Due"), { target: { value: "2026-10-16T09:30" } });
    fireEvent.click(screen.getByLabelText(/Add to the Team Calendar/));
    submit();
    await waitFor(() => expect(api.changed).toHaveBeenCalledOnce());
    expect(api.promote.mock.calls[0][0].data.create_calendar_event).toBe(true);
    expect(api.promote.mock.calls[0][0].data.due_at).toMatch(/^2026-/);
  });
});
