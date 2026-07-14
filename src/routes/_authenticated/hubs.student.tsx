import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { StudentOverviewGrid } from "@/components/dashboard/role/StudentOverviewGrid";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/student")({
  beforeLoad: () => ensureRoleAccess(["student", "admin"]),
  head: () => ({
    meta: [
      { title: "Student Planning Hub — TransitionForward" },
      { name: "description", content: "Your space to share your voice, track your goals, prep for meetings, and see your Pathway Report." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("student-planning")!} hideSpokes>
        <WorkspaceZone>
          <StudentOverviewGrid />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Stage Journey"
          description="Where you are on the transition timeline and what comes next."
        >
          <StageJourneyCard audience="student" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
