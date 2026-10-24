// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
const calls = vi.hoisted(() => ({
  latest: vi.fn(),
  regenerate: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => calls.navigate,
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: { reportId?: string };
    children: ReactNode;
  }) => (
    <a href={params?.reportId ? to.replace("$reportId", params.reportId) : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/pathway.functions", () => ({
  getLatestReportForStudent: calls.latest,
  regeneratePathwayReport: calls.regenerate,
}));
vi.mock("sonner", () => ({ toast: { success: calls.success, error: calls.error } }));
import { PathwayReportCard } from "@/components/students/PathwayReportCard";
import { StudentPathwayReportPanel } from "@/components/students/StudentPathwayReportPanel";
const latest = (id = "report-a", ...ownership: unknown[]) => ({
  report: {
    id,
    created_at: "2026-10-23T12:00:00Z",
    summary: "Fictional report",
    content_revision: "a".repeat(64),
    is_report_owner: ownership.length ? ownership[0] : true,
  },
  loadFailed: false,
});
const card = (studentId = "student-a", canCreateReport = false) => (
  <PathwayReportCard
    studentId={studentId}
    studentFirstName={studentId}
    canCreateReport={canCreateReport}
  />
);
function deferred() {
  let resolve!: (value: any) => void, reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  calls.latest.mockResolvedValue(latest());
  calls.regenerate.mockResolvedValue({ version_number: 2 });
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it.each([false, undefined, null, "true"])(
  "non-owning or unconfirmed reader keeps Open but no Refresh (hint=%s)",
  async (hint) => {
    calls.latest.mockResolvedValue(latest("report-a", hint));
    render(card());
    expect(
      (await screen.findByRole("link", { name: "Open Pathway Report" })).getAttribute("href"),
    ).toBe("/reports/report-a");
    expect(screen.queryByRole("button", { name: "Refresh Pathway Report" })).toBeNull();
    expect(screen.getByText(/Only its creator can refresh/)).toBeTruthy();
    expect(calls.regenerate).not.toHaveBeenCalled();
  },
);
it("the report owner can refresh once and open the exact updated report", async () => {
  const pending = deferred();
  calls.regenerate.mockReturnValue(pending.promise);
  render(card());
  const button = await screen.findByRole("button", { name: "Refresh Pathway Report" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(calls.regenerate).toHaveBeenCalledExactlyOnceWith({ data: { report_id: "report-a", expected_revision: "a".repeat(64) } });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  await act(async () => pending.resolve({ version_number: 2 }));
  expect(calls.navigate).toHaveBeenCalledExactlyOnceWith({
    to: "/reports/$reportId",
    params: { reportId: "report-a" },
  });
  expect(calls.success).toHaveBeenCalledOnce();
});
it.each(["flag", "reject"])(
  "loading failure %s offers Retry instead of generating a duplicate report",
  async (mode) => {
    if (mode === "flag") calls.latest.mockResolvedValueOnce({ report: null, loadFailed: true });
    else calls.latest.mockRejectedValueOnce(new Error("Private backend detail"));
    render(card("student-a", true));
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "Generate Pathway Report" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Refresh Pathway Report" })).toBeNull();
    expect(document.body.textContent).not.toContain("Private backend detail");
    fireEvent.click(screen.getByRole("button", { name: "Reload Report" }));
    await screen.findByRole("link", { name: "Open Pathway Report" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls.latest).toHaveBeenCalledTimes(2);
    expect(calls.regenerate).not.toHaveBeenCalled();
  },
);
it.each([false, true])(
  "empty caller-visible result offers creation only with editing access (%s)",
  async (canCreate) => {
    calls.latest.mockResolvedValue({ report: null, loadFailed: false });
    render(card("student-a", canCreate));
    await screen.findByRole("link", { name: "View All Reports" });
    expect(!!screen.queryByRole("link", { name: "Generate Pathway Report" })).toBe(canCreate);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(calls.regenerate).not.toHaveBeenCalled();
  },
);
it("the enclosing panel defaults creation to read-only and forwards confirmed editing access", async () => {
  calls.latest.mockResolvedValue({ report: null, loadFailed: false });
  const view = render(
    <StudentPathwayReportPanel studentId="student-a" studentFirstName="Fictional" />,
  );
  await screen.findByRole("link", { name: "View All Reports" });
  expect(screen.queryByRole("link", { name: "Generate Pathway Report" })).toBeNull();
  view.rerender(
    <StudentPathwayReportPanel
      studentId="student-a"
      studentFirstName="Fictional"
      canCreateReport
    />,
  );
  expect(screen.getByRole("link", { name: "Generate Pathway Report" })).toBeTruthy();
});
it("changing students immediately removes the previous report actions and ignores its late result", async () => {
  const old = deferred();
  calls.latest.mockReturnValueOnce(old.promise).mockResolvedValueOnce(latest("report-b", false));
  const view = render(card());
  view.rerender(card("student-b"));
  await screen.findByRole("link", { name: "Open Pathway Report" });
  await act(async () => old.resolve(latest()));
  expect(screen.getByRole("link", { name: "Open Pathway Report" }).getAttribute("href")).toBe(
    "/reports/report-b",
  );
  expect(screen.queryByRole("button", { name: "Refresh Pathway Report" })).toBeNull();
});
it.each([false, true])(
  "leaving a student during refresh suppresses stale navigation and notification (failure=%s)",
  async (failure) => {
    const pending = deferred();
    calls.regenerate.mockReturnValue(pending.promise);
    const view = render(card());
    fireEvent.click(await screen.findByRole("button", { name: "Refresh Pathway Report" }));
    calls.latest.mockResolvedValue(latest("report-b", false));
    view.rerender(card("student-b"));
    await screen.findByRole("link", { name: "Open Pathway Report" });
    await act(async () => {
      if (failure) pending.reject(new Error("Old refresh failed"));
      else pending.resolve({ version_number: 2 });
    });
    expect(calls.navigate).not.toHaveBeenCalled();
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.error).not.toHaveBeenCalled();
  },
);
it("a rejected refresh stays on the report and can be retried", async () => {
  calls.regenerate.mockRejectedValueOnce(
    new Error("You don't have permission to regenerate this report."),
  );
  render(card());
  fireEvent.click(await screen.findByRole("button", { name: "Refresh Pathway Report" }));
  await screen.findByText(/Only|Created/);
  await act(async () => {});
  expect(calls.navigate).not.toHaveBeenCalled();
  expect(calls.error).toHaveBeenCalledWith("You don't have permission to regenerate this report.");
  fireEvent.click(screen.getByRole("button", { name: "Refresh Pathway Report" }));
  await act(async () => {});
  expect(calls.regenerate).toHaveBeenCalledTimes(2);
  expect(calls.navigate).toHaveBeenCalledOnce();
});

it("labels the returned creation date honestly rather than claiming a last-edit date", async () => {
  render(card());
  await screen.findByRole("link", { name: "Open Pathway Report" });
  expect(screen.getByText(/Created/)).toBeTruthy();
  expect(screen.queryByText(/Last updated/)).toBeNull();
});

it("a cached student report card without a revision cannot start generation", async () => {
  const response = latest(); response.report.content_revision = undefined as any;
  calls.latest.mockResolvedValue(response); render(card());
  fireEvent.click(await screen.findByRole("button", { name: "Refresh Pathway Report" }));
  expect(calls.regenerate).not.toHaveBeenCalled(); expect(calls.navigate).not.toHaveBeenCalled();
  expect(calls.error).toHaveBeenCalledWith("Reload this page before refreshing the report.");
});
