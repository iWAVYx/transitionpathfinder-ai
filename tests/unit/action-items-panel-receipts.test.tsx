// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: { id: "viewer-a" } as { id: string } | null,
  loading: false,
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/action-items.functions", () => ({
  listStudentActionItems: api.list,
  createStudentActionItem: api.create,
  updateStudentActionItem: api.update,
  deleteStudentActionItem: api.remove,
}));
vi.mock("@/components/students/PartnerSuggestedActions", () => ({
  PartnerSuggestedActions: () => null,
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
import { ActionItemsPanel } from "../../src/components/students/ActionItemsPanel";
const row = (student = "student-a") => ({
  id: "action-a",
  student_id: student,
  title: "Current next step",
  status: "not_started",
  category: "family",
  priority: "medium",
  updated_at: "2026-11-19T12:00:00.000001Z",
  assigned_to_user_id: null,
});
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((yes) => (resolve = yes));
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: "viewer-a" };
  api.loading = false;
  api.list.mockResolvedValue({ items: [row()], canEdit: true });
});
afterEach(cleanup);
it("shows unknown progress during loading and a truthful unavailable state after failed reads", async () => {
  api.list.mockRejectedValueOnce(Error("PRIVATE SQL"));
  render(<ActionItemsPanel studentId="student-a" />);
  expect(screen.queryByText("0%")).toBeNull();
  await screen.findByRole("button", { name: "Refresh Saved Action Items" });
  expect(screen.queryByText(/No action items yet/)).toBeNull();
  expect(screen.queryByText("PRIVATE SQL")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Saved Action Items" }));
  await screen.findByText("Current next step");
});
it("does not offer editing to an unassigned read-only viewer", async () => {
  api.list.mockResolvedValue({ items: [row()], canEdit: false });
  render(<ActionItemsPanel studentId="student-a" />);
  const select = await screen.findByLabelText("Status");
  expect((select as HTMLSelectElement).disabled).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Add action item" }) as HTMLButtonElement).disabled,
  ).toBe(true);
});
it("retains assignee status editing without permitting new items", async () => {
  api.list.mockResolvedValue({
    items: [{ ...row(), assigned_to_user_id: "viewer-a" }],
    canEdit: false,
  });
  render(<ActionItemsPanel studentId="student-a" />);
  const select = await screen.findByLabelText("Status");
  expect((select as HTMLSelectElement).disabled).toBe(false);
  expect(
    (screen.getByRole("button", { name: "Add action item" }) as HTMLButtonElement).disabled,
  ).toBe(true);
});
it("sends the loaded student, account and exact revision and blocks after an uncertain update", async () => {
  api.update.mockRejectedValue(Error("Unconfirmed"));
  render(<ActionItemsPanel studentId="student-a" />);
  const select = await screen.findByLabelText("Status");
  fireEvent.change(select, { target: { value: "completed" } });
  await screen.findByRole("button", { name: "Refresh Saved Action Items" });
  expect(api.update).toHaveBeenCalledWith({
    data: {
      id: "action-a",
      student_id: "student-a",
      expected_viewer_id: "viewer-a",
      expected_updated_at: row().updated_at,
      status: "completed",
    },
  });
  expect(api.success).not.toHaveBeenCalled();
  expect(api.list).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("100%")).toBeNull();
});
for (const departure of ["student", "account", "signout"])
  it("hides loaded data immediately and ignores late replies on " + departure, async () => {
    const view = render(<ActionItemsPanel studentId="student-a" />);
    await screen.findByText("Current next step");
    const pending = deferred();
    api.list.mockReturnValue(pending.promise);
    if (departure === "account") api.user = { id: "viewer-b" };
    if (departure === "signout") api.user = null;
    view.rerender(
      <ActionItemsPanel studentId={departure === "student" ? "student-b" : "student-a"} />,
    );
    expect(screen.queryByText("Current next step")).toBeNull();
    await act(async () => pending.resolve({ items: [], canEdit: false }));
    await waitFor(() => expect(screen.queryByText("Current next step")).toBeNull());
  });
