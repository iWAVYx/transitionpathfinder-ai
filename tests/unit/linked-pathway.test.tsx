// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const loaders = vi.hoisted(() => ({ students: vi.fn(), reports: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/students.functions", () => ({ listStudents: loaders.students }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: loaders.reports }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options }), Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/opportunities/OpportunityPipelineSummary", () => ({ OpportunityPipelineSummary: ({ studentId }: any) => <div data-testid="pipeline-student">{studentId}</div> }));
import { Route as StudentRoute } from "@/routes/_authenticated/pathway.student";
import { Route as FamilyRoute } from "@/routes/_authenticated/pathway.family";
import { useLinkedPathway } from "@/components/pathway/useLinkedPathway";
import { PathwayConnectionsCard, PathwayNextStepsCard } from "@/components/pathway/PathwayConnectionsCard";
import { ROUTE_AUDIENCES } from "@/lib/role-policy";
function Harness() {
  const state = useLinkedPathway();
  return <><span>{state.loading ? "Loading" : state.error ? "Unavailable" : state.latest?.summary ?? "No report"}</span>
    <span data-testid="student-id">{state.student?.id}</span>
    <button onClick={() => state.setStudentId("b")}>Choose B</button><button onClick={state.retry}>Retry</button></>;
}
const students = [{ id: "a", first_name: "A" }, { id: "b", first_name: "B" }];
const reports = [
  { id: "orphan", student_id: null, created_at: "2026-10-06", summary: "Unlinked" },
  { id: "b1", student_id: "b", created_at: "2026-10-05", summary: "B report" },
  { id: "a1", student_id: "a", created_at: "2026-10-01", summary: "Older A" },
  { id: "a2", student_id: "a", created_at: "2026-10-04", summary: "Latest A" },
];
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe("linked pathway source selection", () => {
  it("keeps the newest report and opportunity student together; never uses an unlinked report", async () => {
    loaders.students.mockResolvedValue({ students, loadFailed: false });
    loaders.reports.mockResolvedValue({ reports, loadFailed: false });
    render(<Harness />);
    await screen.findByText("Latest A");
    expect(screen.getByTestId("student-id").textContent).toBe("a");
    fireEvent.click(screen.getByText("Choose B"));
    expect(screen.getByText("B report")).toBeTruthy();
    expect(screen.getByTestId("student-id").textContent).toBe("b");
    expect(screen.queryByText("Unlinked")).toBeNull();
  });
  it("distinguishes unavailable data from no report, and permits retry", async () => {
    loaders.students.mockResolvedValue({ students, loadFailed: false });
    loaders.reports.mockResolvedValueOnce({ reports: [], loadFailed: true }).mockResolvedValue({ reports: [], loadFailed: false });
    render(<Harness />);
    await screen.findByText("Unavailable");
    fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("No report");
    expect(screen.getByTestId("student-id").textContent).toBe("a");
  });
  it("does not accept an older request after a retry", async () => {
    let resolveOld!: (value: unknown) => void;
    loaders.students.mockResolvedValue({ students, loadFailed: false });
    loaders.reports.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue({ reports, loadFailed: false });
    render(<Harness />);
    fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("Latest A");
    resolveOld({ reports: [], loadFailed: false });
    await waitFor(() => expect(screen.getByText("Latest A")).toBeTruthy());
  });
});
for (const role of ["student", "family", "educator"] as const) for (const hasReport of [false, true]) {
  it(`${role} navigation only offers destinations allowed by role policy (${hasReport})`, () => {
    const { container } = render(<><PathwayConnectionsCard role={role} /><PathwayNextStepsCard role={role} hasReport={hasReport} /></>);
    for (const link of container.querySelectorAll("a")) {
      const href = link.getAttribute("href")!;
      if (href === "/resources") continue; // Public resource library is open to every role.
      expect(ROUTE_AUDIENCES[href], href).toBeDefined();
      expect(ROUTE_AUDIENCES[href], href).toContain(role);
    }
  });
}

for (const [label, route] of [["student", StudentRoute], ["family", FamilyRoute]] as const) {
  it(`${label} page shows recorded content and switches the report and pipeline together`, async () => {
    loaders.students.mockResolvedValue({ students, loadFailed: false });
    loaders.reports.mockResolvedValue({ reports, loadFailed: false });
    const Component = route.options.component!;
    const { container } = render(<Component />);
    await screen.findByText("Latest A");
    expect(screen.getByTestId("pipeline-student").textContent).toBe("a");
    expect(container.textContent).not.toMatch(/vet clinic|New job trial|Assessments and goals in place|Meeting with 2 partner programs/i);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "b" } });
    expect(screen.getByText("B report")).toBeTruthy();
    expect(screen.getByTestId("pipeline-student").textContent).toBe("b");
    expect(screen.queryByText("Latest A")).toBeNull();
  });
}
