// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ audit: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/audit.functions", () => ({ listStudentAuditTrail: api.audit }));
import { AuditTrailPanel } from "@/components/students/AuditTrailPanel";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const entry = (action = "document.signed_url.mint", actor_id: string | null = A) => ({
  id: A,
  action,
  actor_id,
  actor_email: null,
  entity_type: "document",
  entity_id: A,
  metadata: { private: "Private metadata" },
  created_at: "2026-10-01T12:00:00Z",
});
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function toggle() {
  fireEvent.click(screen.getByRole("button", { name: "Audit Trail" }));
}
afterEach(() => {
  cleanup();
  api.audit.mockReset();
});
it("loads lazily with the existing recent-50 contract and accessible toggle", async () => {
  api.audit.mockResolvedValue({ entries: [entry()] });
  render(<AuditTrailPanel studentId={A} />);
  const button = screen.getByRole("button", { name: "Audit Trail" });
  expect(api.audit).not.toHaveBeenCalled();
  expect(button.getAttribute("aria-expanded")).toBe("false");
  expect(document.getElementById(button.getAttribute("aria-controls")!)?.hidden).toBe(true);
  toggle();
  await screen.findByText("Document Access Link Created");
  expect(api.audit).toHaveBeenCalledWith({ data: { student_id: A, limit: 50 } });
  expect(button.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText(/Up to 50 records/)).toBeTruthy();
  expect(screen.getByText("Recorded by Team member")).toBeTruthy();
  expect(document.body.textContent).not.toContain(A);
  expect(document.body.textContent).not.toContain("Private metadata");
  expect(screen.queryByText("Document Viewed")).toBeNull();
});
it("clears loaded rows and resets expansion immediately when the student changes", async () => {
  api.audit.mockResolvedValue({ entries: [entry()] });
  const view = render(<AuditTrailPanel studentId={A} />);
  toggle();
  await screen.findByText("Document Access Link Created");
  view.rerender(<AuditTrailPanel studentId={B} />);
  expect(screen.queryByText("Document Access Link Created")).toBeNull();
  expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
  expect(api.audit).toHaveBeenCalledTimes(1);
  toggle();
  await waitFor(() =>
    expect(api.audit).toHaveBeenLastCalledWith({ data: { student_id: B, limit: 50 } }),
  );
});
it.each([false, true])(
  "discards an old student's late completion (failure %s)",
  async (failure) => {
    const old = deferred();
    const current = deferred();
    api.audit.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const view = render(<AuditTrailPanel studentId={A} />);
    toggle();
    view.rerender(<AuditTrailPanel studentId={B} />);
    toggle();
    await act(async () => {
      failure ? old.reject(new Error("Private old error")) : old.resolve({ entries: [entry()] });
    });
    expect(screen.queryByText("Document Access Link Created")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => current.resolve({ entries: [entry("document.view", null)] }));
    expect(screen.getByText("Document Viewed")).toBeTruthy();
  },
);
it("distinguishes failure from an empty result and retries the current student", async () => {
  api.audit
    .mockRejectedValueOnce(new Error("Private backend detail"))
    .mockResolvedValueOnce({ entries: [] });
  render(<AuditTrailPanel studentId={A} />);
  toggle();
  await screen.findByRole("alert");
  expect(screen.queryByText("No recent activity is available in this view.")).toBeNull();
  expect(document.body.textContent).not.toContain("Private backend detail");
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("No recent activity is available in this view.");
  expect(api.audit).toHaveBeenCalledTimes(2);
  expect(api.audit).toHaveBeenLastCalledWith({ data: { student_id: A, limit: 50 } });
  toggle();
  toggle();
  await waitFor(() => expect(api.audit).toHaveBeenCalledTimes(3));
});
it.each([false, true])(
  "collapse/reopen discards the earlier request (failure %s)",
  async (failure) => {
    const old = deferred();
    const current = deferred();
    api.audit.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    render(<AuditTrailPanel studentId={A} />);
    toggle();
    toggle();
    toggle();
    await act(async () => current.resolve({ entries: [entry("document.view")] }));
    await act(async () => {
      failure ? old.reject(new Error("Old error")) : old.resolve({ entries: [entry()] });
    });
    expect(screen.getByText("Document Viewed")).toBeTruthy();
    expect(screen.queryByText("Document Access Link Created")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  },
);
it.each([false, true])("unmount ignores pending completion (failure %s)", async (failure) => {
  const pending = deferred();
  api.audit.mockReturnValue(pending.promise);
  const view = render(<AuditTrailPanel studentId={A} />);
  toggle();
  view.unmount();
  await act(async () => {
    failure ? pending.reject(new Error("Private error")) : pending.resolve({ entries: [entry()] });
  });
  expect(document.body.textContent).toBe("");
});
it("works under StrictMode and clears failure when switching students", async () => {
  api.audit.mockRejectedValueOnce(new Error("Private failure")).mockResolvedValue({ entries: [] });
  const view = render(
    <StrictMode>
      <AuditTrailPanel studentId={A} />
    </StrictMode>,
  );
  toggle();
  await screen.findByRole("alert");
  view.rerender(
    <StrictMode>
      <AuditTrailPanel studentId={B} />
    </StrictMode>,
  );
  expect(screen.queryByRole("alert")).toBeNull();
  toggle();
  await screen.findByText("No recent activity is available in this view.");
});
it("does not read without a selected student", () => {
  render(<AuditTrailPanel studentId="" />);
  toggle();
  expect(screen.getByText("Choose a student to review activity.")).toBeTruthy();
  expect(api.audit).not.toHaveBeenCalled();
});
it("shows permitted email or system attribution and an honest unavailable time", async () => {
  api.audit.mockResolvedValue({
    entries: [
      { ...entry("document.view", null), actor_email: "synthetic@example.test", created_at: "bad" },
      { ...entry("document.download", null), id: B },
    ],
  });
  render(<AuditTrailPanel studentId={A} />);
  toggle();
  await screen.findByText("Recorded by synthetic@example.test");
  expect(screen.getByText("Recorded by System")).toBeTruthy();
  expect(screen.getByText("Recorded time unavailable")).toBeTruthy();
});
