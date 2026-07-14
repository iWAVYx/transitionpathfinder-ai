import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, AlertTriangle, ListChecks, CalendarClock, Users2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { EducatorOverviewGrid } from "@/components/dashboard/role/EducatorOverviewGrid";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { EDUCATOR_NEXT_ACTIONS } from "@/lib/dashboard/educator-next-actions";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/caseload")({
  beforeLoad: () => ensureRoleAccess(["educator", "admin"]),
  head: () => ({
    meta: [
      { title: "Caseload Planning Hub — TransitionForward" },
      { name: "description", content: "Caseload tools, document review, and Pathway Report workflows for special educators." },
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
          <EducatorOverviewGrid />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Operations"
          title="Priority Reviews & Gaps"
          description="What needs your attention across the caseload — click through for full detail."
          gap="tight"
        >
          <DashboardRowList
            rows={[
              {
                icon: FileSearch,
                title: "Evidence Review Queue",
                description: "Files awaiting your sign-off before they feed the Pathway Report.",
                to: "/educator/document-review",
                status: "8 in queue",
                tone: "warn",
              },
              {
                icon: AlertTriangle,
                title: "Data Gaps",
                description: "Missing inputs blocking defensible Indicator 13 documentation.",
                to: "/educator/readiness-gaps",
                status: "5 flagged",
                tone: "risk",
              },
              {
                icon: ListChecks,
                title: "Action Items",
                description: "The next educator-owned actions across your caseload.",
                to: "/educator/action-items",
              },
              {
                icon: CalendarClock,
                title: "Meeting Queue",
                description: "Upcoming PPTs and prep windows for the next 30 days.",
                to: "/meetings",
              },
              {
                icon: Users2,
                title: "Caseload Roster",
                description: "Full student list with status, plan dates, and shared team members.",
                to: "/caseload",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="30 / 90 / 180 / 365-Day Plan"
          description="Educator-owned actions that keep every Pathway Report defensible."
          gap="tight"
        >
          <NextStepsTimeline
            data={EDUCATOR_NEXT_ACTIONS}
            eyebrow="Educator 30 / 90 / 180 / 365-Day Plan"
            title="Your Caseload Next Actions"
            description="The educator-owned actions that keep every Pathway Report defensible and every PPT on schedule."
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
