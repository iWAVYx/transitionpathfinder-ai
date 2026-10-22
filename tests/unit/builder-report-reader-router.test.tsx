// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Outlet, RouterProvider, createBrowserHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

const calls = vi.hoisted(() => ({ server: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => calls.server }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/ui-prefs.functions", () => ({ getReportViewerPrefs: {}, updateReportViewerPrefs: {} }));
vi.mock("@/lib/student-voice.functions", () => ({ getStudentVoiceResponses: {} }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/pathway/ConnectToPlan", () => ({ ConnectToPlan: () => null }));
vi.mock("@/components/pathway/ReportPartnerSuggestions", () => ({ ReportPartnerSuggestions: () => null }));
vi.mock("@/components/pathway/ReportPhase4Sections", () => ({ ReportPhase4Sections: () => null, getPhase4TocItems: () => [] }));
vi.mock("@/components/opportunities/OpportunityPipelineSummary", () => ({ OpportunityPipelineSummary: () => null }));
vi.mock("@/components/pathway/AiAssistPanel", () => ({ AiAssistPanel: () => null }));
import { Route } from "@/routes/demo_.report";
import { ReportView } from "@/components/pathway/ReportView";
import { DEMO_STUDENTS } from "@/lib/demo-data";

let history: ReturnType<typeof createBrowserHistory> | undefined;
beforeEach(() => {
  calls.server.mockReset().mockImplementation(() => { throw Error("Reader routing fixture forbids server calls"); });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); history?.destroy(); history = undefined; vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });
async function mount(url: string) {
  window.history.replaceState(null, "", url);
  const root = createRootRoute({ component: Outlet });
  const report = createRoute({ getParentRoute: () => root, path: "/demo/report", component: Route.options.component });
  history = createBrowserHistory();
  const router = createRouter({ routeTree: root.addChildren([report]), history });
  await router.load(); render(<RouterProvider router={router} />); return router;
}
async function selected(audience: string) {
  await waitFor(() => expect(screen.getByRole("tab", {name: new RegExp(`^${audience}$`, "i")}).getAttribute("aria-selected")).toBe("true"));
}
it.each(["family", "educator"])("actual prepared reader follows one-click lenses from %s", async origin => {
  const router = await mount(`/demo/report?example=builder&role=${origin}&view=${origin}`);
  await selected(origin);
  let builder = origin;
  for (const target of [origin === "family" ? "educator" : "family", "student", origin]) {
    fireEvent.click(screen.getByRole("tab", {name: new RegExp(`^${target}$`, "i")}));
    if (target !== "student") builder = target;
    await waitFor(() => expect(router.state.location.search).toMatchObject({view: target, role: builder}));
    await selected(target);
    expect(new URLSearchParams(window.location.search).get("view")).toBe(target);
  }
  await act(async () => { router.history.back(); }); await selected("student");
  await act(async () => { router.history.forward(); }); await selected(origin);
  expect(calls.server).not.toHaveBeenCalled();
});
it.each(["family", "educator"])("actual Student reader survives a direct URL from %s", async origin => {
  await mount(`/demo/report?example=builder&role=${origin}&view=student`);
  await selected("student");
  expect(screen.getByRole("link", {name:/Back to Pathway Builder/}).getAttribute("href")).toContain(`role=${origin}`);
  expect(calls.server).not.toHaveBeenCalled();
});


it.each(["student", "family", "educator"] as const)("a fixed %s share cannot be overridden by a controlled view", fixed => {
  const other = fixed === "family" ? "educator" : "family";
  window.history.replaceState(null, "", `/report?view=${other}`);
  render(<ReportView name="Maya" report={DEMO_STUDENTS.maya.report} demo readOnly fixedAudience={fixed} controlledAudience={other} />);
  expect(screen.queryByRole("tablist", {name:"Choose a report view"})).toBeNull();
  expect(screen.getByText(`${fixed[0].toUpperCase()}${fixed.slice(1)} Edition`)).toBeTruthy();
  expect(calls.server).not.toHaveBeenCalled();
});
it("an ordinary reader retains interactive audience selection", () => {
  render(<ReportView name="Maya" report={DEMO_STUDENTS.maya.report} demo initialAudience="family" />);
  fireEvent.click(screen.getByRole("tab", {name:/^educator$/i}));
  expect(screen.getByRole("tab", {name:/^educator$/i}).getAttribute("aria-selected")).toBe("true");
  expect(new URLSearchParams(window.location.search).get("view")).toBe("educator");
  expect(calls.server).not.toHaveBeenCalled();
});
it("an unsupported controlled audience falls through safely", () => {
  render(<ReportView name="Maya" report={DEMO_STUDENTS.maya.report} demo initialAudience="family" controlledAudience={"partner" as any} />);
  expect(screen.getByRole("tab", {name:/^family$/i}).getAttribute("aria-selected")).toBe("true");
  expect(screen.queryByRole("tab", {name:/^partner$/i})).toBeNull();
});
it.each(["family", "educator"])("actual Student reader survives optional-detail round trip from %s", async origin => {
  const router = await mount(`/demo/report?example=builder&role=${origin}&view=student`);
  await selected("student");
  fireEvent.click(screen.getByRole("link", {name:"See Sample Plan Details and Review Notes"}));
  await screen.findByRole("heading", {name:"Sample Plan Details and Review Notes"});
  expect(router.state.location.search).toMatchObject({role:origin, view:"student"});
  fireEvent.click(screen.getByRole("link", {name:/Back to Sample Pathway Report/}));
  await selected("student");
  expect(screen.getByRole("link", {name:/Back to Pathway Builder/}).getAttribute("href")).toContain(`role=${origin}`);
  expect(calls.server).not.toHaveBeenCalled();
});
