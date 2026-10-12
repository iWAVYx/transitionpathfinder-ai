// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), report: vi.fn(), statuses: vi.fn(), save: vi.fn(), toast: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: state.toast } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: state.list }));
vi.mock("@/lib/ppt.functions", () => ({ getPathwayReport: state.report }));
vi.mock("@/lib/goal-statuses.functions", () => ({ listGoalStatuses: state.statuses, upsertGoalStatus: state.save }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => ({ options }), Link: ({ to, children }: any) => <a href={to}>{children}</a> }));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => children }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
import { Route } from "@/routes/_authenticated/goals";
const Page = (Route as any).options.component;
const rows = [{ id: "report-a", student_first_name: "Sample A", grade_band: null, created_at: "2026-10-12" }, { id: "report-b", student_first_name: "Sample B", grade_band: null, created_at: "2026-10-12" }];
function report(id: string) { return { id, student_first_name: id === "report-a" ? "Sample A" : "Sample B", content: { life_skills_focus: [`${id} recorded step`], education_training_options: [], career_pathways: [], thirty_day_plan: [] } }; }
function deferred() { let resolve!: (value: any) => void; let reject!: (error: unknown) => void; const promise = new Promise<any>((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; }
beforeEach(() => {
  vi.clearAllMocks(); state.list.mockReset(); state.report.mockReset(); state.statuses.mockReset(); state.save.mockReset();
  localStorage.clear(); state.list.mockResolvedValue({ reports: rows, loadFailed: false });
  state.report.mockImplementation(({ data }: any) => Promise.resolve(report(data.id)));
  state.statuses.mockResolvedValue({ statuses: {} }); state.save.mockResolvedValue({ ok: true });
});
afterEach(cleanup);
it.each(["flag", "reject"])("report library %s failure shows reload instead of an empty tracker", async mode => {
  if (mode === "flag") state.list.mockResolvedValueOnce({ reports: [], loadFailed: true });
  else state.list.mockRejectedValueOnce(new Error("Unavailable"));
  render(<Page />); await screen.findByRole("alert");
  expect(screen.queryByText(/Nothing to track yet/)).toBeNull(); expect(state.report).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reload Reports" }));
  await screen.findByText("report-a recorded step"); expect(screen.queryByRole("alert")).toBeNull();
});
it("only a successful empty list shows the first-report guidance", async () => {
  state.list.mockResolvedValue({ reports: [], loadFailed: false }); render(<Page />);
  await screen.findByText(/Nothing to track yet/); expect(screen.queryByRole("alert")).toBeNull();
});
it.each(["reject", "mismatch"])("selected report %s has a separate next-step reload", async mode => {
  if (mode === "reject") state.report.mockRejectedValueOnce(new Error("Unavailable"));
  else state.report.mockResolvedValueOnce(report("report-b"));
  render(<Page />); await screen.findByRole("alert"); expect(screen.queryByText("report-b recorded step")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload Next Steps" }));
  await screen.findByText("report-a recorded step"); expect(state.list).toHaveBeenCalledTimes(1);
  expect(state.report.mock.calls[1][0]).toEqual({ data: { id: "report-a" } });
});
it.each(["success", "error"])("late old report %s cannot replace the new selection", async mode => {
  const old = deferred(); state.report.mockImplementationOnce(() => old.promise);
  render(<Page />); await screen.findByRole("button", { name: "Sample B" });
  fireEvent.click(screen.getByRole("button", { name: "Sample B" })); await screen.findByText("report-b recorded step");
  await act(async () => { if (mode === "success") old.resolve(report("report-a")); else old.reject(new Error("Late failure")); });
  expect(screen.queryByText("report-a recorded step")).toBeNull(); expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: "Sample B" }).getAttribute("aria-pressed")).toBe("true");
});
it("old goals and cached status do not appear under a new report while it loads", async () => {
  state.statuses.mockResolvedValueOnce({ statuses: { "life:0": "met" } });
  const pending = deferred(); state.report.mockImplementationOnce(() => Promise.resolve(report("report-a"))).mockImplementationOnce(() => pending.promise);
  render(<Page />); await screen.findByText("report-a recorded step");
  await waitFor(() => expect(state.statuses).toHaveBeenCalledWith({ data: { reportId: "report-a" } }));
  fireEvent.click(screen.getByRole("button", { name: "Sample B" }));
  expect(screen.queryByText("report-a recorded step")).toBeNull(); expect(screen.queryByRole("button", { name: "Met" })).toBeNull();
  await act(async () => pending.resolve(report("report-b"))); await screen.findByText("report-b recorded step");
  const notStarted = screen.getByRole("button", { name: "Not started" }); expect(notStarted.className).toContain("bg-muted");
  expect(state.save).not.toHaveBeenCalled();
});
it("a departed list result cannot populate a new tracker instance", async () => {
  const old = deferred(); state.list.mockImplementationOnce(() => old.promise).mockResolvedValueOnce({ reports: [], loadFailed: false });
  const first = render(<Page />); await waitFor(() => expect(state.list).toHaveBeenCalledTimes(1));
  first.unmount(); render(<Page />); await screen.findByText(/Nothing to track yet/);
  await act(async () => old.resolve({ reports: rows, loadFailed: false })); expect(screen.queryByRole("button", { name: "Sample A" })).toBeNull();
});

it("failed saved progress reads do not display cached/default totals or allow writes", async () => {
  localStorage.setItem("tf:goal-status:report-a", JSON.stringify({ "life:0": "met" }));
  state.statuses.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ statuses: { "life:0": "in-progress" } });
  render(<Page />); await screen.findByRole("alert");
  expect(screen.queryByText("Sample A's next steps")).toBeNull();
  expect(screen.queryByRole("button", { name: "Met" })).toBeNull(); expect(state.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Reload Saved Progress" }));
  const progress = await screen.findByRole("button", { name: "In progress" });
  expect(progress.getAttribute("aria-pressed")).toBe("true");
  expect(state.report).toHaveBeenCalledTimes(1);
});
it("does not allow changes before the authoritative status read finishes", async () => {
  const pending = deferred(); state.statuses.mockImplementationOnce(() => pending.promise);
  render(<Page />); await screen.findByText("Loading saved progress…");
  expect(screen.queryByRole("button", { name: "Met" })).toBeNull();
  await act(async () => pending.resolve({ statuses: {} })); await screen.findByText("report-a recorded step");
  expect(state.save).not.toHaveBeenCalled();
});
it("serializes rapid updates and caches only confirmed saves", async () => {
  const pending = deferred(); state.save.mockImplementationOnce(() => pending.promise);
  render(<Page />); const met = await screen.findByRole("button", { name: "Met" });
  const before = localStorage.getItem("tf:goal-status:report-a");
  fireEvent.click(met); fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  expect(state.save).toHaveBeenCalledTimes(1);
  expect(state.save).toHaveBeenCalledWith({ data: { reportId: "report-a", itemId: "life:0", status: "met" } });
  expect(localStorage.getItem("tf:goal-status:report-a")).toBe(before);
  expect(met.hasAttribute("disabled")).toBe(true); expect(screen.getByRole("status").textContent).toBe("Saving progress…");
  await act(async () => pending.resolve({ ok: true }));
  expect(met.hasAttribute("disabled")).toBe(false);
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({ "life:0": "met" });
  fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(2));
});
it("an unconfirmed save requires reloading server progress before more changes", async () => {
  state.save.mockRejectedValueOnce(new Error("Network error"));
  state.statuses.mockResolvedValueOnce({ statuses: {} }).mockResolvedValueOnce({ statuses: { "life:0": "met" } });
  render(<Page />); fireEvent.click(await screen.findByRole("button", { name: "Met" }));
  await screen.findByRole("alert"); expect(screen.queryByRole("button", { name: "In progress" })).toBeNull();
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({});
  fireEvent.click(screen.getByRole("button", { name: "Reload Saved Progress" }));
  expect((await screen.findByRole("button", { name: "Met" })).getAttribute("aria-pressed")).toBe("true");
});
it.each(["success", "failure"])("a departed save %s does not affect the next report or rewrite its cache", async mode => {
  const pending = deferred(); state.save.mockImplementationOnce(() => pending.promise);
  render(<Page />); fireEvent.click(await screen.findByRole("button", { name: "Met" }));
  fireEvent.click(screen.getByRole("button", { name: "Sample B" })); await screen.findByText("report-b recorded step");
  const beforeA = localStorage.getItem("tf:goal-status:report-a"); const beforeB = localStorage.getItem("tf:goal-status:report-b");
  await act(async () => { if (mode === "success") pending.resolve({ ok: true }); else pending.reject(new Error("Late failure")); });
  expect(state.toast).not.toHaveBeenCalled(); expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("button", { name: "Not started" }).getAttribute("aria-pressed")).toBe("true");
  expect(localStorage.getItem("tf:goal-status:report-a")).toBe(beforeA); expect(localStorage.getItem("tf:goal-status:report-b")).toBe(beforeB);
  expect(state.save).toHaveBeenCalledTimes(1);
});
it("superseded progress reads cannot change the next report's totals", async () => {
  const pending = deferred(); state.statuses.mockImplementationOnce(() => pending.promise);
  render(<Page />); await screen.findByText("Loading saved progress…");
  fireEvent.click(screen.getByRole("button", { name: "Sample B" })); await screen.findByText("report-b recorded step");
  await act(async () => pending.resolve({ statuses: { "life:0": "met" } }));
  expect(screen.getByRole("button", { name: "Not started" }).getAttribute("aria-pressed")).toBe("true");
});
