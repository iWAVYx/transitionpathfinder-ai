/**
 * Regression guard for the student `/dashboard` render contract.
 *
 * A student viewer MUST always get `<main data-testid="student-dashboard-main">`
 * on `/dashboard` — even during loading, when their team hasn't added them
 * yet, when snapshot data is missing, or when a child component throws.
 *
 * We check the source directly (see tests/unit/dashboard-static.test.ts for
 * the same style) because rendering the real route outside the router
 * requires a full TanStack context. The Playwright role-access suite is the
 * live verification; this file catches regressions before the deploy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("student /dashboard render contract", () => {
  const dashboard = read("src/routes/_authenticated/dashboard.tsx");
  const authenticatedLayout = read("src/routes/_authenticated.tsx");
  const rootRoute = read("src/routes/__root.tsx");
  const login = read("src/routes/login.index.tsx");
  const demoWorkspace = read("src/routes/demo_.workspace.$stage.tsx");
  const demoReport = read("src/routes/demo_.report.tsx");
  const studioShell = read("src/studio/StudioShell.tsx");
  const studentDash = read("src/components/dashboard/StudentDashboard.tsx");
  const siteShell = read("src/components/site/SiteShell.tsx");

  it("dashboard route wraps DashboardPage in a DashboardErrorBoundary", () => {
    expect(dashboard).toMatch(/class DashboardErrorBoundary/);
    expect(dashboard).toMatch(/<DashboardErrorBoundary>\s*<DashboardPage\s*\/>/);
  });

  it("error fallback shell mounts a SiteShell so <main> is always attached", () => {
    expect(dashboard).toMatch(/function DashboardErrorShell/);
    expect(dashboard).toMatch(/DashboardErrorShell[\s\S]*?<SiteShell\s+dashboardTestId=/);
  });

  it("renders StudentDashboard for a student viewer BEFORE the generic loading / empty branches", () => {
    // The student return must appear before the `!loading && students.length === 0`
    // (parent-empty) branch — otherwise a student with no team-added student row
    // renders as parent and the setup probe never sees student-dashboard-main.
    const studentIdx = dashboard.indexOf("treatAsStudent");
    const parentEmptyIdx = dashboard.indexOf("students.length === 0");
    expect(studentIdx, "treatAsStudent branch must exist").toBeGreaterThan(-1);
    expect(parentEmptyIdx, "parent empty branch must exist").toBeGreaterThan(-1);
    expect(studentIdx).toBeLessThan(parentEmptyIdx);
  });

  it("treatAsStudent honors both isStudentOnly and the dashboard hint", () => {
    expect(dashboard).toMatch(/isStudentOnly === true/);
    expect(dashboard).toMatch(/hintedDashboardTestId === ROLE_DASHBOARD_TEST_IDS\.student/);
  });

  it("uses EMPTY_STUDENT_SNAPSHOT so StudentDashboard renders even without data", () => {
    expect(dashboard).toMatch(/const EMPTY_STUDENT_SNAPSHOT/);
    expect(dashboard).toMatch(/snap \?\? EMPTY_STUDENT_SNAPSHOT/);
  });

  it("StudentDashboard's no-student branch still renders <SiteShell> with the student test id", () => {
    // The `if (!s)` branch must be wrapped in SiteShell so <main data-testid="student-dashboard-main"> exists.
    const noStudentBlock = studentDash.slice(studentDash.indexOf("if (!s)"));
    expect(noStudentBlock).toMatch(/<SiteShell\s+dashboardTestId=\{ROLE_DASHBOARD_TEST_IDS\.student\}/);
  });

  it("SiteShell always attaches a <main> element in the DOM", () => {
    // Guard the invariant the Playwright probe depends on.
    expect(siteShell).toMatch(/<main\b[\s\S]*data-testid=/);
    expect(siteShell).toMatch(/DASHBOARD_TESTID_CONTRACT_VERSION/);
  });

  it("authenticated route pending state still attaches a dashboard <main>", () => {
    expect(authenticatedLayout).toMatch(/pendingComponent:\s*AuthenticatedPendingShell/);
    expect(authenticatedLayout).toMatch(/function AuthenticatedPendingShell/);
    expect(authenticatedLayout).toMatch(/data-auth-state="route-pending"/);
    expect(authenticatedLayout).toMatch(/dashboardShellTestId/);
    expect(authenticatedLayout).toMatch(/data-testid=\{testId \?\? undefined\}/);
  });

  it("login stores the student dashboard hint before redirecting", () => {
    expect(login).toMatch(/rememberDashboardHintFromEmail/);
    expect(login).toMatch(/tf:e2e-dashboard-testid/);
    expect(login).toMatch(/dashboardTestIdForDashboardHint\(email\)/);
    expect(login).toMatch(/rememberDashboardHintFromEmail\(values\.email\)[\s\S]*navigate\(\{ to: redirect/);
  });

  it("root error boundary still renders a dashboard-safe <main>", () => {
    expect(rootRoute).toMatch(/function ErrorComponent/);
    expect(rootRoute).toMatch(/<main\b[\s\S]*data-dashboard-testid-contract=/);
    expect(rootRoute).toMatch(/data-testid=\{dashboardTestId \?\? undefined\}/);
    expect(rootRoute).toMatch(/ROLE_DASHBOARD_TEST_IDS\.student/);
  });

  it("demo workspace and report entry points have safe shells without profile data", () => {
    expect(demoWorkspace).toMatch(/createFileRoute\("\/demo_\/workspace\/\$stage"\)/);
    expect(demoWorkspace).toMatch(/stageParam\.parse\(raw\.stage\)/);
    expect(demoWorkspace).toMatch(/<SiteShell>/);
    // The legacy /demo/report URL now renders the role-aware Pathway Report
    // inline inside a SiteShell — still no redirect, still a safe shell.
    expect(demoReport).toMatch(/createFileRoute\("\/demo_\/report"\)/);
    expect(demoReport).toMatch(/<SiteShell>/);
    expect(demoReport).toMatch(/<PathwayReport\b/);
    expect(demoReport).not.toMatch(/\bredirect\(/);

    expect(studioShell).toMatch(/<main className="tf-studio-canvas"/);
  });
});
