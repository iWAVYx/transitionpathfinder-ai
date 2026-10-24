// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportVersionsPanel } from "@/components/pathway/ReportVersionsPanel";
import { DEMO_STUDENTS } from "@/lib/demo-data";
const state = vi.hoisted(() => ({ list: vi.fn(), get: vi.fn(), update: vi.fn(), restored: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/pathway.functions", () => ({ listReportVersions: state.list, getReportVersion: state.get, updateReportContent: state.update }));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
const row = (id: string, version_number = 1) => ({ id, version_number, change_summary: `Saved ${id}`, created_at: "2026-10-12T12:00:00Z", created_by: null });
const saved = (id: string, report_id = "report-a") => ({ ...row(id), report_id, content: DEMO_STUDENTS.maya.report });
function panel(id = "report-a", canRestore = true) { return <ReportVersionsPanel reportId={id} canRestore={canRestore} currentContent={DEMO_STUDENTS.maya.report} expectedRevision={"a".repeat(64)} onRestored={state.restored} />; }
beforeEach(() => {
  state.list.mockImplementation(({ data }: any) => Promise.resolve({ versions: [row(`${data.report_id}-version`)] }));
  state.update.mockResolvedValue({ ok: true });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it.each([false, true])("leaving the report before a version fetch settles prevents saving (failure=%s)", async failure => {
  let finish!: (value: unknown) => void; let fail!: (error: Error) => void;
  state.get.mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
  const view = render(panel()); fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
  view.rerender(panel("report-b")); await screen.findByText("Saved report-b-version", { exact: false });
  await act(async () => { if (failure) fail(new Error("Old fetch failed")); else finish(saved("report-a-version")); });
  expect(state.update).not.toHaveBeenCalled(); expect(state.restored).not.toHaveBeenCalled(); expect(state.error).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
});
it("unmounting before a version arrives prevents saving", async () => {
  let finish!: (value: unknown) => void;
  state.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = render(panel()); fireEvent.click(await screen.findByRole("button", { name: "Restore" })); view.unmount();
  await act(async () => { finish(saved("report-a-version")); });
  expect(state.update).not.toHaveBeenCalled(); expect(state.restored).not.toHaveBeenCalled();
});
it.each(["wrong-report", "wrong-version"])("rejects a mismatched version response: %s", async mismatch => {
  state.get.mockResolvedValue(saved(mismatch === "wrong-version" ? "other-version" : "report-a-version", mismatch === "wrong-report" ? "other-report" : "report-a"));
  render(panel()); fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
  await act(async () => {});
  expect(state.update).not.toHaveBeenCalled(); expect(state.restored).not.toHaveBeenCalled();
  expect(state.error).toHaveBeenCalledWith("That version does not belong to this report.");
});
it("allows only one restore at a time and preserves the selected version's complete content", async () => {
  let finish!: (value: unknown) => void;
  state.list.mockResolvedValue({ versions: [row("version-1", 1), row("version-2", 2)] });
  state.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(panel()); await screen.findAllByRole("button", { name: "Restore" });
  fireEvent.click(screen.getAllByRole("button", { name: "Restore" })[0]);
  const buttons = screen.getAllByRole("button"); expect(buttons.every(button => (button as HTMLButtonElement).disabled)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Restore" }));
  expect(state.get).toHaveBeenCalledTimes(1);
  await act(async () => { finish(saved("version-1")); });
  expect(state.update).toHaveBeenCalledExactlyOnceWith({ data: { report_id: "report-a", expected_revision: "a".repeat(64), content: DEMO_STUDENTS.maya.report, change_summary: "Restored version 1" } });
  expect(state.restored).toHaveBeenCalledOnce(); expect(state.success).toHaveBeenCalledWith("Restored version 1.");
  expect(screen.getAllByRole("button", { name: "Restore" }).every(button => !(button as HTMLButtonElement).disabled)).toBe(true);
});
it("does not refresh or notify a new report after an already-started save settles", async () => {
  let finishSave!: (value: unknown) => void;
  state.get.mockResolvedValue(saved("report-a-version"));
  state.update.mockReturnValue(new Promise(resolve => { finishSave = resolve; }));
  const view = render(panel()); fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
  await act(async () => {}); expect(state.update).toHaveBeenCalledOnce();
  view.rerender(panel("report-b")); await screen.findByText("Saved report-b-version", { exact: false });
  await act(async () => { finishSave({ ok: true }); });
  expect(state.restored).not.toHaveBeenCalled(); expect(state.success).not.toHaveBeenCalled();
  // A server write already started cannot be cancelled; it remains scoped to report-a.
  expect(state.update.mock.calls[0][0].data.report_id).toBe("report-a");
});
it("hides old version choices and ignores a late history response after selection changes", async () => {
  let finishOld!: (value: unknown) => void;
  state.list.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({ versions: [row("current-version")] });
  const view = render(panel()); view.rerender(panel("report-b")); await screen.findByText("Saved current-version", { exact: false });
  await act(async () => { finishOld({ versions: [row("old-version")] }); });
  expect(screen.queryByText("Saved old-version", { exact: false })).toBeNull(); expect(screen.getByText("Saved current-version", { exact: false })).toBeTruthy();
});

it.each(["flag", "reject"])("history %s failure has a reload action instead of empty-history copy", async mode => {
  if (mode === "flag") state.list.mockResolvedValueOnce({versions:[],loadFailed:true});
  else state.list.mockRejectedValueOnce(new Error("Unavailable"));
  render(panel()); await screen.findByRole("alert");
  expect(screen.queryByText(/No earlier versions yet/)).toBeNull(); expect(screen.queryByRole("button",{name:"Restore"})).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Reload Version History"}));
  await screen.findByText("Saved report-a-version",{exact:false}); expect(screen.queryByRole("alert")).toBeNull();
  expect(state.get).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
});
it("successful empty history displays first-edit guidance", async () => {
  state.list.mockResolvedValue({versions:[],loadFailed:false}); render(panel());
  await screen.findByText(/No earlier versions yet/); expect(screen.queryByRole("alert")).toBeNull();
});
it.each(["flag","reject"])("successful restore still refreshes the document if history refresh %s fails", async mode => {
  state.list.mockResolvedValueOnce({versions:[row("version-1")]});
  if (mode === "flag") state.list.mockResolvedValueOnce({versions:[],loadFailed:true}); else state.list.mockRejectedValueOnce(new Error("Unavailable"));
  state.get.mockResolvedValue(saved("version-1"));
  render(panel()); fireEvent.click(await screen.findByRole("button",{name:"Restore"})); await screen.findByRole("alert");
  expect(state.update).toHaveBeenCalledOnce(); expect(state.restored).toHaveBeenCalledOnce();
  expect(state.success).toHaveBeenCalledWith("Restored version 1."); expect(state.error).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Reload Version History"})); await screen.findByRole("button",{name:"Restore"});
  expect(state.update).toHaveBeenCalledOnce();
});
it("a pending history retry cannot populate a different report", async () => {
  let finish!: (value:unknown) => void;
  state.list.mockResolvedValueOnce({versions:[],loadFailed:true}).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const view = render(panel()); await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"Reload Version History"})); await act(async()=>{});
  view.rerender(panel("report-b")); await screen.findByText("Saved report-b-version",{exact:false});
  await act(async()=>{finish({versions:[row("old-version")]});});
  expect(screen.queryByText("Saved old-version",{exact:false})).toBeNull();
});

it("read-only readers keep history but do not receive Restore controls",async()=>{
 render(panel("report-a",false));await screen.findByText("Saved report-a-version",{exact:false});expect(screen.queryByRole("button",{name:"Restore"})).toBeNull();expect(screen.getByText(/Only the person who created this report/)).toBeTruthy();expect(state.get).not.toHaveBeenCalled();expect(state.update).not.toHaveBeenCalled();
});
it("missing restore capability fails closed",async()=>{
 render(<ReportVersionsPanel reportId="report-a" currentContent={DEMO_STUDENTS.maya.report}/>);await screen.findByText("Saved report-a-version",{exact:false});expect(screen.queryByRole("button",{name:"Restore"})).toBeNull();
});
it("losing restore eligibility during a version fetch prevents the save",async()=>{
 let finish!:(value:unknown)=>void;state.get.mockReturnValue(new Promise(resolve=>{finish=resolve;}));const view=render(panel());fireEvent.click(await screen.findByRole("button",{name:"Restore"}));view.rerender(panel("report-a",false));await act(async()=>{finish(saved("report-a-version"));});expect(state.update).not.toHaveBeenCalled();expect(state.success).not.toHaveBeenCalled();expect(state.restored).not.toHaveBeenCalled();
});
it("read-only empty history does not tell the reader to edit the report",async()=>{
 state.list.mockResolvedValue({versions:[],loadFailed:false});render(panel("report-a",false));await screen.findByText("No earlier versions are available.");expect(screen.queryByText(/first edit you save/)).toBeNull();
});

it("a same-report revision change during version loading stops restore before save", async () => {
  let finish!: (value: unknown) => void;
  state.get.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = render(panel()); fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
  view.rerender(<ReportVersionsPanel reportId="report-a" canRestore currentContent={DEMO_STUDENTS.maya.report} expectedRevision={"b".repeat(64)} onRestored={state.restored}/>);
  await act(async () => { finish(saved("report-a-version")); });
  expect(state.update).not.toHaveBeenCalled(); expect(state.restored).not.toHaveBeenCalled();
  expect(state.error).toHaveBeenCalledWith("This report has changed. Reload it before trying again.");
});
it("a cached reader missing its revision cannot start restoring", async () => {
  render(<ReportVersionsPanel reportId="report-a" canRestore currentContent={DEMO_STUDENTS.maya.report}/>);
  fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
  expect(state.get).not.toHaveBeenCalled(); expect(state.update).not.toHaveBeenCalled();
  expect(state.error).toHaveBeenCalledWith("Reload this report before restoring a version.");
});
