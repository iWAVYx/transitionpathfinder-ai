import type { ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  DASHBOARD_TESTID_CONTRACT_VERSION,
  dashboardTestIdForPath,
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
  const testId = dashboardTestId ?? dashboardTestIdForPath(location.pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="site-shell-main flex-1 focus:outline-none"
        style={{ minHeight: "60vh" }}
        data-dashboard-testid-contract={DASHBOARD_TESTID_CONTRACT_VERSION}
        data-testid={testId ?? undefined}
        data-dashboard-role={testId ?? undefined}
        data-auth-state="ready"
      >
        <DashboardMainLandmark pathname={location.pathname} />
        {children}
      </main>
      <SiteFooter />
    </div>
  );
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
