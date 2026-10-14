// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: any) => <span>{children}</span> }));
vi.mock("@/components/site/SiteShell", () => ({
  SiteShell: ({ children, dashboardTestId }: any) => (
    <main data-testid={dashboardTestId}>{children}</main>
  ),
}));
vi.mock("@/components/site/Breadcrumbs", () => ({ Breadcrumbs: () => null }));
vi.mock("@/components/value/RoleValueStrip", () => ({ RoleValueStrip: () => null }));
vi.mock("@/components/dashboard/DashboardWidgetBoard", () => ({
  DashboardWidgetBoard: () => <p>Accepted Widgets</p>,
}));
vi.mock("@/components/dashboard/LiveStudentWorkspaceOverview", () => ({
  LiveStudentWorkspaceOverview: () => <p>Accepted Snapshot</p>,
}));
import { StudentDashboard } from "@/components/dashboard/StudentDashboard";
import { readFileSync } from "node:fs";
const snapshot: any = { student: { id: "old" } };
afterEach(cleanup);
it("shows loading rather than a missing connection or stale snapshot", () => {
  render(<StudentDashboard firstName="Sample" snap={snapshot} loading />);
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByText("Accepted Snapshot")).toBeNull();
  expect(screen.queryByText("Reconnect My Profile")).toBeNull();
  expect(screen.queryByText("Accepted Widgets")).toBeNull();
});
it("shows read failure and explicit retry without exposing error details", () => {
  const retry = vi.fn();
  render(
    <StudentDashboard
      firstName="Sample"
      snap={snapshot}
      error="PRIVATE backend detail"
      onReconnect={retry}
    />,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Accepted Snapshot")).toBeNull();
  expect(screen.queryByText("PRIVATE backend detail")).toBeNull();
  expect(screen.queryByText("Reconnect My Profile")).toBeNull();
  fireEvent.click(screen.getByText("Try Again"));
  expect(retry).toHaveBeenCalledOnce();
});
it("keeps a legitimate missing profile separate from loading/failure", () => {
  render(<StudentDashboard firstName="Sample" snap={{ student: null } as any} />);
  expect(screen.getByText("Reconnect My Profile")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
it("keeps initial Student read errors separate from profile reconnect", () => {
  render(<StudentDashboard firstName="Sample" snap={{ student: null } as any} error="failed" />);
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Reconnect My Profile")).toBeNull();
});
it("passes read state before the Student render branch and guards Family emptiness and setup reads", () => {
  const main = readFileSync("src/routes/_authenticated/dashboard.tsx", "utf8");
  const family = readFileSync("src/routes/_authenticated/hubs.family.tsx", "utf8");
  expect(main).toContain("loading={loading}");
  expect(main).toContain("error={loadError}");
  expect(main).toContain("!loading && !loadError && students.length === 0");
  expect(main).toContain("if (loadError)");
  const reload = main.slice(
    main.indexOf("let list = await fetchStudents()"),
    main.indexOf("const studentList = list.students"),
  );
  expect(reload.indexOf("if (list.loadFailed)")).toBeLessThan(
    reload.indexOf("await ensureStudentProfile()"),
  );
  expect(reload.match(/if \(list.loadFailed\)/g)).toHaveLength(2);
  expect(family.indexOf("if (studentResult.loadFailed)")).toBeLessThan(
    family.indexOf("const studentId = studentResult.students[0]?.id"),
  );
});
