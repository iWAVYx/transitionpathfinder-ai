// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const state = vi.hoisted(() => ({ id: "report-a", audience: "family", print: undefined as number | undefined,
  get: vi.fn(), tokens: vi.fn(), students: vi.fn(), navigate: vi.fn(), create: vi.fn(), revoke: vi.fn(), link: vi.fn(), regenerate: vi.fn(), error: vi.fn(), success: vi.fn(), deniedWrite: vi.fn(() => { throw new Error("No record writes during reader checks"); }) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => ({ options, useParams: () => ({ reportId: state.id }), useSearch: () => ({ audience: state.audience, print: state.print }) }), useNavigate: () => state.navigate, Link: ({ to, children }: any) => <a href={to}>{children}</a> }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_roles: unknown, component: unknown) => component }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/pathway/ReportChapterPager", () => ({ ReportChapterPager: () => null }));
vi.mock("@/components/pathway/report/PathwayReportLayout", () => ({ PathwayReportLayout: ({ children }: any) => children }));
vi.mock("@/components/pathway/ReportVersionsPanel", () => ({ ReportVersionsPanel: ({canRestore}:any) => <section>Readable History{canRestore && <button>Restore Version</button>}</section> }));
vi.mock("@/components/pathway/EvidenceUsedPanel", () => ({ EvidenceUsedPanel: () => null }));
vi.mock("@/components/pathway/ReportV2Sections", () => ({ RegenerateBanner: ({canRegenerate,onRegenerate}:any) => <button disabled={!canRegenerate} onClick={onRegenerate}>Regenerate From Banner</button> }));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: ({ report, name, studentId, initialAudience, onRefresh }: any) => <article data-audience={initialAudience} data-student={studentId}><h1>{name}</h1><p>{report.summary}</p><button>Print Report</button>{onRefresh && <button onClick={onRefresh}>Refresh Report</button>}</article> }));
vi.mock("@/lib/pathway.functions", () => ({ getReport: state.get, linkReportToStudent: state.link, regeneratePathwayReport: state.regenerate }));
vi.mock("@/lib/students.functions", () => ({ listShareTokens: state.tokens, listStudents: state.students, createShareToken: state.create, revokeShareToken: state.revoke }));
vi.mock("sonner", () => ({ toast: { error: state.error, success: state.success } }));
import { Route } from "@/routes/_authenticated/reports.$reportId";
const Component = Route.options.component!;
const record = (id: string) => ({ id, content_revision: "a".repeat(64), is_report_owner: true, student_first_name: `Student ${id}`, student_id: `student-${id}`, created_at: "2026-10-11T12:00:00Z", report: { summary: `Notes for ${id}` } });
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
    for (const write of [state.create, state.revoke, state.link, state.regenerate]) expect(write).not.toHaveBeenCalled();
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

for (const kind of ["create", "revoke"] as const) {
  it(`${kind} failure is visible and sharing controls become usable again`, async () => {
    state.get.mockResolvedValue(record("report-a")); state.tokens.mockResolvedValue({ tokens: [share("current-token")] });
    state[kind].mockRejectedValue(new Error(`Could not ${kind} this link`));
    render(<Component />); await screen.findByText(/share\/current-token/);
    fireEvent.click(screen.getByRole("button", { name: kind === "create" ? "Family link" : "Revoke" }));
    await act(async () => {});
    expect(state.error).toHaveBeenCalledWith(`Could not ${kind} this link`);
    expect((screen.getByRole("button", { name: "Family link" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Revoke" }) as HTMLButtonElement).disabled).toBe(false);
    expect(state.tokens).toHaveBeenCalledTimes(1);
  });
  it.each([false, true])(`${kind} completion after departure has no follow-up load or notification (failure=%s)`, async failure => {
    let finish!: (value: unknown) => void; let fail!: (error: Error) => void;
    state.get.mockImplementation(({ data }: any) => Promise.resolve(record(data.id)));
    state.tokens.mockResolvedValue({ tokens: [share("current-token")] });
    state[kind].mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
    const view = render(<Component />); await screen.findByText(/share\/current-token/);
    fireEvent.click(screen.getByRole("button", { name: kind === "create" ? "Family link" : "Revoke" }));
    state.id = "report-b"; view.rerender(<Component />); await screen.findByText("Notes for report-b");
    await act(async () => { if (failure) fail(new Error("Old action failed")); else finish({ ok: true }); });
    expect(state.tokens).toHaveBeenCalledTimes(2); expect(state.error).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
  });
}
it("does not overlap link creation and revocation and refreshes the selected report's links once", async () => {
  let finish!: (value: unknown) => void;
  state.get.mockResolvedValue(record("report-a")); state.tokens.mockResolvedValue({ tokens: [share("current-token")] });
  state.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<Component />); await screen.findByText(/share\/current-token/);
  fireEvent.click(screen.getByRole("button", { name: "Family link" }));
  for (const name of ["Family link", "Educator link", "Revoke"]) expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Educator link" })); fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
  expect(state.create).toHaveBeenCalledTimes(1); expect(state.revoke).not.toHaveBeenCalled();
  expect(state.create).toHaveBeenCalledWith({ data: { report_id: "report-a", audience: "family", expires_in_days: 30 } });
  await act(async () => { finish({ ok: true }); });
  expect(state.tokens).toHaveBeenCalledTimes(2); expect((screen.getByRole("button", { name: "Family link" }) as HTMLButtonElement).disabled).toBe(false);
});
it.each([false, true])("regeneration completion after departure cannot reload or notify the next report (failure=%s)", async failure => {
  let finish!: (value: unknown) => void; let fail!: (error: Error) => void;
  state.get.mockImplementation(({ data }: any) => Promise.resolve(record(data.id)));
  state.regenerate.mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const view = render(<Component />); await screen.findByText("Notes for report-a");
  fireEvent.click(screen.getByRole("button", { name: "Refresh Report" }));
  state.id = "report-b"; view.rerender(<Component />); await screen.findByText("Notes for report-b");
  await act(async () => { if (failure) fail(new Error("Old generation failed")); else finish({ version_number: 2, change_summary: "Updated" }); });
  expect(state.get).toHaveBeenCalledTimes(2); expect(state.error).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
  expect(screen.getByText("Notes for report-b")).toBeTruthy();
});
it("regeneration cannot replace the report with a mismatched refreshed response", async () => {
  state.get.mockResolvedValueOnce(record("report-a")).mockResolvedValueOnce(record("wrong-report"));
  state.regenerate.mockResolvedValue({ version_number: 2, change_summary: "Updated" });
  render(<Component />); await screen.findByText("Notes for report-a"); fireEvent.click(screen.getByRole("button", { name: "Refresh Report" }));
  await act(async () => {});
  expect(state.error).toHaveBeenCalledWith("Could not reopen the updated report."); expect(state.success).not.toHaveBeenCalled();
  expect(screen.getByText("Notes for report-a")).toBeTruthy(); expect(screen.queryByText("Notes for wrong-report")).toBeNull();
});
it.each([false, true])("link completion after departure cannot notify or change the next report (failure=%s)", async failure => {
  let finish!: (value: unknown) => void; let fail!: (error: Error) => void;
  state.get.mockImplementation(({ data }: any) => Promise.resolve(record(data.id)));
  state.students.mockResolvedValue({ students: [{ id: "student-a", first_name: "Sample", last_name: "Student" }] });
  state.link.mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const view = render(<Component />); await screen.findByRole("option", { name: "Sample Student" });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "student-a" } });
  expect(state.link).toHaveBeenCalledWith({ data: { report_id: "report-a", student_id: "student-a" } });
  state.id = "report-b"; view.rerender(<Component />); await screen.findByText("Notes for report-b");
  await act(async () => { if (failure) fail(new Error("Old link failed")); else finish({ ok: true }); });
  expect(state.error).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "Student report-b" }).closest("article")?.getAttribute("data-student")).toBe("student-report-b");
});
it("successful revocation reloads links for the same report and removes the revoked row", async () => {
  state.get.mockResolvedValue(record("report-a"));
  state.tokens.mockResolvedValueOnce({ tokens: [share("current-token")] }).mockResolvedValueOnce({ tokens: [] });
  state.revoke.mockResolvedValue({ ok: true });
  render(<Component />); await screen.findByText(/share\/current-token/);
  fireEvent.click(screen.getByRole("button", { name: "Revoke" })); await act(async () => {});
  expect(state.revoke).toHaveBeenCalledExactlyOnceWith({ data: { id: "current-token" } });
  expect(state.tokens).toHaveBeenLastCalledWith({ data: { report_id: "report-a" } });
  expect(screen.queryByText(/share\/current-token/)).toBeNull(); expect(state.error).not.toHaveBeenCalled();
});

it.each([false,undefined,"true"])("non-owner or unconfirmed ownership %s hides every generation entry point and restore action",async owner=>{
 state.get.mockResolvedValue({...record("report-a"),is_report_owner:owner});render(<Component/>);await screen.findByText("Notes for report-a");expect(screen.getByText("Readable History")).toBeTruthy();for(const name of ["Refresh Report","Regenerate From Banner","Restore Version"])expect(screen.queryByRole("button",{name})).toBeNull();expect(screen.getByRole("button",{name:"Print Report"})).toBeTruthy();expect(state.regenerate).not.toHaveBeenCalled();
});
it("confirmed report owner retains restore and generation controls",async()=>{
 state.get.mockResolvedValue(record("report-a"));render(<Component/>);await screen.findByText("Notes for report-a");for(const name of ["Refresh Report","Regenerate From Banner","Restore Version"])expect(screen.getByRole("button",{name})).toBeTruthy();expect(state.regenerate).not.toHaveBeenCalled();
});
it("an unlinked owner's report retains history but cannot generate until linked",async()=>{
 state.get.mockResolvedValue({...record("report-a"),student_id:null});render(<Component/>);await screen.findByText("Notes for report-a");expect(screen.queryByRole("button",{name:"Refresh Report"})).toBeNull();expect((screen.getByRole("button",{name:"Regenerate From Banner"}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByRole("button",{name:"Restore Version"})).toBeTruthy();
});

it("refresh sends the displayed revision and does not retry a stale-report rejection", async () => {
  state.get.mockResolvedValue(record("report-a"));
  state.regenerate.mockRejectedValue(new Error("This report has changed. Reload it before trying again."));
  render(<Component/>); await screen.findByText("Notes for report-a");
  fireEvent.click(screen.getByRole("button", { name: "Refresh Report" })); await act(async () => {});
  expect(state.regenerate).toHaveBeenCalledExactlyOnceWith({ data: { report_id: "report-a", expected_revision: "a".repeat(64) } });
  expect(state.get).toHaveBeenCalledTimes(1); expect(state.success).not.toHaveBeenCalled();
  expect(state.error).toHaveBeenCalledWith("This report has changed. Reload it before trying again.");
});
it("linking refreshes the observed context before the next generation", async () => {
  state.get.mockResolvedValueOnce(record("report-a")).mockResolvedValue({ ...record("report-a"), student_id: "student-a", content_revision: "b".repeat(64) });
  state.students.mockResolvedValue({ students: [{ id: "student-a", first_name: "Sample", last_name: "Student" }] });
  state.link.mockResolvedValue({ ok: true }); state.regenerate.mockResolvedValue({ version_number: 2, change_summary: "Updated" });
  render(<Component/>); await screen.findByRole("option", { name: "Sample Student" });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "student-a" } }); await act(async () => {});
  fireEvent.click(screen.getByRole("button", { name: "Refresh Report" })); await act(async () => {});
  expect(state.regenerate).toHaveBeenCalledExactlyOnceWith({ data: { report_id: "report-a", expected_revision: "b".repeat(64) } });
});
it("a cached report reader with no revision stops before generation", async () => {
  state.get.mockResolvedValue({ ...record("report-a"), content_revision: undefined });
  render(<Component/>); await screen.findByText("Notes for report-a");
  fireEvent.click(screen.getByRole("button", { name: "Refresh Report" }));
  expect(state.regenerate).not.toHaveBeenCalled(); expect(state.error).toHaveBeenCalledWith("Reload this report before refreshing it.");
});
