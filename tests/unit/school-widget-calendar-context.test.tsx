// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({ calendar: vi.fn(), prefs: vi.fn(), save: vi.fn() }));
vi.mock("@tanstack/react-start", async importOriginal => ({ ...(await importOriginal<any>()), useServerFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.calendar }));
vi.mock("@/lib/dashboard/dashboard-widget-prefs.functions", async importOriginal => ({ ...(await importOriginal<any>()), getDashboardWidgetPrefs: api.prefs, updateDashboardWidgetPrefs: api.save }));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({ getNextActionsForMe: vi.fn() }));
vi.mock("@/components/dashboard/DashboardWidgetBoardView", () => ({ DashboardWidgetBoardView: ({ data }: any) => <><output>{data.calendar.notice ?? (data.calendar.loading ? "Calendar Loading" : "Calendar Ready")}</output>{data.calendar.error && <p role="alert">Calendar Error</p>}{data.calendar.entries.map((entry: any) => <p key={entry.id}>{entry.title}</p>)}</> }));
vi.mock("@/lib/dashboard/organization-widget-actions.functions", () => ({ getOrganizationWidgetActions: vi.fn().mockResolvedValue({ entries: [], total: 0, viewer_id: "caller" }) }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "caller" }, loading: false }) }));
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { browserCalendarTimeZone } from "@/lib/calendar-day";
function deferred() { let resolve!: (value: any) => void; let reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const result = (title: string) => ({ events: [{ id: title, title, event_date: "2030-12-31", kind: "meeting" }] });
const clients: QueryClient[] = [];
function mount(org?: string) {
  api.prefs.mockResolvedValue({ widgets: ["calendar"] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } }); clients.push(client);
  const node = (id?: string) => <QueryClientProvider client={client}><DashboardWidgetBoard role="school_admin" organizationId={id} /></QueryClientProvider>;
  const view = render(node(org)); return { client, view, node };
}
afterEach(() => { cleanup(); clients.splice(0).forEach(client => client.clear()); Object.values(api).forEach(fn => fn.mockReset()); });
it.each([false, true])("late previous-school completion cannot replace the current widget or its error state (failure=%s)", async failure => {
  const old = deferred(); api.calendar.mockReturnValueOnce(old.promise).mockResolvedValueOnce(result("School B Event"));
  const { view, node } = mount("school-a"); await waitFor(() => expect(api.calendar).toHaveBeenCalledOnce());
  view.rerender(node("school-b")); await screen.findByText("School B Event");
  await act(async () => failure ? old.reject(new Error("Old school error")) : old.resolve(result("School A Event")));
  expect(screen.queryByText("School A Event")).toBeNull(); expect(screen.queryByRole("alert")).toBeNull();
  expect(api.calendar.mock.calls[1][0]).toEqual({ data: { timezone: browserCalendarTimeZone(), organization_id: "school-b" } });
});
it("switching a loaded school hides old entries immediately while the new school loads", async () => {
  const next = deferred(); api.calendar.mockResolvedValueOnce(result("School A Event")).mockReturnValueOnce(next.promise);
  const { view, node } = mount("school-a"); await screen.findByText("School A Event"); view.rerender(node("school-b"));
  expect(screen.queryByText("School A Event")).toBeNull(); expect(screen.getByText("Calendar Loading")).toBeTruthy();
  await act(async () => next.resolve(result("School B Event"))); await screen.findByText("School B Event");
});
it("a missing school disables calendar reads and suppresses any aggregate cache rows", async () => {
  const { client, view, node } = mount();
  await waitFor(() => expect(api.prefs).toHaveBeenCalledOnce());
  await act(async () => client.setQueryData(["dashboard-widget-calendar", "school_admin", undefined, undefined, browserCalendarTimeZone(), "caller"], result("Aggregate Cached Event")));
  view.rerender(node());
  expect(api.calendar).not.toHaveBeenCalled(); expect(screen.queryByText("Aggregate Cached Event")).toBeNull(); expect(screen.getByText("A selected school is needed to show calendar events.")).toBeTruthy(); expect(api.save).not.toHaveBeenCalled();
});
it("the actual widget reader shows the missing-school notice instead of loading or an empty-calendar claim", async () => {
  const { DashboardWidgetBoardView: ActualView } = await vi.importActual<typeof import("@/components/dashboard/DashboardWidgetBoardView")>("@/components/dashboard/DashboardWidgetBoardView");
  const empty = { entries: [], toolDestination: null };
  render(<ActualView role="school_admin" widgets={["calendar"]} available={["calendar"]} update={() => {}} data={{ actions: empty, meetings: empty, calendar: { ...empty, notice: "A selected school is needed to show calendar events." } }} />);
  expect(screen.getByRole("status").textContent).toBe("A selected school is needed to show calendar events.");
  expect(screen.queryByText("No upcoming calendar events")).toBeNull();
});
