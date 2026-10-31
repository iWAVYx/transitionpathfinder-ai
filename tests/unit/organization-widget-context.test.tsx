// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
  useRouterState,
} from "@tanstack/react-router";
const api = vi.hoisted(() => ({
  prefs: vi.fn(),
  save: vi.fn(),
  calendar: vi.fn(),
  personal: vi.fn(),
  organization: vi.fn(),
  userId: "caller",
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.calendar }));
vi.mock("@/lib/dashboard/dashboard-widget-prefs.functions", () => ({
  getDashboardWidgetPrefs: api.prefs,
  updateDashboardWidgetPrefs: api.save,
  WIDGETS_BY_ROLE: {
    family: ["actions"],
    student: ["actions"],
    educator: ["actions"],
    school_admin: ["actions"],
    district_admin: ["actions"],
    partner: ["actions"],
  },
}));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({ getNextActionsForMe: api.personal }));
vi.mock("@/lib/dashboard/organization-widget-actions.functions", () => ({
  getOrganizationWidgetActions: api.organization,
}));
vi.mock("@/components/dashboard/DashboardWidgetBoardView", () => ({
  DashboardWidgetBoardView: ({ data }: any) => (
    <>
      {data.actions.notice ? (
        <p role="status">{data.actions.notice}</p>
      ) : data.actions.loading ? (
        <p>Actions Loading</p>
      ) : data.actions.error ? (
        <p role="alert">Actions Error</p>
      ) : (
        data.actions.entries.map((entry: any) => <p key={entry.id}>{entry.title}</p>)
      )}
      {data.actions.windowLabel && <p>{data.actions.windowLabel}</p>}
      <div data-testid="action-tool-context">{JSON.stringify({to:data.actions.toolDestination, search:data.actions.toolSearch})}</div>
    </>
  ),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.userId ? { id: api.userId } : null, loading: false }),
}));
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import type { DashboardWidgetRole } from "@/lib/dashboard/dashboard-widget-prefs.functions";
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const clients: QueryClient[] = [];
function client() {
  const next = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  clients.push(next);
  api.prefs.mockResolvedValue({ widgets: ["actions"] });
  api.calendar.mockResolvedValue({ events: [] });
  return next;
}
function pending() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const result = (title: string) => ({
  viewer_id: "caller",
  entries: [
    {
      id: title,
      title,
      detail: "Recorded details",
      to: "/school/team",
      search: { org_id: A },
      hash: "members",
    },
  ],
  total: 12,
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((value) => value.clear());
  Object.values(api).forEach((fn) => {
    if (typeof fn === "function") fn.mockReset();
  });
  api.userId = "caller";
});
for (const role of ["school_admin", "district_admin"] as const) {
  it.each([false, true])(
    `${role} ignores previous-organization completions (failure %s)`,
    async (failure) => {
      const old = pending();
      api.organization
        .mockReturnValueOnce(old.promise)
        .mockResolvedValueOnce(result("Current Organization Action"));
      const queryClient = client();
      const node = (organizationId?: string) => (
        <QueryClientProvider client={queryClient}>
          <DashboardWidgetBoard role={role} organizationId={organizationId} />
        </QueryClientProvider>
      );
      const view = render(node(A));
      await waitFor(() => expect(api.organization).toHaveBeenCalledOnce());
      view.rerender(node(B));
      await screen.findByText("Current Organization Action");
      await act(async () => {
        failure
          ? old.reject(new Error("Private old error"))
          : old.resolve(result("Old Organization Action"));
      });
      expect(screen.queryByText("Old Organization Action")).toBeNull();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(api.personal).not.toHaveBeenCalled();
      expect(api.organization).toHaveBeenLastCalledWith({ signal: expect.any(AbortSignal), data: { role, organization_id: B } });
    },
  );
  it(`${role} suppresses organization actions when no selected scope exists`, async () => {
    const queryClient = client();
    queryClient.setQueryData(
      ["dashboard-widget-organization-actions", role, undefined, "caller"],
      result("Unscoped Cached Action"),
    );
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardWidgetBoard role={role} />
      </QueryClientProvider>,
    );
    await screen.findByRole("status");
    expect(screen.queryByText("Unscoped Cached Action")).toBeNull();
    expect(api.organization).not.toHaveBeenCalled();
    expect(api.personal).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });
  it(`${role} clears accepted rows while the new organization is loading`, async () => {
    const next = pending();
    api.organization
      .mockResolvedValueOnce(result("Previous Action"))
      .mockReturnValueOnce(next.promise);
    const queryClient = client();
    const node = (id: string) => (
      <QueryClientProvider client={queryClient}>
        <DashboardWidgetBoard role={role} organizationId={id} />
      </QueryClientProvider>
    );
    const view = render(node(A));
    await screen.findByText("Previous Action");
    view.rerender(node(B));
    expect(screen.queryByText("Previous Action")).toBeNull();
    expect(screen.getByText("Actions Loading")).toBeTruthy();
    await act(async () => next.resolve(result("Current Action")));
    await screen.findByText("Current Action");
  });
}
it("selected-student previews exclude other students and discard the old selection's pending result", async () => {
  const old = pending();
  api.personal.mockReturnValueOnce(old.promise).mockResolvedValueOnce({
    viewer_id: "caller",
    active: [
      {
        id: "b",
        title: "Selected Student Action",
        studentId: B,
        ctaRoute: "/reports",
        reason: "Details",
      },
      { id: "a", title: "Other Student Action", studentId: A, ctaRoute: "/reports" },
    ],
  });
  const queryClient = client();
  const node = (id: string) => (
    <QueryClientProvider client={queryClient}>
      <DashboardWidgetBoard role="family" studentId={id} />
    </QueryClientProvider>
  );
  const view = render(node(A));
  await waitFor(() => expect(api.personal).toHaveBeenCalledOnce());
  view.rerender(node(B));
  await screen.findByText("Selected Student Action");
  expect(screen.queryByText("Other Student Action")).toBeNull();
  await act(async () =>
    old.resolve({
      viewer_id: "caller",
      active: [{ id: "old", title: "Old Student Action", ctaRoute: "/reports", studentId: A }],
    }),
  );
  expect(screen.queryByText("Old Student Action")).toBeNull();
});
it("personal-role transitions use separate cache entries and ignore the departed role", async () => {
  const old = pending();
  api.personal.mockReturnValueOnce(old.promise).mockResolvedValueOnce({
    viewer_id: "caller",
    active: [{ id: "partner", title: "Current Partner Action", ctaRoute: "/partners-manage" }],
  });
  const queryClient = client();
  const node = (role: DashboardWidgetRole) => (
    <QueryClientProvider client={queryClient}>
      <DashboardWidgetBoard role={role} />
    </QueryClientProvider>
  );
  const view = render(node("educator"));
  await waitFor(() => expect(api.personal).toHaveBeenCalledOnce());
  view.rerender(node("partner"));
  await screen.findByText("Current Partner Action");
  await act(async () =>
    old.resolve({
      viewer_id: "caller",
      active: [{ id: "old", title: "Old Educator Action", ctaRoute: "/caseload" }],
    }),
  );
  expect(screen.queryByText("Old Educator Action")).toBeNull();
  expect(api.organization).not.toHaveBeenCalled();
});
it.each(["school_admin", "district_admin"] as const)(
  "actual %s action links retain selected scope and anchor",
  async (role) => {
    const { DashboardWidgetBoardView: ActualView } = await vi.importActual<
      typeof import("@/components/dashboard/DashboardWidgetBoardView")
    >("@/components/dashboard/DashboardWidgetBoardView");
    const prefix = role === "school_admin" ? "school" : "district";
    const key = role === "school_admin" ? "org_id" : "district_id";
    const empty = { entries: [], toolDestination: null };
    const data = {
      actions: {
        ...empty,
        entries: [
          {
            id: "action",
            title: "Open Recorded Team Action",
            detail: "Recorded details",
            to: `/${prefix}/team`,
            search: { [key]: A },
            hash: "members",
          },
        ],
        windowLabel: "Showing 1 of 12 recorded actions with supported tools.",
      },
      calendar: empty,
      meetings: empty,
    };
    const root = createRootRoute({ component: Outlet });
    const dashboard = createRoute({
      getParentRoute: () => root,
      path: `${prefix}/overview`,
      component: () => (
        <ActualView
          role={role}
          widgets={["actions"]}
          available={["actions"]}
          data={data}
          update={() => {}}
        />
      ),
    });
    const team = createRoute({
      getParentRoute: () => root,
      path: `${prefix}/team`,
      validateSearch: (search: any) => search,
      component: () => {
        const location = useRouterState({ select: (value) => value.location });
        return (
          <output>
            Scope {String((location.search as any)[key])} Anchor {location.hash}
          </output>
        );
      },
    });
    const router = createRouter({
      routeTree: root.addChildren([dashboard, team]),
      history: createMemoryHistory({ initialEntries: [`/${prefix}/overview?${key}=${B}`] }),
    });
    render(<RouterProvider router={router} />);
    await screen.findByText("Showing 1 of 12 recorded actions with supported tools.");
    expect(screen.queryByRole("link", { name: "Open tool" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Open Recorded Team Action" }));
    await screen.findByText(`Scope ${A} Anchor members`);
  },
);
it("actual widget failure keeps empty claims hidden and offers an explicit retry", async () => {
  const { DashboardWidgetBoardView: ActualView } = await vi.importActual<
    typeof import("@/components/dashboard/DashboardWidgetBoardView")
  >("@/components/dashboard/DashboardWidgetBoardView");
  const retry = vi.fn();
  const empty = { entries: [], toolDestination: null };
  render(
    <ActualView
      role="district_admin"
      widgets={["actions"]}
      available={["actions"]}
      data={{ actions: { ...empty, error: true, retry }, calendar: empty, meetings: empty }}
      update={() => {}}
    />,
  );
  expect(screen.getByRole("alert").textContent).toContain("Could not load this widget.");
  expect(screen.queryByText("No active actions to show")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  expect(retry).toHaveBeenCalledOnce();
});
it("account switching clears current widget rows and rejects a mismatched response identity", async () => {
  api.organization
    .mockResolvedValueOnce(result("First Account Action"))
    .mockResolvedValueOnce(result("Wrong Account Response"));
  const queryClient = client();
  const node = () => (
    <QueryClientProvider client={queryClient}>
      <DashboardWidgetBoard role="school_admin" organizationId={A} />
    </QueryClientProvider>
  );
  const view = render(node());
  await screen.findByText("First Account Action");
  api.userId = "second-user";
  view.rerender(node());
  expect(screen.queryByText("First Account Action")).toBeNull();
  await screen.findByRole("alert");
  expect(screen.queryByText("Wrong Account Response")).toBeNull();
});
it("signed-out widgets cannot display the previous user's action cache or make reads", async () => {
  api.organization.mockResolvedValue(result("Signed In Action"));
  const queryClient = client();
  const node = () => (
    <QueryClientProvider client={queryClient}>
      <DashboardWidgetBoard role="school_admin" organizationId={A} />
    </QueryClientProvider>
  );
  const view = render(node());
  await screen.findByText("Signed In Action");
  const requests = api.organization.mock.calls.length;
  api.userId = "";
  view.rerender(node());
  expect(screen.queryByText("Signed In Action")).toBeNull();
  expect(api.organization).toHaveBeenCalledTimes(requests);
});

for (const role of ["student", "family", "educator", "partner"] as const) {
  it(`${role} passes its explicit role and keeps a selected student's preview focused`, async () => {
    api.personal.mockResolvedValue({
      viewer_id: "caller",
      recentlyCompleted: [],
      active: [
        { id: "current", title: "Selected Student Action", studentId: A, ctaRoute: "/reports" },
        { id: "other", title: "Other Student Action", studentId: B, ctaRoute: "/reports" },
        { id: "global", title: "Global Action", ctaRoute: "/reports" },
      ],
    });
    render(
      <QueryClientProvider client={client()}>
        <DashboardWidgetBoard role={role} studentId={A} />
      </QueryClientProvider>,
    );
    await screen.findByText("Selected Student Action");
    expect(screen.queryByText("Other Student Action")).toBeNull();
    expect(screen.getByText("Global Action")).toBeTruthy();
    expect(api.personal).toHaveBeenCalledWith({ signal: expect.any(AbortSignal), data: { role, student_id: A } });
    expect(api.organization).not.toHaveBeenCalled();
  });
}

it.each(["family", "student", "educator", "partner"] as const)("%s passes the same role/student context to the feed and full tool", async role => {
  api.personal.mockResolvedValue({viewer_id:"caller",active:[],recentlyCompleted:[]});
  const queryClient = client();
  render(<QueryClientProvider client={queryClient}><DashboardWidgetBoard role={role} studentId={A}/></QueryClientProvider>);
  await waitFor(() => expect(api.personal).toHaveBeenCalledWith({signal: expect.any(AbortSignal),data:{role,student_id:A}}));
  expect(JSON.parse(screen.getByTestId("action-tool-context").textContent!)).toEqual({to:"/next-actions",search:{role,student_id:A}});
  expect(api.organization).not.toHaveBeenCalled();
});
it.each(["school_admin", "district_admin"] as const)("%s does not offer a personal full-tool link", async role => {
  api.organization.mockResolvedValue({...result("Scoped Action"),entries:[]});
  const queryClient = client();
  render(<QueryClientProvider client={queryClient}><DashboardWidgetBoard role={role} organizationId={A}/></QueryClientProvider>);
  await waitFor(() => expect(api.organization).toHaveBeenCalledWith({signal: expect.any(AbortSignal),data:{role,organization_id:A}}));
  expect(JSON.parse(screen.getByTestId("action-tool-context").textContent!)).toEqual({to:null});
  expect(api.personal).not.toHaveBeenCalled();
});
