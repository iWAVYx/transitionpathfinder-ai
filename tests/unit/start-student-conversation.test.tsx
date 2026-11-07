// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const calls = vi.hoisted(() => ({
  students: vi.fn(),
  recipients: vi.fn(),
  start: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channels.functions", () => ({
  listStartableStudentChannels: calls.students,
  listStudentChannelRecipients: calls.recipients,
  startStudentChannel: calls.start,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: calls.error } }));
// Native select controls exercise form state without mocking query/mutation behavior.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    disabled?: boolean;
    children: ReactNode;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => <option value="">Choose</option>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { ChannelQueryBoundary } from "@/components/channels/ChannelQueryBoundary";
import { StartStudentConversation } from "../../src/components/channels/StartStudentConversation";

const studentId = "00000000-0000-4000-8000-000000000010";
const recipientId = "00000000-0000-4000-8000-000000000002";
const viewerId = "00000000-0000-4000-8000-000000000001";
const channelId = "00000000-0000-4000-8000-000000000003";
const otherId = "00000000-0000-4000-8000-000000000004";
const saved = { channel_id: channelId, student_id: studentId, recipient_id: recipientId };
let client: QueryClient, child: QueryClient, currentScope: { current: string };
function Capture() {
  child = useQueryClient();
  return null;
}
function View({ onCreated, viewer = viewerId }: any) {
  return (
    <QueryClientProvider client={client}>
      <ChannelQueryBoundary
        key={viewer}
        viewerId={viewer}
        scopeKey={viewer}
        currentScope={currentScope}
      >
        <Capture />
        <StartStudentConversation onCreated={onCreated} />
      </ChannelQueryBoundary>
    </QueryClientProvider>
  );
}
function deferred() {
  let resolve!: (v: any) => void, reject!: (v: any) => void;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  calls.students.mockReset();
  calls.recipients.mockReset();
  calls.start.mockReset();
  calls.students.mockResolvedValue({
    students: [{ student_id: studentId, student_name: "Student" }],
    may_have_more: false,
  });
  calls.recipients.mockImplementation(async ({ data }: any) => ({
    student_id: data.student_id,
    recipients: [{ user_id: recipientId, display_name: "Teammate" }],
  }));
  calls.start.mockResolvedValue(saved);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  currentScope = { current: viewerId };
});
afterEach(() => {
  cleanup();
  client.clear();
});
async function fill() {
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  await screen.findByRole("option", { name: "Student" });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: studentId } });
  await screen.findByRole("option", { name: "Teammate" });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: recipientId } });
  fireEvent.change(screen.getByLabelText("Conversation title"), {
    target: { value: "  Planning  " },
  });
  fireEvent.change(screen.getByLabelText("First message"), {
    target: { value: "Keep this draft" },
  });
}
async function prepare(onCreated = vi.fn()) {
  const view = render(<View onCreated={onCreated} />);
  await fill();
  return { view, created: onCreated };
}
function submit() {
  fireEvent.submit(screen.getByLabelText("First message").closest("form")!);
}
describe("starting a student conversation", () => {
  it("loads lazily and captures original viewer/team/recipient intent", async () => {
    const created = vi.fn();
    render(<View onCreated={created} />);
    expect(calls.students).not.toHaveBeenCalled();
    await fill();
    submit();
    await waitFor(() => expect(created).toHaveBeenCalledExactlyOnceWith(channelId));
    expect(calls.students).toHaveBeenCalledWith({ data: { expected_viewer_id: viewerId } });
    expect(calls.recipients).toHaveBeenCalledWith({
      data: { student_id: studentId, expected_viewer_id: viewerId },
    });
    expect(calls.start).toHaveBeenCalledExactlyOnceWith({
      data: {
        student_id: studentId,
        recipient_id: recipientId,
        title: "Planning",
        first_message: "Keep this draft",
        expected_viewer_id: viewerId,
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).value).toBe("");
  });
  it("retains an unconfirmed draft with controlled recovery", async () => {
    calls.start.mockRejectedValueOnce(new Error("private details"));
    const { created } = await prepare();
    submit();
    await screen.findByText(/Check your conversations before trying again/);
    expect(screen.queryByText("private details")).toBeNull();
    expect(created).not.toHaveBeenCalled();
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).value).toBe(
      "Keep this draft",
    );
    submit();
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
  });
  it("blocks duplicate submits and editing while RPC is pending", async () => {
    const d = deferred();
    calls.start.mockReturnValueOnce(d.promise);
    const { created } = await prepare();
    submit();
    submit();
    expect(calls.start).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Close new conversation" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await act(async () => d.resolve(saved));
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
  });
  it.each([
    null,
    { channel_id: "new-channel" },
    { ...saved, student_id: otherId },
    { ...saved, recipient_id: otherId },
  ])("does not navigate on malformed/mismatched save %j", async (result) => {
    calls.start.mockResolvedValueOnce(result);
    const { created } = await prepare();
    submit();
    await screen.findByText(/Check your conversations before trying again/);
    expect(created).not.toHaveBeenCalled();
  });
  it("keeps confirmed creation separate from failed navigation and retries only opening", async () => {
    const created = vi
      .fn()
      .mockRejectedValueOnce(new Error("navigation failed"))
      .mockResolvedValue(undefined);
    await prepare(created);
    submit();
    await screen.findByText(/Your conversation is saved. We couldn't open it/);
    expect(
      (screen.getByRole("button", { name: "Start and send" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    submit();
    expect(calls.start).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Open Conversation" }));
    await waitFor(() => expect(created).toHaveBeenCalledTimes(2));
    expect(calls.start).toHaveBeenCalledOnce();
  });
  it("locks repeated opening while navigation is pending", async () => {
    const d = deferred(),
      created = vi.fn().mockReturnValue(d.promise);
    await prepare(created);
    submit();
    await screen.findByRole("button", { name: "Opening…" });
    submit();
    expect(calls.start).toHaveBeenCalledOnce();
    expect(created).toHaveBeenCalledOnce();
    await act(async () => d.resolve(undefined));
  });
  it.each(["success", "failure"])("ignores departed account mutation %s", async (outcome) => {
    const d = deferred();
    calls.start.mockReturnValueOnce(d.promise);
    const { view, created } = await prepare();
    const invalidate = vi.spyOn(child, "invalidateQueries");
    submit();
    currentScope.current = otherId;
    view.rerender(<View onCreated={created} viewer={otherId} />);
    await act(async () =>
      outcome === "success" ? d.resolve(saved) : d.reject(new Error("old account")),
    );
    expect(created).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("ignores a creation completed after unmount", async () => {
    const d = deferred();
    calls.start.mockReturnValueOnce(d.promise);
    const { view, created } = await prepare();
    submit();
    view.unmount();
    await act(async () => d.resolve(saved));
    expect(created).not.toHaveBeenCalled();
  });
  it("ignores old A-to-B-to-A form completion", async () => {
    const d = deferred();
    calls.start.mockReturnValueOnce(d.promise);
    const { view, created } = await prepare();
    submit();
    currentScope.current = otherId;
    view.rerender(<View onCreated={created} viewer={otherId} />);
    currentScope.current = viewerId;
    view.rerender(<View onCreated={created} />);
    await act(async () => d.resolve(saved));
    expect(created).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("shows student read failure and reloads instead of inventing an empty team", async () => {
    calls.students.mockRejectedValueOnce(new Error("private"));
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByRole("button", { name: "Reload Student Teams" });
    expect(screen.queryByText(/No connected student team/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reload Student Teams" }));
    await screen.findByRole("option", { name: "Student" });
  });
  it("hides failed cached teams and preserves an unavailable selection", async () => {
    await prepare();
    calls.students.mockRejectedValueOnce(new Error("failed"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Student Teams" }));
    await screen.findByRole("button", { name: "Reload Student Teams" });
    expect(screen.queryByRole("option", { name: "Student" })).toBeNull();
    expect(screen.getByRole("option", { name: "Selected team unavailable" })).toBeTruthy();
    submit();
    expect(calls.start).not.toHaveBeenCalled();
  });
  it("hides failed cached recipients, preserves selection, and reloads", async () => {
    await prepare();
    calls.recipients.mockRejectedValueOnce(new Error("failed"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Teammates" }));
    await screen.findByRole("button", { name: "Reload Teammates" });
    expect(screen.queryByRole("option", { name: "Teammate" })).toBeNull();
    submit();
    expect(calls.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload Teammates" }));
    await screen.findByRole("option", { name: "Teammate" });
    submit();
    await waitFor(() => expect(calls.start).toHaveBeenCalledOnce());
  });
  it("blocks a selected teammate that disappeared on refresh", async () => {
    await prepare();
    calls.recipients.mockResolvedValueOnce({ student_id: studentId, recipients: [] });
    fireEvent.click(screen.getByRole("button", { name: "Refresh Teammates" }));
    await screen.findByRole("option", { name: "Selected teammate unavailable" });
    submit();
    expect(calls.start).not.toHaveBeenCalled();
  });
  it.each([
    {
      students: [
        { student_id: studentId, student_name: "Student" },
        { student_id: studentId, student_name: "Again" },
      ],
      may_have_more: false,
    },
    { students: null, may_have_more: false },
  ])("fails malformed/duplicate students %j", async (result) => {
    calls.students.mockResolvedValueOnce(result);
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByRole("button", { name: "Reload Student Teams" });
  });
  it.each([
    { student_id: otherId, recipients: [{ user_id: recipientId, display_name: "Wrong team" }] },
    { student_id: studentId, recipients: [{ user_id: viewerId, display_name: "Self" }] },
    {
      student_id: studentId,
      recipients: [
        { user_id: recipientId, display_name: "A" },
        { user_id: recipientId, display_name: "B" },
      ],
    },
  ])("fails foreign/self/duplicate teammates %j", async (result) => {
    calls.recipients.mockResolvedValueOnce(result);
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByRole("option", { name: "Student" });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: studentId } });
    await screen.findByRole("button", { name: "Reload Teammates" });
  });
  it("discloses the bounded student list", async () => {
    calls.students.mockResolvedValueOnce({ students: [], may_have_more: true });
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByText(/Up to 100 available student teams/);
  });
  it("closing during student read cannot populate a reopened form", async () => {
    const d = deferred();
    calls.students.mockReturnValueOnce(d.promise);
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await waitFor(() => expect(calls.students).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Close new conversation" }));
    await act(async () =>
      d.resolve({
        students: [{ student_id: otherId, student_name: "Old read" }],
        may_have_more: false,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByRole("option", { name: "Student" });
    expect(screen.queryByText("Old read")).toBeNull();
  });
  it("does not submit while selected metadata is being revalidated", async () => {
    const d = deferred();
    await prepare();
    calls.recipients.mockReturnValueOnce(d.promise);
    fireEvent.click(screen.getByRole("button", { name: "Refresh Teammates" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Start and send" }) as HTMLButtonElement).disabled,
      ).toBe(true),
    );
    submit();
    expect(calls.start).not.toHaveBeenCalled();
    await act(async () =>
      d.resolve({
        student_id: studentId,
        recipients: [{ user_id: recipientId, display_name: "Teammate" }],
      }),
    );
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Start and send" }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });
  it("ignores a previous student's delayed teammates", async () => {
    const d = deferred();
    calls.students.mockResolvedValueOnce({
      students: [
        { student_id: studentId, student_name: "Student" },
        { student_id: otherId, student_name: "Other Student" },
      ],
      may_have_more: false,
    });
    calls.recipients.mockReturnValueOnce(d.promise);
    render(<View onCreated={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    await screen.findByRole("option", { name: "Student" });
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: studentId } });
    await waitFor(() => expect(calls.recipients).toHaveBeenCalledOnce());
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: otherId } });
    await screen.findByRole("option", { name: "Teammate" });
    await act(async () =>
      d.resolve({
        student_id: studentId,
        recipients: [{ user_id: otherId, display_name: "Old teammate" }],
      }),
    );
    expect(screen.queryByRole("option", { name: "Old teammate" })).toBeNull();
    expect(screen.getByRole("option", { name: "Teammate" })).toBeTruthy();
  });
  it("does not classify a failed refresh as failed creation", async () => {
    const created = vi.fn().mockRejectedValue(new Error("stay here"));
    await prepare(created);
    vi.spyOn(child, "invalidateQueries").mockRejectedValue(new Error("refresh failed"));
    submit();
    await screen.findByText(/Your conversation is saved. We couldn't open it/);
    expect(screen.queryByText(/We couldn't confirm this conversation/)).toBeNull();
    submit();
    expect(calls.start).toHaveBeenCalledOnce();
  });
});
