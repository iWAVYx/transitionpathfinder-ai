import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, AlertTriangle, ListChecks, CalendarClock, Users2, History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { EducatorOverviewGrid } from "@/components/dashboard/role/EducatorOverviewGrid";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { DEMO_NEXT_ACTIONS, DEMO_RECENTLY_COMPLETED } from "@/lib/next-actions/demo-fixtures";
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
              {
                icon: History,
                title: "Records & Access History",
                description: "Per-student audit trail of document access, uploads, sharing changes, and plan edits.",
                to: "/educator/history",
              },
            ]}
          />
        </DashboardSection>
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
