import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { PartnerMatchesCard } from "@/components/dashboard/PartnerMatchesCard";
import { StudentFitSummariesCard } from "@/components/dashboard/StudentFitSummariesCard";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { PARTNER_OUTREACH_ACTIONS } from "@/lib/dashboard/partner-outreach-actions";

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
