import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { EducatorOverviewGrid } from "@/components/dashboard/role/EducatorOverviewGrid";
import { EvidenceReviewCard } from "@/components/dashboard/EvidenceReviewCard";
import { DataGapsCard } from "@/components/dashboard/DataGapsCard";
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
        <EducatorOverviewGrid />
        <DashboardSection
          eyebrow="Caseload Signals"
          title="Evidence & Data Gaps"
          description="Priority reviews and missing inputs across your caseload."
        >
          <EvidenceReviewCard isSample />
          <DataGapsCard isSample />
        </DashboardSection>
        <DashboardSection
          eyebrow="Next Actions"
          title="30 / 90 / 180 / 365-Day Plan"
          description="The educator-owned actions that keep every Pathway Report defensible and every PPT on schedule."
        >
          <NextStepsTimeline
            data={EDUCATOR_NEXT_ACTIONS}
            eyebrow="Educator 30 / 90 / 180 / 365-Day Plan"
            title="Your Caseload Next Actions"
            description="The educator-owned actions that keep every Pathway Report defensible and every PPT on schedule."
          />
        </DashboardSection>
        <DashboardSection
          eyebrow="Your Pathway"
          title="Stage Journey"
          description="Where your caseload is on the transition planning timeline."
        >
          <StageJourneyCard audience="educator" />
        </DashboardSection>
      </HubShell>
    </SiteShell>
  );
}
