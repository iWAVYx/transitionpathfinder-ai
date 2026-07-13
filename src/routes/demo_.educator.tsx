import { createFileRoute } from "@tanstack/react-router";
import { RolePreviewShell } from "@/components/demo/role-preview/RolePreviewShell";
import { getDemoRole } from "@/lib/demo/role-previews";
import { EvidenceReviewCard } from "@/components/dashboard/EvidenceReviewCard";
import { DataGapsCard } from "@/components/dashboard/DataGapsCard";
import { NextStepsTimeline } from "@/components/dashboard/NextStepsTimeline";
import { EDUCATOR_NEXT_ACTIONS } from "@/lib/dashboard/educator-next-actions";
import { EducatorOverviewGrid } from "@/components/dashboard/role/EducatorOverviewGrid";

const role = getDemoRole("educator");

export const Route = createFileRoute("/demo_/educator")({
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
          <EvidenceReviewCard isSample />
          <DataGapsCard isSample />
          <NextStepsTimeline
            data={EDUCATOR_NEXT_ACTIONS}
            eyebrow="Educator 30 / 90 / 180 / 365-Day Plan"
            title="Your Caseload Next Actions"
            description="The educator-owned actions that keep every Pathway Report defensible and every PPT on schedule."
          />
        </>
      }
    />
  ),
});
