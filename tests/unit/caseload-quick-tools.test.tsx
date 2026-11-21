// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: { id: "viewer" } as { id: string } | null,
  loading: false,
  notes: vi.fn(),
  note: vi.fn(),
  action: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  changed: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/caseload.functions", () => ({
  listStudentNotes: api.notes,
  addCaseManagerNote: api.note,
  quickAssignActionItem: api.action,
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
import { CaseloadQuickTools } from "../../src/components/students/CaseloadQuickTools";
const row = { id: "student-a", relationship: "editor" } as any;
const receipt = ({ data }: any) => ({
  ...data,
  id: data.request_id,
  created_by_user_id: data.expected_viewer_id,
});
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((yes) => (resolve = yes));
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: "viewer" };
  api.loading = false;
  api.notes.mockResolvedValue({ notes: [], canEdit: true });
  api.action.mockImplementation(async (args) => receipt(args));
  api.note.mockImplementation(async (args) => receipt(args));
});
afterEach(cleanup);
const input = () => screen.getByPlaceholderText("e.g. Schedule transition planning meeting");
async function ready() {
  await waitFor(() => expect(api.notes).toHaveBeenCalled());
  await act(async () => {});
}
it("view-only rows cannot create actions or notes even if an older notes reply says editable", async () => {
  render(<CaseloadQuickTools row={{ ...row, relationship: "viewer" }} onChanged={api.changed} />);
  await ready();
  fireEvent.change(input(), { target: { value: "Practice" } });
  fireEvent.change(screen.getByPlaceholderText(/What changed this week/), {
    target: { value: "Observe" },
  });
  expect((screen.getByRole("button", { name: "Assign" }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Save Note" }) as HTMLButtonElement).disabled).toBe(
    true,
  );
  fireEvent.submit(input().closest("form")!);
  expect(api.action).not.toHaveBeenCalled();
  expect(api.note).not.toHaveBeenCalled();
});
it("failed note read stays visible and blocks changes", async () => {
  api.notes.mockRejectedValue(Error());
  render(<CaseloadQuickTools row={row} onChanged={api.changed} />);
  await screen.findByRole("alert");
  fireEvent.change(input(), { target: { value: "Practice" } });
  fireEvent.submit(input().closest("form")!);
  expect(api.action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Refresh Saved Records" }));
  expect(api.changed).toHaveBeenCalledOnce();
});
it("quick actions carry exact viewer/student/request identity and confirmed success", async () => {
  render(<CaseloadQuickTools row={row} onChanged={api.changed} />);
  await ready();
  fireEvent.change(input(), { target: { value: "  Practice  " } });
  fireEvent.click(screen.getByRole("button", { name: "Assign" }));
  await waitFor(() => expect(api.success).toHaveBeenCalledWith("Action item created."));
  expect(api.action.mock.calls[0][0].data).toMatchObject({
    student_id: "student-a",
    expected_viewer_id: "viewer",
    category: "educator",
    title: "Practice",
    request_id: expect.any(String),
  });
});
it("unconfirmed response preserves draft and blocks repeats until refreshed", async () => {
  api.action.mockResolvedValue({});
  render(<CaseloadQuickTools row={row} onChanged={api.changed} />);
  await ready();
  fireEvent.change(input(), { target: { value: "Practice" } });
  fireEvent.click(screen.getByRole("button", { name: "Assign" }));
  await screen.findByRole("alert");
  fireEvent.submit(input().closest("form")!);
  expect(api.action).toHaveBeenCalledOnce();
  expect((input() as HTMLInputElement).value).toBe("Practice");
  expect(api.success).not.toHaveBeenCalled();
});
it("same-tick submissions are serialized across note and action forms", async () => {
  const pending = deferred();
  api.action.mockReturnValue(pending.promise);
  render(<CaseloadQuickTools row={row} onChanged={api.changed} />);
  await ready();
  fireEvent.change(input(), { target: { value: "Practice" } });
  const note = screen.getByPlaceholderText(/What changed this week/);
  fireEvent.change(note, { target: { value: "Observe" } });
  fireEvent.submit(input().closest("form")!);
  fireEvent.submit(input().closest("form")!);
  fireEvent.submit(note.closest("form")!);
  expect(api.action).toHaveBeenCalledOnce();
  expect(api.note).not.toHaveBeenCalled();
  await act(async () => pending.resolve(receipt(api.action.mock.calls[0][0])));
});
it("departed writes cannot announce success or refresh another student", async () => {
  const pending = deferred();
  api.action.mockReturnValue(pending.promise);
  const v = render(<CaseloadQuickTools key="a" row={row} onChanged={api.changed} />);
  await ready();
  fireEvent.change(input(), { target: { value: "Practice" } });
  fireEvent.click(screen.getByRole("button", { name: "Assign" }));
  v.rerender(
    <CaseloadQuickTools key="b" row={{ ...row, id: "student-b" }} onChanged={api.changed} />,
  );
  await act(async () => pending.resolve(receipt(api.action.mock.calls[0][0])));
  expect(api.success).not.toHaveBeenCalled();
  expect(api.changed).not.toHaveBeenCalled();
});
it("note saves require an exact returned receipt before clearing the draft", async () => {
  api.note.mockResolvedValue({});
  render(<CaseloadQuickTools row={row} onChanged={api.changed} />);
  await ready();
  const note = screen.getByPlaceholderText(/What changed this week/);
  fireEvent.change(note, { target: { value: "Observe" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Note" }));
  await screen.findByRole("alert");
  expect(api.success).not.toHaveBeenCalled();
  expect((note as HTMLTextAreaElement).value).toBe("Observe");
  expect(api.note).toHaveBeenCalledOnce();
});
