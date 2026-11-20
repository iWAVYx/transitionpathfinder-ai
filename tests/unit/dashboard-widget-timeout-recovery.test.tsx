// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({ prefs: vi.fn(), calendar: vi.fn(), personal: vi.fn(), organization: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "caller" }, loading: false }) }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.calendar }));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({ getNextActionsForMe: api.personal }));
vi.mock("@/lib/dashboard/organization-widget-actions.functions", () => ({ getOrganizationWidgetActions: api.organization }));
vi.mock("@/lib/dashboard/dashboard-widget-prefs.functions", () => ({
  getDashboardWidgetPrefs: api.prefs, updateDashboardWidgetPrefs: vi.fn(),
  WIDGETS_BY_ROLE: Object.fromEntries(["student", "family", "educator", "school_admin", "district_admin", "partner"].map(role => [role, ["actions"]])),
}));
vi.mock("@/components/dashboard/DashboardWidgetBoardView", () => ({
  DashboardWidgetBoardView: ({ data }: any) => <div>
    {data.actions.loading ? <p>Loading action summary</p> : data.actions.error ?
      <div role="alert">Could not load this widget.<button onClick={data.actions.retry}>Try Again</button></div> :
      data.actions.entries.map((entry: any) => <p key={entry.id}>{entry.title}</p>)}
  </div>,
}));
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { DASHBOARD_WIDGET_READ_TIMEOUT_MS } from "@/lib/dashboard/dashboard-widget-read";
const clients: QueryClient[] = [];
afterEach(() => { cleanup(); clients.splice(0).forEach(c => c.clear()); vi.useRealTimers(); vi.resetAllMocks(); });
it.each(["student", "family", "educator", "school_admin", "district_admin", "partner"] as const)(
  "%s stops a hung action summary, retries on request, and excludes the late response", async role => {
    vi.useFakeTimers();
    const organization = role === "school_admin" || role === "district_admin";
    const loader = organization ? api.organization : api.personal;
    let firstResolve!: (value: any) => void;
    loader.mockImplementationOnce(() => new Promise(resolve => { firstResolve = resolve; }));
    const response = (title: string) => ({ viewer_id: "caller", active: [{ id: "one", title, ctaRoute: "/next-actions" }], entries: [{ id: "one", title, to: "/school/overview" }], total: 1 });
    loader.mockResolvedValue(response("Current action"));
    api.prefs.mockResolvedValue({ widgets: ["actions"] });
    const client = new QueryClient(); clients.push(client);
    render(<QueryClientProvider client={client}><DashboardWidgetBoard role={role} organizationId="school-one" /></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText("Loading action summary")).toBeTruthy();
    await act(async () => { await vi.advanceTimersByTimeAsync(DASHBOARD_WIDGET_READ_TIMEOUT_MS); });
    expect(screen.getByRole("alert").textContent).toContain("Could not load this widget");
    expect(loader).toHaveBeenCalledTimes(1);
    expect(loader.mock.calls[0][0].signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText("Current action")).toBeTruthy();
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => { firstResolve(response("Obsolete action")); await vi.advanceTimersByTimeAsync(1); });
    expect(screen.queryByText("Obsolete action")).toBeNull();
    expect(screen.getByText("Current action")).toBeTruthy();
    expect(api.calendar).not.toHaveBeenCalled();
  },
);
