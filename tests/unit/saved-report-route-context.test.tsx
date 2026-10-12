// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ id: "report-a", audience: "family", print: undefined as number | undefined,
  get: vi.fn(), tokens: vi.fn(), students: vi.fn(), navigate: vi.fn(), deniedWrite: vi.fn(() => { throw new Error("No record writes during reader checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ reportId: state.id }), useSearch: () => ({ audience: state.audience, print: state.print }) }), useNavigate: () => state.navigate, Link: ({ to, children }: any) => <a href={to}>{children}</a> }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_roles: unknown, component: unknown) => component }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/pathway/ReportChapterPager", () => ({ ReportChapterPager: () => null }));
vi.mock("@/components/pathway/report/PathwayReportLayout", () => ({ PathwayReportLayout: ({ children }: any) => children }));
vi.mock("@/components/pathway/ReportVersionsPanel", () => ({ ReportVersionsPanel: () => null }));
vi.mock("@/components/pathway/EvidenceUsedPanel", () => ({ EvidenceUsedPanel: () => null }));
vi.mock("@/components/pathway/ReportV2Sections", () => ({ RegenerateBanner: () => null }));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: ({ report, name, studentId, initialAudience }: any) => <article data-audience={initialAudience} data-student={studentId}><h1>{name}</h1><p>{report.summary}</p><button>Print Report</button></article> }));
vi.mock("@/lib/pathway.functions", () => ({ getReport: state.get, linkReportToStudent: state.deniedWrite, regeneratePathwayReport: state.deniedWrite }));
vi.mock("@/lib/students.functions", () => ({ listShareTokens: state.tokens, listStudents: state.students, createShareToken: state.deniedWrite, revokeShareToken: state.deniedWrite }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
import { Route } from "@/routes/_authenticated/reports.$reportId";
const Component = Route.options.component!;
const record = (id: string) => ({ id, student_first_name: `Student ${id}`, student_id: `student-${id}`, created_at: "2026-10-11T12:00:00Z", report: { summary: `Notes for ${id}` } });
const share = (token: string) => ({ id: token, token, audience: "family", view_count: 0, revoked: false, expires_at: null });
beforeEach(() => { state.id = "report-a"; state.audience = "family"; state.print = undefined; state.tokens.mockResolvedValue({ tokens: [] }); state.students.mockResolvedValue({ students: [] }); });
afterEach(() => { cleanup(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.useRealTimers(); });
for (const audience of ["student", "family", "educator"]) {
  it.each([false, true])(`${audience} reader ignores the previous report's late response (failure=%s)`, async failure => {
    state.audience = audience;
    let finishOld!: (value: unknown) => void; let failOld!: (error: Error) => void;
    state.get.mockImplementation(({ data }: any) => data.id === "report-a" ? new Promise((resolve, reject) => { finishOld = resolve; failOld = reject; }) : Promise.resolve(record(data.id)));
    const view = render(<Component />); state.id = "report-b"; view.rerender(<Component />);
    await screen.findByText("Notes for report-b");
    await act(async () => { if (failure) failOld(new Error("Old report failed")); else finishOld(record("report-a")); });
    expect(screen.getByText("Notes for report-b")).toBeTruthy(); expect(screen.queryByText("Notes for report-a")).toBeNull();
    expect(screen.queryByText("Old report failed")).toBeNull();
    expect(screen.getByRole("heading", { name: "Student report-b" }).closest("article")?.getAttribute("data-audience")).toBe(audience);
    expect(state.deniedWrite).not.toHaveBeenCalled();
  });
}
it("hides the old document, sharing controls and print action while another report loads", async () => {
  state.get.mockResolvedValueOnce(record("report-a")).mockReturnValueOnce(new Promise(() => {}));
  state.tokens.mockResolvedValueOnce({ tokens: [share("old-token")] }).mockReturnValueOnce(new Promise(() => {}));
  const view = render(<Component />); await screen.findByText("Notes for report-a"); await screen.findByText(/share\/old-token/);
  state.id = "report-b"; view.rerender(<Component />);
  expect(screen.queryByRole("button", { name: "Print Report" })).toBeNull(); expect(screen.queryByRole("button", { name: "Family link" })).toBeNull();
  expect(screen.queryByText(/share\/old-token/)).toBeNull(); expect(screen.queryByText("Notes for report-a")).toBeNull();
  expect(screen.getByText("Loading the report…")).toBeTruthy();
});
it("ignores late sharing tokens and roster options from the previous report", async () => {
  let finishTokens!: (value: unknown) => void; let finishStudents!: (value: unknown) => void;
  state.get.mockImplementation(({ data }: any) => Promise.resolve(record(data.id)));
  state.tokens.mockReturnValueOnce(new Promise(resolve => { finishTokens = resolve; })).mockResolvedValueOnce({ tokens: [share("current-token")] });
  state.students.mockReturnValueOnce(new Promise(resolve => { finishStudents = resolve; })).mockResolvedValueOnce({ students: [] });
  const view = render(<Component />); await screen.findByText("Notes for report-a");
  state.id = "report-b"; view.rerender(<Component />); await screen.findByText(/share\/current-token/);
  await act(async () => { finishTokens({ tokens: [share("old-token")] }); finishStudents({ students: [{ id: "old-student", first_name: "Old", last_name: "Roster" }] }); });
  expect(screen.queryByText(/share\/old-token/)).toBeNull(); expect(screen.queryByRole("option", { name: "Old Roster" })).toBeNull();
  expect(screen.getByText(/share\/current-token/)).toBeTruthy();
});
it("rejects a response whose ID is not the selected report", async () => {
  state.get.mockResolvedValue(record("wrong-report")); render(<Component />);
  await screen.findByRole("heading", { name: "We Couldn't Open That Report." });
  expect(screen.queryByRole("button", { name: "Print Report" })).toBeNull(); expect(screen.queryByText("Notes for wrong-report")).toBeNull();
});
it("cancels a scheduled auto-print when leaving the report", async () => {
  vi.useFakeTimers(); state.print = 1;
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  state.get.mockResolvedValueOnce(record("report-a")).mockReturnValueOnce(new Promise(() => {}));
  const view = render(<Component />); await act(async () => {});
  expect(screen.getByText("Notes for report-a")).toBeTruthy();
  state.id = "report-b"; view.rerender(<Component />);
  await act(async () => { vi.advanceTimersByTime(600); });
  expect(print).not.toHaveBeenCalled(); expect(screen.getByText("Loading the report…")).toBeTruthy();
});
