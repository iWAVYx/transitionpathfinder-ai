// @vitest-environment jsdom
import React from "react";
import { render, screen, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { it, expect, vi, beforeEach, afterEach } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "00000000-0000-4000-8000-000000000001",
  close: vi.fn(),
  recover: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: api.viewer }, loading: false }),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => options,
  Link: ({ children, ...props }: any) => <a>{children}</a>,
}));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/empty/IllustratedEmptyState", () => ({
  IllustratedEmptyState: ({ title }: any) => <p>{title}</p>,
}));
vi.mock("@/lib/students.functions", () => ({
  closeStudentCreationRequest: api.close,
  readStudentCreationOutcome: api.recover,
  listStudents: api.list,
  createStudent: api.create,
  deleteStudent: api.remove,
}));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
import { Route } from "../../src/routes/_authenticated/students.index";
const Page = (Route as any).component;
const row = {
  id: "00000000-0000-4000-8000-000000000002",
  owner_id: api.viewer,
  first_name: "Sample",
  last_name: null,
  updated_at: "2026-11-21T10:00:00.123456Z",
};
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: { request: vi.fn(async (_key, _options, run) => run({})) },
  });
  vi.clearAllMocks();
  api.viewer = row.owner_id;
  api.list.mockResolvedValue({ students: [row], loadFailed: false });
  api.remove.mockResolvedValue({ ok: true, deleted_id: row.id });
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("passes exact loaded student revision and account to deletion", async () => {
  render(<Page />);
  fireEvent.click(await screen.findByLabelText("Delete Sample"));
  await waitFor(() =>
    expect(api.remove).toHaveBeenCalledExactlyOnceWith({
      data: { id: row.id, expected_updated_at: row.updated_at, expected_viewer_id: row.owner_id },
    }),
  );
});
it("does not offer enabled deletion to another owner", async () => {
  api.list.mockResolvedValue({ students: [{ ...row, owner_id: "other" }], loadFailed: false });
  render(<Page />);
  expect(((await screen.findByLabelText("Delete Sample")) as HTMLButtonElement).disabled).toBe(
    true,
  );
});
it("failed list is not presented as no students", async () => {
  api.list.mockResolvedValue({ students: [], loadFailed: true });
  render(<Page />);
  expect((await screen.findByRole("alert")).textContent).toContain("couldn't load");
  expect(screen.queryByText("No Students Yet")).toBeNull();
  expect(screen.getByText("Student information is unavailable.")).toBeTruthy();
});
it("blocks repeat deletion after an uncertain result", async () => {
  api.remove.mockRejectedValue(Error("Removal unconfirmed"));
  render(<Page />);
  const button = await screen.findByLabelText("Delete Sample");
  fireEvent.click(button);
  await screen.findByText("Removal unconfirmed");
  fireEvent.click(button);
  expect(api.remove).toHaveBeenCalledOnce();
  expect((button as HTMLButtonElement).disabled).toBe(true);
});
it("ignores an old deletion reply after account departure", async () => {
  let finish: (x: any) => void = () => {};
  api.remove.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = render(<Page />);
  fireEvent.click(await screen.findByLabelText("Delete Sample"));
  api.viewer = "00000000-0000-4000-8000-000000000009";
  api.list.mockResolvedValue({ students: [], loadFailed: false });
  view.rerender(<Page />);
  await screen.findByText("No Students Yet");
  const calls = api.list.mock.calls.length;
  await act(async () => finish({ ok: true }));
  expect(api.list).toHaveBeenCalledTimes(calls);
  expect(api.success).not.toHaveBeenCalled();
});

const intent = {
  version: 1,
  requestId: row.id,
  origin: "students",
  kind: "linked",
  role: "linked",
};
const pendingKey = () => `tf:student-creation:v1:${api.viewer}`;
it("restores an uncertain creation after remount and acknowledges only a fresh present outcome", async () => {
  api.create.mockRejectedValue(Error("Reply lost"));
  render(<Page />);
  fireEvent.click(await screen.findByText("Add student"));
  fireEvent.change(screen.getByRole("textbox", { name: "First name *" }), {
    target: { value: "Fictional" },
  });
  fireEvent.click(screen.getByText("Save student"));
  await screen.findByText("Reply lost");
  const saved = JSON.parse(localStorage.getItem(pendingKey())!);
  expect(saved.requestId).toBe(api.create.mock.calls[0][0].data.request_id);
  expect(JSON.stringify(saved)).not.toContain("Fictional");
  cleanup();
  api.recover.mockResolvedValue({ status: "present", student_id: saved.requestId });
  render(<Page />);
  expect(((await screen.findByText("Add student")) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Continue With Saved Profile"));
  await waitFor(() => expect(localStorage.getItem(pendingKey())).toBeNull());
  expect(api.create).toHaveBeenCalledTimes(1);
  expect(api.recover).toHaveBeenCalledTimes(2);
});
for (const status of ["removed", "unconfirmed"])
  it("does not offer recreation for " + status, async () => {
    localStorage.setItem(pendingKey(), JSON.stringify(intent));
    api.recover.mockResolvedValue({ status });
    render(<Page />);
    fireEvent.click(await screen.findByText("Check Saved Setup"));
    await waitFor(() => expect(api.recover).toHaveBeenCalled());
    expect(screen.queryByText("Continue With Saved Profile")).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
    expect(localStorage.getItem(pendingKey())).not.toBeNull();
  });
it("corrupt recovery storage blocks creation rather than discarding the marker", async () => {
  localStorage.setItem(pendingKey(), "broken");
  render(<Page />);
  await screen.findByText(/couldn't safely check/);
  expect((screen.getByText("Add student") as HTMLButtonElement).disabled).toBe(true);
  expect(api.create).not.toHaveBeenCalled();
});
it("onboarding recovery cannot be cleared from Add Student", async () => {
  localStorage.setItem(
    pendingKey(),
    JSON.stringify({ ...intent, origin: "onboarding", role: "parent" }),
  );
  api.recover.mockResolvedValue({ status: "present", student_id: row.id });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  await waitFor(() => expect(api.recover).toHaveBeenCalled());
  expect(screen.queryByText("Continue With Saved Profile")).toBeNull();
  expect(screen.getByText("Return to Account Setup")).toBeTruthy();
});
it("changed account cannot clear a late recovered profile", async () => {
  localStorage.setItem(pendingKey(), JSON.stringify(intent));
  let finish: (v: any) => void = () => {};
  api.recover.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  const view = render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  api.viewer = "00000000-0000-4000-8000-000000000099";
  view.rerender(<Page />);
  await act(async () => finish({ status: "present", student_id: row.id }));
  expect(screen.queryByText("Continue With Saved Profile")).toBeNull();
  expect(localStorage.getItem(`tf:student-creation:v1:${row.owner_id}`)).not.toBeNull();
});

it("only server-confirmed closure clears an unknown request and permits a fresh creation", async () => {
  localStorage.setItem(pendingKey(), JSON.stringify(intent));
  api.recover.mockResolvedValue({ status: "unconfirmed" });
  api.close.mockResolvedValue({ status: "closed" });
  api.create.mockResolvedValue({ id: "new" });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Close This Setup Request"));
  await screen.findByText("Save student");
  expect(api.close).toHaveBeenCalledExactlyOnceWith({
    data: { expected_viewer_id: api.viewer, request_id: row.id, kind: "linked" },
  });
  expect(localStorage.getItem(pendingKey())).toBeNull();
  fireEvent.change(screen.getByRole("textbox", { name: "First name *" }), {
    target: { value: "Fictional" },
  });
  fireEvent.click(screen.getByText("Save student"));
  await waitFor(() => expect(api.create).toHaveBeenCalledOnce());
  expect(api.create.mock.calls[0][0].data.request_id).not.toBe(row.id);
});
it("committed creation discovered during closure keeps the marker and offers its saved profile", async () => {
  localStorage.setItem(pendingKey(), JSON.stringify(intent));
  api.recover.mockResolvedValue({ status: "unconfirmed" });
  api.close.mockResolvedValue({ status: "present", student_id: row.id });
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Close This Setup Request"));
  await screen.findByText("Continue With Saved Profile");
  expect(localStorage.getItem(pendingKey())).not.toBeNull();
  expect(api.create).not.toHaveBeenCalled();
});
it("lost closure reply does not clear the marker or authorize another creation", async () => {
  localStorage.setItem(pendingKey(), JSON.stringify(intent));
  api.recover.mockResolvedValue({ status: "unconfirmed" });
  api.close.mockRejectedValue(Error("lost"));
  render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Close This Setup Request"));
  await screen.findByText(/couldn't confirm that the setup request was closed/);
  expect(localStorage.getItem(pendingKey())).not.toBeNull();
  expect(api.create).not.toHaveBeenCalled();
  expect((screen.getByText("Add student") as HTMLButtonElement).disabled).toBe(true);
});
it("an account change cannot clear the old account marker after closure", async () => {
  localStorage.setItem(pendingKey(), JSON.stringify(intent));
  api.recover.mockResolvedValue({ status: "unconfirmed" });
  let finish: (v: any) => void = () => {};
  api.close.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  const view = render(<Page />);
  fireEvent.click(await screen.findByText("Check Saved Setup"));
  fireEvent.click(await screen.findByText("Close This Setup Request"));
  api.viewer = "00000000-0000-4000-8000-000000000099";
  view.rerender(<Page />);
  await act(async () => finish({ status: "closed" }));
  expect(localStorage.getItem(`tf:student-creation:v1:${row.owner_id}`)).not.toBeNull();
});
