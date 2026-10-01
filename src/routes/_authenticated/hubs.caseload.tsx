import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { LiveEducatorWorkspaceOverview } from "@/components/dashboard/LiveEducatorWorkspaceOverview";
import { DashboardWidgetBoard } from "@/components/dashboard/DashboardWidgetBoard";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/caseload")({
  beforeLoad: () => ensureRoleAccess(["educator", "admin"]),
  head: () => ({
    meta: [
      { title: "Caseload Planning Hub — TransitionForward" },
      {
        name: "description",
        content:
          "Caseload tools, document review, and Pathway Report workflows for special educators.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("caseload-planning")!} hideSpokes hideRelatedLinks>
        <WorkspaceZone>
          <LiveEducatorWorkspaceOverview />
          <DashboardWidgetBoard role="educator" />
        </WorkspaceZone>
      </HubShell>
    </SiteShell>
  );
}
