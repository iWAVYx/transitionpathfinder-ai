import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Briefcase, Users, LineChart, CalendarClock, FileText, History } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { DashboardRowList } from "@/components/dashboard/DashboardRowList";
import { WorkspaceZone } from "@/components/dashboard/CommandCenter";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
import { getPartnerWorkspace, type PartnerWorkspace } from "@/lib/partner-workspace.functions";
import { getHub } from "@/lib/hubs/registry";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/hubs/partner")({
  beforeLoad: () => ensureRoleAccess(["partner", "admin"]),
  head: () => ({
    meta: [
      { title: "Partner Opportunity Hub — TransitionForward" },
      {
        name: "description",
        content: "Publish opportunities and access PartnerForward supports — no student PII.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HubPage,
});

function HubPage() {
  const loadWorkspace = useServerFn(getPartnerWorkspace);
  const [workspace, setWorkspace] = useState<PartnerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadWorkspace({ data: {} })
      .then((result) => {
        if (active) setWorkspace(result);
      })
      .catch(() => {
        if (active) setWorkspace(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  const approvedCount =
    workspace?.opportunities.filter((opportunity) => opportunity.status === "approved").length ?? 0;
  return (
    <SiteShell>
      <HubShell hub={getHub("partner-opportunity")!} hideSpokes>
        <WorkspaceZone>
          <PartnerOverviewGrid liveData={workspace} loading={loading} />
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
                status: workspace ? `${approvedCount} active` : undefined,
                tone: approvedCount > 0 ? "success" : undefined,
              },
              {
                icon: Users,
                title: "Student Fit Summaries",
                description: "De-identified fit summaries from schools referring to your programs.",
                to: "/opportunities",
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
              {
                icon: History,
                title: "Connection History",
                description:
                  "De-identified connection activity, resources shared, and referral progress.",
                to: "/partner/history",
              },
            ]}
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Activity / Next Steps"
          title="Your Partner Next Actions"
          description="Ranked by urgency — publish gaps, pending matches, and profile items surface first."
          gap="tight"
        >
          <NextActionCardServer
            historyRoute="/partner/history"
            title="Your Partner Next Actions"
            eyebrow="What Needs Attention"
            description="The outreach and delivery moves that keep opportunities filled and outcomes reported."
            suggestionLabel="Manage Opportunities"
            suggestionRoute="/partners-manage/opportunities"
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
