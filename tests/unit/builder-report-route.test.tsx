// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter, useRouterState } from "@tanstack/react-router";
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => children }));
vi.mock("@/components/pathway/ReportView", () => ({ ReportView: ({ onAudienceChange, initialAudience }: any) => {
  const search = useRouterState({ select: state => state.location.search }) as Record<string, string>;
  return <article><h1>Sample Product Report</h1><p>Report view: {search.view ?? initialAudience}</p>{["family", "educator", "student"].map(role => <button key={role} onClick={() => onAudienceChange(role)}>{role} report view</button>)}</article>;
} }));
import { Route } from "@/routes/demo_.report";
afterEach(cleanup);
async function mount(path: string) {
  const root = createRootRoute({ component: Outlet });
  const report = createRoute({ getParentRoute: () => root, path: "/demo/report", component: Route.options.component });
  const intake = createRoute({ getParentRoute: () => root, path: "/demo/intake", component: () => {
    const role = useRouterState({ select: state => (state.location.search as Record<string, string>).role });
    return <h1>Builder role: {role}</h1>;
  } });
  const router = createRouter({ routeTree: root.addChildren([report, intake]), history: createMemoryHistory({ initialEntries: [path] }) });
  await router.load(); render(<RouterProvider router={router} />); return router;
}
it.each(["family", "educator"])("keeps real router handoff and Back history eligible from %s", async origin => {
  const next = origin === "family" ? "educator" : "family";
  const router = await mount(`/demo/report?example=builder&role=${origin}`);
  fireEvent.click(await screen.findByRole("button", { name: `${next} report view` }));
  await screen.findByText(`Report view: ${next}`);
  expect(router.state.location.search).toMatchObject({ example: "builder", role: next, view: next });
  fireEvent.click(screen.getByRole("button", { name: "student report view" })); await screen.findByText("Report view: student");
  expect(router.state.location.search).toMatchObject({ example: "builder", role: next, view: "student" });
  fireEvent.click(screen.getByRole("link", { name: /Back to Pathway Builder/ }));
  await screen.findByRole("heading", { name: `Builder role: ${next}` });
  await act(async () => { router.history.back(); });
  await screen.findByText("Report view: student");
  expect(screen.getByRole("link", { name: /Back to Pathway Builder/ }).getAttribute("href")).toContain(`role=${next}`);
});
it.each([
  ["role=family&view=educator", "educator"],
  ["role=educator&view=family", "family"],
  ["role=educator&view=student", "educator"],
  ["role=family&audience=educator", "educator"],
  ["role=owner&view=partner", "family"],
])("a direct prepared report URL retains an eligible builder return: %s", async (query, expected) => {
  await mount(`/demo/report?example=builder&${query}`);
  const link = await screen.findByRole("link", { name: /Back to Pathway Builder/ });
  expect(link.getAttribute("href")).toContain(`role=${expected}`);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByText(/does not reflect your edits/)).toBeTruthy();
});
it.each(["family", "educator"])("prepared report opens the optional example and returns with eligible origin %s", async origin => {
  const router = await mount(`/demo/report?example=builder&role=${origin}`);
  fireEvent.click(await screen.findByRole("link", { name: "See Sample Plan Details and Review Notes" }));
  await screen.findByRole("heading", { name: "Sample Plan Details and Review Notes" });
  expect(router.state.location.search).toMatchObject({ example: "plan-details", role: origin, view: origin });
  fireEvent.click(screen.getByRole("button", { name: "Student", exact: true }));
  await act(async () => {}); expect(router.state.location.search).toMatchObject({ role: origin, view: "student" });
  fireEvent.click(screen.getByRole("link", { name: /Back to Sample Pathway Report/ }));
  await screen.findByText("Report view: student");
  expect(router.state.location.search).toMatchObject({ example: "builder", role: origin, view: "student" });
});
it("unsupported optional preview URL roles do not become selectable views", async () => {
  await mount("/demo/report?example=plan-details&role=owner&view=partner");
  await screen.findByRole("heading", { name: "Sample Plan Details and Review Notes" });
  expect(screen.getByRole("button", { name: "Family", exact: true }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.queryByRole("button", { name: "Owner", exact: true })).toBeNull();
  expect(screen.queryByRole("button", { name: "Partner", exact: true })).toBeNull();
});

it.each(["family", "educator"])("Student optional-detail round trip preserves %s builder eligibility", async origin => {
  const router = await mount(`/demo/report?example=builder&role=${origin}&view=student`);
  fireEvent.click(await screen.findByRole("link", { name: "See Sample Plan Details and Review Notes" }));
  await screen.findByRole("heading", { name: "Sample Plan Details and Review Notes" });
  expect(router.state.location.search).toMatchObject({ example: "plan-details", role: origin, view: "student" });
  expect(screen.getByRole("button", { name: "Student", exact: true }).getAttribute("aria-pressed")).toBe("true");
  fireEvent.click(screen.getByRole("link", { name: /Back to Sample Pathway Report/ }));
  await screen.findByText("Report view: student");
  expect(screen.getByRole("link", { name: "See Sample Plan Details and Review Notes" }).getAttribute("href")).toContain("view=student");
  expect(screen.getByRole("link", { name: /Back to Pathway Builder/ }).getAttribute("href")).toContain(`role=${origin}`);
});
