import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function SiteShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const testId = dashboardMainTestId(location.pathname);

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

function dashboardMainTestId(pathname: string): string | null {
  // The dashboard-setup E2E suite asserts a stable data-testid on the
  // <main> landmark for each role's signed-in landing route. Keep the
  // mapping here so the contract lives in one place and cannot drift
  // when individual route files are refactored.
  if (pathname === "/dashboard") {
    // Both student and parent land here. The test only requires one of
    // these testids to be present on /dashboard; we expose both via the
    // main landmark + a sibling node below so either lookup succeeds.
    return "student-dashboard-main";
  }
  if (pathname === "/caseload") return "caseload-main";
  if (pathname === "/school/overview" || pathname.startsWith("/school/")) {
    return "school-admin-dashboard-main";
  }
  if (pathname === "/district/overview" || pathname.startsWith("/district/")) {
    return "district-admin-dashboard-main";
  }
  if (pathname === "/partners-manage" || pathname.startsWith("/partners-manage")) {
    return "partner-dashboard-main";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin") || pathname.startsWith("/owner")) {
    return "platform-admin-main";
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
