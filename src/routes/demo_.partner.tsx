import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { PartnerMatchesCard } from "@/components/dashboard/PartnerMatchesCard";
import { StudentFitSummariesCard } from "@/components/dashboard/StudentFitSummariesCard";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { PARTNER_OUTREACH_ACTIONS } from "@/lib/dashboard/partner-outreach-actions";
import { PartnerOverviewGrid } from "@/components/dashboard/role/PartnerOverviewGrid";
import { OpportunityPipelineBoard } from "@/components/partner/OpportunityPipelineBoard";
import { PartnerImpactCard } from "@/components/partner/PartnerImpactCard";
import { RoleOnboardingChecklist } from "@/components/onboarding/RoleOnboardingChecklist";

const role = getDemoRole("partner");

export const Route = createFileRoute("/demo_/partner")({
  head: () => ({
    meta: [
      { title: `${role.label} Preview — TransitionForward Demo` },
      { name: "description", content: role.intro },
      { property: "og:title", content: `${role.label} Preview — TransitionForward` },
      { property: "og:description", content: role.intro },
    ],
  }),
  component: () => (
    <RolePreviewShell
      role={role}
      extras={
        <>
          <RoleOnboardingChecklist role="partner" />
          <OpportunityPipelineBoard />
          <PartnerImpactCard />
          <PartnerOverviewGrid isSample />
          <PartnerMatchesCard isSample />
          <StudentFitSummariesCard isSample />
          <NextStepsTimeline
            data={PARTNER_OUTREACH_ACTIONS}
            eyebrow="Partner 30 / 90 / 180 / 365-Day Outreach"
            title="Your Partner Next Actions"
            description="The outreach + delivery moves that keep opportunities filled, students supported, and outcomes reported."
          />
        </>
      }
    />
  ),
});
