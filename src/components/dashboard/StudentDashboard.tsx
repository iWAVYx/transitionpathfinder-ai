import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { Button } from "@/components/ui/button";
import { toTitleCase } from "@/lib/title-case";
import type { DashboardSnapshot } from "@/lib/golden-path.functions";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { LiveStudentWorkspaceOverview } from "@/components/dashboard/LiveStudentWorkspaceOverview";
import { ROLE_DASHBOARD_TEST_IDS } from "@/lib/dashboard-testids";

type Props = {
  firstName: string;
  snap: DashboardSnapshot;
  onReconnect?: () => void;
};

export function StudentDashboard({ firstName, snap, onReconnect }: Props) {
  const s = snap.student;
  if (!s) {
    return (
      <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.student}>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 lg:px-8">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary"
            data-dashboard-landmark="student"
          >
            Next Best Step — Student Dashboard
          </p>
          <Breadcrumbs trail={[{ label: "My plan" }]} />
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome, {toTitleCase(firstName)}.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-foreground/75 sm:text-lg">
            This account controls your own transition plan. We could not finish connecting the
            student profile to your dashboard yet, but you do not{" "}
            {"need to be added as a collaborator."}
          </p>
          <div className="mt-8 border-y border-border/70 py-5">
            <h2 className="font-display text-xl">Next Best Step</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-foreground/75">
              <li>Reconnect your student profile below.</li>
              <li>Refresh once the connection completes.</li>
              <li>Your goals, meetings, documents, and action items will appear here.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={onReconnect} disabled={!onReconnect}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reconnect My Profile
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/help">Get help</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/settings">Account settings</Link>
              </Button>
            </div>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell dashboardTestId={ROLE_DASHBOARD_TEST_IDS.student}>
      <div className="demo-shell">
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          <p className="tf-eyebrow" data-dashboard-landmark="student">
            Next Best Step · Student Dashboard
          </p>
          <Breadcrumbs trail={[{ label: "My plan" }]} />
          <RoleValueStrip role="student" className="mt-4" />

          <div className="mt-6">
            <LiveStudentWorkspaceOverview snapshot={snap} />
            <DashboardWidgetBoard role="student" studentId={s.id} />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
