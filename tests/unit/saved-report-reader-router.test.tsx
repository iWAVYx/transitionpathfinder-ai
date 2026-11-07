// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Outlet, RouterProvider, createBrowserHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";

const calls = vi.hoisted(() => ({ server: vi.fn(), get: vi.fn(), tokens: vi.fn(), students: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/ui-prefs.functions", () => ({ getReportViewerPrefs: {}, updateReportViewerPrefs: {} }));
vi.mock("@/lib/student-voice.functions", () => ({ getStudentVoiceResponses: {} }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/pathway/ConnectToPlan", () => ({ ConnectToPlan: () => null }));
vi.mock("@/components/pathway/ReportPartnerSuggestions", () => ({ ReportPartnerSuggestions: () => null }));
vi.mock("@/components/pathway/ReportPhase4Sections", () => ({ ReportPhase4Sections: () => null, getPhase4TocItems: () => [] }));
vi.mock("@/components/opportunities/OpportunityPipelineSummary", () => ({ OpportunityPipelineSummary: () => null }));
vi.mock("@/components/pathway/AiAssistPanel", () => ({ AiAssistPanel: () => null }));
vi.mock("@/components/withRoleGuard", () => ({ withRoleGuard: (_roles: unknown, component: unknown) => component }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/pathway/ReportChapterPager", () => ({ ReportChapterPager: () => null }));
vi.mock("@/components/pathway/report/PathwayReportLayout", () => ({ PathwayReportLayout: ({ children }: any) => children }));
vi.mock("@/components/pathway/ReportVersionsPanel", () => ({ ReportVersionsPanel: () => null }));
vi.mock("@/components/pathway/EvidenceUsedPanel", () => ({ EvidenceUsedPanel: () => null }));
vi.mock("@/lib/pathway.functions", () => ({ getReport: calls.get, linkReportToStudent: calls.server, regeneratePathwayReport: calls.server }));
vi.mock("@/lib/students.functions", () => ({ listShareTokens: calls.tokens, listStudents: calls.students, createShareToken: calls.server, revokeShareToken: calls.server }));
import { Route } from "@/routes/_authenticated/reports.$reportId";
import { DEMO_STUDENTS } from "@/lib/demo-data";

// Fictional read stubs exercise the real route/reader, not authentication or backend acceptance.
let history: ReturnType<typeof createBrowserHistory> | undefined;
beforeEach(() => {
  calls.server.mockReset().mockImplementation(() => { throw Error("Reader history fixture forbids mutations and generation"); });
  calls.get.mockReset().mockResolvedValue({ id:"sample-report", student_first_name:"Maya", student_id:null, created_at:"2026-10-22T12:00:00Z", report:DEMO_STUDENTS.maya.report });
  calls.tokens.mockReset().mockResolvedValue({ tokens:[] });
  calls.students.mockReset().mockResolvedValue({ students:[] });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); history?.destroy(); history = undefined; vi.restoreAllMocks(); window.history.replaceState(null, "", "/"); });
async function mount(audience: string) {
  window.history.replaceState(null, "", `/reports/sample-report?audience=${audience}`);
  const root = createRootRoute({ component: Outlet });
  const auth = createRoute({ getParentRoute: () => root, id:"_authenticated", component:Outlet });
  const report = createRoute({ getParentRoute: () => auth, path:"/reports/$reportId", component:Route.options.component, validateSearch:Route.options.validateSearch });
  history = createBrowserHistory();
  const router = createRouter({ routeTree:root.addChildren([auth.addChildren([report])]), history });
  await router.load(); render(<RouterProvider router={router} />); return router;
}
async function selected(audience: string) {
  await waitFor(() => expect(screen.getByRole("tab", {name:new RegExp(`^${audience}$`, "i")}).getAttribute("aria-selected")).toBe("true"));
  expect(screen.getByText(`${audience[0].toUpperCase()}${audience.slice(1)} Edition`)).toBeTruthy();
}
it.each(["family", "educator", "student"])("saved reader preserves %s audience through Back and Forward", async origin => {
  const router = await mount(origin); await selected(origin);
  const target = origin === "educator" ? "family" : "educator";
  fireEvent.click(screen.getByRole("tab", {name:new RegExp(`^${target}$`, "i")}));
  await waitFor(() => expect(router.state.location.search).toMatchObject({audience:target}));
  await selected(target);
  await act(async () => { router.history.back(); });
  await waitFor(() => expect(router.state.location.search).toMatchObject({audience:origin}));
  await selected(origin);
  await act(async () => { router.history.forward(); });
  await selected(target);
  expect(new URLSearchParams(window.location.search).get("audience")).toBe(target);
  expect(calls.get).toHaveBeenCalledTimes(1);
  expect(calls.server).not.toHaveBeenCalled();
});
