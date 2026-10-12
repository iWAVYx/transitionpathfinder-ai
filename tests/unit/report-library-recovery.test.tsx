// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ list: vi.fn(), del: vi.fn(), role: "family" }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/lib/pathway.functions", () => ({ listMyReports: state.list, deleteReport: state.del }));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: any) => ({ options }),
  useChildMatches: () => false, useRouter: () => ({ navigate: vi.fn() }), Outlet: () => null,
  Link: ({ to, params, children, ...props }: any) => <a href={to.replace("$reportId", params?.reportId ?? "")} {...props}>{children}</a>,
}));
vi.mock("@/components/RoleGuard", () => ({ RoleGuard: ({ children }: any) => <div data-role={state.role}>{children}</div> }));
vi.mock("@/components/site/SiteShell", () => ({ SiteShell: ({ children }: any) => <main>{children}</main> }));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
import { Route } from "@/routes/_authenticated/reports";
const Page = (Route as any).options.component;
const row = { id: "fictional-report", created_at: "2026-10-12T12:00:00Z", student_first_name: "Sample Student", grade_band: "12", summary: "Saved example plan", student_id: "fictional-student", linked_student_name: "Sample Student" };
beforeEach(() => { state.list.mockReset(); state.del.mockReset(); localStorage.clear(); });
afterEach(cleanup);
it.each(["family", "educator", "student"])("%s library distinguishes a failed read and recovers its saved rows", async role => {
  state.role = role;
  state.list.mockResolvedValueOnce({ reports: [], loadFailed: true }).mockResolvedValueOnce({ reports: [row], loadFailed: false });
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByText(/No reports yet/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reload Reports" }));
  await screen.findByText("Saved example plan");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.getByRole("link", { name: /Saved example plan/ }).getAttribute("href")).toBe("/reports/fictional-report");
  expect(state.del).not.toHaveBeenCalled();
});
it("rejected reads recover to a genuinely empty library", async () => {
  state.list.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ reports: [], loadFailed: false });
  render(<Page />); await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Reload Reports" }));
  await screen.findByText(/No reports yet/); expect(screen.queryByRole("alert")).toBeNull();
});
it("a pending retry cannot populate a departed library instance", async () => {
  let resolve!: (value: any) => void;
  state.list.mockResolvedValueOnce({ reports: [], loadFailed: true }).mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce({ reports: [], loadFailed: false });
  const first = render(<Page />); await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Reload Reports" }));
  await waitFor(() => expect(state.list).toHaveBeenCalledTimes(2));
  first.unmount(); render(<Page />); await screen.findByText(/No reports yet/);
  resolve({ reports: [row], loadFailed: false });
  await waitFor(() => expect(screen.queryByText("Saved example plan")).toBeNull());
});
