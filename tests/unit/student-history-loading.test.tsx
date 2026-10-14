// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({
  students: vi.fn(),
  audit: vi.fn(),
  organizationRoster: vi.fn(),
  roles: vi.fn(),
  export: vi.fn(),
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
  exportStudentAuditRecords: api.export,
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
const originalImageDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "decode");
const chooseSecond = () =>
  fireEvent.change(screen.getByLabelText("Student"), { target: { value: B } });
afterEach(() => {
  cleanup();
  api.students.mockReset();
  api.audit.mockReset();
  api.organizationRoster.mockReset();
  api.roles.mockReset();
  api.export.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalImageDecode)
    Object.defineProperty(HTMLImageElement.prototype, "decode", originalImageDecode);
  else delete (HTMLImageElement.prototype as any).decode;
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

function downloadFixture() {
  const create = vi.fn(() => "blob:synthetic-history-export");
  const revoke = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal(
    "URL",
    class extends OriginalURL {
      static createObjectURL = create;
      static revokeObjectURL = revoke;
    },
  );
  const callbacks: Array<() => void> = [];
  const originalTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((
    callback: () => void,
    delay?: number,
    ...args: any[]
  ) => {
    if (delay === 2000) {
      callbacks.push(callback);
      return 0;
    }
    return originalTimeout(callback, delay, ...args);
  }) as typeof setTimeout);
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return { create, revoke, click, cleanup: () => callbacks.forEach((callback) => callback()) };
}
const exportResult = {
  student: { first_name: "Synthetic", last_name: "Student" },
  workspace_scope: null,
  entries: [
    {
      created_at: "2030-01-01T12:00:00Z",
      action: "view",
      entity_type: "document",
      recorded_by: "team@example.invalid",
    },
  ],
};
for (const [role, route] of historyRoutes) {
  it(`${role} loaded export freshly checks the original student and applicable organization`, async () => {
    const download = downloadFixture();
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockResolvedValue({ entries: [record("loaded_history")], next_cursor: null });
    api.export.mockResolvedValue(exportResult);
    await renderHistoryRoute(role, route, B);
    await screen.findByText("Loaded history — document");
    fireEvent.click(screen.getByRole("button", { name: "Export Loaded Activity (CSV)" }));
    await waitFor(() => expect(download.click).toHaveBeenCalledOnce());
    const organization =
      role === "School" || role === "District" ? { scope: role.toLowerCase(), id: A } : undefined;
    expect(api.export).toHaveBeenCalledExactlyOnceWith({
      data: {
        student_id: B,
        filter: "all",
        entry_ids: ["loaded_history"],
        ...(organization ? { organization } : {}),
      },
    });
    expect(download.create).toHaveBeenCalledOnce();
    expect(download.revoke).not.toHaveBeenCalled();
    download.cleanup();
    expect(download.revoke).toHaveBeenCalledExactlyOnceWith("blob:synthetic-history-export");
  });
}
it("loaded export requests only the active category and guards rapid clicks", async () => {
  const download = downloadFixture();
  const pending = deferred();
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({
    entries: [record("document_event"), { ...record("meeting_event"), entity_type: "meeting" }],
  });
  api.export.mockReturnValue(pending.promise);
  render(<StudentActivityHistory />);
  await screen.findByText("Document event — document");
  fireEvent.mouseDown(screen.getByRole("tab", { name: /Documents/ }));
  const button = screen.getByRole("button", { name: "Export Loaded Activity (CSV)" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.export).toHaveBeenCalledExactlyOnceWith({
    data: { student_id: A, filter: "documents", entry_ids: ["document_event"] },
  });
  await act(() => pending.resolve(exportResult));
  expect(download.click).toHaveBeenCalledOnce();
});
it.each(["student", "category", "departure"])(
  "export %s change suppresses a late download",
  async (change) => {
    const download = downloadFixture();
    const pending = deferred();
    api.students.mockResolvedValue(roster);
    api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
    api.export.mockReturnValueOnce(pending.promise);
    const view = render(<StudentActivityHistory />);
    await screen.findByText("Loaded history — document");
    fireEvent.click(screen.getByRole("button", { name: "Export Loaded Activity (CSV)" }));
    if (change === "student") chooseSecond();
    if (change === "category") fireEvent.mouseDown(screen.getByRole("tab", { name: /Meetings/ }));
    if (change === "departure") view.unmount();
    await act(() => pending.resolve(exportResult));
    expect(download.create).not.toHaveBeenCalled();
    expect(download.click).not.toHaveBeenCalled();
  },
);
it("failed export stays generic and retries without dropping the current records", async () => {
  const download = downloadFixture();
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
  api.export
    .mockRejectedValueOnce(new Error("private export detail"))
    .mockResolvedValueOnce(exportResult);
  render(<StudentActivityHistory />);
  await screen.findByText("Loaded history — document");
  fireEvent.click(screen.getByRole("button", { name: "Export Loaded Activity (CSV)" }));
  await screen.findByText("Activity could not be exported. Please try again.");
  expect(screen.queryByText("private export detail")).toBeNull();
  expect(screen.getByText("Loaded history — document")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Export Loaded Activity (CSV)" }));
  await waitFor(() => expect(download.click).toHaveBeenCalledOnce());
  expect(api.export.mock.calls[0]).toEqual(api.export.mock.calls[1]);
});
it.each(["empty", "failure", "loading"])("export is unavailable for %s activity", async (mode) => {
  api.students.mockResolvedValue(roster);
  if (mode === "loading") api.audit.mockReturnValue(deferred().promise);
  else if (mode === "failure") api.audit.mockRejectedValue(new Error("failed"));
  else api.audit.mockResolvedValue({ entries: [] });
  render(<StudentActivityHistory />);
  const button = await screen.findByRole("button", { name: "Export Loaded Activity (CSV)" });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  expect(api.export).not.toHaveBeenCalled();
});

function printFixture(decode = () => Promise.resolve()) {
  Object.defineProperty(HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: vi.fn(decode),
  });
  return vi.spyOn(window, "print").mockImplementation(() => {});
}
for (const [role, route] of historyRoutes) {
  it(`${role} printable preview and print freshly verify the current loaded selection`, async () => {
    const print = printFixture();
    api.students.mockResolvedValue(roster);
    api.organizationRoster.mockResolvedValue({ organization_id: A, students: roster.students });
    api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
    api.export.mockResolvedValueOnce(exportResult).mockResolvedValueOnce({
      ...exportResult,
      student: { first_name: "Updated Synthetic", last_name: "Student" },
    });
    await renderHistoryRoute(role, route, B);
    await screen.findByText("Loaded history — document");
    fireEvent.click(screen.getByRole("button", { name: "Prepare Printable History" }));
    await screen.findByRole("dialog");
    expect(screen.getByText("Synthetic Student")).toBeTruthy();
    expect(print).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Print or Save as PDF" }));
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(screen.getByText("Updated Synthetic Student")).toBeTruthy();
    expect(api.export).toHaveBeenCalledTimes(2);
    expect(api.export.mock.calls[0]).toEqual(api.export.mock.calls[1]);
    expect(api.export.mock.calls[0][0].data.student_id).toBe(B);
    if (role === "School" || role === "District")
      expect(api.export.mock.calls[1][0].data.organization).toEqual({
        scope: role.toLowerCase(),
        id: A,
      });
  });
}
it("closing a preview during fresh print verification cannot reopen it or print", async () => {
  const print = printFixture();
  const pending = deferred();
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
  api.export.mockResolvedValueOnce(exportResult).mockReturnValueOnce(pending.promise);
  render(<StudentActivityHistory />);
  await screen.findByText("Loaded history — document");
  fireEvent.click(screen.getByRole("button", { name: "Prepare Printable History" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Print or Save as PDF" }));
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
  await act(() => pending.resolve(exportResult));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(print).not.toHaveBeenCalled();
});
it("closing a preview while images decode cancels a pending print", async () => {
  const pending = deferred();
  const print = printFixture(() => pending.promise);
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
  api.export.mockResolvedValue(exportResult);
  render(<StudentActivityHistory />);
  await screen.findByText("Loaded history — document");
  fireEvent.click(screen.getByRole("button", { name: "Prepare Printable History" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Print or Save as PDF" }));
  await waitFor(() => expect(HTMLImageElement.prototype.decode).toHaveBeenCalled());
  expect(
    (screen.getByRole("button", { name: "Preparing Print…" }) as HTMLButtonElement).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
  await act(() => pending.resolve());
  expect(print).not.toHaveBeenCalled();
});
it("a missing print asset shows a generic error and never prints an incomplete document", async () => {
  const print = printFixture(() => Promise.reject(new Error("Private asset detail")));
  api.students.mockResolvedValue(roster);
  api.audit.mockResolvedValue({ entries: [record("loaded_history")] });
  api.export.mockResolvedValue(exportResult);
  render(<StudentActivityHistory />);
  await screen.findByText("Loaded history — document");
  fireEvent.click(screen.getByRole("button", { name: "Prepare Printable History" }));
  await screen.findByRole("dialog");
  fireEvent.click(screen.getByRole("button", { name: "Print or Save as PDF" }));
  await screen.findByText("Activity could not be prepared. Please try again.");
  expect(print).not.toHaveBeenCalled();
  expect(screen.queryByText("Private asset detail")).toBeNull();
});
