// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { goalTrackerItems } from "@/lib/goal-tracker-items";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), report: vi.fn(), statuses: vi.fn(), save: vi.fn(), toast: vi.fn(), roles: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: state.toast } }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: state.list }));
vi.mock("@/lib/profile.functions", () => ({ getMyRoles: state.roles }));
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
  vi.stubGlobal("crypto", webcrypto);
  vi.clearAllMocks(); state.list.mockReset(); state.report.mockReset(); state.statuses.mockReset(); state.save.mockReset();
  state.roles.mockReset(); state.roles.mockResolvedValue({ roles: ["guardian"] });
  localStorage.clear(); state.list.mockResolvedValue({ reports: rows, loadFailed: false });
  state.report.mockImplementation(({ data }: any) => Promise.resolve(report(data.id)));
  state.statuses.mockResolvedValue({ statuses: {} }); state.save.mockResolvedValue({ ok: true });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
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
  const [item] = await goalTrackerItems(report("report-a").content);
  localStorage.setItem("tf:goal-status:report-a", JSON.stringify({ "life:0": "met" }));
  state.statuses.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ statuses: { [item.id]: "in-progress" } });
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
  const [item] = await goalTrackerItems(report("report-a").content);
  const pending = deferred(); state.save.mockImplementationOnce(() => pending.promise);
  render(<Page />); const met = await screen.findByRole("button", { name: "Met" });
  const before = localStorage.getItem("tf:goal-status:report-a");
  fireEvent.click(met); fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  expect(state.save).toHaveBeenCalledTimes(1);
  expect(state.save).toHaveBeenCalledWith({ data: { reportId: "report-a", itemId: item.id, status: "met" } });
  expect(localStorage.getItem("tf:goal-status:report-a")).toBe(before);
  expect(met.hasAttribute("disabled")).toBe(true); expect(screen.getByRole("status").textContent).toBe("Saving progress…");
  await act(async () => pending.resolve({ ok: true }));
  expect(met.hasAttribute("disabled")).toBe(false);
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({ [item.id]: "met" });
  fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(2));
});
it("an unconfirmed save requires reloading server progress before more changes", async () => {
  const [item] = await goalTrackerItems(report("report-a").content);
  state.save.mockRejectedValueOnce(new Error("Network error"));
  state.statuses.mockResolvedValueOnce({ statuses: {} }).mockResolvedValueOnce({ statuses: { [item.id]: "met" } });
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

it("old positional progress is preserved but not silently assigned to current steps", async () => {
  state.statuses.mockResolvedValue({ statuses: { "life:0": "met" } });
  render(<Page />); await screen.findByRole("note");
  expect(screen.getByRole("button", { name: "Not started" }).getAttribute("aria-pressed")).toBe("true");
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({ "life:0": "met" });
  expect(state.save).not.toHaveBeenCalled();
});
it("malformed report steps use the report reload path", async () => {
  state.report.mockResolvedValueOnce({ ...report("report-a"), content: {life_skills_focus:[42]} });
  render(<Page />); await screen.findByRole("button", {name:"Reload Next Steps"});
  expect(state.statuses).not.toHaveBeenCalled();
});

it("a current newer report shows its recorded action rather than retained older goals", async () => {
  state.report.mockResolvedValueOnce({ ...report("report-a"), content: {schema_version:2,life_skills_focus:["Old plan step"],cross_cutting_horizons:{thirty_day:["Current plan action"],ninety_day:["Current later action"],six_month:["Current longer action"],one_year:["Current yearly action"]}} });
  render(<Page />); await screen.findByText("Current plan action");
  expect(screen.queryByText("Old plan step")).toBeNull();
  expect(screen.getByText("Current yearly action")).toBeTruthy();
});

function currentPlans() {
  const horizons = (prefix: string) => ({thirty_day:[`${prefix} now`],ninety_day:[`${prefix} later`],six_month:[`${prefix} six months`],one_year:[`${prefix} year`]});
  return {schema_version:2,family_action_plan_v2:{horizons:horizons("Family")},educator_action_plan_v2:{horizons:horizons("Educator")},student_action_plan:{horizons:horizons("Student")}};
}
it.each([["guardian", "Family", "Educator"], ["case_manager", "Educator", "Family"]])("%s receives its recorded plan without another role selector", async (role, expected, absent) => {
  state.roles.mockResolvedValue({roles:[role]}); state.report.mockResolvedValue({...report("report-a"),content:currentPlans()});
  render(<Page />); await screen.findByText(`${expected} now`);
  expect(screen.getByText(`${expected} year`)).toBeTruthy(); expect(screen.queryByText(`${absent} now`)).toBeNull();
  expect(screen.queryByRole("button", {name:`${absent} Plan`})).toBeNull(); expect(screen.queryByText("Student now")).toBeNull();
});
it("mixed-role accounts can switch only between their eligible recorded plans", async () => {
  state.roles.mockResolvedValue({roles:["guardian","teacher"]}); state.report.mockResolvedValue({...report("report-a"),content:currentPlans()});
  render(<Page />); await screen.findByText("Family now");
  fireEvent.click(screen.getByRole("button",{name:"Educator Plan"})); await screen.findByText("Educator now");
  expect(screen.queryByText("Family now")).toBeNull(); expect(screen.queryByText("Student now")).toBeNull();
});
it("planning-role failures block role plan loading and offer their own retry", async () => {
  state.roles.mockRejectedValueOnce(new Error("Unavailable")); state.report.mockResolvedValue({...report("report-a"),content:currentPlans()});
  render(<Page />); await screen.findByRole("button",{name:"Reload Planning View"}); expect(state.report).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Reload Planning View"})); await screen.findByText("Family now");
});
it("admin-only planning view does not imply Family or Educator membership", async () => {
  state.roles.mockResolvedValue({roles:["admin"]}); state.report.mockResolvedValue({...report("report-a"),content:currentPlans()});
  render(<Page />); await screen.findByText(/No next steps are available/);
  expect(screen.queryByText("Family now")).toBeNull(); expect(screen.queryByText("Educator now")).toBeNull();
});

it("role lookup must finish before loading a role-specific report plan", async () => {
  const pending = deferred(); state.roles.mockImplementationOnce(() => pending.promise);
  render(<Page />); await waitFor(() => expect(state.roles).toHaveBeenCalledTimes(1));
  expect(state.report).not.toHaveBeenCalled();
  await act(async () => pending.resolve({roles:["teacher"]}));
  await screen.findByText("report-a recorded step");
});
it("a late Family plan response cannot replace the selected Educator plan", async () => {
  const old = deferred(); state.roles.mockResolvedValue({roles:["guardian","teacher"]});
  state.report.mockImplementationOnce(() => old.promise).mockResolvedValue({...report("report-a"),content:currentPlans()});
  render(<Page />); const educator = await screen.findByRole("button",{name:"Educator Plan"});
  await waitFor(() => expect(state.report).toHaveBeenCalledTimes(1));
  fireEvent.click(educator); await screen.findByText("Educator now");
  await act(async () => old.resolve({...report("report-a"),content:currentPlans()}));
  expect(screen.queryByText("Family now")).toBeNull();
  expect(screen.getByRole("button",{name:"Educator Plan"}).getAttribute("aria-pressed")).toBe("true");
});

it("earlier status recovery requires explicit source, destination and confirmation and preserves the original", async () => {
  const [item] = await goalTrackerItems(report("report-a").content);
  state.statuses.mockResolvedValue({statuses:{"life:0":"met",[item.id]:"in-progress"}});
  render(<Page />); await screen.findByText("Review Earlier Progress");
  const apply = screen.getByRole("button",{name:"Apply Reviewed Progress"}); expect(apply.hasAttribute("disabled")).toBe(true);
  fireEvent.change(screen.getByLabelText("Earlier Entry"),{target:{value:"life:0"}});
  fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:item.id}});
  expect(apply.hasAttribute("disabled")).toBe(true); expect(state.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(apply);
  await screen.findByText(/The earlier entry is unchanged/);
  expect(state.save).toHaveBeenCalledExactlyOnceWith({data:{reportId:"report-a",itemId:item.id,status:"met"}});
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({"life:0":"met",[item.id]:"met"});
});
it("changing a reviewed destination clears confirmation before any write", async () => {
  state.report.mockResolvedValue({...report("report-a"),content:{life_skills_focus:["First current step","Second current step"]}});
  const items = await goalTrackerItems({life_skills_focus:["First current step","Second current step"]});
  state.statuses.mockResolvedValue({statuses:{"edu:0":"met"}});
  render(<Page />); await screen.findByText("Review Earlier Progress");
  fireEvent.change(screen.getByLabelText("Earlier Entry"),{target:{value:"edu:0"}});
  fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:items[0].id}}); fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:items[1].id}});
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole("button",{name:"Apply Reviewed Progress"}).hasAttribute("disabled")).toBe(true); expect(state.save).not.toHaveBeenCalled();
});
it.each(["success","failure"])("reviewed-copy %s after report departure cannot affect the next report", async mode => {
  const [item] = await goalTrackerItems(report("report-a").content); const pending = deferred();
  state.statuses.mockResolvedValueOnce({statuses:{"life:0":"met"}}); state.save.mockImplementationOnce(()=>pending.promise);
  render(<Page />); await screen.findByText("Review Earlier Progress");
  fireEvent.change(screen.getByLabelText("Earlier Entry"),{target:{value:"life:0"}}); fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:item.id}});
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button",{name:"Apply Reviewed Progress"}));
  fireEvent.click(screen.getByRole("button",{name:"Sample B"})); await screen.findByText("report-b recorded step");
  await act(async()=>{if(mode==="success")pending.resolve({ok:true});else pending.reject(new Error("Late error"));});
  expect(screen.queryByText(/The earlier entry is unchanged/)).toBeNull(); expect(state.toast).not.toHaveBeenCalled();
  expect(state.save.mock.calls[0][0].data.reportId).toBe("report-a");
});
it("failed reviewed copies use saved-progress recovery and never change the earlier entry", async () => {
  const [item] = await goalTrackerItems(report("report-a").content);
  state.statuses.mockResolvedValue({statuses:{"life:0":"met"}}); state.save.mockRejectedValueOnce(new Error("Unavailable"));
  render(<Page />); await screen.findByText("Review Earlier Progress");
  fireEvent.change(screen.getByLabelText("Earlier Entry"),{target:{value:"life:0"}});fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:item.id}});
  fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Apply Reviewed Progress"}));
  await screen.findByRole("button",{name:"Reload Saved Progress"});
  expect(JSON.parse(localStorage.getItem("tf:goal-status:report-a")!)).toEqual({"life:0":"met"});
  expect(screen.queryByText(/The earlier entry is unchanged/)).toBeNull();
});

it("a changed current status requires reviewing the copy again", async () => {
  const [item] = await goalTrackerItems(report("report-a").content);
  state.statuses.mockResolvedValue({statuses:{"life:0":"met"}});
  render(<Page />); await screen.findByText("Review Earlier Progress");
  fireEvent.change(screen.getByLabelText("Earlier Entry"),{target:{value:"life:0"}});
  fireEvent.change(screen.getByLabelText("Current Step"),{target:{value:item.id}}); fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button",{name:"In progress"}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"In progress"}).hasAttribute("disabled")).toBe(false));
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect(screen.getByRole("button",{name:"Apply Reviewed Progress"}).hasAttribute("disabled")).toBe(true);
  expect(state.save).toHaveBeenCalledTimes(1);
});
