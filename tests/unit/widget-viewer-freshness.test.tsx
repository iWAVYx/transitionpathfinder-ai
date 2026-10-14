// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  prefs: vi.fn(),
  save: vi.fn(),
  calendar: vi.fn(),
  personal: vi.fn(),
  organization: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.calendar }));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({ getNextActionsForMe: api.personal }));
vi.mock("@/lib/dashboard/organization-widget-actions.functions", () => ({
  getOrganizationWidgetActions: api.organization,
}));
vi.mock("@/lib/dashboard/dashboard-widget-prefs.functions", () => ({
  getDashboardWidgetPrefs: api.prefs,
  updateDashboardWidgetPrefs: api.save,
  WIDGETS_BY_ROLE: {
    family: ["actions", "calendar", "meetings"],
    student: ["actions", "calendar"],
    educator: ["actions", "calendar", "meetings"],
    school_admin: ["actions", "calendar"],
    district_admin: ["actions"],
    partner: ["actions"],
  },
}));
vi.mock("@/components/dashboard/DashboardWidgetBoardView", () => ({
  DashboardWidgetBoardView: ({ widgets, update, saving, data }: any) => (
    <div>
      <p>Selected: {widgets.join(",")}</p>
      <button disabled={saving} onClick={() => update([])}>
        Save Layout
      </button>
      {data.calendar.entries.map((e: any) => (
        <p key={e.id}>{e.title}</p>
      ))}
      {data.actions.entries.map((e: any) => (
        <p key={e.id}>{e.title}</p>
      ))}
    </div>
  ),
}));
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import type { DashboardWidgetRole } from "@/lib/dashboard/dashboard-widget-prefs.functions";
import { browserCalendarTimeZone } from "@/lib/calendar-day";
const ORG = "10000000-0000-4000-8000-000000000001";
const clients: QueryClient[] = [];
function pending() {
  let resolve!: (v: any) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(role: DashboardWidgetRole = "family") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  api.prefs.mockImplementation(async ({ data }: any) => ({
    widgets:
      data.role === "district_admin" || data.role === "partner"
        ? ["actions"]
        : ["actions", "calendar"],
  }));
  api.calendar.mockResolvedValue({ events: [] });
  api.personal.mockImplementation(async () => ({
    viewer_id: api.viewer,
    active: [],
    recentlyCompleted: [],
  }));
  api.organization.mockImplementation(async () => ({
    viewer_id: api.viewer,
    entries: [],
    total: 0,
  }));
  const node = (r: DashboardWidgetRole = role) => (
    <QueryClientProvider client={client}>
      <DashboardWidgetBoard role={r} organizationId={ORG} />
    </QueryClientProvider>
  );
  return { ...render(node()), client, node };
}
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((c) => c.clear());
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
});
it.each(["family", "student", "educator", "school_admin", "district_admin", "partner"] as const)(
  "%s waits for settled sign-in before any widget read",
  async (role) => {
    api.loading = true;
    const v = setup(role);
    expect(screen.getByRole("status").textContent).toContain("Loading Your Dashboard Widgets");
    expect(api.prefs).not.toHaveBeenCalled();
    expect(api.calendar).not.toHaveBeenCalled();
    expect(api.personal).not.toHaveBeenCalled();
    expect(api.organization).not.toHaveBeenCalled();
    api.loading = false;
    v.rerender(v.node());
    await waitFor(() =>
      expect(api.prefs).toHaveBeenCalledWith({ data: { role, expected_viewer_id: "caller" } }),
    );
    if (role === "district_admin" || role === "partner")
      expect(api.calendar).not.toHaveBeenCalled();
    else
      await waitFor(() =>
        expect(api.calendar).toHaveBeenCalledWith({
          data: {
            timezone: browserCalendarTimeZone(),
            organization_id: ORG,
            expected_viewer_id: "caller",
          },
        }),
      );
  },
);
it.each(["loading", "signed-out"])("hides cached rows and settings during %s", async (state) => {
  const v = setup();
  await screen.findByText("Selected: actions,calendar");
  await act(async () => {
    v.client.setQueryData(
      ["dashboard-widget-calendar", "family", undefined, ORG, browserCalendarTimeZone(), "caller"],
      {
        events: [
          { id: "private", title: "Private Event", event_date: "2030-12-31", kind: "meeting" },
        ],
      },
    );
  });
  await screen.findByText("Private Event");
  if (state === "loading") api.loading = true;
  else api.viewer = "";
  v.rerender(v.node());
  expect(screen.queryByText("Private Event")).toBeNull();
  expect(screen.queryByText("Selected: actions,calendar")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
it("rejects late calendar and preference reads after an account switch", async () => {
  const v = setup();
  await screen.findByText("Selected: actions,calendar");
  await waitFor(() => expect(api.calendar).toHaveBeenCalledOnce());
  const oldCalendar = pending();
  const oldPrefs = pending();
  api.calendar
    .mockReset()
    .mockReturnValueOnce(oldCalendar.promise)
    .mockResolvedValue({ events: [] });
  api.prefs
    .mockReset()
    .mockReturnValueOnce(oldPrefs.promise)
    .mockResolvedValue({ widgets: ["actions"] });
  await act(async () => {
    void v.client.invalidateQueries({ queryKey: ["dashboard-widget-calendar"] });
    void v.client.invalidateQueries({ queryKey: ["dashboard-widgets"] });
  });
  await waitFor(() => expect(api.calendar).toHaveBeenCalledOnce());
  api.viewer = "other";
  v.rerender(v.node());
  await screen.findByText("Selected: actions");
  await act(async () => {
    oldCalendar.resolve({
      events: [{ id: "late", title: "Departed Event", event_date: "2030-12-31", kind: "meeting" }],
    });
    oldPrefs.resolve({ widgets: [] });
  });
  expect(screen.queryByText("Departed Event")).toBeNull();
  expect(screen.queryByText("Selected: ", { exact: true })).toBeNull();
  expect(v.client.getQueryData(["dashboard-widgets", "family", "caller"])).toEqual({
    widgets: ["actions", "calendar"],
  });
});
it.each(["family", "student", "educator", "school_admin", "district_admin", "partner"] as const)(
  "%s saves only its captured role and viewer",
  async (role) => {
    const v = setup(role);
    await waitFor(() => expect(api.prefs).toHaveBeenCalled());
    api.save.mockResolvedValue({ widgets: [] });
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await screen.findByText("Selected:");
    expect(api.save).toHaveBeenCalledWith({
      data: { role, widgets: [], expected_viewer_id: "caller" },
    });
    expect(v.client.getQueryData(["dashboard-widgets", role, "caller"])).toEqual({ widgets: [] });
    expect(api.success).toHaveBeenCalledOnce();
  },
);
it.each([false, true])(
  "departed save does not change another account or toast (failure %s)",
  async (fail) => {
    const v = setup();
    await screen.findByText("Selected: actions,calendar");
    const old = pending();
    api.save.mockReturnValueOnce(old.promise);
    const invalidate = vi.spyOn(v.client, "invalidateQueries");
    fireEvent.click(screen.getByRole("button", { name: "Save Layout" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
    api.viewer = "other";
    v.rerender(v.node());
    await waitFor(() =>
      expect(api.prefs).toHaveBeenCalledWith({
        data: { role: "family", expected_viewer_id: "other" },
      }),
    );
    await act(async () => (fail ? old.reject(new Error("failed")) : old.resolve({ widgets: [] })));
    expect(v.client.getQueryData(["dashboard-widgets", "family", "other"])).toEqual({
      widgets: ["actions", "calendar"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["dashboard-widgets", "family", "caller"],
      refetchType: "none",
    });
    expect(api.success).not.toHaveBeenCalled();
    expect(api.error).not.toHaveBeenCalled();
    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  },
);
it("a delayed save cannot replace another role's settings or pending state", async () => {
  const v = setup();
  await screen.findByText("Selected: actions,calendar");
  const old = pending();
  const next = pending();
  api.save.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
  v.rerender(v.node("student"));
  await waitFor(() =>
    expect(api.prefs).toHaveBeenCalledWith({
      data: { role: "student", expected_viewer_id: "caller" },
    }),
  );
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(false);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
  await act(async () => old.resolve({ widgets: [] }));
  expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true);
  expect(api.success).not.toHaveBeenCalled();
  expect(v.client.getQueryData(["dashboard-widgets", "student", "caller"])).toEqual({
    widgets: ["actions", "calendar"],
  });
  await act(async () => next.resolve({ widgets: [] }));
  await screen.findByText("Selected:");
  expect(api.success).toHaveBeenCalledOnce();
});
it.each([false, true])("unmounted save has no toast or refetch (failure %s)", async (fail) => {
  const v = setup();
  await screen.findByText("Selected: actions,calendar");
  const old = pending();
  api.save.mockReturnValueOnce(old.promise);
  const invalidation = vi.spyOn(v.client, "invalidateQueries");
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(api.save).toHaveBeenCalledOnce());
  v.unmount();
  await act(async () => (fail ? old.reject(new Error("failed")) : old.resolve({ widgets: [] })));
  expect(invalidation).toHaveBeenCalledWith({
    queryKey: ["dashboard-widgets", "family", "caller"],
    refetchType: "none",
  });
  expect(api.success).not.toHaveBeenCalled();
  expect(api.error).not.toHaveBeenCalled();
});
