// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ students: vi.fn(), audit: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/students.functions", () => ({ listStudents: api.students }));
vi.mock("@/lib/audit.functions", () => ({ listStudentAuditTrail: api.audit }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/dashboard/BackToDashboard", () => ({ BackToDashboard: () => null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select id="history-student" value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
import { StudentActivityHistory } from "@/components/history/StudentActivityHistory";
import { Route as StudentRoute } from "@/routes/_authenticated/student.history";
import { Route as FamilyRoute } from "@/routes/_authenticated/family.history";
import { Route as EducatorRoute } from "@/routes/_authenticated/educator.history";
import { Route as SchoolRoute } from "@/routes/_authenticated/school.history";
import { Route as DistrictRoute } from "@/routes/_authenticated/district.history";
import { Route as PartnerRoute } from "@/routes/_authenticated/partner.history";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const roster = {
  loadFailed: false,
  students: [
    { id: A, first_name: "First Student" },
    { id: B, first_name: "Second Student" },
  ],
};
const record = (id: string) => ({
  id,
  action: id,
  entity_type: "document",
  actor_id: null,
  actor_email: null,
  entity_id: null,
  metadata: null,
  created_at: "2030-01-01T12:00:00Z",
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
const chooseSecond = () =>
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: B } });
afterEach(() => {
  cleanup();
  api.students.mockReset();
  api.audit.mockReset();
});
it.each([false, true])(
  "switching students ignores old history successes/errors (%s)",
  async (failure) => {
    const old = deferred();
    const current = deferred();
    api.students.mockResolvedValue(roster);
    api.audit.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    render(<StudentActivityHistory />);
    await screen.findByLabelText("Student");
    chooseSecond();
    await waitFor(() => expect(api.audit).toHaveBeenCalledTimes(2));
    await act(async () =>
      failure
        ? old.reject(new Error("Private old detail"))
        : old.resolve({ entries: [record("old_history")] }),
    );
    expect(screen.queryByText("Old history — document")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Loading history…")).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Recent Activity/ }).textContent).toContain("0");
    await act(async () => current.resolve({ entries: [record("current_history")] }));
    expect(screen.getByText("Current history — document")).toBeTruthy();
    expect(api.audit.mock.calls[1][0]).toEqual({ data: { student_id: B, limit: 200 } });
  },
);
it("switching immediately clears loaded rows, counts and the previous filter", async () => {
  const next = deferred();
  api.students.mockResolvedValue(roster);
  api.audit
    .mockResolvedValueOnce({ entries: [record("first_history")] })
    .mockReturnValueOnce(next.promise);
  render(<StudentActivityHistory />);
  await screen.findByText("First history — document");
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Documents/ }));
  expect(screen.getByRole("tab", { name: /Documents/ }).getAttribute("aria-selected")).toBe("true");
  chooseSecond();
  expect(screen.queryByText("First history — document")).toBeNull();
  expect(screen.getByRole("tab", { name: /Recent Activity/ }).getAttribute("aria-selected")).toBe(
    "true",
  );
  expect(screen.getByRole("tab", { name: /Documents/ }).textContent).toContain("0");
  await act(async () => next.resolve({ entries: [] }));
  expect(
    screen.getByText(/No recent activity is available in this view for Second Student/),
  ).toBeTruthy();
});
it("a current history failure is generic, retryable and distinct from empty history", async () => {
  api.students.mockResolvedValue(roster);
  api.audit
    .mockRejectedValueOnce(new Error("Private detail"))
    .mockResolvedValueOnce({ entries: [record("retried_history")] });
  render(<StudentActivityHistory />);
  const alert = await screen.findByRole("alert");
  expect(alert.textContent).toContain("History could not be loaded");
  expect(alert.textContent).not.toContain("Private detail");
  expect(screen.queryByText("No Recent Activity Available")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
  await screen.findByText("Retried history — document");
  expect(api.audit.mock.calls[1][0]).toEqual({ data: { student_id: A, limit: 200 } });
});
it.each(["rejected", "loadFailed"])(
  "student-list %s failure cannot masquerade as no records",
  async (kind) => {
    if (kind === "rejected") api.students.mockRejectedValueOnce(new Error("Private roster detail"));
    else api.students.mockResolvedValueOnce({ students: [], loadFailed: true });
    api.students.mockResolvedValueOnce(roster);
    api.audit.mockResolvedValue({ entries: [] });
    render(<StudentActivityHistory />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Student records could not be loaded");
    expect(screen.queryByText("No Student Record Available")).toBeNull();
    expect(api.audit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry", exact: true }));
    await screen.findByLabelText("Student");
    await screen.findByText("No Recent Activity Available");
    expect(api.students).toHaveBeenCalledTimes(2);
  },
);
it("successfully loaded empty rosters retain the role's empty-state destination", async () => {
  api.students.mockResolvedValue({ students: [], loadFailed: false });
  render(
    <StudentActivityHistory emptyCta={{ label: "School Overview", to: "/school/overview" }} />,
  );
  await screen.findByText("No Student Record Available");
  expect(screen.getByRole("link", { name: "School Overview" }).getAttribute("href")).toBe(
    "/school/overview",
  );
  expect(api.audit).not.toHaveBeenCalled();
});
it.each(["students", "audit"])("departure discards pending %s completions", async (stage) => {
  const pending = deferred();
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({ entries: [] });
  api[stage].mockReturnValueOnce(pending.promise);
  const view = render(<StudentActivityHistory />);
  if (stage === "audit") await waitFor(() => expect(api.audit).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => pending.reject(new Error("Departed detail")));
  expect(screen.queryByRole("alert")).toBeNull();
  if (stage === "students") expect(api.audit).not.toHaveBeenCalled();
});
it("Strict Mode replay does not accept an obsolete roster or audit result", async () => {
  const oldRoster = deferred();
  const oldAudit = deferred();
  api.students.mockReturnValueOnce(oldRoster.promise).mockResolvedValue(roster);
  api.audit
    .mockReturnValueOnce(oldAudit.promise)
    .mockResolvedValue({ entries: [record("latest_history")] });
  render(
    <StrictMode>
      <StudentActivityHistory />
    </StrictMode>,
  );
  await screen.findByText("Latest history — document");
  await act(async () => {
    oldRoster.resolve({ students: [], loadFailed: false });
    oldAudit.resolve({ entries: [record("obsolete_history")] });
  });
  expect(screen.getByText("Latest history — document")).toBeTruthy();
  expect(screen.queryByText("Obsolete history — document")).toBeNull();
  expect(screen.queryByText("No Student Record Available")).toBeNull();
});
for (const [role, route] of [
  ["Student", StudentRoute],
  ["Family", FamilyRoute],
  ["Educator", EducatorRoute],
  ["School", SchoolRoute],
  ["District", DistrictRoute],
  ["Partner", PartnerRoute],
] as const) {
  it(`${role} existing history page inherits recent-window and load-failure guidance`, async () => {
    api.students.mockResolvedValue(roster);
    api.audit.mockRejectedValue(new Error("Private backend detail"));
    const Page = route.options.component as any;
    render(<Page />);
    await screen.findByRole("alert");
    expect(screen.getByText(/This view shows up to 200 records/)).toBeTruthy();
    expect(screen.queryByText("No Recent Activity Available")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeTruthy();
  });
}
