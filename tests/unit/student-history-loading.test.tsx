// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  students: vi.fn(),
  audit: vi.fn(),
  organizationRoster: vi.fn(),
  roles: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  createFileRoute: () => (options: any) => ({ options }),
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));
vi.mock("@/lib/organization-history.functions", () => ({
  getOrganizationHistoryRoster: api.organizationRoster,
}));
vi.mock("@/lib/audit.functions", () => ({
  listStudentAuditTrail: api.audit,
  listStudentAuditPage: api.audit,
  listHistoryStudents: api.students,
}));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: api.roles }));
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
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
} from "@tanstack/react-router";
import { OrganizationActivityHistory } from "@/components/history/OrganizationActivityHistory";
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
  api.organizationRoster.mockReset();
  api.roles.mockReset();
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
const historyRoutes = [
  ["Student", StudentRoute],
  ["Family", FamilyRoute],
  ["Educator", EducatorRoute],
  ["School", SchoolRoute],
  ["District", DistrictRoute],
  ["Partner", PartnerRoute],
] as const;
for (const [role, route] of historyRoutes) {
  it(`${role} existing history page inherits recent-window and load-failure guidance`, async () => {
    api.students.mockResolvedValue(roster);
    api.audit.mockRejectedValue(new Error("Private backend detail"));
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    await renderHistoryRoute(role, route);
    await screen.findByRole("alert");
    expect(screen.getByText(/This view loads up to 200 records/)).toBeTruthy();
    expect(screen.queryByText("No Recent Activity Available")).toBeNull();
    expect(screen.getByRole("button", { name: "Retry", exact: true })).toBeTruthy();
    if (role === "School" || role === "District") {
      expect(api.students).not.toHaveBeenCalled();
      expect(api.audit).toHaveBeenCalledWith({
        data: { student_id: A, limit: 200, organization: { scope: role.toLowerCase(), id: A } },
      });
    }
  });
}

async function organizationPage(scope: "school" | "district", explicit = true) {
  const root = createRootRoute();
  const key = scope === "school" ? "org_id" : "district_id";
  const page = createRoute({
    getParentRoute: () => root,
    path: `/${scope}/history`,
    component: () => <OrganizationActivityHistory scope={scope} />,
  });
  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({
      initialEntries: [
        `/${scope}/history${explicit ? `?${key}=${A}&filter=documents` : "?filter=documents"}#kept`,
      ],
    }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return { router, key };
}
it.each(["school", "district"] as const)(
  "%s history canonicalizes an authorized default without a generic student request",
  async (scope) => {
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockResolvedValue({ entries: [] });
    const { router, key } = await organizationPage(scope, false);
    await screen.findByText(/This view loads up to 200 records/);
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ [key]: A, filter: "documents" }),
    );
    expect(router.state.location.hash).toBe("kept");
    expect(api.organizationRoster).toHaveBeenCalledOnce();
    expect(api.students).not.toHaveBeenCalled();
  },
);
it.each(["school", "district"] as const)(
  "%s history hides departed organization activity and ignores its late failure",
  async (scope) => {
    const pending = deferred();
    api.organizationRoster.mockImplementation(({ data }: any) =>
      Promise.resolve({
        organization_id: data.organization_id,
        students: [
          {
            id: data.organization_id,
            first_name: data.organization_id === A ? "First Student" : "Second Student",
            last_name: null,
          },
        ],
      }),
    );
    api.audit
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue({ entries: [record("current_organization")] });
    const { router, key } = await organizationPage(scope);
    await waitFor(() => expect(api.audit).toHaveBeenCalledOnce());
    await act(() => router.navigate({ to: `/${scope}/history`, search: { [key]: B } }));
    await screen.findByText("Current organization — document");
    await act(() => pending.reject(new Error("Departed private detail")));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText("First Student")).toBeNull();
    expect(api.audit).toHaveBeenLastCalledWith({
      data: { student_id: B, limit: 200, organization: { scope, id: B } },
    });
    expect(api.students).not.toHaveBeenCalled();
  },
);
it.each(["school", "district"] as const)(
  "%s history offers explicit recovery without silently replacing a failed selection",
  async (scope) => {
    api.organizationRoster
      .mockRejectedValueOnce(new Error("Private denied detail"))
      .mockResolvedValue({ organization_id: B, students: [] });
    const { router, key } = await organizationPage(scope);
    await screen.findByRole("alert");
    expect(api.organizationRoster).toHaveBeenCalledOnce();
    expect(router.state.location.search).toMatchObject({ [key]: A, filter: "documents" });
    expect(api.audit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Load an Available Workspace" }));
    await screen.findByText("No Student Record Available");
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ [key]: B, filter: "documents" }),
    );
    expect(router.state.location.hash).toBe("kept");
    expect(api.organizationRoster).toHaveBeenLastCalledWith({
      data: { scope, organization_id: undefined },
    });
    expect(api.audit).not.toHaveBeenCalled();
    expect(api.students).not.toHaveBeenCalled();
  },
);

async function renderHistoryRoute(
  role: string,
  route: any,
  studentId?: string,
  overrides: Record<string, string> = {},
) {
  const root = createRootRoute();
  const path = `/${role.toLowerCase()}/history`;
  const page = createRoute({
    getParentRoute: () => root,
    path,
    component: route.options.component,
    validateSearch: route.options.validateSearch,
    search: route.options.search,
    errorComponent: route.options.errorComponent,
  });
  const key = role === "School" ? "org_id" : role === "District" ? "district_id" : undefined;
  const query = new URLSearchParams({ filter: "documents" });
  if (key) query.set(key, A);
  if (studentId) query.set("student_id", studentId);
  for (const [key, value] of Object.entries(overrides)) query.set(key, value);
  const router = createRouter({
    routeTree: root.addChildren([
      page,
      createRoute({
        getParentRoute: () => root,
        path: "/dashboard",
        component: () => <div>Permitted Role Destination</div>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: "/owner",
        component: () => <div>Management Destination</div>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: [`${path}?${query}#kept`] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}
for (const [role, route] of historyRoutes) {
  it(`${role} history restores a saved student and browser back/forward selection`, async () => {
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockImplementation(({ data }: any) =>
      Promise.resolve({
        entries: [record(data.student_id === A ? "first_history" : "second_history")],
      }),
    );
    const router = await renderHistoryRoute(role, route, B);
    await screen.findByText("Second history — document");
    expect((screen.getByLabelText("Student") as HTMLSelectElement).value).toBe(B);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: A } });
    await screen.findByText("First history — document");
    expect(router.state.location.search).toMatchObject({ student_id: A, filter: "documents" });
    expect(router.state.location.hash).toBe("kept");
    if (role === "School" || role === "District")
      expect(router.state.location.search).toMatchObject({
        [role === "School" ? "org_id" : "district_id"]: A,
      });
    await act(() => router.history.back());
    await screen.findByText("Second history — document");
    await act(() => router.history.forward());
    await screen.findByText("First history — document");
  });
  it(`${role} unavailable saved student never reads another student's audit until explicit recovery`, async () => {
    const missing = "10000000-0000-4000-8000-000000000099";
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockResolvedValue({ entries: [] });
    const router = await renderHistoryRoute(role, route, missing);
    await screen.findByText("The selected student is not available in this history view.");
    expect(api.audit).not.toHaveBeenCalled();
    expect(router.state.location.search).toMatchObject({ student_id: missing });
    fireEvent.click(screen.getByRole("button", { name: "Choose an Available Student" }));
    await screen.findByText(/This view loads up to 200 records/);
    expect(router.state.location.search).toMatchObject({ filter: "documents" });
    expect(router.state.location.search.student_id).toBeUndefined();
    expect(router.state.location.hash).toBe("kept");
    expect(api.audit.mock.calls[0][0].data.student_id).toBe(A);
  });
  it(`${role} history departure discards a pending audit completion`, async () => {
    const pending = deferred();
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockReturnValueOnce(pending.promise);
    const router = await renderHistoryRoute(role, route, B);
    await waitFor(() => expect(api.audit).toHaveBeenCalledOnce());
    await act(() => router.navigate({ to: "/owner" }));
    await screen.findByText("Management Destination");
    await act(() => pending.resolve({ entries: [record("departed_history")] }));
    expect(screen.queryByText("Departed history — document")).toBeNull();
    expect(api.audit).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/owner");
  });
  it(`${role} history rejects malformed saved student IDs at route validation`, () => {
    expect(() => route.options.validateSearch({ student_id: "malformed" })).toThrow();
  });
}

const olderCursor = {
  student_id: A,
  created_at: "2030-01-01T12:00:00Z",
  id: "20000000-0000-4000-8000-000000000001",
};
it("older activity appends distinct rows, updates loaded counts and keeps the current filter", async () => {
  api.students.mockResolvedValue(roster);
  api.audit
    .mockResolvedValueOnce({ entries: [record("initial_history")], next_cursor: olderCursor })
    .mockResolvedValueOnce({
      entries: [record("initial_history"), record("older_history")],
      next_cursor: null,
    });
  render(<StudentActivityHistory />);
  await screen.findByText("Initial history — document");
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Documents/ }));
  fireEvent.click(screen.getByRole("button", { name: "Load Older Activity" }));
  await screen.findByText("Older history — document");
  expect(screen.getAllByText("Initial history — document")).toHaveLength(1);
  expect(screen.getByText(/Counts and filters apply to the 2 loaded records/)).toBeTruthy();
  expect(screen.getByRole("tab", { name: /Documents/ }).getAttribute("aria-selected")).toBe("true");
  expect(api.audit).toHaveBeenLastCalledWith({
    data: { student_id: A, limit: 200, cursor: olderCursor },
  });
  expect(screen.queryByRole("button", { name: "Load Older Activity" })).toBeNull();
  expect(screen.getByText("No older recorded activity is available in this view.")).toBeTruthy();
});
it("failed older reads preserve loaded rows and retry the same boundary", async () => {
  api.students.mockResolvedValue(roster);
  api.audit
    .mockResolvedValueOnce({ entries: [record("initial_history")], next_cursor: olderCursor })
    .mockRejectedValueOnce(new Error("private error"))
    .mockResolvedValueOnce({ entries: [record("older_history")], next_cursor: null });
  render(<StudentActivityHistory />);
  await screen.findByText("Initial history — document");
  fireEvent.click(screen.getByRole("button", { name: "Load Older Activity" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Initial history — document")).toBeTruthy();
  expect(screen.queryByText("private error")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry Older Activity" }));
  await screen.findByText("Older history — document");
  expect(api.audit.mock.calls[1]).toEqual(api.audit.mock.calls[2]);
});
it.each([false, true])(
  "student changes discard an older-page success/error (%s)",
  async (failure) => {
    const pending = deferred();
    api.students.mockResolvedValue(roster);
    api.audit
      .mockResolvedValueOnce({ entries: [record("initial_history")], next_cursor: olderCursor })
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ entries: [record("current_history")], next_cursor: null });
    render(<StudentActivityHistory />);
    await screen.findByText("Initial history — document");
    fireEvent.click(screen.getByRole("button", { name: "Load Older Activity" }));
    chooseSecond();
    await screen.findByText("Current history — document");
    await act(() =>
      failure
        ? pending.reject(new Error("departed"))
        : pending.resolve({ entries: [record("old_history")], next_cursor: olderCursor }),
    );
    expect(screen.queryByText("Old history — document")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: "Load Older Activity" })).toBeNull();
  },
);
it("rapid older-page clicks start only one request and departure discards its completion", async () => {
  const pending = deferred();
  api.students.mockResolvedValue(roster);
  api.audit
    .mockResolvedValueOnce({ entries: [record("initial_history")], next_cursor: olderCursor })
    .mockReturnValueOnce(pending.promise);
  const view = render(<StudentActivityHistory />);
  await screen.findByText("Initial history — document");
  const button = screen.getByRole("button", { name: "Load Older Activity" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.audit).toHaveBeenCalledTimes(2);
  view.unmount();
  await act(() => pending.resolve({ entries: [record("old_history")], next_cursor: null }));
  expect(screen.queryByText("Old history — document")).toBeNull();
});

for (const [role, route] of historyRoutes) {
  it(`${role} older activity keeps the original student and organization context`, async () => {
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    const organization =
      role === "School" || role === "District" ? { scope: role.toLowerCase(), id: A } : undefined;
    const cursor = { ...olderCursor, student_id: B, ...(organization ? { organization } : {}) };
    api.audit
      .mockResolvedValueOnce({ entries: [record("initial_history")], next_cursor: cursor })
      .mockResolvedValueOnce({ entries: [record("older_history")], next_cursor: null });
    await renderHistoryRoute(role, route, B);
    await screen.findByText("Initial history — document");
    fireEvent.click(screen.getByRole("button", { name: "Load Older Activity" }));
    await screen.findByText("Older history — document");
    expect(api.audit).toHaveBeenLastCalledWith({
      data: { student_id: B, limit: 200, ...(organization ? { organization } : {}), cursor },
    });
    expect(screen.getByText(/Counts and filters apply to the 2 loaded records/)).toBeTruthy();
  });
}

for (const [role, route] of historyRoutes) {
  it(`${role} malformed student link requires recovery and preserves valid page context`, async () => {
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockResolvedValue({ entries: [record("recovered_history")] });
    const router = await renderHistoryRoute(role, route, "malformed-private-value");
    await screen.findByText("This Saved Link Needs Updating");
    expect(screen.queryByText("malformed-private-value")).toBeNull();
    expect(api.students).not.toHaveBeenCalled();
    expect(api.organizationRoster).not.toHaveBeenCalled();
    expect(api.audit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
    await screen.findByText("Recovered history — document");
    expect(router.state.location.pathname).toBe(`/${role.toLowerCase()}/history`);
    expect(router.state.location.search.student_id).toBeUndefined();
    expect(router.state.location.search.filter).toBe("documents");
    expect(router.state.location.hash).toBe("kept");
    expect(router.history.length).toBe(1);
    if (role === "School" || role === "District")
      expect(router.state.location.search[role === "School" ? "org_id" : "district_id"]).toBe(A);
  });
}
for (const [role, route] of historyRoutes.filter(
  ([role]) => role === "School" || role === "District",
)) {
  it.each([false, true])(
    `${role} malformed workspace link clears only malformed selections (%s)`,
    async (both) => {
      api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
      api.audit.mockResolvedValue({ entries: [record("recovered_history")] });
      const key = role === "School" ? "org_id" : "district_id";
      const router = await renderHistoryRoute(role, route, both ? "bad-student" : B, {
        [key]: "bad-workspace",
      });
      await screen.findByText("This Saved Link Needs Updating");
      expect(api.audit).not.toHaveBeenCalled();
      expect(api.organizationRoster).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
      await screen.findByText("Recovered history — document");
      expect(api.organizationRoster.mock.calls[0][0]).toEqual({
        data: { scope: role.toLowerCase(), organization_id: undefined },
      });
      expect(api.audit.mock.calls[0][0].data.student_id).toBe(both ? A : B);
      expect(router.state.location.search.student_id).toBe(both ? undefined : B);
      await waitFor(() => expect(router.state.location.search[key]).toBe(A));
      expect(router.state.location.search.filter).toBe("documents");
      expect(router.state.location.hash).toBe("kept");
      expect(router.history.length).toBe(1);
      expect(api.students).not.toHaveBeenCalled();
    },
  );
}
it("unexpected history route failure retains ordinary retry instead of clearing selections", async () => {
  const route = {
    options: {
      ...FamilyRoute.options,
      component: () => {
        throw new Error("Synthetic render failure");
      },
    },
  };
  await renderHistoryRoute("Family", route, B);
  await screen.findByText("This page didn't load");
  expect(screen.getByRole("button", { name: "Try loading this page again" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Clear Invalid Selections" })).toBeNull();
});

for (const [role, original] of historyRoutes) {
  it(`${role} malformed-link recovery still runs the actual role gate before history reads`, async () => {
    const { RoleGuard: ActualRoleGuard } =
      await vi.importActual<typeof import("@/components/RoleGuard")>("@/components/RoleGuard");
    const path = `/${role.toLowerCase()}/history`;
    api.roles.mockResolvedValue({ roles: [role === "Student" ? "parent" : "student"] });
    const Page = original.options.component as any;
    const route = {
      options: {
        ...original.options,
        component: () => (
          <ActualRoleGuard path={path}>
            <Page />
          </ActualRoleGuard>
        ),
      },
    };
    const router = await renderHistoryRoute(role, route, "malformed");
    await screen.findByText("This Saved Link Needs Updating");
    expect(api.roles).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear Invalid Selections" }));
    await screen.findByText("Permitted Role Destination");
    expect(api.roles).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/dashboard");
    expect(api.students).not.toHaveBeenCalled();
    expect(api.organizationRoster).not.toHaveBeenCalled();
    expect(api.audit).not.toHaveBeenCalled();
  });
}
