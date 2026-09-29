// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const calls = vi.hoisted(() => ({ students: vi.fn(), recipients: vi.fn(), start: vi.fn(), error: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/channels.functions", () => ({
  listStartableStudentChannels: calls.students,
  listStudentChannelRecipients: calls.recipients,
  startStudentChannel: calls.start,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: calls.error } }));
// Native select controls exercise form state without mocking query/mutation behavior.
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, disabled, children }: { value: string; onValueChange: (value: string) => void; disabled?: boolean; children: ReactNode }) =>
    <select value={value} disabled={disabled} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: () => <option value="">Choose</option>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => <option value={value}>{children}</option>,
}));

import { StartStudentConversation } from "../../src/components/channels/StartStudentConversation";

const studentId = "00000000-0000-4000-8000-000000000010";
const recipientId = "00000000-0000-4000-8000-000000000002";
let client: QueryClient;
beforeEach(() => {
  vi.clearAllMocks();
  calls.students.mockResolvedValue({ students: [{ student_id: studentId, student_name: "Student" }] });
  calls.recipients.mockResolvedValue({ recipients: [{ user_id: recipientId, display_name: "Teammate" }] });
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); });

async function prepare(onCreated = vi.fn()) {
  render(<QueryClientProvider client={client}><StartStudentConversation onCreated={onCreated} /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  await screen.findByRole("option", { name: "Student" });
  fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: studentId } });
  await screen.findByRole("option", { name: "Teammate" });
  fireEvent.change(screen.getAllByRole("combobox")[1], { target: { value: recipientId } });
  fireEvent.change(screen.getByLabelText("Conversation title"), { target: { value: "  Planning  " } });
  fireEvent.change(screen.getByLabelText("First message"), { target: { value: "Keep this draft" } });
  return onCreated;
}

describe("starting a student conversation", () => {
  it("retains the draft after access is denied and allows a successful retry", async () => {
    calls.start.mockRejectedValueOnce(new Error("Team access changed"));
    const created = await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Start and send" }));
    await waitFor(() => expect(calls.error).toHaveBeenCalledWith("Team access changed"));
    expect((screen.getByLabelText("Conversation title") as HTMLInputElement).value).toBe("  Planning  ");
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).value).toBe("Keep this draft");
    expect(created).not.toHaveBeenCalled();
    calls.start.mockResolvedValueOnce({ channel_id: "new-channel" });
    fireEvent.click(screen.getByRole("button", { name: "Start and send" }));
    await waitFor(() => expect(created).toHaveBeenCalledExactlyOnceWith("new-channel"));
    expect(calls.start).toHaveBeenLastCalledWith({ data: { student_id: studentId, recipient_id: recipientId, title: "Planning", first_message: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).value).toBe("");
  });
  it("prevents duplicate sends and edits while the first message is in flight", async () => {
    let finish!: (value: { channel_id: string }) => void;
    calls.start.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const created = await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Start and send" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Starting…" }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByLabelText("First message") as HTMLTextAreaElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Close new conversation" }) as HTMLButtonElement).disabled).toBe(true);
    expect(calls.start).toHaveBeenCalledOnce();
    finish({ channel_id: "new-channel" });
    await waitFor(() => expect(created).toHaveBeenCalledOnce());
  });
});
