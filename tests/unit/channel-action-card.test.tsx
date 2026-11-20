// @vitest-environment jsdom
import { Children, isValidElement } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ update: vi.fn(), members: vi.fn(), warning: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channel-actions.functions", () => ({
  updateChannelAction: api.update,
  listChannelAssigneeOptions: api.members,
  ACTION_STATUSES: ["open", "in_progress", "resolved", "cancelled"],
}));
vi.mock("sonner", () => ({ toast: { warning: api.warning } }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange, onOpenChange, disabled }: any) => {
    const trigger = Children.toArray(children).find(
      (child: any) => isValidElement(child) && !!child.props["aria-label"],
    ) as any;
    return (
      <select
        aria-label={trigger?.props["aria-label"]}
        value={value}
        disabled={disabled}
        onFocus={() => onOpenChange?.(true)}
        onChange={(e) => onValueChange(e.target.value)}
      >
        {children}
      </select>
    );
  },
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value, disabled }: any) => (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  ),
}));
import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import { ChannelActionCard } from "@/components/channels/ChannelActionCard";
const id = "11111111-1111-4111-8111-111111111111",
  channel = "22222222-2222-4222-8222-222222222222",
  student = "33333333-3333-4333-8333-333333333333",
  other = "44444444-4444-4444-8444-444444444444";
let client: QueryClient, childClient: QueryClient, currentScope: { current: string };
function record(patch: any = {}) {
  return {
    id,
    channel_id: channel,
    channel_title: "Synthetic channel",
    channel_kind: "student",
    kind: "action",
    status: "open",
    priority: null,
    due_at: null,
    assignee_user_id: null,
    assignee_name: null,
    promoted_by: "viewer-a",
    promoter_name: "Synthetic member",
    source_message_id: null,
    resolution: "Recorded action",
    created_at: "2026-10-15T00:00:00Z",
    resolved_at: null,
    action_item_id: null,
    calendar_event_id: null,
    student_id: student,
    ...patch,
  };
}
function saved(data: any, patch: any = {}) {
  return {
    ok: true,
    action_id: data.action_id,
    channel_id: data.expected_channel_id,
    status: data.status ?? data.expected_status,
    assignee_user_id:
      data.assignee_user_id === undefined ? data.expected_assignee_user_id : data.assignee_user_id,
    sync: { action_item: "not_requested" },
    ...patch,
  };
}
function Capture() {
  childClient = useQueryClient();
  return null;
}
function view(patch: any = {}, viewer = "viewer-a") {
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
        <ChannelActionCard action={record(patch)} />
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
function status(value = "resolved") {
  fireEvent.change(screen.getByLabelText("Record Status"), { target: { value } });
}
function deferred<T = any>() {
  let resolve!: (v: T) => void, reject!: (e: any) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: "viewer-a" };
  api.update.mockImplementation(async ({ data }) => saved(data));
  api.members.mockResolvedValue({
    options: [{ user_id: other, name: "Synthetic assignee", member_role: "member" }],
  });
});
afterEach(() => {
  cleanup();
  client.clear();
});
describe("actual shared action card with mocked select/transport", () => {
  it.each(["family", "student", "educator", "school", "district", "partner"])(
    "captures caller/record/student/status intent for shared %s use",
    async () => {
      render(view());
      status();
      await screen.findByRole("status");
      expect(api.update).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action_id: id,
          expected_channel_id: channel,
          expected_student_id: student,
          expected_viewer_id: "viewer-a",
          expected_status: "open",
          expected_assignee_user_id: null,
          status: "resolved",
        }),
      });
    },
  );
  it("prevents competing status and assignment requests while pending", async () => {
    const pending = deferred();
    api.update.mockReturnValue(pending.promise);
    render(view());
    fireEvent.click(screen.getByText("Refresh Members"));
    await screen.findByText("Synthetic assignee");
    status();
    status("cancelled");
    fireEvent.change(screen.getByLabelText("Record Assignee"), { target: { value: other } });
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    await act(async () => pending.resolve(saved(api.update.mock.calls[0][0].data)));
    expect((screen.getByLabelText("Record Status") as HTMLSelectElement).disabled).toBe(true);
  });
  it("keeps a confirmed change locked until refreshed props arrive", async () => {
    const ui = render(view());
    status();
    await screen.findByRole("status");
    status("cancelled");
    expect(api.update).toHaveBeenCalledOnce();
    ui.rerender(view({ status: "resolved" }));
    await waitFor(() =>
      expect((screen.getByLabelText("Record Status") as HTMLSelectElement).disabled).toBe(false),
    );
    status("open");
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(2));
    expect(api.update.mock.calls[1][0].data.expected_status).toBe("resolved");
  });
  it.each(["account", "record", "student", "status", "assignee", "unmount"])(
    "ignores departed acknowledgement after %s changes",
    async (change) => {
      const pending = deferred();
      api.update.mockReturnValue(pending.promise);
      const ui = render(view());
      const invalidate = vi.spyOn(childClient, "invalidateQueries");
      status();
      await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
      if (change === "account") ui.rerender(view({}, "viewer-b"));
      else if (change === "record") ui.rerender(view({ id: other }));
      else if (change === "student") ui.rerender(view({ student_id: other }));
      else if (change === "status") ui.rerender(view({ status: "cancelled" }));
      else if (change === "assignee") ui.rerender(view({ assignee_user_id: other }));
      else ui.unmount();
      await act(async () => pending.resolve(saved(api.update.mock.calls[0][0].data)));
      expect(invalidate).not.toHaveBeenCalled();
      expect(api.warning).not.toHaveBeenCalled();
      expect(screen.queryByText(/Change saved/)).toBeNull();
    },
  );
  it("does not show a departed error after A-to-B-to-A", async () => {
    const pending = deferred();
    api.update.mockReturnValue(pending.promise);
    const ui = render(view());
    status();
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    ui.rerender(view({ id: other }));
    ui.rerender(view());
    await act(async () => pending.reject(new Error("late")));
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it.each(["ok", "action_id", "channel_id", "status", "assignee_user_id"])(
    "rejects a mismatched %s result without success acknowledgement",
    async (field) => {
      api.update.mockImplementation(async ({ data }) =>
        saved(data, { [field]: field === "ok" ? false : "wrong" }),
      );
      render(view());
      status();
      await screen.findByRole("alert");
      expect(screen.queryByText(/Change saved/)).toBeNull();
      expect(screen.getByText("Reload Records")).toBeTruthy();
    },
  );
  it("offers controlled failure recovery without raw server details", async () => {
    api.update.mockRejectedValueOnce(new Error("private transport"));
    render(view());
    const invalidate = vi.spyOn(childClient, "invalidateQueries");
    status();
    await screen.findByRole("alert");
    expect(screen.getByRole("alert").textContent).not.toContain("private transport");
    fireEvent.click(screen.getByText("Reload Records"));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["channel-actions"] });
  });
  it("warns about linked task failure after the primary record is confirmed", async () => {
    api.update.mockImplementation(async ({ data }) =>
      saved(data, { sync: { action_item: "unconfirmed" } }),
    );
    render(view());
    status();
    await screen.findByRole("status");
    expect(api.warning).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("verifies member choices before assignment and sends the captured original state", async () => {
    render(view());
    fireEvent.focus(screen.getByLabelText("Record Assignee"));
    await screen.findByText("Synthetic assignee");
    fireEvent.change(screen.getByLabelText("Record Assignee"), { target: { value: other } });
    await screen.findByRole("status");
    expect(api.members).toHaveBeenCalledWith({
      data: { channel_id: channel, expected_viewer_id: "viewer-a" },
    });
    expect(api.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ assignee_user_id: other, expected_assignee_user_id: null }),
    );
  });
  it("does not make unchanged status or assignment requests", async () => {
    render(view());
    status("open");
    fireEvent.focus(screen.getByLabelText("Record Assignee"));
    await screen.findByText("Synthetic assignee");
    fireEvent.change(screen.getByLabelText("Record Assignee"), { target: { value: "none" } });
    expect(api.update).not.toHaveBeenCalled();
  });
  it("recovers member failure without treating it as unassigned-only success", async () => {
    api.members.mockRejectedValueOnce(new Error("member read failed"));
    render(view({ assignee_user_id: other, assignee_name: "Recorded assignee" }));
    fireEvent.click(screen.getByText("Refresh Members"));
    await screen.findByText("Reload Members");
    fireEvent.change(screen.getByLabelText("Record Assignee"), { target: { value: "none" } });
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Reload Members"));
    await screen.findByText("Synthetic assignee");
    fireEvent.change(screen.getByLabelText("Record Assignee"), { target: { value: "none" } });
    await screen.findByRole("status");
    expect(api.update.mock.calls[0][0].data.expected_assignee_user_id).toBe(other);
  });
  it.each([{ options: null }, { options: [{ user_id: "bad", name: "Invalid" }] }])(
    "rejects malformed member responses %#",
    async (result) => {
      api.members.mockResolvedValue(result);
      render(view());
      fireEvent.click(screen.getByText("Refresh Members"));
      await screen.findByText("Reload Members");
      expect(api.update).not.toHaveBeenCalled();
    },
  );
  it("retains an unavailable recorded assignee label until an explicit change", async () => {
    api.members.mockResolvedValue({ options: [] });
    render(view({ assignee_user_id: other, assignee_name: "Recorded assignee" }));
    fireEvent.click(screen.getByText("Refresh Members"));
    await screen.findByText("Recorded assignee (Unavailable)");
    expect(api.update).not.toHaveBeenCalled();
  });
  it("ignores member reads after account departure", async () => {
    const pending = deferred();
    api.members.mockReturnValueOnce(pending.promise);
    const ui = render(view());
    fireEvent.click(screen.getByText("Refresh Members"));
    await waitFor(() => expect(api.members).toHaveBeenCalledOnce());
    ui.rerender(view({}, "viewer-b"));
    await act(async () =>
      pending.resolve({ options: [{ user_id: other, name: "Departed member" }] }),
    );
    expect(screen.queryByText("Departed member")).toBeNull();
  });
  it("uses existing tool destinations for valid links and omits malformed ids", () => {
    const ui = render(view({ action_item_id: other, calendar_event_id: other }));
    expect(screen.getByText("Student Profile").closest("a")?.getAttribute("href")).toBe(
      `/students/${student}`,
    );
    expect(screen.getByText("Calendar").closest("a")?.getAttribute("href")).toBe("/calendar");
    ui.rerender(view({ action_item_id: other, calendar_event_id: "bad", student_id: "unsafe" }));
    expect(screen.queryByText("Student Profile")).toBeNull();
    expect(screen.queryByText("Calendar")).toBeNull();
  });
});
