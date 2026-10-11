// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ org: { id: "a", name: "School A" }, school: vi.fn(), district: vi.fn(), reports: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), Link: ({ children }: any) => <a>{children}</a> }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_: unknown, component: unknown) => component }));
vi.mock("@/components/school/SchoolPageShell", () => ({
  useSchoolDashboard: () => ({ data: {}, loading: false, orgId: state.org.id, reload: vi.fn() }),
  SchoolPageShell: ({ children }: any) => children(state.org),
}));
vi.mock("@/components/district/DistrictPageShell", () => ({
  useDistrictDashboard: () => ({ data: {}, loading: false, districtId: state.org.id, reload: vi.fn() }),
  DistrictPageShell: ({ children }: any) => children(state.org),
}));
vi.mock("@/lib/school-admin.functions", () => ({ getSchoolReportMetrics: state.school, listSchoolReports: state.reports }));
vi.mock("@/lib/district-admin.functions", () => ({ getDistrictReportMetrics: state.district }));
vi.mock("@/lib/organization-report-pdf", () => ({ createOrganizationReportPdf: vi.fn(() => { throw new Error("Unexpected PDF creation"); }) }));
vi.mock("@/components/ui/calendar", () => ({ Calendar: ({ onSelect }: any) => <button onClick={() => onSelect(new Date(2026, 9, 1))}>Select October</button> }));
vi.mock("@/components/ui/popover", () => ({ Popover: ({ children }: any) => <div>{children}</div>, PopoverTrigger: ({ children }: any) => children, PopoverContent: ({ children }: any) => <div>{children}</div> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { Route as SchoolRoute } from "../../src/routes/_authenticated/school.reports";
import { Route as DistrictRoute } from "../../src/routes/_authenticated/district.reports";
const windowFor = (name: string, from: string | null = null) => ({
  from, to: null,
  metrics: { students_count: 1, reports_count: 1, open_actions: 0, active_goals: 0, schools_count: 1, pct_with_report: 100, pct_with_goals: 0, pct_with_actions: 0, avg_open_actions_per_student: 0 },
  students: [{ id: name, name, grade_band: "9-10", reports_count: 1, has_report: true, active_goals: 0, open_actions: 0 }],
  schools: [{ id: name, name, students_count: 1, reports_count: 1, students_with_report: 1, open_actions: 0 }],
});
beforeEach(() => { state.org = { id: "a", name: "School A" }; state.reports.mockResolvedValue({ reports: [] }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); });
for (const [role, route, loader] of [["school", SchoolRoute, state.school], ["district", DistrictRoute, state.district]] as const) {
  it(`${role} reporting shows a failed load and retries successfully without enabling exports early`, async () => {
    loader.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce(windowFor("Recovered row"));
    const Component = route.options.component!;
    render(<Component />);
    await screen.findByText("We couldn't load this report. Please try again.");
    expect((screen.getByRole("button", { name: /Export PDF/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
    await screen.findByText("Recovered row");
    expect((screen.getByRole("button", { name: /Export PDF/ }) as HTMLButtonElement).disabled).toBe(false);
  });
  it(`${role} reporting hides the previous organization and ignores its late response`, async () => {
    let resolveOld!: (value: unknown) => void;
    loader.mockResolvedValueOnce(windowFor("Old row"))
      .mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValueOnce(windowFor("Current row"));
    const Component = route.options.component!;
    const view = render(<Component />);
    await screen.findByText("Old row");
    state.org = { id: "b", name: "School B" }; view.rerender(<Component />);
    expect(screen.queryByText("Old row")).toBeNull();
    expect((screen.getByRole("button", { name: /Export CSV/ }) as HTMLButtonElement).disabled).toBe(true);
    state.org = { id: "c", name: "School C" }; view.rerender(<Component />);
    await screen.findByText("Current row");
    await act(async () => { resolveOld(windowFor("Late row")); });
    expect(screen.queryByText("Late row")).toBeNull();
    expect(screen.getByText("Current row")).toBeTruthy();
  });
  it(`${role} reporting hides the previous period until the selected period has loaded`, async () => {
    let resolvePeriod!: (value: unknown) => void;
    loader.mockResolvedValueOnce(windowFor("All-time row"))
      .mockReturnValueOnce(new Promise(resolve => { resolvePeriod = resolve; }));
    const Component = route.options.component!;
    render(<Component />);
    await screen.findByText("All-time row");
    fireEvent.click(screen.getAllByRole("button", { name: "Select October" })[0]);
    expect(screen.queryByText("All-time row")).toBeNull();
    expect((screen.getByRole("button", { name: /Export PDF/ }) as HTMLButtonElement).disabled).toBe(true);
    const from = new Date(2026, 9, 1).toISOString();
    await act(async () => { resolvePeriod(windowFor("Selected-period row", from)); });
    expect(screen.getByText("Selected-period row")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Export PDF/ }) as HTMLButtonElement).disabled).toBe(false);
  });
}
