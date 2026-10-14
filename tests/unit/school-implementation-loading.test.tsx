// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({
  org: { id: "school-a", name: "School A" },
  readiness: vi.fn(),
  dash: null as any,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<any>()),
  createFileRoute: () => (options: any) => ({ options }),
}));
vi.mock("@/components/withRoleGuard", () => ({
  withRoleGuard: (_roles: any, component: any) => component,
}));
vi.mock("@/components/school/SchoolPageShell", () => ({
  useSchoolDashboard: () => ({
    data: state.dash,
    loading: false,
    orgId: state.org.id,
    reload: vi.fn(),
  }),
  SchoolPageShell: ({ children }: any) => children(state.org, state.dash),
}));
vi.mock("@/lib/school-admin.functions", () => ({ getSchoolReadiness: state.readiness }));
vi.mock("@/components/implementation/RolloutMilestonesCard", () => ({
  RolloutMilestonesCard: ({ milestones }: any) => (
    <div>
      {milestones
        .filter((row: any) => row.key === "majority-reports")
        .map((row: any) => (
          <p key={row.key}>Report Coverage Milestone: {String(row.done)}</p>
        ))}
    </div>
  ),
}));
vi.mock("@/components/implementation/TrainingScheduleCard", () => ({
  TrainingScheduleCard: () => null,
}));
vi.mock("@/components/implementation/ReportingDeadlinesCard", () => ({
  ReportingDeadlinesCard: () => null,
}));
vi.mock("@/components/implementation/StaffProgressTable", () => ({
  StaffProgressTable: () => null,
}));
import { Route } from "@/routes/_authenticated/school.implementation";
const Page = Route.options.component!;
const stats = (total_students = 2) => ({
  total_students,
  with_pathway_report: 1,
  with_active_goals: 0,
  with_open_action_items: 0,
  avg_open_actions_per_student: 0,
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
beforeEach(() => {
  state.org = { id: "school-a", name: "School A" };
  state.dash = {
    members: [],
    pending_members: [],
    metrics: {
      students_count: 2,
      reports_count: 5,
      students_with_report: 1,
      active_members: 1,
      total_members: 1,
      documents_count: 0,
    },
  };
});
afterEach(() => {
  cleanup();
  state.readiness.mockReset();
});
it("shows generic failed-read recovery rather than an empty school and retries", async () => {
  state.readiness.mockRejectedValueOnce(new Error("Private error")).mockResolvedValueOnce(stats());
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByText("No Students Yet")).toBeNull();
  expect(document.body.textContent).not.toContain("Private error");
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await screen.findByText("Total Students");
  expect(state.readiness).toHaveBeenLastCalledWith({ data: { organization_id: "school-a" } });
});
it.each([false, true])(
  "switching schools discards old pending completion (failure %s)",
  async (failure) => {
    const old = deferred();
    const current = deferred();
    state.readiness.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const view = render(<Page />);
    state.org = { id: "school-b", name: "School B" };
    view.rerender(<Page />);
    await act(async () => {
      failure ? old.reject(new Error("Old private failure")) : old.resolve(stats(123));
    });
    expect(screen.queryByText("123")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => current.resolve(stats(456)));
    expect(screen.getByText("456")).toBeTruthy();
    expect(state.readiness).toHaveBeenLastCalledWith({ data: { organization_id: "school-b" } });
  },
);
it("clears accepted old metrics immediately on school change", async () => {
  const next = deferred();
  state.readiness.mockResolvedValueOnce(stats(123)).mockReturnValueOnce(next.promise);
  const view = render(<Page />);
  await screen.findByText("123");
  state.org = { id: "school-b", name: "School B" };
  view.rerender(<Page />);
  expect(screen.queryByText("123")).toBeNull();
  await act(async () => next.resolve(stats(456)));
  expect(screen.getByText("456")).toBeTruthy();
});
it.each([false, true])("unmount ignores pending completion (failure %s)", async (failure) => {
  const pending = deferred();
  state.readiness.mockReturnValue(pending.promise);
  const view = render(<Page />);
  view.unmount();
  await act(async () => {
    failure ? pending.reject(new Error("Late error")) : pending.resolve(stats());
  });
  expect(document.body.textContent).toBe("");
});
it("StrictMode replay discards its superseded request", async () => {
  const old = deferred();
  const current = deferred();
  state.readiness.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
  await act(async () => current.resolve(stats(456)));
  await act(async () => old.reject(new Error("Old strict failure")));
  expect(screen.getByText("456")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("uses genuine empty results, zero-width bars and distinct-student milestone counts", async () => {
  state.readiness.mockResolvedValueOnce(stats());
  const view = render(<Page />);
  await screen.findByText("Active Goals Defined");
  const row = screen.getByText("Active Goals Defined").closest("li")!;
  expect((row.querySelector(".bg-primary") as HTMLElement).style.width).toBe("0%");
  expect(screen.getByText("Report Coverage Milestone: false")).toBeTruthy();
  state.dash.metrics.students_with_report = 2;
  view.rerender(<Page />);
  expect(screen.getByText("Report Coverage Milestone: true")).toBeTruthy();
  state.org = { id: "school-b", name: "School B" };
  state.readiness.mockResolvedValueOnce({ ...stats(0), with_pathway_report: 0 });
  view.rerender(<Page />);
  await screen.findByText("No Students Yet");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("does not present the old grade completion samples as live school metrics", async () => {
  state.readiness.mockResolvedValue(stats());
  render(<Page />);
  await screen.findByText("Total Students");
  expect(
    screen.getByText("Grade-level implementation metrics are not available in this view."),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Grade 9: 92%/ })).toBeNull();
  expect(document.body.textContent).not.toContain("3 missing IEP uploads");
});
