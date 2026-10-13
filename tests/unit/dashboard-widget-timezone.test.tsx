// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
const state = vi.hoisted(() => ({ queries: [] as any[], calendar: vi.fn() }));
vi.mock("@tanstack/react-start", async importOriginal => ({ ...(await importOriginal<any>()), useServerFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: state.calendar }));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({ getNextActionsForMe: vi.fn() }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
  useQuery: (options: any) => { state.queries.push(options); return {}; },
  useMutation: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/components/dashboard/DashboardWidgetBoardView", () => ({ DashboardWidgetBoardView: () => null }));
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { browserCalendarTimeZone } from "@/lib/calendar-day";
afterEach(() => { cleanup(); state.queries = []; state.calendar.mockReset(); });
it.each(["student", "family", "educator", "school_admin", "district_admin", "partner"] as const)("%s calendar query keeps viewer timezone and existing widget applicability", async role => {
  render(<DashboardWidgetBoard role={role} studentId={role === "student" ? "student-one" : undefined} />);
  const query = state.queries.find(options => options.queryKey[0] === "dashboard-widget-calendar");
  expect(query.queryKey).toEqual(["dashboard-widget-calendar", role, role === "student" ? "student-one" : undefined, browserCalendarTimeZone()]);
  expect(query.enabled).toBe(role !== "district_admin" && role !== "partner");
  if (query.enabled) {
    state.calendar.mockResolvedValue({ events: [] }); await query.queryFn();
    expect(state.calendar).toHaveBeenCalledWith({ data: { timezone: browserCalendarTimeZone(), ...(role === "student" ? { student_id: "student-one" } : {}) } });
  } else expect(state.calendar).not.toHaveBeenCalled();
});
