import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Users, LineChart, CalendarClock, FileText, History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { PARTNER_OUTREACH_ACTIONS } from "@/lib/dashboard/partner-outreach-actions";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/partner")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Partner Opportunity Hub — TransitionForward" },
      { name: "description", content: "Publish opportunities and access PartnerForward supports — no student PII." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  return (
    <SiteShell>
      <HubShell hub={getHub("partner-opportunity")!} hideSpokes>
        <WorkspaceZone>
          <PartnerOverviewGrid />
        </WorkspaceZone>
        <DashboardSection
          eyebrow="Operations"
          title="Matches, Fit & Impact"
          description="Aggregate signals on your published opportunities — no student PII."
          gap="tight"
        >
          <DashboardRowList
            rows={[
              {
                icon: Briefcase,
                title: "Opportunity Matches",
                description: "How your published opportunities are matching student interest.",
                to: "/partners-manage/opportunities",
                status: "6 active",
                tone: "success",
              },
              {
                icon: Users,
                title: "Student Fit Summaries",
                description: "De-identified fit summaries from schools referring to your programs.",
                to: "/opportunities",
                status: "3 new",
                tone: "warn",
              },
              {
                icon: LineChart,
                title: "Impact & Outcomes",
                description: "Track referrals, engagement, and reported outcomes over time.",
                to: "/partners-manage/impact",
              },
              {
                icon: CalendarClock,
                title: "Deadlines",
                description: "Application windows, reporting deadlines, and outreach cycles.",
                to: "/partners-manage/deadlines",
              },
              {
                icon: FileText,
                title: "Partner Profile & Resources",
                description: "Your public profile and downloadable materials for schools.",
                to: "/partners-manage/profile",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="30 / 90 / 180 / 365-Day Outreach"
          description="The outreach and delivery moves that keep opportunities filled."
          gap="tight"
        >
          <NextStepsTimeline
            data={PARTNER_OUTREACH_ACTIONS}
            eyebrow="Partner 30 / 90 / 180 / 365-Day Outreach"
            title="Your Partner Next Actions"
            description="The outreach + delivery moves that keep opportunities filled, students supported, and outcomes reported."
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Progress Band"
          title="Stage Journey"
          description="Where your organization is on the PartnerForward journey."
          gap="tight"
        >
          <StageJourneyCard audience="partner" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
