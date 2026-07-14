import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, ClipboardList, Users2, BarChart3, CalendarDays } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { SchoolAdminOverviewGrid } from "@/components/dashboard/role/SchoolAdminOverviewGrid";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/school")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "School Implementation Hub — TransitionForward" },
      { name: "description", content: "School-level oversight, team coordination, and implementation tools." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("school-implementation")!} hideSpokes>
        <WorkspaceZone>
          <SchoolAdminOverviewGrid />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Operations"
          title="Compliance, Team & Reports"
          description="Building-level readiness — jump straight to what needs attention."
          gap="tight"
        >
          <DashboardRowList
            rows={[
              {
                icon: ShieldCheck,
                title: "Indicator 13 Compliance",
                description: "Compliance rollup across the building, with files pending sign-off.",
                to: "/school/overview",
                status: "94% · on target",
                tone: "success",
              },
              {
                icon: ClipboardList,
                title: "Transition Evidence Coverage",
                description: "Which students have current transition assessments and evidence on file.",
                to: "/school/reports",
                status: "12 need re-eval",
                tone: "warn",
              },
              {
                icon: Users2,
                title: "Team & Caseload Rollups",
                description: "Educator caseloads, coverage, and shared students in one view.",
                to: "/school/team",
              },
              {
                icon: BarChart3,
                title: "Readiness Trends",
                description: "How postsecondary readiness signals are trending across grade bands.",
                to: "/school/readiness-trends",
              },
              {
                icon: CalendarDays,
                title: "Implementation Calendar",
                description: "Rollout milestones, family outreach windows, and PPT cycles.",
                to: "/school/calendar",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Stage Journey"
          description="Where your building is on the implementation timeline."
          gap="tight"
        >
          <StageJourneyCard audience="school_admin" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
