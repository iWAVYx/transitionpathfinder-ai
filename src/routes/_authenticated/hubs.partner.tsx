import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import { HubShell } from "@/components/hub/HubShell";
import { StageJourneyCard } from "@/components/dashboard/StageJourneyCard";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { PartnerMatchesCard } from "@/components/dashboard/PartnerMatchesCard";
import { StudentFitSummariesCard } from "@/components/dashboard/StudentFitSummariesCard";
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
      <HubShell hub={getHub("partner-opportunity")!}>
        <PartnerOverviewGrid />
        <PartnerMatchesCard isSample />
        <StudentFitSummariesCard isSample />
        <NextStepsTimeline
          data={PARTNER_OUTREACH_ACTIONS}
          eyebrow="Partner 30 / 90 / 180 / 365-Day Outreach"
          title="Your Partner Next Actions"
          description="The outreach + delivery moves that keep opportunities filled, students supported, and outcomes reported."
        />
        <div className="mt-8">
          <StageJourneyCard audience="partner" />
        </div>
      </HubShell>
    </SiteShell>
  );
}
