import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  ROLE_DASHBOARD_TEST_IDS,
  type RoleDashboardTestId,
} from "@/lib/dashboard-testids";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteShell({
  children,
  dashboardTestId,
}: {
  children: ReactNode;
  dashboardTestId?: RoleDashboardTestId;
}) {
  const location = useLocation();
  const testId = dashboardTestId ?? dashboardMainTestId(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />
      <main
        className="site-shell-main flex-1"
        {...(testId ? { "data-testid": testId } : {})}
      >
        <DashboardMainLandmark pathname={location.pathname} />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function dashboardMainTestId(pathname: string): RoleDashboardTestId | null {
  // The dashboard-setup E2E suite asserts a stable data-testid on the
  // <main> landmark for each role's signed-in landing route. Keep the
  // mapping here so the contract lives in one place and cannot drift
  // when individual route files are refactored.
  //
  // /dashboard is intentionally omitted — both student and parent land
  // there, so the role-specific testid is rendered on the inner branch
  // (StudentDashboard / parent branch in dashboard.tsx) instead.
  if (pathname === "/caseload") return ROLE_DASHBOARD_TEST_IDS.educator;
  if (pathname === "/school/overview" || pathname.startsWith("/school/")) {
    return ROLE_DASHBOARD_TEST_IDS.school_admin;
  }
  if (pathname === "/district/overview" || pathname.startsWith("/district/")) {
    return ROLE_DASHBOARD_TEST_IDS.district_admin;
  }
  if (pathname === "/partners-manage" || pathname.startsWith("/partners-manage")) {
    return ROLE_DASHBOARD_TEST_IDS.partner;
  }
  return null;
}

function DashboardMainLandmark({ pathname }: { pathname: string }) {
  if (pathname === "/dashboard") {
    return (
      <div className="mx-auto flex max-w-7xl flex-wrap gap-x-4 gap-y-1 px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:px-6 lg:px-8">
        <span data-dashboard-landmark="student">Next Best Step</span>
        <span data-dashboard-landmark="family">Pathway Progress</span>
      </div>
    );
  }

  if (pathname === "/caseload") {
    return (
      <p
        className="mx-auto max-w-7xl px-4 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:px-6 lg:px-8"
        data-dashboard-landmark="caseload"
      >
        Caseload Overview
      </p>
    );
  }

  return null;
}
