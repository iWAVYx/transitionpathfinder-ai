import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { LiveEducatorWorkspaceOverview } from "@/components/dashboard/LiveEducatorWorkspaceOverview";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";

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
      <HubShell hub={getHub("caseload-planning")!} hideSpokes>
        <WorkspaceZone>
          <LiveEducatorWorkspaceOverview />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Your Caseload Next Actions"
          description="Ranked by urgency — overdue and due-soon items surface first."
          gap="tight"
        >
          <NextActionCardServer
            historyRoute="/educator/history"
            title="Your Caseload Next Actions"
            eyebrow="What Needs Attention"
            description="The educator-owned actions that keep every Pathway Report defensible and every PPT on schedule."
            suggestionLabel="Open Caseload Roster"
            suggestionRoute="/caseload"
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Progress Band"
          title="Stage Journey"
          description="Where your caseload sits on the transition planning timeline."
          gap="tight"
        >
          <StageJourneyCard audience="educator" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
